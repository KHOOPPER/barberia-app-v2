/**
 * Actualiza iconos segun la ruta.
 * Script externo para cumplir con CSP sin 'unsafe-inline'.
 */

window.addEventListener("DOMContentLoaded", function () {
  const adminPath = (window.__ADMIN_PATH__ || "/admin").replace(/\/+$/, "");
  const isAdminRoute = window.location.pathname.startsWith(adminPath);

  const appleIcon = document.getElementById("apple-icon");
  const favicon = document.querySelector('link[rel="icon"]');

  if (isAdminRoute) {
    if (appleIcon) appleIcon.href = "/icons/admin-192.png";
    if (favicon) favicon.href = "/icons/admin-192.png";
  } else {
    if (appleIcon) appleIcon.href = "/icons/client-192.png";
    if (favicon) favicon.href = "/icons/client-192.png";
  }
});
