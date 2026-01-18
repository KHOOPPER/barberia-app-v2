/**
 * @fileoverview Componente de agendamiento de citas
 * @module components/booking/AppointmentScheduler
 * 
 * He implementado este componente como un flujo de reservas en 3 pasos:
 * 1. Selección de servicio y barbero
 * 2. Selección de fecha y hora
 * 3. Confirmación y envío a WhatsApp
 * 
 * Incluye validación de disponibilidad, conexión con el backend y
 * generación automática de enlaces de WhatsApp para confirmación.
 */

import { useState, useMemo, useEffect, useCallback, memo } from "react";
import { ChevronLeft } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import GlassCard from "../ui/GlassCard";
import {
  WHATSAPP_NUMBER,
  TIME_SLOTS,
  getFutureDates,
  formatDate,
} from "../../data/mock";
import FormularioCita from "./formulario";
import usePageSEO from "../../hooks/usePageSEO";
import { API_BASE_URL } from "../../config/api";

const BRAND_NAME = import.meta?.env?.VITE_BRAND_NAME || "Barbería";

/**
 * Normaliza el ID de servicio que se enviará al backend:
 * - Si viene de ofertas (no tiene id de servicio), retorna null (se usa serviceLabel)
 * - Si viene de servicios, usa id
 */
const getServiceIdForBackend = (service) => {
  if (!service) return null;
  // Las ofertas no tienen serviceId, solo se usa serviceLabel
  if (service.final_price !== undefined) return null; // Es una oferta
  return service.id || null;
};

function AppointmentScheduler() {
  const [searchParams] = useSearchParams();

  // Paso actual del flujo (1: servicio, 2: barbero, 3: fecha/hora)
  const [step, setStep] = useState(1);

  // Selecciones del usuario
  const [selectedService, setSelectedService] = useState(null);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  // Modal del formulario final (nombre/teléfono)
  const [showModal, setShowModal] = useState(false);

  // Manejo de horarios ocupados y errores de backend
  const [reservations, setReservations] = useState([]);
  const [slotsError, setSlotsError] = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Protección contra múltiples submits simultáneos
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Barberos desde la API
  const [barbers, setBarbers] = useState([]);
  const [barbersLoading, setBarbersLoading] = useState(false);

  // Servicios desde la API
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  // Ofertas desde la API
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [sectionEnabled, setSectionEnabled] = useState(true);

  // SEO específico para la página de citas
  usePageSEO({
    title: `Agendar Cita | ${BRAND_NAME}`,
    description:
      `Reserva tu cita en ${BRAND_NAME} en tres pasos: elige tu servicio, selecciona tu profesional y escoge fecha y hora. Confirmación rápida por WhatsApp.`,
    keywords:
      "agendar cita barbería, reservar corte de cabello, corte + barba, barbería premium, citas barbero, agenda tu cita",
    path: "/citas",
  });

  /**
   * Calcula las fechas disponibles dinámicamente según la hora actual
   * Si son las 16:30 o más tarde, excluye el día de hoy
   */
  const availableDates = useMemo(() => {
    return getFutureDates(7);
  }, []); // Se recalcula cuando el componente se monta

  /**
   * Carga los barberos desde la API
   */
  useEffect(() => {
    const fetchBarbers = async () => {
      try {
        setBarbersLoading(true);
        const res = await fetch(`${API_BASE_URL}/barbers`);
        if (!res.ok) throw new Error("No se pudieron cargar los barberos");

        const response = await res.json();
        const barbersData = response.data || response || [];
        setBarbers(Array.isArray(barbersData) ? barbersData : []);
      } catch (error) {
        setBarbers([]);
      } finally {
        setBarbersLoading(false);
      }
    };

    fetchBarbers();
  }, []);

  /**
   * Carga los servicios desde la API
   */
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setServicesLoading(true);
        const res = await fetch(`${API_BASE_URL}/services`);
        if (!res.ok) throw new Error("No se pudieron cargar los servicios");

        const response = await res.json();
        const servicesData = response.data || response || [];
        setServices(Array.isArray(servicesData) ? servicesData : []);
      } catch (error) {
        setServices([]);
      } finally {
        setServicesLoading(false);
      }
    };

    fetchServices();
  }, []);

  /**
   * Carga las ofertas desde la API y verifica si la sección está habilitada
   */
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        setOffersLoading(true);

        // Verificar si la sección está habilitada
        try {
          const settingsRes = await fetch(`${API_BASE_URL}/settings/offers_section_enabled`);
          if (settingsRes.ok) {
            const settingsData = await settingsRes.json();
            const enabled = settingsData.data?.value !== false && settingsData.data?.value !== "false";
            setSectionEnabled(enabled);

            // Si la sección está deshabilitada, no cargar ofertas
            if (!enabled) {
              setOffers([]);
              setOffersLoading(false);
              return;
            }
          }
        } catch (err) {
          // Continuar cargando ofertas si falla la verificación
        }

        const res = await fetch(`${API_BASE_URL}/offers`);
        if (!res.ok) throw new Error("No se pudieron cargar las ofertas");

        const response = await res.json();
        const offersData = response.data || response || [];
        setOffers(Array.isArray(offersData) ? offersData : []);
      } catch (error) {
        setOffers([]);
      } finally {
        setOffersLoading(false);
      }
    };

    fetchOffers();
  }, []);

  /**
   * Si viene un parámetro ?promo= en la URL, selecciona automáticamente
   * la oferta correspondiente y avanza al paso 2 (barbero).
   */
  useEffect(() => {
    const promoSlug = searchParams.get("promo");
    if (!promoSlug || offers.length === 0) return;

    // Buscar oferta por ID (usando el slug como ID simplificado)
    const offer = offers.find((o) => o.id === promoSlug || o.name.toLowerCase().replace(/\s+/g, '-') === promoSlug);
    if (offer) {
      setSelectedService(offer);
      setStep(2);
    }
  }, [searchParams, offers]);

  /**
   * Carga las reservas ya existentes desde el backend para
   * la fecha (y barbero) seleccionados. Con eso filtramos TIME_SLOTS.
   */
  useEffect(() => {
    const loadReservations = async () => {
      if (!selectedDate) return;

      try {
        setSlotsLoading(true);
        setSlotsError(null);

        const params = new URLSearchParams();
        params.append("date", selectedDate);
        if (selectedBarber?.id) params.append("barberId", selectedBarber.id);

        const res = await fetch(
          `${API_BASE_URL}/reservations?${params.toString()}`
        );
        if (!res.ok) throw new Error("No se pudieron cargar las reservas");

        const response = await res.json();
        // El backend devuelve { success: true, data: [...] }
        const reservationsData = Array.isArray(response)
          ? response
          : (response.data || []);
        setReservations(Array.isArray(reservationsData) ? reservationsData : []);
      } catch (error) {
        setSlotsError(
          "Error al cargar horarios disponibles. Intenta de nuevo."
        );
        setReservations([]);
      } finally {
        setSlotsLoading(false);
      }
    };

    loadReservations();
  }, [selectedDate, selectedBarber]);

  /**
   * Calcula los horarios disponibles filtrando los ya reservados
   * para la fecha seleccionada.
   */
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return [];
    // Asegurar que reservations sea siempre un array
    if (!Array.isArray(reservations)) {
      // Si no hay reservas cargadas aún, mostrar todos los slots
      return TIME_SLOTS;
    }
    // Filtrar solo reservas activas (no canceladas)
    const reservedSlots = reservations
      .filter(r => r.status !== 'cancelada')
      .map((r) => r.time);
    const available = TIME_SLOTS.filter((slot) => !reservedSlots.includes(slot));
    return available;
  }, [reservations, selectedDate]);

  /**
   * Construye el mensaje de WhatsApp para confirmar la reserva
   * con toda la información necesaria.
   */
  const generateWhatsAppLink = (customerName, customerPhone) => {
    const barberName = selectedBarber
      ? selectedBarber.name
      : "Cualquiera (Primero disponible)";
    const serviceName = selectedService
      ? selectedService.name
      : "Servicio no especificado";
    const dateStr = selectedDate
      ? formatDate(selectedDate)
      : "Fecha no especificada";

    const message = encodeURIComponent(
      `¡Hola! Me gustaría reservar una cita en ${BRAND_NAME}.

- Servicio / Promo: ${serviceName}
- Barbero: ${barberName}
- Fecha: ${dateStr}
- Hora: ${selectedTime}
- Nombre: ${customerName}
- Teléfono: ${customerPhone}

Por favor, confirma mi reserva. ¡Gracias!`
    );

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
  };

  /**
   * Envía la reserva al backend (para bloquear horario) y luego
   * abre WhatsApp con el mensaje ya armado.
   */
  const createReservationInBackend = async (customerName, customerPhone) => {
    const body = {
      serviceId: getServiceIdForBackend(selectedService),
      serviceLabel: selectedService?.name || null,
      date: selectedDate,
      time: selectedTime,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
    };

    // Solo agregar barberId si hay un barbero seleccionado
    if (selectedBarber?.id) {
      body.barberId = selectedBarber.id;
    }

    const res = await fetch(`${API_BASE_URL}/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      let errorMessage = "Error al crear la reserva";
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const result = await res.json();
    return result;
  };

  // --- Handlers del flujo ---

  const handleServiceSelect = useCallback((service) => {
    setSelectedService(service);
    setStep(2);
  }, []);

  const handleBarberSelect = useCallback((barber) => {
    setSelectedBarber(barber);
    setSelectedDate(null);
    setSelectedTime(null);
    setStep(3);
  }, []);

  const handleTimeSelect = useCallback((time) => {
    setSelectedTime(time);

    // Nos aseguramos de que el usuario vea el modal aunque esté abajo en la página
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    setShowModal(true);
  }, []);

  const resetAll = useCallback(() => {
    setShowModal(false);
    setStep(1);
    setSelectedService(null);
    setSelectedBarber(null);
    setSelectedDate(null);
    setSelectedTime(null);
  }, []);

  const handleFormularioConfirm = async ({ name, phone }) => {
    // Evitar múltiples submits simultáneos
    if (isSubmitting || slotsLoading) {
      return;
    }

    try {
      setIsSubmitting(true);
      setSlotsLoading(true);
      await createReservationInBackend(name, phone);

      // Recargar reservas para actualizar slots disponibles
      // (esto evita que otros usuarios vean slots ya ocupados)
      if (selectedDate) {
        const params = new URLSearchParams();
        params.append("date", selectedDate);
        if (selectedBarber?.id) params.append("barberId", selectedBarber.id);

        try {
          const res = await fetch(
            `${API_BASE_URL}/reservations?${params.toString()}`
          );
          if (res.ok) {
            const response = await res.json();
            const reservationsData = Array.isArray(response)
              ? response
              : (response.data || []);
            setReservations(Array.isArray(reservationsData) ? reservationsData : []);
          }
        } catch (reloadError) {
          // Error al recargar reservas (no crítico)
        }
      }

      const link = generateWhatsAppLink(name, phone);
      window.open(link, "_blank");
      resetAll();
    } catch (error) {
      // Manejo mejorado de errores con mensajes más claros
      let errorMessage = "Error al crear la reserva";

      if (error.message.includes("ocupado") || error.message.includes("ya está")) {
        errorMessage = "El horario seleccionado ya fue reservado por otro cliente. Por favor, selecciona otro horario disponible.";
        // Recargar reservas para actualizar la lista de horarios disponibles
        if (selectedDate) {
          try {
            const params = new URLSearchParams();
            params.append("date", selectedDate);
            if (selectedBarber?.id) params.append("barberId", selectedBarber.id);
            const res = await fetch(`${API_BASE_URL}/reservations?${params.toString()}`);
            if (res.ok) {
              const response = await res.json();
              const reservationsData = Array.isArray(response)
                ? response
                : (response.data || []);
              setReservations(Array.isArray(reservationsData) ? reservationsData : []);
            }
          } catch (reloadError) {
            // Error al recargar (no crítico)
          }
        }
      } else {
        errorMessage = error.message || errorMessage;
      }

      alert(`${errorMessage}\n\nPor favor, intenta nuevamente.`);
    } finally {
      setIsSubmitting(false);
      setSlotsLoading(false);
    }
  };

  const currentStepLabel =
    step === 1
      ? "Elige tu servicio"
      : step === 2
        ? "Elige tu barbero"
        : "Elige fecha y hora";

  return (
    <section id="citas" className="py-24 max-w-6xl mx-auto px-4 sm:px-6">
      {/* Encabezado principal del flujo de reservas */}
      <div className="mb-10 text-center">
        <p className="text-[11px] uppercase tracking-[0.25em] text-[#facc6b] mb-2">
          Reserva premium
        </p>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white">
          Agenda tu Cita – 3 Pasos
        </h2>
        <p className="mt-3 text-sm text-neutral-300 max-w-xl mx-auto">
          Elige tu servicio, a tu barbero de confianza y el horario perfecto.
          Todo en un flujo rápido, claro y con estilo de barbería premium.
        </p>
      </div>

      {/* Card principal del flujo */}
      <GlassCard className="relative overflow-hidden p-6 md:p-10 bg-black/70 border border-white/10 backdrop-blur-3xl rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.7)]">
        {/* Glow de fondo */}
        <div className="pointer-events-none absolute inset-x-12 -top-10 h-40 bg-[radial-gradient(circle_at_top,_rgba(250,204,107,0.35),_transparent_60%)] opacity-60" />

        {/* Header con paso actual + resumen de selección */}
        <div className="relative z-10 mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-[#facc6b]">
              Paso {step} de 3
            </p>
            <h3 className="mt-1 text-xl md:text-2xl font-semibold text-white">
              {currentStepLabel}
            </h3>
          </div>

          {/* Resumen rápido de lo que ya se eligió */}
          <div className="flex flex-wrap gap-2 justify-start md:justify-end text-[11px]">
            <div className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 backdrop-blur-xl min-w-[130px]">
              <p className="uppercase tracking-[0.18em] text-neutral-400">
                Servicio
              </p>
              <p className="mt-0.5 text-xs text-white line-clamp-1">
                {selectedService ? selectedService.name : "Sin seleccionar"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 backdrop-blur-xl min-w-[130px]">
              <p className="uppercase tracking-[0.18em] text-neutral-400">
                Barbero
              </p>
              <p className="mt-0.5 text-xs text-white line-clamp-1">
                {selectedBarber
                  ? selectedBarber.name
                  : step >= 2
                    ? "Cualquiera"
                    : "Sin seleccionar"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 backdrop-blur-xl min-w-[130px]">
              <p className="uppercase tracking-[0.18em] text-neutral-400">
                Fecha / Hora
              </p>
              <p className="mt-0.5 text-[11px] text-white line-clamp-1">
                {selectedDate
                  ? `${formatDate(selectedDate).split(",")[1]} • ${selectedTime || "Hora pendiente"
                  }`
                  : "Pendiente"}
              </p>
            </div>
          </div>
        </div>

        {/* Contenido por pasos */}
        {/* PASO 1: Servicio */}
        {step === 1 && (
          <div className="relative z-10">
            {/* Ofertas del mes */}
            {sectionEnabled && (
              <div className="mb-10">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#facc6b] mb-3">
                  Ofertas del mes
                </p>
                {offersLoading ? (
                  <div className="text-center text-gray-400 py-8">
                    Cargando ofertas...
                  </div>
                ) : offers.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    No hay ofertas disponibles
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {offers.map((offer, index) => {
                      // Calcular dinámicamente la posición basada en el índice y el total
                      const totalItems = offers.length;
                      const itemsPerRow = 3;
                      const rowIndex = Math.floor(index / itemsPerRow);
                      const colIndex = index % itemsPerRow;
                      const isLastRow = rowIndex === Math.floor((totalItems - 1) / itemsPerRow);
                      const itemsInLastRow = totalItems % itemsPerRow || itemsPerRow;

                      // Solo ajustar posición si estamos en la última fila y no está completa
                      // Mapeo de clases Tailwind para col-start dinámico
                      const colStartClasses = {
                        1: "sm:col-start-1",
                        2: "sm:col-start-2",
                        3: "sm:col-start-3",
                      };

                      let gridClasses = "";
                      if (isLastRow && itemsInLastRow < itemsPerRow) {
                        const startCol = Math.floor((itemsPerRow - itemsInLastRow) / 2) + 1;
                        const currentColInRow = colIndex + 1;
                        const adjustedCol = startCol + (currentColInRow - 1);
                        if (adjustedCol <= itemsPerRow && colStartClasses[adjustedCol]) {
                          gridClasses = colStartClasses[adjustedCol];
                        }
                      }

                      const priceDisplay = offer.discount_percentage
                        ? `-${offer.discount_percentage}%`
                        : `$${offer.final_price}`;

                      return (
                        <button
                          key={offer.id}
                          onClick={() => handleServiceSelect(offer)}
                          className={`group p-4 text-left rounded-2xl border ${gridClasses}
                            ${selectedService?.id === offer.id
                              ? "border-[#facc6b] bg-white/10"
                              : "border-[#facc6b]/40 bg-white/5 hover:bg-white/10"
                            }
                            transition duration-200
                            shadow-[0_10px_30px_rgba(0,0,0,0.5)]
                            flex flex-col justify-between
                          `}
                        >
                          <div>
                            <p className="font-semibold text-sm text-white">
                              {offer.name}
                            </p>
                            {offer.description && (
                              <p className="text-[11px] text-neutral-300 mt-2 leading-relaxed">
                                {offer.description}
                              </p>
                            )}
                          </div>
                          <p className="mt-3 text-xs font-semibold text-[#facc6b]">
                            {priceDisplay}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Servicios clásicos */}
            <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-400 mb-3">
              Servicios clásicos
            </p>
            {servicesLoading ? (
              <div className="text-center text-gray-400 py-8">
                Cargando servicios...
              </div>
            ) : services.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No hay servicios disponibles
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((service, index) => {
                  // Calcular dinámicamente la posición basada en el índice y el total
                  const totalItems = services.length;
                  const itemsPerRow = 2;
                  const rowIndex = Math.floor(index / itemsPerRow);
                  const colIndex = index % itemsPerRow;
                  const isLastRow = rowIndex === Math.floor((totalItems - 1) / itemsPerRow);
                  const itemsInLastRow = totalItems % itemsPerRow || itemsPerRow;

                  // Solo ajustar posición si estamos en la última fila y no está completa
                  // Mapeo de clases Tailwind para col-start dinámico
                  const colStartClasses = {
                    1: "md:col-start-1",
                    2: "md:col-start-2",
                  };

                  let gridClasses = "";
                  if (isLastRow && itemsInLastRow < itemsPerRow) {
                    const startCol = Math.floor((itemsPerRow - itemsInLastRow) / 2) + 1;
                    const currentColInRow = colIndex + 1;
                    const adjustedCol = startCol + (currentColInRow - 1);
                    if (adjustedCol <= itemsPerRow && colStartClasses[adjustedCol]) {
                      gridClasses = colStartClasses[adjustedCol];
                    }
                  }

                  return (
                    <button
                      key={service.id}
                      onClick={() => handleServiceSelect(service)}
                      className={`group relative p-4 text-left border rounded-2xl ${gridClasses}
                      ${selectedService?.id === service.id
                          ? "border-white/70 bg-white/10"
                          : "border-white/15 bg-black/50 hover:bg-white/5"
                        }
                      transition duration-200
                      shadow-[0_10px_30px_rgba(0,0,0,0.6)]
                      flex justify-between items-center
                      overflow-hidden
                    `}
                    >
                      <div className="relative z-10">
                        <p className="font-semibold text-base text-white">
                          {service.name}
                        </p>
                        <p className="mt-1 text-xs text-neutral-300">
                          Duración aprox:{" "}
                          <span className="font-semibold">
                            {service.duration} min
                          </span>{" "}
                          • Desde ${service.price}
                        </p>
                      </div>
                      <span className="relative z-10 text-[10px] uppercase tracking-[0.2em] text-neutral-400 group-hover:text-neutral-200">
                        Seleccionar
                      </span>

                      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-70 transition-opacity duration-200 bg-[radial-gradient(circle_at_right,_rgba(250,204,107,0.3),_transparent_55%)]" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PASO 2: Barbero */}
        {step === 2 && (
          <div className="relative z-10">
            <button
              onClick={() => setStep(1)}
              className="mb-4 text-sm text-neutral-400 hover:text-white transition flex items-center"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Volver a servicios
            </button>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {/* Opción "Cualquiera" */}
              <div
                className={`
                    group
                    transform-gpu
                    transition-transform duration-200 ease-out
                    ${!selectedBarber ? "hover:-translate-y-1 hover:scale-[1.02]" : ""}
                  `}
              >
                <button
                  onClick={() => handleBarberSelect(null)}
                  className="w-full h-full"
                >
                  <GlassCard
                    className={`
                        relative
                        overflow-hidden
                        bg-white/5
                        border ${!selectedBarber ? "border-white/30 bg-white/10" : "border-white/12"}
                        backdrop-blur-3xl
                        rounded-3xl
                        shadow-[0_20px_60px_rgba(0,0,0,0.8)]
                        flex flex-col
                        h-full
                        cursor-pointer
                      `}
                  >
                    {/* Glow dorado en hover */}
                    {!selectedBarber && (
                      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-60 transition-opacity duration-200 bg-[radial-gradient(circle_at_top,_rgba(250,204,107,0.35),_transparent_60%)]" />
                    )}

                    {/* Foto placeholder */}
                    <div className="relative h-52 md:h-60 w-full overflow-hidden">
                      <div className="h-full w-full flex items-center justify-center bg-black/50 border border-dashed border-white/25">
                        <span className="text-5xl text-white/60">?</span>
                      </div>

                      {/* Degradado inferior */}
                      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/95 via-black/60 to-transparent" />

                      {/* Nombre y rol */}
                      <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-3 z-10">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-300">
                            Disponible
                          </p>
                          <p className="text-base md:text-lg font-semibold text-white">
                            Cualquiera
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Información adicional */}
                    <div className="relative px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-black/40">
                      <p className="text-sm text-neutral-300">
                        Primer barbero disponible
                      </p>
                    </div>
                  </GlassCard>
                </button>
              </div>

              {/* Lista de barberos con foto */}
              {barbersLoading ? (
                <div className="col-span-full text-center text-gray-400 py-12">
                  Cargando barberos...
                </div>
              ) : barbers.length === 0 ? (
                <div className="col-span-full text-center text-gray-400 py-12">
                  No hay barberos disponibles
                </div>
              ) : (
                barbers.map((barber) => (
                  <div
                    key={barber.id}
                    className={`
                        group
                        transform-gpu
                        transition-transform duration-200 ease-out
                        ${selectedBarber?.id === barber.id ? "" : "hover:-translate-y-1 hover:scale-[1.02]"}
                      `}
                  >
                    <button
                      onClick={() => handleBarberSelect(barber)}
                      className="w-full h-full"
                    >
                      <GlassCard
                        className={`
                            relative
                            overflow-hidden
                            bg-white/5
                            border ${selectedBarber?.id === barber.id ? "border-white/30 bg-white/10" : "border-white/12"}
                            backdrop-blur-3xl
                            rounded-3xl
                            shadow-[0_20px_60px_rgba(0,0,0,0.8)]
                            flex flex-col
                            h-full
                            cursor-pointer
                          `}
                      >
                        {/* Glow dorado en hover */}
                        {selectedBarber?.id !== barber.id && (
                          <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-60 transition-opacity duration-200 bg-[radial-gradient(circle_at_top,_rgba(250,204,107,0.35),_transparent_60%)] z-10" />
                        )}

                        {/* Foto del barbero */}
                        <div className="relative h-52 md:h-60 w-full overflow-hidden">
                          <img
                            src={
                              barber.image_url && barber.image_url.trim()
                                ? barber.image_url.startsWith('http')
                                  ? barber.image_url
                                  : `${API_BASE_URL.replace('/api', '')}${barber.image_url}`
                                : `https://placehold.co/600x400/020617/cccccc?text=${barber.name?.[0] || "B"}`
                            }
                            alt={barber.name}
                            loading="lazy"
                            decoding="async"
                            className="
                                w-full h-full object-cover
                                transition-transform duration-500
                                group-hover:scale-105 group-hover:translate-y-1
                              "
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src =
                                "https://placehold.co/600x400/020617/cccccc?text=" +
                                (barber.name?.[0] || "B");
                            }}
                          />

                          {/* Degradado inferior para mejorar la legibilidad del texto */}
                          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/95 via-black/60 to-transparent" />

                          {/* Nombre y rol del barbero */}
                          <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-3 z-10">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-300">
                                Barber Master
                              </p>
                              <p className="text-base md:text-lg font-semibold text-white">
                                {barber.name}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Información adicional (especialidad + sello de equipo) */}
                        <div className="relative px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-black/40">
                          <p className="text-sm text-neutral-300">
                            {barber.specialty || "Especialista"}
                          </p>

                          <div className="flex items-center gap-2">
                            <span className="hidden md:block h-[1px] w-10 bg-white/30" />
                            <span className="text-[11px] uppercase tracking-[0.2em] text-neutral-400">
                              {`${BRAND_NAME} Team`}
                            </span>
                          </div>
                        </div>
                      </GlassCard>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* PASO 3: Fecha y hora */}
        {step === 3 && (
          <div className="relative z-10">
            <button
              onClick={() => setStep(2)}
              className="mb-4 text-sm text-neutral-400 hover:text-white transition flex items-center"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Volver a barberos
            </button>

            {/* Selector de fechas (scroll horizontal con diseño elegante) */}
            <div className="date-selector-container flex flex-nowrap overflow-x-auto gap-3 pb-4 mb-6">
              {availableDates.map((date) => {
                const [weekday, rest] = formatDate(date).split(",");
                return (
                  <button
                    key={date}
                    onClick={() => {
                      setSelectedDate(date);
                      setSelectedTime(null);
                    }}
                    className={`flex-shrink-0 min-w-[130px] px-4 py-3 text-center rounded-2xl border text-sm transition duration-200
                        ${selectedDate === date
                        ? "bg-white text-black border-white shadow-xl"
                        : "bg-black/50 border-white/15 text-neutral-200 hover:bg-white/5"
                      }
                      `}
                  >
                    <span className="font-semibold block text-[11px] tracking-[0.18em]">
                      {weekday.toUpperCase()}
                    </span>
                    <span className="text-xs block opacity-80 mt-1">
                      {rest}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Horarios disponibles para la fecha seleccionada */}
            {selectedDate ? (
              <div>
                {slotsLoading && (
                  <p className="text-center text-neutral-300 mb-4">
                    Cargando horarios disponibles…
                  </p>
                )}
                {slotsError && (
                  <p className="text-center text-red-400 mb-4">
                    {slotsError}
                  </p>
                )}

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-80 overflow-y-auto pr-2">
                  {availableTimeSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => handleTimeSelect(time)}
                      className={`
                          p-2 text-center rounded-xl font-mono text-sm border
                          transition duration-150
                          ${selectedTime === time
                          ? "bg-emerald-500 border-emerald-400 text-white shadow-xl"
                          : "bg-black/50 border-white/10 text-neutral-200 hover:bg-white/5"
                        }
                        `}
                    >
                      {time}
                    </button>
                  ))}

                  {!slotsLoading &&
                    availableTimeSlots.length === 0 &&
                    !slotsError && (
                      <p className="col-span-full text-center text-red-400 p-4 bg-red-900/20 rounded-xl text-sm">
                        No hay horarios libres para esta fecha. Prueba con
                        otro día u otro barbero.
                      </p>
                    )}
                </div>
              </div>
            ) : (
              <p className="text-neutral-400 text-center p-8 border border-white/5 rounded-2xl bg-black/40">
                Selecciona una fecha para ver los horarios disponibles.
              </p>
            )}
          </div>
        )}
      </GlassCard>

      {/* Modal de formulario para datos del cliente */}
      <FormularioCita
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleFormularioConfirm}
        service={selectedService}
        barber={selectedBarber}
        date={selectedDate}
        time={selectedTime}
      />
    </section>
  );
}

export default memo(AppointmentScheduler);
