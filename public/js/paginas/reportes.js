import { reportes } from "../api.js";
import { verificarAcceso, montarEncabezado } from "../auth.js";
import { h, reemplazar, formatearPrecio, formatearFecha, pildoraEstado, mostrarEstado, nombreOrden, METODOS_PAGO } from "../utils.js";

const usuario = await verificarAcceso(["admin"]);
montarEncabezado(usuario);

const periodo = document.getElementById("periodo");
const desde = document.getElementById("desde");
const hasta = document.getElementById("hasta");
const btnActualizar = document.getElementById("btnActualizar");
const infoPeriodo = document.getElementById("infoPeriodo");
const statusBox = document.getElementById("statusBox");
const tabla = document.getElementById("tabla");
const metodosEl = document.getElementById("metodos");
const productosEl = document.getElementById("productosVendidos");

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
  if (!personalizado) { aplicarPreset(periodo.value); cargar(); }
});
btnActualizar.addEventListener("click", cargar);

async function cargar() {
  if (!desde.value || !hasta.value) return mostrarEstado(statusBox, "Selecciona las fechas.", "error");
  const opt = { day: "2-digit", month: "short", year: "numeric" };
  infoPeriodo.textContent = `Ventas cobradas del ${new Date(desde.value + "T12:00").toLocaleDateString("es-MX", opt)} al ${new Date(hasta.value + "T12:00").toLocaleDateString("es-MX", opt)}.`;
  btnActualizar.disabled = true;
  mostrarEstado(statusBox, "Cargando…", "info");
  try {
    const r = await reportes.ventas(desde.value, hasta.value);
    document.getElementById("kTotal").textContent = formatearPrecio(r.total);
    document.getElementById("kTickets").textContent = r.tickets;
    document.getElementById("kPromedio").textContent = formatearPrecio(r.promedio);
    document.getElementById("kDescuentos").textContent = formatearPrecio(r.descuentos);

    reemplazar(metodosEl, r.por_metodo.length
      ? r.por_metodo.map(m => h("div", { class: "item-fila" },
          h("span", { class: "nombre" }, `${METODOS_PAGO[m.metodo] || "Sin método"} · ${m.tickets} ticket${m.tickets === 1 ? "" : "s"}`),
          h("span", { class: "precio" }, formatearPrecio(m.total))))
      : h("div", { class: "vacio" }, "Sin ventas en el periodo."));

    reemplazar(productosEl, r.por_producto.length
      ? r.por_producto.map(p => h("tr", {}, h("td", {}, p.nombre), h("td", { class: "num" }, p.cantidad), h("td", { class: "num" }, formatearPrecio(p.total))))
      : h("tr", {}, h("td", { colspan: "3", class: "vacio" }, "Sin ventas.")));

    reemplazar(tabla, r.ordenes.length
      ? r.ordenes.map(o => h("tr", {},
          h("td", {}, formatearFecha(o.cobrada_en || o.creado_en)),
          h("td", {}, `#${o.id}`),
          h("td", {}, nombreOrden(o)),
          h("td", {}, pildoraEstado(o.estado)),
          h("td", {}, METODOS_PAGO[o.metodo_pago] || "—"),
          h("td", { class: "num" }, formatearPrecio(o.total))))
      : h("tr", {}, h("td", { colspan: "6", class: "vacio" }, "No hay órdenes en este periodo.")));

    mostrarEstado(statusBox, `${r.tickets} tickets cobrados.`, "ok");
  } catch (err) {
    mostrarEstado(statusBox, err.message, "error");
  } finally {
    btnActualizar.disabled = false;
  }
}

aplicarPreset("hoy");
cargar();
