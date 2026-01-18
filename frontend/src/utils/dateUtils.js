/**
 * @fileoverview Utilidades para manejo de fechas sin problemas de zona horaria
 * @module utils/dateUtils
 */

/**
 * Parsea una fecha en formato YYYY-MM-DD a un objeto Date
 * sin problemas de zona horaria
 * @param {string} dateString - Fecha en formato YYYY-MM-DD
 * @returns {Date} Objeto Date en hora local
 */
export function parseDate(dateString) {
  if (!dateString || typeof dateString !== "string") {
    return new Date(dateString);
  }
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  
  return new Date(dateString);
}

/**
 * Formatea una fecha en formato YYYY-MM-DD
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export function formatDateToYYYYMMDD(date) {
  const dateObj = typeof date === "string" ? parseDate(date) : date;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}







