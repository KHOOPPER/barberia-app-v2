/**
 * Carga dinámica del manifest según la ruta
 * Script externo para cumplir con CSP sin 'unsafe-inline'
 */

(function () {
  // Detectar si estamos en la ruta admin
  const isAdminRoute = window.location.pathname.startsWith('/adminator009');

  // Crear el elemento link con el manifest correcto
  const manifestLink = document.createElement('link');
  manifestLink.rel = 'manifest';
  manifestLink.href = isAdminRoute
    ? '/manifest.admin.webmanifest'
    : '/manifest.client.webmanifest';

  // Permitir credenciales (cookies) para entornos protegidos como Vercel Preview
  manifestLink.crossOrigin = 'use-credentials';

  // Agregar al head
  document.head.appendChild(manifestLink);
})();
