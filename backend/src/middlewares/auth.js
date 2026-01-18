/**
 * @fileoverview Middleware de autenticación JWT
 * @module middlewares/auth
 * 
 * He implementado estos middlewares para proteger las rutas del sistema
 * mediante autenticación JWT y verificación de roles de administrador.
 */

import jwt from "jsonwebtoken";
import { UnauthorizedError, ForbiddenError } from "../utils/errors.js";
import logger from "../utils/logger.js";

/**
 * Middleware para verificar token JWT en las peticiones
 * Extrae el token de la cookie httpOnly (preferido) o del header Authorization (fallback),
 * lo valida y agrega la información del usuario al objeto request para uso en los controladores.
 */
export const authenticate = (req, res, next) => {
  try {
    // Preferir token de cookie httpOnly (más seguro)
    let token = req.cookies?.authToken;

    // Fallback: Si no hay cookie, intentar obtener del header Authorization (compatibilidad)
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim(); // Remover "Bearer " y espacios
      }
    }

    if (!token || token.length === 0) {
      throw new UnauthorizedError("Token de autenticación no proporcionado");
    }

    // Verificar y decodificar token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error("JWT_SECRET no configurado");
      throw new Error("Error de configuración del servidor");
    }

    const decoded = jwt.verify(token, jwtSecret);

    // Validar que el token tenga los campos requeridos
    if (!decoded.id || !decoded.username || !decoded.role) {
      throw new UnauthorizedError("Token inválido: datos incompletos");
    }

    // Validar que sea un access token (no refresh token)
    // Si el token tiene campo 'type', debe ser 'access'
    if (decoded.type && decoded.type !== "access") {
      throw new UnauthorizedError("Tipo de token inválido. Se requiere access token");
    }

    // Agregar información del usuario al request
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return next(error);
    }

    if (error.name === "JsonWebTokenError") {
      return next(new UnauthorizedError("Token inválido"));
    }

    if (error.name === "TokenExpiredError") {
      return next(new UnauthorizedError("Token expirado"));
    }

    logger.error("Error en autenticación", { error: error.message });
    return next(new UnauthorizedError("Error de autenticación"));
  }
};

/**
 * Middleware para verificar que el usuario autenticado tiene rol de administrador
 * Debe usarse después de authenticate para asegurar que req.user existe.
 * He implementado esta verificación para proteger rutas administrativas.
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return next(new UnauthorizedError("Usuario no autenticado"));
  }

  if (req.user.role !== "admin") {
    return next(new ForbiddenError("Acceso restringido a administradores"));
  }

  next();
};



