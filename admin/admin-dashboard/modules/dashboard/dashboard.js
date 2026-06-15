/* ============================================================
   DASHBOARD MODULE — ADDBOX
   Conectado a Supabase
   Versión sin módulos ES6 para compatibilidad
============================================================ */

// 🔄 Reemplazado por install-guard.js
// Importar getSession para control de acceso
import { getSession } from "../../services/sessionService.js";
import { obtenerProductosCriticos } from "../../services/stockAlertService.js";

// Esperar a que el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
    initDashboard();
});

/* ============================
   CONTROL DE ACCESO POR ROL
============================ */
const session = getSession();
if (!session) {
    window.location.href = "../login/inicio-de-sesion.html";
} else {
    if (session.rol !== "admin") {
        // Ocultar botones admin
        document.querySelectorAll(".admin-only").forEach(el => el.style.display = "none");
    }
}

const rol = sessionStorage.getItem("rol");

// Ocultar módulos para roles sin permisos
if (rol !== "administrador" && rol !== "dueno") {
    const adminMenu = document.getElementById("menu-admin");
    if (adminMenu) adminMenu.style.display = "none";
}

if (rol === "almacenista") {
    const presupuestos = document.getElementById("menu-presupuestos");
    const obras = document.getElementById("menu-obras");
    const reportes = document.getElementById("menu-reportes");
    if (presupuestos) presupuestos.style.display = "none";
    if (obras) obras.style.display = "none";
    if (reportes) reportes.style.display = "none";
}

if (rol === "supervisor") {
    const movimientos = document.getElementById("menu-movimientos");
    if (movimientos) movimientos.style.display = "none";
}

/* ============================
   INICIALIZACIÓN
============================ */
async function initDashboard() {
    console.log("Dashboard inicializado con Supabase");

    // Verificar que supabase esté disponible
    if (!window.supabase) {
        console.error("Supabase no está disponible. Asegúrate de cargar la librería primero.");
        mostrarNotificacion("Error: Supabase no está disponible", "error");
        return;
    }

    await cargarIndicadores();
    await cargarMovimientosRecientes();
    await cargarAlertasStock();
    await cargarIndicadoresDevoluciones();
    await cargarGraficaMovimientosSemana();
    await cargarGraficaEntradasSalidas();

    // Suscripción realtime para actualizar indicadores automáticamente
    iniciarRealtimeDashboard();
}

/* ============================
   INDICADORES
============================ */
async function cargarIndicadores() {
    try {
        // 1. Total de productos
        const totalProductos = await obtenerTotalProductos();
        actualizarIndicador("totalProductos", totalProductos);
        
        // 2. Stock total
        const stockTotal = await obtenerStockTotal();
        actualizarIndicador("stockTotal", stockTotal);
        
        // 3. Movimientos hoy
        const movimientosHoy = await obtenerMovimientosHoy();
        actualizarIndicador("movimientosHoy", movimientosHoy);
        
        // 4. Total usuarios
        const totalUsuarios = await obtenerTotalUsuarios();
        actualizarIndicador("totalUsuarios", totalUsuarios);

        // 5. Valor del inventario
        const valorInventario = await obtenerValorInventario();
        actualizarIndicador("valorInventario", valorInventario);
        
    } catch (error) {
        console.error("Error cargando indicadores:", error);
        mostrarNotificacion("Error cargando indicadores", "error");
    }
}

function actualizarIndicador(id, valor) {
    const el = document.getElementById(id);
    if (!el) {
        console.warn(`Indicador no encontrado: ${id}`);
        return;
    }
    el.textContent = valor ?? "—";
}

/* ============================
   FUNCIONES DE SERVICIO
============================ */
async function obtenerTotalProductos() {
    try {
        const { count, error } = await window.supabase
            .from("productos")
            .select("*", { count: "exact", head: true });

        if (error) {
            console.error("ERROR productos:", error);
            throw error;
        }

        return count;
    } catch (error) {
        console.error("Error obteniendo total de productos:", error);
        return "Error";
    }
}

async function obtenerStockTotal() {
    try {
        const { data, error } = await window.supabase
            .from("productos")
            .select("stock");

        if (error) {
            console.error("ERROR stock:", error);
            throw error;
        }

        return data.reduce((acc, item) => acc + (item.stock || 0), 0);
    } catch (error) {
        console.error("Error obteniendo stock total:", error);
        return "Error";
    }
}

async function obtenerMovimientosHoy() {
    try {
        const hoy = new Date().toISOString().split("T")[0];

        const { count, error } = await window.supabase
            .from("movimientos")
            .select("*", { count: "exact" })
            .gte("creado_en", `${hoy}T00:00:00`)
            .lte("creado_en", `${hoy}T23:59:59`);

        if (error) {
            console.error("ERROR movimientos hoy:", error);
            throw error;
        }

        return count;
    } catch (error) {
        console.error("Error obteniendo movimientos hoy:", error);
        return "Error";
    }
}

async function obtenerTotalUsuarios() {
    try {
        const { count, error } = await window.supabase
            .from("usuarios")
            .select("*", { count: "exact", head: true });

        if (error) {
            console.error("ERROR usuarios:", error);
            throw error;
        }

        return count;
    } catch (error) {
        console.error("Error obteniendo total de usuarios:", error);
        return "Error";
    }
}

async function obtenerValorInventario() {
    try {
        const { data, error } = await window.supabase
            .from("productos")
            .select("costo_prom, existencia");

        if (error) {
            console.error("ERROR valor inventario:", error);
            throw error;
        }

        const valor = (data || []).reduce((sum, p) => {
            const costo = parseFloat(p.costo_prom) || 0;
            const stock = parseFloat(p.existencia) || 0;
            return sum + (costo * stock);
        }, 0);

        // Formatear como moneda
        if (valor >= 1000000) {
            return `$${(valor / 1000000).toFixed(2)}M`;
        } else if (valor >= 1000) {
            return `$${(valor / 1000).toFixed(1)}K`;
        } else {
            return `$${valor.toFixed(2)}`;
        }
    } catch (error) {
        console.error("Error obteniendo valor del inventario:", error);
        return "Error";
    }
}

/* ============================
   INDICADORES DE DEVOLUCIONES
============================ */
async function cargarIndicadoresDevoluciones() {
    try {
        // Importar dinámicamente el servicio de devoluciones
        const { obtenerResumenDevoluciones } = await import("../devoluciones/devoluciones.service.js");
        const resumen = await obtenerResumenDevoluciones(7);

        // Card "Materiales fuera"
        const elFuera = document.getElementById("materialesFuera");
        if (elFuera) elFuera.textContent = resumen.totalFuera || 0;

        // Card "Materiales vencidos" con indicador rojo si > 0
        const elVencidos = document.getElementById("materialesVencidos");
        if (elVencidos) {
            elVencidos.textContent = resumen.vencidos || 0;
            const cardVencidos = elVencidos.closest(".card-resumen") || elVencidos.parentElement;
            if (cardVencidos && resumen.vencidos > 0) {
                cardVencidos.classList.add("peligro");
            } else if (cardVencidos) {
                cardVencidos.classList.remove("peligro");
            }
        }
    } catch (error) {
        console.warn("[Dashboard] No se pudieron cargar indicadores de devoluciones:", error);
    }
}

/* ============================
   REALTIME — ACTUALIZACIÓN EN VIVO
============================ */
let realtimeProductosSub = null;
let realtimeMovimientosSub = null;

function iniciarRealtimeDashboard() {
    if (!window.supabase) return;

    // Suscribirse a cambios en productos (INSERT, UPDATE, DELETE)
    realtimeProductosSub = window.supabase
        .from("productos")
        .on("INSERT", () => refrescarDashboard())
        .on("UPDATE", () => refrescarDashboard())
        .on("DELETE", () => refrescarDashboard())
        .subscribe();

    // Suscribirse a cambios en movimientos (para actualizar "Movimientos hoy")
    realtimeMovimientosSub = window.supabase
        .from("movimientos")
        .on("INSERT", () => refrescarDashboard())
        .subscribe();

    console.log("Dashboard: suscripción realtime activa");
}

// Debounce para evitar múltiples refrescos simultáneos
let refrescoPendiente = null;
function refrescarDashboard() {
    if (refrescoPendiente) clearTimeout(refrescoPendiente);
    refrescoPendiente = setTimeout(async () => {
        await cargarIndicadores();
        await cargarAlertasStock();
        refrescoPendiente = null;
    }, 500);
}

// Limpiar suscripciones al salir de la página
window.addEventListener("beforeunload", () => {
    if (realtimeProductosSub) {
        window.supabase.removeSubscription(realtimeProductosSub);
        realtimeProductosSub = null;
    }
    if (realtimeMovimientosSub) {
        window.supabase.removeSubscription(realtimeMovimientosSub);
        realtimeMovimientosSub = null;
    }
});

/* ============================
   ALERTAS DE STOCK CRÍTICO
============================ */
async function cargarAlertasStock() {
    try {
        const productosCriticos = await obtenerProductosCriticos();

        // Actualizar badge de stock crítico en el indicador
        const badgeEl = document.getElementById("stockCriticoBadge");
        if (badgeEl) {
            if (productosCriticos.length > 0) {
                badgeEl.textContent = productosCriticos.length;
                badgeEl.style.display = "inline-flex";
            } else {
                badgeEl.style.display = "none";
            }
        }

        // Renderizar panel de productos críticos
        const panelEl = document.getElementById("panelStockCritico");
        if (!panelEl) {
            console.warn("Elemento #panelStockCritico no encontrado");
            return;
        }

        if (productosCriticos.length === 0) {
            panelEl.innerHTML = `
                <p class="small" style="color: var(--color-success, #00b894);">
                    <i class="fa fa-check-circle"></i> No hay productos en estado crítico
                </p>`;
            return;
        }

        const listaHTML = productosCriticos
            .slice(0, 10) // Mostrar máximo 10 en el dashboard
            .map(p => `
                <tr>
                    <td>${p.descripcion}</td>
                    <td>${p.obra}</td>
                    <td style="color: #d63031; font-weight: bold;">${p.cantidad}</td>
                    <td>${p.umbral_critico}</td>
                </tr>
            `)
            .join("");

        panelEl.innerHTML = `
            <table class="dashboard-table">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Obra</th>
                        <th>Stock Actual</th>
                        <th>Umbral Crítico</th>
                    </tr>
                </thead>
                <tbody>${listaHTML}</tbody>
            </table>
            ${productosCriticos.length > 10 ? `<p class="small">Mostrando 10 de ${productosCriticos.length} productos críticos</p>` : ""}
        `;
    } catch (error) {
        console.error("Error cargando alertas de stock:", error);
    }
}

/* ============================
   MOVIMIENTOS RECIENTES
============================ */
async function cargarMovimientosRecientes() {
    try {
        const { data, error } = await window.supabase
            .from("movimientos")
            .select(`
                id,
                cantidad,
                tipo,
                creado_en,
                productos (nombre),
                obras (nombre)
            `)
            .order("creado_en", { ascending: false })
            .limit(10);

        const tbody = document.getElementById("movimientosTableBody");

        if (error) {
            console.error("Error cargando movimientos recientes:", error);
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="5">Error cargando movimientos recientes</td></tr>`;
            }
            return;
        }

        if (!tbody) {
            console.warn("Elemento movimientosTableBody no encontrado");
            return;
        }

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5">No hay movimientos recientes</td></tr>`;
            return;
        }

        tbody.innerHTML = data
            .map(m => `
                <tr>
                    <td>${m.productos?.nombre || "—"}</td>
                    <td>${m.tipo}</td>
                    <td>${m.cantidad}</td>
                    <td>${m.obras?.nombre || "—"}</td>
                    <td>${new Date(m.creado_en).toLocaleString()}</td>
                </tr>
            `)
            .join("");
    } catch (error) {
        console.error("Error en cargarMovimientosRecientes:", error);
    }
}

/* ============================
   NOTIFICACIONES
============================ */
function mostrarNotificacion(msg, tipo = "info") {
    const cont = document.getElementById("notificaciones");
    if (!cont) return;

    cont.innerHTML = `<p class="${tipo}">${msg}</p>`;
}

/* ============================
   LOGOUT
============================ */
function logout() {
    window.location.href = "login.html";
}

/* ============================================================
   GRAFICAS PREMIUM — ADDBOX
============================================================ */

// 1. Movimientos por día (últimos 7 días)
async function cargarGraficaMovimientosSemana() {
    try {
        // Verificar si ApexCharts está disponible
        if (typeof ApexCharts === 'undefined') {
            console.warn("ApexCharts no está disponible. Cargando desde CDN...");
            await cargarApexCharts();
        }

        const hoy = new Date();
        const hace7 = new Date();
        hace7.setDate(hoy.getDate() - 6);

        const desde = hace7.toISOString();
        const hasta = hoy.toISOString();

        const { data, error } = await window.supabase
            .from("movimientos")
            .select("creado_en, tipo")
            .gte("creado_en", desde)
            .lte("creado_en", hasta);

        if (error) {
            console.error("Error gráfica semana:", error);
            return;
        }

        // Agrupar por día
        const dias = {};
        for (let i = 0; i < 7; i++) {
            const d = new Date(hace7);
            d.setDate(hace7.getDate() + i);
            const key = d.toISOString().split("T")[0];
            dias[key] = 0;
        }

        data.forEach(m => {
            const key = m.creado_en.split("T")[0];
            if (dias[key] !== undefined) dias[key]++;
        });

        const labels = Object.keys(dias);
        const valores = Object.values(dias);

        const chartElement = document.querySelector("#chartMovimientosSemana");
        if (!chartElement) {
            console.warn("Elemento #chartMovimientosSemana no encontrado");
            return;
        }

        const options = {
            chart: { type: "line", height: 300, toolbar: { show: false } },
            series: [{ name: "Movimientos", data: valores }],
            xaxis: { categories: labels },
            colors: ["#6c5ce7"],
            stroke: { width: 3, curve: "smooth" },
            markers: { size: 4, colors: ["#a29bfe"] },
            grid: { borderColor: "rgba(255,255,255,0.1)" }
        };

        new ApexCharts(chartElement, options).render();
    } catch (error) {
        console.error("Error en cargarGraficaMovimientosSemana:", error);
    }
}

// 2. Entradas vs Salidas
async function cargarGraficaEntradasSalidas() {
    try {
        // Verificar si ApexCharts está disponible
        if (typeof ApexCharts === 'undefined') {
            console.warn("ApexCharts no está disponible");
            return;
        }

        const { data, error } = await window.supabase
            .from("movimientos")
            .select("tipo");

        if (error) {
            console.error("Error gráfica entradas/salidas:", error);
            return;
        }

        const entradas = data.filter(m => m.tipo === "entrada").length;
        const salidas = data.filter(m => m.tipo === "salida").length;

        const chartElement = document.querySelector("#chartEntradasSalidas");
        if (!chartElement) {
            console.warn("Elemento #chartEntradasSalidas no encontrado");
            return;
        }

        const options = {
            chart: { type: "donut", height: 300 },
            labels: ["Entradas", "Salidas"],
            series: [entradas, salidas],
            colors: ["#00d2ff", "#ff7675"],
            legend: { position: "bottom" }
        };

        new ApexCharts(chartElement, options).render();
    } catch (error) {
        console.error("Error en cargarGraficaEntradasSalidas:", error);
    }
}

// Función para cargar ApexCharts desde CDN si no está disponible
function cargarApexCharts() {
    return new Promise((resolve, reject) => {
        if (typeof ApexCharts !== 'undefined') {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/apexcharts';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Hacer funciones disponibles globalmente
window.logout = logout;
window.cargarMovimientosRecientes = cargarMovimientosRecientes;