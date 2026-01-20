/**
 * @fileoverview Componente para gestionar códigos de descuento
 * @module components/admin/DiscountCodesManager
 */

import { useState, useEffect } from "react";
import { Edit2, Trash2, X, Save } from "lucide-react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "../ui/GlassCard";
import DatePicker from "../ui/DatePicker";
import { API_BASE_URL } from "../../config/api.js";
import { apiRequest } from "../../utils/api.js";

export default function DiscountCodesManager({ displayOnly = false, showFormOutside = false }) {
  const [discountCodes, setDiscountCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [codeToDelete, setCodeToDelete] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discount_type: "percentage",
    discount_value: "",
    min_purchase: "0",
    max_discount: "",
    start_date: "",
    end_date: "",
    usage_limit: "",
    is_active: true,
  });

  // Cargar códigos
  const fetchDiscountCodes = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiRequest("/discounts?includeInactive=true");
      const codesData = response.data || response || [];
      setDiscountCodes(Array.isArray(codesData) ? codesData : []);
    } catch (err) {
      console.error(err);
      setError("Error al cargar los códigos de descuento");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscountCodes();
  }, []);

  // Bloquear scroll cuando los modales están abiertos
  useEffect(() => {
    if (showDeleteModal) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      // Scroll al inicio
      window.scrollTo({ top: 0, behavior: 'auto' });
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [showDeleteModal]);

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      code: "",
      description: "",
      discount_type: "percentage",
      discount_value: "",
      min_purchase: "0",
      max_discount: "",
      start_date: "",
      end_date: "",
      usage_limit: "",
      is_active: true,
    });
    setEditingId(null);
    setShowForm(false);
    setError(null);
  };

  // Iniciar edición
  // Iniciar edición
  const handleEdit = (code) => {
    // Si estamos en modo displayOnly, enviamos evento para que el formulario principal lo maneje
    if (displayOnly) {
      window.dispatchEvent(new CustomEvent('open-discount-form', {
        detail: { action: 'edit', code }
      }));
      return;
    }

    setFormData({
      code: code.code,
      description: code.description || "",
      discount_type: code.discount_type,
      discount_value: code.discount_value.toString(),
      min_purchase: code.min_purchase?.toString() || "0",
      max_discount: code.max_discount?.toString() || "",
      start_date: code.start_date || "",
      end_date: code.end_date || "",
      usage_limit: code.usage_limit?.toString() || "",
      is_active: code.is_active !== false,
    });
    setEditingId(code.id);
    setShowForm(true);
    setError(null);

    // Scroll al formulario si es necesario
    const formElement = document.getElementById('discount-form');
    if (formElement) {
      setTimeout(() => {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  // Guardar código
  const handleSave = async () => {
    if (!formData.code.trim()) {
      setError("El código es obligatorio");
      return;
    }

    if (!formData.discount_value || parseFloat(formData.discount_value) <= 0) {
      setError("El valor del descuento es obligatorio y debe ser mayor a 0");
      return;
    }

    try {
      setError(null);

      const headers = {
        "Content-Type": "application/json",
      };

      const payload = {
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim() || null,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        min_purchase: parseFloat(formData.min_purchase) || 0,
        max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit, 10) : null,
        is_active: formData.is_active,
      };

      if (editingId) {
        await apiRequest(`/discounts/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/discounts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      resetForm();
      await fetchDiscountCodes();

      // Notificar a otros componentes que hubo cambios
      window.dispatchEvent(new CustomEvent('discount-code-updated'));
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al guardar el código de descuento");
    }
  };

  // Eliminar código - mostrar modal
  const handleDeleteClick = (id) => {
    setCodeToDelete(id);
    setShowDeleteModal(true);
  };

  // Confirmar eliminación
  const handleDelete = async () => {
    if (!codeToDelete) return;

    try {
      setError(null);

      await apiRequest(`/discounts/${codeToDelete}`, {
        method: "DELETE",
      });

      setShowDeleteModal(false);
      setCodeToDelete(null);
      await fetchDiscountCodes();

      // Notificar a otros componentes que hubo cambios
      window.dispatchEvent(new CustomEvent('discount-code-updated'));
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al eliminar el código de descuento");
      setShowDeleteModal(false);
      setCodeToDelete(null);
    }
  };

  // Escuchar evento para abrir formulario (SOLO si muestra el formulario)
  useEffect(() => {
    if (!showFormOutside) return;

    const handleOpenForm = (event) => {
      if (event.detail?.action === 'create') {
        resetForm();
        setShowForm(true);
        // Scroll al formulario
        setTimeout(() => {
          const formElement = document.getElementById('discount-form');
          if (formElement) formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      } else if (event.detail?.action === 'edit' && event.detail?.code) {
        handleEdit(event.detail.code);
      }
    };

    window.addEventListener('open-discount-form', handleOpenForm);
    return () => window.removeEventListener('open-discount-form', handleOpenForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFormOutside]);

  // Escuchar evento de actualización
  useEffect(() => {
    const handleUpdate = () => {
      fetchDiscountCodes();
    };

    window.addEventListener('discount-code-updated', handleUpdate);
    return () => window.removeEventListener('discount-code-updated', handleUpdate);
  }, []);

  return (
    <>
      {/* Formulario inline estilo Barberos - Solo se muestra si showFormOutside es true */}
      {showForm && showFormOutside && (
        <div id="discount-form" className="mb-6 max-w-3xl mx-auto scroll-mt-20">
          <GlassCard className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-white">
                {editingId ? "Editar Código de Descuento" : "Nuevo Código de Descuento"}
              </h3>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                  Código <span className="text-blue-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/50"
                  placeholder="DESCUENTO20"
                />
              </div>

              <div>
                <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                  Tipo <span className="text-blue-400">*</span>
                </label>
                <select
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/50"
                >
                  <option value="percentage">Porcentaje (%)</option>
                  <option value="fixed">Monto Fijo ($)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                  Valor del Descuento <span className="text-blue-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/50"
                  placeholder={formData.discount_type === "percentage" ? "20" : "10.00"}
                />
              </div>

              {formData.discount_type === "percentage" && (
                <div>
                  <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                    Descuento Máximo ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.max_discount}
                    onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/50"
                    placeholder="50.00"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                  Compra Mínima ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.min_purchase}
                  onChange={(e) => setFormData({ ...formData, min_purchase: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/50"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                  Límite de Usos
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/50"
                  placeholder="Ilimitado"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                  Fecha de Inicio
                </label>
                <DatePicker
                  value={formData.start_date || ""}
                  onChange={(value) => setFormData({ ...formData, start_date: value })}
                  placeholder="dd/mm/aaaa"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                  Fecha de Fin
                </label>
                <DatePicker
                  value={formData.end_date || ""}
                  onChange={(value) => setFormData({ ...formData, end_date: value })}
                  placeholder="dd/mm/aaaa"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                  Descripción
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/50"
                  placeholder="Descripción del descuento"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <span className="text-sm sm:text-sm font-medium text-gray-300">Código activo</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-black/40 rounded-full peer transition-all duration-300 peer-checked:bg-gradient-to-r peer-checked:from-blue-400 peer-checked:to-blue-500 border border-white/15 peer-checked:border-blue-400/50"></div>
                    <div className="absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-all duration-300 peer-checked:translate-x-7 shadow-lg"></div>
                  </div>
                </label>
              </div>
            </div>

            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSave}
                disabled={!formData.code || !formData.discount_value}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-sm font-medium text-white transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 border border-blue-400/30 shadow-lg shadow-blue-400/20 hover:shadow-xl hover:shadow-blue-400/30"
                style={{
                  background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.7) 0%, rgba(59, 130, 246, 0.8) 100%)',
                }}
              >
                <Save className="h-4 w-4" />
                {editingId ? "Actualizar" : "Crear"}
              </button>
              <button
                onClick={resetForm}
                className="rounded-xl border border-white/15 bg-black/40 px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-sm text-gray-200 hover:bg-white/5 transition-colors active:scale-95"
              >
                Cancelar
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Lista de códigos (solo si displayOnly es true o si el formulario no está visible) */}
      {displayOnly && (
        <>
          {loading ? (
            <div className="text-center text-gray-400 py-6">
              <div className="inline-block h-6 w-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : discountCodes.length === 0 ? (
            <p className="text-gray-400 text-center py-6 text-xs">No hay códigos de descuento</p>
          ) : (
            <div className="space-y-2">
              {discountCodes.map((code) => (
                <div
                  key={code.id}
                  className={`p-3 rounded-xl border ${code.is_active
                    ? "bg-blue-500/10 border-blue-500/30"
                    : "bg-gray-500/10 border-gray-500/30"
                    }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white text-sm">{code.code}</span>
                        {!code.is_active && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-gray-500/30 rounded text-gray-300">
                            Inactivo
                          </span>
                        )}
                      </div>
                      {code.description && (
                        <p className="text-xs text-gray-400 mb-1 line-clamp-1">{code.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 text-[10px] text-gray-400">
                        <span className="text-blue-400 font-medium">
                          {code.discount_type === "percentage"
                            ? `${code.discount_value}%`
                            : `$${code.discount_value}`}
                        </span>
                        {code.min_purchase > 0 && (
                          <span>Compra mín: ${code.min_purchase}</span>
                        )}
                        {code.usage_limit && (
                          <span>
                            Usos: {code.usage_count || 0}/{code.usage_limit}
                          </span>
                        )}
                        {!code.usage_limit && <span>Usos: {code.usage_count || 0} (ilimitado)</span>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(code)}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20 hover:text-white transition-all active:scale-95"
                        title="Editar"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(code.id)}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20 hover:text-white transition-all active:scale-95"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteModal && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            style={{ alignItems: 'flex-start', paddingTop: '15vh' }}
            onClick={() => {
              setShowDeleteModal(false);
              setCodeToDelete(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md border border-white/20 backdrop-blur-2xl shadow-[0_20px_70px_rgba(0,0,0,0.65)] text-neutral-50 p-6"
              style={{
                background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.97) 50%, rgba(10, 10, 10, 0.98) 100%)',
                backdropFilter: 'blur(40px) saturate(180%)',
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                borderRadius: '40px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4">
                <p className="text-[11px] uppercase tracking-[0.20em] text-gray-400">
                  Confirmar Eliminación
                </p>
                <p className="text-sm font-medium text-white mt-1">
                  ¿Estás seguro de que deseas eliminar este código de descuento?
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setCodeToDelete(null);
                  }}
                  className="px-4 py-2.5 border border-gray-500/30 rounded-lg text-gray-300 hover:bg-gray-500/20 transition-all text-sm font-medium"
                  style={{ borderRadius: '16px' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2.5 rounded-lg text-white font-medium shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all text-sm"
                  style={{
                    background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.7) 0%, rgba(59, 130, 246, 0.8) 100%)',
                    borderRadius: '16px',
                  }}
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

    </>
  );
}



