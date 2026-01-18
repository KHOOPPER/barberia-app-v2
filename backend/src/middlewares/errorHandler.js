/**
 * @fileoverview Middleware centralizado para manejo de errores
 * @module middlewares/errorHandler
 * 
 * He implementado este middleware para manejar todos los errores de manera centralizada,
 * asegurando respuestas consistentes y sin exposición de información sensible en producción.
 */

import logger from "../utils/logger.js";
import { AppError, ValidationError } from "../utils/errors.js";
import { HTTP_STATUS } from "../constants/index.js";

/**
 * Middleware de manejo de errores centralizado
 * Captura todos los errores, los registra apropiadamente y devuelve respuestas
 * formateadas sin exponer detalles internos en producción.
 */
export const errorHandler = (err, req, res, next) => {
  // Si la respuesta ya fue enviada, delegar al handler por defecto
  if (res.headersSent) {
    return next(err);
  }

  // Si es un error operacional conocido (AppError)
  if (err instanceof AppError) {
    logger.warn(`${err.name}: ${err.message}`, {
      path: req.path,
      method: req.method,
      statusCode: err.statusCode,
    });

    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        ...(err.errors && { errors: err.errors }),
      },
    });
  }

  // Si es un error de validación de express-validator
  if (err.name === "ValidationError" || Array.isArray(err.errors)) {
    logger.warn("Validation error", {
      path: req.path,
      method: req.method,
      errors: err.errors || err.array(),
    });

    // Formatear errores de validación (sin exponer información sensible)
    const validationErrors = err.errors || err.array();
    const formattedErrors = validationErrors.map((error) => ({
      field: error.path || error.param || error.field,
      message: error.msg || error.message,
      // No exponer valores en producción (pueden contener información sensible)
      ...(process.env.NODE_ENV === "development" && { value: error.value }),
    }));

    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: {
        message: "Error de validación",
        errors: formattedErrors,
      },
    });
  }

  // Error de MySQL (errores de BD)
  // Códigos de error comunes: 23xxx (constraints), 42xxx (syntax), etc.
  if (err.code && (err.code.startsWith("23") || err.code.startsWith("42") || err.code.startsWith("ER_"))) {
    logger.error("Database error", {
      error: err.message,
      code: err.code,
      path: req.path,
      method: req.method,
    });

    // No exponer detalles de BD en producción
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: {
        message: "Error en los datos proporcionados",
        // Solo en desarrollo mostrar detalles
        ...(process.env.NODE_ENV === "development" && { details: err.message }),
      },
    });
  }

  // Error desconocido - log completo
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Respuesta genérica (no exponer detalles en producción)
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: {
      message:
        process.env.NODE_ENV === "production"
          ? "Error interno del servidor"
          : err.message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
};

/**
 * Middleware para rutas no encontradas (404)
 * He implementado este handler para devolver respuestas consistentes cuando
 * se intenta acceder a una ruta que no existe.
 */
export const notFoundHandler = (req, res, next) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    error: {
      message: `Ruta ${req.method} ${req.path} no encontrada`,
    },
  });
};