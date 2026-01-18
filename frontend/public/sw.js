// =============================================================
// Service Worker (PWA)
// Controla y cachea recursos dentro del scope configurado
// =============================================================

const scopePath = new URL(self.registration.scope).pathname.replace(/\/+$/, "");
const CACHE_NAME = `barbershop-pwa:${scopePath || "/"}`;

// Archivos estaticos seguros de cachear (minimos)
const URLS_TO_CACHE = [
  `${scopePath}/`,
  "/icons/admin-192.png",
  "/icons/admin-512.png",
  "/icons/client-192.png",
  "/icons/client-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of URLS_TO_CACHE) {
        try {
          await cache.add(url);
        } catch {
          // Ignorar recursos no disponibles
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first dentro del scope
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Solo interceptar dentro del scope
  if (scopePath && !url.pathname.startsWith(scopePath)) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).catch(() => caches.match(`${scopePath}/`));
    })
  );
});
