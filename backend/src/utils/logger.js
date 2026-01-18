/**
 * @fileoverview Configuración de logging con Winston
 * @module utils/logger
 * 
 * He configurado este logger para registrar todos los eventos del sistema
 * en consola y archivos, con diferentes niveles según el entorno.
 */

import winston from "winston";

const { combine, timestamp, printf, colorize, errors } = winston.format;

/**
 * Formato personalizado para los logs
 * He diseñado este formato para que sea legible y contenga toda la información necesaria.
 */
const customFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

/**
 * Logger configurado para desarrollo y producción
 * En producción solo registra info y errores, en desarrollo registra todo (debug).
 */
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: combine(
    errors({ stack: true }),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    customFormat
  ),
  transports: [
    // Consola con colores para desarrollo
    new winston.transports.Console({
      format: combine(colorize(), customFormat),
    }),
    // Archivo para errores
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
    }),
    // Archivo para todos los logs
    new winston.transports.File({
      filename: "logs/combined.log",
    }),
  ],
});


export default logger;



