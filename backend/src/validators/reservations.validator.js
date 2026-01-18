/**
 * @fileoverview Validaciones para rutas de reservas
 * @module validators/reservations.validator
 */

import { body, query, param } from "express-validator";
import { ALLOWED_STATUSES, RESERVATION_STATUS } from "../constants/index.js";
import { isValidDate, isValidTime, isNotPastDate, isValidPhone } from "../utils/validators.js";

/**
 * Validaciones para crear reserva
 */
export const validateCreateReservation = [
  body("serviceId")
    .notEmpty()
    .withMessage("serviceId es requerido")
    .isString()
    .withMessage("serviceId debe ser una cadena de texto")
    .trim(),

  body("serviceLabel")
    .optional()
    .isString()
    .withMessage("serviceLabel debe ser una cadena de texto")
    .trim()
    .isLength({ max: 200 })
    .withMessage("serviceLabel no puede exceder 200 caracteres")
    .escape(), // Sanitizar para prevenir XSS

  body("barberId")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("barberId debe ser una cadena de texto")
    .trim(),

  body("date")
    .notEmpty()
    .withMessage("date es requerido")
    .isString()
    .withMessage("date debe ser una cadena de texto")
    .custom((value) => {
      if (!isValidDate(value)) {
        throw new Error("date debe tener formato YYYY-MM-DD");
      }
      if (!isNotPastDate(value)) {
        throw new Error("date no puede ser una fecha pasada");
      }
      return true;
    }),

  body("time")
    .notEmpty()
    .withMessage("time es requerido")
    .isString()
    .withMessage("time debe ser una cadena de texto")
    .custom((value) => {
      if (!isValidTime(value)) {
        throw new Error("time debe tener formato HH:MM");
      }
      return true;
    }),

  body("customerName")
    .optional()
    .isString()
    .withMessage("customerName debe ser una cadena de texto")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("customerName debe tener entre 2 y 100 caracteres")
    .escape(), // Sanitizar para prevenir XSS

  body("customerPhone")
    .optional()
    .custom((value) => {
      if (value && !isValidPhone(value)) {
        throw new Error("customerPhone debe ser un teléfono válido");
      }
      return true;
    })
    .trim(),
];

/**
 * Validaciones para obtener reservas (query params)
 */
export const validateGetReservations = [
  query("date")
    .notEmpty()
    .withMessage("El parámetro 'date' es requerido (YYYY-MM-DD)")
    .isString()
    .withMessage("date debe ser una cadena de texto")
    .custom((value) => {
      if (!isValidDate(value)) {
        throw new Error("date debe tener formato YYYY-MM-DD");
      }
      return true;
    }),

  query("barberId")
    .optional()
    .isString()
    .withMessage("barberId debe ser una cadena de texto")
    .trim(),
];

/**
 * Validaciones para obtener todas las reservas (admin - query params)
 */
export const validateGetAllReservations = [
  query("date")
    .optional()
    .isString()
    .withMessage("date debe ser una cadena de texto")
    .custom((value) => {
      if (value && !isValidDate(value)) {
        throw new Error("date debe tener formato YYYY-MM-DD");
      }
      return true;
    }),

  query("barberId")
    .optional()
    .isString()
    .withMessage("barberId debe ser una cadena de texto")
    .trim(),

  query("status")
    .optional()
    .isIn(ALLOWED_STATUSES)
    .withMessage(`status debe ser uno de: ${ALLOWED_STATUSES.join(", ")}`),
];

/**
 * Validaciones para actualizar estado de reserva
 */
export const validateUpdateReservationStatus = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("id debe ser un número entero positivo"),

  body("status")
    .notEmpty()
    .withMessage("status es requerido")
    .isIn(ALLOWED_STATUSES)
    .withMessage(`status debe ser uno de: ${ALLOWED_STATUSES.join(", ")}`),
];

/**
 * Validaciones para eliminar reserva
 */
export const validateDeleteReservation = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("id debe ser un número entero positivo"),
];

/**
 * Validaciones para crear reservas desde el carrito
 */
export const validateCreateReservationsFromCart = [
  body("customerName")
    .notEmpty()
    .withMessage("customerName es requerido")
    .isString()
    .withMessage("customerName debe ser una cadena de texto")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("customerName debe tener entre 2 y 100 caracteres")
    .escape(), // Sanitizar para prevenir XSS

  body("customerPhone")
    .notEmpty()
    .withMessage("customerPhone es requerido")
    .custom((value) => {
      if (value && !isValidPhone(value)) {
        throw new Error("customerPhone debe ser un teléfono válido");
      }
      return true;
    })
    .trim(),

  body("cartItems")
    .notEmpty()
    .withMessage("cartItems es requerido")
    .isArray({ min: 1 })
    .withMessage("cartItems debe ser un array con al menos un elemento"),

  body("discountCodeId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("discountCodeId debe ser un número entero positivo"),
];


