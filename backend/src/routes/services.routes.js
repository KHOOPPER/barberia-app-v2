/**
 * @fileoverview Rutas de servicios
 * @module routes/services.routes
 */

import { Router } from "express";
import * as servicesController from "../controllers/services.controller.js";
import { authenticate, requireAdmin } from "../middlewares/auth.js";

const router = Router();

/**
 * @route GET /api/services
 * @desc Obtiene todos los servicios (público)
 */
router.get("/", servicesController.getServices);

/**
 * @route GET /api/services/:id
 * @desc Obtiene un servicio por ID (público)
 */
router.get("/:id", servicesController.getServiceById);

/**
 * @route POST /api/services
 * @desc Crea un nuevo servicio (admin)
 */
router.post("/", authenticate, requireAdmin, servicesController.createService);

/**
 * @route PUT /api/services/:id
 * @desc Actualiza un servicio (admin)
 */
router.put("/:id", authenticate, requireAdmin, servicesController.updateService);

/**
 * @route DELETE /api/services/:id
 * @desc Elimina un servicio (admin)
 */
router.delete("/:id", authenticate, requireAdmin, servicesController.deleteService);

export default router;
