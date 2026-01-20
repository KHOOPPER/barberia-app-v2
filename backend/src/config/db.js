/**
 * @fileoverview Configuración de conexión a Postgres (Supabase)
 * @module config/db
 * 
 * Pool de conexiones Postgres optimizado para manejar
 * múltiples peticiones concurrentes de manera eficiente.
 */

import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

/**
 * Pool de conexiones a Postgres (Supabase)
 * Configurado con límites y timeouts optimizados para producción.
 * Postgres usa UTF-8 por defecto para soportar caracteres especiales y emojis.
 */
export const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "postgres",
  max: 10, // Máximo de conexiones en el pool
  idleTimeoutMillis: 60000, // 60 segundos antes de cerrar conexión idle
  connectionTimeoutMillis: 60000, // 60 segundos para obtener conexión del pool
  ssl: false, // Temporarily disabled for testing
});

/**
 * Prueba la conexión a la base de datos
 * Utilizo esta función al iniciar el servidor para verificar que la BD está disponible.
 * @returns {Promise<boolean>}
 */
export async function testDBConnection() {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * Cierra el pool de conexiones
 * He implementado esta función para permitir un cierre controlado del pool,
 * útil para tests o shutdown graceful del servidor.
 */
export async function closeDBConnection() {
  await pool.end();
}
