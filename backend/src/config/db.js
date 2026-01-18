/**
 * @fileoverview Configuración de conexión a Postgres (Supabase)
 * @module config/db
 *
 * Pool de conexiones Postgres optimizado para manejar
 * múltiples peticiones concurrentes de manera eficiente.
 *
 * Recomendación para Render + Supabase:
 * - Usar SSL en producción (DB_SSL=true) y permitir self-signed (rejectUnauthorized:false)
 * - Mantener timeouts razonables
 */

import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

/**
 * Normaliza valores booleanos desde env.
 * Acepta: "true", "1", "yes", "on" (case-insensitive)
 */
function envBool(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;
  return ["true", "1", "yes", "on"].includes(String(value).trim().toLowerCase());
}

/**
 * Convierte a número con fallback.
 */
function envInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const isProduction = process.env.NODE_ENV === "production";
const useSsl = envBool(process.env.DB_SSL, isProduction);

/**
 * Pool de conexiones a Postgres (Supabase)
 * Postgres usa UTF-8 por defecto para soportar caracteres especiales y emojis.
 */
export const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: envInt(process.env.DB_PORT, 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "postgres",

  // Ajustes de pool (puedes tunear según tráfico)
  max: envInt(process.env.DB_POOL_MAX, 10),
  idleTimeoutMillis: envInt(process.env.DB_IDLE_TIMEOUT_MS, 60000),
  connectionTimeoutMillis: envInt(process.env.DB_CONN_TIMEOUT_MS, 60000),

  // Render + Supabase: SSL recomendado en producción
  // Supabase suele requerir rejectUnauthorized=false por certificados (especialmente con pooler)
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

/**
 * Prueba la conexión a la base de datos.
 * Útil al iniciar el servidor para verificar que la BD está disponible.
 * @returns {Promise<boolean>}
 */
export async function testDBConnection() {
  let client;
  try {
    client = await pool.connect();
    await client.query("SELECT 1");
    return true;
  } catch (error) {
    // Re-lanza para que el caller decida qué hacer (log + crash, retry, etc.)
    throw error;
  } finally {
    if (client) client.release();
  }
}

/**
 * Cierra el pool de conexiones
 * Útil para tests o shutdown graceful del servidor.
 */
export async function closeDBConnection() {
  await pool.end();
}
