"use strict";

// Mobile navigation
const btnNavEl = document.querySelector(".btn-mobile-nav");
const headerEl = document.querySelector(".header");

btnNavEl.addEventListener("click", function () {
  headerEl.classList.toggle("nav-open");
});

const navLinks = document.querySelectorAll(".main-nav-link");

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    headerEl.classList.remove("nav-open");
  });
});

// Testimonial Slider
const testimonials = [
  {
    text: "Working with Blake at Cosmically Creative was an incredibly valuable experience and made the process of developing a website seem very straightforward and easy-going. He provided several ideas and illustrations of what we could do for a website that would help connect the people in need and interested in what our organization is about and the services we have to offer. Blake communicated very well with us and kept us informed of the progress he was making through this process. He listens very well and works hard to understand our needs and desires for this website tool to be best for our organization. We highly recommend his services!!",
    name: "&dash; Christ's Hands",
  },
  {
    text: "Cosmically Creative built my website exactly how I envisioned it—clean, functional, and professional. They were easy to work with, quick to respond, and clearly cared about getting every detail right. The end result speaks for itself. From our first conversation, they took the time to understand my business and what I needed the site to accomplish. I never felt rushed or out of the loop—updates came regularly, and my feedback was always taken seriously. I'd recommend them to anyone looking for a web developer who actually listens.",
    name: "&dash; Valor Design Labs",
  },
];

const slidesContainer = document.querySelector(".testimonial-slides");
let currentSlide = 0;

function buildSlides() {
  testimonials.forEach((testimonial, i) => {
    const slide = document.createElement("div");
    slide.classList.add("testimonial-slide");
    if (i === 0) slide.classList.add("active");
    slide.innerHTML = `
      <p class="testimonial-text">&ldquo;${testimonial.text}&rdquo;</p>
      <p class="client-name">${testimonial.name}</p>
    `;
    slidesContainer.appendChild(slide);
  });
}

function showSlide(index) {
  const slides = document.querySelectorAll(".testimonial-slide");
  slides.forEach((slide) => slide.classList.remove("active"));
  currentSlide = (index + slides.length) % slides.length;
  slides[currentSlide].classList.add("active");
}

buildSlides();

function setSlidesHeight() {
  const slides = document.querySelectorAll(".testimonial-slide");
  let maxHeight = 0;
  slides.forEach((slide) => {
    slide.classList.add("active");
    maxHeight = Math.max(maxHeight, slide.scrollHeight);
    slide.classList.remove("active");
  });
  slidesContainer.style.minHeight = maxHeight + "px";
  slides[currentSlide].classList.add("active");
}

setSlidesHeight();
window.addEventListener("resize", setSlidesHeight);

document
  .querySelector(".testimonial-btn--prev")
  .addEventListener("click", () => {
    showSlide(currentSlide - 1);
  });

document
  .querySelector(".testimonial-btn--next")
  .addEventListener("click", () => {
    showSlide(currentSlide + 1);
  });

// Project Carousel
const projectTrack = document.querySelector(".project-track");
const projectCards = Array.from(
  projectTrack.querySelectorAll(".project-slide"),
);
let currentProject = 0;
let isSliding = false;

const slideClasses = [
  "slide-active",
  "slide-prev",
  "slide-next",
  "slide-hidden-left",
  "slide-hidden-right",
];

function getPositions(index, direction) {
  const total = projectCards.length;
  const prev = (index - 1 + total) % total;
  const next = (index + 1) % total;

  const positions = new Map();
  positions.set(index, "slide-active");
  positions.set(prev, "slide-prev");
  positions.set(next, "slide-next");

  for (let i = 0; i < total; i++) {
    if (!positions.has(i)) {
      if (direction === "next") {
        positions.set(i, "slide-hidden-left");
      } else if (direction === "prev") {
        positions.set(i, "slide-hidden-right");
      } else {
        positions.set(i, "slide-hidden-left");
      }
    }
  }

  return positions;
}

function applyPositions(positions) {
  projectCards.forEach((card, i) => {
    card.classList.remove(...slideClasses);
    card.classList.add(positions.get(i));
  });
}

function slideToProject(newIndex, direction) {
  if (isSliding || newIndex === currentProject) return;
  isSliding = true;

  const total = projectCards.length;
  const oldPrev = (currentProject - 1 + total) % total;
  const oldNext = (currentProject + 1) % total;
  const newPrev = (newIndex - 1 + total) % total;
  const newNext = (newIndex + 1) % total;

  // First: instantly move the incoming card to its off-screen start position
  // (no transition) so it can slide in from the correct side
  const incoming =
    direction === "next" ? projectCards[newNext] : projectCards[newPrev];

  if (incoming) {
    incoming.style.transition = "none";
    incoming.classList.remove(...slideClasses);
    incoming.classList.add(
      direction === "next" ? "slide-hidden-right" : "slide-hidden-left",
    );
    // Force reflow so the position applies before the transition kicks in
    incoming.offsetHeight;
    incoming.style.transition = "";
  }

  currentProject = newIndex;
  const positions = getPositions(newIndex, direction);
  applyPositions(positions);

  // Unlock after transition finishes
  const activeCard = projectCards[newIndex];
  const onEnd = () => {
    isSliding = false;
    activeCard.removeEventListener("transitionend", onEnd);
  };
  activeCard.addEventListener("transitionend", onEnd);

  // Safety fallback
  setTimeout(() => {
    isSliding = false;
  }, 700);
}

// Initial state
applyPositions(getPositions(0, null));

document.querySelector(".project-btn--prev").addEventListener("click", () => {
  const total = projectCards.length;
  const newIndex = (currentProject - 1 + total) % total;
  slideToProject(newIndex, "prev");
});

document.querySelector(".project-btn--next").addEventListener("click", () => {
  const total = projectCards.length;
  const newIndex = (currentProject + 1) % total;
  slideToProject(newIndex, "next");
});

// Project Carousel Swipe Support
let touchStartX = 0;
let touchEndX = 0;
const swipeThreshold = 50;

projectTrack.addEventListener(
  "touchstart",
  (e) => {
    touchStartX = e.changedTouches[0].clientX;
  },
  { passive: true },
);

projectTrack.addEventListener(
  "touchend",
  (e) => {
    touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
      const total = projectCards.length;
      if (diff > 0) {
        const newIndex = (currentProject + 1) % total;
        slideToProject(newIndex, "next");
      } else {
        const newIndex = (currentProject - 1 + total) % total;
        slideToProject(newIndex, "prev");
      }
    }
  },
  { passive: true },
);

// Scroll Animations
document.addEventListener("DOMContentLoaded", () => {
  const observerOptions = { root: null, rootMargin: "0px", threshold: 0.5 };
  const onIntersection = (entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  };
  const observer = new IntersectionObserver(onIntersection, observerOptions);
  const elementsToAnimate = document.querySelectorAll(
    ".animate-on-scroll, .animate-on-scroll-delay",
  );
  elementsToAnimate.forEach((el) => observer.observe(el));
});
