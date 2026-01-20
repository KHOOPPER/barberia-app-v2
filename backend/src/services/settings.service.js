/**
 * @fileoverview Servicio para gestión de configuraciones del sistema
 * @module services/settings.service
 */

import { pool } from "../config/db.js";
import logger from "../utils/logger.js";
import { DEFAULT_LOGO_URL, DEFAULT_BACKGROUND_URL, DEFAULT_ADMIN_BACKGROUND_URL, DEFAULT_HERO_IMAGES } from "../constants/imageDefaults.js";

/**
 * Obtiene una configuración por su clave
 */
export const getSetting = async (key) => {
  try {
    const result = await pool.query(
      "SELECT key, value, background_image, admin_background_image, logo FROM settings WHERE key = $1",
      [key]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const setting = result.rows[0];
    // Aplicar imágenes genéricas por defecto
    return {
      key: setting.key,
      value: setting.value,
      background_image: setting.background_image || DEFAULT_BACKGROUND_URL,
      admin_background_image: setting.admin_background_image || DEFAULT_ADMIN_BACKGROUND_URL,
      logo: setting.logo || DEFAULT_LOGO_URL,
    };
  } catch (error) {
    logger.error(`Error al obtener setting ${key}`, { error: error.message });
    throw error;
  }
};

/**
 * Obtiene todas las configuraciones
 */
export const getAllSettings = async () => {
  try {
    const result = await pool.query(
      "SELECT key, value, background_image, admin_background_image, logo FROM settings"
    );

    // Aplicar imágenes genéricas por defecto
    return result.rows.map(setting => ({
      ...setting,
      background_image: setting.background_image || DEFAULT_BACKGROUND_URL,
      admin_background_image: setting.admin_background_image || DEFAULT_ADMIN_BACKGROUND_URL,
      logo: setting.logo || DEFAULT_LOGO_URL,
    }));
  } catch (error) {
    logger.error("Error al obtener todas las configuraciones", { error: error.message });
    throw error;
  }
};

/**
 * Actualiza o crea una configuración
 */
export const setSetting = async (key, value, backgroundImage = null, logo = null) => {
  try {
    await pool.query(
      `INSERT INTO settings (key, value, background_image, logo)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (key) DO UPDATE SET
         value = EXCLUDED.value,
         background_image = COALESCE(EXCLUDED.background_image, settings.background_image),
         logo = COALESCE(EXCLUDED.logo, settings.logo)`,
      [key, value, backgroundImage, logo]
    );

    logger.info(`Setting ${key} actualizado`);
    return { key, value, background_image: backgroundImage, logo };
  } catch (error) {
    logger.error(`Error al actualizar setting ${key}`, { error: error.message });
    throw error;
  }
};

/**
 * Actualiza solo el fondo (página pública)
 */
export const setBackgroundImage = async (imagePath) => {
  try {
    // Actualizar o crear el setting para background_image
    await pool.query(
      `INSERT INTO settings (key, value, background_image)
       VALUES ('background_image', $1, $2)
       ON CONFLICT (key) DO UPDATE SET
         value = EXCLUDED.value,
         background_image = EXCLUDED.background_image`,
      [imagePath, imagePath]
    );

    logger.info("Background image actualizado");
    return { key: "background_image", value: imagePath, background_image: imagePath };
  } catch (error) {
    logger.error("Error al actualizar background image", { error: error.message });
    throw error;
  }
};

/**
 * Actualiza solo el fondo del panel administrativo
 */
export const setAdminBackgroundImage = async (imagePath) => {
  try {
    // Actualizar o crear el setting para admin_background_image
    await pool.query(
      `INSERT INTO settings (key, value, admin_background_image)
       VALUES ('admin_background_image', $1, $2)
       ON CONFLICT (key) DO UPDATE SET
         value = EXCLUDED.value,
         admin_background_image = EXCLUDED.admin_background_image`,
      [imagePath, imagePath]
    );

    logger.info("Admin background image actualizado");
    return { key: "admin_background_image", value: imagePath, admin_background_image: imagePath };
  } catch (error) {
    logger.error("Error al actualizar admin background image", { error: error.message });
    throw error;
  }
};

/**
 * Actualiza solo el logo
 */
export const setLogo = async (logoPath) => {
  try {
    // Actualizar o crear el setting para logo
    await pool.query(
      `INSERT INTO settings (key, value, logo)
       VALUES ('logo', $1, $2)
       ON CONFLICT (key) DO UPDATE SET
         value = EXCLUDED.value,
         logo = EXCLUDED.logo`,
      [logoPath, logoPath]
    );

    logger.info("Logo actualizado");
    return { key: "logo", value: logoPath, logo: logoPath };
  } catch (error) {
    logger.error("Error al actualizar logo", { error: error.message });
    throw error;
  }
};

/**
 * Obtiene el fondo actual (página pública)
 */
export const getBackgroundImage = async () => {
  try {
    const setting = await getSetting("background_image");
    return setting?.background_image || DEFAULT_BACKGROUND_URL;
  } catch (error) {
    logger.error("Error al obtener background image", { error: error.message });
    return DEFAULT_BACKGROUND_URL;
  }
};

/**
 * Obtiene el fondo actual del panel administrativo
 */
export const getAdminBackgroundImage = async () => {
  try {
    const setting = await getSetting("admin_background_image");
    return setting?.admin_background_image || DEFAULT_ADMIN_BACKGROUND_URL;
  } catch (error) {
    logger.error("Error al obtener admin background image", { error: error.message });
    return DEFAULT_ADMIN_BACKGROUND_URL;
  }
};

/**
 * Obtiene el logo actual
 */
export const getLogo = async () => {
  try {
    const setting = await getSetting("logo");
    return setting?.logo || DEFAULT_LOGO_URL;
  } catch (error) {
    logger.error("Error al obtener logo", { error: error.message });
    return DEFAULT_LOGO_URL;
  }
};

/**
 * Obtiene la URL del video de la página principal
 */
export const getHomepageVideoUrl = async () => {
  try {
    const result = await pool.query(
      "SELECT value FROM settings WHERE key = $1",
      ['homepage_video_url']
    );

    if (result.rows.length === 0) {
      logger.warn("Homepage video URL not found, using default");
      return "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    }

    return result.rows[0].value;
  } catch (error) {
    logger.error("Error al obtener homepage video URL", { error: error.message });
    return "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  }
};

/**
 * Actualiza la URL del video de la página principal
 */
export const updateHomepageVideoUrl = async (videoUrl, userId = null) => {
  try {
    const result = await pool.query(
      `UPDATE settings 
       SET value = $1, updated_at = NOW(), updated_by = $2 
       WHERE key = $3 
       RETURNING *`,
      [videoUrl, userId, 'homepage_video_url']
    );

    if (result.rows.length === 0) {
      throw new Error("Homepage video URL setting not found");
    }

    logger.info(`Homepage video URL updated by user ${userId || 'system'}`);
    return result.rows[0];
  } catch (error) {
    logger.error("Error al actualizar homepage video URL", { error: error.message });
    throw error;
  }
};

/**
 * Obtiene la configuración completa del video de fondo
 */
export const getHomepageVideoConfig = async () => {
  try {
    const result = await pool.query(`
      SELECT key, value 
      FROM settings 
      WHERE key IN ('homepage_video_type', 'homepage_video_url', 'homepage_video_file', 'homepage_hero_images')
    `);

    const config = {
      type: 'images',
      url: '',
      file: '',
      images: DEFAULT_HERO_IMAGES
    };

    result.rows.forEach(row => {
      if (row.key === 'homepage_video_type') config.type = row.value || 'default';
      if (row.key === 'homepage_video_url') config.url = row.value || '';
      if (row.key === 'homepage_video_file') config.file = row.value || '';
      if (row.key === 'homepage_hero_images') config.images = row.value ? JSON.parse(row.value) : [];
    });

    // Si el tipo es default o null, forzar modo imágenes con defaults
    if (!config.type || config.type === 'default') {
      config.type = 'images';
      config.images = DEFAULT_HERO_IMAGES;
    }

    // Si es modo imágenes pero no hay ninguna, usar defaults
    if (config.type === 'images' && (!config.images || config.images.length === 0)) {
      config.images = DEFAULT_HERO_IMAGES;
    }

    return config;
  } catch (error) {
    logger.error("Error al obtener config de video", { error: error.message });
    return { type: 'images', url: '', file: '', images: DEFAULT_HERO_IMAGES };
  }
};

/**
 * Actualiza la configuración del video
 */
export const updateHomepageVideoConfig = async (type, url, file, userId = null) => {
  try {
    console.log(`Service: updateHomepageVideoConfig called with type=${type}, file=${file}, url=${url}`);

    // Actualizar los 3 settings
    await pool.query(`
      UPDATE settings SET value = $1, updated_at = NOW(), updated_by = $2 WHERE key = 'homepage_video_type'
    `, [type, userId]);

    await pool.query(`
      UPDATE settings SET value = $1, updated_at = NOW(), updated_by = $2 WHERE key = 'homepage_video_url'
    `, [url || '', userId]);

    const resultFile = await pool.query(`
      UPDATE settings SET value = $1, updated_at = NOW(), updated_by = $2 WHERE key = 'homepage_video_file'
      RETURNING *
    `, [file || '', userId]);

    console.log("Service: File update result:", resultFile.rowCount > 0 ? "Updated row" : "No row updated");

    logger.info(`Homepage video config updated by user ${userId || 'system'}: type=${type}`);
    return { type, url, file };
  } catch (error) {
    logger.error("Error al actualizar config de video", { error: error.message });
    throw error;
  }
};

/**
 * Guarda un archivo de video subido
 */
export const saveUploadedVideo = async (file, userId = null) => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    // Crear directorio si no existe
    const uploadDir = path.join(process.cwd(), 'uploads', 'videos');
    await fs.mkdir(uploadDir, { recursive: true });

    // Generar nombre único
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `video-${timestamp}${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Mover archivo
    await fs.rename(file.path, filepath);

    // Retornar ruta relativa
    const relativePath = `/uploads/videos/${filename}`;
    logger.info(`Video uploaded by user ${userId || 'system'}: ${relativePath}`);

    return relativePath;
  } catch (error) {
    logger.error("Error al guardar video subido", { error: error.message });
    throw error;
  }
};

/**
 * Guarda imágenes del hero subidas
 */
export const saveUploadedHeroImage = async (file, userId = null) => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    // Crear directorio si no existe
    const uploadDir = path.join(process.cwd(), 'uploads', 'hero');
    await fs.mkdir(uploadDir, { recursive: true });

    // Generar nombre único
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `hero-${timestamp}-${Math.round(Math.random() * 1000)}${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Mover archivo
    await fs.rename(file.path, filepath);

    // Retornar ruta relativa
    const relativePath = `/uploads/hero/${filename}`;
    logger.info(`Hero image uploaded by user ${userId || 'system'}: ${relativePath}`);

    return relativePath;
  } catch (error) {
    logger.error("Error al guardar imagen hero subida", { error: error.message });
    throw error;
  }
};

/**
 * Actualiza la lista de imágenes del hero
 */
export const setHeroImages = async (images, userId = null) => {
  try {
    await pool.query(`
      INSERT INTO settings (key, value, updated_at, updated_by)
      VALUES ('homepage_hero_images', $1, NOW(), $2)
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW(),
        updated_by = EXCLUDED.updated_by
    `, [JSON.stringify(images), userId]);

    logger.info(`Hero images updated by user ${userId || 'system'}`);
    return images;
  } catch (error) {
    logger.error("Error al actualizar hero images", { error: error.message });
    throw error;
  }
};

