// js/pwa.js — registra el Service Worker. Se incluye en todas las páginas.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => {
      console.warn("No se pudo registrar el Service Worker:", err);
    });
  });
}
