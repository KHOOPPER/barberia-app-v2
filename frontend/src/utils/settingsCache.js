/**
 * Sistema de caché para settings compartidos entre componentes
 * Evita múltiples peticiones duplicadas al mismo endpoint
 */

const cache = {
  logo: {
    data: null,
    timestamp: null,
    promise: null,
  },
  background: {
    data: null,
    timestamp: null,
    promise: null,
  },
  adminBackground: {
    data: null,
    timestamp: null,
    promise: null,
  },
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Verifica si el caché es válido
 */
const isCacheValid = (cacheEntry) => {
  if (!cacheEntry.data || !cacheEntry.timestamp) return false;
  return Date.now() - cacheEntry.timestamp < CACHE_DURATION;
};

/**
 * Obtiene el logo con caché compartido
 */
export const getLogo = async (API_BASE_URL) => {
  // Si hay una petición en curso, retornar esa promesa
  if (cache.logo.promise) {
    return cache.logo.promise;
  }

  // Si el caché es válido, retornar los datos en caché
  if (isCacheValid(cache.logo)) {
    return Promise.resolve(cache.logo.data);
  }

  // Crear nueva petición
  cache.logo.promise = fetch(`${API_BASE_URL}/settings/logo/current`)
    .then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        if (data.data?.logo) {
          const logoUrl = data.data.logo.startsWith('http')
            ? data.data.logo
            : `${API_BASE_URL.replace('/api', '')}${data.data.logo}`;

          cache.logo.data = logoUrl;
          cache.logo.timestamp = Date.now();
          cache.logo.promise = null;
          return logoUrl;
        }
      }
      cache.logo.promise = null;
      return null;
    })
    .catch((error) => {
      console.error("Error al obtener logo:", error);
      cache.logo.promise = null;
      return null;
    });

  return cache.logo.promise;
};

/**
 * Obtiene el fondo público con caché compartido
 */
export const getBackground = async (API_BASE_URL) => {
  if (cache.background.promise) {
    return cache.background.promise;
  }

  if (isCacheValid(cache.background)) {
    return Promise.resolve(cache.background.data);
  }

  cache.background.promise = fetch(`${API_BASE_URL}/settings/background/current`)
    .then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        let backgroundUrl = null;
        if (data.data?.backgroundImage) {
          backgroundUrl = data.data.backgroundImage.startsWith('http')
            ? data.data.backgroundImage
            : `${API_BASE_URL.replace('/api', '')}${data.data.backgroundImage}`;
        }

        cache.background.data = backgroundUrl;
        cache.background.timestamp = Date.now();
        cache.background.promise = null;
        return backgroundUrl;
      }
      cache.background.promise = null;
      return null;
    })
    .catch((error) => {
      console.error("Error al obtener fondo:", error);
      cache.background.promise = null;
      return null;
    });

  return cache.background.promise;
};

/**
 * Obtiene el fondo del admin con caché compartido
 */
export const getAdminBackground = async (API_BASE_URL) => {
  if (cache.adminBackground.promise) {
    return cache.adminBackground.promise;
  }

  if (isCacheValid(cache.adminBackground)) {
    return Promise.resolve(cache.adminBackground.data);
  }

  cache.adminBackground.promise = fetch(`${API_BASE_URL}/settings/admin-background/current`, {
    credentials: "include", // Incluir cookies httpOnly
  })
    .then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        let backgroundUrl = null;
        if (data.data?.adminBackgroundImage) {
          backgroundUrl = data.data.adminBackgroundImage.startsWith('http')
            ? data.data.adminBackgroundImage
            : `${API_BASE_URL.replace('/api', '')}${data.data.adminBackgroundImage}`;
        }

        cache.adminBackground.data = backgroundUrl;
        cache.adminBackground.timestamp = Date.now();
        cache.adminBackground.promise = null;
        return backgroundUrl;
      }

      // Si es un error 401 (Unauthorized), limpiar token y disparar evento
      if (res.status === 401) {
        const { logout } = await import("./api.js");
        logout();
        window.dispatchEvent(new Event("storage"));
      }

      cache.adminBackground.promise = null;
      return null;
    })
    .catch((error) => {
      console.error("Error al obtener fondo del admin:", error);
      cache.adminBackground.promise = null;
      return null;
    });

  return cache.adminBackground.promise;
};

/**
 * Limpia el caché (útil después de actualizar settings)
 */
export const clearCache = (key = null) => {
  if (key) {
    if (cache[key]) {
      cache[key].data = null;
      cache[key].timestamp = null;
      cache[key].promise = null;
    }
  } else {
    Object.keys(cache).forEach((k) => {
      cache[k].data = null;
      cache[k].timestamp = null;
      cache[k].promise = null;
    });
  }
};




