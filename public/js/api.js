// js/api.js — Cliente HTTP para la API PHP de Café de Caro (api/).

const API_BASE = "api";
let csrf = "";

export class ErrorApi extends Error {
  constructor(mensaje, status) {
    super(mensaje);
    this.status = status;
  }
}

async function apiRequest(ruta, { method = "GET", body } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") headers["X-CSRF-Token"] = csrf;

  let resp;
  try {
    resp = await fetch(`${API_BASE}${ruta}`, {
      method,
      headers,
      credentials: "same-origin",   // enviar la cookie de sesión
      cache: "no-store",
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    throw new ErrorApi("Sin conexión con el servidor. Revisa tu internet.", 0);
  }

  let datos = null;
  try { datos = await resp.json(); } catch { /* respuesta vacía o no JSON */ }

  if (!resp.ok) {
    // Sesión vencida en una pantalla del personal → volver al login
    if (resp.status === 401 && document.documentElement.dataset.personal !== undefined) {
      window.location.replace("login.html");
    }
    throw new ErrorApi(datos?.error || `Error ${resp.status}`, resp.status);
  }
  if (datos === null) throw new ErrorApi("Respuesta no válida del servidor. Revisa que PHP esté activo.", resp.status);
  if (datos.csrf) csrf = datos.csrf;
  return datos;
}

const qs = (params) => {
  const limpio = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== ""));
  const s = new URLSearchParams(limpio).toString();
  return s ? `?${s}` : "";
};

// ── Auth ──
export const auth = {
  login:  (email, password) => apiRequest("/auth/login", { method: "POST", body: { email, password } }),
  logout: ()                => apiRequest("/auth/logout", { method: "POST", body: {} }),
  yo:     ()                => apiRequest("/auth/yo")
};

// ── Productos ──
export const productos = {
  listar: (todos = false)    => apiRequest(`/productos${todos ? "?todos=1" : ""}`),
  crear:  (data)             => apiRequest("/productos", { method: "POST", body: data }),
  editar: (id, data)         => apiRequest(`/productos/${id}`, { method: "PUT", body: data }),
  estado: (id, disponible)   => apiRequest(`/productos/${id}/estado`, { method: "PATCH", body: { disponible } })
};

// ── Órdenes ──
export const ordenes = {
  crear:       (data)          => apiRequest("/ordenes", { method: "POST", body: data }),
  listar:      (filtros)       => apiRequest(`/ordenes${qs(filtros)}`),
  detalle:     (id)            => apiRequest(`/ordenes/${id}`),
  estado:      (id, estado)    => apiRequest(`/ordenes/${id}/estado`, { method: "PATCH", body: { estado } }),
  cobrar:      (id, data)      => apiRequest(`/ordenes/${id}/cobrar`, { method: "POST", body: data }),
  agregarItem: (id, item)      => apiRequest(`/ordenes/${id}/items`, { method: "POST", body: item }),
  quitarItem:  (id, itemId)    => apiRequest(`/ordenes/${id}/items/${itemId}`, { method: "DELETE" })
};

// ── Mesas ──
export const mesas = {
  listar: () => apiRequest("/mesas"),
  mapa:   () => apiRequest("/mesas/mapa")
};

// ── Reportes ──
export const reportes = {
  ventas: (desde, hasta) => apiRequest(`/reportes/ventas${qs({ desde, hasta })}`)
};

// ── Usuarios ──
export const usuarios = {
  listar:   ()         => apiRequest("/usuarios"),
  crear:    (data)     => apiRequest("/usuarios", { method: "POST", body: data }),
  editar:   (id, data) => apiRequest(`/usuarios/${id}`, { method: "PUT", body: data }),
  eliminar: (id)       => apiRequest(`/usuarios/${id}`, { method: "DELETE" })
};
