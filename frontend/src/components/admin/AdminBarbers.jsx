import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Plus, Edit2, Trash2, X, Save, UserCircle, Users, Award, CheckCircle, DollarSign, Calendar, TrendingUp } from "lucide-react";
import GlassCard from "../ui/GlassCard";

import { API_BASE_URL } from "../../config/api.js";
import { apiRequest } from "../../utils/api.js";
import logo from "../../assets/logo.png";

export default function AdminBarbers() {
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [barberToDelete, setBarberToDelete] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    specialty: "",
    experience: "",
    image_url: "",
    is_active: true,
  });
  const [currentLogo, setCurrentLogo] = useState(logo);
  const [barberStats, setBarberStats] = useState({});
  const [loadingStats, setLoadingStats] = useState(false);

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

  // Cargar barberos
  const fetchBarbers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiRequest("/barbers?includeInactive=true");
      setBarbers(response.data || []);
    } catch (err) {
      console.error(err);
      setError("Error al cargar barberos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBarbers();
    fetchBarberStats();

    // Escuchar eventos de actualización de reservas
    const handleReservationUpdate = () => {
      fetchBarberStats();
    };

    window.addEventListener('invoice-saved', handleReservationUpdate);
    window.addEventListener('reservation-updated', handleReservationUpdate);

    // Actualización en tiempo real: actualizar estadísticas cada 30 segundos
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchBarberStats();
      }
    }, 30000); // 30 segundos

    // Actualizar cuando la ventana vuelve a estar visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchBarberStats();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('invoice-saved', handleReservationUpdate);
      window.removeEventListener('reservation-updated', handleReservationUpdate);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Función auxiliar para calcular el total de una reserva
  const calculateReservationTotal = async (reservation) => {
    try {
      try {
        const response = await apiRequest(`/reservations/${reservation.id}/items`);
        const items = response.data || [];

        if (items.length > 0) {
          // Calcular subtotal sin descuentos
          const subtotal = items.reduce((sum, item) => {
            const unitPrice = parseFloat(item.unit_price) || 0;
            const quantity = parseInt(item.quantity) || 1;
            return sum + (unitPrice * quantity);
          }, 0);

          // Calcular descuento total
          const totalDiscount = items.reduce((sum, item) => {
            return sum + (parseFloat(item.discount_amount) || 0);
          }, 0);

          // Total final = subtotal - descuentos
          return Math.max(0, subtotal - totalDiscount);
        }
      } catch (err) {
        // Fallback below
      }

      // Si no hay items o falla, usar precio del servicio original como fallback
      return parseFloat(reservation.service_price || reservation.final_price || reservation.price || 0);
    } catch (err) {
      console.error(`Error al calcular total de reserva ${reservation.id}:`, err);
      // Fallback en caso de error
      return parseFloat(reservation.service_price || reservation.final_price || reservation.price || 0);
    }
  };

  // Obtener estadísticas por barbero
  const fetchBarberStats = async () => {
    try {
      setLoadingStats(true);

      // Calcular rango de fechas: desde el 1 de enero hasta el último día del mes actual
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();

      // Primer día de enero del año actual
      const startDate = new Date(currentYear, 0, 1); // Enero es mes 0
      startDate.setHours(0, 0, 0, 0);

      // Último día del mes actual
      const endDate = new Date(currentYear, currentMonth + 1, 0); // Día 0 del mes siguiente = último día del mes actual
      endDate.setHours(23, 59, 59, 999);

      // Obtener reservas sin filtro de fecha
      const response = await apiRequest("/reservations/admin");
      let reservations = response.data || [];

      // Filtrar reservas desde el 1 de enero hasta el último día del mes actual y excluir facturas de solo productos
      reservations = reservations.filter(reservation => {
        // Excluir reservas sin fecha
        if (!reservation.date) return false;

        // Excluir facturas de solo productos (no tienen barbero asignado)
        if (reservation.service_label === "Factura - Solo Productos") return false;

        // Filtrar por fecha (desde el 1 de enero hasta el último día del mes actual)
        const reservationDate = new Date(reservation.date);
        return reservationDate >= startDate && reservationDate <= endDate;
      });

      // Calcular estadísticas por barbero
      const stats = {};

      // Procesar todas las reservas en paralelo para calcular sus totales
      const reservationsWithTotals = await Promise.all(
        reservations.map(async (reservation) => {
          const total = await calculateReservationTotal(reservation);
          return { ...reservation, calculatedTotal: total };
        })
      );

      reservationsWithTotals.forEach(reservation => {
        const barberId = reservation.barber_id;

        // Solo contar reservas con barbero asignado
        if (!barberId) return;

        const barberName = reservation.barber_name || reservation.barber?.name || 'Sin asignar';

        if (!stats[barberId]) {
          stats[barberId] = {
            name: barberName,
            totalReservations: 0,
            confirmedReservations: 0,
            revenue: 0,
          };
        }

        // Contar todas las reservas del barbero
        stats[barberId].totalReservations++;

        // Solo contar ingresos de reservas confirmadas
        if (reservation.status === 'confirmada') {
          stats[barberId].confirmedReservations++;
          const revenue = parseFloat(reservation.calculatedTotal) || 0;
          stats[barberId].revenue += revenue;
        }
      });



      setBarberStats(stats);
    } catch (err) {
      console.error("Error al cargar estadísticas:", err);
      setBarberStats({});
    } finally {
      setLoadingStats(false);
    }
  };

  // Estadísticas calculadas para cada barbero
  const barbersWithStats = useMemo(() => {
    return barbers.map(barber => ({
      ...barber,
      stats: barberStats[barber.id] || {
        name: barber.name,
        totalReservations: 0,
        confirmedReservations: 0,
        revenue: 0,
      },
    }));
  }, [barbers, barberStats]);

  // Calcular el texto del rango de fechas (Enero - [Mes Actual])
  const dateRangeText = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return `Enero - ${monthNames[currentMonth]}`;
  }, []);

  // Bloquear scroll cuando los modales están abiertos
  useEffect(() => {
    if (showDeleteModal || showSuccessModal) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
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
  }, [showDeleteModal, showSuccessModal]);

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      id: "",
      name: "",
      specialty: "",
      experience: "",
      image_url: "",
      is_active: true,
    });
    setEditingId(null);
    setShowForm(false);
    setImagePreview(null);
    setError(null);
  };

  // Iniciar edición
  const handleEdit = (barber) => {
    setFormData({
      id: barber.id,
      name: barber.name || "",
      specialty: barber.specialty || "",
      experience: barber.experience || "",
      image_url: barber.image_url || "",
      is_active: barber.is_active !== undefined ? barber.is_active : true,
    });
    setEditingId(barber.id);
    setShowForm(true);

    // Configurar preview de imagen
    if (barber.image_url) {
      if (barber.image_url.startsWith('http')) {
        setImagePreview(barber.image_url);
      } else {
        const cleanPath = barber.image_url.startsWith('/') ? barber.image_url : `/${barber.image_url}`;
        setImagePreview(`${API_BASE_URL.replace('/api', '')}${cleanPath}`);
      }
    } else {
      setImagePreview(null);
    }

    setTimeout(() => {
      const formElement = document.getElementById('barber-form');
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
      setLoading(true);
      setError(null);

      const endpoint = editingId
        ? `/barbers/${editingId}`
        : `/barbers`;

      const method = editingId ? "PUT" : "POST";

      const dataToSend = {
        name: formData.name,
        specialty: formData.specialty || null,
        experience: formData.experience ? parseInt(formData.experience) : null,
        image_url: formData.image_url || null,
        is_active: formData.is_active,
      };

      if (!editingId) {
        dataToSend.id = formData.id;
      }

      await apiRequest(endpoint, {
        method,
        body: JSON.stringify(dataToSend),
      });

      await fetchBarbers();
      await fetchBarberStats();
      resetForm();
      setSuccessMessage(editingId ? "Barbero actualizado correctamente" : "Barbero creado correctamente");
      setShowSuccessModal(true);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al guardar barbero");
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal de confirmación para eliminar
  const handleDeleteClick = (id) => {
    setBarberToDelete(id);
    setShowDeleteModal(true);
  };

  // Eliminar barbero
  const handleDelete = async () => {
    if (!barberToDelete) return;

    try {
      setLoading(true);
      setError(null);

      await apiRequest(`/barbers/${barberToDelete}`, {
        method: "DELETE",
      });

      await fetchBarbers();
      await fetchBarberStats();
      setShowDeleteModal(false);
      setBarberToDelete(null);
      setSuccessMessage("Barbero eliminado correctamente");
      setShowSuccessModal(true);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al eliminar barbero");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="w-full max-w-7xl mx-auto px-4 sm:px-5 md:px-6 lg:px-8 pt-0 sm:pt-1 md:pt-2 lg:pt-3 pb-4 sm:pb-5 md:pb-6 lg:pb-8 space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6">
      {/* Contenedor principal - HEREDA de Dashboard */}
      <div className="admin-container-base admin-container p-2 sm:p-2.5 md:p-3 lg:p-4 xl:p-5 space-y-2 sm:space-y-2.5 md:space-y-3 lg:space-y-4" style={{ borderRadius: '48px' }}>
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
              <UserCircle className="h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white/60" />
              <h1 className="text-2xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-white tracking-tight">
                Barberos
              </h1>
            </div>
          </div>
          <p className="text-sm sm:text-sm md:text-base text-white/50 font-light text-center">
            Administra los barberos de tu barbería
          </p>
        </div>

        {/* Estadísticas rápidas - Mismo estilo que Clientes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6 mb-2.5 sm:mb-3.5 md:mb-4.5 lg:mb-5.5">
          <GlassCard className="p-3 sm:p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between gap-2 lg:gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-xs md:text-sm text-white/50 mb-1 sm:mb-1.5">
                  Total Barberos
                </p>
                <p className="text-xl sm:text-xl md:text-2xl lg:text-3xl font-bold text-white truncate">{barbers.length}</p>
              </div>
              <div className="h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-12 lg:w-12 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.2) 0%, rgba(156, 163, 175, 0.1) 100%)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(156, 163, 175, 0.3)',
                }}
              >
                <Users className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-6 lg:w-6 text-gray-400" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-3 sm:p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between gap-2 lg:gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-xs md:text-sm text-white/50 mb-1 sm:mb-1.5">
                  Activos
                </p>
                <p className="text-xl sm:text-xl md:text-2xl lg:text-3xl font-bold text-white truncate">
                  {barbers.filter(b => b.is_active).length}
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
                  Con Experiencia
                </p>
                <p className="text-xl sm:text-xl md:text-2xl lg:text-3xl font-bold text-white truncate">
                  {barbers.filter(b => b.experience && parseInt(b.experience) > 0).length}
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
                <Award className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-6 lg:w-6 text-gray-400" />
              </div>
            </div>
          </GlassCard>

          {/* Estadística adicional: Total Ingresos */}
          <GlassCard className="p-3 sm:p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between gap-2 lg:gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-xs md:text-sm text-white/50 mb-1 sm:mb-1.5">
                  Total Ingresos ({dateRangeText})
                </p>
                <p className="text-xl sm:text-xl md:text-2xl lg:text-3xl font-bold text-white truncate">
                  ${Object.values(barberStats).reduce((sum, stat) => sum + stat.revenue, 0).toFixed(2)}
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

        {/* Estadísticas por Barbero - VISIBLE */}
        {barbers.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gray-400" />
              Estadísticas por Barbero ({dateRangeText})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {barbersWithStats.map((barber) => {
                const imageSrc = barber.image_url
                  ? (barber.image_url.startsWith('http')
                    ? barber.image_url
                    : `${API_BASE_URL.replace('/api', '')}${barber.image_url}`)
                  : null;

                return (
                  <GlassCard key={barber.id} className="p-4 sm:p-5">
                    <div className="flex items-start gap-3 mb-3">
                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          alt={barber.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white/20"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-500/30 flex items-center justify-center border-2 border-white/20 flex-shrink-0">
                          <UserCircle className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-white truncate">{barber.name}</h3>
                        {barber.specialty && (
                          <p className="text-xs text-gray-400 truncate">{barber.specialty}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400 flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          Reservas
                        </span>
                        <span className="text-white font-semibold">{barber.stats.totalReservations}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400 flex items-center gap-1.5">
                          <CheckCircle className="h-4 w-4" />
                          Confirmadas
                        </span>
                        <span className="text-white font-semibold">{barber.stats.confirmedReservations}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm pt-2 border-t border-white/10">
                        <span className="text-gray-400 flex items-center gap-1.5">
                          <DollarSign className="h-4 w-4" />
                          Ingresos
                        </span>
                        <span className="text-white font-bold">${barber.stats.revenue.toFixed(2)}</span>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        )}

        {/* Botón Agregar Barbero - iOS 19 style */}
        {!showForm && (
          <div className="mb-6 flex justify-center">
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
                // Scroll suave hacia el formulario después de un pequeño delay
                setTimeout(() => {
                  const formElement = document.getElementById('barber-form');
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
              <span>Agregar Barbero</span>
            </button>
          </div>
        )}

        {/* Error iOS style */}
        {error && (
          <div className="mb-6 rounded-2xl bg-gray-500/10 backdrop-blur-xl border border-gray-500/20 text-gray-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-gray-400"></div>
              <span className="text-sm sm:text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Formulario */}
        {showForm && (
          <div id="barber-form" className="mb-6 max-w-3xl mx-auto scroll-mt-20">
            <GlassCard className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-white">
                  {editingId ? "Editar Barbero" : "Nuevo Barbero"}
                </h3>
                <button
                  onClick={resetForm}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white active:scale-95"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                    ID <span className="text-blue-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    disabled={!!editingId}
                    className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/50 disabled:opacity-50"
                    placeholder="b1, b2, etc."
                    maxLength={10}
                  />
                </div>

                <div>
                  <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                    Nombre <span className="text-blue-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/50"
                    placeholder="Ej: Javier 'El Maestro'"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                    Especialidad
                  </label>
                  <input
                    type="text"
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/50"
                    placeholder="Ej: Cortes Clásicos"
                    maxLength={150}
                  />
                </div>

                <div>
                  <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                    Años de Experiencia
                  </label>
                  <input
                    type="number"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/50"
                    placeholder="Ej: 10"
                    min="0"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm sm:text-sm font-medium text-gray-300 mb-1">
                    URL de la Imagen del Barbero
                  </label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => {
                      const url = e.target.value;
                      setFormData({ ...formData, image_url: url });
                      // Update preview immediately if it looks like a URL
                      if (url.startsWith('http') || url.startsWith('/')) {
                        setImagePreview(url.startsWith('http') ? url : `${API_BASE_URL.replace('/api', '')}${url.startsWith('/') ? url : `/${url}`}`);
                      } else {
                        setImagePreview(null);
                      }
                    }}
                    className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/50"
                    placeholder="https://ejemplo.com/foto-barbero.jpg o /uploads/foto.jpg"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Pega el enlace de la imagen del barbero.
                  </p>
                </div>

                {/* Vista Previa del Barbero - Mismo diseño que las cards */}
                {imagePreview && (
                  <div className="md:col-span-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-3">
                      Vista Previa del Barbero
                    </label>
                    <div className="max-w-md mx-auto">
                      <GlassCard className="p-0 overflow-hidden relative flex flex-col h-full group">
                        {/* Fondo gris translúcido */}
                        <div className="absolute inset-0"
                          style={{
                            background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.15) 0%, rgba(156, 163, 175, 0.05) 50%, rgba(0, 0, 0, 0.3) 100%)',
                          }}
                        ></div>

                        {/* Imagen principal - tamaño fijo y uniforme */}
                        <div className="w-full h-[240px] sm:h-[260px] md:h-[280px] flex items-center justify-center px-8 py-2 sm:px-10 sm:py-2.5 md:px-12 z-10 relative">
                          <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-xl">
                            <img
                              src={imagePreview}
                              alt="Vista previa"
                              className="w-full h-full object-cover drop-shadow-2xl transition-transform duration-300 group-hover:scale-105 rounded-xl"
                            />
                          </div>
                        </div>

                        {/* Panel superior: Nombre y badge */}
                        <div className="p-3 sm:p-4 backdrop-blur-xl z-20 border-b border-white/10 relative"
                          style={{
                            background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.1) 0%, rgba(156, 163, 175, 0.05) 50%, rgba(0, 0, 0, 0.2) 100%)',
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-xs uppercase tracking-wider text-white/50 mb-1">
                                Barber Master
                              </p>
                              <h3 className="text-base sm:text-base md:text-lg font-semibold text-white leading-tight line-clamp-1">
                                {formData.name || "Nombre del barbero"}
                              </h3>
                            </div>
                            <div className="flex-shrink-0">
                              {!formData.is_active && (
                                <span className="inline-block text-xs sm:text-xs font-semibold text-white/50 uppercase tracking-wider px-2.5 py-1 bg-white/5 backdrop-blur-xl rounded-full border border-white/10">
                                  INACTIVO
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Panel inferior: Especialidad y experiencia */}
                        <div className="flex-1 flex flex-col justify-end z-20 backdrop-blur-xl border-t border-white/10 relative mt-auto"
                          style={{
                            background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.1) 0%, rgba(156, 163, 175, 0.05) 50%, rgba(0, 0, 0, 0.2) 100%)',
                          }}
                        >
                          <div className="p-3 sm:p-4">
                            <div className="mb-3">
                              {formData.specialty && (
                                <p className="text-sm sm:text-sm text-white/70 line-clamp-1 mb-2">
                                  {formData.specialty}
                                </p>
                              )}
                              {formData.experience && (
                                <p className="text-sm sm:text-sm text-white/50">
                                  {formData.experience} años de experiencia
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                      <p className="text-xs text-gray-400 mt-2 text-center">
                        Así se verá el barbero en la página
                      </p>
                    </div>
                  </div>
                )}

                {/* Toggle Switch para Barbero activo */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <span className="text-sm sm:text-sm font-medium text-gray-300">Barbero activo</span>
                    <div className="relative">
                      <input
                        type="checkbox"
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
                  disabled={loading || !formData.id || !formData.name}
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

        {/* Lista de barberos */}
        {loading && !showForm && (
          <p className="text-center text-sm sm:text-sm text-gray-300 py-8">Cargando barberos...</p>
        )}

        {!loading && barbers.length === 0 && (
          <GlassCard className="p-12 text-center">
            <p className="text-sm sm:text-sm text-white/50">No hay barberos registrados</p>
          </GlassCard>
        )}

        {!loading && barbers.length > 0 && (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6 w-full"
            style={{ gridAutoRows: '1fr' }}
          >
            {barbers.map((barber) => (
              <GlassCard
                key={barber.id}
                className="p-0 overflow-hidden relative flex flex-col h-full group hover:border-white/20 transition-[border-color] duration-150 ease-out"
              >
                {/* Fondo gris translúcido */}
                <div className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.15) 0%, rgba(156, 163, 175, 0.05) 50%, rgba(0, 0, 0, 0.3) 100%)',
                  }}
                ></div>

                {/* Foto del barbero - tamaño fijo y uniforme */}
                {barber.image_url && barber.image_url.trim() ? (
                  <div className="w-full h-[200px] sm:h-[220px] md:h-[240px] flex items-center justify-center px-4 py-2 z-10 relative">
                    <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-xl">
                      <img
                        src={barber.image_url.startsWith('http') ? barber.image_url : `${API_BASE_URL.replace('/api', '')}${barber.image_url}`}
                        alt={barber.name}
                        className="w-full h-full object-cover drop-shadow-2xl transition-transform duration-300 group-hover:scale-105 rounded-xl"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://placehold.co/600x400/020617/cccccc?text=${barber.name?.[0] || "B"}`;
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-[200px] sm:h-[220px] md:h-[240px] flex items-center justify-center px-4 py-2 z-10 relative">
                    <div className="w-full h-full flex items-center justify-center rounded-xl"
                      style={{
                        background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.1) 0%, rgba(156, 163, 175, 0.05) 50%, rgba(0, 0, 0, 0.2) 100%)',
                      }}
                    >
                      <span className="text-6xl sm:text-7xl font-bold text-white/30">
                        {barber.name?.[0] || "B"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Panel superior: Nombre y badge */}
                <div className="p-3 sm:p-4 backdrop-blur-xl z-20 border-b border-white/10 relative"
                  style={{
                    background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.1) 0%, rgba(156, 163, 175, 0.05) 50%, rgba(0, 0, 0, 0.2) 100%)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-xs uppercase tracking-wider text-white/50 mb-1">
                        Barber Master
                      </p>
                      <h3 className="text-base sm:text-base md:text-lg font-semibold text-white leading-tight line-clamp-1">
                        {barber.name}
                      </h3>
                    </div>
                    <div className="flex-shrink-0">
                      {!barber.is_active && (
                        <span className="inline-block text-xs sm:text-xs font-semibold text-white/50 uppercase tracking-wider px-2.5 py-1 bg-white/5 backdrop-blur-xl rounded-full border border-white/10">
                          INACTIVO
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Panel inferior: Especialidad y botones */}
                <div className="flex-1 flex flex-col justify-end z-20 backdrop-blur-xl border-t border-white/10 relative mt-auto"
                  style={{
                    background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.1) 0%, rgba(156, 163, 175, 0.05) 50%, rgba(0, 0, 0, 0.2) 100%)',
                  }}
                >
                  <div className="p-3 sm:p-4">
                    {/* Especialidad */}
                    <div className="mb-3">
                      <p className="text-sm sm:text-sm text-white/70 line-clamp-1 mb-2">
                        {barber.specialty || "Especialista"}
                      </p>
                      {barber.experience && (
                        <p className="text-sm sm:text-sm text-white/50">
                          {barber.experience} años de experiencia
                        </p>
                      )}
                    </div>
                    {/* Botones iOS 19 style */}
                    <div className="flex items-center justify-center gap-2.5">
                      <button
                        onClick={() => handleEdit(barber)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 px-3 py-2 text-sm sm:text-sm font-medium text-white/70 hover:bg-white/10 hover:border-white/20 hover:text-white transition-[background-color,border-color,color] duration-150 ease-out active:scale-95"
                      >
                        <Edit2 className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(barber.id)}
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

        {/* Modal de confirmación para eliminar */}
        {showDeleteModal && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none p-4">
            {/* Backdrop oscuro */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto" />

            <div className="pointer-events-auto relative z-10 w-full max-w-md" >
              <div
                className="
                border border-white/20
                backdrop-blur-2xl
                shadow-[0_20px_70px_rgba(0,0,0,0.65)]
                text-white
                p-6
              "
                style={{
                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
                  backdropFilter: 'blur(50px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(50px) saturate(200%)',
                  borderRadius: '26px',
                }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.20em] text-[#9CA3AF] mb-1">
                      Confirmar eliminación
                    </p>
                    <p className="text-sm sm:text-base font-medium text-white">
                      ¿Estás seguro de que deseas eliminar este barbero?
                    </p>
                    <p className="text-xs sm:text-sm text-white/60 mt-2">
                      Esta acción no se puede deshacer.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setBarberToDelete(null);
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
                      setBarberToDelete(null);
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
              text-white
              p-6
              relative
              z-[99999]
            "
                style={{
                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
                  backdropFilter: 'blur(50px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(50px) saturate(200%)',
                  borderRadius: '26px',
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
      </div>
    </div>
  );
}

