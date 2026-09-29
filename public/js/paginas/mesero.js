import { productos as apiProductos, mesas as apiMesas, ordenes } from "../api.js";
import { verificarAcceso, montarEncabezado } from "../auth.js";
import { conectarSSE, agrupar } from "../sse.js";
import {
  h, reemplazar, formatearPrecio, formatearHora, importeItem, agruparPorCategoria,
  pildoraEstado, mostrarEstado, nombreOrden
} from "../utils.js";

const usuario = await verificarAcceso(["admin", "mesero", "caja"]);
montarEncabezado(usuario);

const formMesa = document.getElementById("formMesa");
const mesaInput = document.getElementById("mesaInput");
const listaMesas = document.getElementById("listaMesas");
const clienteInput = document.getElementById("clienteInput");
const paraLlevar = document.getElementById("paraLlevar");
const infoOrden = document.getElementById("infoOrden");
const ordenTitulo = document.getElementById("ordenTitulo");
const ordenMeta = document.getElementById("ordenMeta");
const ordenEstado = document.getElementById("ordenEstado");
const itemsEl = document.getElementById("items");
const lineaTotal = document.getElementById("lineaTotal");
const totalEl = document.getElementById("total");
const btnEntregada = document.getElementById("btnEntregada");
const statusBox = document.getElementById("statusBox");
const productosEl = document.getElementById("productos");
const buscar = document.getElementById("buscar");

let orden = null;
let productos = [];

paraLlevar.addEventListener("change", () => {
  mesaInput.disabled = paraLlevar.checked;
  clienteInput.required = paraLlevar.checked;
});

/* ─── Menú ─── */
async function cargarProductos() {
  try {
    ({ productos } = await apiProductos.listar());
    pintarProductos();
  } catch (err) {
    reemplazar(productosEl, h("div", { class: "vacio" }, "Error al cargar el menú: " + err.message));
  }
}

function pintarProductos() {
  const texto = buscar.value.trim().toLowerCase();
  const visibles = productos.filter(p => !texto || p.nombre.toLowerCase().includes(texto) || p.categoria.toLowerCase().includes(texto));
  if (!visibles.length) {
    reemplazar(productosEl, h("div", { class: "vacio" }, "Sin resultados."));
    return;
  }
  const nodos = [];
  for (const [cat, lista] of agruparPorCategoria(visibles)) {
    nodos.push(h("h3", { class: "categoria-titulo" }, cat));
    nodos.push(h("div", { class: "productos-grid" }, lista.map(p =>
      h("button", { class: "producto-card", onclick: () => agregarItem(p) },
        h("span", { class: "nombre" }, p.nombre),
        h("span", { class: "precio" }, formatearPrecio(p.precio))
      )
    )));
  }
  reemplazar(productosEl, nodos);
}
buscar.addEventListener("input", pintarProductos);

/* ─── Pedido ─── */
const TEXTO_ITEM = { pendiente: "", en_preparacion: "preparando", listo: "listo", entregado: "entregado", cancelado: "cancelado" };

function pintarOrden({ orden: o, items }) {
  orden = o;
  infoOrden.hidden = false;
  ordenTitulo.textContent = nombreOrden(o);
  ordenMeta.textContent = `Pedido #${o.id} · ${formatearHora(o.creado_en)}` + (o.origen === "cliente" ? " · pedido por QR" : "");
  reemplazar(ordenEstado, pildoraEstado(o.estado));

  const editable = !["cobrada", "cancelada"].includes(o.estado);
  btnEntregada.hidden = o.estado !== "lista";

  reemplazar(itemsEl, items.length
    ? items.map(it => h("div", { class: "item-fila" + (["entregado", "cancelado"].includes(it.estado) ? " item-hecho" : "") },
        h("div", { style: "min-width:0;" },
          h("div", { class: "nombre" }, `${it.cantidad} × ${it.nombre}`),
          it.notas ? h("div", { class: "nota" }, "Nota: " + it.notas) : null,
          TEXTO_ITEM[it.estado] ? h("div", { class: "chico tenue" }, TEXTO_ITEM[it.estado]) : null
        ),
        h("div", { class: "fila" },
          h("span", { class: "precio" }, formatearPrecio(importeItem(it))),
          editable && (it.estado === "pendiente" || usuario.rol === "admin")
            ? h("button", { class: "btn btn-fantasma btn-sm", "aria-label": "Quitar " + it.nombre, onclick: () => quitarItem(it) }, "✕")
            : null
        )
      ))
    : h("div", { class: "vacio" }, "Aún no hay productos en este pedido."));

  lineaTotal.hidden = false;
  totalEl.textContent = formatearPrecio(o.total);
  if (!editable) mostrarEstado(statusBox, `Esta cuenta ya está ${o.estado}. Abre un pedido nuevo para la mesa.`, "info");
}

async function recargarOrden() {
  if (orden) pintarOrden(await ordenes.detalle(orden.id));
}

formMesa.addEventListener("submit", (e) => {
  e.preventDefault();
  abrirPedido();
});

async function abrirPedido() {
  const llevar = paraLlevar.checked;
  const mesa = mesaInput.value.trim().toUpperCase();
  const cliente = clienteInput.value.trim();
  if (!llevar && !mesa) return mostrarEstado(statusBox, "Escribe el número de mesa.", "error");
  if (llevar && !cliente) return mostrarEstado(statusBox, "Escribe el nombre del cliente.", "error");

  mostrarEstado(statusBox, llevar ? "Creando pedido para llevar…" : `Abriendo la mesa ${mesa}…`, "info");
  try {
    const datos = await ordenes.crear(llevar ? { tipo: "para_llevar", cliente, items: [] } : { mesa, cliente, items: [] });
    pintarOrden(datos);
    if (!clienteInput.value && datos.orden.cliente) clienteInput.value = datos.orden.cliente;
    mostrarEstado(statusBox, `Pedido #${datos.orden.id} listo para agregar productos.`, "ok");

    const url = new URL(location.href);
    url.search = llevar ? `?orden=${datos.orden.id}` : `?mesa=${encodeURIComponent(mesa)}`;
    history.replaceState(null, "", url);
  } catch (err) {
    mostrarEstado(statusBox, err.message, "error");
  }
}

async function agregarItem(p) {
  if (!orden) {
    mostrarEstado(statusBox, "Primero abre el pedido de una mesa.", "error");
    mesaInput.focus();
    return;
  }
  try {
    pintarOrden(await ordenes.agregarItem(orden.id, { producto_id: p.id, cantidad: 1 }));
    mostrarEstado(statusBox, `Agregado: ${p.nombre}`, "ok");
  } catch (err) {
    mostrarEstado(statusBox, err.message, "error");
  }
}

async function quitarItem(it) {
  if (!confirm(`¿Quitar "${it.nombre}" del pedido?`)) return;
  try {
    pintarOrden(await ordenes.quitarItem(orden.id, it.id));
    mostrarEstado(statusBox, "Producto quitado.", "ok");
  } catch (err) {
    mostrarEstado(statusBox, err.message, "error");
  }
}

btnEntregada.addEventListener("click", async () => {
  if (!orden) return;
  try {
    pintarOrden(await ordenes.estado(orden.id, "entregada"));
    mostrarEstado(statusBox, "Pedido entregado. La cuenta se cobra en caja.", "ok");
  } catch (err) {
    mostrarEstado(statusBox, err.message, "error");
  }
});

// Tiempo real: si cocina cambia el estado de este pedido, se ve al instante
const refrescar = agrupar(() => recargarOrden().catch(console.error));
conectarSSE({
  cualquiera: (_tipo, d) => { if (orden && d.orden_id === orden.id) refrescar(); },
  productoActualizado: agrupar(cargarProductos, 1000),
  reconectado: refrescar
});

await cargarProductos();
apiMesas.listar().then(({ mesas }) =>
  reemplazar(listaMesas, mesas.map(m => h("option", { value: m.numero }, m.seccion)))
).catch(() => {});

// Desde el mapa de mesas: mesero.html?mesa=PB-01 · pedido existente: ?orden=12
const params = new URLSearchParams(location.search);
if (params.get("mesa")) {
  mesaInput.value = params.get("mesa").slice(0, 10);
  abrirPedido();
} else if (params.get("orden")) {
  ordenes.detalle(Number(params.get("orden"))).then(pintarOrden).catch(err => mostrarEstado(statusBox, err.message, "error"));
}
