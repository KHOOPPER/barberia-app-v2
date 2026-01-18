/**
 * @fileoverview Controlador de autenticación
 * @module controllers/auth.controller
 */

import * as authService from "../services/auth.service.js";
import { HTTP_STATUS } from "../constants/index.js";

/**
 * Devuelve opciones consistentes para cookies de auth.
 * Importante:
 * - En producción (Render + Vercel = cross-site), se requiere SameSite=None y Secure=true
 * - En desarrollo, usamos Lax para permitir distintos puertos/orígenes locales
 */
function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  // Permite override por env si lo necesitas (opcional)
  // Valores válidos: "none" | "lax" | "strict"
  const envSameSite = process.env.COOKIE_SAMESITE?.toLowerCase();
  const sameSite =
    envSameSite === "none" || envSameSite === "lax" || envSameSite === "strict"
      ? envSameSite
      : isProduction
        ? "none"
        : "lax";

  // Secure debe ser true si sameSite es none (requisito de navegadores)
  const secure = isProduction ? true : false;

  const base = {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
  };

  // Si defines COOKIE_DOMAIN, asegúrate que tenga sentido para tu caso.
  // En Render (onrender.com) normalmente NO necesitas domain.
  if (process.env.COOKIE_DOMAIN) {
    base.domain = process.env.COOKIE_DOMAIN;
  }

  return base;
}

/**
 * @route POST /api/auth/login
 * @desc Autentica un usuario y devuelve token JWT en cookie httpOnly
 * @access Public
 */
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const result = await authService.login(username, password);

    const cookieOptions = getCookieOptions();

    // Access token (15 minutos)
    res.cookie("authToken", result.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    // Refresh token (7 días)
    res.cookie("refreshToken", result.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Respuesta sin token en body (manteniendo tu diseño actual)
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Login exitoso",
      data: {
        user: result.user,
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
        error: { message: "Refresh token no proporcionado" },
      });
    }

    const result = await authService.refreshAccessToken(refreshToken);

    const cookieOptions = getCookieOptions();

    // Nuevo access token (15 minutos)
    res.cookie("authToken", result.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    // Rotación refresh token (7 días)
    res.cookie("refreshToken", result.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Token renovado exitoso",
      data: { user: result.user },
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
  const cookieOptions = getCookieOptions();

  // IMPORTANT: clearCookie debe usar mismas opciones (sameSite/secure/domain/path)
  res.clearCookie("authToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: "Logout exitoso",
  });
};
