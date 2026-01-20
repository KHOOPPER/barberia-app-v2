/**
 * @fileoverview Admin Clientes - HEREDA diseño completo del Dashboard
 * @module components/admin/AdminClients
 */

import { useEffect, useState, useMemo } from "react";
import { Users, Calendar, Clock, FileText, Search, Edit, UserCircle, Package, PackageCheck } from "lucide-react";
import GlassCard from "../ui/GlassCard";
import DatePicker from "../ui/DatePicker";
import { API_BASE_URL } from "../../config/api.js";
import { isAuthenticated, logout, apiRequest } from "../../utils/api.js";
import { parseDate } from "../../utils/dateUtils.js";
import InvoiceTicket from "./InvoiceTicket.jsx";
import EditInvoice from "./EditInvoice.jsx";
import CreateInvoice from "./CreateInvoice.jsx";
import logo from "../../assets/logo.png";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = parseDate(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("es-ES", { year: "numeric", month: "short", day: "numeric" });
};

const normalizeDate = (dateString) => {
  if (!dateString) return "";
  const date = parseDate(dateString);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showEditInvoice, setShowEditInvoice] = useState(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentLogo, setCurrentLogo] = useState(logo);

  // Cargar logo
  useEffect(() => {
    let mounted = true;
    const fetchLogo = async () => {
      try {
        const { getLogo } = await import("../../utils/settingsCache.js");
        const logoUrl = await getLogo(API_BASE_URL);
        if (mounted && logoUrl) setCurrentLogo(logoUrl);
      } catch (error) {
        console.error("Error al obtener logo:", error);
      }
    };
    fetchLogo();
    return () => { mounted = false; };
  }, []);

  // Cargar clientes
  const fetchConfirmedReservations = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await apiRequest("/reservations/admin?status=confirmada");
      const response = res; // apiRequest returns the parsed JSON body directly (or wrapped)

      const reservationsData = response.data || response;

      // Asegurarse de incluir TODAS las reservas confirmadas, incluyendo facturas de solo productos
      const allClients = Array.isArray(reservationsData) ? reservationsData : [];

      // Filtrar solo las que tienen estado confirmada (por si acaso)
      const confirmedClients = allClients.filter(c => c.status === 'confirmada');

      setClients(confirmedClients.length > 0 ? confirmedClients : allClients);
    } catch (err) {
      console.error(err);
      if (err.message.includes("Token expirado") || err.message.includes("401")) {
        // apiRequest usually directs to login on 401, but we can handle custom logic if needed
        // For now, apiRequest implementation handles 401 by clearing token and redirecting?
        // Checking api.js: it throws error on 401. But does it logout?
        // Yes, logout() is imported.
      }
      setError("Error al cargar los clientes");
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated()) fetchConfirmedReservations();

    // Escuchar eventos de factura guardada para actualizar la lista
    const handleInvoiceSaved = () => {
      console.log("Invoice-saved event received, reloading clients...");
      // Esperar un momento antes de recargar para que el backend termine de procesar
      setTimeout(() => {
        fetchConfirmedReservations();
      }, 500);
    };

    window.addEventListener('invoice-saved', handleInvoiceSaved);
    window.addEventListener('client-invoice-saved', handleInvoiceSaved);

    // Cleanup
    return () => {
      window.removeEventListener('invoice-saved', handleInvoiceSaved);
      window.removeEventListener('client-invoice-saved', handleInvoiceSaved);
    };
  }, []);

  const handleOpenInvoice = async (reservation) => {
    await fetchConfirmedReservations();
    const updatedReservation = clients.find(c => c.id === reservation.id) || reservation;
    setSelectedReservation(updatedReservation);
    setShowInvoice(true);
  };

  const handleUpdateDeliveryStatus = async (reservationId, newStatus) => {
    try {
      await apiRequest(`/reservations/${reservationId}/delivery-status`, {
        method: "PUT",
        body: JSON.stringify({ deliveryStatus: newStatus }),
      });

      // Actualizar la lista de clientes
      await fetchConfirmedReservations();
    } catch (error) {
      console.error("Error al actualizar estado de entrega:", error);
      alert(error.message || "Error al actualizar el estado de entrega");
    }
  };

  const filteredClients = useMemo(() => {
    return clients
      .filter((client) => {
        if (searchTerm) {
          const search = searchTerm.toLowerCase();
          const matchesSearch =
            (client.customer_name || "").toLowerCase().includes(search) ||
            (client.customer_phone || "").includes(search) ||
            (client.service_name || client.service_label || "").toLowerCase().includes(search) ||
            (client.barber_name || "").toLowerCase().includes(search);
          if (!matchesSearch) return false;
        }
        if (selectedDate) {
          const clientDate = normalizeDate(client.date);
          if (clientDate !== selectedDate) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (selectedDate) {
          const timeA = a.time || "00:00";
          const timeB = b.time || "00:00";
          return timeA.localeCompare(timeB);
        }
        const dateA = a.created_at ? new Date(a.created_at) : parseDate(a.date);
        const dateB = b.created_at ? new Date(b.created_at) : parseDate(b.date);
        if (Number.isNaN(dateA.getTime()) && Number.isNaN(dateB.getTime())) return 0;
        if (Number.isNaN(dateA.getTime())) return 1;
        if (Number.isNaN(dateB.getTime())) return -1;
        if (dateA.getTime() === dateB.getTime()) {
          const timeA = a.time || "00:00";
          const timeB = b.time || "00:00";
          return timeB.localeCompare(timeA);
        }
        return dateB.getTime() - dateA.getTime();
      });
  }, [clients, searchTerm, selectedDate]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
            <p className="text-gray-400">Cargando clientes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="rounded-2xl bg-gray-500/20 border border-gray-500/50 text-gray-200 px-6 py-4">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto px-3 xs:px-4 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 pt-0 sm:pt-1 md:pt-2 lg:pt-3 pb-3 xs:pb-4 sm:pb-5 md:pb-6 lg:pb-8 xl:pb-10 space-y-2 xs:space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6 xl:space-y-7">
      {/* Contenedor - ULTRA RESPONSIVO CON FALLBACKS */}
      <div className="admin-section-container rounded-xl xs:rounded-2xl sm:rounded-3xl p-2 xs:p-2.5 sm:p-3 md:p-4 lg:p-5 xl:p-6 2xl:p-8 border border-white/10 shadow-2xl space-y-2 xs:space-y-2.5 sm:space-y-3 md:space-y-4 lg:space-y-5 xl:space-y-6">
        {/* Header - ULTRA RESPONSIVO */}
        <div className="mb-1 xs:mb-1.5 sm:mb-2 md:mb-3 lg:mb-4 xl:mb-5">
          <div className="flex items-center justify-between gap-3 mb-1.5 xs:mb-2">
            {/* Mobile/Tablet: sin logo, solo título */}
            <div className="flex items-center gap-2 xs:gap-2.5 sm:gap-3 lg:hidden">
              <UserCircle className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-5 sm:w-5 text-white/60 flex-shrink-0" />
              <h1 className="text-base xs:text-lg sm:text-xl md:text-2xl font-semibold text-white tracking-tight" style={{ fontSize: 'clamp(0.95rem, 4vw, 1.5rem)' }}>
                Clientes
              </h1>
            </div>
            {/* Desktop: con logo y descripción */}
            <div className="hidden lg:flex flex-col items-center justify-center flex-1">
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
                <UserCircle className="h-5 w-5 xl:h-6 xl:w-6 2xl:h-7 2xl:w-7 text-white/60" />
                <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-semibold text-white tracking-tight" style={{ fontSize: 'clamp(1.875rem, 4vw, 3rem)' }}>
                  Clientes
                </h1>
              </div>
            </div>
          </div>
          <p className="text-[10px] xs:text-xs sm:text-sm md:text-base lg:text-center text-white/50 font-light" style={{ fontSize: 'clamp(0.625rem, 1.8vw, 1rem)' }}>
            Gestiona los clientes y sus reservas confirmadas
          </p>
        </div>

        {/* Stats Cards - ULTRA RESPONSIVO */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-2 xs:gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-7 2xl:gap-8">
          <GlassCard className="p-2.5 xs:p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7 2xl:p-8">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm lg:text-base text-white/50 mb-0.5 xs:mb-1 sm:mb-1.5" style={{ fontSize: 'clamp(0.6rem, 1.5vw, 1rem)' }}>
                  Total Clientes
                </p>
                <p className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-white truncate" style={{ fontSize: 'clamp(1rem, 3vw, 2.25rem)' }}>
                  {clients.length}
                </p>
              </div>
              <div className="admin-stat-icon-bg rounded-lg xs:rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0 ml-1.5 xs:ml-2 sm:ml-3"
                style={{
                  height: 'clamp(2rem, 8vw, 3.5rem)',
                  width: 'clamp(2rem, 8vw, 3.5rem)',
                }}
              >
                <Users style={{ height: 'clamp(1rem, 4vw, 1.75rem)', width: 'clamp(1rem, 4vw, 1.75rem)' }} className="text-gray-400" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-2.5 xs:p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7 2xl:p-8">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm lg:text-base text-white/50 mb-0.5 xs:mb-1 sm:mb-1.5" style={{ fontSize: 'clamp(0.6rem, 1.5vw, 1rem)' }}>
                  Este Mes
                </p>
                <p className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-white truncate" style={{ fontSize: 'clamp(1rem, 3vw, 2.25rem)' }}>
                  {clients.filter((c) => {
                    const date = parseDate(c.date);
                    const now = new Date();
                    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <div className="admin-stat-icon-bg rounded-lg xs:rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0 ml-1.5 xs:ml-2 sm:ml-3"
                style={{ height: 'clamp(2rem, 8vw, 3.5rem)', width: 'clamp(2rem, 8vw, 3.5rem)' }}
              >
                <Calendar style={{ height: 'clamp(1rem, 4vw, 1.75rem)', width: 'clamp(1rem, 4vw, 1.75rem)' }} className="text-gray-400" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-2.5 xs:p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7 2xl:p-8">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm lg:text-base text-white/50 mb-0.5 xs:mb-1 sm:mb-1.5" style={{ fontSize: 'clamp(0.6rem, 1.5vw, 1rem)' }}>
                  {selectedDate ? "Este día" : "Hoy"}
                </p>
                <p className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-white truncate" style={{ fontSize: 'clamp(1rem, 3vw, 2.25rem)' }}>
                  {selectedDate
                    ? filteredClients.length
                    : clients.filter((c) => {
                      const dateKey = normalizeDate(c.date);
                      const today = new Date();
                      const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
                      return dateKey === todayKey;
                    }).length}
                </p>
              </div>
              <div className="admin-stat-icon-bg rounded-lg xs:rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0 ml-1.5 xs:ml-2 sm:ml-3"
                style={{ height: 'clamp(2rem, 8vw, 3.5rem)', width: 'clamp(2rem, 8vw, 3.5rem)' }}
              >
                <Clock style={{ height: 'clamp(1rem, 4vw, 1.75rem)', width: 'clamp(1rem, 4vw, 1.75rem)' }} className="text-gray-400" />
              </div>
            </div>
          </GlassCard>

          <GlassCard
            className="p-2.5 xs:p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7 2xl:p-8 cursor-pointer hover:bg-white/5 transition-all group"
            onClick={() => setShowCreateInvoice(true)}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm lg:text-base text-white/50 mb-0.5 xs:mb-1 sm:mb-1.5" style={{ fontSize: 'clamp(0.6rem, 1.5vw, 1rem)' }}>
                  Nueva Factura
                </p>
              </div>
              <div className="admin-stat-icon-bg rounded-lg xs:rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0 ml-1.5 xs:ml-2 sm:ml-3 group-hover:scale-110 transition-transform"
                style={{ height: 'clamp(2rem, 8vw, 3.5rem)', width: 'clamp(2rem, 8vw, 3.5rem)' }}
              >
                <FileText style={{ height: 'clamp(1rem, 4vw, 1.75rem)', width: 'clamp(1rem, 4vw, 1.75rem)' }} className="text-gray-400 group-hover:text-white transition-colors" />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Filtros - ULTRA RESPONSIVO */}
        <GlassCard className="p-2.5 xs:p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7 2xl:p-8">
          <div className="flex flex-col sm:flex-row gap-2 xs:gap-3 sm:gap-4 md:gap-5">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 xs:left-3 top-1/2 -translate-y-1/2 text-white/50" style={{ height: 'clamp(0.875rem, 2vw, 1rem)', width: 'clamp(0.875rem, 2vw, 1rem)' }} />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 xs:pl-9 sm:pl-10 pr-3 xs:pr-4 py-1.5 xs:py-2 sm:py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-lg xs:rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-white/20 transition-all"
                style={{ fontSize: 'clamp(0.813rem, 1.8vw, 1rem)' }}
              />
            </div>
            <div className="w-full sm:w-auto sm:min-w-[180px] md:min-w-[200px] lg:min-w-[220px]">
              <DatePicker
                value={selectedDate}
                onChange={(value) => setSelectedDate(value)}
                placeholder="Filtrar por fecha"
              />
            </div>
          </div>
        </GlassCard>

        {/* Lista Clientes - ULTRA RESPONSIVO */}
        {filteredClients.length === 0 ? (
          <GlassCard className="p-6 xs:p-8 sm:p-10 md:p-12 lg:p-14 xl:p-16 text-center">
            <Users className="mx-auto mb-3 xs:mb-4 md:mb-5 text-white/50" style={{ height: 'clamp(2.5rem, 8vw, 4rem)', width: 'clamp(2.5rem, 8vw, 4rem)' }} />
            <p className="text-white/50" style={{ fontSize: 'clamp(0.813rem, 1.8vw, 1.125rem)' }}>
              {searchTerm || selectedDate ? "No se encontraron clientes" : "No hay clientes confirmados"}
            </p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 xs:gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-7">
            {filteredClients.map((client) => (
              <GlassCard key={client.id} className="p-2.5 xs:p-3 sm:p-4 md:p-5 lg:p-6 hover:scale-[1.02] transition-transform">
                <div className="space-y-2 xs:space-y-2.5 sm:space-y-3">
                  <div className="flex items-center gap-2 xs:gap-2.5 sm:gap-3">
                    <div className="rounded-full bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center flex-shrink-0"
                      style={{ height: 'clamp(2rem, 6vw, 2.5rem)', width: 'clamp(2rem, 6vw, 2.5rem)' }}
                    >
                      <Users style={{ height: 'clamp(1rem, 3vw, 1.25rem)', width: 'clamp(1rem, 3vw, 1.25rem)' }} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate" style={{ fontSize: 'clamp(0.75rem, 1.8vw, 0.938rem)' }}>
                        {client.customer_name || "Sin nombre"}
                      </h3>
                      {client.customer_phone && (
                        <p className="text-white/50 truncate" style={{ fontSize: 'clamp(0.688rem, 1.5vw, 0.813rem)' }}>
                          {client.customer_phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 text-white/70" style={{ fontSize: 'clamp(0.688rem, 1.5vw, 0.813rem)' }}>
                    <div className="flex items-center gap-1.5 xs:gap-2">
                      <Calendar className="flex-shrink-0" style={{ height: 'clamp(0.75rem, 2vw, 0.875rem)', width: 'clamp(0.75rem, 2vw, 0.875rem)' }} />
                      <span className="truncate">{formatDate(client.date)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 xs:gap-2">
                      <Clock className="flex-shrink-0" style={{ height: 'clamp(0.75rem, 2vw, 0.875rem)', width: 'clamp(0.75rem, 2vw, 0.875rem)' }} />
                      <span className="truncate">{client.time || "N/A"}</span>
                    </div>
                    <div className="text-white/50 mt-1.5 xs:mt-2 truncate" style={{ fontSize: 'clamp(0.625rem, 1.3vw, 0.75rem)' }}>
                      {client.service_name || client.service_label || "N/A"}
                    </div>
                  </div>
                  <div className="flex gap-1.5 xs:gap-2 pt-1.5 xs:pt-2 border-t border-white/10">
                    {/* Estado de entrega solo para facturas de productos */}
                    {client.service_label === "Factura - Solo Productos" ? (
                      <>
                        <button
                          onClick={() => handleUpdateDeliveryStatus(client.id, 'pendiente')}
                          className={`flex-1 py-1.5 xs:py-2 px-2 rounded-lg transition-all active:scale-95 border border-white/10 flex items-center justify-center ${!client.delivery_status || client.delivery_status === 'pendiente'
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                            : 'bg-white/5 text-white/60 hover:bg-white/10 hover:border-white/20'
                            }`}
                          title="Pendiente"
                        >
                          <Package style={{ height: 'clamp(0.875rem, 2.5vw, 1rem)', width: 'clamp(0.875rem, 2.5vw, 1rem)' }} />
                        </button>
                        <button
                          onClick={() => handleUpdateDeliveryStatus(client.id, 'entregado')}
                          className={`flex-1 py-1.5 xs:py-2 px-2 rounded-lg transition-all active:scale-95 border border-white/10 flex items-center justify-center ${client.delivery_status === 'entregado'
                            ? 'bg-green-500/20 border-green-500/50 text-green-400'
                            : 'bg-white/5 text-white/60 hover:bg-white/10 hover:border-white/20'
                            }`}
                          title="Entregado"
                        >
                          <PackageCheck style={{ height: 'clamp(0.875rem, 2.5vw, 1rem)', width: 'clamp(0.875rem, 2.5vw, 1rem)' }} />
                        </button>
                      </>
                    ) : null}
                    <button
                      onClick={() => {
                        setSelectedReservation(client);
                        setShowEditInvoice(true);
                      }}
                      className="flex-1 py-1.5 xs:py-2 px-2 bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 rounded-lg text-white transition-all flex items-center justify-center"
                      title="Editar factura"
                    >
                      <Edit style={{ height: 'clamp(0.875rem, 2.5vw, 1rem)', width: 'clamp(0.875rem, 2.5vw, 1rem)' }} />
                    </button>
                    <button
                      onClick={() => handleOpenInvoice(client)}
                      className="flex-1 py-1.5 xs:py-2 px-2 bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 rounded-lg text-white transition-all flex items-center justify-center"
                      title="Ver factura"
                    >
                      <FileText style={{ height: 'clamp(0.875rem, 2.5vw, 1rem)', width: 'clamp(0.875rem, 2.5vw, 1rem)' }} />
                    </button>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* Modales */}
      {showInvoice && selectedReservation && (
        <InvoiceTicket
          key={`invoice-${refreshKey}`}
          reservation={selectedReservation}
          refreshKey={refreshKey}
          onClose={() => {
            setShowInvoice(false);
            setSelectedReservation(null);
          }}
        />
      )}

      {showEditInvoice && selectedReservation && (
        <EditInvoice
          key={refreshKey}
          reservation={selectedReservation}
          onClose={() => {
            setShowEditInvoice(false);
            setSelectedReservation(null);
          }}
          onSave={async () => {
            await fetchConfirmedReservations();
            const updatedReservation = clients.find(c => c.id === selectedReservation.id);
            if (updatedReservation) {
              setSelectedReservation(updatedReservation);
            }
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {showCreateInvoice && (
        <CreateInvoice
          onClose={() => {
            setShowCreateInvoice(false);
          }}
          onSave={async () => {
            console.log("Recargando clientes después de crear factura...");
            // Esperar un poco para que el backend termine de procesar
            await new Promise(resolve => setTimeout(resolve, 300));
            await fetchConfirmedReservations();
            setShowCreateInvoice(false);
          }}
        />
      )}
    </div>
  );
}
