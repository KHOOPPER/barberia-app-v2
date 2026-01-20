/**
 * @fileoverview Rutas de configuraciones
 * @module routes/settings.routes
 */

import { Router } from "express";
import multer from "multer";
import * as settingsController from "../controllers/settings.controller.js";
import { authenticate, requireAdmin } from "../middlewares/auth.js";

// Configurar multer para subida de videos
const upload = multer({
    dest: 'uploads/videos/',
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Configurar multer para subida de imágenes
const uploadImages = multer({
    dest: 'uploads/hero/',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB por imagen
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes'));
        }
    }
});

const router = Router();

// ============================================================
// RUTAS ESPECÍFICAS (Deben ir ANTES de las rutas dinámicas /:key)
// ============================================================

// Rutas públicas (para obtener fondo y logo)
router.get("/background/current", settingsController.getCurrentBackground);
router.get("/admin-background/current", authenticate, requireAdmin, settingsController.getCurrentAdminBackground);
router.get("/logo/current", settingsController.getCurrentLogo);

// Rutas públicas para settings específicos (secciones habilitadas)
router.get("/offers_section_enabled", settingsController.getPublicSetting);
router.get("/products_section_enabled", settingsController.getPublicSetting);

// Rutas de horarios y notificaciones
router.get("/hours", authenticate, requireAdmin, settingsController.getHours);
router.put("/hours", authenticate, requireAdmin, settingsController.updateHours);
router.get("/notifications", authenticate, requireAdmin, settingsController.getNotifications);
router.put("/notifications", authenticate, requireAdmin, settingsController.updateNotifications);

// Rutas para actualizar imágenes (aceptan URLs)
router.post("/upload-background", authenticate, requireAdmin, settingsController.updateBackgroundUrl);
router.post("/upload-admin-background", authenticate, requireAdmin, settingsController.updateAdminBackgroundUrl);
router.post("/upload-logo", authenticate, requireAdmin, settingsController.updateLogoUrl);

// Rutas para video de la página principal (legacy - YouTube only)
router.get("/homepage-video", settingsController.getHomepageVideo);
router.put("/homepage-video", authenticate, requireAdmin, settingsController.updateHomepageVideo);

// Rutas para configuración multi-fuente de video
router.get("/homepage-video-config", settingsController.getHomepageVideoConfig);
router.put("/homepage-video-config", authenticate, requireAdmin, settingsController.updateHomepageVideoConfig);
router.post("/homepage-video-upload", authenticate, requireAdmin, upload.single('video'), settingsController.uploadHomepageVideo);
router.post("/homepage-hero-images", authenticate, requireAdmin, uploadImages.array('images', 3), settingsController.uploadHeroImages);

// ============================================================
// RUTAS GENÉRICAS / DINÁMICAS (Deben ir al FINAL)
// ============================================================

// Rutas protegidas (admin)
router.get("/", authenticate, requireAdmin, settingsController.getAllSettings);
router.get("/:key", authenticate, requireAdmin, settingsController.getSetting);
router.put("/:key", authenticate, requireAdmin, settingsController.updateSetting);

export default router;
