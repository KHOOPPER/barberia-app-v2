/**
 * @fileoverview Gestión de ofertas (CRUD completo)
 * @module components/admin/AdminOffers
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Edit2, Trash2, X, Save, Tag, Percent, DollarSign, Calendar, CheckCircle } from "lucide-react";
import GlassCard from "../ui/GlassCard";
import DatePicker from "../ui/DatePicker";
import GlassCard from "../ui/GlassCard";
import DatePicker from "../ui/DatePicker";
import { API_BASE_URL, apiRequest } from "../../utils/api.js";
import { processImageUrl } from "../../utils/imageUrlHelper.js";
import logo from "../../assets/logo.png";

export default function AdminOffers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState(null);

  const [imagePreview, setImagePreview] = useState(null);
  const [sectionEnabled, setSectionEnabled] = useState(true);
  const [updatingSetting, setUpdatingSetting] = useState(false);
  const [currentLogo, setCurrentLogo] = useState(logo);

  // Cargar logo desde settings (con caché compartido)
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
        console.error("Error al obtener logo:", error);
      }
    };

    fetchLogo();

    return () => {
      mounted = false;
    };
  }, []);

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    discount_percentage: "",
    discount_amount: "",
    original_price: "",
    final_price: "",
    image_url: "",
    start_date: "",
    end_date: "",
    is_active: true,
  });

  // Cargar ofertas
  const fetchOffers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiRequest("/offers?includeInactive=true");
      setOffers(response.data || []);
    } catch (err) {
      console.error(err);
      setError("Error al cargar ofertas");
    } finally {
      setLoading(false);
    }
  };

  // Cargar setting de sección habilitada
  const fetchSectionSetting = async () => {
    try {
      const response = await apiRequest("/settings/offers_section_enabled");
      setSectionEnabled(response.data?.value !== false && response.data?.value !== "false");
    } catch (err) {
      console.error("[AdminOffers] Error al cargar setting:", err);
      // Por defecto habilitado
      setSectionEnabled(true);
    }
  };

  useEffect(() => {
    fetchOffers();
    fetchSectionSetting();
  }, []);

  // Toggle para activar/desactivar sección
  const handleToggleSection = async () => {
    try {
      setUpdatingSetting(true);
      setError(null);

      const newValue = !sectionEnabled;

      await apiRequest("/settings/offers_section_enabled", {
        method: "PUT",
        body: JSON.stringify({ value: newValue }),
      });

      setSectionEnabled(newValue);
      setSuccessMessage(newValue ? "Sección de ofertas activada" : "Sección de ofertas desactivada");
      setShowSuccessModal(true);
    } catch (err) {
      console.error(err);
      setError("Error al actualizar la configuración");
    } finally {
      setUpdatingSetting(false);
    }
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      id: "",
      name: "",
      description: "",
      discount_percentage: "",
      discount_amount: "",
      original_price: "",
      final_price: "",
      image_url: "",
      start_date: "",
      end_date: "",
      is_active: true,
    });
    setEditingId(null);
    setShowForm(false);
    setShowForm(false);
    setImagePreview(null);
  };

  // Iniciar edición
  const handleEdit = (offer) => {
    setFormData({
      id: offer.id,
      name: offer.name || "",
      description: offer.description || "",
      discount_percentage: offer.discount_percentage || "",
      discount_amount: offer.discount_amount || "",
      original_price: offer.original_price || "",
      final_price: offer.final_price || "",
      image_url: offer.image_url || "",
      start_date: offer.start_date || "",
      end_date: offer.end_date || "",
      is_active: offer.is_active !== undefined ? offer.is_active : true,
    });
    setEditingId(offer.id);
    setShowForm(true);
    setShowForm(true);
    setImagePreview(processImageUrl(offer.image_url));

    // Scroll suave hacia el formulario después de un pequeño delay para que se renderice
    setTimeout(() => {
      const formElement = document.getElementById('offer-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
      }
    }, 100);
  };



  // Guardar (crear o actualizar)
  const handleSave = async () => {
    if (!formData.id || !formData.name || !formData.final_price) {
      setError("ID, Nombre y Precio Final son obligatorios");
      return;
    }

    // Validar que no haya más de 3 ofertas activas (solo al crear)
    if (!editingId) {
      const activeOffers = offers.filter(o => o.is_active && o.id !== formData.id);
      if (activeOffers.length >= 3) {
        setError("Ya hay 3 ofertas activas. Desactiva una oferta antes de crear otra.");
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      setLoading(true);
      setError(null);

      const imageUrl = formData.image_url;



      // Formatear fechas correctamente (YYYY-MM-DD)
      const formatDate = (dateString) => {
        if (!dateString) return null;
        // Si ya está en formato YYYY-MM-DD, devolverlo
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
          return dateString;
        }
        // Si es una fecha ISO, extraer solo la parte de fecha
        if (dateString.includes('T')) {
          return dateString.split('T')[0];
        }
        // Intentar parsear y formatear
        try {
          const date = new Date(dateString);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
        } catch (e) {
          console.error('Error formateando fecha:', e);
        }
        return null;
      };

      // Preparar datos
      const dataToSend = {
        name: formData.name,
        description: formData.description || null,
        discount_percentage: formData.discount_percentage ? parseFloat(formData.discount_percentage) : null,
        discount_amount: formData.discount_amount ? parseFloat(formData.discount_amount) : null,
        original_price: formData.original_price ? parseFloat(formData.original_price) : null,
        final_price: parseFloat(formData.final_price),
        image_url: imageUrl || null,
        start_date: formatDate(formData.start_date),
        end_date: formatDate(formData.end_date),
        is_active: formData.is_active,
      };

      if (!editingId) {
        dataToSend.id = formData.id;
      }

      const endpoint = editingId ? `/offers/${editingId}` : "/offers";
      const method = editingId ? "PUT" : "POST";

      await apiRequest(endpoint, {
        method,
        body: JSON.stringify(dataToSend)
      });

      await fetchOffers();
      resetForm();
      setSuccessMessage(editingId ? "Oferta actualizada correctamente" : "Oferta creada correctamente");
      setShowSuccessModal(true);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al guardar oferta");
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal de confirmación para eliminar
  const handleDeleteClick = (id) => {
    setOfferToDelete(id);
    setShowDeleteModal(true);
  };

  // Eliminar oferta
  const handleDelete = async () => {
    if (!offerToDelete) return;

    try {
      setLoading(true);
      setError(null);
      setShowDeleteModal(false);

      await apiRequest(`/offers/${offerToDelete}`, { method: "DELETE" });

      await fetchOffers();
      setSuccessMessage("Oferta eliminada correctamente");
      setShowSuccessModal(true);
      setOfferToDelete(null);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al eliminar oferta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-5 md:px-6 lg:px-8 pt-0 sm:pt-1 md:pt-2 lg:pt-3 pb-4 sm:pb-5 md:pb-6 lg:pb-8 space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6">
      {/* Contenedor con fondo oscuro para mejor contraste sobre el fondo */}
      <div className="rounded-2xl sm:rounded-3xl p-2 sm:p-2.5 md:p-3 lg:p-4 xl:p-5 border border-white/10 shadow-2xl space-y-2 sm:space-y-2.5 md:space-y-3 lg:space-y-4"
        style={{
          background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.08) 0%, rgba(156, 163, 175, 0.02) 50%, rgba(0, 0, 0, 0.4) 100%)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        }}
      >
        {/* Header - Mismo estilo en móvil y desktop */}
        <div className="mb-1.5 sm:mb-2 md:mb-3 lg:mb-4">
          {/* Logo y título - Visible en todas las pantallas */}
          <div className="flex flex-col items-center justify-center mb-3 sm:mb-4">
            <div className="relative mb-2 sm:mb-3">
              <img
                src={currentLogo}
                alt="Logo"
                className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-24 lg:w-24 object-contain"
                onError={(e) => {
                  if (e.target.src !== logo) {
                    e.target.onerror = null;
                    e.target.src = logo;
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-1 sm:mb-2">
              <Tag className="h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white/60" />
              <h1 className="text-2xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-white tracking-tight">
                Ofertas
              </h1>
            </div>
          </div>
          <p className="text-sm sm:text-sm md:text-base text-white/50 font-light text-center">
            Administra las ofertas especiales de tu barbería (máximo 3 ofertas activas)
          </p>
        </div>

        {/* Estadísticas rápidas - Mismo estilo que Clientes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6 mb-2.5 sm:mb-3.5 md:mb-4.5 lg:mb-5.5">
          <GlassCard className="p-3 sm:p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between gap-2 lg:gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-xs md:text-sm text-white/50 mb-1 sm:mb-1.5">
                  Total Ofertas
                </p>
                <p className="text-xl sm:text-xl md:text-2xl lg:text-3xl font-bold text-white truncate">{offers.length}</p>
              </div>
              <div className="h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-12 lg:w-12 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.2) 0%, rgba(156, 163, 175, 0.1) 100%)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(156, 163, 175, 0.3)',
                }}
              >
                <Tag className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-6 lg:w-6 text-gray-400" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-3 sm:p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between gap-2 lg:gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-xs md:text-sm text-white/50 mb-1 sm:mb-1.5">
                  Ofertas Activas
                </p>
                <p className="text-xl sm:text-xl md:text-2xl lg:text-3xl font-bold text-white truncate">
                  {offers.filter(o => o.is_active).length}
                </p>
              </div>
              <div className="h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-12 lg:w-12 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.2) 0%, rgba(156, 163, 175, 0.1) 100%)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(156, 163, 175, 0.3)',
                }}
              >
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-6 lg:w-6 text-gray-400" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-3 sm:p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between gap-2 lg:gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-xs md:text-sm text-white/50 mb-1 sm:mb-1.5">
                  Descuento Promedio
                </p>
                <p className="text-xl sm:text-xl md:text-2xl lg:text-3xl font-bold text-white truncate">
                  {offers.filter(o => o.discount_percentage).length > 0
                    ? `${(offers.filter(o => o.discount_percentage).reduce((sum, o) => sum + parseFloat(o.discount_percentage || 0), 0) / offers.filter(o => o.discount_percentage).length).toFixed(0)}%`
                    : '0%'}
                </p>
              </div>
              <div className="h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-12 lg:w-12 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.2) 0%, rgba(156, 163, 175, 0.1) 100%)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(156, 163, 175, 0.3)',
                }}
              >
                <Percent className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-6 lg:w-6 text-gray-400" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-3 sm:p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between gap-2 lg:gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-xs md:text-sm text-white/50 mb-1 sm:mb-1.5">
                  Precio Promedio
                </p>
                <p className="text-xl sm:text-xl md:text-2xl lg:text-3xl font-bold text-white truncate">
                  ${offers.length > 0
                    ? (offers.reduce((sum, o) => sum + parseFloat(o.final_price || 0), 0) / offers.length).toFixed(2)
                    : '0.00'}
                </p>
              </div>
              <div className="h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-12 lg:w-12 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.2) 0%, rgba(156, 163, 175, 0.1) 100%)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(156, 163, 175, 0.3)',
                }}
              >
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-6 lg:w-6 text-gray-400" />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Error iOS style */}
        {error && (
          <div className="mb-6 rounded-2xl bg-gray-500/10 backdrop-blur-xl border border-gray-500/20 text-gray-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-gray-400"></div>
              <span className="text-sm sm:text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Controles: Botón Agregar y Sección Activa - iOS 19 style */}
        {!showForm && (
          <div className="mb-6 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-3xl mx-auto">
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
                // Scroll suave hacia el formulario después de un pequeño delay
                setTimeout(() => {
                  const formElement = document.getElementById('offer-form');
                  if (formElement) {
                    formElement.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
                  }
                }, 100);
              }}
              disabled={loading || offers.filter(o => o.is_active).length >= 3}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-700/40 rounded-xl text-white font-medium shadow-lg shadow-slate-800/30 hover:shadow-xl hover:shadow-slate-700/40 transition-all duration-200 ease-out text-sm sm:text-sm whitespace-nowrap active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 1) 100%)',
              }}
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>Agregar Oferta</span>
              {offers.filter(o => o.is_active).length >= 3 && (
                <span className="text-xs text-white/70 ml-1">(Máx. 3)</span>
              )}
            </button>
            <button
              onClick={handleToggleSection}
              disabled={updatingSetting}
              className={`
              flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border transition-all duration-200 ease-out text-sm sm:text-sm font-medium whitespace-nowrap active:scale-[0.98]
              ${sectionEnabled
                  ? "border-slate-700/40 text-white shadow-lg shadow-slate-800/30 hover:shadow-xl hover:shadow-slate-700/40"
                  : "border-white/20 text-white/70 bg-white/5 hover:bg-white/10 hover:border-white/30"
                }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
              style={sectionEnabled ? {
                background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 1) 100%)',
              } : {}}
            >
              <div className={`
              w-10 h-5 rounded-full transition-colors relative flex-shrink-0
              ${sectionEnabled ? "bg-white/30" : "bg-white/10"}
            `}>
                <div className={`
                absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-out shadow-sm
                ${sectionEnabled ? "translate-x-5" : "translate-x-0"}
              `} />
              </div>
              <span>
                {sectionEnabled ? "Sección Activa" : "Sección Desactivada"}
              </span>
            </button>
          </div>
        )}

        {/* Formulario */}
        {showForm && (
          <div id="offer-form" className="mb-6 max-w-3xl mx-auto scroll-mt-20">
            <GlassCard className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-white">
                  {editingId ? "Editar Oferta" : "Nueva Oferta"}
                </h3>
                <button
                  onClick={resetForm}
                  className="p-2 hover:bg-white/10 rounded-lg transition active:scale-95"
                >
                  <X className="h-4 w-4 text-white/80" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* ID */}
                <div>
                  <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                    ID <span className="text-gray-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
                    disabled={!!editingId}
                    className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#9CA3AF] focus:ring-2 focus:ring-[#9CA3AF]/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="o1, o2, o3..."
                    maxLength={10}
                  />
                </div>

                {/* Nombre */}
                <div>
                  <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                    Nombre <span className="text-gray-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#9CA3AF] focus:ring-2 focus:ring-[#9CA3AF]/50"
                    placeholder="Combo Corte + Barba"
                    maxLength={100}
                  />
                </div>

                {/* Descripción */}
                <div className="md:col-span-2">
                  <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#9CA3AF] focus:ring-2 focus:ring-[#9CA3AF]/50"
                    rows="3"
                    placeholder="Corte limpio, definición de barba y toalla caliente."
                  />
                </div>

                {/* Precio Original */}
                <div>
                  <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                    Precio Original
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.original_price}
                    onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#9CA3AF] focus:ring-2 focus:ring-[#9CA3AF]/50"
                    placeholder="32.00"
                  />
                </div>

                {/* Precio Final */}
                <div>
                  <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                    Precio Final <span className="text-gray-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.final_price}
                    onChange={(e) => setFormData({ ...formData, final_price: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#9CA3AF] focus:ring-2 focus:ring-[#9CA3AF]/50"
                    placeholder="25.00"
                    required
                  />
                </div>

                {/* Descuento Porcentaje */}
                <div>
                  <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                    Descuento (%) (opcional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#9CA3AF] focus:ring-2 focus:ring-[#9CA3AF]/50"
                    placeholder="20.00"
                  />
                </div>

                {/* Descuento Monto */}
                <div>
                  <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                    Descuento Monto Fijo (opcional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.discount_amount}
                    onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#9CA3AF] focus:ring-2 focus:ring-[#9CA3AF]/50"
                    placeholder="5.00"
                  />
                </div>

                {/* Fecha Inicio */}
                <div className="w-[240px] sm:w-[280px]">
                  <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                    Fecha Inicio
                  </label>
                  <DatePicker
                    value={formData.start_date}
                    onChange={(value) => setFormData({ ...formData, start_date: value })}
                    placeholder="dd/mm/aaaa"
                  />
                </div>

                {/* Fecha Fin */}
                <div className="w-[240px] sm:w-[280px]">
                  <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                    Fecha Fin
                  </label>
                  <DatePicker
                    value={formData.end_date || ""}
                    onChange={(value) => setFormData({ ...formData, end_date: value })}
                    placeholder="dd/mm/aaaa"
                  />
                </div>

                {/* Imagen */}
                <div className="md:col-span-2">
                  <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                    URL de la Imagen (Google Drive, Cloudinary, etc.)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.image_url}
                      onChange={(e) => {
                        setFormData({ ...formData, image_url: e.target.value });
                        // Actualizar preview si es URL válida
                        if (e.target.value) {
                          setImagePreview(processImageUrl(e.target.value));
                        } else {
                          setImagePreview(null);
                        }
                      }}
                      className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#9CA3AF] focus:ring-2 focus:ring-[#9CA3AF]/50"
                      placeholder="https://ejemplo.com/imagen.jpg"
                    />
                    {formData.image_url && (
                      <a
                        href={formData.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center p-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        title="Ver imagen original"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-external-link">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Pega la URL directa de la imagen. Soporta enlaces de Google Drive.
                  </p>
                </div>

                {/* Vista Previa - Mismo diseño que las cards */}
                {imagePreview && (
                  <div className="md:col-span-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-3">
                      Vista Previa de la Oferta
                    </label>
                    <div className="max-w-md mx-auto">
                      <GlassCard className="p-0 overflow-hidden relative flex flex-col h-full min-h-[360px] sm:min-h-[400px] md:min-h-[440px] group">
                        {/* Fondo gris translúcido */}
                        <div className="absolute inset-0"
                          style={{
                            background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.15) 0%, rgba(156, 163, 175, 0.05) 50%, rgba(0, 0, 0, 0.3) 100%)',
                          }}
                        ></div>

                        {/* Imagen principal - tamaño fijo y uniforme */}
                        <div className="w-full h-[240px] sm:h-[260px] md:h-[280px] flex items-center justify-center p-2 sm:p-2.5 z-10 relative">
                          <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-xl">
                            <img
                              src={imagePreview}
                              alt="Vista previa"
                              className="w-full h-full object-cover drop-shadow-2xl rounded-xl"
                            />
                          </div>
                        </div>

                        {/* Panel superior: Nombre y badges */}
                        <div className="p-3 sm:p-4 backdrop-blur-xl z-20 border-b border-white/10 relative"
                          style={{
                            background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.1) 0%, rgba(156, 163, 175, 0.05) 50%, rgba(0, 0, 0, 0.2) 100%)',
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-base sm:text-base md:text-lg font-semibold text-white leading-tight line-clamp-1 flex-1 min-w-0">
                              {formData.name || "Nombre de la oferta"}
                            </h3>
                            <div className="flex-shrink-0 flex items-center gap-1.5">
                              {formData.discount_percentage && (
                                <span className="inline-block text-xs sm:text-xs font-semibold text-white uppercase tracking-wider px-2.5 py-1 bg-white/10 backdrop-blur-xl rounded-full border border-white/20">
                                  {formData.discount_percentage}% OFF
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Panel inferior: Descripción, precio */}
                        <div className="flex-1 flex flex-col justify-end z-20 backdrop-blur-xl border-t border-white/10 relative mt-auto"
                          style={{
                            background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.1) 0%, rgba(156, 163, 175, 0.05) 50%, rgba(0, 0, 0, 0.2) 100%)',
                          }}
                        >
                          <div className="p-3 sm:p-4">
                            <div className="mb-3">
                              {formData.description && (
                                <p className="text-sm sm:text-sm text-white/70 line-clamp-1 mb-2">
                                  {formData.description}
                                </p>
                              )}
                              <div className="flex items-baseline gap-2">
                                <span className="text-xl sm:text-xl md:text-2xl font-semibold text-white">
                                  ${formData.final_price || '0.00'}
                                </span>
                                {formData.original_price && (
                                  <span className="text-sm sm:text-sm text-white/50 line-through">
                                    ${formData.original_price}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                      <p className="text-xs text-gray-400 mt-2 text-center">
                        Así se verá la oferta en la página
                      </p>
                    </div>
                  </div>
                )}

                {/* Activo */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700/50 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-400/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-400 peer-checked:to-blue-500 shadow-inner border border-gray-600/50 peer-checked:border-blue-400/50 peer-checked:shadow-lg peer-checked:shadow-blue-400/30"></div>
                    </div>
                    <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Oferta activa</span>
                  </label>
                </div>
              </div>

              {/* Botones */}
              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-sm font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 border border-blue-400/30 shadow-lg shadow-blue-400/20 hover:shadow-xl hover:shadow-blue-400/30"
                  style={{
                    background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.7) 0%, rgba(59, 130, 246, 0.8) 100%)',
                  }}
                >
                  <Save className="h-4 w-4" />
                  {loading ? "Guardando..." : "Guardar"}
                </button>
                <button
                  onClick={resetForm}
                  disabled={loading}
                  className="rounded-xl border border-white/15 bg-black/40 px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-sm text-gray-200 hover:bg-white/5 transition-colors active:scale-95"
                >
                  Cancelar
                </button>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Lista de Ofertas */}
        {!showForm && (
          <>
            {loading && offers.length === 0 ? (
              <div className="text-center text-sm sm:text-sm text-gray-400 py-12">
                Cargando ofertas...
              </div>
            ) : offers.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <p className="text-sm sm:text-sm text-white/50">No hay ofertas registradas</p>
              </GlassCard>
            ) : (
              <div
                className="grid gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6 w-full grid-auto-rows-fr grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                style={{ gridAutoRows: '1fr' }}
              >
                {offers.map((offer) => (
                  <GlassCard key={offer.id} className="p-0 overflow-hidden relative flex flex-col h-full min-h-[360px] sm:min-h-[400px] md:min-h-[440px] group hover:border-white/20 transition-[border-color] duration-150 ease-out">
                    {/* Fondo gris translúcido como Barberos */}
                    <div className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.15) 0%, rgba(156, 163, 175, 0.05) 50%, rgba(0, 0, 0, 0.3) 100%)',
                      }}
                    ></div>

                    {/* Imagen principal - tamaño fijo y uniforme */}
                    {offer.image_url && (
                      <div className="w-full h-[240px] sm:h-[260px] md:h-[280px] flex items-center justify-center p-2 sm:p-2.5 z-10 relative">
                        <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-xl">
                          <img
                            src={offer.image_url.startsWith('http') ? offer.image_url : `${API_BASE_URL.replace('/api', '')}${offer.image_url}`}
                            alt={offer.name}
                            className="w-full h-full object-cover drop-shadow-2xl transition-transform duration-300 group-hover:scale-105 rounded-xl"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "https://placehold.co/600x400/020617/cccccc?text=Oferta";
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Panel superior: Nombre y badges */}
                    <div className="p-3 sm:p-4 backdrop-blur-xl z-20 border-b border-white/10 relative"
                      style={{
                        background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.1) 0%, rgba(156, 163, 175, 0.05) 50%, rgba(0, 0, 0, 0.2) 100%)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-base sm:text-base md:text-lg font-semibold text-white leading-tight line-clamp-1 flex-1 min-w-0">
                          {offer.name}
                        </h3>
                        <div className="flex-shrink-0 flex items-center gap-1.5">
                          {offer.discount_percentage && (
                            <span className="inline-block text-xs sm:text-xs font-semibold text-white uppercase tracking-wider px-2.5 py-1 bg-white/10 backdrop-blur-xl rounded-full border border-white/20">
                              {offer.discount_percentage}% OFF
                            </span>
                          )}
                          {offer.is_active ? null : (
                            <span className="inline-block text-xs sm:text-xs font-semibold text-white/50 uppercase tracking-wider px-2.5 py-1 bg-white/5 backdrop-blur-xl rounded-full border border-white/10">
                              INACTIVO
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Panel inferior: Descripción, precio y botones */}
                    <div className="flex-1 flex flex-col justify-end z-20 backdrop-blur-xl border-t border-white/10 relative mt-auto"
                      style={{
                        background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.1) 0%, rgba(156, 163, 175, 0.05) 50%, rgba(0, 0, 0, 0.2) 100%)',
                      }}
                    >
                      <div className="p-3 sm:p-4">
                        {/* Descripción y precio */}
                        <div className="mb-3">
                          {offer.description && (
                            <p className="text-sm sm:text-sm text-white/70 line-clamp-1 mb-2">
                              {offer.description}
                            </p>
                          )}
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl sm:text-xl md:text-2xl font-semibold text-white">
                              ${offer.final_price}
                            </span>
                            {offer.original_price && (
                              <span className="text-sm sm:text-sm text-white/50 line-through">
                                ${offer.original_price}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Botones iOS 19 style */}
                        <div className="flex items-center justify-center gap-2.5">
                          <button
                            onClick={() => handleEdit(offer)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 px-3 py-2 text-sm sm:text-sm font-medium text-white/70 hover:bg-white/10 hover:border-white/20 hover:text-white transition-[background-color,border-color,color] duration-150 ease-out active:scale-95"
                          >
                            <Edit2 className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(offer.id)}
                            className="flex-1 inline-flex items-center justify-center rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 px-3 py-2 text-sm sm:text-sm font-medium text-white/70 hover:bg-white/10 hover:border-white/20 hover:text-white transition-[background-color,border-color,color] duration-150 ease-out active:scale-95"
                          >
                            <Trash2 className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </>
        )}

        {/* Modal de eliminación */}
        {showDeleteModal && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none">
            {/* Backdrop oscuro - más oscuro para enfoque */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto" />

            <div className="pointer-events-auto relative z-10 mx-4 w-full max-w-md rounded-[26px] border border-white/20 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.65)]"
              style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
                backdropFilter: 'blur(50px) saturate(200%)',
                WebkitBackdropFilter: 'blur(50px) saturate(200%)',
              }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.20em] text-[#9CA3AF] mb-1">
                    Confirmar eliminación
                  </p>
                  <p className="text-sm sm:text-base font-medium text-white">
                    ¿Estás seguro de que deseas eliminar esta oferta?
                  </p>
                  <p className="text-xs sm:text-sm text-white/60 mt-2">
                    Esta acción no se puede deshacer.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setOfferToDelete(null);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
                >
                  <X className="h-4 w-4 text-white/80" />
                </button>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setOfferToDelete(null);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/20 bg-white/5 backdrop-blur-xl text-sm font-medium text-white hover:bg-white/10 transition active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700/40 text-sm font-medium text-white shadow-lg shadow-slate-800/30 hover:shadow-xl hover:shadow-slate-700/40 transition-all duration-200 ease-out active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 1) 100%)',
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Modal de éxito */}
        {showSuccessModal && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none p-4">
            {/* Backdrop oscuro */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto" />

            <div className="pointer-events-auto w-full max-w-md flex items-center justify-center relative z-10" >
              <div
                className="
              mx-4 w-full max-w-md
              rounded-[26px]
              border border-white/20
              backdrop-blur-2xl
              shadow-[0_20px_70px_rgba(0,0,0,0.65)]
              text-neutral-50
              p-6
            "
                style={{
                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
                  backdropFilter: 'blur(50px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(50px) saturate(200%)',
                }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.20em] text-[#9CA3AF]">
                      Éxito
                    </p>
                    <p className="text-sm font-medium text-white mt-1">
                      {successMessage}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSuccessModal(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
                  >
                    <X className="h-4 w-4 text-white/80" />
                  </button>
                </div>
                <div className="text-center mt-4">
                  <button
                    onClick={() => setShowSuccessModal(false)}
                    className="
                  px-6 py-2 rounded-xl
                  border border-slate-700/40
                  text-sm font-medium text-white
                  shadow-lg shadow-slate-800/30 hover:shadow-xl hover:shadow-slate-700/40
                  transition-all duration-200 ease-out
                  active:scale-[0.98]
                "
                    style={{
                      background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 1) 100%)',
                    }}
                  >
                    Aceptar
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div >
  );
}

