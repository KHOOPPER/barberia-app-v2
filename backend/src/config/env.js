/**
 * @fileoverview Validación de variables de entorno
 * @module config/env
 * 
 * He implementado esta validación para asegurar que todas las variables
 * de entorno necesarias estén configuradas antes de iniciar el servidor.
 */

import dotenv from "dotenv";

dotenv.config();

/**
 * Variables de entorno requeridas para el funcionamiento del sistema
 */
const requiredEnvVars = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME", "JWT_SECRET"];

/**
 * Valida que todas las variables de entorno requeridas estén definidas
 * También valido que JWT_SECRET tenga al menos 32 caracteres para mayor seguridad.
 * @throws {Error} Si falta alguna variable requerida o JWT_SECRET es muy corto
 */
export function validateEnv() {
  const missing = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Variables de entorno faltantes: ${missing.join(", ")}\n` +
        "Por favor, crea un archivo .env con todas las variables necesarias.\n" +
        "Puedes usar env.example.txt como referencia."
    );
  }

  // Validaciones adicionales
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error(
      "JWT_SECRET es demasiado corto. Se recomienda usar al menos 32 caracteres para mayor seguridad."
    );
  }
}
