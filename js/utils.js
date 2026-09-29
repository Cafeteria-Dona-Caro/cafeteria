// js/utils.js
// Utilidades compartidas. Regla del proyecto: nunca interpolar datos de
// Firestore o del usuario dentro de innerHTML. Usa h() o textContent.

/**
 * Crea un elemento del DOM de forma segura.
 * Los hijos de tipo string se insertan como TEXTO (nunca como HTML).
 *   h("div", { class: "card", onclick: fn }, "Hola ", h("strong", {}, nombre))
 */
export function h(tag, attrs = {}, ...hijos) {
  const el = document.createElement(tag);
  for (const [clave, valor] of Object.entries(attrs || {})) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (clave.startsWith("on") && typeof valor === "function") {
      el.addEventListener(clave.slice(2), valor);
    } else if (clave === "class") {
      el.className = valor;
    } else if (clave === "dataset") {
      Object.assign(el.dataset, valor);
    } else if (clave in el && typeof valor !== "string") {
      el[clave] = valor;
    } else {
      el.setAttribute(clave, valor === true ? "" : valor);
    }
  }
  for (const hijo of hijos.flat()) {
    if (hijo === undefined || hijo === null || hijo === false) continue;
    el.append(hijo instanceof Node ? hijo : String(hijo));
  }
  return el;
}

/** Vacía un contenedor y le agrega los nodos indicados. */
export function reemplazar(contenedor, ...hijos) {
  contenedor.replaceChildren(...hijos.flat().filter(Boolean));
}

/** Escapa texto para los raros casos en que se necesite construir HTML. */
export function escaparHTML(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const formatoMXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

/** Formatea un precio en pesos mexicanos. */
export function formatearPrecio(cantidad) {
  return formatoMXN.format(Number(cantidad) || 0);
}

/** Convierte un Timestamp de Firestore (o Date) a Date. */
export function aFecha(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  if (typeof valor.toDate === "function") return valor.toDate();
  return null;
}

/** Fecha y hora legibles: "29 sep 2026, 14:05". */
export function formatearFecha(valor) {
  const fecha = aFecha(valor);
  if (!fecha) return "—";
  return fecha.toLocaleString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

/** Solo la hora: "14:05". */
export function formatearHora(valor) {
  const fecha = aFecha(valor);
  if (!fecha) return "--:--";
  return fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

/** Tiempo transcurrido corto: "45s", "12m", "3h". */
export function haceCuanto(valor) {
  const fecha = aFecha(valor);
  if (!fecha) return "";
  const seg = Math.max(0, Math.floor((Date.now() - fecha.getTime()) / 1000));
  if (seg < 60) return seg + "s";
  const min = Math.floor(seg / 60);
  if (min < 60) return min + "m";
  return Math.floor(min / 60) + "h";
}

/**
 * Precio de un producto. El seeder guarda `basePrice`; versiones anteriores
 * de la app leían `price`. Se aceptan ambos.
 */
export function precioProducto(p) {
  return Number(p?.basePrice ?? p?.price ?? 0);
}

/** Importe de un ítem de orden (precio unitario × cantidad). */
export function importeItem(it) {
  return Number(it?.price ?? it?.unitPrice ?? 0) * Number(it?.qty || 1);
}

/** Genera un ID estable a partir de un nombre: "Café de olla" → "cafe-de-olla". */
export function slugify(texto) {
  return String(texto || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── Estados de orden ──
export const ESTADOS_ORDEN = {
  abierta:        { texto: "Nueva",          clase: "estado-nueva" },
  en_preparacion: { texto: "En preparación", clase: "estado-preparacion" },
  lista:          { texto: "Lista",          clase: "estado-lista" },
  cerrada:        { texto: "Entregada",      clase: "estado-entregada" },
  cancelada:      { texto: "Cancelada",      clase: "estado-cancelada" }
};

export function pildoraEstado(estado) {
  const info = ESTADOS_ORDEN[estado] || ESTADOS_ORDEN.abierta;
  return h("span", { class: "pill " + info.clase }, info.texto);
}

export function pildoraPago(estadoPago) {
  const pagado = estadoPago === "pagado";
  return h("span", { class: "pill " + (pagado ? "pago-pagado" : "pago-pendiente") },
    pagado ? "Pagado" : "Pendiente");
}

/**
 * Muestra un mensaje en una caja de estado.
 * tipo: "ok" | "error" | "info"
 */
export function mostrarEstado(caja, mensaje, tipo = "info") {
  if (!caja) return;
  caja.textContent = mensaje;
  caja.className = "status status-" + tipo;
  caja.hidden = !mensaje;
}
