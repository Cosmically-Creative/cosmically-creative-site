<?php
/**
 * Contact form handler. Posts are emailed through SMTP2GO.
 *
 * Put the API key in contact-config.php (copy contact-config.example.php)
 * or in the SMTP2GO_API_KEY environment variable. The From address has to
 * be a verified sender in SMTP2GO.
 */

declare(strict_types=1);

const CONTACT_REDIRECTS = [
    '/',
    '/services/drone/',
    '/services/graphic-design/',
    '/services/support/',
    '/services/web-design/',
    '/services/web-development/',
    '/services/web-hosting/',
];

const CONTACT_HOSTS = [
    'www.cosmicallycreative.com',
    'cosmicallycreative.com',
    'localhost',
    '127.0.0.1',
];

function contact_config(): array
{
    $config = [
        'api_key' => getenv('SMTP2GO_API_KEY') ?: '',
        'sender' => 'Cosmically Creative <blake@cosmicallycreative.com>',
        'to' => 'Blake <blake@cosmicallycreative.com>',
    ];

    $configFile = __DIR__ . '/contact-config.php';
    if (is_file($configFile)) {
        $local = require $configFile;
        if (is_array($local)) {
            foreach ($local as $key => $value) {
                if (is_string($value) && $value !== '') {
                    $config[$key] = $value;
                }
            }
        }
    }

    return $config;
}

function contact_redirect(string $path, string $status): void
{
    if (!in_array($path, CONTACT_REDIRECTS, true)) {
        $path = '/';
    }

    header('Location: ' . $path . '?sent=' . $status . '#contact', true, 303);
    exit;
}

function contact_host(): string
{
    $host = strtolower($_SERVER['HTTP_HOST'] ?? '');
    return preg_replace('/:\d+$/', '', $host) ?? '';
}

function contact_same_site(): bool
{
    $host = contact_host();
    if (!in_array($host, CONTACT_HOSTS, true)) {
        return false;
    }

    $source = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
    if ($source === '') {
        return false;
    }

    $sourceHost = strtolower((string) parse_url($source, PHP_URL_HOST));
    return $sourceHost === $host;
}

function contact_clean(string $value, int $max): string
{
    $value = str_replace(["\r\n", "\r"], "\n", $value);
    $value = str_replace("\0", '', $value);
    $value = trim($value);
    if (strlen($value) > $max) {
        $value = substr($value, 0, $max);
    }

    return $value;
}

function contact_header_value(string $value): string
{
    return str_replace(["\r", "\n", "\0"], '', $value);
}

function contact_too_fast(string $ip): bool
{
    $dir = sys_get_temp_dir() . '/cc-contact';
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) {
        return false;
    }

    $file = $dir . '/' . hash('sha256', $ip);
    $now = time();
    $last = is_file($file) ? (int) file_get_contents($file) : 0;
    file_put_contents($file, (string) $now, LOCK_EX);

    return $last > 0 && ($now - $last) < 20;
}

function contact_send(string $apiKey, array $payload): bool
{
    $body = json_encode($payload, JSON_UNESCAPED_UNICODE);
    if ($body === false) {
        return false;
    }

    $headers = [
        'Content-Type: application/json',
        'Accept: application/json',
        'X-Smtp2go-Api-Key: ' . $apiKey,
    ];

    if (function_exists('curl_init')) {
        $ch = curl_init('https://api.smtp2go.com/v3/email/send');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
        ]);
        $response = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
    } else {
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => implode("\r\n", $headers),
                'content' => $body,
                'timeout' => 15,
                'ignore_errors' => true,
            ],
        ]);
        $response = file_get_contents('https://api.smtp2go.com/v3/email/send', false, $context);
        $status = 0;
        if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $match)) {
            $status = (int) $match[1];
        }
        $error = $response === false ? 'request failed' : '';
    }

    if ($response === false || $status < 200 || $status >= 300) {
        error_log('SMTP2GO request failed (' . $status . '): ' . $error);
        return false;
    }

    $decoded = json_decode($response, true);
    if (!is_array($decoded)) {
        error_log('SMTP2GO returned an unreadable response');
        return false;
    }

    $data = $decoded['data'] ?? [];
    if (!empty($data['error'])) {
        error_log('SMTP2GO: ' . $data['error']);
        return false;
    }

    if (($data['failed'] ?? 0) > 0) {
        error_log('SMTP2GO failures: ' . json_encode($data['failures'] ?? []));
        return false;
    }

    return ($data['succeeded'] ?? 0) > 0 || !empty($data['email_id']);
}

if (PHP_SAPI === 'cli') {
    return;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Location: /#contact', true, 303);
    exit;
}

$redirect = contact_clean((string) ($_POST['redirect'] ?? '/'), 80);
$redirect = str_replace(["\n", "\r"], '', $redirect);

if (!contact_same_site()) {
    contact_redirect($redirect, '0');
}

if (trim((string) ($_POST['cc_hp'] ?? '')) !== '') {
    contact_redirect($redirect, '1');
}

$name = contact_clean((string) ($_POST['name'] ?? ''), 100);
$email = contact_clean((string) ($_POST['email'] ?? ''), 254);
$message = contact_clean((string) ($_POST['message'] ?? ''), 5000);

if ($name === '' || $message === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    contact_redirect($redirect, '0');
}

$config = contact_config();
if ($config['api_key'] === '') {
    error_log('SMTP2GO API key is not configured');
    contact_redirect($redirect, '0');
}

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
if (contact_too_fast($ip)) {
    contact_redirect($redirect, '0');
}

$safeName = str_replace(['<', '>', '"', ','], '', contact_header_value($name));
$safeEmail = contact_header_value($email);
$replyTo = $safeName !== '' ? $safeName . ' <' . $safeEmail . '>' : $safeEmail;

$sent = contact_send($config['api_key'], [
    'sender' => $config['sender'],
    'to' => [$config['to']],
    'subject' => 'Website message from ' . $safeName,
    'text_body' => "Name: {$name}\nEmail: {$email}\n\n{$message}\n",
    'custom_headers' => [
        ['header' => 'Reply-To', 'value' => $replyTo],
    ],
]);

contact_redirect($redirect, $sent ? '1' : '0');
