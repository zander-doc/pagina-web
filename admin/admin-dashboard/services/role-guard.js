import { supabase } from "./supabase-client.js";
import { requireSession } from "./sessionService.js";

export async function roleGuard(rolesPermitidos = []) {
  // MODO DESARROLLADOR
  if (localStorage.getItem("devMode") === "on") {
    console.warn("⚠ Modo desarrollador activo: roles deshabilitados");
    return true;
  }

  const session = requireSession();
  if (!session) return false;

  const userId = session.user.id;

  const { data, error } = await supabase
    .from("usuarios")
    .select("rol, estado")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error obteniendo rol:", error);
    return false;
  }

  if (data.estado !== "activo") {
    console.warn("Usuario desactivado");
    window.location.href = "/admin-dashboard/inicio-de-sesion.html";
    return false;
  }

  if (!rolesPermitidos.includes(data.rol)) {
    console.warn("Acceso denegado por rol");
    window.location.href = "/admin-dashboard/acceso-denegado.html";
    return false;
  }

  return true;
}

// Alias para compatibilidad
export { roleGuard as requireRole };

// ─────────────────────────────────────────────────────────────────────────────
// Guards de inventario — Control de acceso por rol para operaciones de inventario
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene el perfil del usuario actual (rol + estado).
 * Retorna null si no hay sesión o hay error.
 */
export async function obtenerPerfilUsuario() {
  if (localStorage.getItem("devMode") === "on") {
    return { rol: "admin", estado: "activo", id: "dev-user" };
  }

  const session = requireSession();
  if (!session) return null;

  const userId = session.user.id;

  const { data, error } = await supabase
    .from("usuarios")
    .select("id, rol, estado")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error obteniendo perfil:", error);
    return null;
  }

  if (data.estado !== "activo") return null;

  return data;
}

/**
 * Obtiene las obras asignadas a un almacenista.
 * Retorna array de obra_id. Para admin/jefe/supervisor retorna null (acceso a todas).
 */
export async function obtenerObrasAsignadas(userId) {
  const { data, error } = await supabase
    .from("usuario_obras")
    .select("obra_id")
    .eq("usuario_id", userId);

  if (error) {
    console.error("Error obteniendo obras asignadas:", error);
    return [];
  }

  return data.map((row) => row.obra_id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Definición de permisos por rol para operaciones de inventario
// ─────────────────────────────────────────────────────────────────────────────

const PERMISOS_INVENTARIO = {
  almacenista: {
    registrarEntrada: true,
    registrarSalida: true,
    registrarTransferencia: false,
    registrarAjuste: false,
    consultarStock: true, // solo obras asignadas
    consultarStockConsolidado: false,
    iniciarConteoFisico: false,
    aprobarReconciliacion: false,
    rechazarReconciliacion: false,
    configurarUmbrales: false,
    exportarReportes: false,
    gestionarObras: false,
    procesarLote: true, // solo entradas/salidas en obras asignadas
    verReportes: true, // solo consulta, no exportar
  },
  supervisor: {
    registrarEntrada: false,
    registrarSalida: false,
    registrarTransferencia: false,
    registrarAjuste: false,
    consultarStock: true, // todas las obras
    consultarStockConsolidado: true,
    iniciarConteoFisico: true,
    aprobarReconciliacion: true,
    rechazarReconciliacion: true,
    configurarUmbrales: false,
    exportarReportes: false,
    gestionarObras: false,
    procesarLote: false,
    verReportes: true,
  },
  admin: {
    registrarEntrada: true,
    registrarSalida: true,
    registrarTransferencia: true,
    registrarAjuste: true,
    consultarStock: true,
    consultarStockConsolidado: true,
    iniciarConteoFisico: true,
    aprobarReconciliacion: true,
    rechazarReconciliacion: true,
    configurarUmbrales: true,
    exportarReportes: true,
    gestionarObras: true,
    procesarLote: true,
    verReportes: true,
  },
  jefe: {
    registrarEntrada: true,
    registrarSalida: true,
    registrarTransferencia: true,
    registrarAjuste: true,
    consultarStock: true,
    consultarStockConsolidado: true,
    iniciarConteoFisico: true,
    aprobarReconciliacion: true,
    rechazarReconciliacion: true,
    configurarUmbrales: true,
    exportarReportes: true,
    gestionarObras: true,
    procesarLote: true,
    verReportes: true,
  },
};

/**
 * Verifica si un rol tiene permiso para una operación de inventario específica.
 * @param {string} rol - Rol del usuario (almacenista, supervisor, admin, jefe)
 * @param {string} operacion - Nombre de la operación a verificar
 * @returns {boolean}
 */
export function tienePermisoInventario(rol, operacion) {
  const permisos = PERMISOS_INVENTARIO[rol];
  if (!permisos) return false;
  return permisos[operacion] === true;
}

/**
 * Obtiene todos los permisos de inventario para un rol.
 * @param {string} rol - Rol del usuario
 * @returns {object|null} Mapa de permisos o null si rol inválido
 */
export function obtenerPermisosInventario(rol) {
  return PERMISOS_INVENTARIO[rol] || null;
}

/**
 * Verifica si el almacenista tiene acceso a una obra específica.
 * Admin/jefe/supervisor tienen acceso a todas las obras.
 * @param {string} rol - Rol del usuario
 * @param {string} obraId - ID de la obra a verificar
 * @param {string[]} obrasAsignadas - Array de IDs de obras asignadas al usuario
 * @returns {boolean}
 */
export function tieneAccesoObra(rol, obraId, obrasAsignadas) {
  if (rol === "admin" || rol === "jefe" || rol === "supervisor") {
    return true;
  }
  if (rol === "almacenista") {
    return obrasAsignadas.includes(obraId);
  }
  return false;
}

/**
 * Guard completo para operaciones de inventario.
 * Verifica sesión, rol, permiso de operación y acceso a obra (si aplica).
 * @param {string} operacion - Operación de inventario a verificar
 * @param {string|null} obraId - ID de la obra (opcional, para verificar acceso)
 * @returns {Promise<{permitido: boolean, rol: string|null, obrasAsignadas: string[], mensaje: string|null}>}
 */
export async function guardInventario(operacion, obraId = null) {
  const perfil = await obtenerPerfilUsuario();

  if (!perfil) {
    return {
      permitido: false,
      rol: null,
      obrasAsignadas: [],
      mensaje: "Sesión no válida o usuario inactivo",
    };
  }

  const { rol, id: userId } = perfil;

  // Verificar permiso de operación
  if (!tienePermisoInventario(rol, operacion)) {
    return {
      permitido: false,
      rol,
      obrasAsignadas: [],
      mensaje: "No tiene permisos para realizar esta operación",
    };
  }

  // Para almacenistas, verificar obras asignadas
  let obrasAsignadas = [];
  if (rol === "almacenista") {
    obrasAsignadas = await obtenerObrasAsignadas(userId);

    // Si no tiene obras asignadas, denegar acceso
    if (obrasAsignadas.length === 0) {
      return {
        permitido: false,
        rol,
        obrasAsignadas: [],
        mensaje:
          "No tiene obras asignadas. Contacte a un administrador para que le asigne al menos una obra.",
      };
    }

    // Si se especificó una obra, verificar acceso
    if (obraId && !obrasAsignadas.includes(obraId)) {
      return {
        permitido: false,
        rol,
        obrasAsignadas,
        mensaje: "No tiene acceso a esta obra",
      };
    }
  }

  return {
    permitido: true,
    rol,
    obrasAsignadas,
    mensaje: null,
  };
}

/**
 * Oculta elementos del DOM según el rol del usuario.
 * Los elementos deben tener el atributo `data-permiso` con el nombre de la operación requerida.
 * Los elementos sin permiso se remueven del DOM (no solo se ocultan).
 * @param {string} rol - Rol del usuario actual
 * @param {HTMLElement} contenedor - Elemento contenedor donde buscar (default: document)
 */
export function ocultarElementosPorRol(rol, contenedor = document) {
  const elementos = contenedor.querySelectorAll("[data-permiso]");

  elementos.forEach((el) => {
    const operacionRequerida = el.getAttribute("data-permiso");
    if (!tienePermisoInventario(rol, operacionRequerida)) {
      el.remove();
    }
  });
}

/**
 * Muestra un mensaje cuando el almacenista no tiene obras asignadas.
 * Reemplaza el contenido del contenedor con un mensaje informativo.
 * @param {HTMLElement} contenedor - Elemento donde mostrar el mensaje
 */
export function mostrarMensajeSinObras(contenedor) {
  contenedor.innerHTML = `
    <div class="sin-obras-mensaje" style="text-align: center; padding: 3rem; color: #6b7280;">
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 1rem;">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
      <h3 style="margin-bottom: 0.5rem; color: #374151;">Sin obras asignadas</h3>
      <p>No tiene obras asignadas actualmente. Contacte a un administrador para que le asigne al menos una obra.</p>
    </div>
  `;
}

/**
 * Filtra una lista de obras según el rol del usuario.
 * Almacenistas solo ven sus obras asignadas; otros roles ven todas.
 * @param {Array} obras - Lista completa de obras
 * @param {string} rol - Rol del usuario
 * @param {string[]} obrasAsignadas - IDs de obras asignadas (para almacenista)
 * @returns {Array} Obras filtradas
 */
export function filtrarObrasPorRol(obras, rol, obrasAsignadas) {
  if (rol === "admin" || rol === "jefe" || rol === "supervisor") {
    return obras;
  }
  if (rol === "almacenista") {
    return obras.filter((obra) => obrasAsignadas.includes(obra.id));
  }
  return [];
}
