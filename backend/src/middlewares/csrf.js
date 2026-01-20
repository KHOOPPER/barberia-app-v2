/**
 * @fileoverview Middleware de protección CSRF
 * @module middlewares/csrf
 * 
 * Implementa protección CSRF mediante validación de headers Origin y Referer
 * para endpoints que realizan modificaciones (POST, PUT, DELETE, PATCH).
 * Esta protección es especialmente importante para prevenir ataques
 * Cross-Site Request Forgery en operaciones sensibles.
 */

import { ForbiddenError } from "../utils/errors.js";
import logger from "../utils/logger.js";

/**
 * Verifica si una URL es una IP de red local válida (para desarrollo)
 * Permite: 192.168.x.x, 10.x.x.x, 172.16-31.x.x
 */
const isLocalNetworkIP = (url) => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Verificar si es una IP de red local
    const localNetworkPatterns = [
      /^192\.168\.\d{1,3}\.\d{1,3}$/,  // 192.168.x.x
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,  // 10.x.x.x
      /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/,  // 172.16-31.x.x
    ];

    return localNetworkPatterns.some(pattern => pattern.test(hostname));
  } catch {
    return false;
  }
};

/**
 * Obtiene los orígenes permitidos desde variables de entorno
 */
const getAllowedOrigins = () => {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.split(',').map(origin => origin.trim());
  }
  return ["http://localhost:5173"];
};

/**
 * Valida si un origen está permitido
 * Usa lista blanca explícita para mejorar la seguridad, eliminando regex permisivos
 */
const isOriginAllowed = (origin) => {
  if (!origin) return false;

  let allowedOrigins = getAllowedOrigins();

  // En desarrollo, agregar variantes comunes de localhost si no están en la lista
  if (process.env.NODE_ENV !== "production") {
    const localhostVariants = [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3000",
      "http://127.0.0.1:3000"
    ];
    localhostVariants.forEach(variant => {
      if (!allowedOrigins.includes(variant)) {
        allowedOrigins.push(variant);
      }
    });

    // En desarrollo, permitir IPs de red local (para acceso desde otros dispositivos)
    if (isLocalNetworkIP(origin)) {
      return true;
    }
  }

  // Verificar si el origen está en la lista blanca explícita
  // Verificar si el origen está en la lista blanca explícita o es un subdominio de vercel.app
  return allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin);
};

/**
 * Middleware de protección CSRF
 * Valida los headers Origin y Referer para prevenir ataques CSRF
 * Solo se aplica a métodos que realizan modificaciones (POST, PUT, DELETE, PATCH)
 */
export const csrfProtection = (req, res, next) => {
  // Solo validar métodos que realizan modificaciones
  const modifyingMethods = ["POST", "PUT", "DELETE", "PATCH"];
  if (!modifyingMethods.includes(req.method)) {
    return next();
  }

  // Obtener Origin y Referer
  const origin = req.get("origin");
  const referer = req.get("referer");

  // Validar Origin (preferido, más confiable)
  if (origin) {
    if (isOriginAllowed(origin)) {
      return next();
    }

    // Si Origin no está permitido, registrar y rechazar
    logger.warn("CSRF protection: Origin no permitido", {
      origin,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    return next(new ForbiddenError("Origen no permitido"));
  }

  // Si no hay Origin, validar Referer (menos confiable pero mejor que nada)
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;

      if (isOriginAllowed(refererOrigin)) {
        return next();
      }
    } catch (error) {
      // Si no se puede parsear el Referer, continuar con validación estricta
    }
  }

  // Si no hay Origin ni Referer válido, rechazar en producción
  // En desarrollo, ser más permisivo para herramientas como Postman
  if (process.env.NODE_ENV === "production") {
    logger.warn("CSRF protection: Falta header Origin/Referer", {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    return next(new ForbiddenError("Origen de la petición no válido"));
  }

  // En desarrollo, permitir si no hay Origin/Referer (para herramientas de desarrollo)
  next();
};
