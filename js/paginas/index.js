import { apiGet } from "../api.js";
import { h, reemplazar, formatearPrecio, agruparPorCategoria } from "../utils.js";

const chipsEl = document.getElementById("chips");
const menuEl = document.getElementById("menu");

let grupos = new Map();
let categoriaActiva = "Todo";

// Fuente de verdad: la base de datos. Si el servidor no responde (o el menú
// está vacío), se usa data/menu-inicial.json como respaldo.
async function cargar() {
  let productos = [];
  try {
    ({ productos } = await apiGet("productos.php"));
  } catch (err) {
    console.warn("Menú del servidor no disponible:", err);
  }
  if (!productos.length) {
    try {
      productos = (await (await fetch("data/menu-inicial.json")).json()).filter(p => p.activo !== false);
    } catch (err) {
      console.error(err);
    }
  }
  grupos = agruparPorCategoria(productos);
  pintar();
}

function pintar() {
  if (!grupos.size) {
    reemplazar(menuEl, h("div", { class: "vacio" }, "No pudimos cargar el menú. Intenta de nuevo más tarde."));
    return;
  }
  reemplazar(chipsEl, ["Todo", ...grupos.keys()].map(c =>
    h("button", {
      class: "chip" + (c === categoriaActiva ? " activo" : ""),
      onclick: () => { categoriaActiva = c; pintar(); }
    }, c)
  ));

  reemplazar(menuEl, [...grupos]
    .filter(([c]) => categoriaActiva === "Todo" || c === categoriaActiva)
    .map(([c, lista]) => h("section", { class: "card" },
      h("h2", {}, c),
      lista.map(p => h("div", { class: "menu-item" },
        h("span", {}, p.nombre),
        h("span", { class: "precio" }, formatearPrecio(p.precio))
      ))
    ))
  );
}

cargar();
