import { ordenes } from "../api.js";
import { verificarAcceso, montarEncabezado } from "../auth.js";
import { conectarSSE, agrupar } from "../sse.js";
import {
  h, reemplazar, formatearHora, haceCuanto, pildoraEstado, mostrarEstado, nombreOrden, ESTADOS_ORDEN
} from "../utils.js";

const usuario = await verificarAcceso(["admin", "cocina"]);
montarEncabezado(usuario);

const COLUMNAS = ["abierta", "en_preparacion", "lista"];
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
const vacios = { abierta: "Sin pedidos nuevos.", en_preparacion: "Nada en preparación.", lista: "Nada listo por entregar." };

const statusBox = document.getElementById("statusBox");
const panel = document.getElementById("panel");
const pTitulo = document.getElementById("pTitulo");
const pMeta = document.getElementById("pMeta");
const pEstado = document.getElementById("pEstado");
const pItems = document.getElementById("pItems");
const pNotas = document.getElementById("pNotas");
const pBotones = document.getElementById("pBotones");
const btnSonido = document.getElementById("btnSonido");

let lista = [];
let seleccionada = null;
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

/* ─── Pedidos ─── */
async function cargar() {
  try {
    ({ ordenes: lista } = await ordenes.listar({ estado: COLUMNAS.join(",") }));
    lista.reverse(); // la más antigua primero
    statusBox.hidden = true;
  } catch (err) {
    mostrarEstado(statusBox, err.message, "error");
    return;
  }
  pintarColumnas();
  if (seleccionada) {
    if (lista.some(o => o.id === seleccionada)) await pintarPanel(seleccionada);
    else cerrarPanel();
  }
}

function pintarColumnas() {
  for (const estado of COLUMNAS) {
    const grupo = lista.filter(o => o.estado === estado);
    contadores[estado].textContent = grupo.length;
    reemplazar(listas[estado], grupo.length ? grupo.map(tarjeta) : h("div", { class: "vacio" }, vacios[estado]));
  }
}

function tarjeta(o) {
  const nueva = recienLlegadas.has(o.id);
  return h("button", {
    class: `orden-card ${ESTADOS_ORDEN[o.estado].borde}` + (o.id === seleccionada ? " seleccionada" : "") + (nueva ? " nueva-animada" : ""),
    onclick: () => abrirPanel(o.id)
  },
    h("div", { class: "fila-entre" },
      h("span", { class: "titulo" }, o.mesa ? "Mesa " + o.mesa : "Para llevar"),
      h("span", { class: "meta" }, `${formatearHora(o.creado_en)} · hace ${haceCuanto(o.creado_en) || "0s"}`)
    ),
    h("div", { class: "meta" },
      `${o.num_items} producto${o.num_items === 1 ? "" : "s"}` +
      (o.items_pendientes && o.estado !== "abierta" ? ` · ${o.items_pendientes} nuevo${o.items_pendientes === 1 ? "" : "s"}` : "") +
      ` · ${o.cliente || "Sin nombre"} · ${o.origen === "cliente" ? "QR" : "Mesero"}`
    )
  );
}

/* ─── Panel de detalle ─── */
async function abrirPanel(id) {
  seleccionada = id;
  panel.hidden = false;
  reemplazar(pItems, h("div", { class: "vacio" }, "Cargando productos…"));
  pintarColumnas();
  await pintarPanel(id);
}

async function pintarPanel(id) {
  let datos;
  try {
    datos = await ordenes.detalle(id);
  } catch (err) {
    reemplazar(pItems, h("div", { class: "vacio" }, err.message));
    return;
  }
  if (seleccionada !== id) return;
  const { orden: o, items } = datos;

  pTitulo.textContent = nombreOrden(o);
  pMeta.textContent = `Pedido #${o.id} · ${o.origen === "cliente" ? "QR cliente" : "Mesero"} · ${formatearHora(o.creado_en)}`;
  reemplazar(pEstado, pildoraEstado(o.estado));
  pNotas.textContent = o.notas ? "Notas: " + o.notas : "";

  const visibles = items.filter(it => it.estado !== "cancelado");
  reemplazar(pItems, visibles.length
    ? visibles.map(it => h("div", {
        class: "item-fila" + (it.estado === "entregado" ? " item-hecho" : "") + (it.estado === "pendiente" && o.estado !== "abierta" ? " item-nuevo" : "")
      },
        h("div", {},
          h("div", { class: "nombre" }, `${it.cantidad} × ${it.nombre}`),
          it.notas ? h("div", { class: "nota" }, "Nota: " + it.notas) : null
        ),
        h("span", { class: "chico tenue" }, it.estado === "pendiente" && o.estado !== "abierta" ? "NUEVO" : it.estado.replace("_", " "))
      ))
    : h("div", { class: "vacio" }, "Sin productos."));

  const botones = [];
  if (o.estado === "abierta") {
    botones.push(h("button", { class: "btn btn-ambar", onclick: () => cambiarEstado(o.id, "en_preparacion") }, "Empezar a preparar"));
  }
  if (o.estado === "en_preparacion") {
    botones.push(h("button", { class: "btn btn-exito", onclick: () => cambiarEstado(o.id, "lista") }, "Marcar como lista"));
    botones.push(h("button", { class: "btn btn-fantasma btn-sm", onclick: () => cambiarEstado(o.id, "abierta") }, "↩ Regresar a nuevos"));
  }
  if (o.estado === "lista") {
    botones.push(h("p", { class: "chico tenue", style: "margin:0;" }, "El mesero la marca como entregada."));
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
    await ordenes.estado(id, nuevo);
    mostrarEstado(statusBox, `Pedido #${id} → ${ESTADOS_ORDEN[nuevo].texto}`, "ok");
    await cargar();
  } catch (err) {
    mostrarEstado(statusBox, err.message, "error");
  }
}

/* ─── Tiempo real ─── */
const recargar = agrupar(cargar);
conectarSSE({
  ordenNueva: (d) => {
    recienLlegadas.add(d.orden_id);
    setTimeout(() => recienLlegadas.delete(d.orden_id), 6000);
    beep();
    recargar();
  },
  ordenItems: (d) => {
    if (d.estado === "abierta") beep();
    recargar();
  },
  ordenEstado: recargar,
  reconectado: recargar
});

// Refrescar el "hace X min" (no consulta al servidor)
setInterval(pintarColumnas, 30000);
cargar();
