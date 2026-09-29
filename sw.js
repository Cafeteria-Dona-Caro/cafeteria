// sw.js — Service Worker de Café de Caro
// Todas las rutas son relativas al alcance del SW, así funciona igual en
// https://cafedecaro.eniguala.com/ que en una subcarpeta.
// Sube CACHE_VERSION cada vez que publiques cambios.

const CACHE_VERSION = "cafedecaro-v1";

const SHELL = [
  "./",
  "index.html",
  "login.html",
  "cliente.html",
  "offline.html",
  "css/estilos.css",
  "js/firebase-config.js",
  "js/auth-guard.js",
  "js/utils.js",
  "js/pwa.js",
  "data/menu-inicial.json",
  "manifest.json",
  "img/logo.svg",
  "img/icon-192.png",
  "img/icon-512.png"
];

const url = (ruta) => new URL(ruta, self.registration.scope).href;

// Instalar: guardar el "cascarón" de la app
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL.map(url)))
      .then(() => self.skipWaiting())
  );
});

// Activar: borrar cachés de versiones anteriores
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const destino = new URL(req.url);
  // Firebase, Google Fonts y cualquier otro dominio: el navegador se encarga
  if (destino.origin !== self.location.origin) return;

  // Páginas: primero la red (siempre la versión más nueva); sin red, caché u offline.html
  if (req.mode === "navigate" || destino.pathname.endsWith(".html")) {
    e.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp.ok) {
            const copia = resp.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copia));
          }
          return resp;
        })
        .catch(() =>
          caches.match(req, { ignoreSearch: true })
            .then((enCache) => enCache || caches.match(url("offline.html")))
        )
    );
    return;
  }

  // CSS, JS, imágenes y datos: responder desde caché y actualizar en segundo plano
  e.respondWith(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.match(req).then((enCache) => {
        const deRed = fetch(req)
          .then((resp) => {
            if (resp.ok) cache.put(req, resp.clone());
            return resp;
          })
          .catch(() => enCache);
        return enCache || deRed;
      })
    )
  );
});
