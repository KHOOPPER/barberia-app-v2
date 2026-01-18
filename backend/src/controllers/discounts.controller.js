/**
 * @fileoverview Controlador de códigos de descuento
 * @module controllers/discounts.controller
 */

import * as discountsService from "../services/discounts.service.js";
import { HTTP_STATUS } from "../constants/index.js";

/**
 * @route GET /api/discounts
 * @desc Obtiene todos los códigos de descuento
 * @access Private (Admin)
 */
export const getAllDiscountCodes = async (req, res, next) => {
  try {
    const { includeInactive } = req.query;
    const codes = await discountsService.getAllDiscountCodes(includeInactive === "true");
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: codes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/discounts/:id
 * @desc Obtiene un código de descuento por ID
 * @access Private (Admin)
 */
export const getDiscountCodeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const code = await discountsService.getDiscountCodeById(parseInt(id, 10));
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: code,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/discounts/validate
 * @desc Valida un código de descuento
 * @access Public (para usar en checkout)
 */
export const validateDiscountCode = async (req, res, next) => {
  try {
    const { code, totalAmount } = req.body;
    
    if (!code || totalAmount === undefined) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          message: "Los campos 'code' y 'totalAmount' son requeridos",
        },
      });
    }

    const result = await discountsService.validateDiscountCode(code, parseFloat(totalAmount));
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/discounts
 * @desc Crea un nuevo código de descuento
 * @access Private (Admin)
 */
export const createDiscountCode = async (req, res, next) => {
  try {
    const code = await discountsService.createDiscountCode(req.body);
    
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: "Código de descuento creado correctamente",
      data: code,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PUT /api/discounts/:id
 * @desc Actualiza un código de descuento
 * @access Private (Admin)
 */
export const updateDiscountCode = async (req, res, next) => {
  try {
    const { id } = req.params;
    const code = await discountsService.updateDiscountCode(parseInt(id, 10), req.body);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Código de descuento actualizado correctamente",
      data: code,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route DELETE /api/discounts/:id
 * @desc Elimina un código de descuento
 * @access Private (Admin)
 */
export const deleteDiscountCode = async (req, res, next) => {
  try {
    const { id } = req.params;
    await discountsService.deleteDiscountCode(parseInt(id, 10));
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Código de descuento eliminado correctamente",
    });
  } catch (error) {
    next(error);
  }
};







