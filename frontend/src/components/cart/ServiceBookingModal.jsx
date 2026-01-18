/**
 * @fileoverview Modal para seleccionar barbero, fecha y hora al agregar servicio/promoción
 * @module components/cart/ServiceBookingModal
 * 
 * He implementado este componente para recopilar información de reserva
 * cuando se agrega un servicio o promoción al carrito.
 */

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Calendar, Clock, User } from "lucide-react";
import { motion } from "framer-motion";
import GlassCard from "../ui/GlassCard";
import { API_BASE_URL } from "../../config/api";
import { formatDate, TIME_SLOTS, getFutureDates } from "../../data/mock";

/**
 * Modal para seleccionar barbero, fecha y hora
 */
export default function ServiceBookingModal({
  isOpen,
  onClose,
  onConfirm,
  service,
  serviceType, // 'service' o 'offer'
}) {
  const [barbers, setBarbers] = useState([]);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const availableDates = getFutureDates(7);
  const availableTimeSlots = TIME_SLOTS;

  // Cargar barberos
  useEffect(() => {
    if (!isOpen) return;

    const fetchBarbers = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/barbers`);
        if (res.ok) {
          const data = await res.json();
          const barbersData = Array.isArray(data) ? data : (data.data || []);
          setBarbers(barbersData.filter(b => b.is_active !== false));
        }
      } catch (error) {
        console.error("Error al cargar barberos:", error);
      }
    };

    fetchBarbers();
  }, [isOpen]);

  // Cargar reservas cuando se selecciona fecha
  useEffect(() => {
    // Solo necesitamos la fecha para empezar a filtrar
    if (!selectedDate) {
      setReservations([]);
      return;
    }

    const fetchReservations = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append("date", selectedDate);

        // Si hay barbero específico, lo pasamos para filtrar en el backend
        if (selectedBarber?.id) {
          params.append("barberId", selectedBarber.id);
        }

        const res = await fetch(`${API_BASE_URL}/reservations?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          const reservationsData = Array.isArray(data) ? data : (data.data || []);
          // Solo nos interesan las que NO están canceladas
          setReservations(reservationsData.filter(r => r.status !== 'cancelada'));
        }
      } catch (error) {
        console.error("Error al cargar reservas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReservations();
  }, [selectedDate, selectedBarber?.id]);

  // Filtrar horarios disponibles
  const getAvailableTimes = () => {
    if (!selectedDate) return availableTimeSlots;

    return availableTimeSlots.filter(time => {
      // Buscamos reservas en este horario específico
      const reservationsAtTime = reservations.filter(r => r.time === time);

      if (selectedBarber) {
        // Si hay barbero seleccionado: está ocupado si él tiene una reserva
        // O si hay una reserva sin barbero asignado (que bloquea a todos)
        const isOccupied = reservationsAtTime.some(r =>
          r.barber_id === selectedBarber.id || r.barber_id === null
        );
        return !isOccupied;
      } else {
        // Si es "Cualquiera": el horario está disponible si el número de reservas
        // activas es menor que el total de barberos.
        // Cada reserva (específica o general) ocupa "un espacio".
        return reservationsAtTime.length < barbers.length;
      }
    });
  };

  const handleConfirm = () => {
    if (!selectedDate || !selectedTime) {
      setError("Debes seleccionar fecha y hora");
      return;
    }

    onConfirm({
      barber: selectedBarber,
      date: selectedDate,
      time: selectedTime,
    });
  };

  const handleClose = () => {
    setSelectedBarber(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setReservations([]);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[10002] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
        style={{ zIndex: 10002 }}
      />

      {/* Modal wrapper */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative z-10 w-full max-w-2xl max-h-[92vh] sm:max-h-[85vh] overflow-hidden sm:rounded-[32px] mx-auto border-t sm:border border-white/20 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 10003 }}
      >
        <GlassCard className="bg-black/60 backdrop-blur-3xl p-0 flex flex-col h-full overflow-hidden">
          {/* Header - Fixed */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-[#facc6b]/10 border border-[#facc6b]/20">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-[#facc6b]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-semibold text-white leading-tight truncate">
                  {serviceType === 'service' ? 'Agendar Servicio' : 'Agendar Promoción'}
                </h3>
                <p className="text-xs sm:text-sm text-white/50 truncate mt-0.5">{service?.name}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 active:scale-90 transition-all"
            >
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar scroll-smooth">
            {/* Selección de barbero */}
            <section>
              <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-white/40 mb-4 flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
                <span>Elegir Profesional</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedBarber(null)}
                  className={`p-3 sm:p-4 rounded-2xl border transition-all duration-200 text-left ${selectedBarber === null
                    ? "bg-[#facc6b]/10 border-[#facc6b] text-white ring-1 ring-[#facc6b]"
                    : "bg-white/5 border-white/10 text-white/60 hover:border-white/20 hover:bg-white/10"
                    }`}
                >
                  <p className="text-xs sm:text-sm font-semibold truncate">Cualquiera</p>
                  <p className="text-[10px] opacity-50 truncate mt-1">Primero disponible</p>
                </button>
                {barbers.map((barber) => (
                  <button
                    key={barber.id}
                    onClick={() => setSelectedBarber(barber)}
                    className={`p-3 sm:p-4 rounded-2xl border transition-all duration-200 text-left ${selectedBarber?.id === barber.id
                      ? "bg-[#facc6b]/10 border-[#facc6b] text-white ring-1 ring-[#facc6b]"
                      : "bg-white/5 border-white/10 text-white/60 hover:border-white/20 hover:bg-white/10"
                      }`}
                  >
                    <p className="text-xs sm:text-sm font-semibold truncate">{barber.name}</p>
                    <p className="text-[10px] opacity-50 truncate mt-1">{barber.specialty || 'Barbero'}</p>
                  </button>
                ))}
              </div>
            </section>

            {/* Selección de fecha */}
            <section>
              <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-white/40 mb-4 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>Seleccionar Fecha</span>
              </label>
              <div className="flex overflow-x-auto gap-3 pb-2 -mx-2 px-2 custom-scrollbar snap-x">
                {availableDates.map((date) => {
                  const [weekday, rest] = formatDate(date).split(",");
                  const isSelected = selectedDate === date;
                  return (
                    <button
                      key={date}
                      onClick={() => {
                        setSelectedDate(date);
                        setSelectedTime(null);
                      }}
                      className={`flex-shrink-0 min-w-[100px] sm:min-w-[120px] p-3 sm:p-4 rounded-2xl border transition-all duration-200 snap-center text-center ${isSelected
                        ? "bg-white text-black border-white shadow-xl shadow-white/10"
                        : "bg-white/5 border-white/10 text-white/70 hover:border-white/20"
                        }`}
                    >
                      <span className="text-[10px] font-semibold block uppercase tracking-wider mb-1">
                        {weekday}
                      </span>
                      <span className="text-sm font-semibold block">
                        {rest.trim()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Selección de hora */}
            {selectedDate && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-white/40 mb-4 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Horarios Disponibles</span>
                </label>
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-6 h-6 border-2 border-[#facc6b]/20 border-t-[#facc6b] rounded-full animate-spin" />
                    <p className="text-xs text-white/40 font-medium">Actualizando disponibilidad...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                    {getAvailableTimes().map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`py-3 sm:py-2.5 rounded-xl border text-xs sm:text-sm font-mono transition-all duration-200 ${selectedTime === time
                          ? "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20 font-bold scale-[1.05]"
                          : "bg-white/5 border-white/10 text-white/60 hover:border-white/20 hover:bg-white/10"
                          }`}
                      >
                        {time}
                      </button>
                    ))}
                    {getAvailableTimes().length === 0 && (
                      <div className="col-span-full py-10 px-6 text-center rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-sm text-white/40">No hay turnos disponibles para este día</p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {error && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium animate-in zoom-in-95">
                {error}
              </div>
            )}

            {/* Espaciado extra para el footer en desktop si es necesario */}
            <div className="h-4 sm:hidden" />
          </div>

          {/* Footer - Fixed */}
          <div className="p-4 sm:p-6 sm:px-8 border-t border-white/10 bg-black/40 backdrop-blur-xl shrink-0 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleClose}
              className="order-2 sm:order-1 flex-1 py-3.5 sm:py-4 rounded-2xl transition-all font-semibold text-sm text-white/60 hover:text-white hover:bg-white/5 active:scale-95"
            >
              Cerrar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedDate || !selectedTime}
              className="order-1 sm:order-2 flex-[2] py-3.5 sm:py-4 rounded-2xl bg-[#facc6b] text-black font-bold text-sm sm:text-base shadow-xl shadow-[#facc6b]/20 hover:shadow-[#facc6b]/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale disabled:scale-100 disabled:shadow-none"
            >
              Completar Reserva
            </button>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
}





