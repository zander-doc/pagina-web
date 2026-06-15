// ===============================================
//   SUPABASE CLIENT — ADDBOX (Versión unificada)
//   Compatible con navegador + CDN
// ===============================================

// Validar que la librería esté cargada
if (typeof window.supabase === 'undefined') {
  throw new Error(
    '❌ Supabase library not loaded. Ensure the CDN script is included BEFORE supabase-client.js'
  );
}

const SUPABASE_URL = "https://billwldqxupcavzurljo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpbGx3bGRxeHVwY2F2enVybGpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDAzODIsImV4cCI6MjA5MTgxNjM4Mn0.4jsINbwwL9RMjKMdnQu-nYM7qBLb9KIXhEsuXQrEGO8";

// Crear cliente usando la librería cargada por CDN
export const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// Compatibilidad con sistema viejo
window.supabaseClient = supabase;

