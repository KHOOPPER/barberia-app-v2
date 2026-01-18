/**
 * @fileoverview Gestión de productos (CRUD completo)
 * @module components/admin/AdminProducts
 */

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Plus, Edit2, Trash2, X, Save, Package, DollarSign, CheckCircle, ShoppingBag, Tag, Image as ImageIcon, ExternalLink } from "lucide-react";
import GlassCard from "../ui/GlassCard";
import { API_BASE_URL } from "../../config/api.js";
import { processImageUrl } from "../../utils/imageUrlHelper.js";
import logo from "../../assets/logo.png";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [sectionEnabled, setSectionEnabled] = useState(true);
  const [updatingSetting, setUpdatingSetting] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    type: "",
    price: "",
    image_url: "",
    stock: "",
    min_stock: "",
    is_active: true,
    is_active_page: false,
  });
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [currentLogo, setCurrentLogo] = useState(logo);
  const containerRef = useRef(null);

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
        console.error("Error al obtener logo:", error);
      }
    };

    fetchLogo();

    return () => {
      mounted = false;
    };
  }, []);

  // Cargar productos
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_BASE_URL}/products?includeInactive=true`, {
        credentials: "include", // Incluir cookies httpOnly
      });

      if (!res.ok) {
        throw new Error("No se pudieron cargar los productos");
      }

      const response = await res.json();
      setProducts(response.data || []);
    } catch (err) {
      console.error(err);
      setError("Error al cargar productos");
    } finally {
      setLoading(false);
    }
  };

  // Cargar setting de sección habilitada
  const fetchSectionSetting = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings/products_section_enabled`, {
        credentials: "include", // Incluir cookies httpOnly
      });

      if (res.ok) {
        const response = await res.json();
        setSectionEnabled(response.data?.value !== false && response.data?.value !== "false");
      }
    } catch (err) {
      console.error("[AdminProducts] Error al cargar setting:", err);
      setSectionEnabled(true);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchSectionSetting();
  }, []);

  // Función auxiliar para hacer scroll hacia arriba
  const scrollToTop = () => {
    // Buscar el contenedor main que tiene el scroll (el scroll está en el main del AdminLayout)
    const mainContainer = document.querySelector('main.overflow-y-auto') ||
      Array.from(document.querySelectorAll('main')).find(el =>
        el.classList.contains('overflow-y-auto') ||
        getComputedStyle(el).overflowY === 'auto'
      ) ||
      document.querySelector('main');

    // Scroll inmediato en el contenedor main
    if (mainContainer) {
      mainContainer.scrollTop = 0;
      mainContainer.scrollTo({ top: 0, behavior: 'instant' });
    }

    // También intentar con window y document por si acaso
    window.scrollTo(0, 0);
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Forzar scroll múltiples veces
    requestAnimationFrame(() => {
      if (mainContainer) {
        mainContainer.scrollTop = 0;
        mainContainer.scrollTo(0, 0);
      }
      window.scrollTo(0, 0);
    });
  };

  // Scroll automático hacia arriba cuando se muestra el modal de éxito
  useEffect(() => {
    if (showSuccessModal) {
      // Scroll inmediato
      scrollToTop();

      // Forzar scroll múltiples veces para asegurar que funcione
      setTimeout(() => {
        scrollToTop();
      }, 50);

      setTimeout(() => {
        scrollToTop();
      }, 150);

      setTimeout(() => {
        scrollToTop();
      }, 300);
    }
  }, [showSuccessModal]);


  // Toggle para activar/desactivar sección
  const handleToggleSection = async () => {
    try {
      setUpdatingSetting(true);
      setError(null);

      const newValue = !sectionEnabled;

      const res = await fetch(`${API_BASE_URL}/settings/products_section_enabled`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Incluir cookies httpOnly
        body: JSON.stringify({ value: newValue }),
      });

      if (!res.ok) {
        throw new Error("Error al actualizar la configuración");
      }

      setSectionEnabled(newValue);
      setSuccessMessage(newValue ? "Sección de productos activada" : "Sección de productos desactivada");
      setShowSuccessModal(true);
    } catch (err) {
      console.error(err);
      setError("Error al actualizar la configuración");
    } finally {
      setUpdatingSetting(false);
    }
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      id: "",
      name: "",
      description: "",
      type: "",
      price: "",
      image_url: "",
      stock: "",
      min_stock: "",
      is_active: true,
      is_active_page: false,
    });
    setEditingId(null);
    setShowForm(false);
    setEditingId(null);
    setShowForm(false);
    setImagePreview(null);
  };

  // Iniciar edición
  const handleEdit = (product) => {
    setFormData({
      id: product.id,
      name: product.name || "",
      description: product.description || "",
      type: product.type || "",
      price: product.price || "",
      image_url: product.image_url || "",
      stock: product.stock?.toString() || "",
      min_stock: product.min_stock?.toString() || "",
      is_active: product.is_active !== undefined ? product.is_active : true,
      is_active_page: product.is_active_page !== undefined ? product.is_active_page : false,
    });
    setEditingId(product.id);
    setShowForm(true);
    setShowForm(true);
    // Si la imagen es una URL relativa (empieza con /), agregar API_BASE_URL, si es absoluta (http), dejarla tal cual
    const imgUrl = product.image_url
      ? (product.image_url.startsWith('http') ? product.image_url : `${API_BASE_URL.replace('/api', '')}${product.image_url}`)
      : null;
    setImagePreview(imgUrl);

    // Scroll suave hacia el formulario después de un pequeño delay para que se renderice
    setTimeout(() => {
      const formElement = document.getElementById('product-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
      }
    }, 100);
  };



  // Guardar (crear o actualizar)
  const handleSave = async () => {
    if (!formData.id || !formData.name || !formData.price) {
      setError("ID, Nombre y Precio son obligatorios");
      return;
    }

    // Validar límite de 25 productos (solo al crear)
    if (!editingId && products.length >= 25) {
      setError("Se ha alcanzado el límite máximo de 25 productos");
      return;
    }

    // Validar límite de 8 productos activos en página
    if (formData.is_active_page) {
      const activePageProducts = products.filter(
        p => p.is_active_page && p.id !== formData.id
      );
      if (activePageProducts.length >= 8) {
        setAlertMessage("Espacios en la sección de página llenos");
        setShowAlert(true);
        return;
      }
    }

    // Calcular stock final
    const finalStock = formData.stock ? parseInt(formData.stock) : null;

    // Si el stock es 0 o menor, desactivar automáticamente de la página pública
    const shouldBeActivePage = formData.is_active_page && finalStock !== null && finalStock > 0;

    try {
      setLoading(true);
      setError(null);

      const imageUrl = formData.image_url;

      const url = editingId
        ? `${API_BASE_URL}/products/${editingId}`
        : `${API_BASE_URL}/products`;

      const method = editingId ? "PUT" : "POST";

      const dataToSend = {
        name: formData.name,
        description: formData.description || null,
        type: formData.type || null,
        price: parseFloat(formData.price),
        image_url: imageUrl || null,
        stock: finalStock,
        min_stock: formData.min_stock ? parseInt(formData.min_stock) : null,
        is_active: formData.is_active,
        is_active_page: shouldBeActivePage, // Automáticamente desactiva si stock es 0
      };

      if (!editingId) {
        dataToSend.id = formData.id;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Incluir cookies httpOnly
        body: JSON.stringify(dataToSend),
      });

      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = "Error al guardar producto";
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorMessage;
        } catch (e) {
          // Si no es JSON, usar el texto tal cual
        }
        throw new Error(errorMessage);
      }

      const response = await res.json();
      const updatedProduct = response.data || response;

      // Verificar si el producto se desactivó automáticamente de la página pública
      // (finalStock ya fue declarado arriba, no redeclararlo)
      const wasActivePage = formData.is_active_page;
      const isNowActivePage = updatedProduct?.is_active_page ?? false;

      await fetchProducts();
      resetForm();

      let message = editingId ? "Producto actualizado correctamente" : "Producto creado correctamente";
      if (wasActivePage && !isNowActivePage && finalStock !== null && finalStock <= 0) {
        message += " El producto se desactivó automáticamente de la página pública porque el stock llegó a 0.";
      }

      setSuccessMessage(message);
      setShowSuccessModal(true);

      // Scroll inmediato antes y después de mostrar el modal
      scrollToTop();
      setTimeout(() => scrollToTop(), 50);
      setTimeout(() => scrollToTop(), 150);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al guardar producto");
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal de confirmación para eliminar
  const handleDeleteClick = (id) => {
    setProductToDelete(id);
    setShowDeleteModal(true);
  };

  // Eliminar producto
  const handleDelete = async () => {
    if (!productToDelete) return;

    try {
      setLoading(true);
      setError(null);
      setShowDeleteModal(false);

      const res = await fetch(`${API_BASE_URL}/products/${productToDelete}`, {
        method: "DELETE",
        credentials: "include", // Incluir cookies httpOnly
      });

      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = "Error al eliminar producto";
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorMessage;
        } catch (e) {
          // Si no es JSON, usar el texto tal cual
        }
        throw new Error(errorMessage);
      }

      await fetchProducts();

      setSuccessMessage("Producto eliminado correctamente");
      setShowSuccessModal(true);
      setProductToDelete(null);

      // Scroll inmediato antes y después de mostrar el modal
      scrollToTop();
      setTimeout(() => scrollToTop(), 50);
      setTimeout(() => scrollToTop(), 150);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al eliminar producto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full px-3 sm:px-4 md:px-5 lg:px-6 xl:px-8 pt-0 pb-4 sm:pb-5 md:pb-6 lg:pb-8 space-y-2 sm:space-y-3 md:space-y-4 lg:space-y-5">
      {/* Contenedor con fondo oscuro para mejor contraste sobre el fondo */}
      <div className="rounded-2xl sm:rounded-3xl p-2 sm:p-2.5 md:p-3 lg:p-4 xl:p-5 border border-white/10 shadow-2xl space-y-2 sm:space-y-2.5 md:space-y-3 lg:space-y-4"
        style={{
          background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.08) 0%, rgba(156, 163, 175, 0.02) 50%, rgba(0, 0, 0, 0.4) 100%)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        }}
      >
        {/* Header - Mismo estilo en móvil y desktop */}
        <div className="mb-1.5 sm:mb-2 md:mb-3 lg:mb-4">
          {/* Logo y título - Visible en todas las pantallas */}
          <div className="flex flex-col items-center justify-center mb-3 sm:mb-4">
            <div className="relative mb-2 sm:mb-3">
              <img
                src={currentLogo}
                alt="Logo"
                className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-24 lg:w-24 object-contain"
                onError={(e) => {
                  if (e.target.src !== logo) {
                    e.target.onerror = null;
                    e.target.src = logo;
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-1 sm:mb-2">
              <Package className="h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white/60" />
              <h1 className="text-2xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-white tracking-tight">
                Productos
              </h1>
            </div>
          </div>
          <p className="text-sm sm:text-sm md:text-base text-white/50 font-light text-center">
            Administra los productos de tu barbería (máximo 25 productos, 8 en página)
          </p>
        </div>

        {/* Estadísticas rápidas - Mismo estilo que Clientes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6 mb-2.5 sm:mb-3.5 md:mb-4.5 lg:mb-5.5">
          <GlassCard className="p-3 sm:p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between gap-2 lg:gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-xs md:text-sm text-white/50 mb-1 sm:mb-1.5">
                  Total Productos
                </p>
                <p className="text-xl sm:text-xl md:text-2xl lg:text-3xl font-bold text-white truncate">{products.length}</p>
              </div>
              <div className="h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-12 lg:w-12 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.2) 0%, rgba(156, 163, 175, 0.1) 100%)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(156, 163, 175, 0.3)',
                }}
              >
                <Package className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-6 lg:w-6 text-gray-400" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-3 sm:p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between gap-2 lg:gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-xs md:text-sm text-white/50 mb-1 sm:mb-1.5">
                  Productos Activos
                </p>
                <p className="text-xl sm:text-xl md:text-2xl lg:text-3xl font-bold text-white truncate">
                  {products.filter(p => p.is_active).length}
                </p>
              </div>
              <div className="h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-12 lg:w-12 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.2) 0%, rgba(156, 163, 175, 0.1) 100%)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(156, 163, 175, 0.3)',
                }}
              >
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-6 lg:w-6 text-gray-400" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-3 sm:p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between gap-2 lg:gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-xs md:text-sm text-white/50 mb-1 sm:mb-1.5">
                  En Página Pública
                </p>
                <p className="text-xl sm:text-xl md:text-2xl lg:text-3xl font-bold text-white truncate">
                  {products.filter(p => p.is_active_page).length}/8
                </p>
              </div>
              <div className="h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-12 lg:w-12 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.2) 0%, rgba(156, 163, 175, 0.1) 100%)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(156, 163, 175, 0.3)',
                }}
              >
                <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-6 lg:w-6 text-gray-400" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-3 sm:p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between gap-2 lg:gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-xs md:text-sm text-white/50 mb-1 sm:mb-1.5">
                  Precio Promedio
                </p>
                <p className="text-xl sm:text-xl md:text-2xl lg:text-3xl font-bold text-white truncate">
                  ${products.length > 0
                    ? (products.reduce((sum, p) => sum + parseFloat(p.price || 0), 0) / products.length).toFixed(2)
                    : '0.00'}
                </p>
              </div>
              <div className="h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-12 lg:w-12 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.2) 0%, rgba(156, 163, 175, 0.1) 100%)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(156, 163, 175, 0.3)',
                }}
              >
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-6 lg:w-6 text-gray-400" />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Error iOS style */}
        {error && (
          <div className="rounded-2xl bg-gray-500/10 backdrop-blur-xl border border-gray-500/20 text-gray-200 px-3 sm:px-4 py-2.5 sm:py-3">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-gray-400 flex-shrink-0"></div>
              <span className="text-sm sm:text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Controles: Botón Agregar y Sección Activa - iOS 19 style */}
        {!showForm && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 max-w-3xl mx-auto">
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
                // Scroll suave hacia el formulario después de un pequeño delay
                setTimeout(() => {
                  const formElement = document.getElementById('product-form');
                  if (formElement) {
                    formElement.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
                  }
                }, 100);
              }}
              disabled={loading || products.length >= 25}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-700/40 rounded-xl text-white font-medium shadow-lg shadow-slate-800/30 hover:shadow-xl hover:shadow-slate-700/40 transition-all duration-200 ease-out text-sm sm:text-sm whitespace-nowrap active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 1) 100%)',
              }}
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>Agregar Producto</span>
              {products.length >= 25 && (
                <span className="text-xs text-white/70 ml-1">(Máx. 25)</span>
              )}
            </button>
            <button
              onClick={handleToggleSection}
              disabled={updatingSetting}
              className={`
              flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border transition-all duration-200 ease-out text-sm sm:text-sm font-medium whitespace-nowrap active:scale-[0.98]
              ${sectionEnabled
                  ? "border-slate-700/40 text-white shadow-lg shadow-slate-800/30 hover:shadow-xl hover:shadow-slate-700/40"
                  : "border-white/20 text-white/70 bg-white/5 hover:bg-white/10 hover:border-white/30"
                }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
              style={sectionEnabled ? {
                background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 1) 100%)',
              } : {}}
            >
              <div className={`
              w-10 h-5 rounded-full transition-colors relative flex-shrink-0
              ${sectionEnabled ? "bg-white/30" : "bg-white/10"}
            `}>
                <div className={`
                absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-out shadow-sm
                ${sectionEnabled ? "translate-x-5" : "translate-x-0"}
              `} />
              </div>
              <span>
                {sectionEnabled ? "Sección Activa" : "Sección Desactivada"}
              </span>
            </button>
          </div>
        )}

        {/* Formulario - iOS 19 style */}
        {showForm && (
          <div id="product-form" className="max-w-3xl mx-auto scroll-mt-20">
            <GlassCard className="p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-5">
                <h3 className="text-base sm:text-lg font-semibold text-white">
                  {editingId ? "Editar Producto" : "Nuevo Producto"}
                </h3>
                <button
                  onClick={resetForm}
                  className="p-1.5 sm:p-2 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20 hover:text-white transition-[background-color,border-color,color] duration-150 ease-out active:scale-95"
                >
                  <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 md:gap-4">
                {/* ID */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-white/70 mb-2.5">
                    ID <span className="text-gray-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
                    disabled={!!editingId}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl px-4 py-3 text-sm text-white outline-none focus:border-white/20 focus:bg-black/40 transition-[border-color,background-color] duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="p1, p2, p3..."
                    maxLength={10}
                  />
                </div>

                {/* Nombre */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-white/70 mb-2.5">
                    Nombre <span className="text-gray-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl px-4 py-3 text-sm text-white outline-none focus:border-white/20 focus:bg-black/40 transition-[border-color,background-color] duration-150 ease-out"
                    placeholder="Aceite para Barba Khoopper Gold"
                    maxLength={100}
                  />
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-white/70 mb-2.5">
                    Tipo / Características
                  </label>
                  <input
                    type="text"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl px-4 py-3 text-sm text-white outline-none focus:border-white/20 focus:bg-black/40 transition-[border-color,background-color] duration-150 ease-out"
                    placeholder="Hidratación • Brillo natural"
                    maxLength={150}
                  />
                </div>

                {/* Precio */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-white/70 mb-2.5">
                    Precio (USD) <span className="text-gray-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl px-4 py-3 text-sm text-white outline-none focus:border-white/20 focus:bg-black/40 transition-[border-color,background-color] duration-150 ease-out"
                    placeholder="12.00"
                    min="0"
                    required
                  />
                </div>

                {/* Stock - CONTROL DE INVENTARIO VISIBLE */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-white/70 mb-2.5">
                    Stock Disponible
                  </label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl px-4 py-3 text-sm text-white outline-none focus:border-white/20 focus:bg-black/40 transition-[border-color,background-color] duration-150 ease-out"
                    placeholder="Cantidad en inventario"
                    min="0"
                  />
                  {formData.stock && parseInt(formData.stock) <= parseInt(formData.min_stock || 0) && (
                    <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400"></span>
                      Stock bajo - Reabastecer pronto
                    </p>
                  )}
                </div>

                {/* Stock Mínimo */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-white/70 mb-2.5">
                    Stock Mínimo (Alerta)
                  </label>
                  <input
                    type="number"
                    value={formData.min_stock}
                    onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl px-4 py-3 text-sm text-white outline-none focus:border-white/20 focus:bg-black/40 transition-[border-color,background-color] duration-150 ease-out"
                    placeholder="Nivel mínimo de alerta"
                    min="0"
                  />
                </div>

                {/* Descripción */}
                <div className="sm:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-white/70 mb-2.5">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl px-4 py-3 text-sm text-white outline-none focus:border-white/20 focus:bg-black/40 transition-[border-color,background-color] duration-150 ease-out resize-none"
                    rows="3"
                    placeholder="Descripción del producto..."
                  />
                </div>

                {/* Imagen URL con soporte Google Drive */}
                <div className="sm:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-white/70 mb-2.5">
                    Link de Imagen (URL Directo o Google Drive)
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.image_url}
                        onChange={(e) => {
                          const newUrl = e.target.value;
                          // Procesar URL automáticamente (convertir Google Drive si es necesario)
                          const processedUrl = processImageUrl(newUrl);
                          setFormData(prev => ({ ...prev, image_url: processedUrl }));
                          setImagePreview(processedUrl || null);
                        }}
                        className="w-full rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-white/20 focus:bg-black/40 transition-[border-color,background-color] duration-150 ease-out"
                        placeholder="https://ejemplo.com/imagen.jpg o enlace de Google Drive"
                      />
                    </div>
                    {formData.image_url && (
                      <a
                        href={formData.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                        title="Abrir imagen en nueva pestaña"
                      >
                        <ExternalLink className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-white/40 mt-2">
                    Pega el enlace directo de la imagen o un enlace compartido de Google Drive.
                  </p>
                </div>

                {/* Vista Previa - Mismo diseño que las cards */}
                {imagePreview && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-3">
                      Vista Previa del Producto
                    </label>
                    <div className="max-w-md mx-auto">
                      <GlassCard className="p-0 overflow-hidden relative flex flex-col h-full min-h-[360px] sm:min-h-[400px] md:min-h-[440px] group">
                        {/* Fondo gris translúcido */}
                        <div className="absolute inset-0"
                          style={{
                            background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.15) 0%, rgba(156, 163, 175, 0.05) 50%, rgba(0, 0, 0, 0.3) 100%)',
                          }}
                        ></div>

                        {/* Imagen principal - tamaño fijo y uniforme */}
                        <div className="w-full h-[240px] sm:h-[260px] md:h-[280px] flex items-center justify-center p-2 sm:p-2.5 z-10 relative">
                          <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-xl">
                            <img
                              src={imagePreview}
                              alt="Vista previa"
                              className="w-full h-full object-cover drop-shadow-2xl rounded-xl"
                            />
                          </div>
                        </div>

                        {/* Panel superior: Nombre y badge activo */}
                        <div className="p-3 sm:p-4 backdrop-blur-xl z-20 border-b border-white/10 relative"
                          style={{
                            background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.1) 0%, rgba(156, 163, 175, 0.05) 50%, rgba(0, 0, 0, 0.2) 100%)',
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-base sm:text-base md:text-lg font-semibold text-white leading-tight line-clamp-1 flex-1 min-w-0">
                              {formData.name || "Nombre del producto"}
                            </h3>
                            <div className="flex-shrink-0">
                              {formData.is_active_page && formData.stock && parseInt(formData.stock) > 0 && (
                                <span className="inline-block text-xs sm:text-xs font-semibold text-white uppercase tracking-wider px-2.5 py-1 bg-white/10 backdrop-blur-xl rounded-full border border-white/20">
                                  EN PÁGINA
                                </span>
                              )}
                              {formData.is_active_page && (!formData.stock || parseInt(formData.stock) <= 0) && (
                                <span className="inline-block text-xs sm:text-xs font-semibold text-red-400 uppercase tracking-wider px-2.5 py-1 bg-red-500/20 backdrop-blur-xl rounded-full border border-red-500/30">
                                  SIN STOCK
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Panel inferior: Tipo y precio */}
                        <div className="flex-1 flex flex-col justify-end z-20 backdrop-blur-xl border-t border-white/10 relative mt-auto"
                          style={{
                            background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.1) 0%, rgba(156, 163, 175, 0.05) 50%, rgba(0, 0, 0, 0.2) 100%)',
                          }}
                        >
                          <div className="p-3 sm:p-4">
                            <div className="mb-3">
                              {formData.type && (
                                <p className="text-sm sm:text-sm text-white/70 line-clamp-1 mb-2">
                                  {formData.type}
                                </p>
                              )}
                              <div>
                                <span className="text-xl sm:text-xl md:text-2xl font-semibold text-white">
                                  ${formData.price || '0.00'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                      <p className="text-xs text-gray-400 mt-2 text-center">
                        Así se verá el producto en la página
                      </p>
                    </div>
                  </div>
                )}

                {/* Activo */}
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700/50 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-400/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-400 peer-checked:to-blue-500 shadow-inner border border-gray-600/50 peer-checked:border-blue-400/50 peer-checked:shadow-lg peer-checked:shadow-blue-400/30"></div>
                    </div>
                    <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Producto activo (disponible para facturar)</span>
                  </label>
                </div>

                {/* Mostrar en página */}
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={formData.is_active_page && (!formData.stock || parseInt(formData.stock) > 0)}
                        disabled={!formData.stock || parseInt(formData.stock) === 0}
                        onChange={(e) => {
                          const newValue = e.target.checked;
                          // Validar que el stock sea mayor a 0
                          const stockValue = formData.stock ? parseInt(formData.stock) : 0;
                          if (newValue && stockValue <= 0) {
                            setAlertMessage("No se puede publicar en la página pública un producto sin stock");
                            setShowAlert(true);
                            return;
                          }
                          // Validar límite de 8 productos activos en página
                          if (newValue) {
                            const activePageProducts = products.filter(
                              p => p.is_active_page && p.id !== formData.id
                            );
                            if (activePageProducts.length >= 8) {
                              setAlertMessage("Espacios en la sección de página llenos");
                              setShowAlert(true);
                              return;
                            }
                          }
                          setFormData({ ...formData, is_active_page: newValue });
                        }}
                        className="sr-only peer disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <div className={`w-11 h-6 bg-gray-700/50 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-400/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-400 peer-checked:to-blue-500 shadow-inner border border-gray-600/50 peer-checked:border-blue-400/50 peer-checked:shadow-lg peer-checked:shadow-blue-400/30 ${(!formData.stock || parseInt(formData.stock) === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                    </div>
                    <span className={`text-sm font-medium ${(!formData.stock || parseInt(formData.stock) === 0) ? 'text-gray-500' : 'text-gray-300'} group-hover:text-white transition-colors`}>
                      Mostrar en página pública
                      <span className="text-xs text-white/50 ml-1.5">
                        ({products.filter(p => p.is_active_page && p.id !== formData.id).length}/8)
                      </span>
                    </span>
                  </label>
                  <p className="text-xs text-gray-400 mt-1.5 ml-14">
                    Solo los productos con este check se mostrarán en la página pública (máximo 8)
                    {(!formData.stock || parseInt(formData.stock) === 0) && (
                      <span className="block text-red-400 mt-1">
                        ⚠️ No se puede publicar un producto sin stock
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Botones iOS 19 style */}
              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-sm font-medium text-white transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 border border-blue-400/30 shadow-lg shadow-blue-400/20 hover:shadow-xl hover:shadow-blue-400/30"
                  style={{
                    background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.7) 0%, rgba(59, 130, 246, 0.8) 100%)',
                  }}
                >
                  <Save className="h-4 w-4" />
                  {loading ? "Guardando..." : "Guardar"}
                </button>
                <button
                  onClick={resetForm}
                  disabled={loading}
                  className="rounded-xl border border-white/15 bg-black/40 px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-sm text-gray-200 hover:bg-white/5 transition-colors active:scale-95"
                >
                  Cancelar
                </button>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Lista de Productos */}
        {!showForm && (
          <>
            {/* Alerta de Stock Bajo - VISIBLE */}
            {products.some(p => p.stock !== undefined && p.stock !== null && p.stock <= (p.min_stock || 0)) && (
              <div className="mb-4 p-4 rounded-xl border border-red-500/40 bg-red-500/10 backdrop-blur-xl">
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-red-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse"></span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-300 mb-1">Alerta de Stock Bajo</h3>
                    <p className="text-xs text-red-200/80">
                      {products.filter(p => p.stock !== undefined && p.stock !== null && p.stock <= (p.min_stock || 0)).length} producto(s) necesitan reabastecimiento urgente
                    </p>
                    <div className="mt-2 space-y-1">
                      {products.filter(p => p.stock !== undefined && p.stock !== null && p.stock <= (p.min_stock || 0)).slice(0, 3).map(product => (
                        <p key={product.id} className="text-xs text-red-200/70">
                          • {product.name}: {product.stock} unidades (mínimo: {product.min_stock || 0})
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {loading && products.length === 0 ? (
              <div className="text-center text-sm sm:text-sm text-white/50 py-12">
                Cargando productos...
              </div>
            ) : products.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <p className="text-sm sm:text-sm text-white/50">No hay productos registrados</p>
              </GlassCard>
            ) : (
              <div
                className="grid gap-3 sm:gap-4 md:gap-5 lg:gap-6 w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                style={{ gridAutoRows: '1fr' }}
              >
                {products.map((product) => (
                  <GlassCard key={product.id} className="p-0 overflow-hidden relative flex flex-col h-full min-h-[360px] sm:min-h-[400px] md:min-h-[440px] group hover:border-white/20 transition-[border-color] duration-150 ease-out">
                    {/* Fondo gris translúcido */}
                    <div className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.15) 0%, rgba(156, 163, 175, 0.05) 50%, rgba(0, 0, 0, 0.3) 100%)',
                      }}
                    ></div>

                    {/* Imagen principal - tamaño fijo y uniforme */}
                    {product.image_url && (
                      <div className="w-full h-[240px] sm:h-[260px] md:h-[280px] flex items-center justify-center p-2 sm:p-2.5 z-10 relative">
                        <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-xl">
                          <img
                            src={product.image_url.startsWith('http') ? product.image_url : `${API_BASE_URL.replace('/api', '')}${product.image_url}`}
                            alt={product.name}
                            className="w-full h-full object-cover drop-shadow-2xl transition-transform duration-300 group-hover:scale-105 rounded-xl"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "https://placehold.co/600x400/020617/cccccc?text=Producto";
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Panel superior: Nombre y badge activo */}
                    <div className="p-3 sm:p-4 backdrop-blur-xl z-20 border-b border-white/10 relative"
                      style={{
                        background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.1) 0%, rgba(156, 163, 175, 0.05) 50%, rgba(0, 0, 0, 0.2) 100%)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-base sm:text-base md:text-lg font-semibold text-white leading-tight line-clamp-1 flex-1 min-w-0">
                          {product.name}
                        </h3>
                        <div className="flex-shrink-0">
                          {product.is_active_page ? (
                            <span className="inline-block text-xs sm:text-xs font-semibold text-white uppercase tracking-wider px-2.5 py-1 bg-white/10 backdrop-blur-xl rounded-full border border-white/20">
                              EN PÁGINA
                            </span>
                          ) : !product.is_active ? (
                            <span className="inline-block text-xs sm:text-xs font-semibold text-white/50 uppercase tracking-wider px-2.5 py-1 bg-white/5 backdrop-blur-xl rounded-full border border-white/10">
                              INACTIVO
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Panel inferior: Descripción, precio y botones */}
                    <div className="flex-1 flex flex-col justify-end z-20 backdrop-blur-xl border-t border-white/10 relative mt-auto"
                      style={{
                        background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.1) 0%, rgba(156, 163, 175, 0.05) 50%, rgba(0, 0, 0, 0.2) 100%)',
                      }}
                    >
                      <div className="p-3 sm:p-4">
                        {/* Stock - SIEMPRE VISIBLE si tiene datos */}
                        <div className="mb-3 pb-3 border-b border-white/10">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400 flex items-center gap-1.5">
                              <Package className="h-3.5 w-3.5" />
                              Inventario:
                            </span>
                            {product.stock !== undefined && product.stock !== null ? (
                              <span className={`text-sm font-semibold ${product.min_stock !== undefined && product.min_stock !== null && product.stock <= product.min_stock
                                ? 'text-red-400'
                                : product.min_stock !== undefined && product.min_stock !== null && product.stock <= product.min_stock * 2
                                  ? 'text-yellow-400'
                                  : 'text-green-400'
                                }`}>
                                {product.stock} unidades
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500">Sin definir</span>
                            )}
                          </div>
                          {product.stock !== undefined && product.stock !== null && product.min_stock !== undefined && product.min_stock !== null && product.stock <= product.min_stock && (
                            <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse"></span>
                              Stock bajo - Reabastecer pronto
                            </p>
                          )}
                          {product.min_stock !== undefined && product.min_stock !== null && (
                            <p className="text-xs text-gray-500 mt-1">
                              Mínimo: {product.min_stock} unidades
                            </p>
                          )}
                        </div>
                        {/* Descripción y precio */}
                        <div className="mb-3">
                          {product.type && (
                            <p className="text-sm sm:text-sm text-white/70 line-clamp-1 mb-2">
                              {product.type}
                            </p>
                          )}
                          <div>
                            <span className="text-xl sm:text-xl md:text-2xl font-semibold text-white">
                              ${parseFloat(product.price).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        {/* Botones iOS 19 style */}
                        <div className="flex items-center justify-center gap-2.5">
                          <button
                            onClick={() => handleEdit(product)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 px-3 py-2 text-sm sm:text-sm font-medium text-white/70 hover:bg-white/10 hover:border-white/20 hover:text-white transition-[background-color,border-color,color] duration-150 ease-out active:scale-95"
                          >
                            <Edit2 className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(product.id)}
                            className="flex-1 inline-flex items-center justify-center rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 px-3 py-2 text-sm sm:text-sm font-medium text-white/70 hover:bg-white/10 hover:border-white/20 hover:text-white transition-[background-color,border-color,color] duration-150 ease-out active:scale-95"
                          >
                            <Trash2 className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </>
        )}

        {/* Modal de confirmación para eliminar */}
        {showDeleteModal && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none">
            {/* Backdrop oscuro - más oscuro para enfoque */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto" />

            <div className="pointer-events-auto relative z-10 mx-4 w-full max-w-md rounded-[26px] border border-white/20 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.65)]"
              style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
                backdropFilter: 'blur(50px) saturate(200%)',
                WebkitBackdropFilter: 'blur(50px) saturate(200%)',
              }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.20em] text-[#9CA3AF] mb-1">
                    Confirmar eliminación
                  </p>
                  <p className="text-sm sm:text-base font-medium text-white">
                    ¿Estás seguro de que deseas eliminar este producto?
                  </p>
                  <p className="text-xs sm:text-sm text-white/60 mt-2">
                    Esta acción no se puede deshacer.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setProductToDelete(null);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
                >
                  <X className="h-4 w-4 text-white/80" />
                </button>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setProductToDelete(null);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/20 bg-white/5 backdrop-blur-xl text-sm font-medium text-white hover:bg-white/10 transition active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700/40 text-sm font-medium text-white shadow-lg shadow-slate-800/30 hover:shadow-xl hover:shadow-slate-700/40 transition-all duration-200 ease-out active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 1) 100%)',
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Modal de éxito */}
        {showSuccessModal && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none p-4">
            {/* Backdrop oscuro */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto" />

            <div className="pointer-events-auto w-full max-w-md flex items-center justify-center relative z-10" >
              <div
                className="
              mx-4 w-full max-w-md
              rounded-[26px]
              border border-white/20
              backdrop-blur-2xl
              shadow-[0_20px_70px_rgba(0,0,0,0.65)]
              text-white
              p-6
              relative
              z-[99999]
            "
                style={{
                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
                  backdropFilter: 'blur(50px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(50px) saturate(200%)',
                  borderRadius: '26px',
                  maxHeight: '80vh',
                  overflow: 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.20em] text-[#9CA3AF]">
                      Éxito
                    </p>
                    <p className="text-sm font-medium text-white mt-1">
                      {successMessage}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSuccessModal(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
                  >
                    <X className="h-4 w-4 text-white/80" />
                  </button>
                </div>
                <div className="text-center mt-4">
                  <button
                    onClick={() => setShowSuccessModal(false)}
                    className="
                  px-6 py-2 rounded-xl
                  border border-slate-700/40
                  text-sm font-medium text-white
                  shadow-lg shadow-slate-800/30 hover:shadow-xl hover:shadow-slate-700/40
                  transition-all duration-200 ease-out
                  active:scale-[0.98]
                "
                    style={{
                      background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 1) 100%)',
                    }}
                  >
                    Aceptar
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Modal de alerta */}
        {showAlert && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none p-4">
            {/* Backdrop oscuro */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto" />

            <div className="pointer-events-auto w-full max-w-md flex items-center justify-center relative z-10" >
              <div
                className="
              mx-4 w-full max-w-md
              rounded-[26px]
              border border-white/20
              backdrop-blur-2xl
              shadow-[0_20px_70px_rgba(0,0,0,0.65)]
              text-neutral-50
              p-6
            "
                style={{
                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
                  backdropFilter: 'blur(50px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(50px) saturate(200%)',
                }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.20em] text-[#9CA3AF]">
                      Advertencia
                    </p>
                    <p className="text-sm font-medium text-white mt-1">
                      {alertMessage}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAlert(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
                  >
                    <X className="h-4 w-4 text-white/80" />
                  </button>
                </div>
                <div className="text-center mt-4">
                  <button
                    onClick={() => setShowAlert(false)}
                    className="
                  px-6 py-2 rounded-xl
                  border border-slate-700/40
                  text-sm font-medium text-white
                  shadow-lg shadow-slate-800/30 hover:shadow-xl hover:shadow-slate-700/40
                  transition-all duration-200 ease-out
                  active:scale-[0.98]
                "
                    style={{
                      background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 1) 100%)',
                      boxShadow: '0 4px 14px rgba(15, 23, 42, 0.3)',
                    }}
                  >
                    Aceptar
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div >
  );
}


