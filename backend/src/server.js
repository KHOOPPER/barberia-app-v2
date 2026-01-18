/**
 * @fileoverview Punto de entrada del servidor
 * @module server
 * 
 * He implementado este archivo como punto de entrada principal del servidor.
 * Incluye validación de entorno, prueba de conexión a BD y manejo de errores no capturados.
 */

import dotenv from "dotenv";
import app from "./app.js";
import { testDBConnection } from "./config/db.js";
import { validateEnv } from "./config/env.js";
import logger from "./utils/logger.js";

// Cargar variables de entorno
dotenv.config();

/**
 * Función principal para iniciar el servidor
 * Valido las variables de entorno, pruebo la conexión a la BD y luego inicio el servidor.
 */
async function startServer() {
  try {
    // Validar variables de entorno
    validateEnv();

    // Probar conexión a la base de datos
    await testDBConnection();

    // Puerto del servidor
    const PORT = process.env.PORT || 4000;

    // Configurar host según entorno
    // En Render y otros servicios cloud: 0.0.0.0 (necesario para que funcione)
    // En desarrollo local: 0.0.0.0 (permite acceso desde otros dispositivos en la red local)
    // En producción propia: localhost (más seguro, requiere proxy reverso)
    const HOST = process.env.HOST || "0.0.0.0";
    
    app.listen(PORT, HOST, () => {
      logger.info(`Servidor iniciado en ${HOST}:${PORT}`);
      logger.info(`Entorno: ${process.env.NODE_ENV || "development"}`);
      logger.info(`Health check: http://${HOST}:${PORT}/health`);
      logger.info(`API: http://${HOST}:${PORT}/api`);
    });
  } catch (error) {
    logger.error("Error al iniciar el servidor:", error);
    process.exit(1);
  }
}

// Manejo de errores no capturados
// He implementado estos handlers para capturar errores no manejados y
// asegurar que el servidor se cierre de manera controlada
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

// Iniciar servidor
startServer();
