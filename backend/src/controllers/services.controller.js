/**
 * @fileoverview Controlador de servicios
 * @module controllers/services.controller
 */

import * as servicesService from "../services/services.service.js";
import { HTTP_STATUS } from "../constants/index.js";
import logger from "../utils/logger.js";

/**
 * @route GET /api/services
 * @desc Obtiene todos los servicios
 * @access Public
 */
export const getServices = async (req, res, next) => {
  try {
    // Debug log removed

    // Validar tipos de parámetros query explícitamente
    const includeInactive = req.query.includeInactive === "true" || req.query.includeInactive === true;
    const forInvoice = req.query.forInvoice === "true" || req.query.forInvoice === true;



    // Asegurar que sean booleanos
    const includeInactiveBool = Boolean(includeInactive);
    const forInvoiceBool = Boolean(forInvoice);

    // Para facturación o público: solo servicios activos
    // Si includeInactive es true, es una petición de admin (muestra todos)
    const includeAll = includeInactiveBool && !forInvoiceBool;
    const services = await servicesService.getAllServices(includeAll);



    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: services,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/services/:id
 * @desc Obtiene un servicio por ID
 * @access Public
 */
export const getServiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const service = await servicesService.getServiceById(id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/services
 * @desc Crea un nuevo servicio
 * @access Private (Admin)
 */
export const createService = async (req, res, next) => {
  try {
    const service = await servicesService.createService(req.body);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: "Servicio creado correctamente",
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PUT /api/services/:id
 * @desc Actualiza un servicio
 * @access Private (Admin)
 */
export const updateService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const service = await servicesService.updateService(id, req.body);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Servicio actualizado correctamente",
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route DELETE /api/services/:id
 * @desc Elimina un servicio
 * @access Private (Admin)
 */
export const deleteService = async (req, res, next) => {
  try {
    const { id } = req.params;
    await servicesService.deleteService(id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Servicio eliminado correctamente",
    });
  } catch (error) {
    next(error);
  }
};



