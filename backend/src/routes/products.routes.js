/**
 * @fileoverview Rutas de productos
 * @module routes/products.routes
 */

import { Router } from "express";
import * as productsController from "../controllers/products.controller.js";
import { authenticate, requireAdmin } from "../middlewares/auth.js";

const router = Router();

/**
 * @route GET /api/products
 * @desc Obtiene todos los productos (público)
 */
router.get("/", productsController.getProducts);

/**
 * @route GET /api/products/:id
 * @desc Obtiene un producto por ID (público)
 */
router.get("/:id", productsController.getProductById);

/**
 * @route POST /api/products
 * @desc Crea un nuevo producto (admin)
 */
router.post("/", authenticate, requireAdmin, productsController.createProduct);

/**
 * @route PUT /api/products/:id
 * @desc Actualiza un producto (admin)
 */
router.put("/:id", authenticate, requireAdmin, productsController.updateProduct);

/**
 * @route DELETE /api/products/:id
 * @desc Elimina un producto (admin)
 */
router.delete("/:id", authenticate, requireAdmin, productsController.deleteProduct);

export default router;
