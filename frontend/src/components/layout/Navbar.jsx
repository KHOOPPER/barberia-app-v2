// src/components/layout/Navbar.jsx
import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, ShoppingBag } from "lucide-react";
import logo from "../../assets/logo.png";
import { API_BASE_URL } from "../../config/api.js";
import { useCart } from "../../contexts/CartContext";
import Cart from "../cart/Cart";

// Estilo base para los enlaces: tipografía limpia estilo iOS
const baseLink =
  "uppercase tracking-[0.15em] text-[10px] md:text-xs font-medium transition-all duration-300";

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLogo, setCurrentLogo] = useState(logo);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { getTotalItems } = useCart();
  const totalItems = getTotalItems();
  const navigate = useNavigate();
  const location = useLocation();

  // Cargar logo desde settings
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/settings/logo/current`);
        if (res.ok) {
          const data = await res.json();
          if (data.data?.logo) {
            const logoUrl = data.data.logo.startsWith('http')
              ? data.data.logo
              : `${API_BASE_URL.replace('/api', '')}${data.data.logo}`;
            setCurrentLogo(logoUrl);
          }
        }
      } catch (error) {
        console.error("Error al obtener logo:", error);
      }
    };

    fetchLogo();
  }, []);

  // Función robusta para hacer scroll al inicio
  const scrollToTop = useCallback(() => {
    // Métodos múltiples para máxima compatibilidad
    if (window.scrollTo) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    }
    // Fallback para navegadores antiguos
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }
  }, []);

  // Scroll al inicio cuando cambia la ruta
  useEffect(() => {
    // Scroll inmediato primero
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Scroll suave después de un frame
    requestAnimationFrame(() => {
      scrollToTop();
    });
  }, [location.pathname, scrollToTop]);

  const handleNavigate = useCallback((path) => {
    setIsOpen(false);
    const currentPath = location.pathname;

    // Siempre hacer scroll primero
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Si estamos en otra ruta, navegar
    if (currentPath !== path) {
      navigate(path);
    }

    // Scroll suave después de delays
    requestAnimationFrame(() => {
      scrollToTop();
    });

    setTimeout(() => {
      scrollToTop();
    }, 100);

    setTimeout(() => {
      scrollToTop();
    }, 300);
  }, [navigate, scrollToTop]);

  const handleLogoClick = useCallback(() => {
    setIsOpen(false);
    const currentPath = location.pathname;

    // Siempre hacer scroll primero (inmediato)
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Si estamos en otra página, navegar
    if (currentPath !== "/") {
      navigate("/");
    }

    // Scroll suave después de delays múltiples
    requestAnimationFrame(() => {
      scrollToTop();
    });

    setTimeout(() => {
      scrollToTop();
    }, 50);

    setTimeout(() => {
      scrollToTop();
    }, 150);

    setTimeout(() => {
      scrollToTop();
    }, 300);

    setTimeout(() => {
      scrollToTop();
    }, 500);
  }, [navigate, scrollToTop]);

  // Función para clases de enlaces activos
  const linkClasses = (isActive) =>
    `${baseLink} ${isActive
      ? "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]"
      : "text-white/80 hover:text-white hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]"
    }`;

  return (
    <nav className="fixed top-0 left-0 w-full z-[9999] backdrop-blur-2xl bg-white/5 border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-5 md:px-6 lg:px-8 h-16 sm:h-18 md:h-20 flex items-center justify-between">
        {/* LOGO */}
        <Link
          to="/"
          onClick={handleLogoClick}
          className="flex items-center gap-2 sm:gap-3 select-none group"
        >
          <img
            src={currentLogo}
            alt="Barbershop logo"
            className="h-8 sm:h-9 md:h-10 lg:h-12 w-auto object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              if (e.target.src !== logo) {
                e.target.onerror = null;
                e.target.src = logo;
              }
            }}
          />

          <div className="leading-tight hidden sm:block text-left">
            <p className="text-[8px] sm:text-[9px] md:text-[10px] uppercase tracking-[0.25em] sm:tracking-[0.3em] text-yellow-500/90 font-bold">
              Barber Shop
            </p>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg font-bold text-white tracking-wider sm:tracking-widest">
              PREMIUM
            </p>
          </div>
        </Link>

        {/* MENÚ DESKTOP */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8">
          <NavLink
            to="/"
            onClick={() => handleNavigate("/")}
            className={({ isActive }) => linkClasses(isActive)}
          >
            INICIO
          </NavLink>

          <NavLink
            to="/quienes-somos"
            onClick={() => handleNavigate("/quienes-somos")}
            className={({ isActive }) => linkClasses(isActive)}
          >
            QUIÉNES SOMOS
          </NavLink>

          <NavLink
            to="/citas"
            onClick={() => handleNavigate("/citas")}
            className={({ isActive }) =>
              `
              ${baseLink}
              px-4 lg:px-6 py-2 lg:py-2.5
              rounded-full
              border
              transition-all duration-300
              ${isActive
                ? "bg-yellow-500/20 border-yellow-500 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                : "bg-white/5 border-white/20 text-white/90 hover:bg-yellow-500 hover:border-yellow-500 hover:text-black hover:font-bold hover:shadow-[0_0_20px_rgba(234,179,8,0.4)]"
              }
            `
            }
          >
            AGENDAR CITA
          </NavLink>

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 lg:p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-300 group"
          >
            <ShoppingBag className="w-4 h-4 lg:w-5 lg:h-5 text-white group-hover:text-[#facc6b] transition-colors" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 lg:w-5 lg:h-5 rounded-full bg-[#facc6b] text-black text-[9px] lg:text-[10px] font-bold">
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            )}
          </button>
        </div>

        {/* BOTONES MÓVIL (Carrito + Hamburguesa) */}
        <div className="md:hidden flex items-center gap-2">
          {/* Botón del carrito móvil permanente */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-300 active:scale-90"
          >
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#facc6b] text-black text-[9px] sm:text-[10px] font-bold animate-pulse shadow-[0_0_10px_rgba(250,204,107,0.6)]">
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            )}
          </button>

          <button
            type="button"
            className="
              inline-flex items-center justify-center
              rounded-full
              w-9 h-9 sm:w-10 sm:h-10
              bg-white/10
              text-yellow-400
              backdrop-blur-md
              border border-white/10
              active:scale-90
              transition-all duration-200
            "
            onClick={() => setIsOpen((prev) => !prev)}
          >
            {isOpen ? <X size={18} className="sm:w-5 sm:h-5" /> : <Menu size={18} className="sm:w-5 sm:h-5" />}
          </button>
        </div>

        {/* MENÚ MÓVIL */}
        <div
          className={`
            absolute top-full left-0 w-full
            bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/10
            flex flex-col items-center gap-6 py-8
            transition-all duration-300 ease-in-out origin-top
            shadow-2xl
            ${isOpen ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0 h-0 overflow-hidden"}
          `}
        >
          <NavLink
            to="/"
            onClick={() => handleNavigate("/")}
            className={({ isActive }) => linkClasses(isActive)}
          >
            INICIO
          </NavLink>

          <NavLink
            to="/quienes-somos"
            onClick={() => handleNavigate("/quienes-somos")}
            className={({ isActive }) => linkClasses(isActive)}
          >
            QUIÉNES SOMOS
          </NavLink>

          <NavLink
            to="/citas"
            onClick={() => handleNavigate("/citas")}
            className={({ isActive }) =>
              `
              text-xs font-bold uppercase tracking-widest
              px-8 py-3
              rounded-full
              border border-yellow-500
              text-yellow-400
              hover:bg-yellow-500 hover:text-black
              transition-colors duration-300
              ${isActive ? "bg-yellow-500/10" : "bg-transparent"}
              `
            }
          >
            AGENDAR CITA
          </NavLink>

          <button
            onClick={() => {
              setIsCartOpen(true);
              setIsOpen(false);
            }}
            className="relative p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-300"
          >
            <ShoppingBag className="w-5 h-5 text-white" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-[#facc6b] text-black text-[10px] font-bold">
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Componente del carrito - renderizado fuera del nav para evitar problemas de z-index */}
      {typeof document !== 'undefined' && (
        <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      )}
    </nav>
  );
}

export default memo(Navbar);
