import { supabase } from "../../services/supabase-client.js";

/**
 * Obtiene el stock de todos los productos en una obra específica.
 * Consulta stock_obra con join a productos para obtener datos completos.
 * @param {string} obraId - UUID de la obra
 * @returns {Promise<Array<{producto_id, codigo, descripcion, unidad, cantidad, costo_prom, estado_alerta}>>}
 */
export async function obtenerStockPorObra(obraId) {
  const { data, error } = await supabase
    .from("stock_obra")
    .select(`
      producto_id,
      cantidad,
      productos (
        codigo,
        descripcion,
        unidad,
        costo_prom,
        umbral_critico,
        umbral_alerta
      )
    `)
    .eq("obra_id", obraId);

  if (error) throw error;

  return data.map((item) => {
    const producto = item.productos;
    const umbralCritico = producto.umbral_critico ?? 5;
    const umbralAlerta = producto.umbral_alerta ?? 9;
    let estado_alerta = "normal";
    if (item.cantidad < umbralCritico) {
      estado_alerta = "critico";
    } else if (item.cantidad <= umbralAlerta) {
      estado_alerta = "alerta";
    }

    return {
      producto_id: item.producto_id,
      codigo: producto.codigo,
      descripcion: producto.descripcion,
      unidad: producto.unidad,
      cantidad: item.cantidad,
      costo_prom: producto.costo_prom,
      estado_alerta,
    };
  });
}

/**
 * Obtiene el stock consolidado de todos los productos agrupado por producto con totales.
 * @returns {Promise<Array<{producto_id, codigo, descripcion, stock_total, num_obras, valor_total}>>}
 */
export async function obtenerStockConsolidado() {
  const { data, error } = await supabase
    .from("stock_obra")
    .select(`
      producto_id,
      cantidad,
      productos (
        codigo,
        descripcion,
        costo_prom
      )
    `);

  if (error) throw error;

  // Agrupar por producto
  const agrupado = {};
  for (const item of data) {
    const id = item.producto_id;
    if (!agrupado[id]) {
      agrupado[id] = {
        producto_id: id,
        codigo: item.productos.codigo,
        descripcion: item.productos.descripcion,
        costo_prom: item.productos.costo_prom,
        stock_total: 0,
        num_obras: 0,
      };
    }
    agrupado[id].stock_total += item.cantidad;
    agrupado[id].num_obras += 1;
  }

  return Object.values(agrupado).map((prod) => ({
    producto_id: prod.producto_id,
    codigo: prod.codigo,
    descripcion: prod.descripcion,
    stock_total: prod.stock_total,
    num_obras: prod.num_obras,
    valor_total: prod.stock_total * (prod.costo_prom || 0),
  }));
}

/**
 * Obtiene la cantidad de stock de un producto específico en una obra específica.
 * @param {string} productoId - UUID del producto
 * @param {string} obraId - UUID de la obra
 * @returns {Promise<{cantidad: number}>}
 */
export async function obtenerStockProductoObra(productoId, obraId) {
  const { data, error } = await supabase
    .from("stock_obra")
    .select("cantidad")
    .eq("producto_id", productoId)
    .eq("obra_id", obraId)
    .single();

  if (error && error.code === "PGRST116") {
    // No row found — stock is 0
    return { cantidad: 0 };
  }
  if (error) throw error;

  return { cantidad: data.cantidad };
}

/**
 * Registra una entrada de producto via RPC atómico.
 * @param {{productoId: string, obraId: string, cantidad: number, observacion?: string}} datos
 * @returns {Promise<{success: boolean, movimiento?: object, error?: string}>}
 */
export async function registrarEntrada({ productoId, obraId, cantidad, observacion }) {
  const usuario = supabase.auth.user();
  const { data, error } = await supabase.rpc("registrar_movimiento", {
    p_tipo: "entrada",
    p_producto_id: productoId,
    p_obra_id: obraId,
    p_cantidad: cantidad,
    p_usuario_id: usuario?.id,
    p_observacion: observacion || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (data && data.success === false) {
    return { success: false, error: data.error };
  }

  return { success: true, movimiento: data };
}

/**
 * Registra una salida de producto via RPC atómico.
 * Valida stock suficiente en el servidor.
 * @param {{productoId: string, obraId: string, cantidad: number, observacion?: string}} datos
 * @returns {Promise<{success: boolean, movimiento?: object, error?: string}>}
 */
export async function registrarSalida({ productoId, obraId, cantidad, observacion }) {
  const usuario = supabase.auth.user();
  const { data, error } = await supabase.rpc("registrar_movimiento", {
    p_tipo: "salida",
    p_producto_id: productoId,
    p_obra_id: obraId,
    p_cantidad: cantidad,
    p_usuario_id: usuario?.id,
    p_observacion: observacion || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (data && data.success === false) {
    return { success: false, error: data.error };
  }

  return { success: true, movimiento: data };
}

/**
 * Registra una transferencia de producto entre obras via RPC atómico.
 * Crea movimiento de salida en origen y entrada en destino con referencia cruzada.
 * @param {{productoId: string, obraOrigenId: string, obraDestinoId: string, cantidad: number, observacion?: string}} datos
 * @returns {Promise<{success: boolean, movimientos?: Array, error?: string}>}
 */
export async function registrarTransferencia({ productoId, obraOrigenId, obraDestinoId, cantidad, observacion }) {
  const usuario = supabase.auth.user();
  const { data, error } = await supabase.rpc("registrar_movimiento", {
    p_tipo: "transferencia_salida",
    p_producto_id: productoId,
    p_obra_id: obraOrigenId,
    p_cantidad: cantidad,
    p_usuario_id: usuario?.id,
    p_observacion: observacion || null,
    p_obra_destino_id: obraDestinoId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (data && data.success === false) {
    return { success: false, error: data.error };
  }

  return { success: true, movimientos: data };
}

/**
 * Registra un ajuste de inventario via RPC atómico.
 * Requiere motivo con mínimo 10 caracteres.
 * @param {{productoId: string, obraId: string, cantidad: number, motivo: string}} datos
 * @returns {Promise<{success: boolean, movimiento?: object, error?: string}>}
 */
export async function registrarAjuste({ productoId, obraId, cantidad, motivo }) {
  const usuario = supabase.auth.user();
  const { data, error } = await supabase.rpc("registrar_movimiento", {
    p_tipo: "ajuste",
    p_producto_id: productoId,
    p_obra_id: obraId,
    p_cantidad: cantidad,
    p_usuario_id: usuario?.id,
    p_motivo: motivo,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (data && data.success === false) {
    return { success: false, error: data.error };
  }

  return { success: true, movimiento: data };
}

/**
 * Obtiene el historial de movimientos de una obra con paginación.
 * @param {string} obraId - UUID de la obra
 * @param {{limit?: number, offset?: number}} opciones - Opciones de paginación
 * @returns {Promise<{data: Array, total: number}>}
 */
export async function obtenerMovimientosPorObra(obraId, { limit = 50, offset = 0 } = {}) {
  const { data, error, count } = await supabase
    .from("movimientos")
    .select(`
      id,
      tipo,
      cantidad,
      producto_id,
      obra_id,
      obra_destino_id,
      usuario_id,
      motivo,
      observacion,
      lote_id,
      referencia_cruzada,
      creado_en,
      productos (
        codigo,
        descripcion
      )
    `, { count: "exact" })
    .eq("obra_id", obraId)
    .order("creado_en", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return { data: data || [], total: count || 0 };
}
