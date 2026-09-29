import { ordenes } from "../api.js";
import { verificarAcceso, montarEncabezado } from "../auth.js";
import { conectarSSE, agrupar } from "../sse.js";
import {
  h, reemplazar, formatearPrecio, formatearFecha, importeItem, pildoraEstado, mostrarEstado,
  nombreOrden, METODOS_PAGO
} from "../utils.js";

const usuario = await verificarAcceso(["admin", "caja"]);
montarEncabezado(usuario);

const filtros = document.getElementById("filtros");
const ordenesEl = document.getElementById("ordenes");
const detalleVacio = document.getElementById("detalleVacio");
const detalle = document.getElementById("detalle");
const dTitulo = document.getElementById("dTitulo");
const dMeta = document.getElementById("dMeta");
const dPildoras = document.getElementById("dPildoras");
const dItems = document.getElementById("dItems");
const dSubtotal = document.getElementById("dSubtotal");
const dTotal = document.getElementById("dTotal");
const formCobro = document.getElementById("formCobro");
const metodo = document.getElementById("metodo");
const descuento = document.getElementById("descuento");
const recibido = document.getElementById("recibido");
const cambio = document.getElementById("cambio");
const btnCobrar = document.getElementById("btnCobrar");
const btnCancelar = document.getElementById("btnCancelar");
const statusBox = document.getElementById("statusBox");

let lista = [];
let filtro = "pendientes";
let actual = null; // { orden, items }

reemplazar(metodo, h("option", { value: "" }, "— Seleccionar —"),
  Object.entries(METODOS_PAGO).map(([v, t]) => h("option", { value: v }, t)));

filtros.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  filtro = chip.dataset.filtro;
  filtros.querySelectorAll(".chip").forEach(c => c.classList.toggle("activo", c === chip));
  cargar();
});

/* ─── Lista ─── */
async function cargar() {
  const hoy = new Date();
  const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  try {
    const params = filtro === "pendientes" ? {} : filtro === "cobradas"
      ? { estado: "cobrada", desde: fechaHoy }
      : { desde: fechaHoy };
    ({ ordenes: lista } = await ordenes.listar(params));
    pintarLista();
  } catch (err) {
    mostrarEstado(statusBox, err.message, "error");
  }
}

function pintarLista() {
  if (!lista.length) {
    reemplazar(ordenesEl, h("div", { class: "vacio" }, filtro === "pendientes" ? "No hay cuentas por cobrar." : "Sin órdenes hoy."));
    return;
  }
  reemplazar(ordenesEl, lista.map(o =>
    h("button", { class: "orden-card" + (o.id === actual?.orden.id ? " seleccionada" : ""), onclick: () => seleccionar(o.id) },
      h("div", { class: "fila-entre" },
        h("span", { class: "titulo" }, nombreOrden(o)),
        h("strong", {}, formatearPrecio(o.total))
      ),
      h("div", { class: "fila-entre", style: "margin-top:.35rem;" },
        pildoraEstado(o.estado),
        h("span", { class: "meta" }, `#${o.id} · ${formatearFecha(o.creado_en)}`)
      )
    )
  ));
}

/* ─── Detalle y cobro ─── */
function pintarDetalle(datos) {
  actual = datos;
  const { orden: o, items } = datos;
  detalleVacio.hidden = true;
  detalle.hidden = false;
  dTitulo.textContent = nombreOrden(o);
  dMeta.textContent = `#${o.id} · ${formatearFecha(o.creado_en)} · ${o.origen === "cliente" ? "QR cliente" : "Mesero"}` +
    (o.metodo_pago ? ` · ${METODOS_PAGO[o.metodo_pago]}` : "");
  reemplazar(dPildoras, pildoraEstado(o.estado));
  const visibles = items.filter(it => it.estado !== "cancelado");
  reemplazar(dItems, visibles.length
    ? visibles.map(it => h("div", { class: "item-fila" },
        h("div", {},
          h("div", { class: "nombre" }, `${it.cantidad} × ${it.nombre}`),
          it.notas ? h("div", { class: "nota" }, "Nota: " + it.notas) : null
        ),
        h("span", { class: "precio" }, formatearPrecio(importeItem(it)))
      ))
    : h("div", { class: "vacio" }, "Esta orden no tiene productos."));

  dSubtotal.textContent = formatearPrecio(o.subtotal);
  const abierta = !["cobrada", "cancelada"].includes(o.estado);
  formCobro.hidden = !abierta;
  btnCancelar.hidden = !abierta;
  if (abierta) {
    descuento.value = o.descuento ? String(o.descuento) : "";
    descuento.max = String(o.subtotal);
    recibido.value = "";
  }
  calcular();
  pintarLista();
}

function calcular() {
  if (!actual) return;
  const o = actual.orden;
  const abierta = !["cobrada", "cancelada"].includes(o.estado);
  const desc = abierta ? Math.min(Number(descuento.value) || 0, o.subtotal) : o.descuento;
  const total = abierta ? Math.max(o.subtotal - desc, 0) : o.total;
  dTotal.textContent = formatearPrecio(total);
  const rec = Number(recibido.value) || 0;
  cambio.textContent = rec ? `Cambio: ${formatearPrecio(Math.max(rec - total, 0))}` : "";
}
descuento.addEventListener("input", calcular);
recibido.addEventListener("input", calcular);
metodo.addEventListener("change", () => { recibido.parentElement.hidden = metodo.value !== "efectivo"; calcular(); });

async function seleccionar(id) {
  statusBox.hidden = true;
  reemplazar(dItems, h("div", { class: "vacio" }, "Cargando…"));
  try {
    pintarDetalle(await ordenes.detalle(id));
  } catch (err) {
    mostrarEstado(statusBox, err.message, "error");
  }
}

formCobro.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!actual) return;
  if (!metodo.value) return mostrarEstado(statusBox, "Selecciona la forma de pago.", "error");
  btnCobrar.disabled = true;
  try {
    pintarDetalle(await ordenes.cobrar(actual.orden.id, { metodo_pago: metodo.value, descuento: Number(descuento.value) || 0 }));
    mostrarEstado(statusBox, `Cuenta #${actual.orden.id} cobrada: ${formatearPrecio(actual.orden.total)}.`, "ok");
    metodo.value = "";
    await cargar();
  } catch (err) {
    mostrarEstado(statusBox, err.message, "error");
  } finally {
    btnCobrar.disabled = false;
  }
});

btnCancelar.addEventListener("click", async () => {
  if (!actual || !confirm(`¿Cancelar la orden #${actual.orden.id}? No se cobrará.`)) return;
  try {
    pintarDetalle(await ordenes.estado(actual.orden.id, "cancelada"));
    mostrarEstado(statusBox, "Orden cancelada.", "ok");
    await cargar();
  } catch (err) {
    mostrarEstado(statusBox, err.message, "error");
  }
});

/* ─── Tiempo real ─── */
const recargar = agrupar(async () => {
  await cargar();
  if (actual) seleccionar(actual.orden.id);
});
conectarSSE({ cualquiera: (tipo) => { if (tipo !== "producto_actualizado") recargar(); }, reconectado: recargar });

cargar();
