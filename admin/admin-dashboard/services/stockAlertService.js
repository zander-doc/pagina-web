import { supabase } from "./supabase-client.js";

// Umbrales por defecto según requisitos
const UMBRAL_CRITICO_DEFAULT = 5;
const UMBRAL_ALERTA_DEFAULT = 9;

/**
 * Clasifica el estado de alerta de un producto según su cantidad y umbrales.
 * @param {number} cantidad - Stock actual del producto
 * @param {number} umbralCritico - Umbral crítico (por defecto 5)
 * @param {number} umbralAlerta - Umbral de alerta (por defecto 9)
 * @returns {'critico'|'alerta'|'normal'}
 */
export function clasificarAlerta(cantidad, umbralCritico, umbralAlerta) {
  if (cantidad < umbralCritico) {
    return "critico";
  }
  if (cantidad <= umbralAlerta) {
    return "alerta";
  }
  return "normal";
}

/**
 * Valida que los umbrales cumplan las reglas de negocio.
 * - umbralCritico: entero entre 1 y 9999
 * - umbralAlerta: entero entre 2 y 9999
 * - umbralCritico < umbralAlerta
 * @param {number} umbralCritico
 * @param {number} umbralAlerta
 * @returns {{ valido: boolean, error?: string }}
 */
export function validarUmbrales(umbralCritico, umbralAlerta) {
  if (!Number.isInteger(umbralCritico) || umbralCritico < 1 || umbralCritico > 9999) {
    return {
      valido: false,
      error: "El umbral crítico debe ser un entero entre 1 y 9999"
    };
  }

  if (!Number.isInteger(umbralAlerta) || umbralAlerta < 2 || umbralAlerta > 9999) {
    return {
      valido: false,
      error: "El umbral de alerta debe ser un entero entre 2 y 9999"
    };
  }

  if (umbralCritico >= umbralAlerta) {
    return {
      valido: false,
      error: "El umbral crítico debe ser estrictamente menor que el umbral de alerta"
    };
  }

  return { valido: true };
}

/**
 * Obtiene los umbrales configurados para un producto (personalizados o default).
 * @param {string} productoId - UUID del producto
 * @returns {Promise<{ umbral_critico: number, umbral_alerta: number }>}
 */
export async function obtenerUmbrales(productoId) {
  try {
    const { data, error } = await supabase
      .from("productos")
      .select("umbral_critico, umbral_alerta")
      .eq("id", productoId)
      .single();

    if (error) {
      console.error("Error obteniendo umbrales:", error);
      return {
        umbral_critico: UMBRAL_CRITICO_DEFAULT,
        umbral_alerta: UMBRAL_ALERTA_DEFAULT
      };
    }

    return {
      umbral_critico: data.umbral_critico ?? UMBRAL_CRITICO_DEFAULT,
      umbral_alerta: data.umbral_alerta ?? UMBRAL_ALERTA_DEFAULT
    };
  } catch (err) {
    console.error("Error inesperado obteniendo umbrales:", err);
    return {
      umbral_critico: UMBRAL_CRITICO_DEFAULT,
      umbral_alerta: UMBRAL_ALERTA_DEFAULT
    };
  }
}

/**
 * Configura umbrales personalizados para un producto.
 * Valida las reglas de negocio antes de guardar.
 * @param {string} productoId - UUID del producto
 * @param {number} umbralCritico - Nuevo umbral crítico
 * @param {number} umbralAlerta - Nuevo umbral de alerta
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function configurarUmbrales(productoId, umbralCritico, umbralAlerta) {
  const validacion = validarUmbrales(umbralCritico, umbralAlerta);
  if (!validacion.valido) {
    return { success: false, error: validacion.error };
  }

  try {
    const { error } = await supabase
      .from("productos")
      .update({
        umbral_critico: umbralCritico,
        umbral_alerta: umbralAlerta
      })
      .eq("id", productoId);

    if (error) {
      console.error("Error configurando umbrales:", error);
      return { success: false, error: "Error al guardar los umbrales en la base de datos" };
    }

    return { success: true };
  } catch (err) {
    console.error("Error inesperado configurando umbrales:", err);
    return { success: false, error: "Error inesperado al configurar umbrales" };
  }
}

/**
 * Obtiene la lista de productos en estado crítico (stock < umbral_critico).
 * Opcionalmente filtrado por obra.
 * @param {string} [obraId] - UUID de la obra (opcional, si no se pasa retorna todos)
 * @returns {Promise<Array<{ producto_id: string, descripcion: string, obra: string, cantidad: number, umbral_critico: number }>>}
 */
export async function obtenerProductosCriticos(obraId) {
  try {
    let query = supabase
      .from("stock_obra")
      .select(`
        producto_id,
        cantidad,
        obra_id,
        productos (descripcion, umbral_critico, umbral_alerta),
        obras (nombre)
      `);

    if (obraId) {
      query = query.eq("obra_id", obraId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error obteniendo productos críticos:", error);
      return [];
    }

    // Filtrar productos cuyo stock está por debajo del umbral crítico
    const criticos = data
      .filter((item) => {
        const umbralCritico = item.productos?.umbral_critico ?? UMBRAL_CRITICO_DEFAULT;
        return item.cantidad < umbralCritico;
      })
      .map((item) => ({
        producto_id: item.producto_id,
        descripcion: item.productos?.descripcion ?? "Sin descripción",
        obra: item.obras?.nombre ?? "Sin obra",
        cantidad: item.cantidad,
        umbral_critico: item.productos?.umbral_critico ?? UMBRAL_CRITICO_DEFAULT
      }))
      // Ordenar por menor stock primero (Req 8.6)
      .sort((a, b) => a.cantidad - b.cantidad);

    return criticos;
  } catch (err) {
    console.error("Error inesperado obteniendo productos críticos:", err);
    return [];
  }
}
