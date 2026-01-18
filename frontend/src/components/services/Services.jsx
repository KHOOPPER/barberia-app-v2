// src/components/services/Services.jsx
import { useState, useEffect, memo } from "react";
import { Plus } from "lucide-react";
import GlassCard from "../ui/GlassCard";
import { API_BASE_URL } from "../../config/api";
import { useCart } from "../../contexts/CartContext";
import ServiceBookingModal from "../cart/ServiceBookingModal";

/**
 * Sección de "Servicios".
 * Muestra la lista de cortes y paquetes principales de la barbería.
 *
 * NOTA IMPORTANTE (PLANTILLA VENDIBLE):
 * - El SEO (titulo, description, canonical) se maneja a nivel de página
 *   en el componente que renderiza la ruta (por ejemplo, /citas).
 * - Por eso este componente NO modifica <head> ni usa usePageSEO.
 */
function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addService } = useCart();
  const [selectedService, setSelectedService] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/services`);
        if (!res.ok) throw new Error("No se pudieron cargar los servicios");

        const response = await res.json();
        const servicesData = response.data || response || [];
        setServices(Array.isArray(servicesData) ? servicesData : []);
      } catch (error) {
        console.error("[Services] Error al cargar servicios:", error);
        setServices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  return (
    <section
      id="servicios"
      className="py-20 md:py-24 max-w-7xl mx-auto px-4 sm:px-6"
    >
      {/* Encabezado de la sección */}
      <div className="mb-10 text-center">
        <p className="text-[11px] uppercase tracking-[0.25em] text-[#facc6b] mb-2">
          Línea de servicios
        </p>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white">
          Nuestros Servicios de Lujo
        </h2>
        <p className="mt-3 text-sm text-neutral-300 max-w-xl mx-auto">
          Cada servicio está pensado para que tu visita se sienta como una
          experiencia completa: tiempo, detalle y un acabado digno de una
          barbería premium.
        </p>
      </div>

      {/* Tarjetas de servicio — sin animación de aparición (solo hover) */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">
          Cargando servicios...
        </div>
      ) : services.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          No hay servicios disponibles
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => {
            // Calcular dinámicamente la posición basada en el índice y el total
            const totalItems = services.length;
            const itemsPerRow = 4;
            const rowIndex = Math.floor(index / itemsPerRow);
            const colIndex = index % itemsPerRow;
            const isLastRow = rowIndex === Math.floor((totalItems - 1) / itemsPerRow);
            const itemsInLastRow = totalItems % itemsPerRow || itemsPerRow;

            // Solo ajustar posición si estamos en la última fila y no está completa
            // Mapeo de clases Tailwind para col-start dinámico
            const colStartClasses = {
              1: "lg:col-start-1",
              2: "lg:col-start-2",
              3: "lg:col-start-3",
              4: "lg:col-start-4",
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
              <div
                key={service.id}
                className={`
              group
              transform-gpu
              transition-transform duration-200 ease-out
              hover:-translate-y-1 hover:scale-[1.02]
              ${gridClasses}
              w-full
            `}
              >
                <GlassCard
                  className="
                relative
                overflow-hidden
                bg-white/5
                border border-white/12
                backdrop-blur-3xl
                shadow-[0_18px_50px_rgba(0,0,0,0.7)]
                rounded-3xl
                flex flex-col
                h-full
                w-full
              "
                >
                  {/* Glow dorado suave en hover */}
                  <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-70 transition-opacity duration-200 bg-[radial-gradient(circle_at_top,_rgba(250,204,107,0.4),_transparent_60%)]" />

                  {/* Imagen del servicio */}
                  <div className="relative h-44 md:h-52 lg:h-56 w-full overflow-hidden">
                    <img
                      src={service.image_url ? (service.image_url.startsWith('http') ? service.image_url : `${API_BASE_URL.replace('/api', '')}${service.image_url}`) : `https://placehold.co/600x400/020617/cccccc?text=${service.name?.[0] || "S"}`}
                      alt={service.name}
                      loading="lazy"
                      decoding="async"
                      className="
                    w-full h-full object-cover
                    transition-transform duration-500
                    group-hover:scale-105 group-hover:translate-y-1
                  "
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://placehold.co/600x400/020617/cccccc?text=${(service.name?.[0] || "S")}`;
                      }}
                    />
                    {/* Degradado para leer mejor el texto sobre la imagen */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/95 via-black/60 to-transparent" />

                    <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.18em] bg-black/60 border border-white/30 text-white/80 backdrop-blur-md">
                      Servicio
                    </div>
                  </div>

                  {/* Contenido textual de la tarjeta */}
                  <div className="relative px-5 pt-4 pb-5 flex-1 flex flex-col items-start">
                    <h3 className="text-base md:text-lg font-semibold text-white mb-1">
                      {service.name}
                    </h3>

                    <p className="text-[11px] md:text-sm text-neutral-300 mb-3">
                      Duración aproximada:{" "}
                      <span className="font-semibold text-white">
                        {service.duration} min
                      </span>
                    </p>

                    <div className="mt-auto w-full space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">
                          Desde
                        </span>
                        <span className="text-2xl md:text-3xl font-extrabold text-white drop-shadow-[0_0_18px_rgba(0,0,0,0.9)]">
                          ${service.price}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedService(service);
                          setShowBookingModal(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-[#facc6b]/20 border border-white/20 hover:border-[#facc6b]/50 transition-all duration-200 text-sm font-semibold text-white"
                      >
                        <Plus className="w-4 h-4" />
                        Agregar al Carrito
                      </button>
                    </div>
                  </div>
                </GlassCard>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de selección de barbero, fecha y hora */}
      {selectedService && (
        <ServiceBookingModal
          isOpen={showBookingModal}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedService(null);
          }}
          onConfirm={(bookingData) => {
            addService(selectedService, 1, bookingData);
            setShowBookingModal(false);
            setSelectedService(null);
          }}
          service={selectedService}
          serviceType="service"
        />
      )}
    </section>
  );
}

export default memo(Services);
