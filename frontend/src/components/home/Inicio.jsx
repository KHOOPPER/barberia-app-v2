import { Calendar, Scissors, Sparkles, ShoppingBag, Plus, ArrowRight, Award, Clock, Music2, CheckCircle2, TrendingUp, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { API_BASE_URL } from "../../config/api.js";
import { motion, AnimatePresence } from "framer-motion";
import usePageSEO from "../../hooks/usePageSEO";
import { useCart } from "../../contexts/CartContext";
import ServiceBookingModal from "../cart/ServiceBookingModal";
import { getYouTubeEmbedUrl, getGoogleDriveEmbedUrl } from "../../utils/videoHelpers";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const iconVariants = {
  rest: { y: 0, scale: 1, rotate: 0 },
  hover: { y: -6, scale: 1.1, rotate: -5 },
};

const EXPERIENCE_ITEMS = [
  {
    icon: Scissors,
    title: "Barberos Expertos",
    desc: "Especialistas certificados en fades, cortes clásicos y estilos modernos adaptados a tu rostro y personalidad.",
  },
  {
    icon: Award,
    title: "Productos Premium",
    desc: "Línea profesional de primera calidad para cuidar tu piel, barba y cabello en cada servicio que recibes.",
  },
  {
    icon: Clock,
    title: "Citas Puntuales",
    desc: "Respeto total por tu tiempo: agenda tu hora y te atendemos sin largas esperas ni demoras innecesarias.",
  },
  {
    icon: Music2,
    title: "Ambiente Exclusivo",
    desc: "Música selecta, iluminación perfecta y una experiencia relajada pensada para que disfrutes cada momento.",
  },
];

const STATS = [
  { icon: Users, value: "2,500+", label: "Clientes Satisfechos" },
  { icon: Award, value: "4.9/5", label: "Calificación Promedio" },
  { icon: Clock, value: "5 años", label: "Experiencia" },
  { icon: TrendingUp, value: "98%", label: "Tasa de Satisfacción" },
];

const MAKEOVER_ITEMS = [
  {
    title: "Fade Limpio + Barba Definida",
    focus: "Ideal para el día a día",
    before: "Cabello sin forma definida, barba crecida sin línea y aspecto descuidado.",
    after: "Fade nítido y perfecto, patillas alineadas con precisión milimétrica y barba recortada al detalle. Look impecable.",
  },
  {
    title: "Cambio de Look Completo",
    focus: "Perfecto para ocasiones especiales",
    before: "Corte desactualizado, puntas abiertas y estilo que no refleja tu personalidad actual.",
    after: "Nuevo corte moderno y actual, textura trabajada profesionalmente y acabado con brillo sutil. Transformación total.",
  },
  {
    title: "Refresco Rápido de Imagen",
    focus: "Para quienes necesitan algo rápido",
    before: "Lados crecidos desproporcionados, nuca desordenada y contornos sin definir.",
    after: "Limpieza perfecta de contornos, nuca impecablemente definida y peinado pulido profesionalmente.",
  },
];



const AddToCartButton = memo(function AddToCartButton({ type, item, className = "" }) {
  const { addProduct, addOffer, addService, showAlert } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const handleAdd = async (e) => {
    e.stopPropagation();

    if (type === "service" || type === "offer") {
      setShowBookingModal(true);
      return;
    }

    if (type === "product") {
      if (item.stock !== null && item.stock !== undefined) {
        const availableStock = parseInt(item.stock) || 0;
        if (availableStock <= 0) {
          showAlert(
            `El producto "${item.name}" no está disponible.\n\nStock: 0 unidades`,
            "error"
          );
          return;
        }
      }
      setIsAdding(true);
      addProduct(item);
    }

    setTimeout(() => setIsAdding(false), 300);
  };

  const handleBookingConfirm = (bookingData) => {
    if (type === "service") {
      addService(item, 1, bookingData);
    } else if (type === "offer") {
      addOffer(item, 1, bookingData);
    }
    setShowBookingModal(false);
    setIsAdding(true);
    setTimeout(() => setIsAdding(false), 300);
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleAdd}
        className={`
          ${className}
          flex items-center gap-2
          px-4 py-2
          rounded-full
          bg-white/10 hover:bg-[#facc6b]/20
          border border-white/20 hover:border-[#facc6b]/50
          transition-all duration-200
          group/btn
        `}
      >
        <motion.div
          animate={{ rotate: isAdding ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Plus className="w-4 h-4 text-[#facc6b]" />
        </motion.div>
        <span className="text-xs font-medium text-[#facc6b] uppercase tracking-wider">
          {isAdding ? "Agregado" : "Agregar"}
        </span>
      </motion.button>

      {(type === "service" || type === "offer") && (
        <ServiceBookingModal
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          onConfirm={handleBookingConfirm}
          service={item}
          serviceType={type}
        />
      )}
    </>
  );
});

export default function Inicio() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersSectionEnabled, setOffersSectionEnabled] = useState(true);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsSectionEnabled, setProductsSectionEnabled] = useState(true);
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesSectionEnabled, setServicesSectionEnabled] = useState(true);
  const [videoConfig, setVideoConfig] = useState({ type: 'default', url: '', file: '', images: [] });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (videoConfig.type === 'images' && videoConfig.images?.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % videoConfig.images.length);
      }, 7000);
      return () => clearInterval(interval);
    }
  }, [videoConfig]);

  // Cargar configuración de video multi-fuente
  useEffect(() => {
    const fetchVideoConfig = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/settings/homepage-video-config?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            setVideoConfig(data.data);
          }
        }
      } catch (error) {
        // Silently fail or log generic error if critical
      }
    };

    fetchVideoConfig();
  }, []);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setServicesLoading(true);

        try {
          const settingsRes = await fetch(`${API_BASE_URL}/settings/services_section_enabled`);
          if (settingsRes.ok) {
            const settingsData = await settingsRes.json();
            const enabled = settingsData.data?.value !== false && settingsData.data?.value !== "false";
            setServicesSectionEnabled(enabled);

            if (!enabled) {
              setServices([]);
              setServicesLoading(false);
              return;
            }
          }
        } catch (err) {
          console.warn("[Inicio] Error al verificar setting de servicios:", err);
        }

        const res = await fetch(`${API_BASE_URL}/services`);
        if (!res.ok) throw new Error("No se pudieron cargar los servicios");

        const response = await res.json();
        const servicesData = response.data || response || [];
        setServices(Array.isArray(servicesData) ? servicesData : []);
      } catch (error) {
        console.error("[Inicio] Error al cargar servicios:", error);
        setServices([]);
      } finally {
        setServicesLoading(false);
      }
    };

    fetchServices();
  }, []);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        setOffersLoading(true);

        try {
          const settingsRes = await fetch(`${API_BASE_URL}/settings/offers_section_enabled`);
          if (settingsRes.ok) {
            const settingsData = await settingsRes.json();
            const enabled = settingsData.data?.value !== false && settingsData.data?.value !== "false";
            setOffersSectionEnabled(enabled);

            if (!enabled) {
              setOffers([]);
              setOffersLoading(false);
              return;
            }
          }
        } catch (err) {
          console.warn("[Inicio] Error al verificar setting de ofertas:", err);
        }

        const res = await fetch(`${API_BASE_URL}/offers`);
        if (!res.ok) throw new Error("No se pudieron cargar las ofertas");

        const response = await res.json();
        const offersData = response.data || response || [];
        setOffers(Array.isArray(offersData) ? offersData : []);
      } catch (error) {
        console.error("[Inicio] Error al cargar ofertas:", error);
        setOffers([]);
      } finally {
        setOffersLoading(false);
      }
    };

    fetchOffers();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true);

        try {
          const settingsRes = await fetch(`${API_BASE_URL}/settings/products_section_enabled`);
          if (settingsRes.ok) {
            const settingsData = await settingsRes.json();
            const enabled = settingsData.data?.value !== false && settingsData.data?.value !== "false";
            setProductsSectionEnabled(enabled);

            if (!enabled) {
              setProducts([]);
              setProductsLoading(false);
              return;
            }
          }
        } catch (err) {
          console.warn("[Inicio] Error al verificar setting de productos:", err);
          setProductsSectionEnabled(true);
        }

        const res = await fetch(`${API_BASE_URL}/products`);
        if (!res.ok) throw new Error("No se pudieron cargar los productos");

        const response = await res.json();
        const productsData = response.data || response || [];
        setProducts(Array.isArray(productsData) ? productsData : []);
      } catch (error) {
        console.error("[Inicio] Error al cargar productos:", error);
        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  usePageSEO({
    title: "Khoopper BarberShop | Barbería premium en tu ciudad",
    description:
      "Barbería premium especializada en cortes de cabello para hombre, fades modernos, corte + barba, diseño de cejas y afeitado profesional. Agenda tu cita en línea.",
    keywords:
      "barbería premium, corte de cabello para hombre, corte + barba, barberos profesionales, fades modernos, diseño de cejas, barbería en tu ciudad, agenda tu cita",
    path: "/",
  });

  const handleOfferClick = useCallback((offerId) => {
    navigate(`/citas?promo=${offerId}`);
  }, [navigate]);

  const handleGoToAppointments = useCallback(() => {
    navigate("/citas");
  }, [navigate]);

  const handleGoToAbout = useCallback(() => {
    navigate("/quienes-somos");
  }, [navigate]);

  return (
    <main className="text-white scroll-smooth">
      {/* Hero Section */}
      <motion.section
        id="inicio"
        className="relative w-full h-[90vh] sm:h-[95vh] flex items-center justify-center overflow-hidden -mt-16 sm:-mt-18 md:-mt-20 lg:-mt-24"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >

        {/* Renderizado condicional según tipo de video */}
        {/* Renderizado condicional según tipo de video */}
        {videoConfig.type === 'images' && videoConfig.images && videoConfig.images.length > 0 ? (
          <AnimatePresence mode="popLayout">
            <motion.img
              key={currentImageIndex}
              src={videoConfig.images[currentImageIndex].startsWith('http') ? videoConfig.images[currentImageIndex] : `${API_BASE_URL.replace(/\/api$/, '')}${videoConfig.images[currentImageIndex]}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="absolute inset-0 w-full h-full object-cover brightness-[0.60]"
              alt="Hero background"
            />
          </AnimatePresence>
        ) : videoConfig.type === 'youtube' && videoConfig.url && getYouTubeEmbedUrl(videoConfig.url) ? (
          <iframe
            className="absolute inset-0 w-full h-full object-cover brightness-[0.70] will-change-transform pointer-events-none"
            src={getYouTubeEmbedUrl(videoConfig.url)}
            title="Homepage Background Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            style={{ border: 'none' }}
            aria-hidden="true"
            tabIndex={-1}
          />
        ) : videoConfig.type === 'drive' && videoConfig.url ? (
          <iframe
            className="absolute inset-0 w-full h-full object-cover brightness-[0.70] will-change-transform pointer-events-none"
            src={videoConfig.url.replace('/view', '/preview')}
            title="Homepage Background Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            style={{ border: 'none' }}
            aria-hidden="true"
            tabIndex={-1}
          />
        ) : videoConfig.type === 'upload' && videoConfig.file ? (
          <video
            className="absolute inset-0 w-full h-full object-cover brightness-[0.70] will-change-transform"
            src={videoConfig.file.startsWith('http') ? videoConfig.file : `${API_BASE_URL.replace(/\/api$/, '')}${videoConfig.file}`}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
          />
        ) : (
          /* Default fallback */
          <div className="w-full h-full bg-slate-900" />
        )}

        <div className="absolute inset-0 bg-black/30" />
        {/* Gradiente reforzado para suavizar corte */}
        <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-black via-black/60 to-transparent z-10" />


        <motion.div
          variants={itemVariants}
          className="relative z-20 mx-auto flex max-w-5xl flex-col gap-6 sm:gap-8 md:gap-10 px-4 sm:px-6 md:px-8 lg:px-0 text-center"
        >
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 self-center rounded-full border border-white/15 bg-black/40 backdrop-blur-xl px-5 py-2.5 text-xs md:text-sm uppercase tracking-[0.25em] sm:tracking-[0.3em] text-[#facc6b]"
          >
            <Sparkles className="h-4 w-4" strokeWidth={2} />
            <span>Khoopper BarberShop · Premium Experience</span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-white font-extrabold text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.1] drop-shadow-[0_5px_30px_rgba(0,0,0,0.9)]"
          >
            Tu Estilo.
            <br />
            <span className="bg-gradient-to-r from-[#facc6b] via-[#fbbf24] to-[#f97316] bg-clip-text text-transparent">
              Nuestro Arte.
            </span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-gray-200 text-base md:text-xl max-w-2xl mx-auto leading-relaxed font-light"
          >
            Vive una experiencia premium: cortes modernos, fades limpios y barba
            definida por expertos. Agenda en segundos.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center justify-center gap-4 mt-4"
          >
            <motion.button
              whileHover={{ scale: 1.08, y: -3 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleGoToAppointments}
              className="group relative overflow-hidden inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#facc6b] via-[#fbbf24] to-[#f97316] text-black font-bold px-10 py-4 md:px-12 md:py-5 text-base md:text-lg shadow-2xl shadow-[#facc6b]/50 hover:shadow-[#facc6b]/70 transition-all duration-300"
            >
              <Calendar className="h-5 w-5 md:h-6 md:w-6" />
              <span>AGENDAR CITA</span>
              <ArrowRight className="h-5 w-5 md:h-6 md:w-6 transition-transform group-hover:translate-x-1" />
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleGoToAbout}
              className="inline-flex items-center gap-3 rounded-full border-2 border-white/30 bg-white/5 backdrop-blur-2xl text-white font-semibold px-8 py-4 md:px-10 md:py-5 text-base md:text-lg hover:bg-white/10 hover:border-white/50 transition-all duration-300"
            >
              <Scissors className="h-5 w-5 md:h-6 md:w-6" />
              <span>Ver Servicios</span>
            </motion.button>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="mt-10 flex flex-wrap justify-center gap-3 text-sm text-neutral-300"
          >
            {STATS.map((stat) => {
              const IconComponent = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  variants={itemVariants}
                  className="flex items-center gap-2 rounded-2xl border border-white/15 bg-black/40 backdrop-blur-xl px-4 py-2.5"
                >
                  <IconComponent className="h-4 w-4 text-[#facc6b]" strokeWidth={2} />
                  <span className="font-bold text-white text-xs">{stat.value}</span>
                  <span className="text-xs text-neutral-400">{stat.label}</span>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Main Content */}
      <section className="relative">
        {/* Gradiente superior para conectar con el Hero */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black to-transparent z-0 pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 md:py-24 lg:py-28">
          {/* Ofertas Section */}
          {offersSectionEnabled && (
            <motion.div
              id="ofertas"
              className="mb-24 sm:mb-28 md:mb-32"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={containerVariants}
            >
              <div className="text-center mb-14 md:mb-16">
                <motion.p
                  variants={itemVariants}
                  className="text-[11px] uppercase tracking-[0.2em] text-[#facc6b] mb-3"
                >
                  Ofertas Especiales
                </motion.p>
                <motion.h2 variants={itemVariants} className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                  Promociones para tu Estilo
                </motion.h2>
                <motion.p variants={itemVariants} className="text-sm md:text-base text-neutral-300 max-w-2xl mx-auto leading-relaxed">
                  Promociones diseñadas para que pruebes la experiencia Khoopper al mejor precio.
                </motion.p>
              </div>

              {offersLoading ? (
                <div className="text-center text-neutral-400 py-20 text-lg">
                  Cargando ofertas...
                </div>
              ) : offers.length === 0 ? (
                <div className="text-center text-neutral-400 py-20 text-lg">
                  No hay ofertas disponibles en este momento
                </div>
              ) : (
                <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {offers.map((offer) => {
                    const priceDisplay = offer.discount_percentage
                      ? `-${offer.discount_percentage}%`
                      : `$${offer.final_price}`;

                    return (
                      <motion.article
                        key={offer.id}
                        variants={itemVariants}
                        whileHover={{ y: -8, scale: 1.01 }}
                        className="group relative overflow-hidden rounded-3xl border border-white/15 bg-black/40 backdrop-blur-xl cursor-pointer"
                      >
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 border-[#facc6b]/20" />

                        <div className="relative h-64 sm:h-72 lg:h-80 overflow-hidden rounded-t-3xl">
                          <img
                            src={offer.image_url ? (offer.image_url.startsWith('http') ? offer.image_url : `${API_BASE_URL.replace('/api', '')}${offer.image_url}`) : "/images/oferta1.jpg"}
                            alt={offer.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "/images/oferta1.jpg";
                            }}
                          />
                          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
                          {offer.discount_percentage && (
                            <div className="absolute top-4 right-4 px-4 py-2 rounded-full bg-[#facc6b] text-black font-bold text-sm">
                              {priceDisplay}
                            </div>
                          )}
                        </div>

                        <div className="relative p-5">
                          <h3 className="text-lg font-bold text-[#facc6b] mb-2">{offer.name}</h3>
                          {offer.description && (
                            <p className="text-sm text-neutral-300 leading-relaxed mb-4 line-clamp-2">
                              {offer.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-4 border-t border-white/10">
                            {!offer.discount_percentage && (
                              <span className="text-xl font-bold text-white">
                                {priceDisplay}
                              </span>
                            )}
                            {offer.original_price && offer.discount_percentage && (
                              <div className="flex items-baseline gap-2">
                                <span className="text-xl font-bold text-white">
                                  ${offer.final_price}
                                </span>
                                <span className="text-sm text-neutral-400 line-through">
                                  ${offer.original_price}
                                </span>
                              </div>
                            )}
                            <AddToCartButton type="offer" item={offer} />
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* Servicios Section */}
          {servicesSectionEnabled && (
            <motion.div
              id="servicios"
              className="mb-24 sm:mb-28 md:mb-32"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={containerVariants}
            >
              <div className="text-center mb-14 md:mb-16">
                <motion.p
                  variants={itemVariants}
                  className="text-[11px] uppercase tracking-[0.2em] text-[#facc6b] mb-3"
                >
                  Nuestros Servicios
                </motion.p>
                <motion.h2 variants={itemVariants} className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                  Experiencia de Lujo
                </motion.h2>
                <motion.p variants={itemVariants} className="text-sm md:text-base text-neutral-300 max-w-2xl mx-auto leading-relaxed">
                  Cortes y acabados profesionales realizados por expertos. Elige el servicio que mejor se adapte a tu estilo.
                </motion.p>
              </div>

              {servicesLoading ? (
                <div className="text-center text-neutral-400 py-20 text-lg">
                  Cargando servicios...
                </div>
              ) : services.length === 0 ? (
                <div className="text-center text-neutral-400 py-20 text-lg">
                  No hay servicios disponibles en este momento
                </div>
              ) : (
                <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {services.map((service) => (
                    <motion.article
                      key={service.id}
                      variants={itemVariants}
                      whileHover={{ y: -8, scale: 1.01 }}
                      className="group relative overflow-hidden rounded-3xl border border-white/15 bg-black/40 backdrop-blur-xl cursor-pointer flex flex-col h-full"
                    >
                      <div className="relative h-56 sm:h-64 lg:h-72 overflow-hidden rounded-t-3xl">
                        <img
                          src={service.image_url ? (service.image_url.startsWith('http') ? service.image_url : `${API_BASE_URL.replace('/api', '')}${service.image_url}`) : `https://placehold.co/600x400/020617/cccccc?text=${service.name?.[0] || "S"}`}
                          alt={service.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://placehold.co/600x400/020617/cccccc?text=${service.name?.[0] || "S"}`;
                          }}
                        />
                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/60 border border-white/20 text-[10px] font-bold text-white/80 uppercase tracking-widest backdrop-blur-md">
                          Premium
                        </div>
                      </div>

                      <div className="relative p-5 flex flex-col flex-1">
                        <h3 className="text-lg font-bold text-white mb-2">{service.name}</h3>
                        <p className="text-xs text-neutral-400 mb-4 flex items-center gap-1.5">
                          <Clock className="w-3 h-3" /> {service.duration} min de atención personalizada
                        </p>
                        <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/10">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-wider text-neutral-500">Desde</span>
                            <span className="text-xl font-bold text-white">
                              ${parseFloat(service.price || 0).toFixed(2)}
                            </span>
                          </div>
                          <AddToCartButton type="service" item={service} />
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Productos Section */}
          {productsSectionEnabled && (
            <motion.div
              id="productos"
              className="mb-24 sm:mb-28 md:mb-32"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={containerVariants}
            >
              <div className="text-center mb-14 md:mb-16">
                <motion.p
                  variants={itemVariants}
                  className="text-[11px] uppercase tracking-[0.2em] text-[#facc6b] mb-3"
                >
                  Línea Profesional
                </motion.p>
                <motion.h2 variants={itemVariants} className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                  Productos Premium
                </motion.h2>
                <motion.p variants={itemVariants} className="text-sm md:text-base text-neutral-300 max-w-2xl mx-auto leading-relaxed mb-2">
                  Lleva a casa los mismos productos premium que usamos en la barbería.
                </motion.p>
                <motion.p variants={itemVariants} className="text-xs text-neutral-400">
                  {products.length} productos disponibles · Consulta en recepción
                </motion.p>
              </div>

              {productsLoading ? (
                <div className="text-center text-neutral-400 py-20 text-lg">
                  Cargando productos...
                </div>
              ) : products.length === 0 ? (
                <div className="text-center text-neutral-400 py-20 text-lg">
                  No hay productos disponibles en este momento
                </div>
              ) : (
                <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {products.map((product) => (
                    <motion.article
                      key={product.id || product.name}
                      variants={itemVariants}
                      whileHover={{ y: -6, scale: 1.01 }}
                      className="group relative overflow-hidden rounded-3xl border border-white/15 bg-black/40 backdrop-blur-xl transition-all duration-300"
                    >
                      <div className="relative h-56 sm:h-64 lg:h-72 overflow-hidden rounded-t-3xl">
                        <img
                          src={product.image_url ? (product.image_url.startsWith('http') ? product.image_url : `${API_BASE_URL.replace('/api', '')}${product.image_url}`) : "/images/products/placeholder.jpg"}
                          alt={product.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/images/products/placeholder.jpg";
                          }}
                        />
                        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
                        {product.stock !== null && product.stock !== undefined && parseInt(product.stock) <= 5 && (
                          <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-red-600/90 text-white text-xs font-semibold backdrop-blur-sm">
                            Últimas unidades
                          </div>
                        )}
                      </div>

                      <div className="relative p-5">
                        <h3 className="text-base font-bold text-white mb-1 line-clamp-1">{product.name}</h3>
                        <p className="text-xs text-neutral-400 mb-4 line-clamp-1">{product.type || ""}</p>
                        <div className="flex items-center justify-between pt-4 border-t border-white/10">
                          <span className="text-xl font-bold text-[#facc6b]">
                            ${parseFloat(product.price || 0).toFixed(2)}
                          </span>
                          <AddToCartButton type="product" item={product} />
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Experiencia Section */}
          <motion.div
            id="experiencia"
            className="mb-24 sm:mb-28 md:mb-32"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            <div className="text-center mb-14 md:mb-16">
              <motion.p
                variants={itemVariants}
                className="text-[11px] uppercase tracking-[0.2em] text-[#facc6b] mb-3"
              >
                Experiencia Khoopper
              </motion.p>
              <motion.h2 variants={itemVariants} className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                Mucho más que un corte
              </motion.h2>
              <motion.p variants={itemVariants} className="text-sm md:text-base text-neutral-300 max-w-2xl mx-auto leading-relaxed">
                Atención personalizada, barberos profesionales y un ambiente pensado
                para que salgas con tu mejor versión.
              </motion.p>
            </div>

            <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {EXPERIENCE_ITEMS.map((item) => {
                const IconComponent = item.icon;
                return (
                  <motion.div
                    key={item.title}
                    variants={itemVariants}
                    whileHover={{ y: -6, scale: 1.01 }}
                    className="group relative overflow-hidden rounded-3xl border border-white/15 bg-black/40 backdrop-blur-xl p-6 transition-all duration-300"
                  >
                    <div className="relative">
                      <motion.div
                        variants={iconVariants}
                        initial="rest"
                        whileHover="hover"
                        className="mb-5 flex justify-center"
                      >
                        <div className="p-4 rounded-2xl border border-[#facc6b]/20 bg-black/40">
                          <IconComponent className="h-8 w-8 text-[#facc6b]" strokeWidth={2} />
                        </div>
                      </motion.div>
                      <h3 className="text-lg font-bold text-white mb-2 text-center">{item.title}</h3>
                      <p className="text-sm text-neutral-300 leading-relaxed text-center">{item.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Antes y Después Section */}
          <motion.div
            id="antes-despues"
            className="mb-20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            <div className="text-center mb-14 md:mb-16">
              <motion.p
                variants={itemVariants}
                className="text-[11px] uppercase tracking-[0.2em] text-[#facc6b] mb-3"
              >
                Transformaciones Reales
              </motion.p>
              <motion.h2 variants={itemVariants} className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                Antes y Después
              </motion.h2>
              <motion.p variants={itemVariants} className="text-sm md:text-base text-neutral-300 max-w-2xl mx-auto leading-relaxed">
                Próximamente: transformaciones reales de clientes. Cortes, fades y barbas premium.
              </motion.p>
            </div>

            <div className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {MAKEOVER_ITEMS.map((item) => (
                <motion.article
                  key={item.title}
                  variants={itemVariants}
                  whileHover={{ y: -6, scale: 1.01 }}
                  className="group relative overflow-hidden rounded-3xl border border-white/15 bg-black/40 backdrop-blur-xl p-6 transition-all duration-300"
                >
                  <div className="relative mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-neutral-400">
                    <div className="h-px w-8 bg-gradient-to-r from-transparent via-[#facc6b] to-transparent" />
                    <span>Transformación</span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-[#facc6b] mb-5">{item.focus}</p>

                  <div className="space-y-3 mb-5">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-wider text-neutral-400 mb-2">Antes</p>
                      <p className="text-sm text-neutral-300 leading-relaxed">{item.before}</p>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-[#facc6b]/40 bg-[#facc6b]/10 p-4">
                      <p className="text-xs uppercase tracking-wider text-[#facc6b] mb-2 font-semibold">Después</p>
                      <p className="text-sm text-white leading-relaxed">{item.after}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-xs text-neutral-300">
                      <CheckCircle2 className="h-3 w-3 text-[#facc6b]" strokeWidth={2} />
                      <span>Mejora inmediata</span>
                    </span>
                    <span className="text-xs text-neutral-500">~45 min</span>
                  </div>
                </motion.article>
              ))}
            </div>
          </motion.div>

          {/* CTA Final */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="relative rounded-3xl border border-white/15 bg-black/40 backdrop-blur-xl p-10 md:p-12 lg:p-16 overflow-hidden"
          >
            <div className="relative text-center">
              <motion.div
                variants={itemVariants}
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="inline-block mb-5"
              >
                <Sparkles className="h-10 w-10 text-[#facc6b]" strokeWidth={2} />
              </motion.div>
              <motion.h2 variants={itemVariants} className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                ¿Listo para vivir la experiencia Khoopper?
              </motion.h2>
              <motion.p variants={itemVariants} className="text-base md:text-lg text-neutral-300 mb-8 max-w-2xl mx-auto leading-relaxed">
                Únete a nuestra comunidad y descubre por qué miles de clientes confían en nosotros
                para su imagen personal.
              </motion.p>
              <motion.div variants={itemVariants}>
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate("/citas")}
                  className="inline-flex items-center gap-3 rounded-full bg-[#facc6b] px-8 py-4 text-black font-bold text-base shadow-lg hover:bg-[#fbd377] transition-all duration-300 group"
                >
                  <Calendar className="h-5 w-5" />
                  <span>Reservar ahora</span>
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
    </main >
  );
}
