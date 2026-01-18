/**
 * @fileoverview Gestión de servicios (CRUD completo)
 * @module components/admin/AdminServices
 */

import { useEffect, useState, memo, useRef } from "react";
import { createPortal } from "react-dom";
import { Plus, Edit2, Trash2, X, Save, Scissors, Users, DollarSign, Clock, Package } from "lucide-react";
import GlassCard from "../ui/GlassCard";
import { API_BASE_URL } from "../../config/api.js";
import logo from "../../assets/logo.png";

const ServiceCard = memo(({ service, onEdit, onDelete }) => {
  return (
    <GlassCard className="p-0 overflow-hidden relative flex flex-col h-full min-h-[360px] sm:min-h-[400px] md:min-h-[440px] group hover:border-white/20 transition-[border-color] duration-150 ease-out">
      {/* Fondo gris translúcido */}
      <div className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.15) 0%, rgba(156, 163, 175, 0.05) 50%, rgba(0, 0, 0, 0.3) 100%)',
        }}
      ></div>

      {/* Imagen principal - tamaño fijo y uniforme */}
      {service.image_url && (
        <div className="w-full h-[240px] sm:h-[260px] md:h-[280px] flex items-center justify-center p-2 sm:p-2.5 z-10 relative">
          <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-xl">
            <img
              src={service.image_url.startsWith('http') ? service.image_url : `${API_BASE_URL.replace('/api', '')}${service.image_url}`}
              alt={service.name}
              className="w-full h-full object-cover drop-shadow-2xl transition-transform duration-300 group-hover:scale-105 rounded-xl"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://placehold.co/600x400/020617/cccccc?text=Servicio";
              }}
            />
          </div>
        </div>
      )}

      {/* Panel superior: Nombre y categoría */}
      <div className="p-3 sm:p-4 backdrop-blur-xl z-20 border-b border-white/10 relative"
        style={{
          background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.1) 0%, rgba(156, 163, 175, 0.05) 50%, rgba(0, 0, 0, 0.2) 100%)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base sm:text-base md:text-lg font-semibold text-white leading-tight line-clamp-1 flex-1 min-w-0">
            {service.name}
          </h3>
          <div className="flex-shrink-0">
            {service.category && (
              <span className="inline-block text-xs sm:text-xs font-semibold uppercase tracking-wider px-2.5 py-1 backdrop-blur-xl rounded-full"
                style={{
                  background: 'rgba(156, 163, 175, 0.2)',
                  border: '1px solid rgba(156, 163, 175, 0.4)',
                  color: '#9CA3AF',
                }}
              >
                {service.category}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Panel inferior: Descripción, precio, duración y botones */}
      <div className="flex-1 flex flex-col justify-end z-20 backdrop-blur-xl border-t border-white/10 relative mt-auto"
        style={{
          background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.1) 0%, rgba(156, 163, 175, 0.05) 50%, rgba(0, 0, 0, 0.2) 100%)',
        }}
      >
        <div className="p-3 sm:p-4">
          {/* Descripción, precio y duración */}
          <div className="mb-3">
            {service.description && (
              <p className="text-sm sm:text-sm text-white/70 line-clamp-1 mb-2">
                {service.description}
              </p>
            )}
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xl sm:text-xl md:text-2xl font-semibold" style={{ color: '#9CA3AF' }}>
                ${parseFloat(service.price).toFixed(2)}
              </span>
              <span className="text-sm sm:text-sm font-medium" style={{ color: '#8E8E93' }}>
                {service.duration} min
              </span>
            </div>
          </div>
          {/* Botones iOS 19 style */}
          <div className="flex items-center justify-center gap-2.5">
            <button
              onClick={() => onEdit(service)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 px-3 py-2 text-sm sm:text-sm font-medium text-white/70 hover:bg-white/10 hover:border-white/20 hover:text-white transition-[background-color,border-color,color] duration-150 ease-out active:scale-95"
            >
              <Edit2 className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              <span>Editar</span>
            </button>
            <button
              onClick={() => onDelete(service.id)}
              className="flex-1 inline-flex items-center justify-center rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 px-3 py-2 text-sm sm:text-sm font-medium text-white/70 hover:bg-white/10 hover:border-white/20 hover:text-white transition-[background-color,border-color,color] duration-150 ease-out active:scale-95"
            >
              <Trash2 className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            </button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
});

ServiceCard.displayName = 'ServiceCard';

export default function AdminServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentLogo, setCurrentLogo] = useState(logo);

  // Form state
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    price: "",
    duration: "",
    category: "",
    image_url: ""
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Referencia al container principal para hacer scroll
  const containerRef = useRef(null);

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

  // Cargar servicios
  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);

      // Agregar timestamp para evitar caché y pedir todos los servicios (activos e inactivos)
      const response = await fetch(`${API_BASE_URL}/services?includeInactive=true&t=${new Date().getTime()}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error("No se pudieron cargar los servicios");
      }

      const resJson = await response.json();
      setServices(resJson.data || resJson || []);
    } catch (err) {
      console.error(err);
      setError("Error al cargar servicios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // Bloquear scroll cuando los modales están abiertos y hacer scroll al container
  useEffect(() => {
    if (showDeleteModal || showSuccessModal) {
      // Hacer scroll suave hasta arriba del container
      if (containerRef.current) {
        containerRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }

      // Pequeño delay para que el scroll termine antes de bloquear
      setTimeout(() => {
        const scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
      }, 500);
    } else {
      // Restaurar scroll
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }

    // Cleanup al desmontar
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [showDeleteModal, showSuccessModal]);

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      id: "",
      name: "",
      description: "",
      price: "",
      duration: "",
      category: "",
      image_url: "",
    });
    setEditingId(null);
    setShowForm(false);
    setImagePreview(null);
    setError(null);
  };

  // Iniciar edición
  const handleEdit = (service) => {
    setEditingId(service.id);
    setFormData({
      id: service.id,
      name: service.name || "",
      description: service.description || "",
      price: service.price || "",
      duration: service.duration || "",
      category: service.category || "",
      image_url: service.image_url || "",
    });

    // Configurar preview de imagen
    if (service.image_url) {
      if (service.image_url.startsWith('http')) {
        setImagePreview(service.image_url);
      } else {
        // Eliminar /api si está presente para evitar doble prefijo
        const cleanPath = service.image_url.startsWith('/') ? service.image_url : `/${service.image_url}`;
        setImagePreview(`${API_BASE_URL.replace('/api', '')}${cleanPath}`);
      }
    } else {
      setImagePreview(null);
    }

    setShowForm(true);
    setError(null);

    // Scroll suave hacia el formulario después de un pequeño delay para que se renderice
    setTimeout(() => {
      const formElement = document.getElementById('service-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Guardar (crear o actualizar)
  const handleSave = async () => {
    if (!formData.id || !formData.name) {
      setError("ID y Nombre son obligatorios");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const url = editingId
        ? `${API_BASE_URL}/services/${editingId}`
        : `${API_BASE_URL}/services`;

      const method = editingId ? "PUT" : "POST";

      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        duration: parseInt(formData.duration)
      };

      if (!editingId) {
        payload.id = formData.id;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Incluir cookies httpOnly
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error?.message || "Error al guardar el servicio");
      }

      await fetchServices();
      setSuccessMessage(editingId ? "Servicio actualizado correctamente" : "Servicio creado correctamente");
      setShowSuccessModal(true);
      resetForm();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Abrir modal de confirmación para eliminar
  const handleDeleteClick = (id) => {
    setServiceToDelete(id);
    setShowDeleteModal(true);
  };

  // Eliminar servicio
  const handleDelete = async () => {
    if (!serviceToDelete) return;

    try {
      setLoading(true);
      setError(null);
      setShowDeleteModal(false);

      const res = await fetch(`${API_BASE_URL}/services/${serviceToDelete}`, {
        method: "DELETE",
        credentials: "include", // Incluir cookies httpOnly
      });

      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = "Error al eliminar servicio";
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorMessage;
        } catch (e) {
          // Si no es JSON, usar el texto tal cual
        }
        throw new Error(errorMessage);
      }

      await fetchServices();
      setSuccessMessage("Servicio eliminado correctamente");
      setShowSuccessModal(true);
      setServiceToDelete(null);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al eliminar servicio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="w-full max-w-7xl mx-auto px-4 sm:px-5 md:px-6 lg:px-8 pt-0 sm:pt-1 md:pt-2 lg:pt-3 pb-4 sm:pb-5 md:pb-6 lg:pb-8 space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6">
      {/* Contenedor principal - Paleta GRIS igual que Barberos */}
      <div className="p-2 sm:p-2.5 md:p-3 lg:p-4 xl:p-5 border border-white/10 shadow-2xl space-y-2 sm:space-y-2.5 md:space-y-3 lg:space-y-4"
        style={{
          background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.08) 0%, rgba(156, 163, 175, 0.02) 50%, rgba(0, 0, 0, 0.4) 100%)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderRadius: '48px',
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
              <Scissors className="h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white/60" />
              <h1 className="text-2xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-white tracking-tight">
                Servicios
              </h1>
            </div>
          </div>
          <p className="text-sm sm:text-sm md:text-base text-white/50 font-light text-center">
            Administra los servicios de tu barbería
          </p>
        </div>

        {/* Estadísticas rápidas - Mismo estilo que Clientes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6 mb-2.5 sm:mb-3.5 md:mb-4.5 lg:mb-5.5">
          <GlassCard className="p-3 sm:p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between gap-2 lg:gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-xs md:text-sm text-white/50 mb-1 sm:mb-1.5">
                  Total Servicios
                </p>
                <p className="text-xl sm:text-xl md:text-2xl lg:text-3xl font-bold text-white truncate">{services.length}</p>
              </div>
              <div className="h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-12 lg:w-12 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.2) 0%, rgba(156, 163, 175, 0.1) 100%)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(156, 163, 175, 0.3)',
                }}
              >
                <Scissors className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-6 lg:w-6 text-gray-400" />
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
                  ${services.length > 0
                    ? (services.reduce((sum, s) => sum + parseFloat(s.price || 0), 0) / services.length).toFixed(2)
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

          <GlassCard className="p-3 sm:p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between gap-2 lg:gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-xs md:text-sm text-white/50 mb-1 sm:mb-1.5">
                  Duración Promedio
                </p>
                <p className="text-xl sm:text-xl md:text-2xl lg:text-3xl font-bold text-white truncate">
                  {services.length > 0
                    ? Math.round(services.reduce((sum, s) => sum + parseInt(s.duration || 0), 0) / services.length)
                    : '0'} min
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
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-6 lg:w-6 text-gray-400" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-3 sm:p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between gap-2 lg:gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-xs md:text-sm text-white/50 mb-1 sm:mb-1.5">
                  Con Categoría
                </p>
                <p className="text-xl sm:text-xl md:text-2xl lg:text-3xl font-bold text-white truncate">
                  {services.filter(s => s.category && s.category.trim()).length}
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
                <Package className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-6 lg:w-6 text-gray-400" />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Error iOS style */}
        {error && (
          <div className="mb-6 rounded-2xl bg-gray-500/10 backdrop-blur-xl border border-gray-500/20 text-gray-200 px-4 py-3"        >
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-gray-400"></div>
              <span className="text-sm sm:text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Botón Agregar Servicio - iOS 19 style */}
        {!showForm && (
          <div className="mb-6 flex justify-center">
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
                // Scroll suave hacia el formulario después de un pequeño delay
                setTimeout(() => {
                  const formElement = document.getElementById('service-form');
                  if (formElement) {
                    formElement.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
                  }
                }, 100);
              }}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-700/40 rounded-xl text-white font-medium shadow-lg shadow-slate-800/30 hover:shadow-xl hover:shadow-slate-700/40 transition-all duration-200 ease-out text-sm sm:text-sm whitespace-nowrap active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 1) 100%)',
              }}
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>Agregar Servicio</span>
            </button>
          </div>
        )}

        {/* Formulario */}
        {showForm && (
          <div id="service-form" className="mb-6 max-w-3xl mx-auto scroll-mt-20">
            <GlassCard className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-white">
                  {editingId ? "Editar Servicio" : "Nuevo Servicio"}
                </h3>
                <button
                  onClick={resetForm}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors active:scale-95"
                >
                  <X className="h-4 w-4 text-white/80" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                    ID <span className="text-gray-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    disabled={!!editingId}
                    className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/50 disabled:opacity-50"
                    placeholder="s1, s2, etc."
                    maxLength={10}
                  />
                </div>

                <div>
                  <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                    Nombre <span className="text-gray-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/50"
                    placeholder="Ej: Corte Clásico"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                    Precio (USD) <span className="text-gray-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/50"
                    placeholder="25.00"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                    Duración (minutos) <span className="text-gray-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/50"
                    placeholder="45"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/50"
                    placeholder="Ej: Corte, Afeitado"
                    maxLength={50}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                    URL de la Imagen
                  </label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => {
                      setFormData({ ...formData, image_url: e.target.value });
                      setImagePreview(e.target.value);
                    }}
                    className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/50 placeholder-gray-500"
                    placeholder="https://ejemplo.com/imagen.jpg"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Ingresa la URL directa de la imagen (debe terminar en .jpg, .png, .webp, etc.)
                  </p>
                </div>

                {/* Vista Previa - Mismo diseño que las cards */}
                {imagePreview && (
                  <div className="md:col-span-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-3">
                      Vista Previa del Servicio
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
                              className="w-full h-full object-cover drop-shadow-2xl transition-transform duration-300 group-hover:scale-105 rounded-xl"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://placehold.co/600x400/020617/cccccc?text=Error+Imagen";
                              }}
                            />
                          </div>
                        </div>

                        {/* Panel superior: Nombre y categoría */}
                        <div className="p-3 sm:p-4 backdrop-blur-xl z-20 border-b border-white/10 relative"
                          style={{
                            background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.1) 0%, rgba(156, 163, 175, 0.05) 50%, rgba(0, 0, 0, 0.2) 100%)',
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-base sm:text-base md:text-lg font-semibold text-white leading-tight line-clamp-1 flex-1 min-w-0">
                              {formData.name || "Nombre del servicio"}
                            </h3>
                            <div className="flex-shrink-0">
                              {formData.category && (
                                <span className="inline-block text-xs sm:text-xs font-semibold uppercase tracking-wider px-2.5 py-1 backdrop-blur-xl rounded-full"
                                  style={{
                                    background: 'rgba(156, 163, 175, 0.2)',
                                    border: '1px solid rgba(156, 163, 175, 0.4)',
                                    color: '#9CA3AF',
                                  }}
                                >
                                  {formData.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Panel inferior: Descripción, precio y duración */}
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
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-xl sm:text-xl md:text-2xl font-semibold" style={{ color: '#9CA3AF' }}>
                                  ${formData.price || '0.00'}
                                </span>
                                <span className="text-sm sm:text-sm font-medium" style={{ color: '#8E8E93' }}>
                                  {formData.duration || '0'} min
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                      <p className="text-xs text-gray-400 mt-2 text-center">
                        Así se verá el servicio en la página
                      </p>
                    </div>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/50"
                    rows="3"
                    placeholder="Descripción del servicio..."
                  />
                </div>
              </div>

              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSave}
                  disabled={loading || !formData.id || !formData.name || !formData.price || !formData.duration}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-sm font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 border border-blue-400/30 shadow-lg shadow-blue-400/20 hover:shadow-xl hover:shadow-blue-400/30"
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

        {/* Modal de confirmación para eliminar */}
        {showDeleteModal && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none p-4">
            {/* Backdrop oscuro */}
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
                    ¿Estás seguro de que deseas eliminar este servicio?
                  </p>
                  <p className="text-xs sm:text-sm text-white/60 mt-2">
                    Esta acción no se puede deshacer.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setServiceToDelete(null);
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
                    setServiceToDelete(null);
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
                onClick={(e) => e.stopPropagation()}
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

        {/* Lista de servicios */}
        {loading && !showForm && (
          <p className="text-center text-sm sm:text-sm text-gray-300 py-8">Cargando servicios...</p>
        )}

        {!loading && services.length === 0 && (
          <GlassCard className="p-12 text-center">
            <p className="text-sm sm:text-sm text-white/50">No hay servicios registrados</p>
          </GlassCard>
        )}

        {!loading && services.length > 0 && (
          <div
            className="grid gap-4 sm:gap-5 md:gap-6 w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            style={{ gridAutoRows: '1fr' }}
          >
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

