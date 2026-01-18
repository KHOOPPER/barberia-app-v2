/**
 * @fileoverview Utilidades y constantes compartidas (fechas/horarios/WhatsApp)
 * @module data/mock
 *
 * Varios componentes consumen este módulo. Para evitar hardcodes en la plantilla,
 * los valores por defecto provienen de variables de entorno (Vite) y caen a
 * placeholders si no están definidos.
 */

/**
 * Número de WhatsApp en formato internacional SIN signos ni espacios.
 * Ejemplo El Salvador: "50370009306".
 */
export const WHATSAPP_NUMBER =
  (import.meta?.env?.VITE_WHATSAPP_NUMBER || "").replace(/[^0-9]/g, "") ||
  "0000000000";

/**
 * Horarios disponibles por defecto (cada 30 minutos).
 * Ajusta según tus necesidades o conviértelo en configuración en backend.
 */
export const TIME_SLOTS = (() => {
  const startHour = 9;
  const endHour = 19;
  const slots = [];
  for (let h = startHour; h <= endHour; h += 1) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    if (h !== endHour) slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  return slots;
})();

/**
 * Devuelve un array de fechas futuras (YYYY-MM-DD).
 * Regla UX: si ya es 16:30 o más, excluye el día de hoy.
 */
export const getFutureDates = (days = 7) => {
  const results = [];
  const now = new Date();

  const start = new Date(now);
  const isLate = now.getHours() > 16 || (now.getHours() === 16 && now.getMinutes() >= 30);
  if (isLate) start.setDate(start.getDate() + 1);

  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    // Normalizar a YYYY-MM-DD
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    results.push(`${yyyy}-${mm}-${dd}`);
  }
  return results;
};

/**
 * Formatea una fecha (YYYY-MM-DD) a un string legible en español.
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const [y, m, d] = String(dateStr).split("-").map(Number);
  if (!y || !m || !d) return String(dateStr);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

// Compat: algunas partes del proyecto original usaban este nombre.
export const FUTURE_DATES = getFutureDates(7);
