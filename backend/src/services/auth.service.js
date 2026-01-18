/**
 * @fileoverview Servicio de autenticación
 * @module services/auth.service
 * 
 * He implementado este servicio para manejar toda la lógica de autenticación
 * del sistema, incluyendo generación de tokens JWT, validación de credenciales
 * y creación de usuarios administradores.
 */

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";
import { UnauthorizedError } from "../utils/errors.js";
import logger from "../utils/logger.js";
import { validatePasswordStrengthOrThrow } from "../utils/passwordValidator.js";

/**
 * Genera un access token JWT para un usuario autenticado (corta duración)
 * Utilizo el JWT_SECRET del entorno y configuro expiración corta para mayor seguridad.
 */
export const generateAccessToken = (userId, username, role = "admin") => {
  const jwtSecret = process.env.JWT_SECRET;
  // Access token: 15 minutos (corta duración para reducir riesgo si es comprometido)
  const accessTokenExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || "15m";

  if (!jwtSecret) {
    throw new Error("JWT_SECRET no configurado");
  }

  return jwt.sign(
    {
      id: userId,
      username,
      role,
      type: "access", // Tipo de token para diferenciación
    },
    jwtSecret,
    {
      expiresIn: accessTokenExpiresIn,
    }
  );
};

/**
 * Genera un refresh token JWT para un usuario autenticado (larga duración)
 * Utilizado para renovar access tokens sin requerir nuevo login.
 */
export const generateRefreshToken = (userId, username, role = "admin") => {
  const jwtSecret = process.env.JWT_SECRET;
  // Refresh token: 7 días (larga duración para mantener sesión)
  const refreshTokenExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

  if (!jwtSecret) {
    throw new Error("JWT_SECRET no configurado");
  }

  return jwt.sign(
    {
      id: userId,
      username,
      role,
      type: "refresh", // Tipo de token para diferenciación
    },
    jwtSecret,
    {
      expiresIn: refreshTokenExpiresIn,
    }
  );
};

/**
 * @deprecated Usar generateAccessToken en su lugar
 * Mantenido por compatibilidad temporal
 */
export const generateToken = generateAccessToken;

/**
 * Autentica un usuario con username y password
 * He implementado normalización de credenciales y protección contra timing attacks
 * para mejorar la seguridad del proceso de autenticación.
 */
export const login = async (username, password) => {
  try {
    // Validación básica de entrada
    if (!username || !password) {
      throw new UnauthorizedError("Credenciales inválidas");
    }

    // Normalizar username para prevenir variaciones (mayúsculas/minúsculas, espacios)
    const normalizedUsername = username.trim().toLowerCase();

    // Buscar usuario en la base de datos usando consulta normalizada
    const query = "SELECT * FROM users WHERE LOWER(TRIM(username)) = $1";
    const result = await pool.query(query, [normalizedUsername]);

    if (result.rows.length === 0) {
      // Usar el mismo mensaje para no revelar si el usuario existe (seguridad)
      throw new UnauthorizedError("Credenciales inválidas");
    }

    const user = result.rows[0];

    // Verificar password con bcrypt (protección contra timing attacks)
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      throw new UnauthorizedError("Credenciales inválidas");
    }

    // Generar access token y refresh token
    const accessToken = generateAccessToken(user.id, user.username, user.role);
    const refreshToken = generateRefreshToken(user.id, user.username, user.role);

    // Loguear solo el ID para evitar exposición de información sensible
    logger.info(`Usuario autenticado: ID ${user.id}`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }

    logger.error("Error en login", { error: error.message });
    throw new Error("Error al autenticar usuario");
  }
};

/**
 * Crea un usuario administrador inicial
 * He implementado esta función para facilitar la creación del primer usuario
 * del sistema durante la configuración inicial.
 */
export const createAdminUser = async (username, password, role = "admin") => {
  try {
    // Validar fuerza de contraseña antes de crear el usuario
    validatePasswordStrengthOrThrow(password);

    // Verificar si el usuario ya existe antes de crearlo
    const checkQuery = "SELECT * FROM users WHERE username = $1";
    const existingResult = await pool.query(checkQuery, [username]);

    if (existingResult.rows.length > 0) {
      throw new Error("El usuario ya existe");
    }

    // Hash del password con bcrypt (12 salt rounds para mayor seguridad)
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insertar nuevo usuario en la base de datos
    const insertQuery = `
      INSERT INTO users (username, password_hash, role)
      VALUES ($1, $2, $3)
      RETURNING id, username, role, created_at
    `;

    const insertResult = await pool.query(insertQuery, [
      username,
      passwordHash,
      role,
    ]);

    const newUser = insertResult.rows[0];

    // Loguear solo el ID para evitar exposición de información sensible
    logger.info(`Usuario admin creado: ID ${newUser.id}`);

    return newUser;
  } catch (error) {
    logger.error("Error al crear usuario admin", { error: error.message });
    throw error;
  }
};

/**
 * Renueva un access token usando un refresh token válido
 * Implementado para permitir rotación segura de tokens sin requerir nuevo login
 */
export const refreshAccessToken = async (refreshToken) => {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET no configurado");
    }

    // Verificar y decodificar refresh token
    const decoded = jwt.verify(refreshToken, jwtSecret);

    // Validar que el token tenga los campos requeridos
    if (!decoded.id || !decoded.username || !decoded.role) {
      throw new UnauthorizedError("Refresh token inválido: datos incompletos");
    }

    // Validar que sea un refresh token
    if (decoded.type !== "refresh") {
      throw new UnauthorizedError("Token inválido. Se requiere refresh token");
    }

    // Verificar que el usuario aún existe en la base de datos
    const query = "SELECT id, username, role FROM users WHERE id = $1";
    const userResult = await pool.query(query, [decoded.id]);

    if (userResult.rows.length === 0) {
      throw new UnauthorizedError("Usuario no encontrado");
    }

    const user = userResult.rows[0];

    // Generar nuevo access token y nuevo refresh token (rotación)
    const newAccessToken = generateAccessToken(user.id, user.username, user.role);
    const newRefreshToken = generateRefreshToken(user.id, user.username, user.role);

    // Loguear solo el ID para evitar exposición de información sensible
    logger.info(`Access token renovado: ID ${user.id}`);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken, // Nuevo refresh token para rotación
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }

    if (error.name === "JsonWebTokenError") {
      throw new UnauthorizedError("Refresh token inválido");
    }

    if (error.name === "TokenExpiredError") {
      throw new UnauthorizedError("Refresh token expirado. Por favor, inicia sesión nuevamente");
    }

    logger.error("Error al renovar access token", { error: error.message });
    throw new UnauthorizedError("Error al renovar token");
  }
};
