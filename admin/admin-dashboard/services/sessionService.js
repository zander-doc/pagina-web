import { supabase } from "./supabase-client.js";

/**
 * Obtiene la sesión actual (Supabase v1)
 */
export function getSession() {
  const session = supabase.auth.session();
  return session;
}

/**
 * Requiere sesión activa. Si no hay, redirige al login.
 */
export function requireSession() {
  // MODO DESARROLLADOR
  if (localStorage.getItem("devMode") === "on") {
    console.warn("⚠ Modo desarrollador activo: autenticación deshabilitada");
    return true;
  }

  const session = getSession();
  if (!session) {
    window.location.href = "/admin-dashboard/inicio-de-sesion.html";
    return null;
  }
  return session;
}

/**
 * Obtiene el usuario actual de la sesión
 */
export function getCurrentUser() {
  const session = getSession();
  return session?.user ?? null;
}

/**
 * Guarda datos de sesión en localStorage (compatibilidad)
 */
export function saveSession(user) {
  const sessionData = {
    id: user.id,
    email: user.email,
    rol: user.rol || "usuario",
    created_at: new Date().toISOString()
  };
  localStorage.setItem("addbox_session", JSON.stringify(sessionData));
}

/**
 * Limpia la sesión local
 */
export function clearSession() {
  localStorage.removeItem("addbox_session");
}
