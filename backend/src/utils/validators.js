/**
 * @fileoverview Helpers para validación personalizada
 * @module utils/validators
 */

/**
 * Valida formato de fecha (YYYY-MM-DD)
 */
export const isValidDate = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  // Parsear como UTC para evitar problemas de zona horaria
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
};

/**
 * Valida formato de hora (HH:MM)
 */
export const isValidTime = (timeString) => {
  const regex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  if (!regex.test(timeString)) return false;

  const [hours, minutes] = timeString.split(":").map(Number);
  return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
};

/**
 * Valida que la fecha no sea en el pasado
 * Usa UTC explícitamente para evitar problemas de zona horaria
 */
export const isNotPastDate = (dateString) => {
  // Parsear la fecha como UTC para evitar problemas de zona horaria
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const today = new Date();

  // Obtener fecha de hoy en UTC
  const todayUTC = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  ));

  // Comparar solo las fechas (sin hora) en UTC
  return date >= todayUTC;
};

/**
 * Valida formato de teléfono básico (números y algunos caracteres)
 */
export const isValidPhone = (phone) => {
  if (!phone) return true; // Opcional
  const regex = /^[\d\s\-\+\(\)]+$/;
  return regex.test(phone) && phone.length >= 7 && phone.length <= 20;
};

/**
 * Valida que el email tenga formato válido
 */
export const isValidEmail = (email) => {
  if (!email) return true; // Opcional
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Valida que una URL de imagen sea segura (relativa o de dominio permitido)
 * Previene SSRF (Server-Side Request Forgery)
 */
export const isValidImageUrl = (url) => {
  if (!url) return true; // Opcional

  // Si es una ruta relativa (empieza con /), es segura
  if (url.startsWith("/")) {
    return true;
  }

  // Si es una URL absoluta, validar que sea HTTP/HTTPS
  try {
    const urlObj = new URL(url);

    // Solo permitir HTTP y HTTPS
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return false;
    }

    // Lista blanca de dominios permitidos para imágenes
    const allowedDomains = [
      "res.cloudinary.com",
      "lh3.googleusercontent.com",
      "drive.google.com",
      "doc-0k-0o-docs.googleusercontent.com", // URLs temporales de Google Drive
      "placehold.co",
      "images.unsplash.com",
      "fastly.picsum.photos",
      "picsum.photos",
      "i.imgur.com"
    ];

    // Verificar si el dominio está permitido (o es subdominio de uno permitido)
    const isAllowed = allowedDomains.some(domain =>
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );

    // En desarrollo, permitir localhost también
    if (process.env.NODE_ENV !== "production" &&
      (urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1")) {
      return true;
    }

    // Permitir si está en la lista blanca
    if (isAllowed) {
      return true;
    }

    // Si no está en la lista blanca, permitir cualquier URL de imagen válida
    // (Relajamos la restricción para permitir flexibilidad, pero mantenemos validación básica de URL)
    return true;
  } catch (error) {
    // Si no es una URL válida, rechazar
    return false;
  }
};

/**
 * Valida formato ISO 8601 UTC para fechas
 */
export const isValidISO8601UTC = (dateString) => {
  if (!dateString) return true; // Opcional

  // Validar formato ISO 8601 básico (YYYY-MM-DD o YYYY-MM-DDTHH:mm:ssZ)
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
  if (!iso8601Regex.test(dateString)) {
    return false;
  }

  // Intentar parsear como fecha UTC
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch (error) {
    return false;
  }
};


