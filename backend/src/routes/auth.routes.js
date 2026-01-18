/**
 * @fileoverview Rutas de autenticación
 * @module routes/auth.routes
 */

import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as authController from "../controllers/auth.controller.js";
import { validateLogin } from "../validators/auth.validator.js";
import { handleValidationErrors } from "../middlewares/validation.js";

const router = Router();

/**
 * Rate Limiting estricto para login (protección contra brute force)
 * Permite solo 5 intentos por 15 minutos por IP
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 intentos por ventana de tiempo
  message: {
    success: false,
    error: {
      message: "Demasiados intentos de inicio de sesión. Por favor, intenta nuevamente en 15 minutos.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Contar todos los intentos, exitosos o no
});

/**
 * Rate Limiting para refresh token (protección contra abuso)
 * Permite 10 intentos por 15 minutos por IP
 */
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Máximo 10 intentos por ventana de tiempo
  message: {
    success: false,
    error: {
      message: "Demasiados intentos de renovación de token. Por favor, intenta nuevamente en 15 minutos.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Contar todos los intentos
});

/**
 * @route POST /api/auth/login
 * @desc Login de usuario
 * @access Public
 */
router.post(
  "/login",
  loginLimiter, // Rate limiting estricto aplicado primero
  validateLogin,
  handleValidationErrors,
  authController.login
);

/**
 * @route POST /api/auth/refresh
 * @desc Renueva access token usando refresh token
 * @access Public
 */
router.post("/refresh", refreshLimiter, authController.refresh);

/**
 * @route POST /api/auth/logout
 * @desc Logout de usuario (elimina cookies de tokens)
 * @access Public
 */
router.post("/logout", authController.logout);

export default router;








