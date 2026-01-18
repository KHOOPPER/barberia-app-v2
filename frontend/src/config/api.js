// src/config/api.js
/**
 * Configuración central de la API para el frontend (Vite + React).
 *
 * Pensado para PLANTILLA / PROYECTO VENDIBLE:
 * - El cliente solo tiene que definir VITE_API_BASE_URL en su .env
 *   del frontend (por ejemplo: https://mi-backend.onrender.com/api).
 * - Si no existe la variable, se usa un fallback de desarrollo:
 *   http://localhost:4000/api
 *
 * Ejemplo de .env.frontend para el cliente:
 *   VITE_API_BASE_URL=https://mi-backend-en-produccion.com/api
 */

const rawBase =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

/**
 * Normaliza eliminando una posible barra final.
 * Ejemplo:
 *  - "https://api.com/api/" -> "https://api.com/api"
 *  - "http://localhost:4000/api" -> "http://localhost:4000/api"
 */
const normalizedBase = rawBase.replace(/\/$/, "");

/**
 * URL base de la API que usa todo el frontend.
 * Ejemplo:
 *  API_BASE_URL = "https://mi-backend.com/api"
 */
export const API_BASE_URL = normalizedBase;

/**
 * Helper opcional para construir endpoints.
 * Uso:
 *   fetch(apiPath("/reservations"))
 *   fetch(apiPath("/reservations/123/status"), { method: "PUT" })
 */
export const apiPath = (path = "") => {
  if (!path) return API_BASE_URL;
  const cleaned = path.startsWith("/") ? path.slice(1) : path;
  return `${API_BASE_URL}/${cleaned}`;
};
