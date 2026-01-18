import { useCallback, memo } from "react";
import {
  Sparkles,
  Scissors,
  Crown,
  Users,
  Clock,
  Star,
  MapPin,
  Award,
  Target,
  Heart,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import usePageSEO from "../../hooks/usePageSEO";

const stats = [
  { label: "Desde", value: "2016", desc: "Años perfeccionando el arte", icon: Calendar },
  { label: "Clientes felices", value: "+8,000", desc: "Reservas atendidas", icon: Users },
  { label: "Calificación", value: "4.9", desc: "Estrellas promedio", icon: Star },
  { label: "Barberos expertos", value: "15+", desc: "Especialistas certificados", icon: Award },
];

const values = [
  {
    icon: Crown,
    title: "Experiencia Premium",
    description: "Citas programadas, servicio sin prisas y atención personalizada. Tu corte no es un número más en la lista, es un trabajo de detalle artesanal.",
    gradient: "from-[#facc6b]/20 via-[#facc6b]/10 to-transparent",
  },
  {
    icon: Scissors,
    title: "Técnica + Tendencia",
    description: "Mezclamos las técnicas clásicas de barbería con lo último en fades, texturizados y estilos urbanos para que siempre te veas actual y sofisticado.",
    gradient: "from-[#fbbf24]/20 via-[#fbbf24]/10 to-transparent",
  },
  {
    icon: Heart,
    title: "Nuestra Comunidad",
    description: "Muchos clientes comienzan con una cita de prueba y terminan volviendo mes a mes. La idea es simple: que siempre tengas una silla reservada en tu casa de barbería.",
    gradient: "from-[#f97316]/20 via-[#f97316]/10 to-transparent",
  },
  {
    icon: Target,
    title: "Perfección en Detalles",
    description: "Cada corte es una obra maestra. Nos enfocamos en cada línea, cada ángulo y cada textura para crear un resultado que se adapte perfectamente a tu personalidad.",
    gradient: "from-[#facc6b]/20 via-[#fbbf24]/10 to-transparent",
  },
  {
    icon: TrendingUp,
    title: "Evolución Constante",
    description: "Nuestro equipo se mantiene al día con las últimas tendencias y técnicas. Capacitación continua para ofrecerte siempre lo mejor del mundo de la barbería.",
    gradient: "from-[#f97316]/20 via-[#facc6b]/10 to-transparent",
  },
  {
    icon: Award,
    title: "Certificaciones",
    description: "Todos nuestros barberos están certificados y tienen años de experiencia. Confía en profesionales que conocen cada aspecto de su oficio.",
    gradient: "from-[#fbbf24]/20 via-[#f97316]/10 to-transparent",
  },
];

const features = [
  { icon: Clock, text: "Atención con cita para respetar tu tiempo" },
  { icon: Users, text: "Equipo especializado en fades, barbas y estilo moderno" },
  { icon: MapPin, text: "Ubicación céntrica, ambiente privado y cómodo" },
  { icon: CheckCircle2, text: "Productos de primera calidad en cada servicio" },
];

function Quienes() {
  const navigate = useNavigate();

  const handleNavigateToCitas = useCallback(() => {
    navigate("/citas");
  }, [navigate]);

  usePageSEO({
    title: "Quiénes somos | BarberShop Premium",
    description:
      "Conoce la historia, valores y experiencia de nuestra Barbería Premium: un espacio pensado para que cada visita se sienta como una experiencia de autor.",
    keywords:
      "quiénes somos barbería, historia barbería, barbería premium, barberos profesionales",
    path: "/quienes-somos",
  });

  return (
    <section
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-20 lg:py-24 text-white"
    >
      {/* Hero Section */}
      <div className="text-center mb-16 md:mb-20">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#facc6b]/30 bg-gradient-to-r from-[#facc6b]/10 via-[#facc6b]/5 to-transparent px-5 py-2 text-xs uppercase tracking-[0.25em] text-[#facc6b] backdrop-blur-xl mb-6 shadow-lg shadow-[#facc6b]/10">
          <Sparkles className="h-4 w-4" />
          Quiénes somos
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
          <span className="bg-gradient-to-r from-[#facc6b] via-[#fbbf24] to-[#f97316] bg-clip-text text-transparent">
            BARBERSHOP PREMIUM
          </span>
          <br />
          <span className="text-white/90">Mucho más que un corte</span>
        </h1>

        <p className="text-lg sm:text-xl text-neutral-300 max-w-3xl mx-auto leading-relaxed">
          Una barbería donde cada visita se siente como entrar a un club privado.
          Un espacio elegante, minimalista y moderno, inspirado en las barberías más
          exclusivas del mundo.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-16 md:mb-20">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <motion.div
              key={index}
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="group relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-white/5 to-black/40 p-6 backdrop-blur-2xl shadow-xl hover:shadow-2xl hover:border-[#facc6b]/30 transition-all duration-150 overflow-hidden will-change-transform"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#facc6b]/0 via-[#facc6b]/0 to-[#facc6b]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-[#facc6b]/20 to-[#facc6b]/5 border border-[#facc6b]/20">
                    <IconComponent className="h-5 w-5 text-[#facc6b]" />
                  </div>
                </div>
                <p className="text-xs uppercase tracking-wider text-neutral-400 mb-2">{stat.label}</p>
                <p className="text-2xl md:text-3xl font-bold text-[#facc6b] mb-1">{stat.value}</p>
                <p className="text-xs text-neutral-400">{stat.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 mb-16 md:mb-20">
        {/* Left Column - Story */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-white/5 to-black/40 p-8 backdrop-blur-2xl shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-[#facc6b]/20 via-[#facc6b]/10 to-black border border-[#facc6b]/20 shadow-lg">
                <Scissors className="h-6 w-6 text-[#facc6b]" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#facc6b] mb-1">
                  Nuestra historia
                </p>
                <h2 className="text-xl font-bold text-white">
                  De una silla a una experiencia completa
                </h2>
              </div>
            </div>

            <div className="space-y-4 text-neutral-300 leading-relaxed">
              <p>
                <span className="text-[#facc6b] font-semibold">Esta Barbería</span>{" "}
                comenzó como un pequeño local con una sola silla y un sueño: demostrar que
                una barbería podía sentirse tan cuidada como un estudio de diseño.
              </p>
              <p>
                Inspirados en las barberías más exclusivas de grandes ciudades, mezclamos
                técnicas clásicas con tendencias modernas, creando un espacio único donde
                la tradición se encuentra con la innovación.
              </p>
              <p>
                Hoy nuestro equipo está formado por barberos especialistas en diferentes
                estilos, que se capacitan constantemente y cuidan cada detalle milimétrico
                en cada corte. Todo con un objetivo claro:{" "}
                <span className="text-white font-semibold">que salgas sintiendo que llevas tu mejor versión.</span>
              </p>
            </div>
          </div>

          {/* Features List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <motion.div
                  key={index}
                  whileHover={{ x: 3 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl will-change-transform"
                >
                  <div className="p-2 rounded-lg bg-gradient-to-br from-[#facc6b]/20 to-[#facc6b]/5">
                    <IconComponent className="h-4 w-4 text-[#facc6b]" />
                  </div>
                  <span className="text-sm text-neutral-300">{feature.text}</span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right Column - Mission */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-white/5 to-black/40 p-8 backdrop-blur-2xl shadow-2xl h-full flex flex-col">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-[#fbbf24]/20 via-[#fbbf24]/10 to-black border border-[#fbbf24]/20 shadow-lg">
                <Target className="h-6 w-6 text-[#fbbf24]" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#fbbf24] mb-1">
                  Nuestra misión
                </p>
                <h2 className="text-xl font-bold text-white">
                  Excelencia en cada detalle
                </h2>
              </div>
            </div>

            <div className="space-y-4 text-neutral-300 leading-relaxed flex-1">
              <p>
                Nacimos con una idea clara: crear una barbería donde cada visita se sienta
                como entrar a un <span className="text-white font-semibold">club privado exclusivo</span>.
                Un espacio elegante, minimalista y moderno, pero con la esencia auténtica
                que nos define.
              </p>
              <p>
                Aquí no solo te cortamos el cabello: cuidamos cada detalle, desde la música
                y la iluminación, hasta el aroma de los productos premium. Nuestro equipo
                se especializa en <span className="text-[#facc6b]">fades limpios</span>,{" "}
                <span className="text-[#facc6b]">barbas definidas</span> y estilos que se
                adaptan perfectamente a tu personalidad y ritmo de vida.
              </p>
              <p className="text-white/80 font-medium">
                Cada cliente es único. Cada corte es una obra de arte.
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNavigateToCitas}
              transition={{ duration: 0.12, ease: "easeOut" }}
              className="mt-8 w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-[#facc6b] via-[#fbbf24] to-[#f97316] p-4 text-black font-bold shadow-xl hover:shadow-2xl transition-all duration-150 flex items-center justify-center gap-2 will-change-transform"
            >
              <span>Agendar tu cita</span>
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Values Grid */}
      <div className="mb-12">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-[#facc6b] mb-3">
            Nuestros valores
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Lo que nos hace diferentes
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {values.map((value, index) => {
            const IconComponent = value.icon;
            return (
              <motion.div
                key={index}
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${value.gradient} backdrop-blur-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-150 cursor-pointer will-change-transform`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                <div className="relative">
                  <div
                    className="p-4 rounded-2xl bg-gradient-to-br from-[#facc6b]/20 to-[#facc6b]/5 border border-[#facc6b]/20 w-fit mb-4 shadow-lg group-hover:scale-110 transition-transform duration-150 will-change-transform"
                  >
                    <IconComponent className="h-6 w-6 text-[#facc6b]" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3">{value.title}</h3>
                  <p className="text-sm text-neutral-300 leading-relaxed">{value.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative rounded-3xl border border-[#facc6b]/20 bg-gradient-to-r from-[#facc6b]/10 via-[#fbbf24]/5 to-[#f97316]/10 p-8 md:p-12 backdrop-blur-2xl shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(250,204,107,0.1),transparent_70%)]" />
        <div className="relative text-center">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            style={{ willChange: "transform" }}
            className="inline-block mb-6"
          >
            <Sparkles className="h-12 w-12 text-[#facc6b]" />
          </motion.div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            ¿Listo para vivir la experiencia Premium?
          </h2>
          <p className="text-lg text-neutral-300 mb-8 max-w-2xl mx-auto">
            Únete a nuestra comunidad y descubre por qué miles de clientes confían en nosotros
            para su imagen personal.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/citas")}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-[#facc6b] via-[#fbbf24] to-[#f97316] px-8 py-4 text-black font-bold shadow-xl hover:shadow-2xl transition-all duration-150 group will-change-transform"
          >
            <Calendar className="h-5 w-5" />
            <span>Reservar ahora</span>
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </motion.button>
        </div>
      </div>
    </section>
  );
}

export default memo(Quienes);
