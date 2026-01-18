/**
 * @fileoverview Controlador de barberos
 * @module controllers/barbers.controller
 */

import * as barbersService from "../services/barbers.service.js";
import { HTTP_STATUS } from "../constants/index.js";

/**
 * @route GET /api/barbers
 * @desc Obtiene todos los barberos
 * @access Public (para booking) / Admin (para gestión)
 */
export const getBarbers = async (req, res, next) => {
  try {
    // Validar tipos de parámetros query explícitamente
    const includeInactive = req.query.includeInactive === "true" || req.query.includeInactive === true;
    const includeInactiveBool = Boolean(includeInactive);

    const barbers = await barbersService.getAllBarbers(includeInactiveBool);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: barbers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/barbers/:id
 * @desc Obtiene un barbero por ID
 * @access Public
 */
export const getBarberById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const barber = await barbersService.getBarberById(id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: barber,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/barbers
 * @desc Crea un nuevo barbero
 * @access Private (Admin)
 */
export const createBarber = async (req, res, next) => {
  try {
    const barber = await barbersService.createBarber(req.body);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: "Barbero creado correctamente",
      data: barber,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PUT /api/barbers/:id
 * @desc Actualiza un barbero
 * @access Private (Admin)
 */
export const updateBarber = async (req, res, next) => {
  try {
    const { id } = req.params;
    const barber = await barbersService.updateBarber(id, req.body);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Barbero actualizado correctamente",
      data: barber,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route DELETE /api/barbers/:id
 * @desc Elimina un barbero (soft delete)
 * @access Private (Admin)
 */
export const deleteBarber = async (req, res, next) => {
  try {
    const { id } = req.params;
    await barbersService.deleteBarber(id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Barbero eliminado correctamente",
    });
  } catch (error) {
    next(error);
  }
};
