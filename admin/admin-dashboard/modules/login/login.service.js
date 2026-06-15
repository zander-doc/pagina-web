/* ============================================================
LOGIN SERVICE — ADDBOX
Unificado a Supabase v1 (CDN) usando window.supabaseClient
// 🔄 Reemplazado por supabase-client.js
============================================================ */
// 🔄 Reemplazado por supabase-client.js
/*
const supabase = window.supabaseClient;
*/

import { supabase } from "../../services/supabase-client.js";

// LOGIN (v1)
export async function login(email, password) {
  return await supabase.auth.signIn({ email, password });
}

// REGISTRO (v1)
export async function register(email, password, nombre) {
  return await supabase.auth.signUp({ email, password });
}

// OBTENER PERFIL
export async function getUserById(id) {
  const { data, error } = await supabase.from("usuarios").select("*").eq("id", id).single();
  if (error) return null;
  return data;
}

// ACTUALIZAR ÚLTIMO LOGIN
export async function updateLastLogin(userId) {
  return await supabase.from("usuarios").update({
    ultimo_login: new Date(),
    ip_ultimo_login: null
  }).eq("id", userId);
}

// INSERTAR USUARIO EN TABLA "usuarios"
export async function insertUsuario(usuario) {
  return await supabase.from("usuarios").insert(usuario);

}