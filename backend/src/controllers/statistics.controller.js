/**
 * @fileoverview Controlador de estadísticas
 * @module controllers/statistics.controller
 */

import * as statisticsService from "../services/statistics.service.js";
import { HTTP_STATUS } from "../constants/index.js";

/**
 * @route GET /api/statistics/dashboard
 * @desc Obtiene estadísticas generales del dashboard
 * @access Private (Admin)
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await statisticsService.getDashboardStats();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/statistics/monthly-sales
 * @desc Obtiene estadísticas de ventas por mes
 * @access Private (Admin)
 */
export const getMonthlySales = async (req, res, next) => {
  try {
    const { year } = req.query;
    const sales = await statisticsService.getMonthlySales(year ? parseInt(year) : null);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: sales,
    });
  } catch (error) {
    next(error);
  }
};







