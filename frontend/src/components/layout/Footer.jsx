import { useState, useEffect, memo, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  Facebook,
  Instagram,
  Phone,
  Clock,
  Scissors,
  Calendar,
  ArrowRight,
  Sparkles,
  Mail,
  Home,
  Info
} from "lucide-react";
import { motion } from "framer-motion";
// import { WHATSAPP_NUMBER } from "../../data/mock";
const WHATSAPP_NUMBER = "00000000";
import { API_BASE_URL } from "../../config/api.js";

const footerLinks = {
  empresa: [
    { label: "Inicio", path: "/" },
    { label: "Quiénes Somos", path: "/quienes-somos" },
    { label: "Servicios", path: "/citas" },
  ],
  servicios: [
    { label: "Cortes Premium", path: "/citas" },
    { label: "Barba y Bigote", path: "/citas" },
    { label: "Productos", path: "/#productos" },
  ],
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

function Footer() {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [currentLogo, setCurrentLogo] = useState(null);

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/settings/logo/current`);
        if (res.ok) {
          const data = await res.json();
          if (data.data?.logo) {
            setCurrentLogo(`${API_BASE_URL.replace('/api', '')}${data.data.logo}`);
          }
        }
      } catch (error) {
        // Silently fail, use default logo
      }
    };
    fetchLogo();
  }, []);

  return (
    <motion.footer
      className="relative mt-24 border-t border-white/10 bg-gradient-to-b from-black/60 via-black/40 to-black/80 backdrop-blur-2xl text-neutral-300 overflow-hidden"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={containerVariants}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(250,204,107,0.05),transparent_70%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {/* Logo y Descripción */}
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4 group">
              {currentLogo ? (
                <img
                  src={currentLogo}
                  alt="BarberShop Logo"
                  className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <Sparkles className="h-10 w-10 text-[#facc6b]" strokeWidth={2} />
              )}
            </Link>
            <p className="text-sm text-neutral-400 leading-relaxed mb-6">
              Barbería premium especializada en cortes modernos, fades y barba definida en un ambiente elegante y exclusivo.
            </p>
            <div className="flex items-center gap-4">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full border border-[#facc6b]/20 bg-black/40 hover:bg-[#facc6b]/10 hover:border-[#facc6b]/40 transition-all duration-200 group"
                aria-label="WhatsApp"
              >
                <Phone className="h-4 w-4 text-[#facc6b] group-hover:scale-110 transition-transform" strokeWidth={2} />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full border border-[#facc6b]/20 bg-black/40 hover:bg-[#facc6b]/10 hover:border-[#facc6b]/40 transition-all duration-200 group"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4 text-[#facc6b] group-hover:scale-110 transition-transform" strokeWidth={2} />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full border border-[#facc6b]/20 bg-black/40 hover:bg-[#facc6b]/10 hover:border-[#facc6b]/40 transition-all duration-200 group"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4 text-[#facc6b] group-hover:scale-110 transition-transform" strokeWidth={2} />
              </a>
            </div>
          </motion.div>

          {/* Enlaces Rápidos */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-2 mb-4">
              <Home className="h-4 w-4 text-[#facc6b]" strokeWidth={2} />
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider">ENLACES RÁPIDOS</h3>
            </div>
            <ul className="space-y-3">
              {footerLinks.empresa.map((link, idx) => (
                <li key={`empresa-${idx}-${link.path}`}>
                  <Link
                    to={link.path}
                    className="text-sm text-neutral-400 hover:text-[#facc6b] transition-colors duration-200 flex items-center gap-2 group"
                  >
                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all duration-200" strokeWidth={2} />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Servicios */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-2 mb-4">
              <Scissors className="h-4 w-4 text-[#facc6b]" strokeWidth={2} />
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider">SERVICIOS</h3>
            </div>
            <ul className="space-y-3 mb-6">
              {footerLinks.servicios.map((link, idx) => (
                <li key={`servicios-${idx}-${link.path}`}>
                  <Link
                    to={link.path}
                    className="text-sm text-neutral-400 hover:text-[#facc6b] transition-colors duration-200 flex items-center gap-2 group"
                  >
                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all duration-200" strokeWidth={2} />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              to="/citas"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#facc6b]/30 bg-[#facc6b]/10 hover:bg-[#facc6b]/20 hover:border-[#facc6b]/50 text-[#facc6b] text-sm font-medium transition-all duration-200 group"
            >
              <Calendar className="h-4 w-4" strokeWidth={2} />
              <span>Agendar Cita</span>
              <ArrowRight className="h-3 w-3 transform group-hover:translate-x-1 transition-transform" strokeWidth={2} />
            </Link>
          </motion.div>

          {/* Contacto */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-2 mb-4">
              <Phone className="h-4 w-4 text-[#facc6b]" strokeWidth={2} />
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider">CONTACTO</h3>
            </div>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-[#facc6b] mt-0.5 flex-shrink-0" strokeWidth={2} />
                <span className="text-sm text-neutral-400">Av. La Paz #10, Col. Centro Ciudad, País</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-[#facc6b] flex-shrink-0" strokeWidth={2} />
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-neutral-400 hover:text-[#facc6b] transition-colors duration-200"
                >
                  +{WHATSAPP_NUMBER}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-[#facc6b] mt-0.5 flex-shrink-0" strokeWidth={2} />
                <span className="text-sm text-neutral-400">
                  Lun - Sáb: 9:00 AM - 6:00 PM<br />
                  Dom: Cerrado
                </span>
              </li>
            </ul>
          </motion.div>
        </div>

        {/* Copyright */}
        <motion.div
          variants={itemVariants}
          className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4"
        >
          <p className="text-xs text-neutral-500">
            ©{currentYear} BarberShop Premium. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4">
            <Link
              to="/privacidad"
              className="hover:text-[#facc6b] transition-colors duration-200 flex items-center gap-1.5 text-xs text-neutral-400"
            >
              <Mail className="h-3 w-3 text-[#facc6b]/60" strokeWidth={2} />
              <span>Política de Privacidad</span>
            </Link>
            <Link
              to="/terminos"
              className="hover:text-[#facc6b] transition-colors duration-200 flex items-center gap-1.5 text-xs text-neutral-400"
            >
              <Info className="h-3 w-3 text-[#facc6b]/60" strokeWidth={2} />
              <span>Términos y Condiciones</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </motion.footer>
  );
}

export default memo(Footer);
