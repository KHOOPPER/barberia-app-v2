/**
 * @fileoverview Script para poblar la base de datos Postgres con datos iniciales
 * Ejecuta seed.sql y crea el usuario admin inicial
 * @usage node scripts/seed-db.js
 */

import dotenv from "dotenv";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import bcrypt from "bcryptjs";
import { pool } from "../src/config/db.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Pobla la base de datos con datos iniciales
 */
async function seedDatabase() {
  let client;
  try {
    console.log("Conectando a Postgres...");

    client = await pool.connect();

    // Ejecutar seed.sql
    console.log("Leyendo seed.sql...");
    const seedPath = join(__dirname, "../src/database/seed.sql");
    const seedSQL = readFileSync(seedPath, "utf-8");

    console.log("Ejecutando seed...");

    // Ejecutar statements
    const statements = seedSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await client.query(statement);
        } catch (error) {
          // Ignorar errores de duplicados
          const msg = error?.message || String(error);
          if (!msg.includes("duplicate key value") && !msg.includes("already exists")) {
            console.warn("Warning en statement:", msg);
          }
        }
      }
    }

    // Crear usuario admin directamente
    console.log(`Creando usuario admin...`);

    const adminUsername = process.env.ADMIN_USERNAME || "admin";
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      throw new Error("❌ Error: ADMIN_PASSWORD no está definido en .env. Por favor configúralo.");
    }

    try {
      // Verificar si ya existe
      const checkResult = await client.query(
        "SELECT * FROM users WHERE username = $1",
        [adminUsername]
      );

      if (checkResult.rows.length > 0) {
        console.log("El usuario admin ya existe, omitiendo...");
      } else {
        // Hash del password
        const passwordHash = await bcrypt.hash(adminPassword, 12);

        // Insertar usuario admin
        await client.query(
          "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)",
          [adminUsername, passwordHash, "admin"]
        );

        console.log("✅ Usuario admin creado correctamente con las credenciales del .env");
      }
    } catch (error) {
      console.error("Error al crear usuario admin:", error.message);
      throw error;
    }

    console.log("Base de datos poblada correctamente!");
    console.log("Próximo paso: npm run dev\n");
  } catch (error) {
    console.error("Error al poblar la base de datos:", error.message);
    console.error("\nTip: Asegúrate de haber ejecutado 'npm run db:setup' primero.");
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

seedDatabase();
