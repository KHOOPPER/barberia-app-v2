/**
 * Actualiza iconos según la ruta
 * Script externo para cumplir con CSP sin 'unsafe-inline'
 */

window.addEventListener('DOMContentLoaded', function() {
  const isAdminRoute = window.location.pathname.startsWith('/adminator009');
  const appleIcon = document.getElementById('apple-icon');
  const favicon = document.querySelector('link[rel="icon"]');
  
  if (isAdminRoute) {
    if (appleIcon) appleIcon.href = '/icons/admin-192.png';
    if (favicon) favicon.href = '/icons/admin-192.png';
  }
});
