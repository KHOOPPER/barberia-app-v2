/**
 * @fileoverview Componente para editar facturas/reservas
 * @module components/admin/EditInvoice
 */

import { useState, useEffect, useRef } from "react";
import { X, Plus, Trash2, Save, Tag, ShoppingBag, Scissors, Gift } from "lucide-react";
import { API_BASE_URL } from "../../config/api.js";
import { apiRequest } from "../../utils/api.js";

/**
 * Formatea el precio
 */
const formatPrice = (price) => {
  if (!price) return "$0.00";
  return `$${parseFloat(price).toFixed(2)}`;
};

export default function EditInvoice({ reservation, onClose, onSave }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const modalRef = useRef(null);

  // Items disponibles
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [offers, setOffers] = useState([]);

  // Items en la factura
  const [invoiceItems, setInvoiceItems] = useState([]);

  // Código de descuento
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountError, setDiscountError] = useState(null);

  // Cargar items disponibles
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);

        // Cargar datos en paralelo
        const [servicesData, productsData, offersData] = await Promise.all([
          apiRequest("/services?forInvoice=true").catch(() => ({ data: [] })),
          apiRequest("/products?forInvoice=true").catch(() => ({ data: [] })),
          apiRequest("/offers?forInvoice=true").catch(() => ({ data: [] }))
        ]);

        setServices(servicesData.data || []);
        setProducts(productsData.data || []);
        setOffers(offersData.data || []);

        // Cargar items existentes de la reserva
        if (reservation?.id) {
          try {

            const itemsRes = await apiRequest(`/reservations/${reservation.id}/items`);
            const existingItems = itemsRes.data || [];

            if (existingItems.length > 0) {
              // Convertir items de la BD al formato del componente
              setInvoiceItems(existingItems.map(item => ({
                id: `item-${item.id}`,
                type: item.item_type,
                itemId: item.item_id,
                name: item.item_name,
                price: parseFloat(item.unit_price),
                quantity: item.quantity,
              })));

              // Buscar si hay un descuento aplicado en los items
              const itemWithDiscount = existingItems.find(item => item.discount_code_id);
              if (itemWithDiscount && itemWithDiscount.discount_code_id) {
                // Los detalles del descuento ya vienen en los items desde el backend
                // Si no vienen, intentar obtenerlos del endpoint
                if (itemWithDiscount.discount_type && itemWithDiscount.discount_value !== undefined) {
                  // Calcular el monto del descuento basado en el subtotal actual
                  const currentSubtotal = existingItems.reduce((sum, item) => {
                    return sum + (parseFloat(item.unit_price) * item.quantity);
                  }, 0);

                  let discountAmount = 0;
                  if (itemWithDiscount.discount_type === 'percentage') {
                    discountAmount = currentSubtotal * (itemWithDiscount.discount_value / 100);
                    if (itemWithDiscount.max_discount) {
                      discountAmount = Math.min(discountAmount, parseFloat(itemWithDiscount.max_discount));
                    }
                  } else if (itemWithDiscount.discount_type === 'fixed') {
                    discountAmount = parseFloat(itemWithDiscount.discount_value);
                  }

                  // Aplicar el descuento con todos los detalles
                  setAppliedDiscount({
                    id: itemWithDiscount.discount_code_id,
                    code: itemWithDiscount.discount_code || '',
                    discount_type: itemWithDiscount.discount_type,
                    discount_value: parseFloat(itemWithDiscount.discount_value),
                    max_discount: itemWithDiscount.max_discount ? parseFloat(itemWithDiscount.max_discount) : null,
                    discountAmount: parseFloat(discountAmount.toFixed(2)),
                    description: itemWithDiscount.discount_description || '',
                  });
                  setDiscountCode(itemWithDiscount.discount_code || '');
                } else {
                  // Si no vienen los detalles, obtenerlos del endpoint
                  try {
                    const discountRes = await apiRequest(`/discounts/${itemWithDiscount.discount_code_id}`);

                    if (discountRes.ok) {
                      const discountData = await discountRes.json();
                      const discount = discountData.data;

                      // Calcular el monto del descuento basado en el subtotal actual
                      const currentSubtotal = existingItems.reduce((sum, item) => {
                        return sum + (parseFloat(item.unit_price) * item.quantity);
                      }, 0);

                      let discountAmount = 0;
                      if (discount.discount_type === 'percentage') {
                        discountAmount = currentSubtotal * (discount.discount_value / 100);
                        if (discount.max_discount) {
                          discountAmount = Math.min(discountAmount, discount.max_discount);
                        }
                      } else if (discount.discount_type === 'fixed') {
                        discountAmount = discount.discount_value;
                      }

                      // Aplicar el descuento con todos los detalles
                      setAppliedDiscount({
                        id: discount.id,
                        code: discount.code,
                        discount_type: discount.discount_type,
                        discount_value: parseFloat(discount.discount_value),
                        max_discount: discount.max_discount ? parseFloat(discount.max_discount) : null,
                        discountAmount: parseFloat(discountAmount.toFixed(2)),
                        description: discount.description || '',
                      });
                      setDiscountCode(discount.code);
                    }
                  } catch (discountErr) {
                    // Error al cargar descuento (no crítico)
                  }
                }
              }
            } else {
              // Si no hay items guardados, usar el servicio principal
              setInvoiceItems([{
                id: `item-${Date.now()}`,
                type: 'service',
                itemId: reservation.service_id,
                name: reservation.service_name || reservation.service_label || 'Servicio',
                price: reservation.service_price || 0,
                quantity: 1,
              }]);
            }

          } catch (err) {
            // Si falla, usar el servicio principal
            setInvoiceItems([{
              id: `item-${Date.now()}`,
              type: 'service',
              itemId: reservation.service_id,
              name: reservation.service_name || reservation.service_label || 'Servicio',
              price: reservation.service_price || 0,
              quantity: 1,
            }]);
          }
        }
      } catch (err) {
        console.error("Error al cargar items:", err);
        setError("Error al cargar los items disponibles");
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [reservation]);

  /**
   * Recalcula el descuento cuando cambian los items (solo si hay descuento aplicado)
   * Excluye el recálculo cuando se está guardando automáticamente para evitar interferencias
   */
  useEffect(() => {
    if (appliedDiscount && invoiceItems.length > 0 && !autoSaving) {
      const subtotal = invoiceItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      let discountAmount = 0;

      if (appliedDiscount.discount_type === 'percentage') {
        discountAmount = subtotal * (appliedDiscount.discount_value / 100);
        if (appliedDiscount.max_discount) {
          discountAmount = Math.min(discountAmount, appliedDiscount.max_discount);
        }
      } else if (appliedDiscount.discount_type === 'fixed') {
        discountAmount = appliedDiscount.discount_value;
      }

      // Actualizar el monto del descuento solo si cambió significativamente
      const newDiscountAmount = parseFloat(discountAmount.toFixed(2));
      if (Math.abs(newDiscountAmount - (appliedDiscount.discountAmount || 0)) > 0.01) {
        setAppliedDiscount(prev => ({
          ...prev,
          discountAmount: newDiscountAmount,
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceItems, autoSaving]); // Recalcular cuando cambien los items o el estado de autoSaving

  /**
   * Agrega un item a la factura
   */
  const handleAddItem = (type, item) => {
    const newItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      type,
      itemId: item.id,
      name: item.name,
      price: type === 'service' ? item.price : (type === 'product' ? item.price : item.final_price),
      quantity: 1,
    };
    setInvoiceItems([...invoiceItems, newItem]);
  };

  /**
   * Elimina un item de la factura
   */
  const handleRemoveItem = (itemId) => {
    setInvoiceItems(invoiceItems.filter(item => item.id !== itemId));
    // Si se elimina el item con descuento, limpiar descuento
    if (appliedDiscount) {
      setAppliedDiscount(null);
      setDiscountCode("");
    }
  };

  /**
   * Actualiza la cantidad de un item
   */
  const handleUpdateQuantity = (itemId, quantity) => {
    if (quantity < 1) return;
    setInvoiceItems(invoiceItems.map(item =>
      item.id === itemId ? { ...item, quantity: parseInt(quantity, 10) } : item
    ));
  };

  /**
   * Calcula el subtotal
   */
  const calculateSubtotal = () => {
    return invoiceItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  /**
   * Valida y aplica código de descuento
   */
  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      setDiscountError("Por favor ingresa un código de descuento");
      return;
    }

    try {
      setDiscountError(null);
      const subtotal = calculateSubtotal();

      const res = await apiRequest("/discounts/validate", {
        method: "POST",
        body: JSON.stringify({
          code: discountCode.trim().toUpperCase(),
          totalAmount: subtotal,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Código de descuento no válido");
      }

      const response = await res.json();
      const discount = response.data;

      // El backend ya calcula el discountAmount y devuelve todos los campos necesarios
      // Usar directamente los valores del backend
      let discountAmount = parseFloat(discount.discountAmount || 0);

      // Si el backend no devolvió discountAmount, calcularlo manualmente como fallback
      if (!discountAmount && discount.discountAmount === undefined) {
        if (discount.discount_type === 'percentage') {
          discountAmount = subtotal * (discount.discount_value / 100);
          if (discount.max_discount) {
            discountAmount = Math.min(discountAmount, parseFloat(discount.max_discount));
          }
        } else if (discount.discount_type === 'fixed') {
          discountAmount = parseFloat(discount.discount_value);
          // No puede ser mayor que el subtotal
          if (discountAmount > subtotal) {
            discountAmount = subtotal;
          }
        }
      }

      // Aplicar el descuento con el monto calculado y todos los detalles
      const newDiscount = {
        id: discount.id,
        code: discount.code,
        discount_type: discount.discount_type,
        discount_value: parseFloat(discount.discount_value),
        max_discount: discount.max_discount ? parseFloat(discount.max_discount) : null,
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        description: discount.description || '',
      };

      // Aplicar el descuento al estado
      setAppliedDiscount(newDiscount);
      setDiscountError(null); // Limpiar errores previos

      // Esperar un momento para que React actualice el estado y se muestre el descuento
      await new Promise(resolve => setTimeout(resolve, 50));

      // Luego guardar automáticamente los cambios con el descuento aplicado (sin recargar datos)
      try {
        setAutoSaving(true);
        await saveChanges();
        // Disparar evento para actualizar dashboard
        window.dispatchEvent(new CustomEvent('invoice-saved'));
        // El descuento ya está guardado y visible en el estado local
      } catch (saveErr) {
        // Si falla el guardado, mantener el descuento aplicado pero mostrar error
        console.error("Error al guardar descuento automáticamente:", saveErr);
        setDiscountError("Descuento aplicado, pero hubo un error al guardar. Intenta guardar manualmente.");
      } finally {
        setAutoSaving(false);
      }
    } catch (err) {
      setDiscountError(err.message || "Error al validar el código de descuento");
      setAppliedDiscount(null);
    }
  };

  /**
   * Calcula el total final
   */
  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = appliedDiscount ? appliedDiscount.discountAmount : 0;
    return Math.max(0, subtotal - discount);
  };

  /**
   * Guarda los cambios en el backend (función reutilizable)
   */
  const saveChanges = async () => {
    if (invoiceItems.length === 0) {
      throw new Error("Debe haber al menos un item en la factura");
    }

    const res = await apiRequest(`/reservations/${reservation.id}/items`, {
      method: "PUT",
      body: JSON.stringify({
        items: invoiceItems.map((item) => {
          // Distribuir el descuento proporcionalmente entre todos los items
          let itemDiscount = 0;
          if (appliedDiscount && appliedDiscount.discountAmount > 0) {
            const itemSubtotal = item.price * item.quantity;
            const totalSubtotal = calculateSubtotal();
            if (totalSubtotal > 0) {
              // Calcular el porcentaje del descuento que corresponde a este item
              const itemDiscountAmount = (itemSubtotal / totalSubtotal) * appliedDiscount.discountAmount;
              itemDiscount = parseFloat(itemDiscountAmount.toFixed(2));
            }
          }

          return {
            type: item.type,
            itemId: item.itemId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            discountAmount: itemDiscount,
          };
        }),
        discountCodeId: appliedDiscount ? appliedDiscount.id : null,
      }),
    });

    if (!res.success && !res.data) {
      // apiRequest throws on error usually, but distinct checking might be needed if success flag is used
      // Actually apiRequest returns the parsed body. 
      // If apiRequest throws, we catch it in handleSave.
      // So we just return res here.
    }

    return res;
  };

  /**
   * Guarda los cambios (con UI feedback)
   */
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      await saveChanges(true);

      // Disparar evento para actualizar dashboard
      window.dispatchEvent(new CustomEvent('invoice-saved'));

      // Mostrar navbar en móviles antes de cerrar
      const navbar = document.querySelector('nav');
      if (navbar) {
        navbar.style.display = '';
      }

      // Cerrar el modal primero
      onClose();

      // Luego ejecutar onSave para recargar la lista
      if (onSave) {
        await onSave();
      }
    } catch (err) {
      setError(err.message || "Error al guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    // Restaurar scroll
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';

    // Restaurar navbar y header
    const navbar = document.querySelector('nav');
    const header = document.querySelector('header');

    if (navbar) {
      navbar.style.removeProperty('display');
      navbar.style.removeProperty('visibility');
      navbar.style.removeProperty('opacity');
      navbar.style.removeProperty('z-index');
      navbar.style.removeProperty('pointer-events');
      navbar.style.removeProperty('position');
      navbar.style.removeProperty('top');
    }

    if (header) {
      header.style.removeProperty('display');
      header.style.removeProperty('visibility');
      header.style.removeProperty('z-index');
    }

    onClose();
  };

  const subtotal = calculateSubtotal();
  const total = calculateTotal();

  // Scroll automático al abrir el modal y ocultar navbar
  useEffect(() => {
    // Bloquear scroll del body y html
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // Ocultar navbar INMEDIATAMENTE y de todas las formas posibles
    const navbar = document.querySelector('nav');
    const header = document.querySelector('header');

    if (navbar) {
      navbar.style.setProperty('display', 'none', 'important');
      navbar.style.setProperty('visibility', 'hidden', 'important');
      navbar.style.setProperty('opacity', '0', 'important');
      navbar.style.setProperty('z-index', '-9999', 'important');
      navbar.style.setProperty('pointer-events', 'none', 'important');
      navbar.style.setProperty('position', 'fixed', 'important');
      navbar.style.setProperty('top', '-1000px', 'important');
    }

    if (header) {
      header.style.setProperty('display', 'none', 'important');
      header.style.setProperty('visibility', 'hidden', 'important');
      header.style.setProperty('z-index', '-9999', 'important');
    }

    if (modalRef.current) {
      // Scroll inmediato al inicio
      window.scrollTo({ top: 0, behavior: 'auto' });

      const contentElement = document.getElementById('edit-invoice-scroll-container');
      if (contentElement) {
        contentElement.scrollTop = 0;
      }
    }

    // Cleanup: restaurar todo
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';

      if (navbar) {
        navbar.style.removeProperty('display');
        navbar.style.removeProperty('visibility');
        navbar.style.removeProperty('opacity');
        navbar.style.removeProperty('z-index');
        navbar.style.removeProperty('pointer-events');
        navbar.style.removeProperty('position');
        navbar.style.removeProperty('top');
      }

      if (header) {
        header.style.removeProperty('display');
        header.style.removeProperty('visibility');
        header.style.removeProperty('z-index');
      }
    };
  }, []);

  return (
    <div ref={modalRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.5rem',
        overflow: 'hidden',
        background: 'rgba(0, 0, 0, 0.5)',
      }}
      onClick={handleClose}
    >
      {/* Contenedor formal minimalista blanco - Responsive */}
      <div
        id="edit-invoice-scroll-container"
        className="bg-white rounded-lg shadow-2xl w-full mx-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '900px',
          maxHeight: 'calc(100vh - 1rem)',
        }}
      >
        {/* Header minimalista - Sin scroll */}
        <div className="border-b border-gray-200 p-3 sm:p-4 flex items-center justify-between bg-gray-50 flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Editar Factura #{reservation?.id}</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content con scroll */}
        <div
          className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 md:space-y-6"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#cbd5e1 #f1f5f9',
          }}
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-red-500"></div>
                <span className="text-sm font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* Información del cliente */}
          <div className="border-b border-gray-200 pb-3 sm:pb-4">
            <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-800">Cliente</h3>
            <p className="text-sm sm:text-base text-gray-700">{reservation?.customer_name || "N/A"}</p>
            {reservation?.customer_phone && (
              <p className="text-xs sm:text-sm text-gray-600">{reservation.customer_phone}</p>
            )}
          </div>

          {/* Items actuales */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800">Items en la factura</h3>
            {invoiceItems.length === 0 ? (
              <p className="text-xs sm:text-sm text-gray-500 text-center py-6 sm:py-8">No hay items en la factura</p>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {invoiceItems.map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-3 rounded-lg border border-gray-200 bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate text-gray-800">{item.name}</p>
                      <p className="text-xs sm:text-sm text-gray-600">
                        {formatPrice(item.price)} x {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600 sm:hidden">Cant:</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateQuantity(item.id, e.target.value)}
                          className="w-16 sm:w-20 px-2 py-1 text-sm rounded-lg text-center text-gray-800 border border-gray-300 bg-white focus:border-gray-400 focus:bg-gray-50 transition-[border-color,background-color] duration-150 ease-out outline-none"
                        />
                      </div>
                      <span className="font-semibold text-sm sm:text-base w-20 sm:w-24 text-right text-gray-800">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1.5 sm:p-2 text-gray-600 hover:bg-gray-200 rounded-lg flex-shrink-0 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agregar items */}
          {!loading && (
            <div className="border-t border-gray-200 pt-3 sm:pt-4">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800">Agregar items</h3>

              {/* Servicios */}
              {services.length > 0 && (
                <div className="mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Scissors className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
                    <h4 className="font-medium text-sm sm:text-base text-gray-800">Servicios</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {services.filter(s => s.is_active !== false).map((service) => (
                      <button
                        key={service.id}
                        onClick={() => handleAddItem('service', service)}
                        className="p-2 sm:p-2.5 text-left border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors bg-white"
                      >
                        <p className="font-medium text-xs sm:text-sm truncate text-gray-800">{service.name}</p>
                        <p className="text-xs text-gray-600">{formatPrice(service.price)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Productos */}
              {products.length > 0 && (
                <div className="mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
                    <h4 className="font-medium text-sm sm:text-base text-gray-800">Productos</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {products.filter(p => p.is_active !== false).map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleAddItem('product', product)}
                        className="p-2 sm:p-2.5 text-left border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors bg-white"
                      >
                        <p className="font-medium text-xs sm:text-sm truncate text-gray-800">{product.name}</p>
                        <p className="text-xs text-gray-600">{formatPrice(product.price)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Ofertas */}
              {offers.length > 0 && (
                <div className="mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
                    <h4 className="font-medium text-sm sm:text-base text-gray-800">Ofertas</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {offers.filter(o => o.is_active !== false).map((offer) => (
                      <button
                        key={offer.id}
                        onClick={() => handleAddItem('offer', offer)}
                        className="p-2 sm:p-2.5 text-left border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors bg-white"
                      >
                        <p className="font-medium text-xs sm:text-sm truncate text-gray-800">{offer.name}</p>
                        <p className="text-xs text-gray-600">{formatPrice(offer.final_price)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Código de descuento */}
          <div className="border-t border-gray-200 pt-3 sm:pt-4">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-gray-800">
              <Tag className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
              Código de descuento
            </h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                placeholder="Ingresa el código"
                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg text-gray-800 placeholder:text-gray-400 bg-white focus:outline-none focus:border-gray-400 focus:bg-gray-50 transition-[border-color,background-color] duration-150 ease-out"
                disabled={!!appliedDiscount}
              />
              {!appliedDiscount ? (
                <button
                  onClick={handleApplyDiscount}
                  disabled={autoSaving}
                  className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap active:scale-[0.98]"
                >
                  {autoSaving ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Aplicar"
                  )}
                </button>
              ) : (
                <button
                  onClick={() => {
                    setAppliedDiscount(null);
                    setDiscountCode("");
                    setDiscountError(null);
                  }}
                  className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-gray-200 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-300 hover:border-gray-400 transition-all duration-200 whitespace-nowrap active:scale-[0.98]"
                >
                  Quitar
                </button>
              )}
            </div>
            {discountError && (
              <p className="text-red-600 text-xs sm:text-sm mt-2">{discountError}</p>
            )}
            {appliedDiscount && (
              <div className="mt-2 p-2 sm:p-3 border border-gray-300 rounded-lg bg-gray-50">
                <p className="text-gray-800 font-medium text-sm sm:text-base">
                  Descuento aplicado: {formatPrice(appliedDiscount.discountAmount)}
                </p>
                {appliedDiscount.description && (
                  <p className="text-xs sm:text-sm text-gray-600">{appliedDiscount.description}</p>
                )}
                {autoSaving && (
                  <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                    <div className="h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    Guardando cambios automáticamente...
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Totales */}
          <div className="border-t border-gray-200 pt-3 sm:pt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm sm:text-base">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium text-gray-800">{formatPrice(subtotal)}</span>
              </div>
              {appliedDiscount && (
                <div className="flex justify-between text-gray-700 text-sm sm:text-base">
                  <span>Descuento:</span>
                  <span className="font-medium">-{formatPrice(appliedDiscount.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base sm:text-lg font-bold border-t border-gray-200 pt-2">
                <span className="text-gray-800">Total:</span>
                <span className="text-gray-800">{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer minimalista - Sin scroll */}
        <div className="border-t border-gray-200 p-3 sm:p-4 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end bg-gray-50 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={saving || invoiceItems.length === 0}
            className="px-4 sm:px-6 py-2.5 text-sm font-medium bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar cambios
              </>
            )}
          </button>
          <button
            onClick={handleClose}
            className="px-4 sm:px-6 py-2.5 text-sm font-medium border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

