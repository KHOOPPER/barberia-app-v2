/**
 * @fileoverview Controlador de reservas
 * @module controllers/reservations.controller
 */

import * as reservationsService from "../services/reservations.service.js";
import { HTTP_STATUS } from "../constants/index.js";

/**
 * @route GET /api/reservations
 * @desc Obtiene reservas por fecha (público - para booking)
 * @access Public
 */
export const getReservations = async (req, res, next) => {
  try {
    const { date, barberId } = req.query;

    const reservations = await reservationsService.getReservationsByDate(
      date,
      barberId || null
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: reservations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/reservations
 * @desc Crea una nueva reserva
 * @access Public
 */
export const createReservation = async (req, res, next) => {
  try {
    const reservation = await reservationsService.createReservation(req.body);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: "Reserva creada correctamente",
      data: {
        reservationId: reservation.id,
        reservation,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/reservations/admin
 * @desc Obtiene todas las reservas con filtros (admin)
 * @access Private (Admin)
 */
export const getAllReservations = async (req, res, next) => {
  try {
    // Validar tipos de parámetros query explícitamente
    const date = typeof req.query.date === "string" ? req.query.date : null;
    const barberId = typeof req.query.barberId === "string" ? req.query.barberId : null;
    const status = typeof req.query.status === "string" ? req.query.status : null;

    const reservations = await reservationsService.getAllReservations({
      date: date || null,
      barberId: barberId || null,
      status: status || null,
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: reservations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PUT /api/reservations/:id/status
 * @desc Actualiza el estado de una reserva
 * @access Private (Admin)
 */
export const updateReservationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const reservation = await reservationsService.updateReservationStatus(
      parseInt(id, 10),
      status
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Estado actualizado correctamente",
      data: reservation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PUT /api/reservations/:id/items
 * @desc Actualiza los items de una reserva (edición de factura)
 * @access Private (Admin)
 */
export const updateReservationItems = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items, discountCodeId } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          message: "El campo 'items' es requerido y debe ser un array",
        },
      });
    }

    const updatedItems = await reservationsService.updateReservationItems(
      parseInt(id, 10),
      items,
      discountCodeId || null
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Items de la reserva actualizados correctamente",
      data: updatedItems,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/reservations/:id/items
 * @desc Obtiene los items de una reserva
 * @access Private (Admin)
 */
export const getReservationItems = async (req, res, next) => {
  try {
    const { id } = req.params;

    const items = await reservationsService.getReservationItems(parseInt(id, 10));

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route DELETE /api/reservations/:id
 * @desc Elimina una reserva
 * @access Private (Admin)
 */
/**
 * @route POST /api/reservations/from-cart
 * @desc Crea reservas desde el carrito de compras
 * @access Public
 */
export const createReservationsFromCart = async (req, res, next) => {
  try {
    const result = await reservationsService.createReservationsFromCart(req.body);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: `${result.success} reserva(s) creada(s) correctamente`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteReservation = async (req, res, next) => {
  try {
    const { id } = req.params;

    await reservationsService.deleteReservation(parseInt(id, 10));

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Reserva eliminada correctamente",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PUT /api/reservations/:id/delivery-status
 * @desc Actualiza el estado de entrega de una factura de productos
 * @access Private (Admin)
 */
export const updateDeliveryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deliveryStatus } = req.body;

    if (!deliveryStatus) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          message: "deliveryStatus es requerido",
        },
      });
    }

    const updatedReservation = await reservationsService.updateDeliveryStatus(
      parseInt(id, 10),
      deliveryStatus
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Estado de entrega actualizado correctamente",
      data: updatedReservation,
    });
  } catch (error) {
    next(error);
  }
};
