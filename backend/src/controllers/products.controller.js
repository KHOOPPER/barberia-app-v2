/**
 * @fileoverview Controlador de productos
 * @module controllers/products.controller
 */

import * as productsService from "../services/products.service.js";
import { HTTP_STATUS } from "../constants/index.js";
import logger from "../utils/logger.js";

/**
 * @route GET /api/products
 * @desc Obtiene todos los productos
 * @access Public (solo muestra productos con is_active_page = true cuando es público)
 */
export const getProducts = async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === "true";
    const forInvoice = req.query.forInvoice === "true";

    // Si includeInactive es true, es una petición de admin (muestra todos)
    // Si forInvoice es true, es para facturación (muestra todos los activos, sin filtrar por página)
    // Si no, es una petición pública (solo productos activos en página)
    const publicOnly = !includeInactive && !forInvoice;
    const products = await productsService.getAllProducts(includeInactive, publicOnly);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/products/:id
 * @desc Obtiene un producto por ID
 * @access Public
 */
export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await productsService.getProductById(id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/products
 * @desc Crea un nuevo producto
 * @access Private (Admin)
 */
export const createProduct = async (req, res, next) => {
  try {
    const product = await productsService.createProduct(req.body);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: "Producto creado correctamente",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PUT /api/products/:id
 * @desc Actualiza un producto
 * @access Private (Admin)
 */
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await productsService.updateProduct(id, req.body);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Producto actualizado correctamente",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route DELETE /api/products/:id
 * @desc Elimina un producto (soft delete)
 * @access Private (Admin)
 */
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    await productsService.deleteProduct(id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Producto eliminado correctamente",
    });
  } catch (error) {
    next(error);
  }
};




