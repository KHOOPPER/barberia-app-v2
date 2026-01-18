/**
 * @fileoverview Rutas de barberos
 * @module routes/barbers.routes
 */

import { Router } from "express";
import * as barbersController from "../controllers/barbers.controller.js";
import { authenticate, requireAdmin } from "../middlewares/auth.js";

const router = Router();

/**
 * @route GET /api/barbers
 * @desc Obtiene todos los barberos (público para booking)
 */
router.get("/", barbersController.getBarbers);

/**
 * @route GET /api/barbers/:id
 * @desc Obtiene un barbero por ID (público)
 */
router.get("/:id", barbersController.getBarberById);

/**
 * @route POST /api/barbers
 * @desc Crea un nuevo barbero (admin)
 */
router.post("/", authenticate, requireAdmin, barbersController.createBarber);

/**
 * @route PUT /api/barbers/:id
 * @desc Actualiza un barbero (admin)
 */
router.put("/:id", authenticate, requireAdmin, barbersController.updateBarber);

/**
 * @route DELETE /api/barbers/:id
 * @desc Elimina un barbero (admin)
 */
router.delete("/:id", authenticate, requireAdmin, barbersController.deleteBarber);

export default router;
