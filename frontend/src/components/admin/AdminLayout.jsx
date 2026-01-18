/**
 * @fileoverview Layout principal del panel administrativo con menú lateral
 * @module components/admin/AdminLayout
 * 
 * He implementado este layout como contenedor principal del panel administrativo.
 * Incluye menú lateral responsive, navegación optimizada y soporte para PWA.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  Calendar,
  Users,
  Scissors,
  Gift,
  ShoppingBag,
  LogOut,
  Home,
  BarChart3,
  Settings,
  UserCheck,
} from "lucide-react";
import { logout } from "../../utils/api.js";
import { API_BASE_URL } from "../../config/api.js";
import { useAdminBackgroundImage } from "../../hooks/useSettings.js";
import logo from "../../assets/logo.png";
import { withAdminPath, getAdminBasePath } from "../../config/adminPath.js";

/**
 * Layout del panel administrativo con menú hamburguesa optimizado
 * He diseñado este componente con optimizaciones de performance usando useCallback
 * y useMemo para evitar re-renders innecesarios.
 */
export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [currentLogo, setCurrentLogo] = useState(logo);
  const { adminBackgroundImage } = useAdminBackgroundImage();

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
        // Fallback al logo por defecto si falla la carga
      }
    };

    fetchLogo();

    return () => {
      mounted = false;
    };
  }, []);

  // Memoizar menuItems para evitar re-renders innecesarios
  const menuItems = useMemo(
    () => [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: BarChart3,
        path: withAdminPath(""),
      },
      {
        id: "clients",
        label: "Clientes",
        icon: UserCheck,
        path: withAdminPath("/clients"),
      },
      {
        id: "reservations",
        label: "Reservas",
        icon: Calendar,
        path: withAdminPath("/reservations"),
      },
      {
        id: "barbers",
        label: "Barberos",
        icon: Users,
        path: withAdminPath("/barbers"),
      },
      {
        id: "services",
        label: "Servicios",
        icon: Scissors,
        path: withAdminPath("/services"),
      },
      {
        id: "offers",
        label: "Ofertas",
        icon: Gift,
        path: withAdminPath("/offers"),
      },
      {
        id: "products",
        label: "Productos",
        icon: ShoppingBag,
        path: withAdminPath("/products"),
      },
      {
        id: "settings",
        label: "Ajustes",
        icon: Settings,
        path: withAdminPath("/settings"),
      },
    ],
    []
  );

  // Callbacks memoizados para mejor rendimiento
  const handleLogout = useCallback(() => {
    logout();
    navigate(getAdminBasePath());
    window.location.reload();
  }, [navigate]);

  const handleNavigate = useCallback(
    (path) => {
      navigate(path);
      setSidebarOpen(false);
    },
    [navigate]
  );

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  // Función memoizada para verificar si una ruta está activa
  const isActive = useCallback(
    (path) => {
      const adminBase = getAdminBasePath();
      if (path === adminBase) {
        return location.pathname === adminBase;
      }
      return location.pathname.startsWith(path);
    },
    [location.pathname]
  );

  // Detectar orientación y tamaño de pantalla para sidebar inteligente
  useEffect(() => {
    const checkOrientation = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortraitMode = height > width;
      const isLarge = width >= 1280; // xl breakpoint o mayor (pantallas grandes)

      setIsPortrait(isPortraitMode);
      setIsLargeScreen(isLarge);

      // Lógica inteligente:
      // - En monitores verticales (portrait) y pantallas pequeñas/medianas: ocultar sidebar
      // - En landscape o pantallas grandes (>= 1280px): sidebar siempre disponible
      // Nota: El sidebar desktop solo se renderiza si (!isPortrait || isLargeScreen)
    };

    // Verificar al montar
    checkOrientation();

    // Escuchar cambios de tamaño y orientación con debounce para mejor rendimiento
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkOrientation, 150);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Prevenir scroll del body cuando el sidebar móvil está abierto (solo en mobile)
  useEffect(() => {
    if (sidebarOpen && window.innerWidth < 1024) {
      // Solo prevenir scroll en mobile cuando el sidebar está abierto
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      // Restaurar scroll normal
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    }
    return () => {
      // Cleanup: siempre restaurar al desmontar
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, [sidebarOpen]);

  // Construir la URL del fondo del admin
  const adminBackgroundUrl = adminBackgroundImage
    ? (adminBackgroundImage.startsWith('http')
      ? adminBackgroundImage
      : `${API_BASE_URL.replace('/api', '')}${adminBackgroundImage}`)
    : null;

  return (
    <div
      className="h-screen w-full text-white flex flex-col lg:flex-row justify-start items-start overflow-hidden relative bg-black"
      style={{ margin: 0, padding: 0, top: 0, left: 0 }}
    >
      {/* Imagen de fondo - Fixed para que no ocupe espacio en el flujo */}
      {adminBackgroundUrl && (
        <div
          className="fixed inset-0 w-full h-full pointer-events-none z-0"
          style={{
            backgroundImage: `url(${adminBackgroundUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed'
          }}
        />
      )}

      {/* Capa oscura para mejorar legibilidad - más opaca en mobile */}
      {adminBackgroundUrl && (
        <div className="fixed inset-0 bg-black/60 lg:bg-black/40 pointer-events-none z-[1]" />
      )}
      {/* Sidebar - Desktop: Inteligente - se oculta en portrait, visible en landscape grande */}
      {/* Solo visible en lg+ y cuando NO es portrait o cuando es pantalla grande */}
      {(!isPortrait || isLargeScreen) && (
        <aside
          className="hidden lg:flex lg:flex-col w-56 xl:w-64 2xl:w-72 border-r border-white/10 shadow-2xl flex-shrink-0 h-screen will-change-transform relative z-10 transition-all duration-300 ease-out"
          style={{
            margin: 0,
            padding: 0,
            top: 0,
            background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.08) 0%, rgba(0, 122, 255, 0.02) 50%, rgba(0, 0, 0, 0.4) 100%)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          }}
        >
          {/* Logo/Header */}
          <div className="p-2 lg:p-3 xl:p-4 2xl:p-5 border-b border-white/10 flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.12) 0%, rgba(0, 122, 255, 0.05) 50%, rgba(0, 0, 0, 0.3) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            }}
          >
            <img
              src={currentLogo}
              alt="Logo"
              className="h-8 lg:h-10 xl:h-12 2xl:h-14 w-auto object-contain"
              onError={(e) => {
                if (e.target.src !== logo) {
                  e.target.onerror = null;
                  e.target.src = logo;
                }
              }}
              loading="eager"
              decoding="sync"
            />
          </div>

          {/* Navigation */}
          <nav className="p-2.5 lg:p-3 xl:p-4 flex-1 overflow-y-auto overscroll-contain">
            <ul className="space-y-1 lg:space-y-1.5 xl:space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleNavigate(item.path)}
                      className={`
                      w-full flex items-center gap-2 lg:gap-2.5 xl:gap-3 px-2.5 lg:px-3 xl:px-3.5 py-2 lg:py-2.5 xl:py-3 rounded-lg lg:rounded-xl
                      transition-all duration-200 ease-out
                      ${active
                          ? "text-white border border-blue-500/40 shadow-lg shadow-blue-500/20 backdrop-blur-xl"
                          : "text-white/70 hover:bg-white/5 hover:text-white transition-all duration-200"
                        }
                    `}
                      style={active ? {
                        background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.25) 0%, rgba(0, 122, 255, 0.15) 100%)',
                      } : {}}
                    >
                      <Icon className="h-4 w-4 lg:h-5 lg:w-5 xl:h-5 xl:w-5 flex-shrink-0" />
                      <span className="font-medium text-xs lg:text-sm xl:text-base">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-2.5 lg:p-3 xl:p-4 border-t border-white/10 flex-shrink-0 space-y-1.5 lg:space-y-2"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 122, 255, 0.08) 50%, rgba(0, 122, 255, 0.05) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            }}
          >
            <button
              onClick={() => navigate("/")}
              className="w-full flex items-center gap-2 lg:gap-2.5 xl:gap-3 px-2.5 lg:px-3 xl:px-3.5 py-2 lg:py-2.5 xl:py-3 rounded-lg lg:rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-all duration-200 active:scale-[0.98]"
            >
              <Home className="h-4 w-4 lg:h-5 lg:w-5 xl:h-5 xl:w-5 flex-shrink-0" />
              <span className="text-xs lg:text-sm xl:text-base">Ver sitio</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 lg:gap-2.5 xl:gap-3 px-2.5 lg:px-3 xl:px-3.5 py-2 lg:py-2.5 xl:py-3 rounded-lg lg:rounded-xl text-white/70 hover:bg-white/5 hover:text-white transition-all duration-200 active:scale-[0.98]"
            >
              <LogOut className="h-4 w-4 lg:h-5 lg:w-5 xl:h-5 xl:w-5 flex-shrink-0" />
              <span className="text-xs lg:text-sm xl:text-base">Cerrar sesión</span>
            </button>
          </div>
        </aside>
      )}

      {/* Mobile sidebar overlay - Visible cuando sidebar está abierto en móvil O en portrait */}
      {sidebarOpen && (
        <div
          className={`fixed inset-0 bg-black/80 z-40 backdrop-blur-sm ${(isPortrait && !isLargeScreen) ? 'lg:block' : 'lg:hidden'
            }`}
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar - También disponible en desktop cuando está en portrait */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-[260px] sm:w-[280px] md:w-72 max-w-[75vw] sm:max-w-[70vw] border-r border-white/10 z-50
          transform transition-transform duration-300 ease-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          shadow-2xl
          flex flex-col
          will-change-transform
          ${(isPortrait && !isLargeScreen) ? 'lg:flex' : 'lg:hidden'}
        `}
        style={{
          margin: 0,
          padding: 0,
          top: 0,
          left: 0,
          background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.08) 0%, rgba(0, 122, 255, 0.02) 50%, rgba(0, 0, 0, 0.4) 100%)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        }}
      >
        {/* Mobile Header - Logo y botón X separados correctamente */}
        <div className="px-2.5 sm:px-3 py-2 sm:py-2.5 border-b border-white/10 flex items-center justify-between flex-shrink-0 gap-2 sm:gap-3"
          style={{
            margin: 0,
            paddingTop: '0.5rem',
            paddingBottom: '0.5rem',
            background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.12) 0%, rgba(0, 122, 255, 0.05) 50%, rgba(0, 0, 0, 0.3) 100%)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          }}
        >
          <div className="flex items-center justify-center flex-shrink-0">
            <img
              src={currentLogo}
              alt="Logo"
              className="h-7 sm:h-8 md:h-10 w-auto object-contain"
              onError={(e) => {
                if (e.target.src !== logo) {
                  e.target.onerror = null;
                  e.target.src = logo;
                }
              }}
              loading="eager"
              decoding="sync"
            />
          </div>
          <button
            onClick={closeSidebar}
            className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors duration-150 active:scale-95 flex-shrink-0"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Mobile Navigation - Fixed height, scroll interno */}
        <nav className="flex-1 overflow-y-auto overscroll-contain p-2.5 sm:p-3 md:p-4 min-h-0">
          <ul className="space-y-1 sm:space-y-1.5 md:space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigate(item.path)}
                    className={`
                      w-full flex items-center gap-2 sm:gap-2.5 md:gap-3 px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 md:py-2.5 rounded-lg sm:rounded-xl
                      transition-all duration-200 ease-out
                      active:scale-[0.98]
                      ${active
                        ? "text-white border border-blue-500/40 shadow-lg shadow-blue-500/20 backdrop-blur-xl"
                        : "text-white/70 hover:bg-white/5 hover:text-white transition-all duration-200"
                      }
                    `}
                    style={active ? {
                      background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.25) 0%, rgba(0, 122, 255, 0.15) 100%)',
                    } : {}}
                  >
                    <Icon className="h-4 w-4 sm:h-4 sm:w-4 md:h-5 md:w-5 flex-shrink-0" />
                    <span className="font-medium text-xs sm:text-sm md:text-base">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Mobile Footer */}
        <div className="p-2.5 sm:p-3 md:p-4 border-t border-white/10 flex-shrink-0 space-y-1 sm:space-y-1.5 md:space-y-2"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 122, 255, 0.08) 50%, rgba(0, 122, 255, 0.05) 100%)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          }}
        >
          <button
            onClick={() => {
              navigate("/");
              closeSidebar();
            }}
            className="w-full flex items-center gap-2 sm:gap-2.5 md:gap-3 px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 md:py-2.5 rounded-lg sm:rounded-xl text-neutral-300 hover:bg-white/10 hover:text-white transition-all duration-150 active:scale-[0.98]"
          >
            <Home className="h-4 w-4 sm:h-4 sm:w-4 md:h-5 md:w-5 flex-shrink-0" />
            <span className="text-xs sm:text-sm md:text-base">Ver sitio</span>
          </button>
          <button
            onClick={() => {
              handleLogout();
              closeSidebar();
            }}
            className="w-full flex items-center gap-2 sm:gap-2.5 md:gap-3 px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 md:py-2.5 rounded-lg sm:rounded-xl text-white/70 hover:bg-white/5 hover:text-white transition-all duration-200 active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4 sm:h-4 sm:w-4 md:h-5 md:w-5 flex-shrink-0" />
            <span className="text-xs sm:text-sm md:text-base">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content - Único contenedor de scroll: 100% width en mobile, flex-1 en desktop */}
      {/* Se ajusta automáticamente cuando el sidebar se oculta en portrait */}
      <div
        className={`w-full lg:flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative z-[10] transition-all duration-300 ${isPortrait && !isLargeScreen ? 'lg:ml-0' : 'lg:ml-0'}`}
        style={{ width: '100%', minWidth: 0, margin: 0, padding: 0, top: 0 }}
      >
        {/* Top Bar - En flujo normal, pegado arriba, sin padding vertical excesivo */}
        <header className="border-b border-white/10 px-3 sm:px-4 md:px-5 lg:px-6 py-1 sm:py-1.5 md:py-2 lg:py-2.5 flex items-center justify-between shadow-lg flex-shrink-0 h-11 sm:h-12 md:h-14 lg:h-16 xl:h-18 w-full relative z-[30]"
          style={{
            margin: 0,
            paddingTop: '0.25rem',
            paddingBottom: '0.25rem',
            top: 0,
            background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.08) 0%, rgba(0, 122, 255, 0.02) 50%, rgba(0, 0, 0, 0.4) 100%)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          }}
        >
          {/* Botón hamburguesa: visible en móvil O cuando el sidebar está oculto en portrait */}
          <button
            onClick={toggleSidebar}
            className={`p-2 sm:p-2.5 md:p-3 hover:bg-white/10 rounded-lg transition-all duration-200 active:scale-95 flex-shrink-0 ${(isPortrait && !isLargeScreen) ? 'lg:flex' : 'lg:hidden'
              }`}
            aria-label="Abrir menú"
            style={{
              background: 'rgba(0, 122, 255, 0.1)',
              border: '1px solid rgba(0, 122, 255, 0.2)',
            }}
          >
            <Menu className="h-5 w-5 sm:h-6 sm:w-6 md:h-6 md:w-6 text-blue-300" />
          </button>
          <div className="flex-1" />
        </header>

        {/* Content Area - ÚNICO scroll container con flex-1 y overflow-y-auto, empieza inmediatamente después del header */}
        <main className="flex-1 w-full min-w-0 max-w-full bg-transparent overflow-y-auto overscroll-contain overflow-x-hidden relative z-[10] pt-4 sm:pt-5 md:pt-6 lg:pt-8 pb-8 sm:pb-12 md:pb-16" style={{ WebkitOverflowScrolling: 'touch', minHeight: 0 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
