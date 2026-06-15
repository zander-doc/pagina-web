import { getLoginFormValues, getRegisterFormValues, showError, showLoginError, showRegisterError, showRegisterSuccess, setLoading } from "./login.ui.js";
import { login, register, getUserById, updateLastLogin, insertUsuario } from "./login.service.js";
import { saveSession } from "../../services/sessionService.js";
import { logAudit } from "../../services/auditService.js";
import { handleError } from "../../services/error-handler.js";
import { showToast } from "../../services/toastService.js";

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoginError("");

    const { email, password } = getLoginFormValues();
    const btn = loginForm.querySelector("button");
    if (btn) {
      btn.dataset.originalText = btn.textContent;
      setLoading(btn, true);
    }

    try {
      const { data, error } = await login(email, password);

      if (error) {
        showLoginError("Error: " + error.message);
        showToast("Credenciales incorrectas", "error");
        return;
      }

      if (!data.user) {
        showLoginError("Error: no se pudo obtener el usuario.");
        return;
      }

      const perfil = await getUserById(data.user.id);
      const rol = perfil?.rol || "usuario";

      // Guardar identidad en sessionStorage
      sessionStorage.setItem("rol", perfil.rol);
      sessionStorage.setItem("nombre", perfil.nombre);
      sessionStorage.setItem("email", perfil.email);
      sessionStorage.setItem("id", perfil.id);

      saveSession({ id: data.user.id, email: data.user.email, rol });

      await updateLastLogin(data.user.id);

      await logAudit("Auth", "Login", `Usuario ${email} inició sesión`);

      showLoginError("");
      const msgEl = document.getElementById("login-message");
      if (msgEl) {
        msgEl.textContent = "✅ Acceso concedido. Redirigiendo...";
        msgEl.className = "login-message success";
      }
      showToast("Bienvenido", "success");

      window.location.href = "/admin-dashboard/modules/dashboard/dashboard.html";
    } catch (err) {
      console.error("Error en login:", err);
      showLoginError("Error inesperado: " + err.message);
    } finally {
      if (btn) setLoading(btn, false);
    }
  });
}

const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showRegisterError("");
    showRegisterSuccess("");

    const { email, password, passwordConfirm } = getRegisterFormValues();
    const nombre = document.getElementById("registerName").value;
    const btn = registerForm.querySelector("button");
    if (btn) {
      btn.dataset.originalText = btn.textContent;
      setLoading(btn, true);
    }

    if (password !== passwordConfirm) {
      showRegisterError("Las contraseñas no coinciden.");
      if (btn) setLoading(btn, false);
      return;
    }

    try {
      const { user, error } = await register(email, password, nombre);

      if (error) {
        showRegisterError("Error en registro: " + error.message);
        return;
      }

      if (!user) {
        showRegisterError("Error: no se pudo crear el usuario.");
        return;
      }

      const { user: loginUser, error: loginError } = await login(email, password);

      if (!loginUser) {
        showRegisterError("Error al iniciar sesión: " + (loginError?.message || "Error desconocido"));
        return;
      }

      const { error: insertError } = await insertUsuario({
        id: user.id,
        nombre,
        email,
        rol: "usuario",
        estado: "activo",
        creado_en: new Date(),
        ip_registro: null
      });

      if (insertError) {
        showRegisterError("Error al guardar usuario: " + insertError.message);
        return;
      }

      showRegisterSuccess("Cuenta creada con éxito. Ahora puedes iniciar sesión.");
      return;
    } catch (err) {
      showRegisterError("Error inesperado: " + err.message);
    } finally {
      if (btn) setLoading(btn, false);
    }
  });
}

document.querySelectorAll(".toggle-password").forEach((icon) => {
  icon.addEventListener("click", () => {
    const target = document.getElementById(icon.dataset.target);
    if (!target) return;
    target.type = target.type === "password" ? "text" : "password";
  });
});

const forgotLink = document.getElementById("forgotPasswordLink");
if (forgotLink) {
    forgotLink.addEventListener("click", async (e) => {
        e.preventDefault();
        const email = document.getElementById("loginEmail").value;
        if (!email) {
            // 🔄 Reemplazado por error-handler.js
            handleError("login", new Error("Por favor ingresa tu correo para recuperar la contraseña."));
            return;
        }
        const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email);
        if (error) {
            console.error(error);
            // 🔄 Reemplazado por error-handler.js
            handleError("login", error);
        } else {
            // 🔄 Reemplazado por error-handler.js
            handleError("login", new Error("Se ha enviado un enlace de recuperación a tu correo."));
        }
    });
}
