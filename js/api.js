// js/api.js — Comunicación con la API PHP (api/*.php) del propio sitio.

let csrf = "";

export function fijarCsrf(token) {
  if (token) csrf = token;
}

export class ErrorApi extends Error {
  constructor(mensaje, status) {
    super(mensaje);
    this.status = status;
  }
}

async function pedir(ruta, opciones = {}) {
  let resp;
  try {
    resp = await fetch("api/" + ruta, { credentials: "same-origin", cache: "no-store", ...opciones });
  } catch {
    throw new ErrorApi("Sin conexión con el servidor. Revisa tu internet.", 0);
  }
  let datos = null;
  try {
    datos = await resp.json();
  } catch {
    // respuesta vacía o no JSON
  }
  if (!resp.ok) {
    // Sesión vencida en una pantalla del personal → volver al login
    if (resp.status === 401 && document.documentElement.dataset.personal !== undefined) {
      window.location.replace("login.html");
    }
    throw new ErrorApi(datos?.error || `Error del servidor (${resp.status}).`, resp.status);
  }
  if (datos === null) {
    // p. ej. una página de error del hosting en lugar de JSON
    throw new ErrorApi("Respuesta no válida del servidor. Revisa que PHP esté activo.", resp.status);
  }
  if (datos?.csrf) fijarCsrf(datos.csrf);
  return datos;
}

/** GET api/<ruta>?<params> */
export function apiGet(ruta, params) {
  const qs = params ? "?" + new URLSearchParams(params) : "";
  return pedir(ruta + qs);
}

/** POST api/<ruta> con cuerpo JSON y token CSRF. */
export function apiPost(ruta, cuerpo) {
  return pedir(ruta, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
    body: JSON.stringify(cuerpo)
  });
}

/**
 * Ejecuta fn() ahora y luego cada `ms` milisegundos mientras la pestaña esté
 * visible (así se ven los pedidos nuevos sin recargar). Devuelve una función para detenerlo.
 */
export function sondear(fn, ms = 4000) {
  let timer = null;
  let activo = true;
  let corriendo = false;

  async function tick() {
    if (!activo) return;
    if (!document.hidden && !corriendo) {
      corriendo = true;
      try { await fn(); } catch (err) { console.error(err); }
      corriendo = false;
    }
    timer = setTimeout(tick, ms);
  }

  const alVolver = () => {
    if (!document.hidden && activo && !corriendo) {
      clearTimeout(timer);
      tick();
    }
  };
  document.addEventListener("visibilitychange", alVolver);
  tick();

  return () => {
    activo = false;
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", alVolver);
  };
}
