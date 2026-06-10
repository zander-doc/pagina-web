/* =============================================
   HEADER - FUNCIONALIDAD
   ============================================= */

document.addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector(".header");
    const hamburgerBtn = document.getElementById("hamburgerBtn");
    const navMenu = document.getElementById("navMenu");

    // Toggle menú móvil
    if (hamburgerBtn && navMenu) {
        hamburgerBtn.addEventListener("click", () => {
            navMenu.classList.toggle("active");
            hamburgerBtn.classList.toggle("active");
        });
    }

    // Header sticky con sombra
    if (header) {
        window.addEventListener("scroll", () => {
            if (window.scrollY > 50) {
                header.classList.add("scrolled");
            } else {
                header.classList.remove("scrolled");
            }
        });
    }

    // Resaltar enlace activo
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll(".header-nav a");

    navLinks.forEach(link => {
        const href = link.getAttribute("href");
        if (currentPath.includes(href) && href !== "index.html") {
            link.classList.add("active");
        } else if (currentPath.endsWith("/") || currentPath.endsWith("index.html")) {
            if (href === "index.html" || href === "#") {
                link.classList.add("active");
            }
        }
    });
});
