/**
 * @fileoverview Rutas de códigos de descuento
 * @module routes/discounts.routes
 */

import { Router } from "express";
import * as discountsController from "../controllers/discounts.controller.js";
import { authenticate, requireAdmin } from "../middlewares/auth.js";

const router = Router();

// Ruta pública para validar códigos
router.post("/validate", discountsController.validateDiscountCode);

// Rutas protegidas (admin)
router.get("/", authenticate, requireAdmin, discountsController.getAllDiscountCodes);
router.get("/:id", authenticate, requireAdmin, discountsController.getDiscountCodeById);
router.post("/", authenticate, requireAdmin, discountsController.createDiscountCode);
router.put("/:id", authenticate, requireAdmin, discountsController.updateDiscountCode);
router.delete("/:id", authenticate, requireAdmin, discountsController.deleteDiscountCode);

export default router;







