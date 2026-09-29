import { mesas as apiMesas } from "../api.js";
import { verificarAcceso, montarEncabezado } from "../auth.js";
import { conectarSSE, agrupar } from "../sse.js";
import { h, reemplazar, haceCuanto, formatearPrecio, mostrarEstado, ESTADOS_ORDEN } from "../utils.js";

const usuario = await verificarAcceso(["admin", "mesero"]);
montarEncabezado(usuario);

const areasEl = document.getElementById("areas");
const filtros = document.getElementById("filtros");
const statusBox = document.getElementById("statusBox");

let mesas = null; // null = todavía no llegan los datos
let seccionActiva = "todas";

filtros.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  seccionActiva = chip.dataset.seccion;
  pintar();
});

async function cargar() {
  try {
    ({ mesas } = await apiMesas.mapa());
    statusBox.hidden = true;
    pintar();
  } catch (err) {
    mostrarEstado(statusBox, err.message, "error");
  }
}

/** Estado de la mesa = el de su orden más atrasada (lo que más urge). */
function infoMesa(m) {
  if (!m.ordenes.length) return { borde: "borde-libre", texto: "Libre" };
  const prioridad = ["lista", "abierta", "en_preparacion", "entregada"];
  const o = [...m.ordenes].sort((a, b) => prioridad.indexOf(a.estado) - prioridad.indexOf(b.estado))[0];
  const textos = { abierta: "Pedido nuevo", en_preparacion: "En preparación", lista: "¡Listo para entregar!", entregada: "Por cobrar" };
  return { borde: ESTADOS_ORDEN[o.estado].borde, texto: textos[o.estado] };
}

function pintar() {
  if (!mesas) {
    reemplazar(areasEl, h("div", { class: "vacio" }, "Cargando mesas…"));
    return;
  }
  const secciones = [...new Set(mesas.map(m => m.seccion))];
  reemplazar(filtros, ["todas", ...secciones].map(s =>
    h("button", { class: "chip" + (s === seccionActiva ? " activo" : ""), dataset: { seccion: s } }, s === "todas" ? "Todas" : s)
  ));

  reemplazar(areasEl, secciones
    .filter(s => seccionActiva === "todas" || s === seccionActiva)
    .map(s => h("section", {},
      h("h2", { class: "categoria-titulo" }, s),
      h("div", { class: "mesas-grid" }, mesas.filter(m => m.seccion === s).map(m => {
        const info = infoMesa(m);
        const total = m.ordenes.reduce((t, o) => t + o.total, 0);
        const primera = m.ordenes[0];
        return h("a", { class: "mesa-card " + info.borde, href: "mesero.html?mesa=" + encodeURIComponent(m.numero) },
          h("span", { class: "nombre" }, m.numero),
          h("span", { class: "detalle" }, info.texto + (primera ? ` · ${haceCuanto(primera.creado_en)}` : "")),
          primera ? h("span", { class: "detalle" },
            formatearPrecio(total) + (m.ordenes.length > 1 ? ` · ${m.ordenes.length} pedidos` : "") + (primera.cliente ? " · " + primera.cliente : "")) : null
        );
      }))
    )));
}

const recargar = agrupar(cargar);
conectarSSE({ cualquiera: (tipo) => { if (tipo !== "producto_actualizado") recargar(); }, reconectado: recargar });
setInterval(pintar, 30000); // refresca "hace X min" sin consultar al servidor
pintar();
cargar();
