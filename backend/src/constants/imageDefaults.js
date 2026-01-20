/**
 * @fileoverview Constantes para URLs de imágenes genéricas por defecto
 * @module constants/imageDefaults
 * 
 * Todas las imágenes usan placehold.co como CDN público.
 * No se requiere configuración ni API keys.
 */

// Dimensiones estándar para diferentes tipos de imágenes
const PRODUCT_SIZE = "600x400";
const SERVICE_SIZE = "600x400";
const BARBER_SIZE = "400x400";
const OFFER_SIZE = "600x400";
const LOGO_SIZE = "200x200";
const BACKGROUND_SIZE = "1920x1080";

/**
 * URL genérica para imágenes de productos
 */
export const DEFAULT_PRODUCT_IMAGE_URL = `https://placehold.co/${PRODUCT_SIZE}/1e293b/cbd5e1?text=Producto`;

/**
 * URL genérica para imágenes de servicios
 */
export const DEFAULT_SERVICE_IMAGE_URL = `https://placehold.co/${SERVICE_SIZE}/1e293b/cbd5e1?text=Servicio`;

/**
 * URL genérica para imágenes de barberos
 */
export const DEFAULT_BARBER_IMAGE_URL = `https://placehold.co/${BARBER_SIZE}/1e293b/cbd5e1?text=Barbero`;

/**
 * URL genérica para imágenes de ofertas
 */
export const DEFAULT_OFFER_IMAGE_URL = `https://placehold.co/${OFFER_SIZE}/1e293b/cbd5e1?text=Oferta`;

/**
 * URL genérica para logo
 */
export const DEFAULT_LOGO_URL = `https://placehold.co/${LOGO_SIZE}/1e293b/cbd5e1?text=Logo`;

/**
 * URL genérica para fondo (página pública)
 */
export const DEFAULT_BACKGROUND_URL = `https://placehold.co/${BACKGROUND_SIZE}/0f172a/475569?text=Fondo`;

/**
 * URL genérica para fondo del panel administrativo
 */
export const DEFAULT_ADMIN_BACKGROUND_URL = `https://placehold.co/${BACKGROUND_SIZE}/0f172a/475569?text=Admin`;

/**
 * URLs genéricas para imágenes del hero
 */
export const DEFAULT_HERO_IMAGES = [
  "https://images.unsplash.com/photo-1585747860715-2ba37b01d43a?q=80&w=2074&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1503951914875-452162b7f30a?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=2070&auto=format&fit=crop"
];

/**
 * Función helper para obtener imagen por defecto según el tipo
 * @param {string} type - Tipo de imagen (product, service, barber, offer, logo, background, admin_background)
 * @returns {string} URL de imagen genérica
 */
export function getDefaultImageUrl(type) {
  switch (type) {
    case "product":
      return DEFAULT_PRODUCT_IMAGE_URL;
    case "service":
      return DEFAULT_SERVICE_IMAGE_URL;
    case "barber":
      return DEFAULT_BARBER_IMAGE_URL;
    case "offer":
      return DEFAULT_OFFER_IMAGE_URL;
    case "logo":
      return DEFAULT_LOGO_URL;
    case "background":
      return DEFAULT_BACKGROUND_URL;
    case "admin_background":
      return DEFAULT_ADMIN_BACKGROUND_URL;
    default:
      return DEFAULT_PRODUCT_IMAGE_URL;
  }
}
