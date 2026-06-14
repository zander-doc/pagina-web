/* =============================================
   ADMIN - JAVASCRIPT
   ============================================= */

document.addEventListener("DOMContentLoaded", () => {
    const loginSection = document.getElementById("loginSection");
    const dashboardSection = document.getElementById("dashboardSection");
    const loginForm = document.getElementById("loginForm");
    const logoutBtn = document.getElementById("logoutBtn");
    const menuToggle = document.getElementById("menuToggle");

    // Simulación de login (demo)
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            
            const email = document.getElementById("adminEmail").value;
            const password = document.getElementById("adminPassword").value;

            // Demo: cualquier credencial funciona
            if (email && password) {
                loginSection.style.display = "none";
                dashboardSection.style.display = "flex";
            }
        });
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            dashboardSection.style.display = "none";
            loginSection.style.display = "flex";
        });
    }

    // Menu toggle para móvil
    if (menuToggle) {
        menuToggle.addEventListener("click", () => {
            document.querySelector(".admin-sidebar").classList.toggle("active");
        });
    }

    // Navegación sidebar
    const sidebarLinks = document.querySelectorAll(".sidebar-link");
    sidebarLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            sidebarLinks.forEach(l => l.classList.remove("active"));
            link.classList.add("active");
        });
    });
});
