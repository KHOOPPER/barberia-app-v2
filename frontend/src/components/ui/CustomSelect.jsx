/**
 * @fileoverview Componente de select personalizado estilo iOS
 * @module components/ui/CustomSelect
 * 
 * He implementado este componente para reemplazar los select nativos
 * y poder aplicar completamente el diseño iOS translúcido con esquinas redondeadas.
 */

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Componente de select personalizado
 */
export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = "Seleccionar...",
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
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

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={selectRef} className={`relative ${className}`}>
      {/* Botón del select */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full text-left
          flex items-center justify-between
          appearance-none
          -webkit-appearance-none
          -moz-appearance-none
          backdrop-blur-[20px]
          border
          ${isOpen ? 'border-[#007AFF]/80' : 'border-white/20'}
          rounded-xl
          px-3 py-2.5
          text-sm text-white
          outline-none
          transition-all duration-200
          cursor-pointer
          hover:border-[#007AFF]/50
          focus:border-[#007AFF]/80 focus:ring-2 focus:ring-[#007AFF]/15
        `}
        style={{
          background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.08) 0%, rgba(0, 122, 255, 0.02) 50%, rgba(0, 0, 0, 0.4) 100%)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        }}
      >
        <span className={selectedOption ? "text-white" : "text-white/60"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[#007AFF] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Menú desplegable */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-1"
          >
            <div className="backdrop-blur-3xl border border-white/20 rounded-xl shadow-2xl overflow-hidden"
              style={{
                background: 'rgba(15, 23, 42, 0.98)',
                backdropFilter: 'blur(80px) saturate(180%)',
                WebkitBackdropFilter: 'blur(80px) saturate(180%)',
              }}
            >
              {options.map((option, index) => (
                <button
                  key={option.value || index}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`
                    w-full px-4 py-3 text-left text-sm text-white
                    transition-colors duration-150
                    ${
                      value === option.value
                        ? "bg-[#007AFF]/20 text-[#007AFF] font-semibold"
                        : "hover:bg-white/5"
                    }
                    ${index !== options.length - 1 ? "border-b border-white/10" : ""}
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

