/**
 * @fileoverview Validaciones para rutas de autenticación
 * @module validators/auth.validator
 */

import { body } from "express-validator";

/**
 * Validaciones para login
 */
export const validateLogin = [
  body("username")
    .notEmpty()
    .withMessage("username es requerido")
    .isString()
    .withMessage("username debe ser una cadena de texto")
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("username debe tener entre 3 y 50 caracteres")
    .escape(), // Sanitizar para prevenir XSS

  body("password")
    .notEmpty()
    .withMessage("password es requerido")
    .isString()
    .withMessage("password debe ser una cadena de texto")
    .isLength({ min: 8, max: 128 })
    .withMessage("password debe tener entre 8 y 128 caracteres"),
];








