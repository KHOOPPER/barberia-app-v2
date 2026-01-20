/**
 * @fileoverview Componente para crear facturas sin reserva
 * @module components/admin/CreateInvoice
 */

import { useState, useEffect, useRef } from "react";
import { X, Plus, Minus, Trash2, Save, Tag, ShoppingBag, Scissors, Gift, User, Phone } from "lucide-react";
import { apiRequest } from "../../utils/api.js";

/**
 * Formatea el precio
 */
const formatPrice = (price) => {
  if (!price) return "$0.00";
  return `$${parseFloat(price).toFixed(2)}`;
};

export default function CreateInvoice({ onClose, onSave }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const modalRef = useRef(null);

  // Datos del cliente
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

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

      const contentElement = document.getElementById('create-invoice-scroll-container');
      if (contentElement) {
        contentElement.scrollTop = 0;
      }
    }

    // Cleanup: restaurar tudo
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

  // Cargar items disponibles (Copiado de EditInvoice logic)
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const [servicesData, productsData, offersData] = await Promise.all([
          apiRequest("/services?forInvoice=true").catch(() => ({ data: [] })),
          apiRequest("/products?forInvoice=true").catch(() => ({ data: [] })),
          apiRequest("/offers?forInvoice=true").catch(() => ({ data: [] }))
        ]);

        setServices(servicesData.data || []);
        setProducts(productsData.data || []);
        setOffers(offersData.data || []);
      } catch (err) {
        console.error("Error al cargar items:", err);
        setError("Error al cargar los items disponibles");
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  /**
   * Recalcula el descuento cuando cambian los items
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

      const newDiscountAmount = parseFloat(discountAmount.toFixed(2));
      if (Math.abs(newDiscountAmount - (appliedDiscount.discountAmount || 0)) > 0.01) {
        setAppliedDiscount(prev => ({
          ...prev,
          discountAmount: newDiscountAmount,
        }));
      }
    }
  }, [invoiceItems, autoSaving, appliedDiscount]);

  const handleAddItem = (type, item) => {
    // Mapear tipos en español a inglés para consistencia con el backend
    const typeMap = {
      'servicio': 'service',
      'producto': 'product',
      'oferta': 'offer',
      'custom': 'custom'
    };

    const normalizedType = typeMap[type] || type;

    // Determinar el precio correcto según el tipo
    let itemPrice = 0;
    if (item) {
      if (normalizedType === 'service' || normalizedType === 'product') {
        itemPrice = item.price || 0;
      } else if (normalizedType === 'offer') {
        itemPrice = item.final_price || item.price || 0;
      }
    }

    const newItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      type: normalizedType,
      itemId: item ? item.id : null,
      name: item ? item.name : "",
      price: itemPrice,
      quantity: 1,
      isCustom: !item
    };
    setInvoiceItems([...invoiceItems, newItem]);
  };

  const handleUpdateManualItem = (itemId, field, value) => {
    setInvoiceItems(invoiceItems.map(item =>
      item.id === itemId ? { ...item, [field]: field === 'price' ? parseFloat(value) || 0 : value } : item
    ));
  };

  const handleRemoveItem = (itemId) => {
    setInvoiceItems(invoiceItems.filter(item => item.id !== itemId));
    if (appliedDiscount) {
      setAppliedDiscount(null);
      setDiscountCode("");
    }
  };

  const handleUpdateQuantity = (itemId, quantity) => {
    if (quantity < 1) return;
    setInvoiceItems(invoiceItems.map(item =>
      item.id === itemId ? { ...item, quantity: parseInt(quantity, 10) } : item
    ));
  };

  const calculateSubtotal = () => invoiceItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

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
        body: JSON.stringify({ code: discountCode.trim().toUpperCase(), totalAmount: subtotal }),
      });
      const discount = res.data;
      let discountAmount = parseFloat(discount.discountAmount || 0);
      if (!discountAmount) {
        if (discount.discount_type === 'percentage') {
          discountAmount = subtotal * (discount.discount_value / 100);
          if (discount.max_discount) discountAmount = Math.min(discountAmount, parseFloat(discount.max_discount));
        } else if (discount.discount_type === 'fixed') {
          discountAmount = Math.min(parseFloat(discount.discount_value), subtotal);
        }
      }
      setAppliedDiscount({ ...discount, discountAmount: parseFloat(discountAmount.toFixed(2)) });
    } catch (err) {
      setDiscountError(err.message);
      setAppliedDiscount(null);
    }
  };

  const calculateTotal = () => Math.max(0, calculateSubtotal() - (appliedDiscount?.discountAmount || 0));

  const handleSave = async () => {
    try {
      if (!customerName.trim()) { setError("El nombre del cliente es requerido"); return; }
      if (customerPhone.trim() && !/^[267][0-9]{7}$/.test(customerPhone.trim())) {
        setError("Número inválido. Debe tener 8 dígitos y empezar en 2, 6 o 7");
        return;
      }
      if (invoiceItems.length === 0) { setError("Debe haber al menos un item"); return; }
      setSaving(true);
      setError(null);

      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const timeStr = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

      const hasServices = invoiceItems.some(item => item.type === 'service');
      const firstServiceItem = invoiceItems.find(item => item.type === 'service');

      // Determinar el serviceId y serviceLabel apropiados
      let serviceId = null;
      let serviceLabel = "Factura";

      if (firstServiceItem) {
        // Si hay un servicio en la factura, usar ese
        serviceId = String(firstServiceItem.itemId);
        serviceLabel = firstServiceItem.name;
      } else if (services.length > 0) {
        // Si no hay servicios en la factura pero existen servicios en la BD, usar el primero
        serviceId = String(services[0].id);
        serviceLabel = "Factura - Solo Productos";
      } else {
        // Si no hay servicios disponibles, usar null y un label genérico
        serviceId = null;
        serviceLabel = "Factura - Solo Productos";
      }

      const reservationRes = await apiRequest("/reservations", {
        method: "POST",
        body: JSON.stringify({
          serviceId: serviceId,
          serviceLabel: serviceLabel,
          date: dateStr,
          time: timeStr,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || undefined
        }),
      });

      const { data } = reservationRes;
      const reservationId = data.reservationId || data.id;

      await apiRequest(`/reservations/${reservationId}/items`, {
        method: "PUT",
        body: JSON.stringify({
          items: invoiceItems.map(item => ({
            ...item,
            discountAmount: (item.price * item.quantity / calculateSubtotal()) * (appliedDiscount?.discountAmount || 0)
          })),
          discountCodeId: appliedDiscount?.id || null
        }),
      });

      await apiRequest(`/reservations/${reservationId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "confirmada" }),
      });

      window.dispatchEvent(new CustomEvent('invoice-saved'));
      window.dispatchEvent(new CustomEvent('client-invoice-saved'));
      if (onSave) await onSave();
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    onClose();
  };

  const subtotal = calculateSubtotal();
  const total = calculateTotal();

  return (
    <div ref={modalRef}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0.5rem', overflow: 'hidden', background: 'rgba(0, 0, 0, 0.5)',
      }}
      onClick={handleClose}
    >
      <div id="create-invoice-scroll-container"
        className="bg-white rounded-2xl shadow-2xl w-full mx-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '900px', maxHeight: 'calc(100vh - 1rem)' }}
      >
        <div className="border-b border-gray-200 p-3 sm:p-4 flex items-center justify-between bg-gray-50 flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Nueva Factura</h2>
          <button onClick={handleClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          <div className="border-b border-gray-200 pb-4">
            <h3 className="text-base sm:text-lg font-semibold mb-3 text-gray-800 flex items-center gap-2">
              <User className="h-4 w-4" /> Datos del Cliente
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Nombre *</label>
                <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-gray-400 outline-none transition-all text-gray-800 placeholder:text-gray-400" placeholder="Nombre completo" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  maxLength="8"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-gray-400 outline-none transition-all text-gray-800 placeholder:text-gray-400"
                  placeholder="Ej: 70000000"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-3 text-gray-800">Items en la factura</h3>
            {invoiceItems.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6 border-2 border-dashed border-gray-100 rounded-xl">No hay items agregados</p>
            ) : (
              <div className="space-y-2">
                {invoiceItems.map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50 gap-2">
                    <div className="flex-1 min-w-0">
                      {item.isCustom ? (
                        <div className="flex flex-col gap-1">
                          <input
                            type="text"
                            placeholder="Nombre del item..."
                            value={item.name}
                            onChange={(e) => handleUpdateManualItem(item.id, 'name', e.target.value)}
                            className="w-full px-2 py-1 text-sm font-semibold text-gray-800 border-b border-gray-200 bg-transparent focus:border-gray-400 outline-none"
                          />
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">$</span>
                            <input
                              type="number"
                              placeholder="Precio"
                              value={item.price || ""}
                              onChange={(e) => handleUpdateManualItem(item.id, 'price', e.target.value)}
                              className="w-20 px-1 text-xs text-gray-700 bg-transparent border-b border-transparent focus:border-gray-300 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="font-semibold text-sm text-gray-800 truncate">{item.name}</p>
                          <p className="text-xs text-gray-600">{formatPrice(item.price)} x {item.quantity}</p>
                        </>
                      )}
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase sm:hidden">Cant:</span>
                        <div className="flex items-center border border-gray-200 rounded-md bg-white overflow-hidden h-8">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, Math.max(1, (parseInt(item.quantity) || 1) - 1))}
                            className="px-2 h-full text-gray-500 hover:bg-gray-50 transition-colors border-r border-gray-100"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateQuantity(item.id, e.target.value)}
                            className="w-10 text-xs text-center text-gray-800 bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            onClick={() => handleUpdateQuantity(item.id, (parseInt(item.quantity) || 1) + 1)}
                            className="px-2 h-full text-gray-500 hover:bg-gray-50 transition-colors border-l border-gray-100"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <span className="font-bold text-sm min-w-[70px] text-right text-gray-800">{formatPrice(item.price * item.quantity)}</span>
                      <button onClick={() => handleRemoveItem(item.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800">Agregar items</h3>
              <button
                onClick={() => handleAddItem('custom', null)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Plus className="h-3 w-3" /> Personalizado
              </button>
            </div>
            <div className="space-y-4">
              {[{ label: 'Servicios', icon: Scissors, data: services }, { label: 'Productos', icon: ShoppingBag, data: products }, { label: 'Ofertas', icon: Gift, data: offers }].map(group => group.data.length > 0 && (
                <div key={group.label}>
                  <div className="flex items-center gap-2 mb-2"><group.icon className="h-4 w-4 text-gray-500" /><h4 className="text-xs font-bold text-gray-700 uppercase tracking-widest">{group.label}</h4></div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {group.data.filter(i => i.is_active !== false).map(item => (
                      <button key={item.id} onClick={() => handleAddItem(group.label.toLowerCase().slice(0, -1), item)}
                        className="p-2 text-left border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors text-[10px] sm:text-xs">
                        <p className="font-bold text-gray-800 truncate">{item.name}</p>
                        <p className="text-gray-600">{formatPrice(item.price || item.final_price)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><Tag className="h-4 w-4" /> Descuento</h3>
            <div className="flex gap-2">
              <input type="text" value={discountCode} onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                placeholder="Código" className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none text-gray-800" disabled={!!appliedDiscount} />
              <button onClick={appliedDiscount ? () => { setAppliedDiscount(null); setDiscountCode(""); } : handleApplyDiscount}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${appliedDiscount ? 'bg-gray-100 text-gray-600' : 'bg-gray-800 text-white hover:bg-gray-700'}`}>
                {appliedDiscount ? 'Quitar' : 'Aplicar'}
              </button>
            </div>
            {appliedDiscount && <div className="mt-2 p-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-semibold text-gray-700">Descuento aplicado: {formatPrice(appliedDiscount.discountAmount)}</div>}
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-600 font-medium"><span>Subtotal:</span><span>{formatPrice(subtotal)}</span></div>
              {appliedDiscount && <div className="flex justify-between text-xs text-gray-600 font-medium"><span>Descuento:</span><span>-{formatPrice(appliedDiscount.discountAmount)}</span></div>}
              <div className="flex justify-between text-base font-bold text-gray-800 border-t border-gray-100 pt-2"><span>Total:</span><span>{formatPrice(total)}</span></div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 p-3 sm:p-4 flex gap-2 sm:gap-3 justify-end bg-gray-50 flex-shrink-0">
          <button onClick={handleSave} disabled={saving || invoiceItems.length === 0}
            className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold bg-gray-800 text-white rounded-lg hover:bg-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="h-4 w-4" /> Crear Factura</>}
          </button>
          <button onClick={handleClose} className="px-6 py-2.5 text-sm font-bold border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50">Cancelar</button>
        </div>
      </div>
    </div>
  );
}
