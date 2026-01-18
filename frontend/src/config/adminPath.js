/**
 * Centraliza la ruta base del panel administrativo.
 *
 * Nota: esto NO es un mecanismo de seguridad. La seguridad real depende de la autenticacion/autorizacion.
 */
export const getAdminBasePath = () => {
  const raw = (import.meta.env.VITE_ADMIN_PATH || "/admin").trim();
  if (!raw) return "/admin";

  // Normalizar: asegurar que empiece con '/' y no termine con '/'
  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  const withoutTrailingSlash = withLeadingSlash.length > 1
    ? withLeadingSlash.replace(/\/+$/, "")
    : withLeadingSlash;

  return withoutTrailingSlash;
};

export const withAdminPath = (subpath = "") => {
  const base = getAdminBasePath();
  if (!subpath) return base;
  if (subpath === "/") return `${base}/`;
  return `${base}${subpath.startsWith("/") ? subpath : `/${subpath}`}`;
};
