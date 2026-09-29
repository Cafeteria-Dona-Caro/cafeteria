import { apiGet } from "../api.js";
import { verificarAcceso, montarEncabezado } from "../auth-guard.js";
import { h, reemplazar, formatearPrecio, formatearFecha, pildoraEstado, pildoraPago, mostrarEstado } from "../utils.js";

const usuario = await verificarAcceso(["admin", "caja"]);
montarEncabezado(usuario);

const METODOS = [
  ["efectivo", "Efectivo"], ["tarjeta", "Tarjeta"], ["transferencia", "Transferencia"],
  ["vales", "Vales"], ["mixto", "Mixto"], ["", "Sin método"]
];

const periodo = document.getElementById("periodo");
const desde = document.getElementById("desde");
const hasta = document.getElementById("hasta");
const btnActualizar = document.getElementById("btnActualizar");
const infoPeriodo = document.getElementById("infoPeriodo");
const statusBox = document.getElementById("statusBox");
const tabla = document.getElementById("tabla");
const metodosEl = document.getElementById("metodos");

const aInput = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function aplicarPreset(valor) {
  const hoy = new Date();
  let ini, fin;
  if (valor === "hoy") { ini = hoy; fin = hoy; }
  else if (valor === "ayer") { ini = new Date(hoy); ini.setDate(ini.getDate() - 1); fin = ini; }
  else if (valor === "7dias") { ini = new Date(hoy); ini.setDate(ini.getDate() - 6); fin = hoy; }
  else if (valor === "estemes") { ini = new Date(hoy.getFullYear(), hoy.getMonth(), 1); fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0); }
  else return;
  desde.value = aInput(ini);
  hasta.value = aInput(fin);
}

periodo.addEventListener("change", () => {
  const personalizado = periodo.value === "rango";
  desde.disabled = hasta.disabled = !personalizado;
  if (!personalizado) {
    aplicarPreset(periodo.value);
    cargar();
  }
});
btnActualizar.addEventListener("click", cargar);

async function cargar() {
  if (!desde.value || !hasta.value) {
    mostrarEstado(statusBox, "Selecciona las fechas Desde y Hasta.", "error");
    return;
  }
  // Fechas locales del navegador → UTC para el servidor
  const ini = new Date(desde.value + "T00:00:00");
  const fin = new Date(hasta.value + "T23:59:59.999");
  if (ini > fin) {
    mostrarEstado(statusBox, "La fecha Desde no puede ser posterior a Hasta.", "error");
    return;
  }
  const opt = { day: "2-digit", month: "short", year: "numeric" };
  infoPeriodo.textContent = `Del ${ini.toLocaleDateString("es-MX", opt)} al ${fin.toLocaleDateString("es-MX", opt)}.`;

  btnActualizar.disabled = true;
  mostrarEstado(statusBox, "Cargando…", "info");
  try {
    const { ordenes } = await apiGet("ordenes.php", { desde: ini.toISOString(), hasta: fin.toISOString() });
    const validas = ordenes.filter(o => o.estado !== "cancelada");
    pintarResumen(validas);
    pintarTabla(ordenes);
    mostrarEstado(statusBox, `${ordenes.length} órdenes en el periodo.`, "ok");
  } catch (err) {
    mostrarEstado(statusBox, err.message, "error");
  } finally {
    btnActualizar.disabled = false;
  }
}

function pintarResumen(ordenes) {
  let total = 0, tickets = 0, pagadas = 0;
  const porMetodo = Object.fromEntries(METODOS.map(([k]) => [k, 0]));

  ordenes.forEach(o => {
    if (!o.total) return;
    total += o.total;
    tickets++;
    if (o.estado_pago === "pagado") pagadas++;
    porMetodo[o.metodo_pago in porMetodo ? o.metodo_pago : ""] += o.total;
  });

  document.getElementById("kTotal").textContent = formatearPrecio(total);
  document.getElementById("kTickets").textContent = tickets;
  document.getElementById("kPromedio").textContent = formatearPrecio(tickets ? total / tickets : 0);
  document.getElementById("kPagadas").textContent = pagadas;

  reemplazar(metodosEl, METODOS.map(([k, nombre]) =>
    h("div", { class: "item-fila" },
      h("span", { class: "nombre" }, nombre),
      h("span", { class: "precio" }, formatearPrecio(porMetodo[k]))
    )
  ));
}

function pintarTabla(ordenes) {
  if (!ordenes.length) {
    reemplazar(tabla, h("tr", {}, h("td", { colspan: "7", class: "vacio" }, "No hay órdenes en este periodo.")));
    return;
  }
  reemplazar(tabla, ordenes.map(o =>
    h("tr", {},
      h("td", {}, formatearFecha(o.creado_en)),
      h("td", {}, o.mesa),
      h("td", {}, o.cliente),
      h("td", {}, pildoraEstado(o.estado)),
      h("td", {}, pildoraPago(o.estado_pago)),
      h("td", {}, o.metodo_pago || "—"),
      h("td", { class: "num" }, formatearPrecio(o.total))
    )
  ));
}

aplicarPreset("hoy");
cargar();
