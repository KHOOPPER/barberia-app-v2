/**
 * @fileoverview Componente de gestión de reservas en el panel administrativo
 * @module components/admin/AdminReservations
 * 
 * He desarrollado este componente para permitir a los administradores gestionar
 * todas las reservas del sistema. Incluye funcionalidades de filtrado, búsqueda,
 * cambio de estado y exportación de datos.
 */

import { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  Clock,
  Users,
  AlertCircle,
  Settings2,
  X,
  Download,
  Search,
  Calendar,
  Grid3x3,
  List,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "../ui/GlassCard";
import CustomSelect from "../ui/CustomSelect";
import DatePicker from "../ui/DatePicker";
import { API_BASE_URL } from "../../config/api.js"; // ← ahora viene de una config central
import { isAuthenticated, apiRequest } from "../../utils/api.js";
import { parseDate } from "../../utils/dateUtils.js";
import { exportReservations, exportReservationsToPDF } from "../../utils/exportUtils.js";
import logo from "../../assets/logo.png";

// Etiquetas legibles para los estados
const STATUS_LABELS = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
};

/**
 * Mapeo de estados a estilos visuales (badges)
 * He definido estos colores para mantener consistencia visual en toda la UI
 */
const STATUS_COLORS = {
  pendiente: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  confirmada: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  cancelada: "bg-gray-500/20 text-gray-300 border-gray-500/40",
};

/**
 * Normaliza fechas a formato YYYY-MM-DD
 * He implementado esta función para convertir cualquier formato de fecha
 * al formato estándar usado en las claves de filtrado
 */
const toDateKey = (value) => {
  if (!value) return "";
  const d = parseDate(value);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Componente de Selector de Mes - COPY PASTE del DatePicker adaptado para mes/año
const MONTHS_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

const MONTHS_ABBR = [
  "ene.", "feb.", "mar.", "abr.", "may.", "jun.",
  "jul.", "ago.", "sep.", "oct.", "nov.", "dic."
];

/**
 * Formatea mes/año a formato legible
 */
const formatMonthDisplay = (monthValue) => {
  if (!monthValue) return "";
  const [year, month] = monthValue.split('-');
  if (year && month) {
    const monthIndex = parseInt(month) - 1;
    return `${MONTHS_NAMES[monthIndex]} de ${year}`;
  }
  return monthValue;
};

const MonthPicker = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState('months'); // 'months' o 'years'
  const [currentYear, setCurrentYear] = useState(() => {
    if (value) {
      const [year] = value.split('-');
      return parseInt(year) || new Date().getFullYear();
    }
    return new Date().getFullYear();
  });
  const pickerRef = useRef(null);
  const buttonRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  // Calcular y actualizar posición del calendario - COPY PASTE del DatePicker
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

      const handleUpdate = () => {
        updatePosition();
      };

      window.addEventListener('scroll', handleUpdate, true);
      window.addEventListener('resize', handleUpdate);

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

  // Cerrar al hacer click fuera - COPY PASTE del DatePicker
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setViewMode('months');
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Actualizar año cuando cambia el valor
  useEffect(() => {
    if (value) {
      const [year] = value.split('-');
      setCurrentYear(parseInt(year) || new Date().getFullYear());
    }
  }, [value]);

  /**
   * Navega al año anterior/siguiente
   */
  const goToPreviousYear = () => {
    setCurrentYear(prev => prev - 1);
  };

  const goToNextYear = () => {
    setCurrentYear(prev => prev + 1);
  };

  /**
   * Selecciona un mes
   */
  const handleMonthSelect = (month, e) => {
    if (e) e.stopPropagation();
    const monthStr = String(month).padStart(2, '0');
    onChange(`${currentYear}-${monthStr}`);
    setIsOpen(false);
    setViewMode('months');
  };

  /**
   * Selecciona un año
   */
  const handleYearSelect = (year, e) => {
    if (e) e.stopPropagation();
    setCurrentYear(year);
    setViewMode('months');
    // Si ya había un mes seleccionado, mantenerlo con el nuevo año
    if (value) {
      const [, month] = value.split('-');
      if (month) {
        onChange(`${year}-${month}`);
      }
    }
  };

  /**
   * Selecciona el mes actual
   */
  const handleThisMonth = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const monthStr = String(month).padStart(2, '0');
    onChange(`${year}-${monthStr}`);
    setIsOpen(false);
    setViewMode('months');
  };

  /**
   * Limpia la selección
   */
  const handleClear = () => {
    onChange("");
    setIsOpen(false);
    setViewMode('months');
  };

  // Generar lista de años dinámicamente basados en currentYear
  const years = useMemo(() => {
    const yearsList = [];
    // Generar años centrados alrededor del currentYear (10 años antes y después)
    for (let i = currentYear - 10; i <= currentYear + 10; i++) {
      yearsList.push(i);
    }
    return yearsList;
  }, [currentYear]);

  // Obtener mes seleccionado
  const selectedMonth = value ? (() => {
    const [, month] = value.split('-');
    return parseInt(month) || null;
  })() : null;

  const calendarContent = isOpen && (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        ref={pickerRef}
        className="fixed z-[999999]"
        data-month-picker="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: `${Math.max(position.width || 240, 240)}px`,
          maxWidth: '320px',
        }}
      >
        <div
          className="bg-black/95 backdrop-blur-2xl border border-white/10 rounded-lg shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.08) 0%, rgba(0, 122, 255, 0.02) 50%, rgba(0, 0, 0, 0.4) 100%)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          }}
        >
          {/* Header - COPY PASTE del DatePicker */}
          <div className="p-1.5 sm:p-2 border-b border-white/10">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                {viewMode === 'months' ? (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToPreviousYear();
                      }}
                      className="p-0.5 rounded hover:bg-white/10 transition-colors"
                    >
                      <ChevronLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#007AFF]" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewMode('years');
                      }}
                      className="px-1 py-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer text-[10px] sm:text-xs font-semibold text-white"
                    >
                      {currentYear}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToNextYear();
                      }}
                      className="p-0.5 rounded hover:bg-white/10 transition-colors"
                    >
                      <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#007AFF]" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentYear(prev => prev - 20);
                      }}
                      className="p-0.5 rounded hover:bg-white/10 transition-colors"
                    >
                      <ChevronLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#007AFF]" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewMode('months');
                      }}
                      className="px-1 py-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer text-[10px] sm:text-xs font-semibold text-white"
                    >
                      {years[0]} - {years[years.length - 1]}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentYear(prev => prev + 20);
                      }}
                      className="p-0.5 rounded hover:bg-white/10 transition-colors"
                    >
                      <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#007AFF]" />
                    </button>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  setViewMode('months');
                }}
                className="p-0.5 rounded hover:bg-white/10 transition-colors"
              >
                <X className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white/60" />
              </button>
            </div>
          </div>

          {/* Contenido: Grid de meses o años */}
          {viewMode === 'months' ? (
            <div className="p-1 sm:p-1.5 pt-0.5">
              <div className="grid grid-cols-4 gap-0.5">
                {MONTHS_ABBR.map((month, index) => {
                  const monthNum = index + 1;
                  const isSelected = selectedMonth === monthNum && value && value.startsWith(`${currentYear}-`);
                  const isThisMonth = new Date().getFullYear() === currentYear &&
                    new Date().getMonth() + 1 === monthNum;

                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={(e) => handleMonthSelect(monthNum, e)}
                      className={`
                        aspect-square rounded text-[9px] sm:text-[10px] font-medium
                        transition-all duration-150
                        cursor-pointer hover:bg-white/10
                        ${isSelected
                          ? "bg-[#007AFF] text-white font-bold"
                          : isThisMonth
                            ? "bg-white/10 text-[#007AFF] font-semibold border border-[#007AFF]/50"
                            : "text-white/90 hover:text-white"
                        }
                      `}
                    >
                      {month}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-1 sm:p-1.5 pt-0.5 max-h-[200px] overflow-y-auto">
              <div className="grid grid-cols-4 gap-0.5">
                {years.map((year) => {
                  const isSelected = year === currentYear;
                  const isThisYear = year === new Date().getFullYear();

                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={(e) => handleYearSelect(year, e)}
                      className={`
                        py-1.5 px-2 rounded text-[9px] sm:text-[10px] font-medium
                        transition-all duration-150
                        cursor-pointer hover:bg-white/10
                        ${isSelected
                          ? "bg-[#007AFF] text-white font-bold"
                          : isThisYear
                            ? "bg-white/10 text-[#007AFF] font-semibold border border-[#007AFF]/50"
                            : "text-white/90 hover:text-white"
                        }
                      `}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer con botones - COPY PASTE del DatePicker */}
          <div className="p-1 sm:p-1.5 border-t border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="text-[9px] sm:text-[10px] text-white/60 hover:text-white transition-colors"
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleThisMonth();
              }}
              className="text-[9px] sm:text-[10px] text-[#007AFF] hover:text-[#007AFF]/80 font-semibold transition-colors"
            >
              Este mes
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return (
    <>
      <div className="relative w-full">
        {/* Input del month picker - COPY PASTE del DatePicker */}
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
            {value ? formatMonthDisplay(value) : "Seleccionar mes"}
          </span>
          <Calendar className="h-4 w-4 text-[#007AFF] flex-shrink-0" strokeWidth={2} />
        </button>
      </div>

      {/* Calendario desplegable renderizado en portal - COPY PASTE del DatePicker */}
      {typeof document !== 'undefined' && createPortal(calendarContent, document.body)}
    </>
  );
};

// Componente de Calendario Visual
const CalendarView = ({ reservations }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  const endDate = new Date(monthEnd);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const days = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  const reservationsByDate = useMemo(() => {
    const grouped = {};
    reservations.forEach(reservation => {
      const key = toDateKey(reservation.date);
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(reservation);
    });
    return grouped;
  }, [reservations]);

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  return (
    <div className="space-y-4">
      {/* Controles del mes */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => {
            const prev = new Date(currentMonth);
            prev.setMonth(prev.getMonth() - 1);
            setCurrentMonth(prev);
          }}
          className="p-2 rounded-lg border border-white/15 bg-black/30 text-white/70 hover:bg-white/10 transition"
        >
          ←
        </button>
        <h4 className="text-lg font-semibold text-white">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h4>
        <button
          onClick={() => {
            const next = new Date(currentMonth);
            next.setMonth(next.getMonth() + 1);
            setCurrentMonth(next);
          }}
          className="p-2 rounded-lg border border-white/15 bg-black/30 text-white/70 hover:bg-white/10 transition"
        >
          →
        </button>
      </div>

      {/* Calendario */}
      <div className="grid grid-cols-7 gap-2">
        {/* Headers de días */}
        {dayNames.map(day => (
          <div key={day} className="text-center text-xs font-semibold text-gray-400 py-2">
            {day}
          </div>
        ))}

        {/* Días del mes */}
        {days.map((day, idx) => {
          const dateKey = toDateKey(day.toISOString().split('T')[0]);
          const dayReservations = reservationsByDate[dateKey] || [];
          const isCurrentMonthDay = isCurrentMonth(day);
          const isTodayDay = isToday(day);

          return (
            <div
              key={idx}
              className={`min-h-[80px] p-2 rounded-lg border ${isTodayDay
                ? 'border-blue-500/50 bg-blue-500/10'
                : isCurrentMonthDay
                  ? 'border-white/10 bg-black/20'
                  : 'border-white/5 bg-black/10 opacity-50'
                }`}
            >
              <div className={`text-xs font-medium mb-1 ${isTodayDay ? 'text-blue-400' : isCurrentMonthDay ? 'text-white' : 'text-gray-500'
                }`}>
                {day.getDate()}
              </div>
              <div className="space-y-1">
                {dayReservations.slice(0, 2).map(reservation => (
                  <div
                    key={reservation.id}
                    className={`text-[10px] px-1.5 py-0.5 rounded truncate ${reservation.status === 'confirmada'
                      ? 'bg-blue-500/30 text-blue-300'
                      : reservation.status === 'pendiente'
                        ? 'bg-yellow-500/30 text-yellow-300'
                        : 'bg-gray-500/30 text-gray-300'
                      }`}
                    title={`${reservation.time || ''} - ${reservation.customer_name || ''}`}
                  >
                    {reservation.time || ''} {reservation.customer_name?.substring(0, 8) || ''}
                  </div>
                ))}
                {dayReservations.length > 2 && (
                  <div className="text-[10px] text-gray-400">
                    +{dayReservations.length - 2} más
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 justify-center pt-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500/30"></div>
          <span className="text-xs text-gray-400">Confirmada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-500/30"></div>
          <span className="text-xs text-gray-400">Pendiente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-500/30"></div>
          <span className="text-xs text-gray-400">Cancelada</span>
        </div>
      </div>
    </div>
  );
};

export default function AdminReservations() {
  /**
   * Estados principales del componente
   * He organizado los estados en grupos lógicos para facilitar el mantenimiento
   */
  const [reservations, setReservations] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);


  /**
   * Estados para filtros de búsqueda
   * He implementado filtros independientes para permitir combinaciones flexibles
   */
  const [filterDate, setFilterDate] = useState("");
  const [filterBarber, setFilterBarber] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  /**
   * Estado para controlar qué reserva tiene el menú de acciones abierto
   * He usado un ID en lugar de un booleano para permitir múltiples reservas
   */
  const [openActionsId, setOpenActionsId] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportMonthFilter, setExportMonthFilter] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' o 'calendar'
  const exportButtonRef = useRef(null);
  const [exportMenuPosition, setExportMenuPosition] = useState({ top: 0, left: 0 });

  // Calcular posición del menú de exportación
  useEffect(() => {
    if (showExportMenu && exportButtonRef.current) {
      const rect = exportButtonRef.current.getBoundingClientRect();
      setExportMenuPosition({
        top: rect.bottom + window.scrollY + 8,
        left: Math.max(10, rect.right + window.scrollX - 256), // 256 es el ancho (w-64)
      });
    }
  }, [showExportMenu]);

  // Cerrar menú de exportación al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Si el menú no está abierto, no hacer nada
      if (!showExportMenu) return;

      // Verificar si el clic fue en el botón o dentro del menú (incluyendo portales)
      const isButtonClick = exportButtonRef.current?.contains(event.target);
      const isInsideMenu = event.target.closest('[data-export-menu="true"]');
      const isInsideMonthPicker = event.target.closest('[data-month-picker="true"]');

      if (!isButtonClick && !isInsideMenu && !isInsideMonthPicker) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showExportMenu]);

  /**
   * Estado para el logo dinámico
   * He inicializado con el logo por defecto para evitar "flash" al cargar
   */
  const [currentLogo, setCurrentLogo] = useState(logo);

  /**
   * Carga del logo desde settings (con caché compartido)
   * He implementado esta carga asíncrona para actualizar el logo sin recargar la página
   */
  useEffect(() => {
    let mounted = true;

    const fetchLogo = async () => {
      try {
        const { getLogo } = await import("../../utils/settingsCache.js");
        const logoUrl = await getLogo(API_BASE_URL);
        if (mounted && logoUrl) {
          setCurrentLogo(logoUrl);
        }
      } catch (error) {
        // Fallback al logo por defecto si falla la carga
      }
    };

    fetchLogo();

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Carga de reservas desde el backend
   * He implementado esta función para cargar reservas con filtros opcionales.
   * Si no se pasan filtros, utiliza el estado actual de los filtros del componente.
   */
  const fetchReservations = async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const date = filters.date ?? filterDate;
      const barber = filters.barber ?? filterBarber;
      const status = filters.status ?? filterStatus;

      const params = new URLSearchParams();
      if (date) params.append("date", date);
      if (barber) params.append("barberId", barber);
      if (status) params.append("status", status);

      const queryString = params.toString();
      const endpoint = queryString
        ? `/reservations/admin?${queryString}`
        : `/reservations/admin`;

      const response = await apiRequest(endpoint);
      // El backend devuelve { success: true, data: [...] }
      const reservationsData = response.data || response;

      // Filtrar reservas: excluir facturas de solo productos (deben aparecer solo en Clientes)
      // Estas tienen service_label = "Factura - Solo Productos"
      const filteredReservations = Array.isArray(reservationsData)
        ? reservationsData.filter(reservation => {
          // Excluir facturas que son solo de productos
          return reservation.service_label !== "Factura - Solo Productos";
        })
        : [];

      setReservations(filteredReservations);
    } catch (err) {
      setError("Error al cargar reservas");
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Carga de barberos para el filtro
   * He implementado esta carga al montar el componente para poblar el selector de barberos
   */
  useEffect(() => {
    const fetchBarbers = async () => {
      try {
        const data = await apiRequest("/barbers?includeInactive=true");
        setBarbers(Array.isArray(data.data) ? data.data : []);
      } catch (err) {
        // Error al cargar barberos (no crítico)
      }
    };
    fetchBarbers();
  }, []);

  /**
   * Carga inicial de datos al montar el componente
   * He implementado esta carga para obtener todas las reservas al iniciar
   */
  useEffect(() => {
    fetchReservations();

    // Escuchar evento de factura guardada para actualizar la lista
    const handleInvoiceSaved = () => {
      fetchReservations();
    };

    window.addEventListener('invoice-saved', handleInvoiceSaved);

    // Cleanup
    return () => {
      window.removeEventListener('invoice-saved', handleInvoiceSaved);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Actualiza el estado de una reserva
   * He implementado esta función para permitir cambiar el estado (pendiente, confirmada, cancelada)
   */
  const handleStatusChange = async (id, status) => {
    try {
      const result = await apiRequest(`/reservations/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });

      // Actualizar el estado local con la reserva devuelta por el backend

      // Actualizar el estado local con la reserva devuelta por el backend
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? result.data || { ...r, status } : r))
      );
    } catch (err) {
      alert(`Error inesperado al actualizar el estado: ${err.message}`);
    }
  };

  /**
   * Elimina una reserva del sistema
   * He implementado esta función con confirmación implícita para evitar eliminaciones accidentales
   */
  const handleDeleteReservation = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar esta reserva?")) return;

    try {
      await apiRequest(`/reservations/${id}`, {
        method: "DELETE",
      });

      setReservations((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert(`Error inesperado al eliminar la reserva: ${err.message}`);
    }
  };

  /**
   * Aplica filtros usando el estado actual
   * He implementado esta función para recargar las reservas con los filtros aplicados
   */
  const handleApplyFilters = () => {
    fetchReservations();
  };

  /**
   * Limpia filtros y recarga sin filtros
   * He implementado esta función para resetear todos los filtros y mostrar todas las reservas
   */
  const handleClearFilters = async () => {
    setFilterDate("");
    setFilterBarber("");
    setFilterStatus("");
    await fetchReservations({ date: "", barber: "", status: "" });
  };

  /**
   * Exporta reservas a CSV/Excel
   */
  const handleExportCSV = async () => {
    try {
      const reservationsToExport = filteredAndSortedReservations || reservations;
      await exportReservations(reservationsToExport, API_BASE_URL, exportMonthFilter || null);
      setShowExportMenu(false);
      setExportMonthFilter('');
    } catch (error) {
      console.error('Error al exportar CSV:', error);
      alert('Error al exportar el archivo CSV');
    }
  };

  /**
   * Exporta reservas a PDF
   */
  const handleExportPDF = async () => {
    try {
      const reservationsToExport = filteredAndSortedReservations || reservations;
      await exportReservationsToPDF(reservationsToExport, API_BASE_URL, exportMonthFilter || null);
      setShowExportMenu(false);
      setExportMonthFilter('');
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      alert('Error al exportar el archivo PDF');
    }
  };



  /**
   * Claves de fechas para hoy y mañana
   * He calculado estas claves usando useMemo para facilitar el acceso rápido a reservas del día actual
   */
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const tomorrowKey = useMemo(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return toDateKey(t);
  }, []);

  /**
   * Cálculo de estadísticas y agendas
   * He implementado useMemo para calcular estadísticas y agrupar reservas por fecha de manera eficiente
   */
  const {
    total,
    pending,
    confirmed,
    cancelled,
    todaysReservations,
    tomorrowsReservations,
    filteredAndSortedReservations,
  } = useMemo(() => {
    const total = reservations.length;

    const pending = reservations.filter((r) => r.status === "pendiente").length;
    const confirmed = reservations.filter(
      (r) => r.status === "confirmada"
    ).length;
    const cancelled = reservations.filter(
      (r) => r.status === "cancelada"
    ).length;

    const todaysReservations = reservations
      .filter((r) => toDateKey(r.date) === todayKey)
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

    const tomorrowsReservations = reservations
      .filter((r) => toDateKey(r.date) === tomorrowKey)
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

    // Filtrar por búsqueda (nombre o teléfono)
    let filtered = reservations;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = reservations.filter((r) => {
        const name = (r.customer_name || "").toLowerCase();
        const phone = (r.customer_phone || "").toLowerCase();
        return name.includes(query) || phone.includes(query);
      });
    }

    // Ordenar: pendientes, confirmadas, canceladas
    const statusOrder = { pendiente: 1, confirmada: 2, cancelada: 3 };
    const sorted = [...filtered].sort((a, b) => {
      const statusA = statusOrder[a.status] || 99;
      const statusB = statusOrder[b.status] || 99;
      if (statusA !== statusB) {
        return statusA - statusB;
      }
      // Si tienen el mismo estado, ordenar por fecha y hora
      const dateA = new Date(`${a.date}T${a.time || "00:00"}`);
      const dateB = new Date(`${b.date}T${b.time || "00:00"}`);
      return dateA - dateB;
    });

    return {
      total,
      pending,
      confirmed,
      cancelled,
      todaysReservations,
      tomorrowsReservations,
      filteredAndSortedReservations: sorted,
    };
  }, [reservations, todayKey, tomorrowKey, searchQuery]);

  const selectedReservation =
    openActionsId != null
      ? reservations.find((r) => r.id === openActionsId)
      : null;

  /**
   * Manejo de acciones desde el pop-up de cada reserva
   * He implementado estas funciones para centralizar las acciones disponibles en el menú contextual
   */
  const handleChangeStatusFromModal = async (status) => {
    if (!selectedReservation) return;
    await handleStatusChange(selectedReservation.id, status);
    setOpenActionsId(null);
  };

  const handleDeleteFromModal = async () => {
    if (!selectedReservation) return;
    await handleDeleteReservation(selectedReservation.id);
    setOpenActionsId(null);
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto px-3 xs:px-4 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 pt-0 sm:pt-1 md:pt-2 lg:pt-3 pb-3 xs:pb-4 sm:pb-5 md:pb-6 lg:pb-8 xl:pb-10 space-y-2 xs:space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6 xl:space-y-7">
      {/* Contenedor - ULTRA RESPONSIVO CON FALLBACKS */}
      <div className="admin-section-container rounded-xl xs:rounded-2xl sm:rounded-3xl p-2 xs:p-2.5 sm:p-3 md:p-4 lg:p-5 xl:p-6 2xl:p-8 border border-white/10 shadow-2xl space-y-2 xs:space-y-2.5 sm:space-y-3 md:space-y-4 lg:space-y-5 xl:space-y-6">
        {/* Header - ULTRA RESPONSIVO */}
        <div className="mb-1 xs:mb-1.5 sm:mb-2 md:mb-3 lg:mb-4 xl:mb-5">
          {/* Mobile/Tablet: sin logo, solo título */}
          <div className="flex items-center gap-2 xs:gap-2.5 sm:gap-3 mb-1.5 xs:mb-2 lg:hidden">
            <Calendar className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-5 sm:w-5 text-white/60 flex-shrink-0" />
            <h1 className="text-base xs:text-lg sm:text-xl md:text-2xl font-semibold text-white tracking-tight" style={{ fontSize: 'clamp(0.95rem, 4vw, 1.5rem)' }}>
              Reservas
            </h1>
          </div>
          {/* Desktop: con logo y descripción */}
          <div className="hidden lg:flex flex-col items-center justify-center mb-3 xl:mb-4">
            <div className="relative mb-2 xl:mb-3">
              <img
                src={currentLogo}
                alt="Logo"
                className="h-20 w-20 xl:h-24 xl:w-24 2xl:h-28 2xl:w-28 object-contain"
                style={{ height: 'clamp(5rem, 8vw, 7rem)', width: 'clamp(5rem, 8vw, 7rem)' }}
                onError={(e) => {
                  if (e.target.src !== logo) {
                    e.target.onerror = null;
                    e.target.src = logo;
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-center gap-2 xl:gap-3 mb-1.5 xl:mb-2">
              <Calendar className="h-5 w-5 xl:h-6 xl:w-6 2xl:h-7 2xl:w-7 text-white/60" />
              <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-semibold text-white tracking-tight" style={{ fontSize: 'clamp(1.875rem, 4vw, 3rem)' }}>
                Reservas
              </h1>
            </div>
          </div>
          <p className="text-[10px] xs:text-xs sm:text-sm md:text-base lg:text-center text-white/50 font-light" style={{ fontSize: 'clamp(0.625rem, 1.8vw, 1rem)' }}>
            Gestiona todas las citas de la barbería
          </p>
        </div>

        {/* Stats Cards - ULTRA RESPONSIVO */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-2 xs:gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-7 2xl:gap-8">
          <GlassCard className="p-2.5 xs:p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7 2xl:p-8">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm lg:text-base text-white/50 mb-0.5 xs:mb-1 sm:mb-1.5" style={{ fontSize: 'clamp(0.6rem, 1.5vw, 1rem)' }}>
                  Total
                </p>
                <p className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-white truncate" style={{ fontSize: 'clamp(1rem, 3vw, 2.25rem)' }}>
                  {total}
                </p>
              </div>
              <div className="admin-stat-icon-bg rounded-lg xs:rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0 ml-1.5 xs:ml-2 sm:ml-3"
                style={{
                  height: 'clamp(2rem, 8vw, 3.5rem)',
                  width: 'clamp(2rem, 8vw, 3.5rem)',
                }}
              >
                <CalendarDays style={{ height: 'clamp(1rem, 4vw, 1.75rem)', width: 'clamp(1rem, 4vw, 1.75rem)' }} className="text-gray-400" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-2.5 xs:p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7 2xl:p-8">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm lg:text-base text-white/50 mb-0.5 xs:mb-1 sm:mb-1.5" style={{ fontSize: 'clamp(0.6rem, 1.5vw, 1rem)' }}>
                  Pendientes
                </p>
                <p className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-white truncate" style={{ fontSize: 'clamp(1rem, 3vw, 2.25rem)' }}>
                  {pending}
                </p>
              </div>
              <div className="admin-stat-icon-bg rounded-lg xs:rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0 ml-1.5 xs:ml-2 sm:ml-3"
                style={{ height: 'clamp(2rem, 8vw, 3.5rem)', width: 'clamp(2rem, 8vw, 3.5rem)' }}
              >
                <AlertCircle style={{ height: 'clamp(1rem, 4vw, 1.75rem)', width: 'clamp(1rem, 4vw, 1.75rem)' }} className="text-gray-400" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-2.5 xs:p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7 2xl:p-8">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm lg:text-base text-white/50 mb-0.5 xs:mb-1 sm:mb-1.5" style={{ fontSize: 'clamp(0.6rem, 1.5vw, 1rem)' }}>
                  Confirmadas
                </p>
                <p className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-white truncate" style={{ fontSize: 'clamp(1rem, 3vw, 2.25rem)' }}>
                  {confirmed}
                </p>
              </div>
              <div className="admin-stat-icon-bg rounded-lg xs:rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0 ml-1.5 xs:ml-2 sm:ml-3"
                style={{ height: 'clamp(2rem, 8vw, 3.5rem)', width: 'clamp(2rem, 8vw, 3.5rem)' }}
              >
                <Clock style={{ height: 'clamp(1rem, 4vw, 1.75rem)', width: 'clamp(1rem, 4vw, 1.75rem)' }} className="text-gray-400" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-2.5 xs:p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7 2xl:p-8">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm lg:text-base text-white/50 mb-0.5 xs:mb-1 sm:mb-1.5" style={{ fontSize: 'clamp(0.6rem, 1.5vw, 1rem)' }}>
                  Canceladas
                </p>
                <p className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-white truncate" style={{ fontSize: 'clamp(1rem, 3vw, 2.25rem)' }}>
                  {cancelled}
                </p>
              </div>
              <div className="admin-stat-icon-bg rounded-lg xs:rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0 ml-1.5 xs:ml-2 sm:ml-3"
                style={{ height: 'clamp(2rem, 8vw, 3.5rem)', width: 'clamp(2rem, 8vw, 3.5rem)' }}
              >
                <Users style={{ height: 'clamp(1rem, 4vw, 1.75rem)', width: 'clamp(1rem, 4vw, 1.75rem)' }} className="text-gray-400" />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Bloque principal - ULTRA RESPONSIVO */}
        <GlassCard className="p-2.5 xs:p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7 2xl:p-8">
          {/* Barra de búsqueda */}
          <GlassCard className="mb-4 sm:mb-5 md:mb-6 p-2.5 xs:p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7 2xl:p-8">
            <label className="mb-2 block text-xs sm:text-xs md:text-sm uppercase tracking-wide text-white/70">
              BUSCAR POR NOMBRE O TELÉFONO
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 xs:left-3 top-1/2 -translate-y-1/2 text-white/50" style={{ height: 'clamp(0.875rem, 2vw, 1rem)', width: 'clamp(0.875rem, 2vw, 1rem)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-full pl-8 xs:pl-9 sm:pl-10 pr-3 xs:pr-4 py-1.5 xs:py-2 sm:py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-lg xs:rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-white/20 transition-all"
                style={{ fontSize: 'clamp(0.813rem, 1.8vw, 1rem)' }}
              />
            </div>
          </GlassCard>

          {/* Filtros de búsqueda */}
          <div className="mb-4 sm:mb-5 md:mb-6 flex flex-col gap-3 sm:gap-4 md:flex-row md:items-end">
            <div className="flex-1 w-full md:w-auto">
              <label className="mb-1 block text-xs sm:text-xs md:text-sm uppercase tracking-wide text-white/70">
                Fecha
              </label>
              <div className="w-full">
                <DatePicker
                  value={filterDate}
                  onChange={(value) => setFilterDate(value)}
                  placeholder="dd/mm/aaaa"
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex-1 w-full md:w-auto">
              <label className="mb-1 block text-xs sm:text-xs md:text-sm uppercase tracking-wide text-white/70">
                Barbero
              </label>
              <CustomSelect
                value={filterBarber}
                onChange={(value) => setFilterBarber(value)}
                placeholder="Todos"
                options={[
                  { value: "", label: "Todos" },
                  ...barbers.map((b) => ({ value: b.id, label: b.name })),
                ]}
              />
            </div>

            <div className="flex-1 w-full md:w-auto">
              <label className="mb-1 block text-xs sm:text-xs md:text-sm uppercase tracking-wide text-white/70">
                Estado
              </label>
              <CustomSelect
                value={filterStatus}
                onChange={(value) => setFilterStatus(value)}
                placeholder="Todos"
                options={[
                  { value: "", label: "Todos" },
                  { value: "pendiente", label: "Pendiente" },
                  { value: "confirmada", label: "Confirmada" },
                  { value: "cancelada", label: "Cancelada" },
                ]}
              />
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleApplyFilters}
                className="rounded-xl px-3 sm:px-4 py-2 text-sm sm:text-sm font-semibold text-white shadow-lg transition active:scale-95 whitespace-nowrap"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.9) 0%, rgba(0, 122, 255, 1) 100%)',
                  boxShadow: '0 4px 14px rgba(0, 122, 255, 0.3)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 122, 255, 1) 0%, rgba(0, 81, 213, 1) 100%)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 122, 255, 0.9) 0%, rgba(0, 122, 255, 1) 100%)';
                }}
              >
                Aplicar
              </button>
              <div className="export-menu-container relative">
                <button
                  ref={exportButtonRef}
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-2 rounded-xl border border-white/15 px-3 sm:px-4 py-2 text-sm sm:text-sm text-white/80 transition active:scale-95 whitespace-nowrap backdrop-blur-xl"
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
                  }}
                >
                  <Download className="h-4 w-4" />
                  <span>Exportar</span>
                </button>

                {/* Dropdown de Exportación con Portal para evitar clipping */}
                {showExportMenu && typeof document !== 'undefined' && createPortal(
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="fixed z-[99999] w-64 rounded-2xl border border-white/20 shadow-[0_20px_70px_rgba(0,0,0,0.65)] overflow-hidden"
                      data-export-menu="true"
                      style={{
                        top: `${exportMenuPosition.top}px`,
                        left: `${exportMenuPosition.left}px`,
                        background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.12) 0%, rgba(0, 122, 255, 0.05) 50%, rgba(0, 0, 0, 0.6) 100%)',
                        backdropFilter: 'blur(40px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Selector de mes para exportación */}
                      <div className="px-5 py-4 border-b border-white/10">
                        <label className="block text-[10px] uppercase tracking-[0.15em] text-white/50 mb-3 font-semibold">
                          Filtrar por mes (opcional)
                        </label>
                        <MonthPicker
                          value={exportMonthFilter}
                          onChange={(value) => setExportMonthFilter(value)}
                        />
                        {exportMonthFilter && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExportMonthFilter('');
                            }}
                            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-[11px] font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all duration-200 active:scale-[0.98]"
                          >
                            <X className="h-3 w-3" />
                            <span>Limpiar mes</span>
                          </button>
                        )}
                      </div>

                      <div className="p-1.5">
                        <button
                          onClick={handleExportCSV}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/10 hover:text-white rounded-xl transition-all group"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 border border-green-500/20 group-hover:scale-110 transition-transform">
                            <Download className="h-4 w-4 text-green-400" />
                          </div>
                          <span className="font-medium">Exportar a CSV / Excel</span>
                        </button>
                        <button
                          onClick={handleExportPDF}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/10 hover:text-white rounded-xl transition-all group"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20 group-hover:scale-110 transition-transform">
                            <Download className="h-4 w-4 text-red-400" />
                          </div>
                          <span className="font-medium">Exportar a PDF</span>
                        </button>
                      </div>
                    </motion.div>
                  </AnimatePresence>,
                  document.body
                )}
              </div>
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  setSearchQuery("");
                  await handleClearFilters();
                }}
                type="button"
                className="rounded-xl border border-white/15 px-3 sm:px-4 py-2 text-sm sm:text-sm text-white/80 transition active:scale-95 whitespace-nowrap backdrop-blur-xl"
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
                }}
              >
                Limpiar
              </button>
            </div>
          </div>

          {/* Selector de Vista - Tabla/Calendario */}
          <div className="flex justify-end gap-2 mb-4">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition ${viewMode === 'table'
                ? 'bg-blue-500/30 border border-blue-500/40 text-white'
                : 'border border-white/15 bg-black/30 text-white/70 hover:bg-white/10'
                }`}
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Tabla</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition ${viewMode === 'calendar'
                ? 'bg-blue-500/30 border border-blue-500/40 text-white'
                : 'border border-white/15 bg-black/30 text-white/70 hover:bg-white/10'
                }`}
            >
              <Grid3x3 className="h-4 w-4" />
              <span className="hidden sm:inline">Calendario</span>
            </button>
          </div>

          {/* Calendario Visual - VISIBLE */}
          {viewMode === 'calendar' && !loading && !error && (
            <div className="mb-6">
              <GlassCard className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  Vista de Calendario
                </h3>
                <CalendarView reservations={filteredAndSortedReservations} />
              </GlassCard>
            </div>
          )}

          {/* Tabla de reservas - Responsive: Cards en móvil, tabla en desktop */}
          {viewMode === 'table' && loading && (
            <div className="py-8 sm:py-12 text-center">
              <div className="inline-block h-6 w-6 sm:h-8 sm:w-8 border-2 sm:border-4 border-white/30 border-t-transparent rounded-full animate-spin mb-3 sm:mb-4"></div>
              <p className="text-sm sm:text-sm text-white/50">Cargando reservas…</p>
            </div>
          )}
          {error && (
            <div className="rounded-2xl bg-gray-500/10 backdrop-blur-xl border border-gray-500/20 text-gray-200 px-4 py-3 text-sm sm:text-sm">
              {error}
            </div>
          )}

          {viewMode === 'table' && !loading && !error && filteredAndSortedReservations.length === 0 && (
            <GlassCard className="p-8 sm:p-12 text-center">
              <p className="text-sm sm:text-sm text-white/50">
                {searchQuery.trim()
                  ? "No se encontraron reservas con la búsqueda ingresada."
                  : "No hay reservas con los filtros seleccionados."}
              </p>
            </GlassCard>
          )}

          {viewMode === 'table' && !loading && !error && filteredAndSortedReservations.length > 0 && (
            <>
              {/* Vista de cards para móvil/tablet */}
              <div className="lg:hidden space-y-3 sm:space-y-4">
                {filteredAndSortedReservations.map((r) => (
                  <GlassCard key={r.id} className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs text-white/40">ID: {r.id}</span>
                          <span
                            className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[r.status] || "bg-gray-500/20"
                              }`}
                          >
                            {STATUS_LABELS[r.status] || r.status}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-base font-semibold text-white mb-1 truncate">
                          {r.customer_name || "Cliente sin nombre"}
                        </h3>
                        {r.customer_phone && (
                          <p className="text-sm text-white/70">{r.customer_phone}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setOpenActionsId(r.id)}
                        className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs sm:text-xs font-semibold text-white/80 transition hover:bg-white/10 active:scale-95 whitespace-nowrap"
                      >
                        <Settings2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        <span className="hidden sm:inline">Acciones</span>
                        <span className="sm:hidden">Acciones</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:gap-3 text-sm sm:text-sm">
                      <div>
                        <span className="text-white/50">Fecha: </span>
                        <span className="text-white/70">
                          {parseDate(r.date).toLocaleDateString("es-SV", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/50">Hora: </span>
                        <span className="text-white/70 font-mono">{r.time}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-white/50">Servicio: </span>
                        <span className="text-white/70">{r.service_label || r.service_name || r.service_id}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-white/50">Barbero: </span>
                        <span className="text-white/70">{r.barber_name || r.barber_id || "Cualquiera"}</span>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>

              {/* Vista de tabla para desktop */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-200">
                  <thead className="bg-white/5 text-xs uppercase text-gray-400">
                    <tr>
                      <th className="px-3 py-2 whitespace-nowrap">ID</th>
                      <th className="px-3 py-2 whitespace-nowrap">Fecha</th>
                      <th className="px-3 py-2 whitespace-nowrap">Hora</th>
                      <th className="px-3 py-2 whitespace-nowrap">Servicio / Promo</th>
                      <th className="px-3 py-2 whitespace-nowrap">Barbero</th>
                      <th className="px-3 py-2 whitespace-nowrap">Cliente</th>
                      <th className="px-3 py-2 whitespace-nowrap">Teléfono</th>
                      <th className="px-3 py-2 whitespace-nowrap">Estado</th>
                      <th className="px-3 py-2 text-right whitespace-nowrap">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredAndSortedReservations.map((r) => (
                      <tr key={r.id} className="hover:bg-white/5">
                        <td className="px-3 py-2 text-xs text-gray-400">
                          {r.id}
                        </td>
                        <td className="px-3 py-2">
                          {parseDate(r.date).toLocaleDateString("es-SV", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-3 py-2 font-mono">{r.time}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-semibold text-white">
                              {r.service_label || r.service_name || r.service_id}
                            </span>

                            {(r.service_type || r.service_price_label) && (
                              <span className="text-[11px] text-blue-200">
                                {r.service_type}
                                {r.service_type && r.service_price_label
                                  ? " • "
                                  : ""}
                                {r.service_price_label}
                              </span>
                            )}

                            {r.service_detail && (
                              <span className="text-[11px] text-neutral-400">
                                {r.service_detail}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {r.barber_name || r.barber_id || "Cualquiera"}
                        </td>
                        <td className="px-3 py-2">
                          {r.customer_name || "-"}
                        </td>
                        <td className="px-3 py-2">
                          {r.customer_phone || "-"}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-block rounded-full border px-2 py-1 text-xs font-semibold ${STATUS_COLORS[r.status] || "bg-gray-500/20"
                              }`}
                          >
                            {STATUS_LABELS[r.status] || r.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <button
                            onClick={() => setOpenActionsId(r.id)}
                            className="
                            inline-flex items-center gap-2
                            rounded-full border border-white/20
                            bg-white/5 px-4 py-2
                            text-xs font-bold text-white/80
                            transition hover:bg-white/10
                            active:scale-95
                            whitespace-nowrap
                          "
                          >
                            <Settings2 className="h-4 w-4 flex-shrink-0" />
                            <span>Acciones</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </GlassCard>

        {/* Agenda rápida: hoy y mañana - iOS style estandarizado */}
        <div className="mt-4 sm:mt-5 md:mt-6 lg:mt-8 grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
          {/* Hoy */}
          <GlassCard className="p-5 sm:p-6 md:p-8"
            style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)',
            }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 backdrop-blur-xl border border-blue-500/20 shadow-lg shadow-blue-500/10">
                  <CalendarDays className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Agenda de hoy
                  </h3>
                  <p className="text-[10px] uppercase tracking-widest text-blue-400/80 font-bold">
                    {new Date().toLocaleDateString("es-SV", { weekday: "long" })}
                  </p>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] sm:text-xs text-white/50 font-medium">
                {new Date().toLocaleDateString("es-SV", { day: "2-digit", month: "2-digit" })}
              </div>
            </div>

            {todaysReservations.length === 0 ? (
              <div className="py-6 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
                <p className="text-xs sm:text-sm text-white/30">Sin reservas para hoy</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {todaysReservations.map((r) => (
                  <li
                    key={`today-${r.id}`}
                    className="group flex items-center justify-between gap-3 rounded-2xl bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/5 hover:border-white/15 px-4 py-3 transition-all duration-300"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-white">{r.time}</span>
                        <span className="h-1 w-1 rounded-full bg-blue-500/50"></span>
                        <span className="text-xs font-medium text-white/80 truncate">
                          {r.customer_name || "Cliente"}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/50 truncate flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
                        {r.service_label || r.service_name}
                      </p>
                    </div>
                    <div className={`h-2 w-2 rounded-full ${STATUS_COLORS[r.status]?.split(' ')[0] || 'bg-gray-500'}`}></div>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>

          {/* Mañana */}
          <GlassCard className="p-5 sm:p-6 md:p-8"
            style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)',
            }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/10 backdrop-blur-xl border border-purple-500/20 shadow-lg shadow-purple-500/10">
                  <CalendarDays className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Agenda de mañana
                  </h3>
                  <p className="text-[10px] uppercase tracking-widest text-purple-400/80 font-bold">
                    {(() => {
                      const tm = new Date();
                      tm.setDate(tm.getDate() + 1);
                      return tm.toLocaleDateString("es-SV", { weekday: "long" });
                    })()}
                  </p>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] sm:text-xs text-white/50 font-medium">
                {(() => {
                  const tm = new Date();
                  tm.setDate(tm.getDate() + 1);
                  return tm.toLocaleDateString("es-SV", { day: "2-digit", month: "2-digit" });
                })()}
              </div>
            </div>

            {tomorrowsReservations.length === 0 ? (
              <div className="py-6 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
                <p className="text-xs sm:text-sm text-white/30">Sin reservas para mañana</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {tomorrowsReservations.map((r) => (
                  <li
                    key={`tomorrow-${r.id}`}
                    className="group flex items-center justify-between gap-3 rounded-2xl bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/5 hover:border-white/15 px-4 py-3 transition-all duration-300"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-white">{r.time}</span>
                        <span className="h-1 w-1 rounded-full bg-purple-500/50"></span>
                        <span className="text-xs font-medium text-white/80 truncate">
                          {r.customer_name || "Cliente"}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/50 truncate flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
                        {r.service_label || r.service_name}
                      </p>
                    </div>
                    <div className={`h-2 w-2 rounded-full ${STATUS_COLORS[r.status]?.split(' ')[0] || 'bg-gray-500'}`}></div>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </div>

        {/* Pop-up de acciones sobre una reserva - Estilo estandarizado premium */}
        {openActionsId && selectedReservation && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none p-4">
            {/* Backdrop oscuro */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
              onClick={() => setOpenActionsId(null)}
            />

            <div
              className="pointer-events-auto relative z-10 mx-4 w-full max-w-md rounded-[26px] border border-white/20 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.65)]"
              style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
                backdropFilter: 'blur(50px) saturate(200%)',
                WebkitBackdropFilter: 'blur(50px) saturate(200%)',
              }}
            >
              {/* Encabezado del modal */}
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.20em] text-[#9CA3AF] mb-1">
                    Acciones de reserva
                  </p>
                  <p className="text-sm font-medium text-white">
                    #{selectedReservation.id} · {selectedReservation.time}
                  </p>
                </div>
                <button
                  onClick={() => setOpenActionsId(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
                >
                  <X className="h-4 w-4 text-white/80" />
                </button>
              </div>

              {/* Información de la reserva - Superficie unificada */}
              <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4 transition-all">
                <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                  <p className="text-[10px] text-[#9CA3AF] uppercase font-medium">Cliente</p>
                  <p className="text-xs text-white font-semibold text-right truncate">{selectedReservation.customer_name}</p>
                  <p className="text-[10px] text-[#9CA3AF] uppercase font-medium">Servicio</p>
                  <p className="text-xs text-white font-semibold text-right truncate">
                    {selectedReservation.service_label || selectedReservation.service_name}
                  </p>
                  <p className="text-[10px] text-[#9CA3AF] uppercase font-medium">Fecha</p>
                  <p className="text-xs text-white font-semibold text-right">{selectedReservation.date}</p>
                </div>
              </div>

              {/* Acciones de estado - Slate Gradient Style */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => {
                    handleStatusChange(selectedReservation.id, 'pendiente');
                    setOpenActionsId(null);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-700/40 text-sm font-medium text-white shadow-lg shadow-slate-800/30 hover:shadow-xl hover:shadow-slate-700/40 transition-all duration-200 active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.7) 0%, rgba(30, 41, 59, 0.8) 100%)' }}
                >
                  Marcar como pendiente
                </button>
                <button
                  onClick={() => {
                    handleStatusChange(selectedReservation.id, 'confirmada');
                    setOpenActionsId(null);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-blue-500/40 text-sm font-medium text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.8) 0%, rgba(0, 122, 255, 1) 100%)' }}
                >
                  Confirmar reserva
                </button>
                <button
                  onClick={() => {
                    handleStatusChange(selectedReservation.id, 'cancelada');
                    setOpenActionsId(null);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-red-500/40 text-sm font-medium text-white shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/30 transition-all duration-200 active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.7) 0%, rgba(185, 28, 28, 0.8) 100%)' }}
                >
                  Cancelar reserva
                </button>
              </div>

              {/* Separador y Zona de Peligro */}
              <div className="h-px bg-white/10 mb-4" />
              <div className="text-center">
                <p className="text-[10px] text-white/40 mb-3 uppercase tracking-widest font-medium">Zona de peligro</p>
                <button
                  onClick={() => {
                    handleDeleteReservation(selectedReservation.id);
                    setOpenActionsId(null);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-700/40 text-sm font-bold text-white shadow-lg shadow-slate-800/30 hover:shadow-xl hover:shadow-slate-700/40 transition-all duration-200 ease-out active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 1) 100%)',
                  }}
                >
                  Eliminar permanentemente
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
