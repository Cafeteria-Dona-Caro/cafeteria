import { apiGet, sondear } from "../api.js";
import { verificarAcceso, montarEncabezado } from "../auth-guard.js";
import { h, reemplazar, haceCuanto, formatearPrecio, mostrarEstado } from "../utils.js";

const usuario = await verificarAcceso(["admin", "mesero", "caja"]);
montarEncabezado(usuario);

// Distribución del local
const AREAS = [
  { id: "PB", nombre: "Planta baja", mesas: ["PB-01", "PB-02", "PB-03", "PB-04", "PB-05", "PB-06", "PB-07", "PB-08"] },
  { id: "PA", nombre: "Planta alta", mesas: ["PA-01", "PA-02", "PA-03", "PA-04", "PA-05", "PA-06"] },
  { id: "B",  nombre: "Balcón",      mesas: ["B-01", "B-02", "B-03", "B-04"] }
];

const areasEl = document.getElementById("areas");
const filtros = document.getElementById("filtros");
const statusBox = document.getElementById("statusBox");

let areaActiva = "todas";
let porMesa = null; // null = todavía no llegan los datos

filtros.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  areaActiva = chip.dataset.area;
  filtros.querySelectorAll(".chip").forEach(c => c.classList.toggle("activo", c === chip));
  pintar();
});

/** Órdenes de hoy → estado de cada mesa (se consulta cada 5 s). */
async function cargar() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  let ordenes;
  try {
    ({ ordenes } = await apiGet("ordenes.php", { desde: hoy.toISOString() }));
    statusBox.hidden = true;
  } catch (err) {
    mostrarEstado(statusBox, err.message, "error");
    return;
  }

  porMesa = new Map();
  // La API las devuelve de la más nueva a la más vieja: gana la primera relevante de cada mesa
  for (const o of ordenes) {
    if (porMesa.has(o.mesa) || o.estado === "cancelada") continue;
    const porCobrar = o.estado === "cerrada" && o.estado_pago !== "pagado";
    if (o.estado === "cerrada" && !porCobrar) {
      porMesa.set(o.mesa, null); // la última cuenta ya se pagó: mesa libre
      continue;
    }
    porMesa.set(o.mesa, { ...o, porCobrar });
  }
  pintar();
}

function infoMesa(o) {
  if (!o) return { borde: "borde-libre", texto: "Libre" };
  if (o.porCobrar) return { borde: "borde-cancelada", texto: "Por cobrar" };
  switch (o.estado) {
    case "en_preparacion": return { borde: "borde-preparacion", texto: "En preparación" };
    case "lista": return { borde: "borde-lista", texto: "Listo para entregar" };
    default: return { borde: "borde-nueva", texto: "Pedido abierto" };
  }
}

function pintar() {
  if (!porMesa) {
    reemplazar(areasEl, h("div", { class: "vacio" }, "Cargando mesas…"));
    return;
  }
  const conocidas = new Set(AREAS.flatMap(a => a.mesas));
  const otras = [...porMesa.keys()].filter(m => porMesa.get(m) && !conocidas.has(m)).sort();

  const secciones = AREAS
    .filter(a => areaActiva === "todas" || a.id === areaActiva)
    .map(a => seccion(a.nombre, a.mesas));

  // Mesas escritas a mano que no están en el mapa (p. ej. "12" o "Barra")
  if (areaActiva === "todas" && otras.length) secciones.push(seccion("Otras mesas", otras));

  reemplazar(areasEl, secciones);
}

function seccion(nombre, mesas) {
  return h("section", {},
    h("h2", { class: "categoria-titulo" }, nombre),
    h("div", { class: "mesas-grid" }, mesas.map(m => {
      const o = porMesa.get(m);
      const info = infoMesa(o);
      return h("a", { class: "mesa-card " + info.borde, href: "mesero.html?mesa=" + encodeURIComponent(m) },
        h("span", { class: "nombre" }, m),
        h("span", { class: "detalle" }, info.texto + (o ? ` · ${haceCuanto(o.creado_en)}` : "")),
        o ? h("span", { class: "detalle" }, formatearPrecio(o.total) + (o.cliente ? " · " + o.cliente : "")) : null
      );
    }))
  );
}

pintar();
sondear(cargar, 5000);
