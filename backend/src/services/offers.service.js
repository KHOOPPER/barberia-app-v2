/**
 * @fileoverview Servicio de lógica de negocio para ofertas
 * @module services/offers.service
 */

import { pool } from "../config/db.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import logger from "../utils/logger.js";
import { DEFAULT_OFFER_IMAGE_URL } from "../constants/imageDefaults.js";

/**
 * Obtiene todas las ofertas (solo activas para público)
 */
export const getAllOffers = async (includeInactive = false) => {
  try {
    let query = "SELECT * FROM offers";
    if (!includeInactive) {
      query += " WHERE is_active = TRUE";
    }
    query += " ORDER BY created_at DESC";

    const result = await pool.query(query);
    const rows = result.rows;

    // Aplicar imagen genérica por defecto si no hay image_url
    return rows.map(offer => ({
      ...offer,
      image_url: offer.image_url || DEFAULT_OFFER_IMAGE_URL
    }));
  } catch (error) {
    logger.error("Error al obtener ofertas", { error: error.message });
    throw error;
  }
};

/**
 * Obtiene una oferta por ID
 */
export const getOfferById = async (id) => {
  try {
    const result = await pool.query("SELECT * FROM offers WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError("Oferta no encontrada");
    }

    const offer = result.rows[0];
    // Aplicar imagen genérica por defecto si no hay image_url
    return {
      ...offer,
      image_url: offer.image_url || DEFAULT_OFFER_IMAGE_URL
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error("Error al obtener oferta", { error: error.message });
    throw error;
  }
};

/**
 * Crea una nueva oferta
 */
export const createOffer = async (offerData) => {
  const {
    id,
    name,
    description,
    discount_percentage,
    discount_amount,
    original_price,
    final_price,
    image_url,
    start_date,
    end_date,
    is_active,
  } = offerData;

  // Validaciones
  if (!id || !name || final_price === undefined) {
    throw new ValidationError("Los campos 'id', 'name' y 'final_price' son requeridos");
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

  if (final_price < 0) {
    throw new ValidationError("El precio final no puede ser negativo");
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
    const existing = await client.query("SELECT id FROM offers WHERE id = $1", [id]);
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      throw new ValidationError("Ya existe una oferta con ese ID");
    }

    // Insertar nueva oferta
    await client.query(
      `INSERT INTO offers (
        id, name, description, discount_percentage, discount_amount,
        original_price, final_price, image_url, start_date, end_date, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        name,
        description || null,
        discount_percentage || null,
        discount_amount || null,
        original_price || null,
        final_price,
        image_url || null,
        start_date || null,
        end_date || null,
        is_active !== undefined ? is_active : true,
      ]
    );

    await client.query("COMMIT");

    // Obtener la oferta creada
    const created = await client.query("SELECT * FROM offers WHERE id = $1", [id]);
    logger.info(`Oferta creada: ${id}`);
    return created.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof ValidationError) {
      throw error;
    }
    logger.error("Error al crear oferta", { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Actualiza una oferta existente
 */
export const updateOffer = async (id, offerData) => {
  const {
    name,
    description,
    discount_percentage,
    discount_amount,
    original_price,
    final_price,
    image_url,
    start_date,
    end_date,
    is_active,
  } = offerData;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Verificar que existe
    const existing = await client.query("SELECT * FROM offers WHERE id = $1 FOR UPDATE", [id]);
    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new NotFoundError("Oferta no encontrada");
    }

    // Construir query de actualización dinámicamente
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      if (name.length > 100) {
        await client.query("ROLLBACK");
        throw new ValidationError("El nombre no puede tener más de 100 caracteres");
      }
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }

    if (description !== undefined) {
      if (description && description.length > 5000) {
        await client.query("ROLLBACK");
        throw new ValidationError("La descripción no puede exceder 5000 caracteres");
      }
      updates.push(`description = $${paramIndex++}`);
      values.push(description || null);
    }

    if (discount_percentage !== undefined) {
      updates.push(`discount_percentage = $${paramIndex++}`);
      values.push(discount_percentage || null);
    }

    if (discount_amount !== undefined) {
      updates.push(`discount_amount = $${paramIndex++}`);
      values.push(discount_amount || null);
    }

    if (original_price !== undefined) {
      updates.push(`original_price = $${paramIndex++}`);
      values.push(original_price || null);
    }

    if (final_price !== undefined) {
      if (final_price < 0) {
        await client.query("ROLLBACK");
        throw new ValidationError("El precio final no puede ser negativo");
      }
      updates.push(`final_price = $${paramIndex++}`);
      values.push(final_price);
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
      values.push(image_url || null);
    }

    if (start_date !== undefined) {
      updates.push(`start_date = $${paramIndex++}`);
      values.push(start_date || null);
    }

    if (end_date !== undefined) {
      updates.push(`end_date = $${paramIndex++}`);
      values.push(end_date || null);
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      await client.query("ROLLBACK");
      return existing.rows[0];
    }

    values.push(id);

    await client.query(
      `UPDATE offers SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
      values
    );

    await client.query("COMMIT");

    // Obtener la oferta actualizada
    const updated = await client.query("SELECT * FROM offers WHERE id = $1", [id]);
    logger.info(`Oferta actualizada: ${id}`);
    return updated.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    logger.error("Error al actualizar oferta", { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Elimina una oferta (soft delete)
 */
export const deleteOffer = async (id) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query("SELECT * FROM offers WHERE id = $1 FOR UPDATE", [id]);
    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new NotFoundError("Oferta no encontrada");
    }
    await client.query("DELETE FROM offers WHERE id = $1", [id]);
    await client.query("COMMIT");
    logger.info(`Oferta eliminada (hard delete): ${id}`);
    return existing.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error("Error al eliminar oferta", { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};
