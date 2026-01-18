/**
 * @fileoverview Hook para obtener configuraciones del sitio
 * @module hooks/useSettings
 */

import { useState, useEffect } from "react";
import { API_BASE_URL } from "../config/api.js";
import logoDefault from "../assets/logo.png";
import { getLogo, getBackground, getAdminBackground } from "../utils/settingsCache.js";

/**
 * Hook para obtener el fondo actual (con caché compartido)
 */
export const useBackgroundImage = () => {
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const fetchBackground = async () => {
      try {
        const bg = await getBackground(API_BASE_URL);
        if (mounted) {
          setBackgroundImage(bg);
        }
      } catch (error) {
        console.error("Error al obtener fondo:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchBackground();
    
    return () => {
      mounted = false;
    };
  }, []);

  return { backgroundImage, loading };
};

/**
 * Hook para obtener el logo actual (con caché compartido)
 * Retorna el logo por defecto inmediatamente para evitar flash
 */
export const useLogo = () => {
  const [logo, setLogo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const fetchLogo = async () => {
      try {
        setLoading(true);
        const logoUrl = await getLogo(API_BASE_URL);
        if (mounted) {
          setLogo(logoUrl);
        }
      } catch (error) {
        console.error("Error al obtener logo:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchLogo();
    
    return () => {
      mounted = false;
    };
  }, []);

  return { logo, loading };
};

/**
 * Hook para obtener el fondo del panel administrativo (con caché compartido)
 */
export const useAdminBackgroundImage = () => {
  const [adminBackgroundImage, setAdminBackgroundImage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const fetchAdminBackground = async () => {
      try {
        const bg = await getAdminBackground(API_BASE_URL);
        if (mounted) {
          setAdminBackgroundImage(bg);
        }
      } catch (error) {
        console.error("Error al obtener fondo del admin:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchAdminBackground();
    
    return () => {
      mounted = false;
    };
  }, []);

  return { adminBackgroundImage, loading };
};


