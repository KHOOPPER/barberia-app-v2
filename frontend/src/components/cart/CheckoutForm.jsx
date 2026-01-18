/**
 * @fileoverview Formulario de checkout con datos de facturación
 * @module components/cart/CheckoutForm
 * 
 * He implementado este componente para recopilar los datos necesarios
 * para la factura antes de completar el pedido por WhatsApp.
 */

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import GlassCard from "../ui/GlassCard";

/**
 * Componente de formulario de checkout
 */
export default function CheckoutForm({ 
  isOpen, 
  onClose, 
  onConfirm, 
  cartItems = [],
  subtotal = 0,
  total,
  discountApplied,
  discountAmount,
  discountCode = ""
}) {
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  /**
   * Valida el formulario
   */
  const validate = () => {
    const newErrors = {};

    // Nombre es requerido
    if (!formData.customerName.trim()) {
      newErrors.customerName = "El nombre es requerido";
    }

    // Teléfono es requerido y debe ser válido (8 dígitos salvadoreño)
    if (!formData.customerPhone.trim()) {
      newErrors.customerPhone = "El teléfono es requerido";
    } else if (!/^[267][0-9]{7}$/.test(formData.customerPhone.trim())) {
      newErrors.customerPhone = "Número inválido. Debe ser salvadoreño (8 dígitos, empieza en 2, 6 o 7)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Maneja el envío del formulario
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onConfirm(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Maneja cambios en los inputs
   */
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  if (!isOpen) return null;

  const formContent = (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        style={{ zIndex: 10002 }}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative z-10 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 10003 }}
      >
        <GlassCard className="bg-black/60 backdrop-blur-2xl border border-white/20 p-6 md:p-7 rounded-3xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-[#facc6b]" />
              <h3 className="text-xl md:text-2xl font-bold text-white">
                Datos de Facturación
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Lista de productos */}
          {cartItems.length > 0 && (
            <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10 max-h-60 overflow-y-auto">
              <h4 className="text-sm font-semibold text-white mb-3">Items en el carrito:</h4>
              <div className="space-y-2">
                {cartItems.map((item, index) => {
                  const itemType = item.type === "product" 
                    ? "Producto" 
                    : item.type === "service"
                    ? "Servicio"
                    : "Promoción";
                  
                  return (
                    <div key={item.itemKey || `${item.type}-${item.id}-${index}`} className="flex items-center justify-between text-sm">
                      <div className="flex-1">
                        <span className="text-white/80">{item.name}</span>
                        <span className="text-white/50 ml-2">({itemType})</span>
                        {item.bookingData && (
                          <div className="text-xs text-white/50 mt-1">
                            📅 {item.bookingData.date} 🕐 {item.bookingData.time}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">
                          ${(item.price * item.quantity).toFixed(2)}
                        </div>
                        <div className="text-xs text-white/50">
                          {item.quantity} x ${item.price.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resumen del total */}
          <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm uppercase tracking-[0.15em] text-white/60">
                  Subtotal
                </span>
                <span className="text-lg font-semibold text-white">
                  ${subtotal.toFixed(2)}
                </span>
              </div>
              {discountApplied && (
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div>
                    <span className="text-xs text-emerald-400">
                      Descuento ({discountCode})
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-emerald-400">
                    -${discountAmount.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-white/20">
                <span className="text-sm uppercase tracking-[0.15em] text-white/60">
                  Total a pagar
                </span>
                <span className="text-2xl font-bold text-[#facc6b]">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre completo */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-white/70 mb-2">
                Nombre completo *
              </label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => handleChange("customerName", e.target.value)}
                placeholder="Ej: Juan Pérez"
                className="w-full rounded-xl bg-white/10 border border-white/20 focus:border-[#facc6b] focus:ring-2 focus:ring-[#facc6b]/30 text-sm text-white px-4 py-3 placeholder:text-white/40"
              />
              {errors.customerName && (
                <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.customerName}
                </p>
              )}
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-white/70 mb-2">
                Teléfono / WhatsApp *
              </label>
              <input
                type="tel"
                value={formData.customerPhone}
                onChange={(e) => handleChange("customerPhone", e.target.value)}
                placeholder="70000000"
                maxLength={8}
                className="w-full rounded-xl bg-white/10 border border-white/20 focus:border-[#facc6b] focus:ring-2 focus:ring-[#facc6b]/30 text-sm text-white px-4 py-3 placeholder:text-white/40"
              />
              {errors.customerPhone && (
                <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.customerPhone}
                </p>
              )}
            </div>

            <p className="text-xs text-white/50">
              * Campos requeridos para procesar tu pedido.
            </p>

            {/* Botones */}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-full bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/20 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-full bg-[#facc6b] text-black font-semibold hover:bg-[#facc6b]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    Continuar a WhatsApp
                  </>
                )}
              </button>
            </div>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' 
    ? createPortal(formContent, document.body)
    : null;
}

