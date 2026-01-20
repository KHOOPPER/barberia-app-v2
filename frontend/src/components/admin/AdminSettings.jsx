
import { useEffect, useState, useCallback } from "react";
import { Upload, Image as ImageIcon, Settings2, Tag, X, Edit, Video } from "lucide-react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "../ui/GlassCard";
import DiscountCodesManager from "./DiscountCodesManager.jsx";
import VideoConfigCard from "./VideoConfigCard.jsx";
import { API_BASE_URL } from "../../config/api.js";
import { apiRequest } from "../../utils/api.js";
import logoDefault from "../../assets/logo.png";
import { processImageUrl } from "../../utils/imageUrlHelper.js";

export default function AdminSettings() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [showAdminBackgroundModal, setShowAdminBackgroundModal] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);

  const [backgroundImage, setBackgroundImage] = useState(null);
  const [backgroundPreview, setBackgroundPreview] = useState(null);
  const [selectedBackgroundFile, setSelectedBackgroundFile] = useState(null);

  const [adminBackgroundImage, setAdminBackgroundImage] = useState(null);
  const [adminBackgroundPreview, setAdminBackgroundPreview] = useState(null);
  const [selectedAdminBackgroundFile, setSelectedAdminBackgroundFile] = useState(null);
  const [uploadingAdminBackground, setUploadingAdminBackground] = useState(false);

  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [selectedLogoFile, setSelectedLogoFile] = useState(null);
  const [currentLogo, setCurrentLogo] = useState(logoDefault);

  // Estados para modal de conversión
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [conversionMessage, setConversionMessage] = useState('');
  const [conversionSuccess, setConversionSuccess] = useState(false);

  // Estados para configuración multi-fuente de video
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoType, setVideoType] = useState('default'); // default, upload, youtube, drive
  const [videoUrl, setVideoUrl] = useState('');
  const [heroImages, setHeroImages] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [updatingVideo, setUpdatingVideo] = useState(false);

  // Cargar logo desde settings
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const data = await apiRequest("/settings/logo/current");
        if (data.data?.logo) {
          const logoUrl = data.data.logo.startsWith('http')
            ? data.data.logo
            : `${API_BASE_URL.replace('/api', '')}${data.data.logo}`;
          setCurrentLogo(logoUrl);
        }
      } catch (error) {
        console.error("Error al obtener logo:", error);
      }
    };

    fetchLogo();
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener fondos actuales y logo en paralelo
      const [bgData, adminBgData, logoData] = await Promise.all([
        apiRequest("/settings/background/current").catch(() => ({})),
        apiRequest("/settings/admin-background/current").catch(() => ({})),
        apiRequest("/settings/logo/current").catch(() => ({}))
      ]);

      if (bgData.data?.backgroundImage) {
        setBackgroundImage(bgData.data.backgroundImage);
        const bgUrl = bgData.data.backgroundImage.startsWith('http')
          ? bgData.data.backgroundImage
          : `${API_BASE_URL.replace('/api', '')}${bgData.data.backgroundImage}`;
        setBackgroundPreview(bgUrl);
      }

      if (adminBgData.data?.adminBackgroundImage) {
        setAdminBackgroundImage(adminBgData.data.adminBackgroundImage);
        const adminBgUrl = adminBgData.data.adminBackgroundImage.startsWith('http')
          ? adminBgData.data.adminBackgroundImage
          : `${API_BASE_URL.replace('/api', '')}${adminBgData.data.adminBackgroundImage}`;
        setAdminBackgroundPreview(adminBgUrl);
      }

      if (logoData.data?.logo) {
        setLogo(logoData.data.logo);
        const logoUrl = logoData.data.logo.startsWith('http')
          ? logoData.data.logo
          : `${API_BASE_URL.replace('/api', '')}${logoData.data.logo}`;
        setLogoPreview(logoUrl);
      }
    } catch (err) {
      console.error(err);
      setError("Error al cargar ajustes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    // Verificar si hay un mensaje de éxito pendiente después de reload
    const pendingMessage = localStorage.getItem('settings_success_message');
    if (pendingMessage) {
      setSuccessMessage(pendingMessage);
      setShowSuccessModal(true);
      localStorage.removeItem('settings_success_message');

      // Scroll automático hacia arriba
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [fetchSettings]);

  // Cargar configuración de video multi-fuente
  useEffect(() => {
    const fetchVideoConfig = async () => {
      try {
        const data = await apiRequest("/settings/homepage-video-config");
        if (data.data) {
          setVideoType(data.data.type || 'default');
          setVideoUrl(data.data.url || '');
          setHeroImages(data.data.images || []);
        }
      } catch (error) {
        console.error("Error al obtener configuración de video:", error);
      }
    };

    fetchVideoConfig();
  }, []);




  const handleBackgroundUrlChange = useCallback((e) => {
    let url = e.target.value;
    setSelectedBackgroundFile(url);
    if (url && url.startsWith('http')) {
      // Convertir automáticamente si es de Google Drive
      const processedUrl = processImageUrl(url);
      if (processedUrl) {
        setBackgroundPreview(processedUrl);
        setError(null);
      }
    }
  }, []);

  const handleAdminBackgroundUrlChange = useCallback((e) => {
    let url = e.target.value;
    setSelectedAdminBackgroundFile(url);
    if (url && url.startsWith('http')) {
      const processedUrl = processImageUrl(url);
      if (processedUrl) {
        setAdminBackgroundPreview(processedUrl);
        setError(null);
      }
    }
  }, []);

  const handleLogoUrlChange = useCallback((e) => {
    let url = e.target.value;
    setSelectedLogoFile(url);
    if (url && url.startsWith('http')) {
      const processedUrl = processImageUrl(url);
      if (processedUrl) {
        setLogoPreview(processedUrl);
        setError(null);
      }
    }
  }, []);

  const handleUploadBackground = useCallback(async () => {
    if (!selectedBackgroundFile) {
      setError("Por favor ingresa una URL de imagen");
      return;
    }

    try {
      setUploadingBackground(true);
      setError(null);

      const processedUrl = processImageUrl(selectedBackgroundFile);
      if (!processedUrl) {
        setError("URL de imagen no válida");
        setUploadingBackground(false);
        return;
      }

      const responseData = await apiRequest("/settings/upload-background", {
        method: "POST",
        body: JSON.stringify({ imageUrl: processedUrl }),
      });

      if (!responseData.success) {
        throw new Error(responseData.error?.message || "Error al subir la imagen de fondo");
      }

      const imageUrl = responseData.data?.imageUrl;
      if (imageUrl) {
        setBackgroundImage(imageUrl);
        setBackgroundPreview(`${API_BASE_URL.replace('/api', '')}${imageUrl}`);
      }

      setSelectedBackgroundFile(null);

      // Guardar mensaje en localStorage antes del reload
      localStorage.setItem('settings_success_message', 'Imagen de fondo de la página pública actualizada correctamente');

      // Recargar la página inmediatamente para aplicar el nuevo fondo
      window.location.reload();
    } catch (err) {
      console.error("Error completo:", err);
      setError(err.message || "Error al subir la imagen de fondo");
    } finally {
      setUploadingBackground(false);
    }
  }, [selectedBackgroundFile]);

  const handleUploadAdminBackground = useCallback(async () => {
    if (!selectedAdminBackgroundFile) {
      setError("Por favor ingresa una URL de imagen");
      return;
    }

    try {
      setUploadingAdminBackground(true);
      setError(null);

      const processedUrl = processImageUrl(selectedAdminBackgroundFile);
      if (!processedUrl) {
        setError("URL de imagen no válida");
        setUploadingAdminBackground(false);
        return;
      }

      const responseData = await apiRequest("/settings/upload-admin-background", {
        method: "POST",
        body: JSON.stringify({ imageUrl: processedUrl }),
      });

      if (!responseData.success) {
        throw new Error(responseData.error?.message || "Error al subir la imagen de fondo");
      }

      const imageUrl = responseData.data?.imageUrl;
      if (imageUrl) {
        setAdminBackgroundImage(imageUrl);
        setAdminBackgroundPreview(`${API_BASE_URL.replace('/api', '')}${imageUrl}`);
      }

      setSelectedAdminBackgroundFile(null);

      // Guardar mensaje en localStorage antes del reload
      localStorage.setItem('settings_success_message', 'Imagen de fondo del panel administrativo actualizada correctamente');

      // Recargar la página inmediatamente para aplicar el nuevo fondo
      window.location.reload();
    } catch (err) {
      console.error("Error al subir imagen de fondo del admin:", err);
      setError(err.message || "Error al subir la imagen de fondo");
    } finally {
      setUploadingAdminBackground(false);
    }
  }, [selectedAdminBackgroundFile]);

  const handleUploadLogo = useCallback(async () => {
    if (!selectedLogoFile) {
      setError("Por favor ingresa una URL de imagen");
      return;
    }

    try {
      setUploadingLogo(true);
      setError(null);

      const processedUrl = processImageUrl(selectedLogoFile);
      if (!processedUrl) {
        setError("URL de imagen no válida");
        setUploadingLogo(false);
        return;
      }

      const responseData = await apiRequest("/settings/upload-logo", {
        method: "POST",
        body: JSON.stringify({ imageUrl: processedUrl }),
      });

      if (!responseData.success) {
        throw new Error(responseData.error?.message || "Error al subir el logo");
      }

      const imageUrl = responseData.data?.imageUrl;
      if (imageUrl) {
        setLogo(imageUrl);
        setLogoPreview(`${API_BASE_URL.replace('/api', '')}${imageUrl}`);
      }

      setSelectedLogoFile(null);

      // Guardar mensaje en localStorage antes del reload
      localStorage.setItem('settings_success_message', 'Logo actualizado correctamente');

      // Recargar la página inmediatamente para aplicar el nuevo logo
      window.location.reload();
    } catch (err) {
      console.error("Error completo:", err);
      setError(err.message || "Error al subir el logo");
    } finally {
      setUploadingLogo(false);
    }
  }, [selectedLogoFile]);

  return (
    <div className="w-full max-w-[1920px] mx-auto px-3 xs:px-4 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 pt-0 sm:pt-1 md:pt-2 lg:pt-3 pb-3 xs:pb-4 sm:pb-5 md:pb-6 lg:pb-8 xl:pb-10 space-y-2 xs:space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6 xl:space-y-7">
      {/* Contenedor - ULTRA RESPONSIVO */}
      <div className="rounded-xl xs:rounded-2xl sm:rounded-3xl p-2 xs:p-2.5 sm:p-3 md:p-4 lg:p-5 xl:p-6 2xl:p-8 border border-white/10 shadow-2xl space-y-2 xs:space-y-2.5 sm:space-y-3 md:space-y-4 lg:space-y-5 xl:space-y-6"
        style={{
          background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.08) 0%, rgba(156, 163, 175, 0.02) 50%, rgba(0, 0, 0, 0.4) 100%)',
          backdropFilter: 'blur(clamp(30px, 5vw, 50px)) saturate(180%)',
          WebkitBackdropFilter: 'blur(clamp(30px, 5vw, 50px)) saturate(180%)',
        }}
      >
        {/* Header - ULTRA RESPONSIVO */}
        <div className="mb-1 xs:mb-1.5 sm:mb-2 md:mb-3 lg:mb-4 xl:mb-5">
          {/* Mobile/Tablet: sin logo, solo título */}
          <div className="flex items-center gap-2 xs:gap-2.5 sm:gap-3 mb-1.5 xs:mb-2 lg:hidden">
            <Settings2 className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-5 sm:w-5 text-white/60 flex-shrink-0" />
            <h1 className="text-base xs:text-lg sm:text-xl md:text-2xl font-semibold text-white tracking-tight" style={{ fontSize: 'clamp(0.95rem, 4vw, 1.5rem)' }}>
              Ajustes
            </h1>
          </div>
          {/* Desktop: con logo y descripción */}
          <div className="hidden lg:flex flex-col items-center justify-center mb-3 xl:mb-4">
            <div className="relative mb-2 xl:mb-3">
              <img
                src={currentLogo}
                alt="Logo"
                className="h-20 w-20 xl:h-24 xl:w-24 2xl:h-28 2xl:w-28 object-contain"
                style={{ height: 'clamp(5rem, 8vw, 7rem)', width: 'clamp(5rem, 8vw, 7rem)' }}
                onError={(e) => {
                  if (e.target.src !== logoDefault) {
                    e.target.onerror = null;
                    e.target.src = logoDefault;
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-center gap-2 xl:gap-3 mb-1.5 xl:mb-2">
              <Settings2 className="h-5 w-5 xl:h-6 xl:w-6 2xl:h-7 2xl:w-7 text-white/60" />
              <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-semibold text-white tracking-tight" style={{ fontSize: 'clamp(1.875rem, 4vw, 3rem)' }}>
                Ajustes
              </h1>
            </div>
          </div>
          <p className="text-[10px] xs:text-xs sm:text-sm md:text-base lg:text-center text-white/50 font-light" style={{ fontSize: 'clamp(0.625rem, 1.8vw, 1rem)' }}>
            Personaliza la identidad visual de tu barbería
          </p>
        </div>

        {/* Error iOS style */}
        {error && (
          <div className="mb-6 rounded-2xl bg-gray-500/10 backdrop-blur-xl border border-gray-500/20 text-gray-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-gray-400"></div>
              <span className="text-sm sm:text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Primera fila: Imágenes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mb-4 xs:mb-5 sm:mb-6 md:mb-8">
          {/* Fondo Página Pública - Diseño estilo Barberos */}
          <GlassCard className="p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.2) 0%, rgba(156, 163, 175, 0.1) 100%)',
                  border: '1px solid rgba(156, 163, 175, 0.3)',
                }}
              >
                <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wider text-white/50 mb-1">
                  Configuración Visual
                </p>
                <h3 className="text-base sm:text-lg font-semibold text-white leading-tight">
                  Fondo Página Pública
                </h3>
              </div>
            </div>

            <div className="w-full h-48 flex items-center justify-center overflow-hidden rounded-xl bg-black/40 mb-4">
              {backgroundPreview ? (
                <img
                  src={backgroundPreview}
                  alt="Fondo público"
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon className="w-16 h-16 text-white/30" />
              )}
            </div>

            <button
              onClick={() => setShowBackgroundModal(true)}
              className="w-full px-4 py-2.5 rounded-lg font-medium text-white shadow-lg shadow-slate-500/20 hover:shadow-xl transition-all border border-slate-600/30 flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 1) 100%)',
              }}
            >
              <Edit className="w-4 h-4" />
              Actualizar
            </button>
          </GlassCard>

          {/* Fondo Panel Admin - Diseño estilo Barberos */}
          <GlassCard className="p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.2) 0%, rgba(156, 163, 175, 0.1) 100%)',
                  border: '1px solid rgba(156, 163, 175, 0.3)',
                }}
              >
                <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wider text-white/50 mb-1">
                  Panel Administrativo
                </p>
                <h3 className="text-base sm:text-lg font-semibold text-white leading-tight">
                  Fondo Panel Admin
                </h3>
              </div>
            </div>

            <div className="w-full h-48 flex items-center justify-center overflow-hidden rounded-xl bg-black/40 mb-4">
              {adminBackgroundPreview ? (
                <img
                  src={adminBackgroundPreview}
                  alt="Fondo admin"
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon className="w-16 h-16 text-white/30" />
              )}
            </div>

            <button
              onClick={() => setShowAdminBackgroundModal(true)}
              className="w-full px-4 py-2.5 rounded-lg font-medium text-white shadow-lg shadow-slate-500/20 hover:shadow-xl transition-all border border-slate-600/30 flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 1) 100%)',
              }}
            >
              <Edit className="w-4 h-4" />
              Actualizar
            </button>
          </GlassCard>

          {/* Logo - Diseño estilo Barberos */}
          <GlassCard className="p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.2) 0%, rgba(156, 163, 175, 0.1) 100%)',
                  border: '1px solid rgba(156, 163, 175, 0.3)',
                }}
              >
                <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wider text-white/50 mb-1">
                  Identidad de Marca
                </p>
                <h3 className="text-base sm:text-lg font-semibold text-white leading-tight">
                  Logo Principal
                </h3>
              </div>
            </div>

            <div className="w-full h-48 flex items-center justify-center overflow-hidden rounded-xl bg-black/40 mb-4 p-4">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <ImageIcon className="w-16 h-16 text-white/30" />
              )}
            </div>

            <button
              onClick={() => setShowLogoModal(true)}
              className="w-full px-4 py-2.5 rounded-lg font-medium text-white shadow-lg shadow-slate-500/20 hover:shadow-xl transition-all border border-slate-600/30 flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 1) 100%)',
              }}
            >
              <Edit className="w-4 h-4" />
              Actualizar
            </button>
          </GlassCard>
        </div>

        {/* Formulario de Códigos de Descuento (se muestra cuando showForm es true) */}
        <DiscountCodesManager showFormOutside />

        {/* Segunda fila: Configuración */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mb-4 xs:mb-5 sm:mb-6 md:mb-8">
          {/* Códigos de Descuento - Diseño estilo Barberos */}
          <GlassCard className="p-4 sm:p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.2) 0%, rgba(156, 163, 175, 0.1) 100%)',
                  border: '1px solid rgba(156, 163, 175, 0.3)',
                }}
              >
                <Tag className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wider text-white/50 mb-1">
                  Promociones
                </p>
                <h3 className="text-base sm:text-lg font-semibold text-white leading-tight">
                  Códigos Descuento
                </h3>
              </div>
            </div>

            <div className="w-full h-48 overflow-y-auto mb-4 rounded-xl bg-black/40 p-3">
              <DiscountCodesManager displayOnly />
            </div>

            <button
              onClick={() => {
                const event = new CustomEvent('open-discount-form', { detail: { action: 'create' } });
                window.dispatchEvent(event);
              }}
              className="w-full px-4 py-2.5 rounded-lg font-medium text-white shadow-lg shadow-slate-500/20 hover:shadow-xl transition-all border border-slate-600/30 flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 1) 100%)',
              }}
            >
              <Tag className="w-4 h-4" />
              Gestionar Códigos
            </button>
          </GlassCard>


          {/* Video de Fondo - Multi-fuente */}
          <GlassCard>
            <VideoConfigCard
              videoType={videoType}
              videoUrl={videoUrl}
              heroImages={heroImages}
              onUpdate={() => window.location.reload()}
            />
          </GlassCard>

          {/* Información del Sistema - Diseño estilo Barberos */}
          <GlassCard className="p-4 sm:p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.2) 0%, rgba(156, 163, 175, 0.1) 100%)',
                  border: '1px solid rgba(156, 163, 175, 0.3)',
                }}
              >
                <Settings2 className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wider text-white/50 mb-1">
                  Sistema
                </p>
                <h3 className="text-base sm:text-lg font-semibold text-white leading-tight">
                  Información
                </h3>
              </div>
            </div>

            <div className="w-full h-48 flex flex-col justify-center mb-4 rounded-xl bg-black/40 p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/50 text-xs uppercase tracking-wider">Versión</span>
                  <span className="text-white font-semibold text-sm">v1.0.0</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-white/50 text-xs uppercase tracking-wider">Estado</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    <span className="text-green-400 font-medium text-sm">Operativo</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-white/50 text-xs uppercase tracking-wider">Actualización</span>
                  <span className="text-white/70 text-xs text-right">{new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            </div>

            <div className="h-[42px]"></div>
          </GlassCard>

        </div>

        {/* Modal para Fondo Página Pública */}
        {showBackgroundModal && typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowBackgroundModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Actualizar Fondo Página Pública</h3>
                  <button
                    onClick={() => setShowBackgroundModal(false)}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
                <div className="p-4 sm:p-5 space-y-4">
                  <div className="w-full h-48 flex items-center justify-center overflow-hidden rounded-xl bg-black/40 mb-4">
                    {backgroundPreview ? (
                      <img
                        src={backgroundPreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-16 h-16 text-white/30" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-white/70">URL de la imagen:</label>
                    <input
                      type="text"
                      placeholder="https://ejemplo.com/imagen.jpg o Google Drive link"
                      value={selectedBackgroundFile || ''}
                      onChange={handleBackgroundUrlChange}
                      className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/50 placeholder:text-white/30"
                    />
                    <p className="text-xs text-white/50">Pega tu URL (Google Drive se convierte automáticamente)</p>
                  </div>
                  <button
                    onClick={async () => {
                      await handleUploadBackground();
                      setShowBackgroundModal(false);
                    }}
                    disabled={!selectedBackgroundFile || uploadingBackground}
                    className="w-full px-4 py-2.5 rounded-lg font-medium text-white shadow-lg shadow-slate-500/20 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600/30"
                    style={{
                      background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 1) 100%)',
                    }}
                  >
                    {uploadingBackground ? 'Subiendo...' : 'Actualizar'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}

        {/* Modal para Fondo Panel Admin */}
        {showAdminBackgroundModal && typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowAdminBackgroundModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Actualizar Fondo Panel Admin</h3>
                  <button
                    onClick={() => setShowAdminBackgroundModal(false)}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
                <div className="p-4 sm:p-5 space-y-4">
                  <div className="w-full h-48 flex items-center justify-center overflow-hidden rounded-xl bg-black/40 mb-4">
                    {adminBackgroundPreview ? (
                      <img
                        src={adminBackgroundPreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-16 h-16 text-white/30" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-white/70">URL de la imagen:</label>
                    <input
                      type="text"
                      placeholder="https://ejemplo.com/imagen.jpg o Google Drive link"
                      value={selectedAdminBackgroundFile || ''}
                      onChange={handleAdminBackgroundUrlChange}
                      className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/50 placeholder:text-white/30"
                    />
                    <p className="text-xs text-white/50">Pega tu URL (Google Drive se convierte automáticamente)</p>
                  </div>
                  <button
                    onClick={async () => {
                      await handleUploadAdminBackground();
                      setShowAdminBackgroundModal(false);
                    }}
                    disabled={!selectedAdminBackgroundFile || uploadingAdminBackground}
                    className="w-full px-4 py-2.5 rounded-lg font-medium text-white shadow-lg shadow-slate-500/20 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600/30"
                    style={{
                      background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 1) 100%)',
                    }}
                  >
                    {uploadingAdminBackground ? 'Subiendo...' : 'Actualizar'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}

        {/* Modal para Logo */}
        {showLogoModal && typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowLogoModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Actualizar Logo</h3>
                  <button
                    onClick={() => setShowLogoModal(false)}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
                <div className="p-4 sm:p-5 space-y-4">
                  <div className="w-full h-48 flex items-center justify-center overflow-hidden rounded-xl bg-black/40 mb-4 p-4">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="w-16 h-16 text-white/30" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-white/70">URL de la imagen:</label>
                    <input
                      type="text"
                      placeholder="https://ejemplo.com/logo.png o Google Drive link"
                      value={selectedLogoFile || ''}
                      onChange={handleLogoUrlChange}
                      className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/50 placeholder:text-white/30"
                    />
                    <p className="text-xs text-white/50">Pega tu URL (Google Drive se convierte automáticamente)</p>
                  </div>
                  <button
                    onClick={async () => {
                      await handleUploadLogo();
                      setShowLogoModal(false);
                    }}
                    disabled={!selectedLogoFile || uploadingLogo}
                    className="w-full px-4 py-2.5 rounded-lg font-medium text-white shadow-lg shadow-slate-500/20 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600/30"
                    style={{
                      background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 1) 100%)',
                    }}
                  >
                    {uploadingLogo ? 'Subiendo...' : 'Actualizar'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}

        {/* Modal para Video de YouTube */}
        {showVideoModal && typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowVideoModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Actualizar Video de Fondo</h3>
                  <button
                    onClick={() => setShowVideoModal(false)}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
                <div className="p-4 sm:p-5 space-y-4">
                  <div className="w-full h-48 flex items-center justify-center overflow-hidden rounded-xl bg-black/40 mb-4">
                    {videoUrlInput ? (
                      <iframe
                        src={videoUrlInput.replace('watch?v=', 'embed/').split('&')[0] + '?autoplay=0&mute=1'}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="Video Preview"
                      />
                    ) : (
                      <Video className="w-16 h-16 text-white/30" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-white/70">URL de YouTube:</label>
                    <input
                      type="text"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={videoUrlInput}
                      onChange={(e) => setVideoUrlInput(e.target.value)}
                      className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/50 placeholder:text-white/30"
                    />
                    <p className="text-xs text-white/50">Pega la URL completa del video de YouTube</p>
                  </div>
                  <button
                    onClick={async () => {
                      await handleUpdateVideo();
                    }}
                    disabled={!videoUrlInput || updatingVideo}
                    className="w-full px-4 py-2.5 rounded-lg font-medium text-white shadow-lg shadow-slate-500/20 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600/30"
                    style={{
                      background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 1) 100%)',
                    }}
                  >
                    {updatingVideo ? 'Actualizando...' : 'Actualizar'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}

        {/* Modal de éxito */}
        {showSuccessModal && (
          <div className="fixed top-[20vh] left-1/2 transform -translate-x-1/2 z-[9999] p-4 pointer-events-auto">
            <div
              className="
              w-full max-w-md
              border border-white/20
              backdrop-blur-2xl
              shadow-[0_20px_70px_rgba(0,0,0,0.65)]
              text-neutral-50
              p-6
            "
              style={{
                background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.97) 50%, rgba(10, 10, 10, 0.98) 100%)',
                backdropFilter: 'blur(40px) saturate(180%)',
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                borderRadius: '40px',
              }}
            >
              {/* Encabezado del modal */}
              <div className="mb-4">
                <p className="text-[11px] uppercase tracking-[0.20em] text-gray-400">
                  Éxito
                </p>
                <p className="text-sm font-medium text-white mt-1">
                  {successMessage}
                </p>
              </div>

              {/* Botón de aceptar */}
              <div className="text-center mt-4">
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="
                  px-6 py-2
                  text-sm font-semibold text-white
                  transition-all duration-200 ease-out
                  border border-blue-400/30
                  shadow-lg shadow-blue-400/20
                  hover:shadow-xl hover:shadow-blue-400/30
                  active:scale-95
                "
                  style={{
                    background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.7) 0%, rgba(59, 130, 246, 0.8) 100%)',
                    borderRadius: '16px',
                  }}
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de conversión de Google Drive */}
        {showConversionModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" style={{ alignItems: 'flex-start', paddingTop: '15vh' }}>
            <div
              className="w-full max-w-md border border-white/20 backdrop-blur-2xl shadow-[0_20px_70px_rgba(0,0,0,0.65)] text-neutral-50 p-6"
              style={{
                background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.08) 0%, rgba(156, 163, 175, 0.02) 50%, rgba(0, 0, 0, 0.4) 100%)',
                backdropFilter: 'blur(40px) saturate(180%)',
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                borderRadius: '40px',
              }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.20em] text-gray-400">
                    {conversionSuccess ? 'Éxito' : 'Aviso'}
                  </p>
                  <p className="text-sm font-medium text-white mt-1">
                    {conversionMessage}
                  </p>
                </div>
                <button
                  onClick={() => setShowConversionModal(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
                >
                  <X className="h-4 w-4 text-white/80" />
                </button>
              </div>
              <div className="text-center mt-4">
                <button
                  onClick={() => setShowConversionModal(false)}
                  className="px-6 py-2 text-sm font-semibold text-white transition-all duration-200 ease-out border border-blue-400/30 shadow-lg shadow-blue-400/20 hover:shadow-xl hover:shadow-blue-400/30 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.7) 0%, rgba(59, 130, 246, 0.8) 100%)',
                    borderRadius: '16px',
                  }}
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
