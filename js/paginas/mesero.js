import { apiGet, apiPost, sondear } from "../api.js";
import { verificarAcceso, montarEncabezado } from "../auth-guard.js";
import {
  h, reemplazar, formatearPrecio, formatearHora, importeItem, agruparPorCategoria,
  pildoraEstado, mostrarEstado
} from "../utils.js";

const usuario = await verificarAcceso(["admin", "mesero", "caja"]);
montarEncabezado(usuario);

const formMesa = document.getElementById("formMesa");
const mesaInput = document.getElementById("mesaInput");
const clienteInput = document.getElementById("clienteInput");
const infoOrden = document.getElementById("infoOrden");
const ordenTitulo = document.getElementById("ordenTitulo");
const ordenMeta = document.getElementById("ordenMeta");
const ordenEstado = document.getElementById("ordenEstado");
const itemsEl = document.getElementById("items");
const lineaTotal = document.getElementById("lineaTotal");
const totalEl = document.getElementById("total");
const btnCerrar = document.getElementById("btnCerrar");
const statusBox = document.getElementById("statusBox");
const productosEl = document.getElementById("productos");
const buscar = document.getElementById("buscar");

let orden = null;
let detenerSondeo = null;
let productos = [];

/* ─── Menú ─── */
async function cargarProductos() {
  try {
    ({ productos } = await apiGet("productos.php"));
    pintarProductos();
  } catch (err) {
    reemplazar(productosEl, h("div", { class: "vacio" }, "Error al cargar el menú: " + err.message));
  }
}

function pintarProductos() {
  const texto = buscar.value.trim().toLowerCase();
  const visibles = productos.filter(p => !texto || p.nombre.toLowerCase().includes(texto));
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
function pintarOrden({ orden: o, items }) {
  orden = o;
  infoOrden.hidden = false;
  ordenTitulo.textContent = `Mesa ${o.mesa}` + (o.cliente ? ` · ${o.cliente}` : "");
  ordenMeta.textContent = `Pedido #${o.id} · ${formatearHora(o.creado_en)}` + (o.origen === "cliente" ? " · pedido por QR" : "");
  reemplazar(ordenEstado, pildoraEstado(o.estado));

  const editable = !["cerrada", "cancelada"].includes(o.estado);
  btnCerrar.disabled = !editable;

  reemplazar(itemsEl, items.length
    ? items.map(it => h("div", { class: "item-fila" },
        h("div", { style: "min-width:0;" },
          h("div", { class: "nombre" }, (it.cantidad > 1 ? `${it.cantidad} × ` : "") + it.nombre),
          it.nota ? h("div", { class: "nota" }, "Nota: " + it.nota) : null
        ),
        h("div", { class: "fila" },
          h("span", { class: "precio" }, formatearPrecio(importeItem(it))),
          editable
            ? h("button", {
                class: "btn btn-fantasma btn-sm", "aria-label": "Quitar " + it.nombre,
                onclick: () => quitarItem(it)
              }, "✕")
            : null
        )
      ))
    : h("div", { class: "vacio" }, "Aún no hay productos en este pedido."));

  lineaTotal.hidden = false;
  totalEl.textContent = formatearPrecio(o.total);
}

async function recargarOrden() {
  if (!orden) return;
  pintarOrden(await apiGet("ordenes.php", { id: orden.id }));
}

formMesa.addEventListener("submit", (e) => {
  e.preventDefault();
  const mesa = mesaInput.value.trim();
  if (!mesa) {
    mostrarEstado(statusBox, "Escribe el número de mesa.", "error");
    return;
  }
  abrirPedido(mesa, clienteInput.value.trim());
});

async function abrirPedido(mesa, cliente = "") {
  detenerSondeo?.();
  mostrarEstado(statusBox, `Buscando pedido de la mesa ${mesa}…`, "info");
  try {
    const datos = await apiPost("ordenes.php", { accion: "abrir", mesa, cliente });
    pintarOrden(datos);
    if (!clienteInput.value && datos.orden.cliente) clienteInput.value = datos.orden.cliente;
    mostrarEstado(statusBox, `Pedido de la mesa ${mesa} listo.`, "ok");

    const url = new URL(location.href);
    url.searchParams.set("mesa", mesa);
    history.replaceState(null, "", url);

    // Ver cambios de cocina o de otros meseros
    detenerSondeo = sondear(recargarOrden, 5000);
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
    pintarOrden(await apiPost("ordenes.php", { accion: "agregar_item", orden_id: orden.id, producto_id: p.id }));
    mostrarEstado(statusBox, `Agregado: ${p.nombre}`, "ok");
  } catch (err) {
    mostrarEstado(statusBox, err.message, "error");
  }
}

async function quitarItem(it) {
  if (!confirm(`¿Quitar "${it.nombre}" del pedido?`)) return;
  try {
    pintarOrden(await apiPost("ordenes.php", { accion: "quitar_item", item_id: it.id }));
    mostrarEstado(statusBox, "Producto quitado.", "ok");
  } catch (err) {
    mostrarEstado(statusBox, err.message, "error");
  }
}

btnCerrar.addEventListener("click", async () => {
  if (!orden) return;
  if (!confirm("¿Cerrar la cuenta de esta mesa? Ya no se podrán agregar productos.")) return;
  try {
    pintarOrden(await apiPost("ordenes.php", { accion: "estado", orden_id: orden.id, estado: "cerrada" }));
    mostrarEstado(statusBox, "Cuenta cerrada. Lista para cobrar en caja.", "ok");
  } catch (err) {
    mostrarEstado(statusBox, err.message, "error");
  }
});

await cargarProductos();

// Si venimos del mapa de mesas: mesero.html?mesa=PB-01
const mesaUrl = new URLSearchParams(location.search).get("mesa");
if (mesaUrl) {
  mesaInput.value = mesaUrl.slice(0, 20);
  abrirPedido(mesaInput.value);
}
