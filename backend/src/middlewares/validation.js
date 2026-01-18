/**
 * @fileoverview Middleware para validación de requests con express-validator
 * @module middlewares/validation
 * 
 * He implementado este middleware para manejar los resultados de validación
 * de express-validator de manera centralizada y consistente en toda la aplicación.
 */

import { validationResult } from "express-validator";
import { ValidationError } from "../utils/errors.js";

/**
 * Middleware para manejar resultados de validación
 * Extrae los errores de validación y los formatea antes de pasarlos al error handler.
 * Debe usarse después de las reglas de validación de express-validator.
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Formatear errores sin exponer valores sensibles en producción
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      // No exponer valores en producción (pueden contener información sensible)
      ...(process.env.NODE_ENV === "development" && { value: err.value }),
    }));

    return next(new ValidationError("Error de validación", formattedErrors));
  }

  next();
};


