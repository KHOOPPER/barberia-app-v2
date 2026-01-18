/**
 * @fileoverview Servicio de lógica de negocio para barberos
 * @module services/barbers.service
 */

import { pool } from "../config/db.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import logger from "../utils/logger.js";
import { DEFAULT_BARBER_IMAGE_URL } from "../constants/imageDefaults.js";

/**
 * Obtiene todos los barberos (incluye inactivos para admin)
 */
export const getAllBarbers = async (includeInactive = false) => {
  try {
    let query = "SELECT * FROM barbers";
    if (!includeInactive) {
      query += " WHERE is_active = TRUE";
    }
    query += " ORDER BY name";

    const result = await pool.query(query);
    const rows = result.rows;

    // Aplicar imagen genérica por defecto si no hay image_url
    return rows.map(barber => ({
      ...barber,
      image_url: barber.image_url || DEFAULT_BARBER_IMAGE_URL
    }));
  } catch (error) {
    logger.error("Error al obtener barberos", { error: error.message });
    throw error;
  }
};

/**
 * Obtiene un barbero por ID
 */
export const getBarberById = async (id) => {
  try {
    const result = await pool.query("SELECT * FROM barbers WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError("Barbero no encontrado");
    }

    const barber = result.rows[0];
    // Aplicar imagen genérica por defecto si no hay image_url
    return {
      ...barber,
      image_url: barber.image_url || DEFAULT_BARBER_IMAGE_URL
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error("Error al obtener barbero", { error: error.message });
    throw error;
  }
};

/**
 * Crea un nuevo barbero
 */
export const createBarber = async (barberData) => {
  const { id, name, specialty, experience, image_url, is_active } = barberData;

  // Validaciones
  if (!id || !name) {
    throw new ValidationError("Los campos 'id' y 'name' son requeridos");
  }

  if (id.length > 10) {
    throw new ValidationError("El ID no puede tener más de 10 caracteres");
  }

  if (name.length > 100) {
    throw new ValidationError("El nombre no puede tener más de 100 caracteres");
  }

  // Validar image_url para prevenir SSRF
  if (image_url) {
    const { isValidImageUrl } = await import("../utils/validators.js");
    if (!isValidImageUrl(image_url)) {
      throw new ValidationError("URL de imagen inválida o no permitida");
    }
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Verificar si ya existe
    const existing = await client.query("SELECT id FROM barbers WHERE id = $1", [id]);
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      throw new ValidationError("Ya existe un barbero con ese ID");
    }

    // Insertar barbero
    const query = `
      INSERT INTO barbers (id, name, specialty, experience, image_url, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await client.query(query, [
      id,
      name,
      specialty || null,
      experience || null,
      image_url || null,
      is_active !== undefined ? is_active : true,
    ]);

    await client.query("COMMIT");

    // Obtener el barbero creado
    const barber = await getBarberById(id);
    logger.info(`Barbero creado: ${id}`);
    return barber;
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    logger.error("Error al crear barbero", { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Actualiza un barbero
 */
export const updateBarber = async (id, barberData) => {
  const { name, specialty, experience, image_url, is_active } = barberData;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Verificar que existe
    const existing = await client.query("SELECT id FROM barbers WHERE id = $1 FOR UPDATE", [id]);
    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new NotFoundError("Barbero no encontrado");
    }

    // Construir query dinámico
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      if (name.length > 100) {
        await client.query("ROLLBACK");
        throw new ValidationError("El nombre no puede tener más de 100 caracteres");
      }
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }

    if (specialty !== undefined) {
      if (specialty && specialty.length > 150) {
        await client.query("ROLLBACK");
        throw new ValidationError("La especialidad no puede exceder 150 caracteres");
      }
      updates.push(`specialty = $${paramIndex++}`);
      params.push(specialty || null);
    }

    if (experience !== undefined) {
      updates.push(`experience = $${paramIndex++}`);
      params.push(experience || null);
    }

    if (image_url !== undefined) {
      // Validar image_url para prevenir SSRF
      if (image_url) {
        const { isValidImageUrl } = await import("../utils/validators.js");
        if (!isValidImageUrl(image_url)) {
          await client.query("ROLLBACK");
          throw new ValidationError("URL de imagen inválida o no permitida");
        }
      }
      updates.push(`image_url = $${paramIndex++}`);
      params.push(image_url || null);
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(is_active);
    }

    if (updates.length === 0) {
      await client.query("ROLLBACK");
      throw new ValidationError("No hay campos para actualizar");
    }

    params.push(id);
    const query = `UPDATE barbers SET ${updates.join(", ")} WHERE id = $${paramIndex}`;

    await client.query(query, params);
    await client.query("COMMIT");

    const barber = await getBarberById(id);
    logger.info(`Barbero actualizado: ${id}`);
    return barber;
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    logger.error("Error al actualizar barbero", { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Elimina un barbero (soft delete: marca como inactivo)
 */
export const deleteBarber = async (id) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Verificar que existe
    const existing = await client.query("SELECT * FROM barbers WHERE id = $1 FOR UPDATE", [id]);
    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new NotFoundError("Barbero no encontrado");
    }

    // Hard delete en cascada: eliminar reservas primero
    await client.query("DELETE FROM reservations WHERE barber_id = $1", [id]);

    // Eliminar barbero
    await client.query("DELETE FROM barbers WHERE id = $1", [id]);

    await client.query("COMMIT");

    logger.info(`Barbero eliminado (hard delete): ${id}`);
    return existing.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error("Error al eliminar barbero", { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};
