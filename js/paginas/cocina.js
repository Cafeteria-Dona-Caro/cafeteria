import { apiGet, apiPost, sondear } from "../api.js";
import { verificarAcceso, montarEncabezado } from "../auth-guard.js";
import {
  h, reemplazar, formatearPrecio, formatearHora, haceCuanto, importeItem,
  pildoraEstado, mostrarEstado, ESTADOS_ORDEN
} from "../utils.js";

const usuario = await verificarAcceso(["admin", "cocina"]);
montarEncabezado(usuario);

const listas = {
  abierta: document.getElementById("listaNuevas"),
  en_preparacion: document.getElementById("listaPrep"),
  lista: document.getElementById("listaListas")
};
const contadores = {
  abierta: document.getElementById("cNuevas"),
  en_preparacion: document.getElementById("cPrep"),
  lista: document.getElementById("cListas")
};
const bordes = { abierta: "borde-nueva", en_preparacion: "borde-preparacion", lista: "borde-lista" };
const vacios = { abierta: "Sin pedidos nuevos.", en_preparacion: "Nada en preparación.", lista: "Nada listo por entregar." };

const statusBox = document.getElementById("statusBox");
const panel = document.getElementById("panel");
const pTitulo = document.getElementById("pTitulo");
const pMeta = document.getElementById("pMeta");
const pEstado = document.getElementById("pEstado");
const pItems = document.getElementById("pItems");
const pTotal = document.getElementById("pTotal");
const pBotones = document.getElementById("pBotones");
const btnSonido = document.getElementById("btnSonido");

let ordenes = [];
let seleccionada = null;
let conocidas = null; // IDs ya vistos, para detectar pedidos nuevos
const recienLlegadas = new Set();

/* ─── Sonido (los navegadores exigen un toque del usuario para activarlo) ─── */
let audioCtx = null;
btnSonido.addEventListener("click", () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    btnSonido.textContent = "🔔 Sonido";
    beep();
  } else {
    audioCtx.close();
    audioCtx = null;
    btnSonido.textContent = "🔇 Sonido";
  }
});

function beep() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  [0, 0.18].forEach((retraso, i) => {
    const osc = audioCtx.createOscillator();
    const gan = audioCtx.createGain();
    osc.frequency.value = i ? 1175 : 880;
    gan.gain.setValueAtTime(0.0001, t + retraso);
    gan.gain.exponentialRampToValueAtTime(0.3, t + retraso + 0.02);
    gan.gain.exponentialRampToValueAtTime(0.0001, t + retraso + 0.16);
    osc.connect(gan).connect(audioCtx.destination);
    osc.start(t + retraso);
    osc.stop(t + retraso + 0.18);
  });
}

/* ─── Pedidos activos (se consultan cada 4 s) ─── */
async function cargar() {
  try {
    ({ ordenes } = await apiGet("ordenes.php", { activas: 1 }));
    statusBox.hidden = true;
  } catch (err) {
    mostrarEstado(statusBox, err.message, "error");
    return;
  }

  const ids = new Set(ordenes.map(o => o.id));
  if (conocidas) {
    const nuevas = ordenes.filter(o => !conocidas.has(o.id) && o.estado === "abierta");
    nuevas.forEach(o => recienLlegadas.add(o.id));
    if (nuevas.length) beep();
  }
  conocidas = ids;

  pintarColumnas();
  if (seleccionada) {
    const o = ordenes.find(x => x.id === seleccionada);
    if (!o) cerrarPanel();
    else await pintarPanel(o);
  }
}

function pintarColumnas() {
  const grupos = { abierta: [], en_preparacion: [], lista: [] };
  ordenes.forEach(o => grupos[o.estado]?.push(o));
  for (const estado of Object.keys(grupos)) {
    contadores[estado].textContent = grupos[estado].length;
    reemplazar(listas[estado], grupos[estado].length
      ? grupos[estado].map(o => tarjeta(o, estado))
      : h("div", { class: "vacio" }, vacios[estado]));
  }
}

function tarjeta(o, estado) {
  const nueva = recienLlegadas.has(o.id);
  if (nueva) setTimeout(() => recienLlegadas.delete(o.id), 6000);
  return h("button", {
    class: `orden-card ${bordes[estado]}` + (o.id === seleccionada ? " seleccionada" : "") + (nueva ? " nueva-animada" : ""),
    onclick: () => abrirPanel(o.id)
  },
    h("div", { class: "fila-entre" },
      h("span", { class: "titulo" }, "Mesa " + o.mesa),
      h("span", { class: "meta" }, `${formatearHora(o.creado_en)} · hace ${haceCuanto(o.creado_en) || "0s"}`)
    ),
    h("div", { class: "meta" },
      `${o.num_items} producto${o.num_items === 1 ? "" : "s"} · ${o.cliente || "Sin nombre"} · ${o.origen === "cliente" ? "QR cliente" : "Mesero"}`
    )
  );
}

/* ─── Panel de detalle ─── */
async function abrirPanel(id) {
  seleccionada = id;
  panel.hidden = false;
  reemplazar(pItems, h("div", { class: "vacio" }, "Cargando productos…"));
  pintarColumnas();
  const o = ordenes.find(x => x.id === id);
  if (o) await pintarPanel(o);
}

async function pintarPanel(o) {
  let items;
  try {
    ({ items } = await apiGet("ordenes.php", { id: o.id }));
  } catch (err) {
    reemplazar(pItems, h("div", { class: "vacio" }, err.message));
    return;
  }
  if (seleccionada !== o.id) return;

  pTitulo.textContent = "Mesa " + o.mesa;
  pMeta.textContent = `Pedido #${o.id} · ${o.cliente || "Sin nombre"} · ${o.origen === "cliente" ? "QR cliente" : "Mesero"} · ${formatearHora(o.creado_en)}`;
  reemplazar(pEstado, pildoraEstado(o.estado));

  reemplazar(pItems, items.length
    ? items.map(it => h("div", { class: "item-fila" },
        h("div", {},
          h("div", { class: "nombre" }, `${it.cantidad} × ${it.nombre}`),
          it.nota ? h("div", { class: "nota" }, "Nota: " + it.nota) : null
        ),
        h("span", { class: "precio" }, formatearPrecio(importeItem(it)))
      ))
    : h("div", { class: "vacio" }, "Sin productos."));
  pTotal.textContent = formatearPrecio(o.total);

  const botones = [];
  if (o.estado === "abierta") {
    botones.push(h("button", { class: "btn btn-ambar", onclick: () => cambiarEstado(o.id, "en_preparacion") }, "Empezar a preparar"));
  }
  if (o.estado === "en_preparacion") {
    botones.push(h("button", { class: "btn btn-exito", onclick: () => cambiarEstado(o.id, "lista") }, "Marcar como listo"));
    botones.push(h("button", { class: "btn btn-fantasma btn-sm", onclick: () => cambiarEstado(o.id, "abierta") }, "↩ Regresar a nuevos"));
  }
  if (o.estado === "lista") {
    botones.push(h("button", {
      class: "btn btn-primario",
      onclick: () => confirm("¿Marcar como entregado? El pedido se cierra y pasa a caja.") && cambiarEstado(o.id, "cerrada")
    }, "Entregado (cerrar pedido)"));
    botones.push(h("button", { class: "btn btn-fantasma btn-sm", onclick: () => cambiarEstado(o.id, "en_preparacion") }, "↩ Regresar a preparación"));
  }
  reemplazar(pBotones, botones);
}

function cerrarPanel() {
  seleccionada = null;
  panel.hidden = true;
  pintarColumnas();
}
document.getElementById("pCerrar").addEventListener("click", cerrarPanel);

async function cambiarEstado(id, nuevo) {
  try {
    await apiPost("ordenes.php", { accion: "estado", orden_id: id, estado: nuevo });
    mostrarEstado(statusBox, `Pedido #${id} → ${ESTADOS_ORDEN[nuevo].texto}`, "ok");
    await cargar();
  } catch (err) {
    mostrarEstado(statusBox, err.message, "error");
  }
}

// Refrescar pedidos cada 4 s (y el "hace X min")
sondear(cargar, 4000);
