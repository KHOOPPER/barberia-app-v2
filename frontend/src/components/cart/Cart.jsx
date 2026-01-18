/**
 * @fileoverview Componente del carrito de compras
 * @module components/cart/Cart
 * 
 * He implementado este componente para mostrar el carrito de compras con un diseño
 * elegante y moderno, permitiendo gestionar productos y promociones.
 */

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Minus, ShoppingBag, Trash2, Tag, CheckCircle, AlertCircle, Calendar, Clock, User } from "lucide-react";
import { motion } from "framer-motion";
import { useCart } from "../../contexts/CartContext";
import { API_BASE_URL } from "../../config/api";
import { formatDate } from "../../data/mock";
import CheckoutForm from "./CheckoutForm";
import AlertModal from "../ui/AlertModal";

/**
 * Componente del carrito de compras
 * Muestra un sidebar deslizable con todos los items del carrito
 */
export default function Cart({ isOpen, onClose }) {
  const { cartItems, updateQuantity, removeItem, getTotal, clearCart, showAlert } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [discountApplied, setDiscountApplied] = useState(null);
  const [discountError, setDiscountError] = useState(null);
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);
  const [alertState, setAlertState] = useState({
    isOpen: false,
    message: "",
    type: "error",
  });

  const subtotal = getTotal();
  const discountAmount = discountApplied?.discountAmount || 0;
  const total = subtotal - discountAmount;

  /**
   * Valida y aplica un código de descuento
   */
  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      setDiscountError("Ingresa un código de descuento");
      return;
    }

    setIsValidatingDiscount(true);
    setDiscountError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/discounts/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: discountCode.toUpperCase().trim(),
          totalAmount: subtotal,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Error al validar el código");
      }

      setDiscountApplied(data.data);
      setDiscountError(null);
    } catch (error) {
      setDiscountError(error.message || "Código de descuento no válido");
      setDiscountApplied(null);
    } finally {
      setIsValidatingDiscount(false);
    }
  };

  /**
   * Remueve el descuento aplicado
   */
  const handleRemoveDiscount = () => {
    setDiscountApplied(null);
    setDiscountCode("");
    setDiscountError(null);
  };

  /**
   * Genera el mensaje de WhatsApp para el pedido
   */
  const generateWhatsAppMessage = (customerData) => {
    let message = "¡Hola! Me gustaría realizar el siguiente pedido:\n\n";

    // Datos del cliente
    message += "📋 DATOS DEL CLIENTE:\n";
    message += `Nombre: ${customerData.customerName}\n`;
    message += `Teléfono: ${customerData.customerPhone}\n`;
    message += "\n";

    // Items del pedido
    message += "🛒 PEDIDO:\n";
    cartItems.forEach((item) => {
      let itemType = "Producto";
      if (item.type === "service") itemType = "Servicio";
      else if (item.type === "offer") itemType = "Promoción";

      message += `• ${itemType}: ${item.name}\n`;
      message += `  Cantidad: ${item.quantity}\n`;
      message += `  Precio unitario: $${item.price.toFixed(2)}\n`;

      // Si tiene datos de reserva, agregarlos
      if (item.bookingData) {
        const { barber, date, time } = item.bookingData;
        message += `  📅 Fecha: ${formatDate(date)}\n`;
        message += `  🕐 Hora: ${time}\n`;
        if (barber) {
          message += `  👤 Barbero: ${barber.name}\n`;
        } else {
          message += `  👤 Barbero: Cualquiera (Primero disponible)\n`;
        }
      }

      message += `  Subtotal: $${(item.price * item.quantity).toFixed(2)}\n\n`;
    });

    // Resumen de precios
    message += "💰 RESUMEN:\n";
    message += `Subtotal: $${subtotal.toFixed(2)}\n`;
    if (discountApplied) {
      message += `Descuento (${discountCode}): -$${discountAmount.toFixed(2)}\n`;
    }
    message += `TOTAL: $${total.toFixed(2)}\n\n`;
    message += "Por favor, confirma disponibilidad y forma de pago. ¡Gracias!";

    return encodeURIComponent(message);
  };

  /**
   * Maneja el proceso de checkout después de completar el formulario
   */
  const handleCheckoutComplete = async (customerData) => {
    try {
      // Validar stock de productos antes de completar la compra
      const productItems = cartItems.filter(item => item.type === 'product');
      if (productItems.length > 0) {
        // Verificar stock actualizado desde el servidor
        for (const item of productItems) {
          try {
            const productRes = await fetch(`${API_BASE_URL}/products/${item.id}`);
            if (productRes.ok) {
              const productData = await productRes.json();
              const product = productData.data || productData;

              // Si el producto tiene stock definido, validar disponibilidad
              if (product.stock !== null && product.stock !== undefined) {
                const availableStock = parseInt(product.stock) || 0;
                if (availableStock < item.quantity) {
                  setAlertState({
                    isOpen: true,
                    message: `Stock insuficiente para "${item.name}".\n\nStock disponible: ${availableStock}\nSolicitado: ${item.quantity}\n\nPor favor, actualiza la cantidad en el carrito.`,
                    type: "error",
                  });
                  setIsCheckingOut(false);
                  return;
                }
              }
            }
          } catch (err) {
            console.warn(`Error al verificar stock de producto ${item.id}:`, err);
            // Continuar con la compra si no se puede verificar, el backend lo validará
          }
        }
      }

      // SIEMPRE crear reservas/facturas en el backend cuando hay items en el carrito
      // Esto incluye tanto productos como servicios/promociones
      if (cartItems.length > 0) {
        setIsCheckingOut(true);

        console.log("Creating invoice from cart...", {
          itemsCount: cartItems.length,
          customerName: customerData.customerName,
          customerPhone: customerData.customerPhone,
          hasProducts: cartItems.some(item => item.type === 'product'),
          hasServices: cartItems.some(item => item.type === 'service'),
          hasOffers: cartItems.some(item => item.type === 'offer')
        });

        const response = await fetch(`${API_BASE_URL}/reservations/from-cart`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cartItems: cartItems,
            customerName: customerData.customerName,
            customerPhone: customerData.customerPhone,
            discountCodeId: discountApplied?.id || null,
            discountAmount: discountAmount,
            subtotal: subtotal,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error("Error creating invoice from cart:", data);
          const errorMessage = data.error?.message || "Error al crear la factura";

          // Si el error es por stock insuficiente, mostrar mensaje claro
          if (errorMessage.includes("Stock insuficiente") || errorMessage.includes("stock")) {
            setAlertState({
              isOpen: true,
              message: `${errorMessage}\n\nPor favor, actualiza la cantidad en tu carrito o elimina los productos sin stock.`,
              type: "error",
            });
          } else {
            setAlertState({
              isOpen: true,
              message: errorMessage,
              type: "error",
            });
          }
          setIsCheckingOut(false);
          return;
        }

        console.log("Invoice created from cart:", data);

        // Si algunas reservas fallaron, mostrar advertencia
        if (data.data?.errors && data.data.errors.length > 0) {
          setAlertState({
            isOpen: true,
            message: `Se crearon ${data.data.success || 1} reserva(s) correctamente, pero ${data.data.failed || 0} fallaron.\n\nRevisa los detalles en el mensaje de WhatsApp.`,
            type: "warning",
          });
        } else {
          console.log("Invoice created successfully. Reservation ID:", data.data?.reservationId || data.data?.createdReservations?.[0]?.id);
        }
      }

      // Abrir WhatsApp con el mensaje
      const whatsappNumber = "70009306";
      const message = generateWhatsAppMessage(customerData);
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;

      window.open(whatsappUrl, "_blank");

      // Limpiar carrito después de un breve delay
      setTimeout(() => {
        clearCart();
        setDiscountApplied(null);
        setDiscountCode("");
        setShowCheckoutForm(false);
        setIsCheckingOut(false);
        onClose();

        // Recargar la página automáticamente para actualizar el stock de productos
        // Esto asegura que los productos sin stock se oculten automáticamente
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }, 500);
    } catch (error) {
      setIsCheckingOut(false);
      setAlertState({
        isOpen: true,
        message: `Error al procesar el pedido: ${error.message}\n\nPor favor, intenta nuevamente.`,
        type: "error",
      });
    }
  };

  /**
   * Maneja el inicio del proceso de checkout
   */
  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    setShowCheckoutForm(true);
  };

  if (!isOpen) return null;

  const cartContent = (
    <>
      {/* Overlay oscuro */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9997
        }}
      />

      {/* Sidebar del carrito */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed right-2 sm:right-4 w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col max-h-[95vh]"
        style={{
          position: 'fixed',
          top: '88px',
          zIndex: 9998
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-[#facc6b] drop-shadow-[0_0_8px_rgba(250,204,107,0.5)]" />
            <h2 className="text-xl font-bold text-white uppercase tracking-[0.15em] text-xs md:text-sm">Carrito de Compras</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-300"
          >
            <X className="w-5 h-5 text-white/80 hover:text-white" />
          </button>
        </div>

        {/* Lista de items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 min-h-[300px]">
              <div className="w-24 h-24 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center mb-6">
                <ShoppingBag className="w-12 h-12 text-white/30" />
              </div>
              <p className="text-white/70 text-lg font-semibold uppercase tracking-[0.1em] mb-2">Tu carrito está vacío</p>
              <p className="text-white/50 text-sm max-w-xs">
                Agrega productos o promociones para comenzar
              </p>
            </div>
          ) : (
            cartItems.map((item) => {
              const imageUrl = item.image_url
                ? (item.image_url.startsWith('http') ? item.image_url : `${API_BASE_URL.replace("/api", "")}${item.image_url}`)
                : "/images/products/placeholder.jpg";

              return (
                <motion.div
                  key={`${item.type}-${item.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                >
                  <div className="flex gap-4">
                    {/* Imagen */}
                    <div className="flex-shrink-0">
                      <img
                        src={imageUrl}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-xl"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/images/products/placeholder.jpg";
                        }}
                      />
                    </div>

                    {/* Información */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-xs uppercase tracking-[0.15em] text-[#facc6b] mb-1 font-medium drop-shadow-[0_0_5px_rgba(250,204,107,0.3)]">
                            {item.type === "product"
                              ? "Producto"
                              : item.type === "service"
                                ? "Servicio"
                                : "Promoción"}
                          </p>
                          <h3 className="text-sm font-semibold text-white/90 line-clamp-2">
                            {item.name}
                          </h3>
                        </div>
                        <button
                          onClick={() => removeItem(item.itemKey || item.id, item.type)}
                          className="flex-shrink-0 p-1.5 rounded-full bg-white/10 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 transition-all duration-300"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>

                      {/* Precio y cantidad */}
                      <div className="mt-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            ${item.price.toFixed(2)}
                          </p>
                          {item.original_price && (
                            <p className="text-xs text-white/50 line-through">
                              ${item.original_price.toFixed(2)}
                            </p>
                          )}
                        </div>

                        {/* Controles de cantidad */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              updateQuantity(item.itemKey || item.id, item.type, item.quantity - 1)
                            }
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 transition-all duration-300"
                          >
                            <Minus className="w-4 h-4 text-white/80 hover:text-white" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.itemKey || item.id, item.type, item.quantity + 1)
                            }
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 transition-all duration-300"
                          >
                            <Plus className="w-4 h-4 text-white/80 hover:text-white" />
                          </button>
                        </div>
                      </div>

                      {/* Subtotal */}
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <p className="text-xs text-white/60 uppercase tracking-[0.1em]">
                          Subtotal:{" "}
                          <span className="font-semibold text-white">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Footer con total y botón de checkout */}
        <div className="border-t border-white/10 p-6 space-y-4 bg-white/5 backdrop-blur-xl flex-shrink-0">
          {cartItems.length > 0 ? (
            <>
              {/* Campo de código de descuento */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => {
                        setDiscountCode(e.target.value.toUpperCase());
                        setDiscountError(null);
                      }}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !discountApplied) {
                          handleApplyDiscount();
                        }
                      }}
                      placeholder="Código de descuento"
                      disabled={!!discountApplied || isValidatingDiscount}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/10 border border-white/20 focus:border-[#facc6b] focus:ring-2 focus:ring-[#facc6b]/30 text-sm text-white/90 placeholder:text-white/40 disabled:opacity-50 transition-all duration-300"
                    />
                  </div>
                  {discountApplied ? (
                    <button
                      onClick={handleRemoveDiscount}
                      className="px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 hover:border-red-500/50 transition-all duration-300 text-sm font-semibold uppercase tracking-[0.1em]"
                    >
                      Quitar
                    </button>
                  ) : (
                    <button
                      onClick={handleApplyDiscount}
                      disabled={isValidatingDiscount || !discountCode.trim()}
                      className="px-4 py-2.5 rounded-xl bg-[#facc6b]/20 border border-[#facc6b]/30 text-[#facc6b] hover:bg-[#facc6b]/30 hover:border-[#facc6b]/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold uppercase tracking-[0.1em]"
                    >
                      {isValidatingDiscount ? (
                        <div className="w-4 h-4 border-2 border-[#facc6b]/30 border-t-[#facc6b] rounded-full animate-spin" />
                      ) : (
                        "Aplicar"
                      )}
                    </button>
                  )}
                </div>
                {discountError && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {discountError}
                  </p>
                )}
                {discountApplied && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Descuento aplicado: -${discountAmount.toFixed(2)}
                  </p>
                )}
              </div>

              {/* Resumen de precios */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60 uppercase tracking-[0.1em] text-xs">Subtotal</span>
                  <span className="text-white/90 font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                {discountApplied && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-emerald-400 uppercase tracking-[0.1em] text-xs">Descuento</span>
                    <span className="text-emerald-400 font-semibold">-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-sm uppercase tracking-[0.15em] text-white/60 font-medium">
                    Total
                  </span>
                  <span className="text-2xl font-bold text-[#facc6b] drop-shadow-[0_0_10px_rgba(250,204,107,0.5)]">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className="w-full py-3 rounded-full bg-[#facc6b] text-black font-bold hover:bg-[#facc6b]/90 hover:shadow-[0_0_20px_rgba(250,204,107,0.4)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-[0.1em] text-sm"
              >
                <ShoppingBag className="w-5 h-5" />
                Completar Pedido por WhatsApp
              </button>

              <button
                onClick={clearCart}
                className="w-full py-2 text-xs text-white/60 hover:text-white/90 transition-colors uppercase tracking-[0.1em]"
              >
                Vaciar carrito
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60 uppercase tracking-[0.1em] text-xs">Subtotal</span>
                  <span className="text-white/90 font-semibold">$0.00</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-sm uppercase tracking-[0.15em] text-white/60 font-medium">
                    Total
                  </span>
                  <span className="text-2xl font-bold text-[#facc6b] drop-shadow-[0_0_10px_rgba(250,204,107,0.5)]">
                    $0.00
                  </span>
                </div>
              </div>
              <button
                disabled
                className="w-full py-3 rounded-full bg-white/10 text-white/40 font-bold transition-all duration-300 cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-[0.1em] text-sm border border-white/10"
              >
                <ShoppingBag className="w-5 h-5" />
                Completar Pedido por WhatsApp
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );

  // Renderizar usando portal para evitar problemas de z-index
  return typeof document !== 'undefined' ? (
    <>
      {createPortal(cartContent, document.body)}
      <CheckoutForm
        isOpen={showCheckoutForm}
        onClose={() => setShowCheckoutForm(false)}
        onConfirm={handleCheckoutComplete}
        cartItems={cartItems}
        subtotal={subtotal}
        total={total}
        discountApplied={discountApplied}
        discountAmount={discountAmount}
        discountCode={discountCode}
      />
      <AlertModal
        isOpen={alertState.isOpen}
        onClose={() => setAlertState({ isOpen: false, message: "", type: "error" })}
        message={alertState.message}
        type={alertState.type}
      />
    </>
  ) : null;
}

