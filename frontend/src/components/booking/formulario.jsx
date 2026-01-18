import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Calendar, User, Clock, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "../ui/GlassCard";
import { formatDate } from "../../data/mock";

export default function FormularioCita({
  isOpen,
  onClose,
  onConfirm,
  service,
  barber,
  date,
  time,
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const isSpecialOffer = !!service?.badge || !!service?.slug;
  const priceLabel =
    service?.price !== undefined && service?.price !== null
      ? String(service.price).startsWith("-")
        ? String(service.price)
        : `$${service.price}`
      : null;

  const validate = () => {
    const newErrors = {};

    // Nombre
    if (!customerName.trim()) {
      newErrors.name = "Ingresa tu nombre";
    }

    // Teléfono salvadoreño: 8 dígitos, comienza en 2, 6 o 7
    const trimmedPhone = customerPhone.trim();

    if (!trimmedPhone) {
      newErrors.phone = "Ingresa tu número de WhatsApp";
    } else if (!/^[267][0-9]{7}$/.test(trimmedPhone)) {
      newErrors.phone =
        "Número inválido. Debe ser salvadoreño (8 dígitos, empieza en 2, 6 o 7)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;

    try {
      setSubmitting(true);
      await onConfirm({
        name: customerName.trim(),
        phone: customerPhone.trim(),
      });
    } catch (error) {
      // El error ya se maneja en el componente padre
      console.error("Error al confirmar reserva:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const content = (
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 overflow-hidden">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        style={{ zIndex: 10002 }}
      />

      {/* Modal Wrapper */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative z-[10003] w-full max-w-lg max-h-[92vh] sm:max-h-[85vh] overflow-hidden sm:rounded-[32px] mx-auto border-t sm:border border-white/20 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <GlassCard className="bg-black/60 backdrop-blur-3xl p-0 flex flex-col h-full overflow-hidden">
          {/* Header - Fixed */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-[#facc6b]/10 border border-[#facc6b]/20">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-[#facc6b]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-semibold text-white leading-tight truncate">
                  Confirmar Reserva
                </h3>
                <p className="text-xs sm:text-sm text-white/50 truncate mt-0.5">Último paso</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 active:scale-90 transition-all"
            >
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar scroll-smooth">
            {/* Resumen de la cita */}
            <section>
              <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-white/40 mb-3 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>Resumen de Cita</span>
              </label>
              <div className="text-left bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-xs text-white/50">Servicio:</span>
                  <span className="text-sm font-semibold text-white">{service?.name || "Sin especificar"}</span>
                </div>

                {isSpecialOffer && (
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-xs text-white/50">Tipo:</span>
                    <span className="text-[11px] font-semibold text-[#facc6b] uppercase tracking-wider">
                      Oferta {service?.badge ? `(${service.badge})` : ""}
                    </span>
                  </div>
                )}

                {priceLabel && (
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-xs text-white/50">Precio:</span>
                    <span className="text-sm font-bold text-[#facc6b]">{priceLabel}</span>
                  </div>
                )}

                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-xs text-white/50 text-left">
                    <User className="inline w-3 h-3 mr-1 opacity-50" /> Profesional:
                  </span>
                  <span className="text-sm font-semibold text-white">{barber ? barber.name : "Cualquiera"}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-xs text-white/50">
                    <Calendar className="inline w-3 h-3 mr-1 opacity-50" /> Fecha:
                  </span>
                  <span className="text-sm font-semibold text-white">{date ? formatDate(date) : "Sin fecha"}</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-xs text-white/50">
                    <Clock className="inline w-3 h-3 mr-1 opacity-50" /> Hora:
                  </span>
                  <span className="text-sm font-semibold text-white">{time || "Sin hora"}</span>
                </div>
              </div>
            </section>

            {/* Formulario */}
            <form id="booking-form" onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-white/40 mb-2 flex items-center gap-2">
                    <User className="w-3.5 h-3.5" />
                    <span>Nombre completo</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ej: Javier Centeno"
                    className="w-full rounded-2xl bg-white/5 border border-white/10 focus:border-[#facc6b]/50 focus:bg-white/10 focus:ring-4 focus:ring-[#facc6b]/10 text-sm text-white px-4 py-3 placeholder:text-white/20 transition-all outline-none"
                  />
                  {errors.name && (
                    <p className="text-red-400 text-[10px] mt-2 font-medium flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-red-400" /> {errors.name}
                    </p>
                  )}
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-white/40 mb-2 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="70000000"
                    maxLength={8}
                    className="w-full rounded-2xl bg-white/5 border border-white/10 focus:border-[#facc6b]/50 focus:bg-white/10 focus:ring-4 focus:ring-[#facc6b]/10 text-sm text-white px-4 py-3 placeholder:text-white/20 transition-all outline-none"
                  />
                  {errors.phone && (
                    <p className="text-red-400 text-[10px] mt-2 font-medium flex items-center gap-1 leading-relaxed">
                      <span className="h-1 w-1 rounded-full bg-red-400 shrink-0" /> {errors.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#facc6b]/5 border border-[#facc6b]/10">
                <p className="text-[11px] text-white/60 leading-relaxed text-center">
                  Al confirmar, se registrará la cita como{" "}
                  <span className="font-semibold text-[#facc6b]">pendiente</span> y
                  se abrirá WhatsApp para finalizar la reserva.
                </p>
              </div>
            </form>
          </div>

          {/* Footer - Fixed */}
          <div className="p-4 sm:p-6 border-t border-white/10 bg-black/40 backdrop-blur-md shrink-0 space-y-3">
            <button
              type="submit"
              form="booking-form"
              disabled={submitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#facc6b] to-[#eab308] text-black font-bold text-sm shadow-xl shadow-[#facc6b]/20 hover:shadow-[#facc6b]/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {submitting ? "Guardando cita..." : "Confirmar y abrir WhatsApp"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 text-xs font-semibold transition-all"
            >
              Modificar cita
            </button>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(<AnimatePresence>{isOpen && content}</AnimatePresence>, document.body)
    : null;
}
