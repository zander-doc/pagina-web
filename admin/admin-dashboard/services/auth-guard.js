// ===============================================
//   AUTH GUARD — ADDBOX (Versión modular limpia)
// ===============================================

import { requireSession } from "./sessionService.js";

// Este archivo NO crea clientes Supabase.
// Usa el cliente global creado en supabase-client.js

export async function authGuard() {
  const session = await requireSession();
  return !!session;
}

// Alias para compatibilidad
export { requireSession };
