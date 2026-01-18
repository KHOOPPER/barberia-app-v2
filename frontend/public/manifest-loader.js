/**
 * Carga dinamica del manifest segun la ruta.
 * Script externo para cumplir con CSP sin 'unsafe-inline'.
 */

(function () {
  // Permite configurar la ruta del admin desde index.html (ver window.__ADMIN_PATH__).
  const adminPath = (window.__ADMIN_PATH__ || "/admin").replace(/\/+$/, "");
  const isAdminRoute = window.location.pathname.startsWith(adminPath);

  const manifest = isAdminRoute
    ? {
        name: "Panel Administrativo",
        short_name: "Admin",
        description: "Panel administrativo (PWA)",
        start_url: `${adminPath}/?source=pwa`,
        scope: `${adminPath}/`,
        display: "standalone",
        background_color: "#000000",
        theme_color: "#000000",
        icons: [
          { src: "/icons/admin-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/admin-512.png", sizes: "512x512", type: "image/png" },
        ],
      }
    : {
        name: "Barbershop",
        short_name: "Barbershop",
        description: "Sitio web (PWA)",
        start_url: "/?source=pwa",
        scope: "/",
        display: "standalone",
        background_color: "#000000",
        theme_color: "#000000",
        icons: [
          { src: "/icons/client-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/client-512.png", sizes: "512x512", type: "image/png" },
        ],
      };

  const manifestBlob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
  const manifestUrl = URL.createObjectURL(manifestBlob);

  const manifestLink = document.createElement("link");
  manifestLink.rel = "manifest";
  manifestLink.href = manifestUrl;

  document.head.appendChild(manifestLink);
})();
