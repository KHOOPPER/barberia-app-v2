/**
 * @fileoverview Servicio de estadísticas y reportes
 * @module services/statistics.service
 */

import { pool } from "../config/db.js";
import logger from "../utils/logger.js";

/**
 * Obtiene estadísticas de ventas por mes (últimos 3 meses)
 */
export const getMonthlySales = async (year = null) => {
  try {
    // Calcular la fecha de hace 3 meses
    const today = new Date();
    const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
    const startDate = threeMonthsAgo.toISOString().split("T")[0];

    const query = `
      SELECT 
        EXTRACT(YEAR FROM r.date) as year,
        EXTRACT(MONTH FROM r.date) as month,
        COUNT(*) as total_reservations,
        SUM(CASE WHEN r.status = 'confirmada' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN r.status = 'pendiente' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN r.status = 'cancelada' THEN 1 ELSE 0 END) as cancelled,
        COALESCE(
          SUM(
            CASE 
              WHEN r.status = 'confirmada' 
                AND (
                  r.service_label != 'Factura - Solo Productos' 
                  OR r.delivery_status = 'entregado'
                ) THEN 
                COALESCE(
                  (SELECT SUM(subtotal) FROM reservation_items WHERE reservation_id = r.id),
                  (SELECT price FROM services WHERE id = r.service_id),
                  0
                )
              ELSE 0 
            END
          ), 0
        ) as revenue
      FROM reservations r
      WHERE r.date >= $1
      GROUP BY EXTRACT(YEAR FROM r.date), EXTRACT(MONTH FROM r.date)
      ORDER BY year ASC, month ASC
    `;

    const result = await pool.query(query, [startDate]);

    // Mapear los resultados con nombres de meses
    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    return result.rows.map(row => ({
      year: parseInt(row.year),
      month: parseInt(row.month),
      monthName: monthNames[parseInt(row.month) - 1],
      totalReservations: parseInt(row.total_reservations),
      confirmed: parseInt(row.confirmed),
      pending: parseInt(row.pending),
      cancelled: parseInt(row.cancelled),
      revenue: parseFloat(row.revenue) || 0,
    }));
  } catch (error) {
    logger.error("Error al obtener estadísticas mensuales", { error: error.message });
    throw error;
  }
};

/**
 * Obtiene estadísticas generales del dashboard
 */
export const getDashboardStats = async () => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().split("T")[0];

    // Total de reservas
    const totalReservationsResult = await pool.query(
      "SELECT COUNT(*) as total FROM reservations"
    );

    // Reservas del mes actual
    const monthReservationsResult = await pool.query(
      "SELECT COUNT(*) as total FROM reservations WHERE date >= $1",
      [firstDayOfMonth]
    );

    // Reservas de hoy
    const todayReservationsResult = await pool.query(
      "SELECT COUNT(*) as total FROM reservations WHERE date = $1",
      [today]
    );

    // Ingresos del mes (basado en reservation_items de facturas confirmadas)
    const monthRevenueResult = await pool.query(`
      SELECT COALESCE(
        SUM(
          CASE 
            WHEN ri.subtotal IS NOT NULL THEN ri.subtotal
            ELSE COALESCE(s.price, 0)
          END
        ), 0
      ) as revenue
      FROM reservations r
      LEFT JOIN reservation_items ri ON r.id = ri.reservation_id
      LEFT JOIN services s ON r.service_id = s.id
      WHERE r.date >= $1
        AND r.status = 'confirmada'
        AND (
          r.service_label != 'Factura - Solo Productos' 
          OR r.delivery_status = 'entregado'
        )
    `, [firstDayOfMonth]);

    // Reservas por estado
    const statusStatsResult = await pool.query(`
      SELECT 
        status,
        COUNT(*) as total
      FROM reservations
      GROUP BY status
    `);

    // Top items del mes (servicios, productos y ofertas)
    const topServicesResult = await pool.query(`
      SELECT 
        ri.item_name as service_name,
        SUM(ri.quantity) as count,
        COALESCE(SUM(ri.subtotal), 0) as revenue
      FROM reservations r
      INNER JOIN reservation_items ri ON r.id = ri.reservation_id
      WHERE r.date >= $1
        AND r.status = 'confirmada'
        AND (
          r.service_label != 'Factura - Solo Productos' 
          OR r.delivery_status = 'entregado'
        )
      GROUP BY ri.item_name, ri.item_type, ri.item_id
      ORDER BY revenue DESC
      LIMIT 5
    `, [firstDayOfMonth]);

    // Reservas de los últimos 31 días
    const last31DaysResult = await pool.query(`
      SELECT 
        DATE(date) as date,
        COUNT(*) as count
      FROM reservations
      WHERE date >= CURRENT_DATE - INTERVAL '31 days'
      GROUP BY DATE(date)
      ORDER BY date ASC
    `);

    return {
      totalReservations: parseInt(totalReservationsResult.rows[0]?.total || 0),
      monthReservations: parseInt(monthReservationsResult.rows[0]?.total || 0),
      todayReservations: parseInt(todayReservationsResult.rows[0]?.total || 0),
      monthRevenue: parseFloat(monthRevenueResult.rows[0]?.revenue || 0),
      statusStats: statusStatsResult.rows.map(row => ({
        status: row.status,
        total: parseInt(row.total),
      })),
      topServices: topServicesResult.rows.map(row => ({
        serviceName: row.service_name,
        count: parseInt(row.count),
        revenue: parseFloat(row.revenue || 0),
      })),
      last31Days: last31DaysResult.rows.map(row => ({
        date: row.date instanceof Date ? row.date.toISOString().split("T")[0] : row.date,
        count: parseInt(row.count),
      })),
    };
  } catch (error) {
    logger.error("Error al obtener estadísticas del dashboard", { error: error.message });
    throw error;
  }
};
