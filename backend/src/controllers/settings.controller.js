/**
 * @fileoverview Controlador de configuraciones
 * @module controllers/settings.controller
 */

import * as settingsService from "../services/settings.service.js";
import { HTTP_STATUS } from "../constants/index.js";
import logger from "../utils/logger.js";

/**
 * @route GET /api/settings/:key
 * @desc Obtiene una configuración específica
 * @access Private (Admin)
 */
export const getSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const setting = await settingsService.getSetting(key);

    if (!setting) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: {
          message: "Configuración no encontrada",
        },
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: setting,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/settings
 * @desc Obtiene todas las configuraciones
 * @access Private (Admin)
 */
export const getAllSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getAllSettings();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PUT /api/settings/:key
 * @desc Actualiza una configuración específica
 * @access Private (Admin)
 */
export const updateSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          message: "El valor es requerido",
        },
      });
    }

    const setting = await settingsService.setSetting(key, value);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Configuración actualizada correctamente",
      data: setting,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/settings/upload-background
 * @desc Sube una imagen de fondo (página pública o panel admin según el tipo)
 * @access Private (Admin)
 */
export const uploadBackground = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          message: "No se proporcionó ningún archivo",
        },
      });
    }

    const { type } = req.body; // 'public' o 'admin'
    const imageUrl = `/src/assets/${req.file.filename}`;

    // Guardar en la base de datos según el tipo
    if (type === "admin") {
      await settingsService.setAdminBackgroundImage(imageUrl);
    } else {
      await settingsService.setBackgroundImage(imageUrl);
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Imagen de fondo ${type === "admin" ? "del panel administrativo" : "de la página pública"
        } subida correctamente`,
      data: { imageUrl, type },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/settings/upload-logo
 * @desc Sube un logo
 * @access Private (Admin)
 */
export const uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          message: "No se proporcionó ningún archivo",
        },
      });
    }

    // Para la URL, usamos /src/assets/ ya que el frontend lo sirve desde ahí
    const imageUrl = `/src/assets/${req.file.filename}`;

    // Guardar en la base de datos
    await settingsService.setLogo(imageUrl);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Logo subido correctamente",
      data: { imageUrl },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/settings/background/current
 * @desc Obtiene la imagen de fondo actual (página pública)
 * @access Public
 */
export const getCurrentBackground = async (req, res, next) => {
  try {
    const backgroundImage = await settingsService.getBackgroundImage();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { backgroundImage },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/settings/admin-background/current
 * @desc Obtiene la imagen de fondo actual del panel administrativo
 * @access Private (Admin)
 */
export const getCurrentAdminBackground = async (req, res, next) => {
  try {
    const adminBackgroundImage = await settingsService.getAdminBackgroundImage();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { adminBackgroundImage },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/settings/logo/current
 * @desc Obtiene el logo actual
 * @access Public
 */
export const getCurrentLogo = async (req, res, next) => {
  try {
    const logo = await settingsService.getLogo();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { logo },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/settings/offers_section_enabled o /api/settings/products_section_enabled
 * @desc Obtiene un setting público específico
 * @access Public
 */
export const getPublicSetting = async (req, res, next) => {
  try {
    // Extraer el key de la ruta (offers_section_enabled o products_section_enabled)
    const key = req.path.split("/").pop();
    const setting = await settingsService.getSetting(key);

    // Evitar caché del navegador
    res.header("Cache-Control", "no-cache, no-store, must-revalidate");
    res.header("Pragma", "no-cache");
    res.header("Expires", "0");

    if (!setting) {
      // Si no existe, devolver un valor por defecto (true = habilitado)
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { key, value: true },
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: setting,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/settings/hours
 * @desc Obtiene los horarios de trabajo y días cerrados
 * @access Private (Admin)
 */
export const getHours = async (req, res, next) => {
  try {
    const workingHours = await settingsService.getSetting("working_hours");
    const closedDays = await settingsService.getSetting("closed_days");

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        workingHours: workingHours?.value ? JSON.parse(workingHours.value) : null,
        closedDays: closedDays?.value ? JSON.parse(closedDays.value) : [],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PUT /api/settings/hours
 * @desc Actualiza los horarios de trabajo y días cerrados
 * @access Private (Admin)
 */
export const updateHours = async (req, res, next) => {
  try {
    const { workingHours, closedDays } = req.body;

    await settingsService.setSetting("working_hours", JSON.stringify(workingHours));
    await settingsService.setSetting("closed_days", JSON.stringify(closedDays || []));

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Horarios actualizados correctamente",
      data: { workingHours, closedDays },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/settings/notifications
 * @desc Obtiene la configuración de notificaciones
 * @access Private (Admin)
 */
export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await settingsService.getSetting("notifications");

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: notifications?.value
        ? JSON.parse(notifications.value)
        : {
          emailEnabled: false,
          smsEnabled: false,
          reminderHours: 24,
          reminderEnabled: true,
          confirmationEnabled: true,
          cancellationEnabled: true,
        },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PUT /api/settings/notifications
 * @desc Actualiza la configuración de notificaciones
 * @access Private (Admin)
 */
export const updateNotifications = async (req, res, next) => {
  try {
    const notifications = req.body;

    await settingsService.setSetting("notifications", JSON.stringify(notifications));

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Configuración de notificaciones actualizada correctamente",
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/settings/upload-background
 * @desc Actualiza la imagen de fondo de la página pública (acepta URL)
 * @access Private (Admin)
 */
export const updateBackgroundUrl = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          message: "La URL de la imagen es requerida",
        },
      });
    }

    await settingsService.setBackgroundImage(imageUrl);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Imagen de fondo de la página pública actualizada correctamente",
      data: { imageUrl },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/settings/upload-admin-background
 * @desc Actualiza la imagen de fondo del panel admin (acepta URL)
 * @access Private (Admin)
 */
export const updateAdminBackgroundUrl = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          message: "La URL de la imagen es requerida",
        },
      });
    }

    await settingsService.setAdminBackgroundImage(imageUrl);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Imagen de fondo del panel administrativo actualizada correctamente",
      data: { imageUrl },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/settings/upload-logo
 * @desc Actualiza el logo (acepta URL)
 * @access Private (Admin)
 */
export const updateLogoUrl = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          message: "La URL de la imagen es requerida",
        },
      });
    }

    await settingsService.setLogo(imageUrl);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Logo actualizado correctamente",
      data: { imageUrl },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Valida si una URL es de YouTube
 */
const isValidYouTubeUrl = (url) => {
  const patterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
    /^https?:\/\/youtu\.be\/[\w-]+/,
    /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
  ];
  return patterns.some((pattern) => pattern.test(url));
};

/**
 * @route GET /api/settings/homepage-video
 * @desc Obtiene la URL del video de la página principal
 * @access Public
 */
export const getHomepageVideo = async (req, res, next) => {
  try {
    const videoUrl = await settingsService.getHomepageVideoUrl();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { videoUrl },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PUT /api/settings/homepage-video
 * @desc Actualiza la URL del video de la página principal
 * @access Private (Admin)
 */
export const updateHomepageVideo = async (req, res, next) => {
  try {
    const { videoUrl } = req.body;

    console.log("📝 Actualizando video, datos recibidos:", { videoUrl, body: req.body });

    if (!videoUrl || !videoUrl.trim()) {
      console.log("❌ Validación falló: URL vacía o solo espacios");
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          message: "La URL del video es requerida",
        },
      });
    }

    const trimmedUrl = videoUrl.trim();
    console.log("🔍 URL después de trim:", trimmedUrl);

    // Validar que sea una URL de YouTube válida
    if (!isValidYouTubeUrl(trimmedUrl)) {
      console.log("❌ Validación falló: URL no es de YouTube válida");
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          message: "La URL debe ser un video válido de YouTube",
        },
      });
    }

    console.log("✅ Validación exitosa, actualizando en BD...");
    const userId = req.user?.id;
    await settingsService.updateHomepageVideoUrl(trimmedUrl, userId);

    console.log("✅ Video actualizado correctamente");
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Video de la página principal actualizado correctamente",
      data: { videoUrl: trimmedUrl },
    });
  } catch (error) {
    console.error("❌ Error en updateHomepageVideo:", error);
    next(error);
  }
};

/**
 * Valida si una URL es de Google Drive
 */
const isValidGoogleDriveUrl = (url) => {
  return /^https:\/\/drive\.google\.com\/file\/d\/[\w-]+/.test(url);
};

/**
 * @route GET /api/settings/homepage-video-config
 * @desc Obtiene la configuración completa del video de fondo
 * @access Public
 */
export const getHomepageVideoConfig = async (req, res, next) => {
  try {
    const config = await settingsService.getHomepageVideoConfig();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PUT /api/settings/homepage-video-config
 * @desc Actualiza la configuración del video de fondo
 * @access Private (Admin)
 */
export const updateHomepageVideoConfig = async (req, res, next) => {
  try {
    const { type, url } = req.body;

    console.log("📝 Actualizando config de video:", { type, url });

    // Validar tipo
    if (!["default", "upload", "youtube", "drive"].includes(type)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: { message: "Tipo de video inválido" },
      });
    }

    // Validar URL si es youtube o drive
    if (type === "youtube" && url && !isValidYouTubeUrl(url)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: { message: "URL de YouTube inválida" },
      });
    }

    if (type === "drive" && url && !isValidGoogleDriveUrl(url)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: { message: "URL de Google Drive inválida" },
      });
    }

    const userId = req.user?.id;
    await settingsService.updateHomepageVideoConfig(type, url || "", "", userId);

    console.log("✅ Config de video actualizada");
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Configuración de video actualizada correctamente",
    });
  } catch (error) {
    console.error("❌ Error en updateHomepageVideoConfig:", error);
    next(error);
  }
};

/**
 * @route POST /api/settings/homepage-video-upload
 * @desc Sube un archivo de video
 * @access Private (Admin)
 */
export const uploadHomepageVideo = async (req, res, next) => {
  try {
    console.log("Subiendo video, archivo recibido:", req.file?.originalname);

    if (!req.file) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: { message: "No se recibió ningún archivo" },
      });
    }

    // Validar tamaño (max 50MB)
    if (req.file.size > 50 * 1024 * 1024) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: { message: "El archivo es demasiado grande (máx 50MB)" },
      });
    }

    // Validar formato
    const allowedFormats = ["video/mp4", "video/webm", "video/quicktime"];
    if (!allowedFormats.includes(req.file.mimetype)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: { message: "Formato no soportado. Use MP4, WebM o MOV" },
      });
    }

    const userId = req.user?.id;
    const filePath = await settingsService.saveUploadedVideo(req.file, userId);

    console.log("Controller: Path received from saveUploadedVideo:", filePath);

    // Actualizar configuración para usar el archivo subido
    console.log("Controller: Calling updateHomepageVideoConfig with:", {
      type: "upload",
      url: "",
      file: filePath,
    });
    await settingsService.updateHomepageVideoConfig("upload", "", filePath, userId);

    console.log("Video subido correctamente:", filePath);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Video subido correctamente",
      data: { filePath },
    });
  } catch (error) {
    console.error("Error en uploadHomepageVideo:", error);
    next(error);
  }
};

/**
 * @route POST /api/settings/homepage-hero-images
 * @desc Sube hasta 3 imágenes para el hero de la página principal
 * @access Private (Admin)
 *
 * Nota: Esta función EXISTE para que la ruta no reviente (antes estaba undefined).
 * Asegúrate de servir la carpeta /uploads como estática en tu app.js si quieres acceder a las imágenes por URL.
 */
export const uploadHeroImages = async (req, res, next) => {
  try {
    const files = req.files || [];

    if (!files.length) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: { message: "No se recibieron imágenes" },
      });
    }

    // multer guarda en uploads/hero/; generamos URLs públicas sugeridas
    const imageUrls = files.map((f) => `/uploads/hero/${f.filename}`);

    // Guarda en settings (puedes cambiar la key si ya usas otra en tu proyecto)
    await settingsService.setSetting("homepage_hero_images", JSON.stringify(imageUrls));

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Imágenes del hero actualizadas correctamente",
      data: { imageUrls },
    });
  } catch (error) {
    next(error);
  }
};
