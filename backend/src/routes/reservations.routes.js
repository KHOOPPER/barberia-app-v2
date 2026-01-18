/**
 * @fileoverview Rutas de reservas
 * @module routes/reservations.routes
 */

import { Router } from "express";
import * as reservationsController from "../controllers/reservations.controller.js";
import {
  validateCreateReservation,
  validateGetReservations,
  validateGetAllReservations,
  validateUpdateReservationStatus,
  validateDeleteReservation,
  validateCreateReservationsFromCart,
} from "../validators/reservations.validator.js";
import { handleValidationErrors } from "../middlewares/validation.js";
import { authenticate, requireAdmin } from "../middlewares/auth.js";

const router = Router();

/* ------------------------------
   Rutas públicas (booking)
----------------------------- */

/**
 * @route GET /api/reservations
 * @desc Obtiene reservas por fecha (público)
 */
router.get(
  "/",
  validateGetReservations,
  handleValidationErrors,
  reservationsController.getReservations
);

/**
 * @route POST /api/reservations
 * @desc Crea una nueva reserva (público)
 */
router.post(
  "/",
  validateCreateReservation,
  handleValidationErrors,
  reservationsController.createReservation
);

/**
 * @route POST /api/reservations/from-cart
 * @desc Crea reservas desde el carrito de compras (público)
 */
router.post(
  "/from-cart",
  validateCreateReservationsFromCart,
  handleValidationErrors,
  reservationsController.createReservationsFromCart
);

/* ------------------------------
   Rutas administrativas (requieren autenticación)
----------------------------- */

/**
 * @route GET /api/reservations/admin
 * @desc Obtiene todas las reservas con filtros (admin)
 */
router.get(
  "/admin",
  authenticate,
  requireAdmin,
  validateGetAllReservations,
  handleValidationErrors,
  reservationsController.getAllReservations
);

/**
 * @route PUT /api/reservations/:id/status
 * @desc Actualiza el estado de una reserva (admin)
 */
router.put(
  "/:id/status",
  authenticate,
  requireAdmin,
  validateUpdateReservationStatus,
  handleValidationErrors,
  reservationsController.updateReservationStatus
);

/**
 * @route PUT /api/reservations/:id/items
 * @desc Actualiza los items de una reserva (admin)
 */
router.put(
  "/:id/items",
  authenticate,
  requireAdmin,
  reservationsController.updateReservationItems
);

/**
 * @route PUT /api/reservations/:id/delivery-status
 * @desc Actualiza el estado de entrega de una factura de productos (admin)
 */
router.put(
  "/:id/delivery-status",
  authenticate,
  requireAdmin,
  reservationsController.updateDeliveryStatus
);

/**
 * @route GET /api/reservations/:id/items
 * @desc Obtiene los items de una reserva (admin)
 */
router.get(
  "/:id/items",
  authenticate,
  requireAdmin,
  reservationsController.getReservationItems
);

/**
 * @route DELETE /api/reservations/:id
 * @desc Elimina una reserva (admin)
 */
router.delete(
  "/:id",
  authenticate,
  requireAdmin,
  validateDeleteReservation,
  handleValidationErrors,
  reservationsController.deleteReservation
);

export default router;
