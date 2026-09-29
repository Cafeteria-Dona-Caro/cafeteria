import { apiGet, apiPost } from "../api.js";
import { verificarAcceso, montarEncabezado, ROLES } from "../auth-guard.js";
import { h, reemplazar, formatearPrecio, mostrarEstado } from "../utils.js";

const usuario = await verificarAcceso(["admin"]);
montarEncabezado(usuario);

/* ─── Pestañas ─── */
const tabs = document.querySelectorAll(".tab");
tabs.forEach(t => t.addEventListener("click", () => {
  tabs.forEach(x => x.classList.toggle("activo", x === t));
  document.getElementById("tab-usuarios").hidden = t.dataset.tab !== "usuarios";
  document.getElementById("tab-productos").hidden = t.dataset.tab !== "productos";
}));

/** Deshabilita el botón mientras corre la acción (evita envíos dobles). */
async function conBoton(boton, fn) {
  boton.disabled = true;
  try { return await fn(); } finally { boton.disabled = false; }
}

/* ═════════ USUARIOS ═════════ */
const formUsuario = document.getElementById("formUsuario");
const uId = document.getElementById("uId");
const uNombre = document.getElementById("uNombre");
const uEmail = document.getElementById("uEmail");
const uRol = document.getElementById("uRol");
const uPassword = document.getElementById("uPassword");
const uActivo = document.getElementById("uActivo");
const uTitulo = document.getElementById("uTitulo");
const statusUsuarios = document.getElementById("statusUsuarios");
const tablaUsuarios = document.getElementById("tablaUsuarios");

async function cargarUsuarios() {
  try {
    const { usuarios } = await apiGet("usuarios.php");
    const cuenta = { admin: 0, caja: 0, mesero: 0, cocina: 0 };
    usuarios.forEach(u => { if (u.activo) cuenta[u.rol]++; });
    document.getElementById("cAdmin").textContent = cuenta.admin;
    document.getElementById("cCaja").textContent = cuenta.caja;
    document.getElementById("cMesero").textContent = cuenta.mesero;
    document.getElementById("cCocina").textContent = cuenta.cocina;
    reemplazar(tablaUsuarios, usuarios.map(filaUsuario));
  } catch (err) {
    mostrarEstado(statusUsuarios, err.message, "error");
  }
}

function filaUsuario(u) {
  const esYo = u.id === usuario.id;
  return h("tr", { class: u.activo ? "" : "tenue" },
    h("td", {}, u.nombre || "—", esYo ? h("span", { class: "chico tenue" }, " (tú)") : null),
    h("td", {}, u.email),
    h("td", {}, h("span", { class: "pill rol-" + u.rol }, u.rol)),
    h("td", {}, u.activo ? "Activo" : "Sin acceso"),
    h("td", { class: "num" },
      h("div", { class: "fila", style: "justify-content:flex-end;flex-wrap:nowrap;" },
        h("button", { class: "btn btn-fantasma btn-sm", onclick: () => editarUsuario(u) }, "Editar"),
        esYo ? null : h("button", { class: "btn btn-peligro btn-sm", onclick: () => eliminarUsuario(u) }, "Eliminar")
      )
    )
  );
}

function editarUsuario(u) {
  const esYo = u.id === usuario.id;
  uId.value = u.id;
  uNombre.value = u.nombre;
  uEmail.value = u.email;
  uRol.value = u.rol;
  uActivo.checked = u.activo;
  uRol.disabled = uActivo.disabled = esYo;
  uPassword.value = "";
  uPassword.required = false;
  uPassword.placeholder = "Dejar vacío para no cambiarla";
  uTitulo.textContent = "Editar a " + (u.nombre || u.email);
  formUsuario.scrollIntoView({ behavior: "smooth", block: "center" });
  statusUsuarios.hidden = true;
}

async function eliminarUsuario(u) {
  if (!confirm(`¿Eliminar a ${u.email}? Ya no podrá iniciar sesión.\n(Para quitar el acceso sin borrarlo, edítalo y desmarca "Activo".)`)) return;
  try {
    await apiPost("usuarios.php", { accion: "eliminar", id: u.id });
    mostrarEstado(statusUsuarios, "Usuario eliminado.", "ok");
    cargarUsuarios();
  } catch (err) {
    mostrarEstado(statusUsuarios, err.message, "error");
  }
}

formUsuario.addEventListener("reset", () => {
  uId.value = "";
  uRol.disabled = uActivo.disabled = false;
  uPassword.required = true;
  uPassword.placeholder = "Mínimo 8 caracteres";
  uTitulo.textContent = "Nuevo usuario";
});

formUsuario.addEventListener("submit", (e) => {
  e.preventDefault();
  conBoton(formUsuario.querySelector("button[type=submit]"), async () => {
    try {
      await apiPost("usuarios.php", {
        accion: "guardar",
        id: uId.value ? Number(uId.value) : null,
        nombre: uNombre.value.trim(),
        email: uEmail.value.trim(),
        rol: uRol.value,
        activo: uActivo.checked,
        password: uPassword.value
      });
      formUsuario.reset();
      mostrarEstado(statusUsuarios, "Usuario guardado.", "ok");
      cargarUsuarios();
    } catch (err) {
      mostrarEstado(statusUsuarios, err.message, "error");
    }
  });
});

reemplazar(uRol, ROLES.map(r => h("option", { value: r }, r[0].toUpperCase() + r.slice(1))));
uRol.value = "mesero";

/* ═════════ PRODUCTOS ═════════ */
const formProducto = document.getElementById("formProducto");
const pNombre = document.getElementById("pNombre");
const pCategoria = document.getElementById("pCategoria");
const pPrecio = document.getElementById("pPrecio");
const listaCategorias = document.getElementById("listaCategorias");
const btnImportar = document.getElementById("btnImportar");
const statusProductos = document.getElementById("statusProductos");
const tablaProductos = document.getElementById("tablaProductos");
const buscarProducto = document.getElementById("buscarProducto");
const conteoProductos = document.getElementById("conteoProductos");

let productos = [];

async function cargarProductos() {
  try {
    ({ productos } = await apiGet("productos.php", { todos: 1 }));
    conteoProductos.textContent = `${productos.length} productos`;
    reemplazar(listaCategorias, [...new Set(productos.map(p => p.categoria))].map(c => h("option", { value: c })));
    pintarProductos();
  } catch (err) {
    mostrarEstado(statusProductos, err.message, "error");
  }
}

buscarProducto.addEventListener("input", pintarProductos);

function pintarProductos() {
  const texto = buscarProducto.value.trim().toLowerCase();
  const visibles = productos.filter(p => !texto ||
    p.nombre.toLowerCase().includes(texto) || p.categoria.toLowerCase().includes(texto));
  if (!visibles.length) {
    reemplazar(tablaProductos, h("tr", {}, h("td", { colspan: "5", class: "vacio" },
      productos.length ? "Sin resultados." : "No hay productos. Usa “Importar menú inicial”.")));
    return;
  }
  reemplazar(tablaProductos, visibles.map(filaProducto));
}

async function guardarProducto(p, cambios, mensaje) {
  try {
    const { producto } = await apiPost("productos.php", { accion: "editar", id: p.id, ...cambios });
    Object.assign(p, producto);
    mostrarEstado(statusProductos, mensaje, "ok");
  } catch (err) {
    mostrarEstado(statusProductos, err.message, "error");
    pintarProductos();
  }
}

function filaProducto(p) {
  const precio = h("input", {
    type: "number", min: "0", step: "0.5", inputmode: "decimal",
    value: String(p.precio), class: "input-precio", "aria-label": "Precio de " + p.nombre
  });
  precio.addEventListener("change", () => {
    const valor = Number(precio.value);
    if (!(valor >= 0)) { precio.value = String(p.precio); return; }
    guardarProducto(p, { precio: valor }, `${p.nombre}: ${formatearPrecio(valor)}`);
  });

  const activo = h("input", { type: "checkbox", checked: p.activo, "aria-label": "Disponible" });
  activo.addEventListener("change", () =>
    guardarProducto(p, { activo: activo.checked }, `${p.nombre} ${activo.checked ? "disponible" : "no disponible"}`));

  return h("tr", {},
    h("td", {}, p.nombre),
    h("td", { class: "tenue" }, p.categoria),
    h("td", { class: "num" }, precio),
    h("td", {}, activo),
    h("td", { class: "num" }, h("button", {
      class: "btn btn-peligro btn-sm",
      onclick: async () => {
        if (!confirm(`¿Eliminar "${p.nombre}" del menú?\nLos pedidos anteriores conservan su nombre y precio.`)) return;
        try {
          await apiPost("productos.php", { accion: "eliminar", id: p.id });
          mostrarEstado(statusProductos, "Producto eliminado.", "ok");
          cargarProductos();
        } catch (err) {
          mostrarEstado(statusProductos, err.message, "error");
        }
      }
    }, "Eliminar"))
  );
}

formProducto.addEventListener("submit", (e) => {
  e.preventDefault();
  conBoton(formProducto.querySelector("button[type=submit]"), async () => {
    try {
      const { producto } = await apiPost("productos.php", {
        accion: "crear",
        nombre: pNombre.value.trim(),
        categoria: pCategoria.value.trim(),
        precio: Number(pPrecio.value)
      });
      formProducto.reset();
      mostrarEstado(statusProductos, `Agregado: ${producto.nombre}`, "ok");
      cargarProductos();
    } catch (err) {
      mostrarEstado(statusProductos, err.message, "error");
    }
  });
});

btnImportar.addEventListener("click", () => conBoton(btnImportar, async () => {
  try {
    const { agregados } = await apiPost("productos.php", { accion: "importar" });
    mostrarEstado(statusProductos, agregados
      ? `${agregados} productos importados.`
      : "El menú ya está completo: no había nada que importar.", agregados ? "ok" : "info");
    cargarProductos();
  } catch (err) {
    mostrarEstado(statusProductos, err.message, "error");
  }
}));

cargarUsuarios();
cargarProductos();
