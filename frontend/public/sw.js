// =============================================================
// Service Worker para PWA del panel administrativo Khoopper Admin
// Solo controla y cachea recursos relacionados con /adminator009
// =============================================================

const CACHE_NAME = "khoopper-admin-pwa-v2";

console.log('[Service Worker] Cargando...');

// Archivos estáticos seguros de cachear.
const URLS_TO_CACHE = [
  "/adminator009/",
  "/manifest.admin.webmanifest",
  "/icons/admin-192.png",
  "/icons/admin-512.png"
];

// Instalación del Service Worker
self.addEventListener("install", (event) => {
  console.log('[Service Worker] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[Service Worker] Abriendo cache:', CACHE_NAME);
      for (const url of URLS_TO_CACHE) {
        try {
          await cache.add(url);
          console.log('[Service Worker] Cacheado:', url);
        } catch (error) {
          console.warn("[SW] No fue posible cachear:", url, error);
        }
      }
      console.log('[Service Worker] Instalación completa');
    })
  );
  self.skipWaiting();
});

// Activación y limpieza de versiones antiguas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Estrategia de fetch: Cache First con fallback a red para el panel admin
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Solo manejamos:
  // - Peticiones GET
  // - Mismo origen
  // - Rutas bajo /adminator009
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith("/adminator009")) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      // Si está cacheado, lo devolvemos
      if (cached) return cached;

      // Si no, intentamos ir a red
      return fetch(req).catch(() => {
        // Si falla (offline, por ejemplo), devolvemos la shell del panel
        return caches.match("/adminator009");
      });
    })
  );
});
