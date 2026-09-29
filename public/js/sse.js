// js/sse.js — Tiempo real con Server-Sent Events (api/sse/eventos).
//
// Uso:  conectarSSE({ ordenNueva(d) {...}, ordenEstado(d) {...}, cualquiera() {...} })
// EventSource se reconecta solo y envía Last-Event-ID, así no se pierden eventos.

const TIPOS = {
  orden_nueva: "ordenNueva",
  orden_estado: "ordenEstado",
  orden_items: "ordenItems",
  producto_actualizado: "productoActualizado"
};

export function conectarSSE(callbacks = {}) {
  const indicador = document.getElementById("indicadorVivo");
  const marcar = (vivo) => {
    if (!indicador) return;
    indicador.classList.toggle("vivo", vivo);
    indicador.title = vivo ? "Conectado en tiempo real" : "Reconectando…";
  };

  const es = new EventSource("api/sse/eventos", { withCredentials: true });

  es.addEventListener("conectado", () => {
    marcar(true);
    // Al (re)conectar se refresca todo por si algo cambió mientras no había conexión
    callbacks.reconectado?.();
  });

  for (const [tipo, nombre] of Object.entries(TIPOS)) {
    es.addEventListener(tipo, (e) => {
      let datos = {};
      try { datos = JSON.parse(e.data); } catch { /* ignorar */ }
      callbacks[nombre]?.(datos);
      callbacks.cualquiera?.(tipo, datos);
    });
  }

  // EventSource reintenta solo (retry: 2 s); solo actualizamos el indicador
  es.onerror = () => marcar(false);

  return { cerrar: () => es.close() };
}

/** Ejecuta fn como máximo una vez cada `ms` (varios eventos seguidos → una sola recarga). */
export function agrupar(fn, ms = 300) {
  let timer = null;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}
