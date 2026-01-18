/**
 * @fileoverview Servicio de lógica de negocio para reservas
 * @module services/reservations.service
 */

import { pool } from "../config/db.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import logger from "../utils/logger.js";
import { RESERVATION_STATUS } from "../constants/index.js";

/**
 * Obtiene reservas por fecha (público - para booking)
 * Solo devuelve reservas activas (pendientes o confirmadas, NO canceladas)
 * Estas son las que bloquean horarios disponibles
 */
export const getReservationsByDate = async (date, barberId = null) => {
  try {
    // Obtener solo reservas activas (pendientes o confirmadas, NO canceladas)
    // Estas son las que bloquean horarios disponibles
    let query = `
      SELECT * FROM reservations 
      WHERE date = $1 
        AND status <> $2
    `;
    const params = [date, RESERVATION_STATUS.CANCELLED];

    // Si hay un barbero seleccionado, mostrar reservas de ese barbero o sin barbero específico
    // Si no hay barbero seleccionado, mostrar todas las reservas activas
    if (barberId) {
      query += " AND (barber_id = $3 OR barber_id IS NULL)";
      params.push(barberId);
    }

    const { rows } = await pool.query(query, params);
    logger.debug(`Reservas activas encontradas para ${date}: ${rows.length}`);
    return rows;
  } catch (error) {
    logger.error("Error al obtener reservas por fecha", { error: error.message });
    throw error;
  }
};

/**
 * Crea una nueva reserva con protección contra conflictos de concurrencia
 * Usa transacciones y locks para evitar race conditions
 */
export const createReservation = async (reservationData) => {
  const {
    serviceId,
    serviceLabel,
    barberId,
    date,
    time,
    customerName,
    customerPhone,
  } = reservationData;

  logger.debug("[createReservation Service] Datos recibidos:", {
    serviceId,
    serviceLabel,
    barberId,
    date,
    time,
    customerName,
    customerPhone,
  });

  // Validaciones básicas
  if (!serviceId || !date || !time) {
    throw new ValidationError("Los campos serviceId, date y time son requeridos");
  }

  // Validar formato de fecha (ISO 8601 UTC)
  const { isValidDate, isValidISO8601UTC } = await import("../utils/validators.js");
  if (!isValidDate(date)) {
    throw new ValidationError("La fecha debe tener formato YYYY-MM-DD (ISO 8601)");
  }

  // Validar formato ISO 8601 UTC explícitamente
  if (!isValidISO8601UTC(date)) {
    throw new ValidationError("La fecha debe estar en formato ISO 8601 UTC");
  }

  // Validar formato de hora
  if (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
    throw new ValidationError("La hora debe tener formato HH:MM");
  }

  // Validar serviceLabel si se proporciona (re-validar en servicio)
  if (serviceLabel && serviceLabel.length > 200) {
    throw new ValidationError("El serviceLabel no puede exceder 200 caracteres");
  }

  // Validar que la fecha no sea pasada (solo para reservas reales, no para facturas de solo productos)
  // Las facturas de solo productos pueden tener fecha actual incluso si se crean a última hora
  // Usar UTC consistentemente para evitar problemas de zona horaria
  const isProductsOnlyInvoice = serviceLabel === "Factura - Solo Productos";

  if (!isProductsOnlyInvoice) {
    // Usar UTC para consistencia con isNotPastDate
    const [year, month, day] = date.split("-").map(Number);
    const reservationDate = new Date(Date.UTC(year, month - 1, day));
    const today = new Date();
    const todayUTC = new Date(Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate()
    ));
    if (reservationDate < todayUTC) {
      throw new ValidationError("No se pueden crear reservas para fechas pasadas");
    }
  }

  const connection = await pool.connect();

  try {
    // Iniciar transacción con nivel de aislamiento SERIALIZABLE para máxima protección
    // Esto previene race conditions incluso si dos usuarios reservan al mismo milisegundo
    await connection.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
    await connection.query("BEGIN");

    // Si es una factura de solo productos (serviceLabel = "Factura - Solo Productos"),
    // no validar conflictos de horarios porque no son citas reales
    // (isProductsOnlyInvoice ya está definido arriba)

    if (!isProductsOnlyInvoice) {
      // Verificar conflicto con SELECT FOR UPDATE (lock pesimista)
      // Esto bloquea las filas hasta que termine la transacción
      // Solo excluimos canceladas, las pendientes y confirmadas bloquean
      // Usamos FOR UPDATE para bloquear las filas y prevenir inserción simultánea
      const conflictQuery = `
        SELECT id FROM reservations 
        WHERE date = $1 
          AND time = $2 
          AND barber_id = $3 
          AND status <> $4
          AND service_label != 'Factura - Solo Productos'
        FOR UPDATE
      `;

      const { rows: conflicts } = await connection.query(conflictQuery, [
        date,
        time,
        barberId || null,
        RESERVATION_STATUS.CANCELLED,
      ]);

      if (conflicts.length > 0) {
        await connection.query("ROLLBACK");
        throw new ValidationError(
          "El horario seleccionado ya está ocupado para este barbero. Por favor, selecciona otro horario."
        );
      }

      // Verificar también conflictos sin barbero específico (barber_id IS NULL)
      // si el barbero es null, no puede haber otras reservas en el mismo horario
      if (!barberId) {
        const conflictQueryNoBarber = `
          SELECT id FROM reservations 
          WHERE date = $1 
            AND time = $2 
            AND barber_id IS NULL
            AND status <> $3
            AND service_label != 'Factura - Solo Productos'
          FOR UPDATE
        `;

        const { rows: conflictsNoBarber } = await connection.query(conflictQueryNoBarber, [
          date,
          time,
          RESERVATION_STATUS.CANCELLED,
        ]);

        if (conflictsNoBarber.length > 0) {
          await connection.query("ROLLBACK");
          throw new ValidationError(
            "El horario seleccionado ya está ocupado. Por favor, selecciona otro horario."
          );
        }
      } else {
        // Si hay barbero seleccionado, también verificar conflictos con reservas sin barbero
        // porque una reserva sin barbero específico bloquea todos los barberos
        const conflictQueryWithAnyBarber = `
          SELECT id FROM reservations 
          WHERE date = $1 
            AND time = $2 
            AND barber_id IS NULL
            AND status <> $3
            AND service_label != 'Factura - Solo Productos'
          FOR UPDATE
        `;

        const { rows: conflictsWithAnyBarber } = await connection.query(conflictQueryWithAnyBarber, [
          date,
          time,
          RESERVATION_STATUS.CANCELLED,
        ]);

        if (conflictsWithAnyBarber.length > 0) {
          await connection.query("ROLLBACK");
          throw new ValidationError(
            "El horario seleccionado ya está ocupado. Por favor, selecciona otro horario."
          );
        }
      }
    }

    // 1. Obtener datos para snapshot (barbero y servicio)
    let barber_name = null;
    let service_price = 0;

    // Obtener nombre del barbero si existe
    if (barberId) {
      const { rows: barberRows } = await connection.query(
        "SELECT name FROM barbers WHERE id = $1",
        [barberId]
      );
      if (barberRows.length > 0) {
        barber_name = barberRows[0].name;
      }
    }

    // Obtener precio del servicio
    const { rows: serviceRows } = await connection.query(
      "SELECT name, price FROM services WHERE id = $1",
      [serviceId]
    );
    if (serviceRows.length > 0) {
      service_price = parseFloat(serviceRows[0].price) || 0;
      // Si no hay label, usar el nombre del servicio como snapshot
      if (!serviceLabel) {
        serviceLabel = serviceRows[0].name;
      }
    }

    // Insertar reserva dentro de la transacción
    // Si es factura de solo productos, establecer delivery_status como 'pendiente'
    const insertQuery = `
      INSERT INTO reservations 
        (service_id, service_label, barber_id, barber_name, service_price, date, time, status, customer_name, customer_phone, delivery_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `;

    const { rows: result } = await connection.query(insertQuery, [
      serviceId,
      serviceLabel || null,
      barberId || null,
      barber_name,
      service_price,
      date,
      time,
      RESERVATION_STATUS.PENDING,
      customerName || null,
      customerPhone || null,
      isProductsOnlyInvoice ? 'pendiente' : null,
    ]);

    // Verificar que se insertó correctamente
    if (!result[0]?.id) {
      await connection.query("ROLLBACK");
      throw new Error("No se pudo crear la reserva. Intenta nuevamente.");
    }

    // Obtener la reserva creada
    const { rows } = await connection.query(
      "SELECT * FROM reservations WHERE id = $1",
      [result[0].id]
    );

    if (!rows || rows.length === 0) {
      await connection.query("ROLLBACK");
      throw new Error("La reserva se creó pero no se pudo recuperar. Intenta nuevamente.");
    }

    // Confirmar transacción
    await connection.query("COMMIT");

    logger.info(`Reserva creada exitosamente: ${rows[0].id}`);

    return rows[0];
  } catch (error) {
    // Rollback en caso de error
    await connection.query("ROLLBACK");

    if (error instanceof ValidationError) {
      throw error;
    }

    // Si es un error de clave duplicada o deadlock (race condition detectada)
    if (error.code === "ER_DUP_ENTRY" || error.code === "ER_LOCK_WAIT_TIMEOUT" || error.code === "1213") {
      logger.warn("Intento de crear reserva duplicada o conflicto de concurrencia detectado", {
        code: error.code,
        message: error.message
      });
      throw new ValidationError(
        "El horario seleccionado ya está ocupado. Por favor, selecciona otro horario."
      );
    }

    logger.error("Error al crear reserva", { error: error.message, stack: error.stack });
    throw error;
  } finally {
    // Liberar conexión
    connection.release();
  }
};

/**
 * Obtiene todas las reservas con filtros (admin)
 */
export const getAllReservations = async (filters = {}) => {
  const { date, barberId, status } = filters;

  try {
    let query = `
      SELECT 
        r.*,
        COALESCE(r.service_label, s.name) AS service_name,
        COALESCE(r.service_price, s.price) AS service_price,
        COALESCE(r.barber_name, b.name) AS barber_name,
        r.service_label AS original_service_label
      FROM reservations r
      LEFT JOIN services s ON r.service_id = s.id
      LEFT JOIN barbers b ON r.barber_id = b.id
      WHERE 1 = 1
    `;

    // Nota: Los items adicionales se obtienen por separado con getReservationItems

    const params = [];
    let paramCount = 1;

    // Validar y agregar filtros (todos los valores vienen de parámetros validados)
    if (date) {
      // Validar formato de fecha
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new ValidationError("Formato de fecha inválido");
      }
      query += ` AND r.date = $${paramCount}`;
      params.push(date);
      paramCount++;
    }

    if (barberId) {
      // Validar que barberId sea string alfanumérico (máximo 10 caracteres según schema)
      if (typeof barberId !== "string" || barberId.length > 10 || !/^[a-zA-Z0-9]+$/.test(barberId)) {
        throw new ValidationError("ID de barbero inválido");
      }
      query += ` AND r.barber_id = $${paramCount}`;
      params.push(barberId);
      paramCount++;
    }

    if (status) {
      // Validar que status sea uno de los valores permitidos
      const allowedStatuses = ["pendiente", "confirmada", "cancelada"];
      if (!allowedStatuses.includes(status)) {
        throw new ValidationError("Estado de reserva inválido");
      }
      query += ` AND r.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    // ORDER BY seguro (solo columnas permitidas)
    query += " ORDER BY r.date DESC, r.time DESC, r.id DESC";

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    logger.error("Error al obtener reservas (admin)", { error: error.message });
    throw error;
  }
};

/**
 * Actualiza el estado de una reserva
 */
/**
 * Actualiza el estado de entrega de una factura de productos
 * @param {number} id - ID de la reserva
 * @param {string} deliveryStatus - 'pendiente' o 'entregado'
 */
export const updateDeliveryStatus = async (id, deliveryStatus) => {
  try {
    if (!id) {
      throw new ValidationError("ID de reserva requerido");
    }

    if (deliveryStatus && !['pendiente', 'entregado'].includes(deliveryStatus)) {
      throw new ValidationError("Estado de entrega inválido. Debe ser 'pendiente' o 'entregado'");
    }

    const connection = await pool.connect();

    try {
      // Verificar que la reserva existe y es una factura de solo productos
      const { rows } = await connection.query(
        "SELECT id, service_label FROM reservations WHERE id = $1",
        [id]
      );

      if (!rows || rows.length === 0) {
        throw new ValidationError("Reserva no encontrada");
      }

      const reservation = rows[0];

      // Solo permitir actualizar delivery_status para facturas de solo productos
      if (reservation.service_label !== "Factura - Solo Productos") {
        throw new ValidationError("El estado de entrega solo se puede actualizar para facturas de solo productos");
      }

      // Actualizar el estado de entrega
      const query = "UPDATE reservations SET delivery_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2";
      await connection.query(query, [deliveryStatus, id]);

      // Obtener la reserva actualizada
      const { rows: updatedRows } = await connection.query(
        "SELECT * FROM reservations WHERE id = $1",
        [id]
      );

      logger.info(`Estado de entrega actualizado para reserva ${id}: ${deliveryStatus}`);

      return updatedRows[0];
    } finally {
      connection.release();
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    logger.error("Error al actualizar estado de entrega", { error: error.message, stack: error.stack });
    throw error;
  }
};

export const updateReservationStatus = async (id, status) => {
  // Validar que el estado sea válido
  const validStatuses = [
    RESERVATION_STATUS.PENDING,
    RESERVATION_STATUS.CONFIRMED,
    RESERVATION_STATUS.CANCELLED,
  ];
  if (!validStatuses.includes(status)) {
    throw new ValidationError(`Estado inválido: ${status}`);
  }

  const connection = await pool.connect();

  try {
    await connection.query("BEGIN");

    // Verificar que la reserva existe con FOR UPDATE
    const { rows: existing } = await connection.query(
      "SELECT * FROM reservations WHERE id = $1 FOR UPDATE",
      [id]
    );

    if (!existing || existing.length === 0) {
      await connection.query("ROLLBACK");
      throw new NotFoundError("Reserva no encontrada");
    }

    // Actualizar estado
    const query = "UPDATE reservations SET status = $1 WHERE id = $2";
    const result = await connection.query(query, [status, id]);

    if (result.rowCount === 0) {
      await connection.query("ROLLBACK");
      throw new NotFoundError("No se pudo actualizar la reserva");
    }

    // Obtener la reserva actualizada
    const { rows } = await connection.query(
      "SELECT * FROM reservations WHERE id = $1",
      [id]
    );

    await connection.query("COMMIT");

    logger.info(`Reserva ${id} actualizada a estado: ${status}`);

    return rows[0];
  } catch (error) {
    await connection.query("ROLLBACK");
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    logger.error("Error al actualizar estado de reserva", { error: error.message });
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Actualiza los items de una reserva (para edición de factura)
 */
export const updateReservationItems = async (reservationId, items, discountCodeId = null) => {
  const connection = await pool.connect();

  try {
    await connection.query("BEGIN");

    // Verificar que la reserva existe
    const { rows: existing } = await connection.query(
      "SELECT * FROM reservations WHERE id = $1 FOR UPDATE",
      [reservationId]
    );

    if (!existing || existing.length === 0) {
      await connection.query("ROLLBACK");
      throw new NotFoundError("Reserva no encontrada");
    }

    // Obtener los items anteriores ANTES de eliminarlos para restaurar stock
    const { rows: previousItems } = await connection.query(
      "SELECT * FROM reservation_items WHERE reservation_id = $1 AND item_type = 'product'",
      [reservationId]
    );

    // Eliminar items existentes DESPUÉS de obtenerlos para restaurar stock
    await connection.query(
      "DELETE FROM reservation_items WHERE reservation_id = $1",
      [reservationId]
    );

    // Restaurar stock de productos anteriores (si se está editando)
    if (previousItems && previousItems.length > 0) {
      for (const prevItem of previousItems) {
        // Restaurar el stock que se había reducido
        const prevQuantity = parseInt(prevItem.quantity) || 0;
        if (prevQuantity > 0 && prevItem.item_id) {
          // Obtener el producto actual para sumar el stock
          const { rows: products } = await connection.query(
            "SELECT stock FROM products WHERE id = $1 FOR UPDATE",
            [prevItem.item_id]
          );
          if (products && products.length > 0) {
            const currentStock = products[0].stock !== null ? parseInt(products[0].stock) : null;
            if (currentStock !== null) {
              const newStock = currentStock + prevQuantity;
              await connection.query(
                "UPDATE products SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
                [newStock, prevItem.item_id]
              );
              logger.info(`Stock de producto ${prevItem.item_id} restaurado: ${currentStock} -> ${newStock} (cantidad restaurada: ${prevQuantity})`);
            }
          }
        }
      }
    }

    // Insertar nuevos items y reducir stock de productos
    if (items && items.length > 0) {
      const { reduceProductStock } = await import("./products.service.js");

      for (const item of items) {
        // Validar límites numéricos para prevenir overflow
        const quantity = parseInt(item.quantity) || 1;
        const price = parseFloat(item.price) || 0;

        // Validar que quantity esté en rango válido (1-1000)
        if (quantity < 1 || quantity > 1000) {
          await connection.query("ROLLBACK");
          connection.release();
          throw new ValidationError("La cantidad debe estar entre 1 y 1000");
        }

        // Validar que price esté en rango válido (0-999999.99)
        if (price < 0 || price > 999999.99) {
          await connection.query("ROLLBACK");
          connection.release();
          throw new ValidationError("El precio debe estar entre 0 y 999999.99");
        }

        const subtotal = price * quantity;

        // Validar que subtotal no exceda límite (prevenir overflow)
        if (subtotal > 99999999.99) {
          await connection.query("ROLLBACK");
          connection.release();
          throw new ValidationError("El subtotal excede el límite permitido");
        }

        const discountAmount = parseFloat(item.discountAmount) || 0;

        // Validar que discountAmount no exceda subtotal
        if (discountAmount < 0 || discountAmount > subtotal) {
          await connection.query("ROLLBACK");
          connection.release();
          throw new ValidationError("El descuento no puede ser mayor al subtotal");
        }



        const finalSubtotal = subtotal - discountAmount;

        await connection.query(
          `INSERT INTO reservation_items 
           (reservation_id, item_type, item_id, item_name, quantity, unit_price, discount_code_id, discount_amount, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            reservationId,
            item.type,
            item.itemId,
            item.name,
            quantity,
            price,
            discountCodeId,
            discountAmount,
            finalSubtotal,
          ]
        );

        // Si es un producto, reducir el stock
        if (item.type === 'product' && item.itemId) {
          const quantity = parseInt(item.quantity) || 1;
          await reduceProductStock(connection, item.itemId, quantity);
        }
      }
    }

    // Si se aplicó un descuento, incrementar el contador de usos
    if (discountCodeId) {
      await connection.query(
        "UPDATE discount_codes SET usage_count = usage_count + 1 WHERE id = $1",
        [discountCodeId]
      );
    }

    await connection.query("COMMIT");

    // Obtener los items actualizados
    const { rows: itemsRows } = await connection.query(
      "SELECT * FROM reservation_items WHERE reservation_id = $1",
      [reservationId]
    );

    logger.info(`Items de reserva ${reservationId} actualizados: ${items.length} items`);
    return itemsRows;
  } catch (error) {
    await connection.query("ROLLBACK");
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error("Error al actualizar items de reserva", { error: error.message, reservationId });
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Obtiene los items de una reserva
 */
export const getReservationItems = async (reservationId) => {
  try {
    const { rows } = await pool.query(
      `SELECT 
        ri.*,
        dc.id AS discount_code_id,
        dc.code AS discount_code,
        dc.discount_type,
        dc.discount_value,
        dc.max_discount,
        dc.description AS discount_description
       FROM reservation_items ri
       LEFT JOIN discount_codes dc ON ri.discount_code_id = dc.id
       WHERE ri.reservation_id = $1
       ORDER BY ri.created_at`,
      [reservationId]
    );
    return rows;
  } catch (error) {
    logger.error("Error al obtener items de reserva", { error: error.message, reservationId });
    throw error;
  }
};

/**
 * Elimina una reserva
 */
export const deleteReservation = async (id) => {
  const connection = await pool.connect();

  try {
    await connection.query("BEGIN");

    // Verificar que la reserva existe con FOR UPDATE
    const { rows: rowsBefore } = await connection.query(
      "SELECT * FROM reservations WHERE id = $1 FOR UPDATE",
      [id]
    );

    if (rowsBefore.length === 0) {
      await connection.query("ROLLBACK");
      throw new NotFoundError("Reserva no encontrada");
    }

    // Eliminar reserva
    const query = "DELETE FROM reservations WHERE id = $1";
    const result = await connection.query(query, [id]);

    if (result.rowCount === 0) {
      await connection.query("ROLLBACK");
      throw new NotFoundError("No se pudo eliminar la reserva");
    }

    await connection.query("COMMIT");

    logger.info(`Reserva eliminada: ${id}`);

    return rowsBefore[0];
  } catch (error) {
    await connection.query("ROLLBACK");
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error("Error al eliminar reserva", { error: error.message });
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Crea reservas desde el carrito de compras
 * Para cada item del carrito que tenga bookingData, crea una reserva
 */
export const createReservationsFromCart = async (cartData) => {
  const { cartItems, customerName, customerPhone, discountCodeId = null } = cartData;

  // Validaciones básicas (la validación de entrada ya se hizo en el middleware)
  if (!customerName || !customerPhone) {
    throw new ValidationError("El nombre y teléfono del cliente son requeridos");
  }

  // Validar longitud de nombre (ya validado en middleware, pero doble verificación)
  if (customerName.length < 2 || customerName.length > 100) {
    throw new ValidationError("El nombre debe tener entre 2 y 100 caracteres");
  }

  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    throw new ValidationError("El carrito está vacío");
  }

  // Filtrar solo items con bookingData (servicios/promociones con fecha/hora)
  const itemsWithBooking = cartItems.filter(
    (item) => item.bookingData && (item.type === "service" || item.type === "offer")
  );

  // Determinar si solo hay productos (sin servicios/promociones con reserva)
  const hasOnlyProducts = itemsWithBooking.length === 0 && cartItems.some(item => item.type === 'product');

  const connection = await pool.connect();
  const createdReservations = [];
  const errors = [];
  let mainReservationId = null;

  try {
    await connection.query("BEGIN");

    // Si hay items con reserva, crear las reservas
    if (itemsWithBooking.length > 0) {
      // Crear una reserva por cada item con bookingData
      for (const item of itemsWithBooking) {
        try {
          const { barber, date, time } = item.bookingData;

          // Determinar serviceId y serviceLabel
          let serviceId;
          let serviceLabel;

          if (item.type === "service") {
            serviceId = item.id;
            serviceLabel = item.name;
            // Validar serviceLabel (re-validar en servicio)
            if (serviceLabel && serviceLabel.length > 200) {
              throw new ValidationError("El serviceLabel no puede exceder 200 caracteres");
            }
          } else if (item.type === "offer") {
            // Para ofertas, necesitamos un servicio base
            serviceId = "s1"; // Servicio genérico (debe existir en BD)
            serviceLabel = item.name;
            // Validar serviceLabel (re-validar en servicio)
            if (serviceLabel && serviceLabel.length > 200) {
              throw new ValidationError("El serviceLabel no puede exceder 200 caracteres");
            }
          }

          // Validar que no haya conflicto
          const barberId = barber?.id || null;
          const conflictQuery = barberId
            ? "SELECT id FROM reservations WHERE date = $1 AND time = $2 AND barber_id = $3 AND status <> $4 FOR UPDATE"
            : "SELECT id FROM reservations WHERE date = $1 AND time = $2 AND barber_id IS NULL AND status <> $3 FOR UPDATE";

          const conflictParams = barberId
            ? [date, time, barberId, RESERVATION_STATUS.CANCELLED]
            : [date, time, RESERVATION_STATUS.CANCELLED];

          const { rows: conflicts } = await connection.query(conflictQuery, conflictParams);

          if (conflicts.length > 0) {
            errors.push({
              item: item.name,
              error: "El horario ya está ocupado",
            });
            continue;
          }

          // 1. Obtener datos para snapshot (barbero y servicio)
          let barberSnapshotName = barber?.name || null;
          let serviceSnapshotPrice = 0;

          // Si el nombre del barbero no viene en bookingData, intentar obtenerlo de la BD
          if (!barberSnapshotName && barber?.id) {
            const { rows: bRows } = await connection.query("SELECT name FROM barbers WHERE id = $1", [barber.id]);
            if (bRows.length > 0) barberSnapshotName = bRows[0].name;
          }

          // Obtener datos del servicio
          const { rows: sRows } = await connection.query("SELECT name, price FROM services WHERE id = $1", [serviceId]);
          if (sRows.length > 0) {
            serviceSnapshotPrice = parseFloat(sRows[0].price) || 0;
            if (!serviceLabel) serviceLabel = sRows[0].name;
          }

          // Crear la reserva
          // Si solo hay productos, confirmar automáticamente
          // Si hay servicios/promociones con reserva, dejarla pendiente
          const reservationStatus = hasOnlyProducts
            ? RESERVATION_STATUS.CONFIRMED
            : RESERVATION_STATUS.PENDING;

          const isProductsInvoice = serviceLabel === "Factura - Solo Productos";
          const insertQuery = `
            INSERT INTO reservations
              (service_id, service_label, barber_id, barber_name, service_price, date, time, status, customer_name, customer_phone, delivery_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
          `;

          const { rows: result } = await connection.query(insertQuery, [
            serviceId,
            serviceLabel,
            barber?.id || null,
            barberSnapshotName,
            serviceSnapshotPrice,
            date,
            time,
            reservationStatus,
            customerName,
            customerPhone,
            isProductsInvoice ? 'pendiente' : null,
          ]);

          // Guardar el ID de la primera reserva para agregar todos los items ahí
          if (!mainReservationId && result[0]?.id) {
            mainReservationId = result[0].id;
          }

          // Obtener la reserva creada
          const { rows } = await connection.query(
            "SELECT * FROM reservations WHERE id = $1",
            [result[0].id]
          );

          if (rows && rows.length > 0) {
            createdReservations.push(rows[0]);
          }
        } catch (error) {
          logger.error(`Error al crear reserva para item ${item.name}`, {
            error: error.message,
          });
          errors.push({
            item: item.name,
            error: error.message,
          });
        }
      }
    }

    // Si no hay reservas pero hay items, crear una reserva genérica para guardar los items
    // Esto ocurre cuando solo hay productos en el carrito (sin servicios/promociones con reserva)
    if (createdReservations.length === 0 && cartItems.length > 0) {
      const insertQuery = `
        INSERT INTO reservations 
          (service_id, service_label, barber_id, date, time, status, customer_name, customer_phone, delivery_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `;

      // Usar fecha y hora actuales
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      // Para facturas de solo productos, generar un horario único basado en milisegundos
      // para evitar conflictos cuando se crean múltiples facturas en el mismo minuto
      let hours = String(today.getHours()).padStart(2, '0');
      let minutes = String(today.getMinutes()).padStart(2, '0');

      let timeStr;
      let serviceLabel;
      let reservationStatus;

      let deliveryStatusValue = null;

      if (hasOnlyProducts) {
        // Factura de solo productos: usar horario único y confirmar automáticamente
        const milliseconds = today.getMilliseconds();
        const secondsOffset = Math.floor(milliseconds / 100); // 0-9 (aprox)
        const uniqueMinutes = (parseInt(minutes) + secondsOffset) % 60;
        timeStr = `${hours}:${String(uniqueMinutes).padStart(2, '0')}`;
        serviceLabel = "Factura - Solo Productos";
        reservationStatus = RESERVATION_STATUS.CONFIRMED; // Confirmar automáticamente
        deliveryStatusValue = 'pendiente'; // Estado inicial para facturas de productos
        logger.info(`Creando factura de solo productos desde carrito para cliente: ${customerName}`);
      } else {
        // Hay servicios/promociones sin bookingData: crear como pendiente
        timeStr = `${hours}:${minutes}`;
        serviceLabel = "Pedido desde carrito";
        reservationStatus = RESERVATION_STATUS.PENDING;
      }

      const { rows: result } = await connection.query(insertQuery, [
        "s1", // Servicio genérico
        serviceLabel,
        null,
        dateStr,
        timeStr,
        reservationStatus,
        customerName,
        customerPhone,
        deliveryStatusValue,
      ]);

      mainReservationId = result[0].id;

      const { rows } = await connection.query(
        "SELECT * FROM reservations WHERE id = $1",
        [result[0].id]
      );

      if (rows && rows.length > 0) {
        createdReservations.push(rows[0]);
        logger.info(`Reserva creada desde carrito: ID=${rows[0].id}, Estado=${reservationStatus}, ServiceLabel=${serviceLabel}, Cliente=${customerName}`);
      }
    }

    // Guardar TODOS los items del carrito en reservation_items de la primera reserva
    if (mainReservationId && cartItems.length > 0) {
      const { reduceProductStock } = await import("./products.service.js");

      for (const item of cartItems) {
        try {
          // Determinar el tipo de item
          let itemType = item.type; // 'product', 'service', 'offer'
          let itemId = item.id;
          let itemName = item.name;
          let unitPrice = parseFloat(item.price) || 0;
          let quantity = parseInt(item.quantity) || 1;

          // Calcular subtotal
          const subtotal = unitPrice * quantity;

          // Calcular descuento por item (si hay descuento aplicado, distribuirlo proporcionalmente)
          let discountAmount = 0;
          if (cartData.discountAmount && cartData.subtotal > 0) {
            const itemSubtotal = subtotal;
            const discountRatio = itemSubtotal / cartData.subtotal;
            discountAmount = cartData.discountAmount * discountRatio;
          }

          // Insertar item en reservation_items
          await connection.query(
            `INSERT INTO reservation_items 
             (reservation_id, item_type, item_id, item_name, quantity, unit_price, discount_code_id, discount_amount, subtotal)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              mainReservationId,
              itemType,
              itemId,
              itemName,
              quantity,
              unitPrice,
              discountCodeId,
              discountAmount,
              subtotal - discountAmount,
            ]
          );

          // Si es un producto, reducir el stock
          if (itemType === 'product' && itemId) {
            await reduceProductStock(connection, itemId, quantity);
          }
        } catch (error) {
          logger.error(`Error al guardar item ${item.name} en reservation_items`, {
            error: error.message,
          });
        }
      }

      // Si se aplicó un descuento, incrementar el contador de usos
      if (discountCodeId) {
        await connection.query(
          "UPDATE discount_codes SET usage_count = usage_count + 1 WHERE id = $1",
          [discountCodeId]
        );
      }
    }

    if (createdReservations.length === 0 && errors.length > 0) {
      await connection.query("ROLLBACK");
      throw new ValidationError(
        `No se pudieron crear las reservas: ${errors.map((e) => e.error).join(", ")}`
      );
    }

    await connection.query("COMMIT");

    logger.info(
      `Reservas creadas desde carrito: ${createdReservations.length} exitosas, ${errors.length} con errores, ${cartItems.length} items guardados`
    );

    return {
      success: createdReservations.length,
      failed: errors.length,
      reservations: createdReservations,
      mainReservationId,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    await connection.query("ROLLBACK");
    if (error instanceof ValidationError) {
      throw error;
    }
    logger.error("Error al crear reservas desde carrito", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  } finally {
    connection.release();
  }
};
