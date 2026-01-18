/**
 * @fileoverview Servicio de lógica de negocio para productos
 * @module services/products.service
 */

import { pool } from "../config/db.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import logger from "../utils/logger.js";
import { DEFAULT_PRODUCT_IMAGE_URL } from "../constants/imageDefaults.js";

/**
 * Obtiene todos los productos (solo activos para público)
 */
export const getAllProducts = async (includeInactive = false, publicOnly = false) => {
  try {
    let query = "SELECT * FROM products";
    const conditions = [];

    if (publicOnly) {
      // Para público: solo productos activos, activos en página Y con stock disponible
      // Si is_active_page es NULL (productos antiguos), no se muestran
      // Si stock es NULL, se permite (producto ilimitado)
      // Si stock está definido, debe be > 0
      conditions.push("is_active = TRUE");
      conditions.push("is_active_page = TRUE");
      conditions.push("(stock IS NULL OR stock > 0)"); // Productos ilimitados o con stock disponible
    } else if (!includeInactive) {
      // Para facturación/admin: solo productos activos (sin filtrar por página)
      // Esto permite facturar todos los productos activos, no solo los de la página
      conditions.push("is_active = TRUE");
    }
    // Si includeInactive es true, no agregamos condiciones (muestra todos)

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY created_at DESC";

    const result = await pool.query(query);
    const rows = result.rows;

    // Aplicar imagen genérica por defecto si no hay image_url
    return rows.map(product => ({
      ...product,
      image_url: product.image_url || DEFAULT_PRODUCT_IMAGE_URL
    }));
  } catch (error) {
    logger.error("Error al obtener productos", { error: error.message });
    throw error;
  }
};

/**
 * Obtiene el conteo total de productos
 */
export const getProductsCount = async () => {
  try {
    const result = await pool.query("SELECT COUNT(*) as count FROM products");
    return parseInt(result.rows[0]?.count) || 0;
  } catch (error) {
    logger.error("Error al contar productos", { error: error.message });
    throw error;
  }
};

/**
 * Obtiene el conteo de productos activos en página
 */
export const getActivePageProductsCount = async () => {
  try {
    const result = await pool.query("SELECT COUNT(*) as count FROM products WHERE is_active_page = TRUE");
    return parseInt(result.rows[0]?.count) || 0;
  } catch (error) {
    logger.error("Error al contar productos activos en página", { error: error.message });
    throw error;
  }
};

/**
 * Obtiene un producto por ID
 */
export const getProductById = async (id) => {
  try {
    const result = await pool.query("SELECT * FROM products WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError("Producto no encontrado");
    }

    const product = result.rows[0];
    // Aplicar imagen genérica por defecto si no hay image_url
    return {
      ...product,
      image_url: product.image_url || DEFAULT_PRODUCT_IMAGE_URL
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error("Error al obtener producto", { error: error.message, id });
    throw error;
  }
};

/**
 * Crea un nuevo producto
 */
export const createProduct = async (productData) => {
  const {
    id,
    name,
    description,
    type,
    price,
    image_url,
    stock,
    min_stock,
    is_active,
    is_active_page,
  } = productData;

  // Validaciones
  if (!id || !name || price === undefined) {
    throw new ValidationError("Los campos 'id', 'name' y 'price' son requeridos");
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

  // Validar longitud máxima de type (150 caracteres según schema)
  if (type && type.length > 150) {
    throw new ValidationError("El tipo no puede exceder 150 caracteres");
  }

  if (price < 0) {
    throw new ValidationError("El precio no puede ser negativo");
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

    // Verificar límite de 25 productos
    const countResult = await client.query("SELECT COUNT(*) as count FROM products");
    const totalCount = parseInt(countResult.rows[0]?.count) || 0;
    if (totalCount >= 25) {
      await client.query("ROLLBACK");
      throw new ValidationError("Se ha alcanzado el límite máximo de 25 productos");
    }

    // Verificar si ya existe
    const existing = await client.query("SELECT id FROM products WHERE id = $1", [id]);
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      throw new ValidationError("Ya existe un producto con ese ID");
    }

    // Si el stock es 0 o menor, desactivar automáticamente de la página pública
    const finalStock = stock !== undefined ? stock : null;
    const shouldAutoDeactivate = finalStock !== null && finalStock <= 0;

    // Si el stock es 0, desactivar automáticamente is_active_page
    let finalIsActivePage = is_active_page;
    if (shouldAutoDeactivate) {
      finalIsActivePage = false;
      logger.info(`Producto ${id}: Stock en ${finalStock}, desactivando automáticamente de página pública`);
    }

    // Validar límite de 8 productos activos en página
    if (finalIsActivePage) {
      const activePageCount = await client.query(
        "SELECT COUNT(*) as count FROM products WHERE is_active_page = TRUE"
      );
      const activePageProducts = parseInt(activePageCount.rows[0]?.count) || 0;
      if (activePageProducts >= 8) {
        await client.query("ROLLBACK");
        throw new ValidationError("Espacios en la sección de página llenos. Máximo 8 productos pueden mostrarse en la página");
      }
    }

    // Insertar nuevo producto
    await client.query(
      `INSERT INTO products (id, name, description, type, price, image_url, stock, min_stock, is_active, is_active_page)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        name,
        description || null,
        type || null,
        price,
        image_url || null,
        finalStock,
        min_stock !== undefined ? min_stock : null,
        is_active !== undefined ? is_active : true,
        finalIsActivePage !== undefined ? finalIsActivePage : false,
      ]
    );

    await client.query("COMMIT");

    const product = await getProductById(id);
    logger.info(`Producto creado: ${id}`);
    return product;
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    logger.error("Error al crear producto", { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Actualiza un producto
 */
export const updateProduct = async (id, productData) => {
  const {
    name,
    description,
    type,
    price,
    image_url,
    stock,
    min_stock,
    is_active,
    is_active_page,
  } = productData;

  // Verificar que el producto existe
  const currentProduct = await getProductById(id);

  // Validaciones
  if (name && name.length > 100) {
    throw new ValidationError("El nombre no puede tener más de 100 caracteres");
  }

  if (price !== undefined && price < 0) {
    throw new ValidationError("El precio no puede ser negativo");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Determinar el stock final (el que se está actualizando o el actual)
    const finalStock = stock !== undefined ? (stock !== null ? stock : null) : (currentProduct.stock !== null && currentProduct.stock !== undefined ? currentProduct.stock : null);
    const shouldAutoDeactivate = finalStock !== null && finalStock <= 0;

    // Si el stock es 0 o menor, forzar is_active_page a false automáticamente
    let finalIsActivePage = is_active_page !== undefined ? is_active_page : currentProduct.is_active_page;
    if (shouldAutoDeactivate) {
      finalIsActivePage = false;
      logger.info(`Producto ${id}: Stock en ${finalStock}, desactivando automáticamente de página pública`);
    }

    // Validar límite de 8 productos activos en página (solo si se está activando después de la validación de stock)
    if (finalIsActivePage === true) {
      // Si el producto actual ya está activo en página, no cuenta
      const currentIsActivePage = currentProduct.is_active_page || false;

      const activePageCount = await client.query(
        "SELECT COUNT(*) as count FROM products WHERE is_active_page = TRUE AND id != $1",
        [id]
      );
      const activePageProducts = parseInt(activePageCount.rows[0]?.count) || 0;

      // Si el producto actual no estaba activo y ahora se quiere activar
      if (!currentIsActivePage && activePageProducts >= 8) {
        await client.query("ROLLBACK");
        throw new ValidationError("Espacios en la sección de página llenos. Máximo 8 productos pueden mostrarse en la página");
      }
    }

    // Construir query dinámicamente
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description || null);
    }
    if (type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      values.push(type || null);
    }
    if (price !== undefined) {
      updates.push(`price = $${paramIndex++}`);
      values.push(price);
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
    if (stock !== undefined) {
      updates.push(`stock = $${paramIndex++}`);
      values.push(stock !== null ? stock : null);
    }
    if (min_stock !== undefined) {
      updates.push(`min_stock = $${paramIndex++}`);
      values.push(min_stock !== null ? min_stock : null);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }
    // Actualizar is_active_page si se especificó explícitamente O si se debe desactivar automáticamente por stock en 0
    if (is_active_page !== undefined || shouldAutoDeactivate) {
      updates.push(`is_active_page = $${paramIndex++}`);
      values.push(finalIsActivePage);
    }

    if (updates.length === 0) {
      await client.query("ROLLBACK");
      throw new ValidationError("No se proporcionaron campos para actualizar");
    }

    values.push(id);

    await client.query(
      `UPDATE products SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex}`,
      values
    );

    await client.query("COMMIT");

    const product = await getProductById(id);
    logger.info(`Producto actualizado: ${id}`);
    return product;
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    logger.error("Error al actualizar producto", { error: error.message, id });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Reduce el stock de un producto y desactiva automáticamente si llega a 0
 * @param {Object} client - Cliente de base de datos (debe estar en transacción)
 * @param {string} productId - ID del producto
 * @param {number} quantity - Cantidad a reducir
 */
export const reduceProductStock = async (client, productId, quantity) => {
  try {
    // Obtener el producto actual con lock para evitar race conditions
    const products = await client.query(
      "SELECT * FROM products WHERE id = $1 FOR UPDATE",
      [productId]
    );

    if (!products || products.rows.length === 0) {
      logger.warn(`Producto ${productId} no encontrado para reducir stock`);
      throw new ValidationError(`Producto ${productId} no encontrado`);
    }

    const product = products.rows[0];

    // Si el producto no tiene stock definido (null), permitir la venta (producto ilimitado)
    if (product.stock === null || product.stock === undefined) {
      logger.info(`Producto ${productId} no tiene stock definido, permitiendo venta ilimitada`);
      return;
    }

    // Validar que haya suficiente stock disponible
    const currentStock = parseInt(product.stock) || 0;
    if (currentStock < quantity) {
      logger.warn(`Stock insuficiente para producto ${productId}: disponible=${currentStock}, solicitado=${quantity}`);
      throw new ValidationError(
        `Stock insuficiente para el producto "${product.name}". Stock disponible: ${currentStock}, solicitado: ${quantity}`
      );
    }

    // Calcular nuevo stock (ya validamos que hay suficiente, así que no puede ser negativo)
    const newStock = currentStock - quantity;

    // Actualizar stock
    await client.query(
      "UPDATE products SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [newStock, productId]
    );

    logger.info(`Stock de producto ${productId} reducido: ${currentStock} -> ${newStock} (cantidad: ${quantity})`);

    // Si el stock llegó a 0 y el producto está activo en página, desactivarlo
    if (newStock <= 0 && product.is_active_page) {
      await client.query(
        "UPDATE products SET is_active_page = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [productId]
      );
      logger.info(`Producto ${productId}: Stock en ${newStock}, desactivando automáticamente de página pública`);
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    logger.error(`Error al reducir stock del producto ${productId}`, { error: error.message });
    throw error;
  }
};

/**
 * Elimina un producto (soft delete)
 */
export const deleteProduct = async (id) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Verificar que existe y bloquear fila
    const existing = await client.query("SELECT * FROM products WHERE id = $1 FOR UPDATE", [id]);
    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new NotFoundError("Producto no encontrado");
    }

    // Hard delete
    await client.query("DELETE FROM products WHERE id = $1", [id]);

    await client.query("COMMIT");

    logger.info(`Producto eliminado (hard delete): ${id}`);
    return { id, deleted: true };
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error("Error al eliminar producto", { error: error.message, id });
    throw error;
  } finally {
    client.release();
  }
};
