/**
 * @fileoverview Componente de factura/ticket imprimible con QR
 * @module components/admin/InvoiceTicket
 */

import QRCode from "react-qr-code";
import { X } from "lucide-react";
import { parseDate } from "../../utils/dateUtils.js";
import { useState, useEffect } from "react";
import { API_BASE_URL } from "../../config/api.js";
import { apiRequest } from "../../utils/api.js";

/**
 * Información de la barbería (puede moverse a settings más adelante)
 */
const BARBERSHOP_INFO = {
  name: "BarberShop Premium",
  address: "Ciudad, País",
  phone: "+00 1234 5678",
  email: "contacto@barbershop.com",
  taxId: "NIT: 0000-000000-000-0",
};

/**
 * Genera el contenido del QR (puede incluir URL de verificación, ID de reserva, etc.)
 */
const generateQRContent = (reservation, total = null) => {
  return JSON.stringify({
    id: reservation.id,
    date: reservation.date,
    time: reservation.time,
    customer: reservation.customer_name,
    amount: total || reservation.service_price || reservation.final_price || "N/A",
  });
};

/**
 * Formatea la fecha para mostrar en la factura
 */
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const date = parseDate(dateString);
    if (Number.isNaN(date.getTime())) {
      return dateString; // Si no se puede parsear, devolver el string original
    }
    const options = { year: "numeric", month: "long", day: "numeric" };
    return date.toLocaleDateString("es-ES", options);
  } catch (error) {
    console.error("Error al formatear fecha:", error, dateString);
    return dateString; // Si hay error, devolver el string original
  }
};

/**
 * Formatea el precio
 */
const formatPrice = (price) => {
  if (!price) return "$0.00";
  return `$${parseFloat(price).toFixed(2)}`;
};

export default function InvoiceTicket({ reservation, onClose, refreshKey = 0 }) {
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      if (!reservation?.id) {
        setLoadingItems(false);
        return;
      }

      try {
        const response = await apiRequest(`/reservations/${reservation.id}/items`);
        const items = response.data || [];
        setInvoiceItems(items);

        // Si no hay items guardados, usar el servicio principal
        if (items.length === 0 && reservation.service_name) {
          setInvoiceItems([{
            item_name: reservation.service_name || reservation.service_label || "Servicio",
            unit_price: reservation.service_price || 0,
            quantity: 1,
            subtotal: reservation.service_price || 0,
          }]);
        }

      } catch (err) {
        console.error("Error al cargar items:", err);
        // Si falla, usar el servicio principal
        if (reservation.service_name) {
          setInvoiceItems([{
            item_name: reservation.service_name || reservation.service_label || "Servicio",
            unit_price: reservation.service_price || 0,
            quantity: 1,
            subtotal: reservation.service_price || 0,
          }]);
        }
      } finally {
        setLoadingItems(false);
      }
    };

    fetchItems();
  }, [reservation, refreshKey]);

  if (!reservation) return null;

  const barberName = reservation.barber_name || "Cualquier barbero";

  // Calcular subtotal sin descuentos (precio * cantidad)
  const subtotalWithoutDiscount = invoiceItems.reduce((sum, item) => {
    const unitPrice = parseFloat(item.unit_price) || 0;
    const quantity = parseInt(item.quantity) || 1;
    return sum + (unitPrice * quantity);
  }, 0);

  // Calcular descuento total
  const totalDiscount = invoiceItems.reduce((sum, item) => {
    return sum + (parseFloat(item.discount_amount) || 0);
  }, 0);

  // Calcular total final (subtotal - descuento)
  const finalPrice = Math.max(0, subtotalWithoutDiscount - totalDiscount);

  // Si no hay items, usar el precio del servicio original
  const finalTotal = invoiceItems.length > 0 ? finalPrice : (reservation.service_price || 0);

  const qrContent = generateQRContent(reservation, finalTotal);

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    // Restaurar scroll
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';

    // Restaurar navbar
    const navbar = document.querySelector('nav');
    const header = document.querySelector('header');

    if (navbar) {
      navbar.style.removeProperty('display');
      navbar.style.removeProperty('visibility');
      navbar.style.removeProperty('opacity');
      navbar.style.removeProperty('z-index');
    }

    if (header) {
      header.style.removeProperty('display');
      header.style.removeProperty('visibility');
      header.style.removeProperty('z-index');
    }

    onClose();
  };

  // Ocultar navbar y bloquear scroll al abrir el modal
  useEffect(() => {
    // Bloquear scroll
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // Ocultar navbar
    const navbar = document.querySelector('nav');
    const header = document.querySelector('header');

    if (navbar) {
      navbar.style.setProperty('display', 'none', 'important');
      navbar.style.setProperty('visibility', 'hidden', 'important');
      navbar.style.setProperty('opacity', '0', 'important');
      navbar.style.setProperty('z-index', '-9999', 'important');
    }

    if (header) {
      header.style.setProperty('display', 'none', 'important');
      header.style.setProperty('visibility', 'hidden', 'important');
      header.style.setProperty('z-index', '-9999', 'important');
    }

    return () => {
      // Restaurar scroll
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';

      // Restaurar navbar
      if (navbar) {
        navbar.style.removeProperty('display');
        navbar.style.removeProperty('visibility');
        navbar.style.removeProperty('opacity');
        navbar.style.removeProperty('z-index');
      }

      if (header) {
        header.style.removeProperty('display');
        header.style.removeProperty('visibility');
        header.style.removeProperty('z-index');
      }
    };
  }, []);

  return (
    <>
      {/* Overlay modal */}
      <div
        className="fixed inset-0 z-[999999] flex items-center justify-center p-2 sm:p-4 bg-black/50"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999999,
        }}
        onClick={handleClose}
      >
        {/* Contenedor formal minimalista blanco - Responsive */}
        <div
          id="invoice-scroll-container"
          className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-auto overflow-y-auto flex flex-col max-h-[calc(100vh-1rem)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header minimalista - Sin scroll */}
          <div className="border-b border-gray-200 p-3 sm:p-4 flex items-center justify-between bg-gray-50 flex-shrink-0">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Factura</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Contenido del ticket - Con scroll */}
          <div className="flex-1 overflow-y-auto">
            <div id="invoice-content" className="p-3 sm:p-4 md:p-6 print:p-2 bg-white text-black" style={{ width: '100%' }}>
              {/* Información de la barbería */}
              <div className="text-center mb-2 sm:mb-3 md:mb-4 border-b border-gray-300 pb-2 sm:pb-2.5 print:mb-2 print:pb-1">
                <h1 className="text-base sm:text-lg md:text-xl font-bold mb-1 print:text-base text-black">{BARBERSHOP_INFO.name}</h1>
                <p className="text-xs sm:text-sm text-gray-600 print:text-[8pt]">{BARBERSHOP_INFO.address}</p>
                <p className="text-xs sm:text-sm text-gray-600 print:text-[8pt]">{BARBERSHOP_INFO.phone}</p>
                {BARBERSHOP_INFO.email && (
                  <p className="text-xs sm:text-sm text-gray-600 print:text-[8pt]">{BARBERSHOP_INFO.email}</p>
                )}
                {BARBERSHOP_INFO.taxId && (
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-1 print:text-[7pt]">{BARBERSHOP_INFO.taxId}</p>
                )}
              </div>

              {/* Línea separadora */}
              <div className="border-t border-dashed border-gray-400 my-1 sm:my-1.5 print:my-1"></div>

              {/* Información de la factura */}
              <div className="mb-2 sm:mb-3 print:mb-2">
                <div className="flex justify-between text-xs sm:text-sm mb-1 print:text-[8pt]">
                  <span className="text-gray-600">Factura #:</span>
                  <span className="font-semibold text-black">#{reservation.id}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm mb-1 print:text-[8pt]">
                  <span className="text-gray-600">Fecha:</span>
                  <span className="text-right break-words text-black">{formatDate(reservation.date)}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm mb-1 print:text-[8pt]">
                  <span className="text-gray-600">Hora:</span>
                  <span className="text-black">{reservation.time || "N/A"}</span>
                </div>
              </div>

              {/* Línea separadora */}
              <div className="border-t border-dashed border-gray-300 my-1 sm:my-1.5 print:my-1"></div>

              {/* Información del cliente */}
              <div className="mb-2 sm:mb-3 print:mb-2">
                <h3 className="font-semibold mb-1 text-xs sm:text-sm uppercase print:text-[8pt] text-black">Cliente</h3>
                <p className="text-xs sm:text-sm print:text-[8pt] text-black">{reservation.customer_name || "N/A"}</p>
                {reservation.customer_phone && (
                  <p className="text-xs sm:text-sm text-gray-600 print:text-[8pt]">{reservation.customer_phone}</p>
                )}
              </div>

              {/* Línea separadora */}
              <div className="border-t border-dashed border-gray-300 my-1 sm:my-1.5 print:my-1"></div>

              {/* Detalles de los items */}
              <div className="mb-2 sm:mb-3 print:mb-2">
                <h3 className="font-semibold mb-1 text-xs sm:text-sm uppercase print:text-[8pt] text-black">Items</h3>
                {loadingItems ? (
                  <p className="text-xs sm:text-sm text-gray-600 print:text-[8pt]">Cargando items...</p>
                ) : invoiceItems.length === 0 ? (
                  <p className="text-xs sm:text-sm text-gray-600 print:text-[8pt]">No hay items en esta factura</p>
                ) : (
                  <div className="space-y-1 sm:space-y-1.5 print:space-y-0">
                    {invoiceItems.map((item, index) => (
                      <div key={index} className="flex justify-between text-xs sm:text-sm print:text-[8pt] mb-1">
                        <div className="flex-1 min-w-0 pr-3">
                          <span className="break-words text-black">{item.item_name}</span>
                          {item.quantity > 1 && (
                            <span className="text-[10px] sm:text-xs text-gray-600 ml-1">
                              x{item.quantity}
                            </span>
                          )}
                          {item.discount_amount > 0 && (
                            <div className="text-[10px] sm:text-xs text-blue-600">
                              Desc: -{formatPrice(item.discount_amount)}
                            </div>
                          )}
                        </div>
                        <span className="font-semibold ml-2 flex-shrink-0 text-black">{formatPrice(item.subtotal)}</span>
                      </div>
                    ))}
                    {reservation.service_label === "Factura - Solo Productos" ? (
                      <div className="text-[10px] sm:text-xs text-gray-600 mt-1">
                        Tipo: Venta de Productos
                      </div>
                    ) : (
                      barberName && (
                        <div className="text-[10px] sm:text-xs text-gray-600 mt-1">
                          Barbero: {barberName}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Línea separadora */}
              <div className="border-t border-dashed border-gray-400 my-1 sm:my-1.5 print:my-1"></div>

              {/* Resumen de totales */}
              <div className="mb-2 sm:mb-3 print:mb-2 space-y-1">
                <div className="flex justify-between text-xs sm:text-sm print:text-[8pt]">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="text-black">{formatPrice(subtotalWithoutDiscount)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-xs sm:text-sm print:text-[8pt] text-blue-600">
                    <span>Descuento:</span>
                    <span>-{formatPrice(totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm sm:text-base md:text-lg font-bold print:text-sm border-t border-gray-300 pt-1 mt-1">
                  <span className="text-black">TOTAL:</span>
                  <span className="text-black">{formatPrice(finalTotal)}</span>
                </div>
              </div>

              {/* QR Code */}
              <div className="mt-1.5 sm:mt-2 pt-1 sm:pt-1.5 border-t border-gray-300 print:mt-2 print:pt-1">
                <div className="flex flex-col items-center">
                  <p className="text-[7px] sm:text-[8px] md:text-[7pt] text-gray-600 mb-0.5 text-center">
                    Escanea el código QR para verificar
                  </p>
                  <div className="bg-white p-0.5 border border-gray-300 rounded print:p-0">
                    <QRCode
                      value={qrContent}
                      size={50}
                      level="M"
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                      className="print:!w-[60px] print:!h-[60px]"
                    />
                  </div>
                  <p className="text-[7px] sm:text-[8px] md:text-[7pt] text-gray-500 mt-0.5 text-center">
                    ID: {reservation.id}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-1.5 sm:mt-2 pt-1 sm:pt-1.5 border-t border-gray-300 text-center print:mt-2 print:pt-1">
                <p className="text-[7px] sm:text-[8px] md:text-[7pt] text-gray-500">
                  ¡Gracias por su visita!
                </p>
                <p className="text-[7px] sm:text-[8px] md:text-[7pt] text-gray-500 mt-0.5">
                  {new Date().toLocaleDateString("es-ES", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Botones de acción con diseño minimalista - Sin scroll, siempre visible */}
          <div className="border-t border-gray-200 p-3 sm:p-4 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end bg-gray-50 print:hidden flex-shrink-0">
            <button
              onClick={handlePrint}
              className="px-4 sm:px-6 py-2.5 text-sm font-medium bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              Imprimir Factura
            </button>
            <button
              onClick={handleClose}
              className="px-4 sm:px-6 py-2.5 text-sm font-medium border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Estilos para impresión en formato ticket */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 5mm;
          }
          
          body * {
            visibility: hidden;
          }
          
          #invoice-content,
          #invoice-content * {
            visibility: visible;
          }
          
          #invoice-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 70mm;
            max-width: 70mm;
            margin: 0 auto;
            padding: 5mm !important;
            background: white;
            color: black;
            font-size: 10pt;
            line-height: 1.2;
            page-break-inside: avoid;
            page-break-after: avoid;
          }
          
          #invoice-content h1 {
            font-size: 14pt !important;
            margin: 2mm 0 !important;
          }
          
          #invoice-content h3 {
            font-size: 9pt !important;
            margin: 2mm 0 !important;
          }
          
          #invoice-content p,
          #invoice-content span,
          #invoice-content div {
            font-size: 9pt !important;
            margin: 1mm 0 !important;
          }
          
          #invoice-content .text-2xl {
            font-size: 14pt !important;
          }
          
          #invoice-content .text-xl {
            font-size: 12pt !important;
          }
          
          #invoice-content .text-lg {
            font-size: 11pt !important;
          }
          
          #invoice-content .text-sm {
            font-size: 8pt !important;
          }
          
          #invoice-content .text-xs {
            font-size: 7pt !important;
          }
          
          #invoice-content .mb-6,
          #invoice-content .mb-4 {
            margin-bottom: 3mm !important;
          }
          
          #invoice-content .mt-6,
          #invoice-content .mt-4 {
            margin-top: 3mm !important;
          }
          
          #invoice-content .p-6,
          #invoice-content .p-4 {
            padding: 3mm !important;
          }
          
          #invoice-content svg {
            width: 60px !important;
            height: 60px !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          /* Evitar saltos de página */
          * {
            page-break-inside: avoid;
            page-break-after: avoid;
          }
        }
      `}</style>
    </>
  );
}

