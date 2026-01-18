/**
 * @fileoverview Componente de date picker personalizado estilo iOS
 * @module components/ui/DatePicker
 * 
 * He implementado este componente para reemplazar los input[type="date"] nativos
 * y poder aplicar completamente el diseño iOS translúcido con esquinas redondeadas.
 */

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Nombres de los meses en español
 */
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

/**
 * Días de la semana abreviados en español
 */
const WEEKDAYS = ["do.", "lu.", "ma.", "mi.", "ju.", "vi.", "sá."];

/**
 * Formatea una fecha a YYYY-MM-DD
 */
const formatDateToInput = (date) => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Formatea una fecha a formato legible (dd/mm/yyyy)
 */
const formatDateDisplay = (dateString) => {
  if (!dateString) return "";
  
  // Si viene con timestamp ISO (ej: "2026-01-01T06:00:00.000Z")
  if (dateString.includes("T")) {
    try {
      const date = new Date(dateString);
      if (!Number.isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${day}/${month}/${year}`;
      }
    } catch (e) {
      // Si falla, intentar extraer solo la parte de fecha
      const datePart = dateString.split("T")[0];
      const [year, month, day] = datePart.split("-");
      if (year && month && day) {
        return `${day}/${month}/${year}`;
      }
    }
  }
  
  // Formato YYYY-MM-DD
  const parts = dateString.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
  }
  
  // Si no se puede parsear, devolver el string original
  return dateString;
};

/**
 * Componente de date picker personalizado
 */
export default function DatePicker({
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  className = "",
  min = null,
  max = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      const date = new Date(value);
      return new Date(date.getFullYear(), date.getMonth(), 1);
    }
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  });
  const pickerRef = useRef(null);
  const buttonRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  // Calcular y actualizar posición del calendario
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const updatePosition = () => {
        if (buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          setPosition({
            top: rect.bottom + window.scrollY + 4,
            left: rect.left + window.scrollX,
            width: rect.width,
          });
        }
      };
      
      updatePosition();
      
      // Actualizar posición en scroll, resize y scroll de elementos
      const handleUpdate = () => {
        updatePosition();
      };
      
      window.addEventListener('scroll', handleUpdate, true);
      window.addEventListener('resize', handleUpdate);
      
      // Usar requestAnimationFrame para actualizaciones suaves durante el scroll
      let rafId = null;
      const handleScroll = () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(updatePosition);
      };
      
      window.addEventListener('scroll', handleScroll, true);
      
      return () => {
        window.removeEventListener('scroll', handleUpdate, true);
        window.removeEventListener('resize', handleUpdate);
        window.removeEventListener('scroll', handleScroll, true);
        if (rafId) cancelAnimationFrame(rafId);
      };
    }
  }, [isOpen]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Actualizar mes cuando cambia el valor
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  }, [value]);

  const selectedDate = value ? new Date(value) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  /**
   * Genera los días del mes para el calendario
   */
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Días del mes anterior
    const prevMonth = new Date(year, month - 1, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false,
      });
    }

    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: new Date(year, month, day),
        isCurrentMonth: true,
      });
    }

    // Días del mes siguiente para completar la cuadrícula
    const remainingDays = 42 - days.length; // 6 semanas * 7 días
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: new Date(year, month + 1, day),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  /**
   * Navega al mes anterior
   */
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  /**
   * Navega al mes siguiente
   */
  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  /**
   * Selecciona una fecha
   */
  const handleDateSelect = (date) => {
    // Validar fecha mínima
    if (min) {
      const minDate = new Date(min);
      minDate.setHours(0, 0, 0, 0);
      if (date < minDate) return;
    }

    // Validar fecha máxima
    if (max) {
      const maxDate = new Date(max);
      maxDate.setHours(0, 0, 0, 0);
      if (date > maxDate) return;
    }

    onChange(formatDateToInput(date));
    setIsOpen(false);
  };

  /**
   * Selecciona la fecha de hoy
   */
  const handleToday = () => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    handleDateSelect(todayDate);
  };

  /**
   * Limpia la fecha seleccionada
   */
  const handleClear = () => {
    onChange("");
    setIsOpen(false);
  };

  /**
   * Verifica si una fecha está deshabilitada
   */
  const isDateDisabled = (date) => {
    if (min) {
      const minDate = new Date(min);
      minDate.setHours(0, 0, 0, 0);
      if (date < minDate) return true;
    }
    if (max) {
      const maxDate = new Date(max);
      maxDate.setHours(0, 0, 0, 0);
      if (date > maxDate) return true;
    }
    return false;
  };

  /**
   * Verifica si una fecha es hoy
   */
  const isToday = (date) => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  /**
   * Verifica si una fecha está seleccionada
   */
  const isSelected = (date) => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const days = getDaysInMonth();
  const monthName = MONTHS[currentMonth.getMonth()];
  const year = currentMonth.getFullYear();

  const calendarContent = isOpen && (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        ref={pickerRef}
        className="fixed z-[9999]"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: `${Math.max(position.width || 240, 240)}px`,
          maxWidth: '320px',
        }}
      >
            <div className="bg-black/95 backdrop-blur-2xl border border-white/10 rounded-lg shadow-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.08) 0%, rgba(0, 122, 255, 0.02) 50%, rgba(0, 0, 0, 0.4) 100%)',
                backdropFilter: 'blur(40px) saturate(180%)',
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              }}
            >
              {/* Header del calendario */}
              <div className="p-1.5 sm:p-2 border-b border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={goToPreviousMonth}
                      className="p-0.5 rounded hover:bg-white/10 transition-colors"
                    >
                      <ChevronLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#007AFF]" />
                    </button>
                    <h3 className="text-[10px] sm:text-xs font-semibold text-white px-1">
                      {monthName} de {year}
                    </h3>
                    <button
                      type="button"
                      onClick={goToNextMonth}
                      className="p-0.5 rounded hover:bg-white/10 transition-colors"
                    >
                      <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#007AFF]" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-0.5 rounded hover:bg-white/10 transition-colors"
                  >
                    <X className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white/60" />
                  </button>
                </div>

                {/* Días de la semana */}
                <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                  {WEEKDAYS.map((day) => (
                    <div
                      key={day}
                      className="text-center text-[9px] sm:text-[10px] font-semibold text-white/60 py-0.5"
                    >
                      {day}
                    </div>
                  ))}
                </div>
              </div>

              {/* Grid de días */}
              <div className="p-1 sm:p-1.5 pt-0.5">
                <div className="grid grid-cols-7 gap-0.5">
                  {days.map((dayObj, index) => {
                    const date = dayObj.date;
                    const disabled = isDateDisabled(date);
                    const isTodayDate = isToday(date);
                    const isSelectedDate = isSelected(date);

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => !disabled && handleDateSelect(date)}
                        disabled={disabled}
                        className={`
                          aspect-square rounded text-[9px] sm:text-[10px] font-medium
                          transition-all duration-150
                          ${
                            disabled
                              ? "text-white/20 cursor-not-allowed"
                              : "cursor-pointer hover:bg-white/10"
                          }
                          ${
                            isSelectedDate
                              ? "bg-[#007AFF] text-white font-bold"
                              : isTodayDate
                              ? "bg-white/10 text-[#007AFF] font-semibold border border-[#007AFF]/50"
                              : dayObj.isCurrentMonth
                              ? "text-white/90"
                              : "text-white/30"
                          }
                        `}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer con botones */}
              <div className="p-1 sm:p-1.5 border-t border-white/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[9px] sm:text-[10px] text-white/60 hover:text-white transition-colors"
                >
                  Borrar
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  className="text-[9px] sm:text-[10px] text-[#007AFF] hover:text-[#007AFF]/80 font-semibold transition-colors"
                >
                  Hoy
                </button>
              </div>
            </div>
          </motion.div>
      </AnimatePresence>
  );

  return (
    <>
      <div className={`relative w-full ${className}`}>
        {/* Input del date picker */}
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-full text-left
            flex items-center justify-between gap-3
            appearance-none
            -webkit-appearance-none
            -moz-appearance-none
            backdrop-blur-[20px]
            border
            ${isOpen ? 'border-[#007AFF]/80' : 'border-white/20'}
            rounded-xl
            px-4 py-2.5
            text-sm text-white
            outline-none
            transition-all duration-200
            cursor-pointer
            hover:border-[#007AFF]/50
            focus:border-[#007AFF]/80 focus:ring-2 focus:ring-[#007AFF]/15
            min-h-[44px]
          `}
          style={{
            background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.08) 0%, rgba(0, 122, 255, 0.02) 50%, rgba(0, 0, 0, 0.4) 100%)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          }}
        >
          <span className={`flex-1 ${value ? "text-white" : "text-white/60"}`}>
            {value ? formatDateDisplay(value) : placeholder}
          </span>
          <Calendar className="h-4 w-4 text-[#007AFF] flex-shrink-0" strokeWidth={2} />
        </button>
      </div>

      {/* Calendario desplegable renderizado en portal */}
      {typeof document !== 'undefined' && createPortal(calendarContent, document.body)}
    </>
  );
}

