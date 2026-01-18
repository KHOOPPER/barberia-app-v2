/**
 * @fileoverview Controlador de ofertas
 * @module controllers/offers.controller
 */

import * as offersService from "../services/offers.service.js";
import { HTTP_STATUS } from "../constants/index.js";
import logger from "../utils/logger.js";

/**
 * @route GET /api/offers
 * @desc Obtiene todas las ofertas
 * @access Public
 */
export const getOffers = async (req, res, next) => {
  try {
    // Validar tipos de parámetros query explícitamente
    const includeInactive = req.query.includeInactive === "true" || req.query.includeInactive === true;
    const forInvoice = req.query.forInvoice === "true" || req.query.forInvoice === true;

    // Asegurar que sean booleanos
    const includeInactiveBool = Boolean(includeInactive);
    const forInvoiceBool = Boolean(forInvoice);

    // Para facturación o público: solo ofertas activas
    // Si includeInactive es true, es una petición de admin (muestra todas)
    const includeAll = includeInactiveBool && !forInvoiceBool;
    const offers = await offersService.getAllOffers(includeAll);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: offers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/offers/:id
 * @desc Obtiene una oferta por ID
 * @access Public
 */
export const getOfferById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const offer = await offersService.getOfferById(id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: offer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/offers
 * @desc Crea una nueva oferta
 * @access Private (Admin)
 */
export const createOffer = async (req, res, next) => {
  try {
    const offer = await offersService.createOffer(req.body);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: "Oferta creada correctamente",
      data: offer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PUT /api/offers/:id
 * @desc Actualiza una oferta
 * @access Private (Admin)
 */
export const updateOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const offer = await offersService.updateOffer(id, req.body);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Oferta actualizada correctamente",
      data: offer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route DELETE /api/offers/:id
 * @desc Elimina una oferta (soft delete)
 * @access Private (Admin)
 */
export const deleteOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    await offersService.deleteOffer(id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Oferta eliminada correctamente",
    });
  } catch (error) {
    next(error);
  }
};



