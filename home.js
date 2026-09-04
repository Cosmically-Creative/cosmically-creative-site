"use strict";

const menuButton = document.querySelector(".menu-toggle");
const siteMenu = document.querySelector(".site-menu");

function setMenuState(isOpen) {
    if (!menuButton || !siteMenu) return;

    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute(
        "aria-label",
        isOpen ? "Close navigation" : "Open navigation",
    );
    siteMenu.classList.toggle("is-open", isOpen);
    document.body.classList.toggle("menu-open", isOpen);
}

if (menuButton && siteMenu) {
    menuButton.addEventListener("click", () => {
        const isOpen = menuButton.getAttribute("aria-expanded") === "true";
        setMenuState(!isOpen);
    });

    siteMenu.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => setMenuState(false));
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") setMenuState(false);
    });

    window.addEventListener("resize", () => {
        if (window.matchMedia("(min-width: 781px)").matches) {
            setMenuState(false);
        }
    });
}

const year = document.querySelector("#current-year");
if (year) year.textContent = new Date().getFullYear();
