import { usuarios as apiUsuarios, productos as apiProductos } from "../api.js";
import { verificarAcceso, montarEncabezado, ROLES } from "../auth.js";
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

reemplazar(uRol, ROLES.map(r => h("option", { value: r }, r[0].toUpperCase() + r.slice(1))));
uRol.value = "mesero";

async function cargarUsuarios() {
  try {
    const { usuarios } = await apiUsuarios.listar();
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
    h("td", {}, u.nombre, esYo ? h("span", { class: "chico tenue" }, " (tú)") : null),
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
  uTitulo.textContent = "Editar a " + u.nombre;
  formUsuario.scrollIntoView({ behavior: "smooth", block: "center" });
  statusUsuarios.hidden = true;
}

async function eliminarUsuario(u) {
  if (!confirm(`¿Eliminar a ${u.email}? Ya no podrá iniciar sesión.\n(Para quitarle el acceso sin borrarlo, edítalo y desmarca "Activo".)`)) return;
  try {
    await apiUsuarios.eliminar(u.id);
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
    const datos = { nombre: uNombre.value.trim(), email: uEmail.value.trim(), rol: uRol.value };
    try {
      if (uId.value) {
        if (!uRol.disabled) datos.activo = uActivo.checked;
        else delete datos.rol;
        if (uPassword.value) datos.password = uPassword.value;
        await apiUsuarios.editar(Number(uId.value), datos);
      } else {
        await apiUsuarios.crear({ ...datos, password: uPassword.value });
      }
      formUsuario.reset();
      mostrarEstado(statusUsuarios, "Usuario guardado.", "ok");
      cargarUsuarios();
    } catch (err) {
      mostrarEstado(statusUsuarios, err.message, "error");
    }
  });
});

/* ═════════ PRODUCTOS ═════════ */
const formProducto = document.getElementById("formProducto");
const pId = document.getElementById("pId");
const pTitulo = document.getElementById("pTitulo");
const pNombre = document.getElementById("pNombre");
const pCategoria = document.getElementById("pCategoria");
const pPrecio = document.getElementById("pPrecio");
const pDescripcion = document.getElementById("pDescripcion");
const listaCategorias = document.getElementById("listaCategorias");
const statusProductos = document.getElementById("statusProductos");
const tablaProductos = document.getElementById("tablaProductos");
const buscarProducto = document.getElementById("buscarProducto");
const conteoProductos = document.getElementById("conteoProductos");

let productos = [];

async function cargarProductos() {
  try {
    const datos = await apiProductos.listar(true);
    productos = datos.productos;
    conteoProductos.textContent = `${productos.length} productos · ${datos.categorias.length} categorías`;
    reemplazar(listaCategorias, datos.categorias.map(c => h("option", { value: c.nombre })));
    pintarProductos();
  } catch (err) {
    mostrarEstado(statusProductos, err.message, "error");
  }
}

buscarProducto.addEventListener("input", pintarProductos);

function pintarProductos() {
  const texto = buscarProducto.value.trim().toLowerCase();
  const visibles = productos.filter(p => !texto || p.nombre.toLowerCase().includes(texto) || p.categoria.toLowerCase().includes(texto));
  reemplazar(tablaProductos, visibles.length
    ? visibles.map(filaProducto)
    : h("tr", {}, h("td", { colspan: "5", class: "vacio" }, "Sin resultados.")));
}

function filaProducto(p) {
  const precio = h("input", {
    type: "number", min: "0", step: "0.5", inputmode: "decimal",
    value: String(p.precio), class: "input-precio", "aria-label": "Precio de " + p.nombre
  });
  precio.addEventListener("change", async () => {
    const valor = Number(precio.value);
    if (!(valor >= 0)) { precio.value = String(p.precio); return; }
    try {
      const { producto } = await apiProductos.editar(p.id, { precio: valor });
      Object.assign(p, producto);
      mostrarEstado(statusProductos, `${p.nombre}: ${formatearPrecio(valor)}`, "ok");
    } catch (err) {
      precio.value = String(p.precio);
      mostrarEstado(statusProductos, err.message, "error");
    }
  });

  const disponible = h("input", { type: "checkbox", checked: p.disponible, "aria-label": "Disponible" });
  disponible.addEventListener("change", async () => {
    try {
      const { producto } = await apiProductos.estado(p.id, disponible.checked);
      Object.assign(p, producto);
      mostrarEstado(statusProductos, `${p.nombre} ${p.disponible ? "disponible" : "no disponible"}`, "ok");
    } catch (err) {
      disponible.checked = p.disponible;
      mostrarEstado(statusProductos, err.message, "error");
    }
  });

  return h("tr", { class: p.disponible ? "" : "tenue" },
    h("td", {}, h("div", {}, p.nombre), p.descripcion ? h("div", { class: "descripcion" }, p.descripcion) : null),
    h("td", { class: "tenue" }, p.categoria),
    h("td", { class: "num" }, precio),
    h("td", {}, disponible),
    h("td", { class: "num" }, h("button", { class: "btn btn-fantasma btn-sm", onclick: () => editarProducto(p) }, "Editar"))
  );
}

function editarProducto(p) {
  pId.value = p.id;
  pNombre.value = p.nombre;
  pCategoria.value = p.categoria;
  pPrecio.value = String(p.precio);
  pDescripcion.value = p.descripcion;
  pTitulo.textContent = "Editar " + p.nombre;
  formProducto.scrollIntoView({ behavior: "smooth", block: "center" });
}

formProducto.addEventListener("reset", () => {
  pId.value = "";
  pTitulo.textContent = "Agregar producto";
});

formProducto.addEventListener("submit", (e) => {
  e.preventDefault();
  conBoton(formProducto.querySelector("button[type=submit]"), async () => {
    const datos = {
      nombre: pNombre.value.trim(),
      categoria: pCategoria.value.trim(),
      precio: Number(pPrecio.value),
      descripcion: pDescripcion.value.trim()
    };
    try {
      const { producto } = pId.value ? await apiProductos.editar(Number(pId.value), datos) : await apiProductos.crear(datos);
      formProducto.reset();
      mostrarEstado(statusProductos, `Guardado: ${producto.nombre}`, "ok");
      cargarProductos();
    } catch (err) {
      mostrarEstado(statusProductos, err.message, "error");
    }
  });
});

cargarUsuarios();
cargarProductos();
