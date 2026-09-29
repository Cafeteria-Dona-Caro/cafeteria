import { apiGet, apiPost } from "../api.js";
import { h, reemplazar, formatearPrecio, agruparPorCategoria, mostrarEstado } from "../utils.js";

const MAX_ITEMS = 50;

const mesaInput = document.getElementById("mesaInput");
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

// La mesa puede venir en el QR: cliente.html?mesa=PB-01
const mesaUrl = new URLSearchParams(location.search).get("mesa");
if (mesaUrl) mesaInput.value = mesaUrl.slice(0, 20);

let productos = [];
let categoriaActiva = "Todas";
let carrito = [];

/* ─── Menú ─── */
async function cargarMenu() {
  try {
    ({ productos } = await apiGet("productos.php"));
    pintarCategorias();
    pintarProductos();
  } catch (err) {
    reemplazar(productosEl, h("div", { class: "vacio" }, "No se pudo cargar el menú. " + err.message));
  }
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
      h("button", { class: "producto-card", onclick: () => agregar(p) },
        h("span", { class: "nombre" }, p.nombre),
        h("span", { class: "precio" }, formatearPrecio(p.precio))
      )
    )));
  }
  reemplazar(productosEl, nodos);
}

/* ─── Carrito ─── */
function agregar(p) {
  if (carrito.length >= MAX_ITEMS) {
    mostrarEstado(statusBox, `Máximo ${MAX_ITEMS} productos por pedido.`, "error");
    return;
  }
  carrito.push({ producto_id: p.id, nombre: p.nombre, precio: p.precio, nota: "" });
  pintarCarrito();
  mostrarEstado(statusBox, `Agregado: ${p.nombre}`, "ok");
}

function pintarCarrito() {
  const hay = carrito.length > 0;
  carritoEl.hidden = !hay;
  barraCarrito.hidden = !hay;
  contenido.classList.toggle("con-carrito", hay);
  if (!hay) return;

  // El total es solo informativo: el servidor lo calcula con los precios del menú
  const total = carrito.reduce((s, it) => s + it.precio, 0);
  reemplazar(carritoItems, carrito.map((it, i) =>
    h("div", { class: "item-fila" },
      h("div", { style: "flex:1;min-width:0;" },
        h("div", { class: "nombre" }, it.nombre),
        h("input", {
          type: "text", maxlength: "140", placeholder: "Nota (ej. sin azúcar)",
          value: it.nota, class: "nota-input",
          oninput: (e) => { carrito[i].nota = e.target.value; }
        })
      ),
      h("div", { class: "pila", style: "align-items:flex-end;" },
        h("span", { class: "precio" }, formatearPrecio(it.precio)),
        h("button", {
          class: "btn btn-fantasma btn-sm", "aria-label": "Quitar " + it.nombre,
          onclick: () => { carrito.splice(i, 1); pintarCarrito(); }
        }, "Quitar")
      )
    )
  ));
  carritoTotal.textContent = formatearPrecio(total);
  barraResumen.textContent = `${carrito.length} producto${carrito.length === 1 ? "" : "s"} · ${formatearPrecio(total)}`;
}

/* ─── Enviar ─── */
btnEnviar.addEventListener("click", async () => {
  const mesa = mesaInput.value.trim();
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
    const { total } = await apiPost("ordenes.php", {
      accion: "pedido_cliente",
      mesa,
      cliente: nombreInput.value.trim(),
      items: carrito.map(it => ({ producto_id: it.producto_id, nota: it.nota.trim() }))
    });
    carrito = [];
    pintarCarrito();
    mostrarEstado(statusBox, `¡Pedido enviado! Total: ${formatearPrecio(total)}. En un momento te lo llevamos.`, "ok");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    mostrarEstado(statusBox, err.message, "error");
    // Si algún producto dejó de estar disponible, recargar el menú
    if (err.status === 409) cargarMenu();
  } finally {
    btnEnviar.disabled = false;
  }
});

cargarMenu();
