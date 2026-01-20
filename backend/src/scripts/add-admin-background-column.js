/**
 * @fileoverview Script para agregar la columna admin_background_image a la tabla settings
 * @module scripts/add-admin-background-column
 */

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Cargar variables de entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../../.env") });

import { pool } from "../config/db.js";
import logger from "../utils/logger.js";

async function addAdminBackgroundColumn() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Verificar si la columna ya existe
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'settings' 
         AND COLUMN_NAME = 'admin_background_image'`
    );

    if (columns.length > 0) {
      logger.info("La columna admin_background_image ya existe en la tabla settings");
      console.log("✓ La columna admin_background_image ya existe");
      return;
    }

    // Agregar la columna
    await connection.query(
      `ALTER TABLE settings 
       ADD COLUMN admin_background_image VARCHAR(255) NULL 
       AFTER background_image`
    );

    logger.info("Columna admin_background_image agregada exitosamente");
    console.log("✓ Columna admin_background_image agregada exitosamente a la tabla settings");
  } catch (error) {
    logger.error("Error al agregar la columna admin_background_image", { error: error.message });
    console.error("✗ Error al agregar la columna:", error.message);
    process.exit(1);
  } finally {
    if (connection) {
      connection.release();
    }
    await pool.end();
  }
}

addAdminBackgroundColumn();

