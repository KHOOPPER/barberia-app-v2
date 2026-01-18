/**
 * @fileoverview Utilidades para llamadas a la API
 * @module utils/api
 */

import { API_BASE_URL } from "../config/api.js";

// Bandera para evitar múltiples refreshes simultáneos
let isRefreshing = false;
let refreshPromise = null;

/**
 * Renueva el access token usando el refresh token
 * @returns {Promise<void>}
 */
async function refreshToken() {
  // Si ya hay un refresh en curso, esperar a que termine
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const url = `${API_BASE_URL}/auth/refresh`;
      const response = await fetch(url, {
        method: "POST",
        credentials: "include", // Incluir cookies (refresh token en cookie httpOnly)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Error al renovar token");
      }

      // El nuevo access token se guarda automáticamente en cookie httpOnly por el backend
      // Actualizar usuario en localStorage si viene en la respuesta
      if (data.success && data.data?.user) {
        localStorage.setItem("user", JSON.stringify(data.data.user));
      }

      return data;
    } catch (error) {
      // Si el refresh falla, hacer logout
      await logout();
      window.dispatchEvent(new Event("storage"));
      throw error;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Realiza una petición fetch a la API con manejo de errores y refresh token automático
 * @param {string} endpoint - Endpoint de la API (sin /api)
 * @param {RequestInit} options - Opciones de fetch
 * @param {boolean} isRetry - Indica si es un reintento después de refresh
 * @returns {Promise<any>}
 */
export async function apiRequest(endpoint, options = {}, isRetry = false) {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const config = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include", // Incluir cookies (httpOnly) en las peticiones
    ...options,
  };

  // No es necesario agregar token manualmente - las cookies httpOnly se envían automáticamente
  // El backend lee el token de las cookies

  try {
    const response = await fetch(url, config);

    // Parsear respuesta JSON
    const data = await response.json();

    // Si la respuesta no es exitosa, lanzar error
    if (!response.ok) {
      // Si es un error 401 (Unauthorized), intentar renovar el token
      if (response.status === 401) {
        // Evitar loop infinito: si ya es un retry o estamos intentando refrescar el token, hacer logout
        if (isRetry || endpoint === "/auth/refresh") {
          await logout(); // Logout llama al endpoint del backend que limpia la cookie
          window.dispatchEvent(new Event("storage"));
          const error = new Error("Sesión expirada. Por favor, inicia sesión nuevamente.");
          error.status = response.status;
          error.data = data;
          throw error;
        }

        // Intentar renovar el token
        try {
          await refreshToken();
          // Si el refresh fue exitoso, reintentar la petición original
          return apiRequest(endpoint, options, true);
        } catch (refreshError) {
          // Si el refresh falla, el logout ya se hizo en refreshToken()
          const error = new Error("Sesión expirada. Por favor, inicia sesión nuevamente.");
          error.status = response.status;
          error.data = data;
          throw error;
        }
      }

      const error = new Error(data.error?.message || "Error en la petición");
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    // Si es un error de red, formatear mensaje
    if (error.name === "TypeError" && error.message === "Failed to fetch") {
      throw new Error("Error de conexión. Verifica que el servidor esté funcionando.");
    }

    // Re-lanzar error si ya tiene formato
    throw error;
  }
}

/**
 * GET request
 */
export async function get(endpoint, options = {}) {
  return apiRequest(endpoint, { ...options, method: "GET" });
}

/**
 * POST request
 */
export async function post(endpoint, data, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * PUT request
 */
export async function put(endpoint, data, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * DELETE request
 */
export async function del(endpoint, options = {}) {
  return apiRequest(endpoint, { ...options, method: "DELETE" });
}

/**
 * Login - el token se guarda automáticamente en cookie httpOnly por el backend
 */
export async function login(username, password) {
  const response = await post("/auth/login", { username, password });
  
  // Guardar usuario en localStorage (solo información del usuario, no el token)
  if (response.success && response.data?.user) {
    localStorage.setItem("user", JSON.stringify(response.data.user));
  }

  return response;
}

/**
 * Logout - elimina la cookie httpOnly llamando al endpoint del backend
 */
export async function logout() {
  try {
    // Llamar al endpoint de logout del backend para limpiar la cookie
    await post("/auth/logout");
  } catch (error) {
    // Ignorar errores de logout (puede que la cookie ya esté eliminada)
    console.warn("Error al hacer logout:", error);
  }
  
  // Limpiar datos locales del usuario
  localStorage.removeItem("user");
}

/**
 * Obtiene el usuario actual (guardado en localStorage)
 * El token está en cookie httpOnly y no es accesible desde JavaScript
 */
export function getCurrentUser() {
  const userStr = localStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
}

/**
 * Verifica si el usuario está autenticado
 * Como el token está en cookie httpOnly, verificamos si hay usuario en localStorage
 * El backend validará el token en cada petición
 */
export function isAuthenticated() {
  return !!getCurrentUser();
}








