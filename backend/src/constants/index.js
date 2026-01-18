/**
 * @fileoverview Constantes centralizadas de la aplicación
 * @module constants
 */

/**
 * Estados posibles de una reserva
 */
export const RESERVATION_STATUS = {
  PENDING: "pendiente",
  CONFIRMED: "confirmada",
  CANCELLED: "cancelada",
};

/**
 * Estados permitidos para validación
 */
export const ALLOWED_STATUSES = [
  RESERVATION_STATUS.PENDING,
  RESERVATION_STATUS.CONFIRMED,
  RESERVATION_STATUS.CANCELLED,
];

/**
 * Roles de usuario
 */
export const USER_ROLES = {
  ADMIN: "admin",
  USER: "user",
};

/**
 * Códigos de estado HTTP comunes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

/**
 * Mensajes de error comunes
 */
export const ERROR_MESSAGES = {
  UNAUTHORIZED: "No autorizado. Token inválido o faltante.",
  FORBIDDEN: "Acceso prohibido.",
  NOT_FOUND: "Recurso no encontrado.",
  INTERNAL_ERROR: "Error interno del servidor.",
  VALIDATION_ERROR: "Error de validación.",
  INVALID_CREDENTIALS: "Credenciales inválidas.",
};

/**
 * Configuración de rate limiting
 */
export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutos
  MAX_REQUESTS: 100, // máximo 100 requests por ventana
  MESSAGE: "Demasiadas peticiones desde esta IP, intenta de nuevo más tarde.",
};

/**
 * Configuración de rate limiting para uploads
 */
export const UPLOAD_RATE_LIMIT = {
  WINDOW_MS: 60 * 1000, // 1 minuto
  MAX_REQUESTS: 10, // máximo 10 uploads por minuto
  MESSAGE: "Demasiados intentos de subida de archivos. Por favor, intenta nuevamente en 1 minuto.",
};








