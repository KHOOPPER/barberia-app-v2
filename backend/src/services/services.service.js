/**
 * @fileoverview Servicio de lógica de negocio para servicios
 * @module services/services.service
 */

import { pool } from "../config/db.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import logger from "../utils/logger.js";
import { DEFAULT_SERVICE_IMAGE_URL } from "../constants/imageDefaults.js";

/**
 * Obtiene todos los servicios
 */
export const getAllServices = async (includeInactive = false) => {
  try {
    let query = "SELECT * FROM services";
    // DEBUG: Force includeInactive
    // if (!includeInactive) {
    //   query += " WHERE is_active = TRUE";
    if (!includeInactive) {
      query += " WHERE is_active = TRUE";
    }
    query += " ORDER BY name";

    const result = await pool.query(query);
    const rows = result.rows;

    // Aplicar imagen genérica por defecto si no hay image_url
    return rows.map(service => ({
      ...service,
      image_url: service.image_url || DEFAULT_SERVICE_IMAGE_URL
    }));
  } catch (error) {
    logger.error("Error al obtener servicios", { error: error.message });
    throw error;
  }
};

/**
 * Obtiene un servicio por ID
 */
export const getServiceById = async (id) => {
  try {
    const result = await pool.query("SELECT * FROM services WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError("Servicio no encontrado");
    }

    const service = result.rows[0];
    // Aplicar imagen genérica por defecto si no hay image_url
    return {
      ...service,
      image_url: service.image_url || DEFAULT_SERVICE_IMAGE_URL
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error("Error al obtener servicio", { error: error.message });
    throw error;
  }
};

/**
 * Crea un nuevo servicio
 */
export const createService = async (serviceData) => {
  const { id, name, description, price, duration, category, image_url } = serviceData;

  // Validaciones
  if (!id || !name || price === undefined || !duration) {
    throw new ValidationError("Los campos 'id', 'name', 'price' y 'duration' son requeridos");
  }

  if (id.length > 10) {
    throw new ValidationError("El ID no puede tener más de 10 caracteres");
  }

  if (name.length > 100) {
    throw new ValidationError("El nombre no puede tener más de 100 caracteres");
  }

  // Validar longitud máxima de description (5000 caracteres para TEXT)
  if (description && description.length > 5000) {
    throw new ValidationError("La descripción no puede exceder 5000 caracteres");
  }

  // Validar longitud máxima de category (50 caracteres según schema)
  if (category && category.length > 50) {
    throw new ValidationError("La categoría no puede exceder 50 caracteres");
  }

  if (price < 0) {
    throw new ValidationError("El precio no puede ser negativo");
  }

  if (duration <= 0) {
    throw new ValidationError("La duración debe ser mayor a 0");
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
    const existing = await client.query("SELECT id FROM services WHERE id = $1", [id]);
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      throw new ValidationError("Ya existe un servicio con ese ID");
    }

    // Insertar servicio (activo por defecto)
    const query = `
      INSERT INTO services (id, name, description, price, duration, category, image_url, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
    `;

    await client.query(query, [
      id,
      name,
      description || null,
      price,
      duration,
      category || null,
      image_url || null,
    ]);

    await client.query("COMMIT");

    // Obtener el servicio creado
    const service = await getServiceById(id);
    logger.info(`Servicio creado: ${id}`);
    return service;
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    logger.error("Error al crear servicio", { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Actualiza un servicio
 */
export const updateService = async (id, serviceData) => {
  const { name, description, price, duration, category, image_url } = serviceData;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Verificar que existe
    const existing = await client.query("SELECT id FROM services WHERE id = $1 FOR UPDATE", [id]);
    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new NotFoundError("Servicio no encontrado");
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

    if (description !== undefined) {
      if (description && description.length > 5000) {
        await client.query("ROLLBACK");
        throw new ValidationError("La descripción no puede exceder 5000 caracteres");
      }
      updates.push(`description = $${paramIndex++}`);
      params.push(description || null);
    }

    if (category !== undefined) {
      if (category && category.length > 50) {
        await client.query("ROLLBACK");
        throw new ValidationError("La categoría no puede exceder 50 caracteres");
      }
      updates.push(`category = $${paramIndex++}`);
      params.push(category || null);
    }

    if (price !== undefined) {
      if (price < 0) {
        await client.query("ROLLBACK");
        throw new ValidationError("El precio no puede ser negativo");
      }
      updates.push(`price = $${paramIndex++}`);
      params.push(price);
    }

    if (duration !== undefined) {
      if (duration <= 0) {
        await client.query("ROLLBACK");
        throw new ValidationError("La duración debe ser mayor a 0");
      }
      updates.push(`duration = $${paramIndex++}`);
      params.push(duration);
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

    if (updates.length === 0) {
      await client.query("ROLLBACK");
      throw new ValidationError("No hay campos para actualizar");
    }

    params.push(id);
    const query = `UPDATE services SET ${updates.join(", ")} WHERE id = $${paramIndex}`;

    await client.query(query, params);
    await client.query("COMMIT");

    const service = await getServiceById(id);
    logger.info(`Servicio actualizado: ${id}`);
    return service;
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    logger.error("Error al actualizar servicio", { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Elimina un servicio
 */
export const deleteService = async (id) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Verificar que existe
    const existing = await client.query("SELECT * FROM services WHERE id = $1 FOR UPDATE", [id]);
    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new NotFoundError("Servicio no encontrado");
    }

    // Eliminar reservas asociadas (Hard Delete en cascada)
    await client.query("DELETE FROM reservations WHERE service_id = $1", [id]);

    // Eliminar servicio
    await client.query("DELETE FROM services WHERE id = $1", [id]);

    await client.query("COMMIT");

    logger.info(`Servicio eliminado: ${id}`);
    return existing.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    logger.error("Error al eliminar servicio", { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};
