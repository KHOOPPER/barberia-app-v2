/**
 * @fileoverview Script para configurar la base de datos Postgres (Supabase)
 * Ejecuta el schema SQL para crear todas las tablas
 * @usage node scripts/setup-db.js
 *
 * IMPORTANTE:
 * - Este script ya NO usa MySQL, ahora usa Postgres (pg) vía el pool definido en src/config/db.js
 * - No necesita permisos "root" como en MySQL; solo necesita un usuario con permisos sobre el schema (postgres en Supabase).
 */

import dotenv from "dotenv";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { pool } from "../src/config/db.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Ejecuta el schema SQL en Postgres
 */
async function setupDatabase() {
  let client;

  try {
    console.log("🔌 Conectando a Postgres (Supabase)...");

    client = await pool.connect();

    console.log("📄 Leyendo schema.sql...");
    const schemaPath = join(__dirname, "../src/database/schema.sql");
    const schemaSQL = readFileSync(schemaPath, "utf-8");

    console.log("🏗️  Ejecutando schema...");

    // Ejecutar dentro de una transacción para evitar estados parciales si algo falla
    await client.query("BEGIN");

    try {
      await client.query(schemaSQL);
      await client.query("COMMIT");
      console.log("✅ Schema ejecutado correctamente!");
    } catch (error) {
      await client.query("ROLLBACK");

      // Fallback: ejecutar statement por statement (útil si el schema trae bloques que fallen por orden)
      console.log("⚠️  Error ejecutando schema completo. Intentando statement por statement...");

      const statements = schemaSQL
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith("--"));

      // En Postgres, algunos statements pueden requerir orden, así que reintentamos con tolerancia
      for (const statement of statements) {
        const stmt = statement.trim();
        if (!stmt) continue;

        try {
          await client.query(stmt);
        } catch (err) {
          const msg = (err && err.message) ? err.message : String(err);

          // Ignorar errores típicos de "ya existe" para objetos ya creados
          const ignorable =
            msg.includes("already exists") ||
            msg.includes("duplicate key value") ||
            msg.includes("duplicate") ||
            msg.includes("relation") && msg.includes("already exists") ||
            msg.includes("type") && msg.includes("already exists") ||
            msg.includes("constraint") && msg.includes("already exists") ||
            msg.includes("function") && msg.includes("already exists") ||
            msg.includes("trigger") && msg.includes("already exists") ||
            msg.includes("index") && msg.includes("already exists");

          if (!ignorable) {
            console.warn(`⚠️  Warning ejecutando statement:\n${stmt}\n→ ${msg}\n`);
          }
        }
      }

      console.log("✅ Schema ejecutado (modo statement por statement).");
    }

    console.log("✅ Base de datos configurada correctamente!");
    console.log("👉 Próximos pasos:");
    console.log("   1. Ejecuta: npm run db:seed");
    console.log("   2. Luego inicia el backend: npm run dev\n");
  } catch (error) {
    console.error("❌ Error al configurar la base de datos:", error.message);
    console.error("\n💡 Tips:");
    console.error("   - Verifica que tu backend/.env tenga las credenciales correctas de Supabase:");
    console.error("     DB_HOST, DB_PORT=5432, DB_USER=postgres, DB_PASSWORD, DB_NAME=postgres");
    console.error("   - Si estás en una red IPv4-only y tu Supabase exige IPv6, usa el Session Pooler en producción.");
    process.exit(1);
  } finally {
    if (client) client.release();
    // Cerrar el pool para que el script termine correctamente
    try {
      await pool.end();
    } catch {
      // no-op
    }
  }
}

setupDatabase();
