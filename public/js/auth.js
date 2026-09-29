// js/auth.js
// Verificación de sesión y rol: un solo lugar para todas las pantallas del personal.
// OJO: esto solo controla la interfaz. La seguridad real está en la API PHP (api/).

import { auth } from "./api.js";
import { h, reemplazar } from "./utils.js";

export const ROLES = ["admin", "caja", "mesero", "cocina"];

/** Pantalla principal de cada rol (a dónde lleva el login). */
export const INICIO_POR_ROL = {
  admin: "admin.html",
  caja: "caja.html",
  mesero: "mesas.html",
  cocina: "cocina.html"
};

/** Pantallas del personal y qué roles pueden abrirlas. */
export const PANTALLAS = [
  { archivo: "mesas.html",    titulo: "Mesas",    roles: ["admin", "mesero"] },
  { archivo: "mesero.html",   titulo: "Mesero",   roles: ["admin", "mesero", "caja"] },
  { archivo: "cocina.html",   titulo: "Cocina",   roles: ["admin", "cocina"] },
  { archivo: "caja.html",     titulo: "Caja",     roles: ["admin", "caja"] },
  { archivo: "reportes.html", titulo: "Reportes", roles: ["admin"] },
  { archivo: "admin.html",    titulo: "Admin",    roles: ["admin"] }
];

function ir(pagina) {
  window.location.replace(pagina);
}

/** Devuelve el usuario con sesión ({ id, email, nombre, rol }) o null. */
export async function obtenerSesion() {
  const { usuario } = await auth.yo();
  return usuario;
}

/**
 * Verifica que el usuario esté logueado y tenga uno de los roles permitidos.
 * Si no cumple, redirige y la promesa nunca se resuelve (la página no sigue).
 * @param {string[]} rolesPermitidos — ej: ["admin", "caja"]
 */
export async function verificarAcceso(rolesPermitidos) {
  const nunca = new Promise(() => {});
  let usuario;
  try {
    usuario = await obtenerSesion();
  } catch (err) {
    console.error(err);
    if (err.status) {
      // El servidor respondió con un error (p. ej. falta configurar la base de datos)
      document.documentElement.classList.remove("auth-pendiente");
      document.querySelector("main")?.replaceChildren(h("div", { class: "status status-error" }, err.message));
      return nunca;
    }
    const aqui = location.pathname.split("/").pop() + location.search;
    ir("offline.html?volver=" + encodeURIComponent(aqui));
    return nunca;
  }

  if (!usuario) {
    ir("login.html");
    return nunca;
  }
  if (!rolesPermitidos.includes(usuario.rol)) {
    // Tiene sesión pero no permiso: lo mandamos a su pantalla
    ir(INICIO_POR_ROL[usuario.rol] || "login.html");
    return nunca;
  }

  document.documentElement.classList.remove("auth-pendiente");
  return usuario;
}

export async function cerrarSesion() {
  try {
    await auth.logout();
  } finally {
    ir("login.html");
  }
}

/**
 * Llena el encabezado común de las pantallas del personal:
 * correo, rol, menú de navegación filtrado por rol y botón de salir.
 */
export function montarEncabezado(usuario) {
  const actual = location.pathname.split("/").pop() || "index.html";

  const correo = document.getElementById("userEmail");
  if (correo) correo.textContent = usuario.nombre || usuario.email;

  const rol = document.getElementById("userRole");
  if (rol) {
    rol.textContent = usuario.rol;
    rol.className = "pill rol-" + usuario.rol;
  }

  const nav = document.getElementById("navPersonal");
  if (nav) {
    reemplazar(nav, PANTALLAS
      .filter(p => p.roles.includes(usuario.rol))
      .map(p => h("a", {
        href: p.archivo,
        class: "nav-link" + (p.archivo === actual ? " activo" : ""),
        "aria-current": p.archivo === actual ? "page" : null
      }, p.titulo)));
  }

  const salir = document.getElementById("logoutBtn");
  if (salir) salir.addEventListener("click", cerrarSesion);
}
