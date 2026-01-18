/**
 * @fileoverview Servicio de lógica de negocio para códigos de descuento
 * @module services/discounts.service
 */

import { pool } from "../config/db.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import logger from "../utils/logger.js";

/**
 * Obtiene todos los códigos de descuento
 */
export const getAllDiscountCodes = async (includeInactive = false) => {
  try {
    let query = "SELECT * FROM discount_codes";
    if (!includeInactive) {
      query += " WHERE is_active = TRUE";
    }
    query += " ORDER BY created_at DESC";

    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    logger.error("Error al obtener códigos de descuento", { error: error.message });
    throw error;
  }
};

/**
 * Obtiene un código de descuento por ID
 */
export const getDiscountCodeById = async (id) => {
  try {
    const result = await pool.query("SELECT * FROM discount_codes WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      throw new NotFoundError("Código de descuento no encontrado");
    }
    return result.rows[0];
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error("Error al obtener código de descuento", { error: error.message, id });
    throw error;
  }
};

/**
 * Obtiene un código de descuento por código
 */
export const getDiscountCodeByCode = async (code) => {
  try {
    const result = await pool.query(
      "SELECT * FROM discount_codes WHERE code = $1 AND is_active = TRUE",
      [code.toUpperCase()]
    );
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  } catch (error) {
    logger.error("Error al obtener código de descuento por código", { error: error.message, code });
    throw error;
  }
};

/**
 * Valida y aplica un código de descuento
 */
export const validateDiscountCode = async (code, totalAmount) => {
  try {
    // Validar que totalAmount esté en un rango razonable (0 - 999999.99)
    // Esto previene overflow en cálculos
    const MAX_AMOUNT = 999999.99;
    const MIN_AMOUNT = 0;

    if (typeof totalAmount !== "number" || isNaN(totalAmount)) {
      throw new ValidationError("El monto total debe ser un número válido");
    }

    if (totalAmount < MIN_AMOUNT || totalAmount > MAX_AMOUNT) {
      throw new ValidationError(
        `El monto total debe estar entre $${MIN_AMOUNT.toFixed(2)} y $${MAX_AMOUNT.toFixed(2)}`
      );
    }

    const discountCode = await getDiscountCodeByCode(code);

    if (!discountCode) {
      throw new ValidationError("Código de descuento no válido");
    }

    // Verificar fechas
    const now = new Date();
    if (discountCode.start_date && new Date(discountCode.start_date) > now) {
      throw new ValidationError("El código de descuento aún no está activo");
    }
    if (discountCode.end_date && new Date(discountCode.end_date) < now) {
      throw new ValidationError("El código de descuento ha expirado");
    }

    // Verificar compra mínima
    if (totalAmount < discountCode.min_purchase) {
      throw new ValidationError(
        `El código requiere una compra mínima de $${discountCode.min_purchase.toFixed(2)}`
      );
    }

    // Verificar límite de usos
    if (discountCode.usage_limit !== null && discountCode.usage_count >= discountCode.usage_limit) {
      throw new ValidationError("El código de descuento ha alcanzado su límite de usos");
    }

    // Calcular descuento
    let discountAmount = 0;
    if (discountCode.discount_type === "percentage") {
      discountAmount = (totalAmount * discountCode.discount_value) / 100;
      if (discountCode.max_discount !== null && discountAmount > discountCode.max_discount) {
        discountAmount = discountCode.max_discount;
      }
    } else {
      discountAmount = discountCode.discount_value;
      if (discountAmount > totalAmount) {
        discountAmount = totalAmount;
      }
    }

    // Validar que el descuento calculado esté en un rango razonable
    if (discountAmount < 0 || discountAmount > MAX_AMOUNT) {
      throw new ValidationError("Error al calcular el descuento. Por favor, contacta al administrador.");
    }

    // Calcular monto final y validar
    const finalAmount = totalAmount - discountAmount;
    if (finalAmount < 0 || finalAmount > MAX_AMOUNT) {
      throw new ValidationError("Error al calcular el monto final. Por favor, contacta al administrador.");
    }

    return {
      ...discountCode,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      finalAmount: parseFloat(finalAmount.toFixed(2)),
    };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    logger.error("Error al validar código de descuento", { error: error.message, code });
    throw error;
  }
};

/**
 * Crea un nuevo código de descuento
 */
export const createDiscountCode = async (discountData) => {
  const {
    code,
    description,
    discount_type,
    discount_value,
    min_purchase = 0,
    max_discount = null,
    start_date = null,
    end_date = null,
    usage_limit = null,
    is_active = true,
  } = discountData;

  // Validaciones
  if (!code || !discount_type || !discount_value) {
    throw new ValidationError("Los campos 'code', 'discount_type' y 'discount_value' son requeridos");
  }

  if (discount_value <= 0) {
    throw new ValidationError("El valor del descuento debe ser mayor a 0");
  }

  if (discount_type === "percentage" && discount_value > 100) {
    throw new ValidationError("El porcentaje de descuento no puede ser mayor a 100");
  }

  if (start_date && end_date && new Date(start_date) > new Date(end_date)) {
    throw new ValidationError("La fecha de inicio debe ser anterior a la fecha de fin");
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Verificar si ya existe
    const existing = await client.query(
      "SELECT id FROM discount_codes WHERE code = $1",
      [code.toUpperCase()]
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      throw new ValidationError("Ya existe un código de descuento con ese código");
    }

    // Insertar código
    const query = `
      INSERT INTO discount_codes (
        code, description, discount_type, discount_value,
        min_purchase, max_discount, start_date, end_date,
        usage_limit, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `;

    const result = await client.query(query, [
      code.toUpperCase(),
      description || null,
      discount_type,
      discount_value,
      min_purchase,
      max_discount,
      start_date || null,
      end_date || null,
      usage_limit,
      is_active,
    ]);

    await client.query('COMMIT');

    const discountCode = await getDiscountCodeById(result.rows[0].id);
    logger.info(`Código de descuento creado: ${code}`);
    return discountCode;
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    logger.error("Error al crear código de descuento", { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Actualiza un código de descuento
 */
export const updateDiscountCode = async (id, discountData) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Verificar que existe
    const existing = await client.query(
      "SELECT id FROM discount_codes WHERE id = $1 FOR UPDATE",
      [id]
    );
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new NotFoundError("Código de descuento no encontrado");
    }

    // Construir query dinámico
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (discountData.code !== undefined) {
      // Verificar que no exista otro código con el mismo nombre
      const duplicate = await client.query(
        "SELECT id FROM discount_codes WHERE code = $1 AND id != $2",
        [discountData.code.toUpperCase(), id]
      );
      if (duplicate.rows.length > 0) {
        await client.query('ROLLBACK');
        throw new ValidationError("Ya existe otro código de descuento con ese código");
      }
      updates.push(`code = $${paramIndex++}`);
      params.push(discountData.code.toUpperCase());
    }

    if (discountData.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(discountData.description || null);
    }

    if (discountData.discount_type !== undefined) {
      updates.push(`discount_type = $${paramIndex++}`);
      params.push(discountData.discount_type);
    }

    if (discountData.discount_value !== undefined) {
      if (discountData.discount_value <= 0) {
        await client.query('ROLLBACK');
        throw new ValidationError("El valor del descuento debe ser mayor a 0");
      }
      updates.push(`discount_value = $${paramIndex++}`);
      params.push(discountData.discount_value);
    }

    if (discountData.min_purchase !== undefined) {
      updates.push(`min_purchase = $${paramIndex++}`);
      params.push(discountData.min_purchase);
    }

    if (discountData.max_discount !== undefined) {
      updates.push(`max_discount = $${paramIndex++}`);
      params.push(discountData.max_discount);
    }

    if (discountData.start_date !== undefined) {
      updates.push(`start_date = $${paramIndex++}`);
      params.push(discountData.start_date || null);
    }

    if (discountData.end_date !== undefined) {
      updates.push(`end_date = $${paramIndex++}`);
      params.push(discountData.end_date || null);
    }

    if (discountData.usage_limit !== undefined) {
      updates.push(`usage_limit = $${paramIndex++}`);
      params.push(discountData.usage_limit);
    }

    if (discountData.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(discountData.is_active);
    }

    if (updates.length === 0) {
      await client.query('ROLLBACK');
      throw new ValidationError("No hay campos para actualizar");
    }

    params.push(id);
    const query = `UPDATE discount_codes SET ${updates.join(", ")} WHERE id = $${paramIndex}`;

    await client.query(query, params);
    await client.query('COMMIT');

    const discountCode = await getDiscountCodeById(id);
    logger.info(`Código de descuento actualizado: ${id}`);
    return discountCode;
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    logger.error("Error al actualizar código de descuento", { error: error.message, id });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Elimina un código de descuento (soft delete)
 */
export const deleteDiscountCode = async (id) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await client.query("SELECT id FROM discount_codes WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new NotFoundError("Código de descuento no encontrado");
    }

    // Hard delete
    await client.query("DELETE FROM discount_codes WHERE id = $1", [id]);

    await client.query('COMMIT');
    logger.info(`Código de descuento eliminado: ${id}`);
    return { id, deleted: true };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error("Error al eliminar código de descuento", { error: error.message, id });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Incrementa el contador de usos de un código de descuento
 */
export const incrementDiscountUsage = async (id) => {
  try {
    await pool.query(
      "UPDATE discount_codes SET usage_count = usage_count + 1 WHERE id = $1",
      [id]
    );
  } catch (error) {
    logger.error("Error al incrementar uso de código de descuento", { error: error.message, id });
    throw error;
  }
};







