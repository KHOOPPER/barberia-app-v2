/**
 * @fileoverview Rutas base de la API
 * @module routes/base.routes
 */

import { Router } from "express";
import { HTTP_STATUS } from "../constants/index.js";

const router = Router();

/**
 * @route GET /api
 * @desc Ruta raíz de la API
 * @access Public
 */
router.get("/", (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: "API Barbería funcionando 🧔✂️",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      reservations: "/api/reservations",
      health: "/health",
    },
  });
});

export default router;
