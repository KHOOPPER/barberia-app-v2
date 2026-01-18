/**
 * @fileoverview Controlador de autenticación
 * @module controllers/auth.controller
 */

import * as authService from "../services/auth.service.js";
import { HTTP_STATUS } from "../constants/index.js";

/**
 * @route POST /api/auth/login
 * @desc Autentica un usuario y devuelve token JWT en cookie httpOnly
 * @access Public
 */
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const result = await authService.login(username, password);

    // Configurar opciones de cookies httpOnly
    const cookieOptions = {
      httpOnly: true, // Previene acceso desde JavaScript (XSS protection)
      secure: process.env.NODE_ENV === "production", // Solo HTTPS en producción
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax", // Lax en desarrollo para permitir diferentes puertos/orígenes
      path: "/", // Disponible en toda la aplicación
      // Configuración adicional de seguridad
      ...(process.env.COOKIE_DOMAIN && { domain: process.env.COOKIE_DOMAIN }), // Dominio explícito si se configura
    };

    // Establecer access token (15 minutos)
    res.cookie("authToken", result.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutos
    });

    // Establecer refresh token (7 días)
    res.cookie("refreshToken", result.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });

    // Enviar respuesta sin el token en el body (por seguridad)
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Login exitoso",
      data: {
        user: result.user,
        // Token NO se envía en el body, solo en cookie httpOnly
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/auth/refresh
 * @desc Renueva el access token usando el refresh token
 * @access Public
 */
export const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: {
          message: "Refresh token no proporcionado",
        },
      });
    }

    const result = await authService.refreshAccessToken(refreshToken);

    // Configurar opciones de cookies httpOnly
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/",
      // Configuración adicional de seguridad
      ...(process.env.COOKIE_DOMAIN && { domain: process.env.COOKIE_DOMAIN }), // Dominio explícito si se configura
    };

    // Establecer nuevo access token (15 minutos)
    res.cookie("authToken", result.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutos
    });

    // Establecer nuevo refresh token (7 días) - rotación de tokens
    res.cookie("refreshToken", result.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Token renovado exitosamente",
      data: {
        user: result.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/auth/logout
 * @desc Cierra sesión y elimina cookies de tokens
 * @access Public
 */
export const logout = async (req, res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    path: "/",
  };

  // Eliminar ambas cookies (access token y refresh token)
  res.clearCookie("authToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: "Logout exitoso",
  });
};








