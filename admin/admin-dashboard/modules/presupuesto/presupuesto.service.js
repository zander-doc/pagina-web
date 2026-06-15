// 🔄 Reemplazado por supabase-client.js
/*
const supabase = window.supabaseClient;
*/

import { supabase } from "../../services/supabase-client.js";

export async function obtenerPresupuestos() {
  const { data, error } = await supabase
    .from("presupuestos")
    .select("id, nombre, cliente, monto, estado, creado_en")
    .order("creado_en", { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }
  return data || [];
}

export async function filtrarPresupuestosPorEstado(estado) {
  const { data, error } = await supabase
    .from("presupuestos")
    .select("id, nombre, cliente, monto, estado, creado_en")
    .eq("estado", estado)
    .order("creado_en", { ascending: false });

  if (error) {
    throw error;
  }
  return data || [];
}

export async function insertarPresupuesto(datos) {
  const { data, error } = await supabase
    .from("presupuestos")
    .insert([datos])
    .select();

  if (error) {
    throw error;
  }
  return data;
}

export async function actualizarPresupuesto(id, datos) {
  const { data, error } = await supabase
    .from("presupuestos")
    .update(datos)
    .eq("id", id)
    .select();

  if (error) {
    throw error;
  }
  return data;
}

export async function eliminarPresupuesto(id) {
  const { error } = await supabase
    .from("presupuestos")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
  return true;
}
