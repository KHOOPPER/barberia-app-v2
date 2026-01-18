/**
 * @fileoverview Rutas de ofertas
 * @module routes/offers.routes
 */

import { Router } from "express";
import * as offersController from "../controllers/offers.controller.js";
import { authenticate, requireAdmin } from "../middlewares/auth.js";

const router = Router();

/**
 * @route GET /api/offers
 * @desc Obtiene todas las ofertas (público)
 */
router.get("/", offersController.getOffers);

/**
 * @route GET /api/offers/:id
 * @desc Obtiene una oferta por ID (público)
 */
router.get("/:id", offersController.getOfferById);

/**
 * @route POST /api/offers
 * @desc Crea una nueva oferta (admin)
 */
router.post("/", authenticate, requireAdmin, offersController.createOffer);

/**
 * @route PUT /api/offers/:id
 * @desc Actualiza una oferta (admin)
 */
router.put("/:id", authenticate, requireAdmin, offersController.updateOffer);

/**
 * @route DELETE /api/offers/:id
 * @desc Elimina una oferta (admin)
 */
router.delete("/:id", authenticate, requireAdmin, offersController.deleteOffer);

export default router;
