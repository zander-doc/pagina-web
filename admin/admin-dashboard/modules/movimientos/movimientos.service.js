/**
 * movimientos.service.js
 * Servicio de datos para el módulo de movimientos.
 * Estructura limpia: entrada/salida con costo_unitario en USD.
 * 
 * Tabla movimientos:
 * - id: uuid PRIMARY KEY
 * - producto_id: uuid REFERENCES productos(id)
 * - tipo: text ('entrada' | 'salida')
 * - cantidad: numeric
 * - costo_unitario: numeric (SIEMPRE en USD)
 * - fecha: date
 * - motivo: text
 * - observacion: text
 * - created_at: timestamp
 */

import { supabase } from "../../services/supabase-client.js";

// --- CRUD Movimientos ---

/**
 * Obtener todos los movimientos ordenados por fecha (más recientes primero).
 * @returns {Promise<Array>}
 */
export async function obtenerMovimientos() {
  const { data, error } = await supabase
    .from("movimientos")
    .select("id, producto_id, tipo, cantidad, costo_unitario, fecha, motivo, observacion, created_at, productos(codigo, descripcion, unidad)")
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  return data || [];
}

/**
 * Obtener movimientos por tipo (entrada o salida).
 * @param {string} tipo - 'entrada' o 'salida'
 * @returns {Promise<Array>}
 */
export async function filtrarMovimientosPorTipo(tipo) {
  const { data, error } = await supabase
    .from("movimientos")
    .select("id, producto_id, tipo, cantidad, costo_unitario, fecha, motivo, observacion, created_at, productos(codigo, descripcion, unidad)")
    .eq("tipo", tipo)
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  return data || [];
}

/**
 * Obtener movimientos por rango de fechas.
 * @param {string} fechaInicio - Fecha inicio en formato ISO
 * @param {string} fechaFin - Fecha fin en formato ISO
 * @returns {Promise<Array>}
 */
export async function filtrarMovimientosPorRangoFechas(fechaInicio, fechaFin) {
  const { data, error } = await supabase
    .from("movimientos")
    .select("id, producto_id, tipo, cantidad, costo_unitario, fecha, motivo, observacion, created_at, productos(codigo, descripcion, unidad)")
    .gte("created_at", fechaInicio)
    .lte("created_at", fechaFin)
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  return data || [];
}

/**
 * Insertar un nuevo movimiento.
 * @param {object} datos - { producto_id, tipo, cantidad, costo_unitario, fecha, motivo, observacion }
 * @returns {Promise<object>} Movimiento creado
 */
export async function insertarMovimiento(datos) {
  const limpio = sanitizarMovimiento(datos);
  const { data, error } = await supabase
    .from("movimientos")
    .insert([limpio])
    .select("id, producto_id, tipo, cantidad, costo_unitario, fecha, motivo, observacion, created_at, productos(codigo, descripcion, unidad)")
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Actualizar un movimiento existente.
 * @param {string} id - UUID del movimiento
 * @param {object} datos - Campos a actualizar
 * @returns {Promise<object>} Movimiento actualizado
 */
export async function actualizarMovimiento(id, datos) {
  const limpio = sanitizarMovimiento(datos);
  const { data, error } = await supabase
    .from("movimientos")
    .update(limpio)
    .eq("id", id)
    .select("id, producto_id, tipo, cantidad, costo_unitario, fecha, motivo, observacion, created_at, productos(codigo, descripcion, unidad)")
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Eliminar un movimiento por ID.
 * @param {string} id - UUID del movimiento
 * @returns {Promise<boolean>}
 */
export async function eliminarMovimiento(id) {
  const { error } = await supabase
    .from("movimientos")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
  return true;
}

// Alias para compatibilidad
export const eliminarMovimientoService = eliminarMovimiento;

// --- Consultas con filtros ---

/**
 * Obtener movimientos con filtros opcionales.
 * @param {object} filtros
 * @param {string} [filtros.tipo] - 'entrada' o 'salida'
 * @param {string} [filtros.productoId] - UUID del producto
 * @param {string} [filtros.fechaDesde] - Fecha inicio ISO
 * @param {string} [filtros.fechaHasta] - Fecha fin ISO
 * @param {number} [filtros.limit=200] - Límite de resultados
 * @returns {Promise<Array>}
 */
export async function getMovimientosFiltrados({ tipo, productoId, fechaDesde, fechaHasta, limit = 200 } = {}) {
  let query = supabase
    .from("movimientos")
    .select("id, producto_id, tipo, cantidad, costo_unitario, fecha, motivo, observacion, created_at, productos(codigo, descripcion, unidad)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (tipo && tipo !== "todos") {
    query = query.eq("tipo", tipo);
  }
  if (productoId) {
    query = query.eq("producto_id", productoId);
  }
  if (fechaDesde) {
    query = query.gte("created_at", fechaDesde + "T00:00:00");
  }
  if (fechaHasta) {
    query = query.lte("created_at", fechaHasta + "T23:59:59");
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Obtener lista de productos con movimientos recientes.
 * @param {number} [limit=10] - Límite de resultados
 * @returns {Promise<Array<{id: string, nombre: string, codigo: string}>}
 */
export async function getProductosConMovimientos(limit = 10) {
  const { data, error } = await supabase
    .from("movimientos")
    .select("producto_id, productos(codigo, descripcion)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  
  // Extraer productos únicos
  const productos = [];
  const vistos = new Set();
  
  (data || []).forEach(m => {
    if (m.productos && !vistos.has(m.producto_id)) {
      vistos.add(m.producto_id);
      productos.push({
        id: m.producto_id,
        nombre: m.productos.descripcion || m.productos.codigo || "Sin nombre",
        codigo: m.productos.codigo || ""
      });
    }
  });
  
  return productos;
}

/**
 * Obtener resumen de movimientos por tipo.
 * @returns {Promise<{total: number, entradas: number, salidas: number}>}
 */
export async function getResumenPorTipo() {
  const { count: total } = await supabase.from("movimientos").select("id", { count: "exact", head: true });
  const { count: entradas } = await supabase.from("movimientos").select("id", { count: "exact", head: true }).eq("tipo", "entrada");
  const { count: salidas } = await supabase.from("movimientos").select("id", { count: "exact", head: true }).eq("tipo", "salida");

  return {
    total: total || 0,
    entradas: entradas || 0,
    salidas: salidas || 0
  };
}

/**
 * Obtener resumen de movimientos por día (últimos 30 días).
 * @returns {Promise<Array<{fecha: string, entradas: number, salidas: number, total: number}>}
 */
export async function getResumenDiario() {
  const { data, error } = await supabase.rpc("movimientos_resumen_diario");
  
  if (error) throw error;
  return data || [];
}

// --- Utilidades ---

/**
 * Sanitizar datos de movimiento antes de insertar.
 * @param {object} datos - Datos del movimiento
 * @returns {object} Datos sanitizados
 */
export function sanitizarMovimiento(datos) {
  const limpio = {};
  
  if (datos.producto_id) limpio.producto_id = datos.producto_id;
  if (datos.tipo && datos.tipo.toLowerCase() === "entrada") limpio.tipo = "entrada";
  else if (datos.tipo && datos.tipo.toLowerCase() === "salida") limpio.tipo = "salida";
  else limpio.tipo = "entrada"; // default
  
  if (datos.cantidad !== undefined && datos.cantidad !== null) {
    const cant = Number(datos.cantidad);
    limpio.cantidad = isNaN(cant) || cant <= 0 ? 1 : cant;
  }
  
  if (datos.costo_unitario !== undefined && datos.costo_unitario !== null) {
    const costo = Number(String(datos.costo_unitario).replace(",", "."));
    limpio.costo_unitario = isNaN(costo) || costo < 0 ? 0 : costo;
  }
  
  if (datos.fecha) limpio.fecha = datos.fecha;
  if (datos.motivo !== undefined && datos.motivo !== null) limpio.motivo = String(datos.motivo).trim();
  if (datos.observacion !== undefined && datos.observacion !== null) limpio.observacion = String(datos.observacion).trim();
  
  return limpio;
}

// --- Obtener productos para el selector ---
/**
 * Obtener lista de productos activos para el selector.
 * @returns {Promise<Array<{id: string, nombre: string, codigo: string}>}
 */
export async function obtenerProductos() {
  const { data, error } = await supabase
    .from("productos")
    .select("id, codigo, descripcion")
    .eq("estado", "activo")
    .order("codigo");
  
  if (error) throw error;
  return data || [];
}

// --- Exportar funciones ---
export { obtenerMovimientos, filtrarMovimientosPorTipo, filtrarMovimientosPorRangoFechas, insertarMovimiento, actualizarMovimiento, eliminarMovimiento, getMovimientosFiltrados, getProductosConMovimientos, getResumenPorTipo, getResumenDiario, sanitizarMovimiento, obtenerProductos };
