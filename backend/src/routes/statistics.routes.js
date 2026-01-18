/**
 * @fileoverview Rutas de estadísticas
 * @module routes/statistics.routes
 */

import { Router } from "express";
import * as statisticsController from "../controllers/statistics.controller.js";
import { authenticate, requireAdmin } from "../middlewares/auth.js";

const router = Router();

/**
 * @route GET /api/statistics/dashboard
 * @desc Obtiene estadísticas generales del dashboard (admin)
 */
router.get("/dashboard", authenticate, requireAdmin, statisticsController.getDashboardStats);

/**
 * @route GET /api/statistics/monthly-sales
 * @desc Obtiene estadísticas de ventas por mes (admin)
 */
router.get("/monthly-sales", authenticate, requireAdmin, statisticsController.getMonthlySales);

export default router;







