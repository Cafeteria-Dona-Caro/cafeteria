import { apiGet, apiPost, sondear } from "../api.js";
import { verificarAcceso, montarEncabezado } from "../auth-guard.js";
import {
  h, reemplazar, formatearPrecio, formatearFecha, importeItem,
  pildoraEstado, pildoraPago, mostrarEstado
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
const dTotal = document.getElementById("dTotal");
const pagoEstado = document.getElementById("pagoEstado");
const pagoMetodo = document.getElementById("pagoMetodo");
const btnGuardar = document.getElementById("btnGuardar");
const permisos = document.getElementById("permisos");
const statusBox = document.getElementById("statusBox");

let ordenes = [];
let filtro = "pendientes";
let seleccionada = null;
let puedeCobrar = false;

function mostrarPermisos(puede) {
  puedeCobrar = puede;
  pagoEstado.disabled = pagoMetodo.disabled = btnGuardar.disabled = !puede;
  permisos.textContent = puede
    ? "El total lo calcula el sistema a partir de los productos."
    : "Tu rol es de solo lectura: el administrador registra los cobros.";
}
// Quién cobra se configura en api/config.php (roles_cobro); el servidor lo informa.
mostrarPermisos(usuario.puede_cobrar);

/* ─── Filtros ─── */
filtros.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  filtro = chip.dataset.filtro;
  filtros.querySelectorAll(".chip").forEach(c => c.classList.toggle("activo", c === chip));
  pintarLista();
});

/* ─── Órdenes de los últimos 30 días (se consultan cada 5 s) ─── */
async function cargar() {
  try {
    const desde = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    ({ ordenes } = await apiGet("ordenes.php", { desde }));
    pintarLista();
  } catch (err) {
    mostrarEstado(statusBox, err.message, "error");
  }
}

function pintarLista() {
  const pagada = (o) => o.estado_pago === "pagado";
  const visibles = ordenes.filter(o => {
    if (o.estado === "cancelada") return filtro === "todas";
    if (filtro === "abiertas") return o.estado !== "cerrada";
    if (filtro === "pendientes") return !pagada(o);
    if (filtro === "pagadas") return pagada(o);
    return true;
  });

  if (!visibles.length) {
    reemplazar(ordenesEl, h("div", { class: "vacio" }, "No hay órdenes con este filtro."));
    return;
  }
  reemplazar(ordenesEl, visibles.map(o =>
    h("button", {
      class: "orden-card" + (o.id === seleccionada ? " seleccionada" : ""),
      onclick: () => seleccionar(o.id)
    },
      h("div", { class: "fila-entre" },
        h("span", { class: "titulo" }, "Mesa " + o.mesa + (o.cliente ? " · " + o.cliente : "")),
        h("strong", {}, formatearPrecio(o.total))
      ),
      h("div", { class: "fila-entre", style: "margin-top:.35rem;" },
        h("span", { class: "fila" }, pildoraEstado(o.estado), pildoraPago(o.estado_pago)),
        h("span", { class: "meta" }, formatearFecha(o.creado_en))
      )
    )
  ));
}

/* ─── Detalle ─── */
function pintarDetalle({ orden: o, items }) {
  dTitulo.textContent = "Mesa " + o.mesa + (o.cliente ? " · " + o.cliente : "");
  dMeta.textContent = `#${o.id} · ${formatearFecha(o.creado_en)} · ${o.origen === "cliente" ? "QR cliente" : "Mesero"}`;
  reemplazar(dPildoras, pildoraEstado(o.estado), pildoraPago(o.estado_pago));
  reemplazar(dItems, items.length
    ? items.map(it => h("div", { class: "item-fila" },
        h("div", {},
          h("div", { class: "nombre" }, (it.cantidad > 1 ? `${it.cantidad} × ` : "") + it.nombre),
          it.nota ? h("div", { class: "nota" }, "Nota: " + it.nota) : null
        ),
        h("span", { class: "precio" }, formatearPrecio(importeItem(it)))
      ))
    : h("div", { class: "vacio" }, "Esta orden no tiene productos."));
  dTotal.textContent = formatearPrecio(o.total);
  pagoEstado.value = o.estado_pago;
  pagoMetodo.value = o.metodo_pago || "";
}

async function seleccionar(id) {
  seleccionada = id;
  pintarLista();
  detalleVacio.hidden = true;
  detalle.hidden = false;
  statusBox.hidden = true;
  reemplazar(dItems, h("div", { class: "vacio" }, "Cargando…"));
  try {
    const datos = await apiGet("ordenes.php", { id });
    if (seleccionada === id) pintarDetalle(datos);
  } catch (err) {
    mostrarEstado(statusBox, err.message, "error");
  }
}

/* ─── Guardar cobro ─── */
btnGuardar.addEventListener("click", async () => {
  if (!seleccionada) return;
  if (pagoEstado.value === "pagado" && !pagoMetodo.value) {
    mostrarEstado(statusBox, "Selecciona la forma de pago.", "error");
    return;
  }
  btnGuardar.disabled = true;
  try {
    pintarDetalle(await apiPost("ordenes.php", {
      accion: "cobrar",
      orden_id: seleccionada,
      estado_pago: pagoEstado.value,
      metodo_pago: pagoMetodo.value
    }));
    mostrarEstado(statusBox, "Cobro guardado.", "ok");
    await cargar();
  } catch (err) {
    mostrarEstado(statusBox, err.message, "error");
    if (err.status === 403) mostrarPermisos(false);
  } finally {
    btnGuardar.disabled = !puedeCobrar;
  }
});

sondear(cargar, 5000);
