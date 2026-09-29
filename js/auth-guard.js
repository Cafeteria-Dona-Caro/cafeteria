// js/auth-guard.js
// Verificación de sesión y rol: un solo lugar para todas las pantallas del personal.
// OJO: esto solo controla la interfaz. La seguridad real está en firestore.rules.

import { auth, db, doc, getDoc, onAuthStateChanged, signOut } from "./firebase-config.js";
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
  { archivo: "mesas.html",    titulo: "Mesas",    roles: ["admin", "mesero", "caja"] },
  { archivo: "mesero.html",   titulo: "Mesero",   roles: ["admin", "mesero", "caja"] },
  { archivo: "cocina.html",   titulo: "Cocina",   roles: ["admin", "cocina"] },
  { archivo: "caja.html",     titulo: "Caja",     roles: ["admin", "caja"] },
  { archivo: "reportes.html", titulo: "Reportes", roles: ["admin", "caja"] },
  { archivo: "admin.html",    titulo: "Admin",    roles: ["admin"] }
];

function ir(pagina) {
  window.location.replace(pagina);
}

/**
 * Espera a que Firebase resuelva la sesión y devuelve { user, perfil } o null.
 * perfil es el documento users/{uid} (o null si no existe).
 */
export function obtenerSesion() {
  return new Promise((resolve) => {
    const cancelar = onAuthStateChanged(auth, async (user) => {
      cancelar();
      if (!user) return resolve(null);
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        resolve({ user, perfil: snap.exists() ? snap.data() : null });
      } catch (err) {
        console.error("No se pudo leer el perfil:", err);
        resolve({ user, perfil: null });
      }
    });
  });
}

/**
 * Verifica que el usuario esté logueado y tenga uno de los roles permitidos.
 * Si no cumple, redirige y la promesa nunca se resuelve (la página no sigue).
 * @param {string[]} rolesPermitidos — ej: ["admin", "caja"]
 * @returns {Promise<{uid: string, email: string, role: string, perfil: object}>}
 */
export async function verificarAcceso(rolesPermitidos) {
  const sesion = await obtenerSesion();
  const nunca = new Promise(() => {});

  if (!sesion) {
    ir("login.html");
    return nunca;
  }

  const role = sesion.perfil?.role;
  if (!role || !ROLES.includes(role)) {
    await signOut(auth);
    ir("login.html?error=sin-rol");
    return nunca;
  }

  if (!rolesPermitidos.includes(role)) {
    // Tiene sesión pero no permiso: lo mandamos a su pantalla
    ir(INICIO_POR_ROL[role] || "login.html");
    return nunca;
  }

  document.documentElement.classList.remove("auth-pendiente");
  return {
    uid: sesion.user.uid,
    email: sesion.user.email || "",
    role,
    perfil: sesion.perfil
  };
}

export async function cerrarSesion() {
  await signOut(auth);
  ir("login.html");
}

/**
 * Llena el encabezado común de las pantallas del personal:
 * correo, rol, menú de navegación filtrado por rol y botón de salir.
 */
export function montarEncabezado(usuario) {
  const actual = location.pathname.split("/").pop() || "index.html";

  const correo = document.getElementById("userEmail");
  if (correo) correo.textContent = usuario.email || "(sin correo)";

  const rol = document.getElementById("userRole");
  if (rol) {
    rol.textContent = usuario.role;
    rol.className = "pill rol-" + usuario.role;
  }

  const nav = document.getElementById("navPersonal");
  if (nav) {
    const enlaces = PANTALLAS
      .filter(p => p.roles.includes(usuario.role))
      .map(p => h("a", {
        href: p.archivo,
        class: "nav-link" + (p.archivo === actual ? " activo" : ""),
        "aria-current": p.archivo === actual ? "page" : null
      }, p.titulo));
    reemplazar(nav, enlaces);
  }

  const salir = document.getElementById("logoutBtn");
  if (salir) salir.addEventListener("click", cerrarSesion);
}
