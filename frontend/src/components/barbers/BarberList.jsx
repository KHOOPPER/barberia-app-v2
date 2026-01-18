// src/components/barbers/BarberList.jsx
// Listado del equipo de barberos con enfoque visual premium.

/**
 * NOTA PLANTILLA:
 * - Este componente NO modifica el SEO (title, meta, canonical).
 * - El SEO se debe manejar en el componente de página que lo use
 *   (por ejemplo, la vista /citas o /quienes-somos).
 */

import { useState, useEffect, memo } from "react";
import GlassCard from "../ui/GlassCard";
import { API_BASE_URL } from "../../config/api";

/**
 * Sección del equipo de barberos.
 * Muestra las tarjetas de cada maestro, con un hover suave (sin animaciones de aparición)
 * para mantener la página muy fluida y rápida.
 */
function BarberList() {
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBarbers = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/barbers`);
        if (!res.ok) throw new Error("No se pudieron cargar los barberos");

        const response = await res.json();
        const barbersData = response.data || response || [];
        setBarbers(Array.isArray(barbersData) ? barbersData : []);
      } catch (error) {
        console.error("[BarberList] Error al cargar barberos:", error);
        setBarbers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBarbers();
  }, []);

  return (
    <section
      id="barberos"
      className="py-20 md:py-24 max-w-7xl mx-auto px-4 sm:px-6"
    >
      {/* Encabezado de la sección */}
      <div className="mb-10 text-center">
        <p className="text-[11px] uppercase tracking-[0.25em] text-[#facc6b] mb-2">
          Nuestro equipo
        </p>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white">
          El Equipo de Maestros
        </h2>
        <p className="mt-3 text-sm text-neutral-300 max-w-xl mx-auto">
          Barberos especializados, con años de experiencia y un enfoque en el
          detalle para que cada visita se sienta como un servicio de autor.
        </p>
      </div>

      {/* Tarjetas de barberos — sin animación de aparición, solo hover suave */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">
          Cargando barberos...
        </div>
      ) : barbers.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          No hay barberos disponibles
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {barbers.map((barber, index) => {
            // Calcular dinámicamente la posición basada en el índice y el total
            const totalItems = barbers.length;
            const itemsPerRow = 3;
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
                key={barber.id}
                className={`
              group
              transform-gpu
              transition-transform duration-200 ease-out
              hover:-translate-y-1 hover:scale-[1.02]
              ${gridClasses}
            `}
              >
                <GlassCard
                  className="
                relative
                overflow-hidden
                bg-white/5
                border border-white/12
                backdrop-blur-3xl
                rounded-3xl
                shadow-[0_20px_60px_rgba(0,0,0,0.8)]
                flex flex-col
                h-full
              "
                >
                  {/* Glow dorado en hover */}
                  <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-60 transition-opacity duration-200 bg-[radial-gradient(circle_at_top,_rgba(250,204,107,0.35),_transparent_60%)]" />

                  {/* Foto del barbero */}
                  <div className="relative h-52 md:h-60 w-full overflow-hidden">
                    <img
                      src={barber.image_url && barber.image_url.trim() ? (barber.image_url.startsWith('http') ? barber.image_url : `${API_BASE_URL.replace('/api', '')}${barber.image_url}`) : `https://placehold.co/600x400/020617/cccccc?text=${barber.name?.[0] || "B"}`}
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
                    <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-3">
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
                        Khoopper BarberShop Team
                      </span>
                    </div>
                  </div>
                </GlassCard>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default memo(BarberList);
