/**
 * @fileoverview Modal de alerta personalizado con estilo glassmorphism
 * @module components/ui/AlertModal
 */

import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, CheckCircle, Info } from "lucide-react";
import GlassCard from "./GlassCard";

/**
 * Componente de alerta modal personalizado
 * @param {boolean} isOpen - Si el modal está abierto
 * @param {function} onClose - Función para cerrar el modal
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de alerta: 'error', 'success', 'warning', 'info'
 * @param {string} title - Título opcional del modal
 */
export default function AlertModal({ isOpen, onClose, message, type = "error", title = null }) {
  const icons = {
    error: <AlertCircle className="w-6 h-6 text-red-400" />,
    success: <CheckCircle className="w-6 h-6 text-emerald-400" />,
    warning: <AlertCircle className="w-6 h-6 text-yellow-400" />,
    info: <Info className="w-6 h-6 text-blue-400" />,
  };

  const icon = icons[type] || icons.error;

  const defaultTitles = {
    error: "Error",
    success: "Éxito",
    warning: "Advertencia",
    info: "Información",
  };

  const modalTitle = title || defaultTitles[type];

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[99998] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <GlassCard className="bg-black/60 backdrop-blur-2xl border border-white/20 p-6 md:p-7 rounded-3xl shadow-2xl max-w-md w-full">
              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 mt-0.5">{icon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg md:text-xl font-bold text-white mb-2">
                    {modalTitle}
                  </h3>
                  <p className="text-sm md:text-base text-white/80 whitespace-pre-line">
                    {message}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="flex-shrink-0 p-1.5 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white/70 hover:text-white" />
                </button>
              </div>

              {/* Botón de acción */}
              <div className="flex justify-end mt-6">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-full bg-[#facc6b] text-black font-semibold hover:bg-[#facc6b]/90 transition-colors"
                >
                  Aceptar
                </button>
              </div>
            </GlassCard>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
