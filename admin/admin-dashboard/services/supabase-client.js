// ===============================================
//   SUPABASE CLIENT — ADDBOX (Versión unificada)
//   Compatible con navegador + CDN
// ===============================================

// Validar que la librería esté cargada
if (typeof window.supabase === 'undefined') {
  throw new Error(
    '⚠ Supabase library not loaded. Ensure the CDN script is included BEFORE supabase-client.js'
  );
}

const SUPABASE_URL = "https://spbsrrsgvkusscautcag.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwYnNycnNndmt1c3NjYXV0Y2FnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NDQ3NzUsImV4cCI6MjA5NzEyMDc3NX0.jjFBvw7lVYDyrqmUY7dFH74BN69OPUUW_woee5b0r_4";

// Crear cliente usando la librería cargada por CDN
export const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// Compatibilidad con sistema viejo
window.supabaseClient = supabase;
