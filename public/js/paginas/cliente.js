import { productos as apiProductos, mesas as apiMesas, ordenes } from "../api.js";
import { h, reemplazar, formatearPrecio, agruparPorCategoria, mostrarEstado } from "../utils.js";

const MAX_ITEMS = 50;

const mesaInput = document.getElementById("mesaInput");
const listaMesas = document.getElementById("listaMesas");
const nombreInput = document.getElementById("nombreInput");
const chipsCategorias = document.getElementById("chipsCategorias");
const productosEl = document.getElementById("productos");
const carritoEl = document.getElementById("carrito");
const carritoItems = document.getElementById("carritoItems");
const carritoTotal = document.getElementById("carritoTotal");
const btnEnviar = document.getElementById("btnEnviar");
const statusBox = document.getElementById("statusBox");
const barraCarrito = document.getElementById("barraCarrito");
const barraResumen = document.getElementById("barraResumen");
const contenido = document.getElementById("contenido");

// La mesa viene en el QR: cliente.html?mesa=PB-01
const mesaUrl = new URLSearchParams(location.search).get("mesa");
if (mesaUrl) mesaInput.value = mesaUrl.slice(0, 10);

let productos = [];
let categoriaActiva = "Todas";
let carrito = []; // [{ producto_id, nombre, precio, cantidad, notas }]

/* ─── Menú y mesas ─── */
async function cargarMenu() {
  try {
    ({ productos } = await apiProductos.listar());
    pintarCategorias();
    pintarProductos();
  } catch (err) {
    reemplazar(productosEl, h("div", { class: "vacio" }, "No se pudo cargar el menú. " + err.message));
  }
}

async function cargarMesas() {
  try {
    const { mesas } = await apiMesas.listar();
    reemplazar(listaMesas, mesas.map(m => h("option", { value: m.numero }, m.seccion)));
  } catch { /* opcional */ }
}

function pintarCategorias() {
  const categorias = ["Todas", ...agruparPorCategoria(productos).keys()];
  reemplazar(chipsCategorias, categorias.map(c =>
    h("button", {
      class: "chip" + (c === categoriaActiva ? " activo" : ""),
      onclick: () => { categoriaActiva = c; pintarCategorias(); pintarProductos(); }
    }, c)
  ));
}

function pintarProductos() {
  const visibles = productos.filter(p => categoriaActiva === "Todas" || p.categoria === categoriaActiva);
  if (!visibles.length) {
    reemplazar(productosEl, h("div", { class: "vacio" }, "No hay productos disponibles."));
    return;
  }
  const nodos = [];
  for (const [cat, lista] of agruparPorCategoria(visibles)) {
    nodos.push(h("h3", { class: "categoria-titulo" }, cat));
    nodos.push(h("div", { class: "productos-grid" }, lista.map(p =>
      h("button", { class: "producto-card", onclick: () => agregar(p), title: p.descripcion || p.nombre },
        h("span", { class: "nombre" }, p.nombre),
        h("span", { class: "precio" }, formatearPrecio(p.precio))
      )
    )));
  }
  reemplazar(productosEl, nodos);
}

/* ─── Carrito ─── */
const unidades = () => carrito.reduce((s, it) => s + it.cantidad, 0);

function agregar(p) {
  if (unidades() >= MAX_ITEMS) {
    mostrarEstado(statusBox, `Máximo ${MAX_ITEMS} productos por pedido.`, "error");
    return;
  }
  const linea = carrito.find(it => it.producto_id === p.id && !it.notas);
  if (linea && linea.cantidad < 20) linea.cantidad++;
  else carrito.push({ producto_id: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1, notas: "" });
  pintarCarrito();
  mostrarEstado(statusBox, `Agregado: ${p.nombre}`, "ok");
}

function pintarCarrito() {
  const hay = carrito.length > 0;
  carritoEl.hidden = !hay;
  barraCarrito.hidden = !hay;
  contenido.classList.toggle("con-carrito", hay);
  if (!hay) return;

  // Total solo informativo: el servidor lo calcula con los precios de la base de datos
  const total = carrito.reduce((s, it) => s + it.precio * it.cantidad, 0);
  reemplazar(carritoItems, carrito.map((it, i) =>
    h("div", { class: "item-fila" },
      h("div", { style: "flex:1;min-width:0;" },
        h("div", { class: "nombre" }, `${it.cantidad} × ${it.nombre}`),
        h("input", {
          type: "text", maxlength: "255", placeholder: "Nota (ej. sin azúcar)",
          value: it.notas, class: "nota-input",
          oninput: (e) => { carrito[i].notas = e.target.value; }
        })
      ),
      h("div", { class: "pila", style: "align-items:flex-end;" },
        h("span", { class: "precio" }, formatearPrecio(it.precio * it.cantidad)),
        h("button", {
          class: "btn btn-fantasma btn-sm", "aria-label": "Quitar uno de " + it.nombre,
          onclick: () => {
            if (--carrito[i].cantidad <= 0) carrito.splice(i, 1);
            pintarCarrito();
          }
        }, "−1")
      )
    )
  ));
  carritoTotal.textContent = formatearPrecio(total);
  const n = unidades();
  barraResumen.textContent = `${n} producto${n === 1 ? "" : "s"} · ${formatearPrecio(total)}`;
}

/* ─── Enviar ─── */
btnEnviar.addEventListener("click", async () => {
  const mesa = mesaInput.value.trim().toUpperCase();
  if (!mesa) {
    mostrarEstado(statusBox, "Escribe el número de tu mesa.", "error");
    mesaInput.focus();
    return;
  }
  if (!carrito.length) {
    mostrarEstado(statusBox, "Tu pedido está vacío.", "error");
    return;
  }

  btnEnviar.disabled = true;
  mostrarEstado(statusBox, "Enviando pedido…", "info");
  try {
    const { orden } = await ordenes.crear({
      mesa,
      cliente: nombreInput.value.trim(),
      // Solo producto, cantidad y nota: el precio lo pone el servidor
      items: carrito.map(it => ({ producto_id: it.producto_id, cantidad: it.cantidad, notas: it.notas.trim() }))
    });
    carrito = [];
    pintarCarrito();
    mostrarEstado(statusBox, `¡Pedido #${orden.id} enviado! Total: ${formatearPrecio(orden.total)}. En un momento te lo llevamos.`, "ok");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    mostrarEstado(statusBox, err.message, "error");
    if (err.status === 409) cargarMenu(); // algún producto dejó de estar disponible
  } finally {
    btnEnviar.disabled = false;
  }
});

cargarMenu();
cargarMesas();
