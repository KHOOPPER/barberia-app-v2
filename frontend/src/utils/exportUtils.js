/**
 * @fileoverview Utilidades para exportar datos a Excel/PDF
 * @module utils/exportUtils
 */

/**
 * Exporta datos a CSV (compatible con Excel)
 */
export const exportToCSV = (data, filename = 'export.csv') => {
  if (!data || data.length === 0) {
    alert('No hay datos para exportar');
    return;
  }

  // Convertir objetos a filas CSV
  const headers = Object.keys(data[0]);
  const csvRows = [];

  // Headers
  csvRows.push(headers.join(','));

  // Data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Escapar comillas y envolver en comillas si contiene comas
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    });
    csvRows.push(values.join(','));
  }

  // Crear y descargar archivo
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Formatea una fecha para CSV
 */
const formatDateForCSV = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      const parts = dateString.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateString;
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    return dateString.split('T')[0].split('-').reverse().join('/');
  }
};

/**
 * Calcula el total de una reserva desde sus items
 */
const calculateReservationTotal = async (reservation, apiBaseUrl) => {
  try {
    const res = await fetch(`${apiBaseUrl}/reservations/${reservation.id}/items`, {
      credentials: "include", // Incluir cookies httpOnly
    });

    if (res.ok) {
      const response = await res.json();
      const items = response.data || [];
      
      if (items.length > 0) {
        // Calcular subtotal sin descuentos
        const subtotal = items.reduce((sum, item) => {
          const unitPrice = parseFloat(item.unit_price) || 0;
          const quantity = parseInt(item.quantity) || 1;
          return sum + (unitPrice * quantity);
        }, 0);
        
        // Calcular descuento total
        const totalDiscount = items.reduce((sum, item) => {
          return sum + (parseFloat(item.discount_amount) || 0);
        }, 0);
        
        // Total final
        return Math.max(0, subtotal - totalDiscount);
      }
    }
    
    // Si no hay items o falla, usar precio del servicio original
    return parseFloat(reservation.service_price || reservation.final_price || 0);
  } catch (error) {
    console.error(`Error al calcular total para reserva ${reservation.id}:`, error);
    // Fallback al precio del servicio
    return parseFloat(reservation.service_price || reservation.final_price || 0);
  }
};

/**
 * Exporta reservas a CSV/Excel con cálculo correcto de totales
 */
export const exportReservations = async (reservations, apiBaseUrl, monthFilter = null, filename = null) => {
  // Filtrar por mes si se especifica
  let reservationsToExport = reservations;
  if (monthFilter) {
    const [year, month] = monthFilter.split('-');
    reservationsToExport = reservations.filter(reservation => {
      try {
        const date = new Date(reservation.date);
        if (isNaN(date.getTime())) {
          const dateStr = reservation.date.split('T')[0];
          const parts = dateStr.split('-');
          if (parts.length === 3) {
            return parts[0] === year && parts[1] === month;
          }
          return false;
        }
        return date.getFullYear() === parseInt(year) && 
               (date.getMonth() + 1) === parseInt(month);
      } catch {
        return false;
      }
    });
  }

  // Calcular totales para todas las reservas
  const reservationsWithTotals = await Promise.all(
    reservationsToExport.map(async (reservation) => {
      const total = await calculateReservationTotal(reservation, apiBaseUrl);
      return { ...reservation, calculatedTotal: total };
    })
  );

  const statusLabels = {
    pendiente: 'Pendiente',
    confirmada: 'Confirmada',
    cancelada: 'Cancelada',
  };

  const data = reservationsWithTotals.map(reservation => ({
    'ID': reservation.id || '',
    'Fecha': formatDateForCSV(reservation.date),
    'Hora': reservation.time || '',
    'Cliente': reservation.customer_name || '',
    'Teléfono': reservation.customer_phone || '',
    'Barbero': reservation.barber_name || 'N/A',
    'Servicio': reservation.service_name || '',
    'Estado': statusLabels[reservation.status] || reservation.status || '',
    'Total': reservation.calculatedTotal.toFixed(2),
  }));

  if (!filename) {
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    if (monthFilter) {
      const [year, month] = monthFilter.split('-');
      filename = `reservas_${monthNames[parseInt(month) - 1]}_${year}.csv`;
    } else {
      filename = `reservas_${new Date().toISOString().split('T')[0]}.csv`;
    }
  }

  exportToCSV(data, filename);
};

/**
 * Exporta clientes a CSV/Excel
 */
export const exportClients = (clients, filename = `clientes_${new Date().toISOString().split('T')[0]}.csv`) => {
  // Agrupar por cliente para obtener estadísticas
  const clientMap = new Map();
  
  clients.forEach(client => {
    const key = client.customer_phone || client.customer_name;
    if (!clientMap.has(key)) {
      clientMap.set(key, {
        'Nombre': client.customer_name || '',
        'Teléfono': client.customer_phone || '',
        'Total Reservas': 0,
        'Total Gastado': 0,
        'Última Reserva': client.date || '',
        'Servicios': new Set(),
      });
    }
    
    const clientData = clientMap.get(key);
    clientData['Total Reservas']++;
    clientData['Total Gastado'] += parseFloat(client.total || client.price || 0);
    if (client.service_name) {
      clientData['Servicios'].add(client.service_name);
    }
    
    // Actualizar última reserva si es más reciente
    if (client.date && (!clientData['Última Reserva'] || client.date > clientData['Última Reserva'])) {
      clientData['Última Reserva'] = client.date;
    }
  });

  const data = Array.from(clientMap.values()).map(client => ({
    'Nombre': client['Nombre'],
    'Teléfono': client['Teléfono'],
    'Total Reservas': client['Total Reservas'],
    'Total Gastado': `$${client['Total Gastado'].toFixed(2)}`,
    'Última Reserva': client['Última Reserva'],
    'Servicios': Array.from(client['Servicios']).join(', '),
  }));

  exportToCSV(data, filename);
};

/**
 * Exporta estadísticas del dashboard a CSV
 */
export const exportDashboardStats = (stats, monthlySales, filename = `dashboard_${new Date().toISOString().split('T')[0]}.csv`) => {
  const data = [
    { 'Métrica': 'Reservas Hoy', 'Valor': stats.todayReservations || 0 },
    { 'Métrica': 'Reservas Este Mes', 'Valor': stats.monthReservations || 0 },
    { 'Métrica': 'Ingresos del Mes', 'Valor': `$${stats.monthRevenue?.toFixed(2) || '0.00'}` },
    { 'Métrica': 'Total Reservas', 'Valor': stats.totalReservations || 0 },
    { 'Métrica': '', 'Valor': '' },
    { 'Métrica': 'MES', 'Valor': 'RESERVAS / INGRESOS' },
  ];

  if (monthlySales && monthlySales.length > 0) {
    monthlySales.forEach(sale => {
      data.push({
        'Métrica': sale.monthName || '',
        'Valor': `${sale.totalReservations || 0} / $${sale.revenue?.toFixed(2) || '0.00'}`,
      });
    });
  }

  exportToCSV(data, filename);
};

/**
 * Genera un PDF simple usando la API de impresión del navegador
 */
/**
 * Sanitiza contenido HTML para prevenir XSS
 * Escapa todos los caracteres HTML especiales
 */
const sanitizeHTML = (str) => {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

/**
 * Escapa caracteres especiales para uso en atributos HTML
 */
const escapeAttribute = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

export const exportToPDF = (content, filename = 'export.pdf') => {
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    alert('No se pudo abrir la ventana de impresión. Por favor, permite ventanas emergentes.');
    return;
  }
  
  // Sanitizar filename y content para prevenir XSS
  const safeFilename = escapeAttribute(filename);
  const safeContent = typeof content === 'string' ? sanitizeHTML(content) : content;
  
  // Usar métodos seguros en lugar de document.write
  printWindow.document.open();
  printWindow.document.write('<!DOCTYPE html>');
  printWindow.document.write('<html>');
  printWindow.document.write('<head>');
  printWindow.document.write(`<title>${safeFilename}</title>`);
  printWindow.document.write('<style>');
  printWindow.document.write(`
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      color: #333;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    @media print {
      @page {
        margin: 1cm;
      }
    }
  `);
  printWindow.document.write('</style>');
  printWindow.document.write('</head>');
  printWindow.document.write('<body>');
  
  // Insertar contenido de forma segura
  const bodyElement = printWindow.document.body;
  if (typeof safeContent === 'string') {
    bodyElement.innerHTML = safeContent;
  } else {
    bodyElement.appendChild(safeContent);
  }
  
  // Agregar script de impresión de forma segura
  const script = printWindow.document.createElement('script');
  script.textContent = `
    window.onload = function() {
      window.print();
      window.onafterprint = function() {
        window.close();
      };
    };
  `;
  bodyElement.appendChild(script);
  
  printWindow.document.close();
};

/**
 * Formatea una fecha a formato legible DD/MM/YYYY
 */
const formatDateForExport = (dateString) => {
  if (!dateString) return '';
  
  try {
    // Si ya está en formato ISO, parsearlo
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // Si no es válido, intentar parsear como YYYY-MM-DD
      const parts = dateString.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateString;
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    // Si falla, devolver la fecha original pero limpiada
    return dateString.split('T')[0].split('-').reverse().join('/');
  }
};

/**
 * Exporta reservas a PDF con cálculo correcto de totales
 */
export const exportReservationsToPDF = async (reservations, apiBaseUrl, monthFilter = null) => {
  // Filtrar por mes si se especifica
  let reservationsToExport = reservations;
  if (monthFilter) {
    const [year, month] = monthFilter.split('-');
    reservationsToExport = reservations.filter(reservation => {
      try {
        const date = new Date(reservation.date);
        if (isNaN(date.getTime())) {
          // Intentar parsear como YYYY-MM-DD
          const dateStr = reservation.date.split('T')[0];
          const parts = dateStr.split('-');
          if (parts.length === 3) {
            return parts[0] === year && parts[1] === month;
          }
          return false;
        }
        return date.getFullYear() === parseInt(year) && 
               (date.getMonth() + 1) === parseInt(month);
      } catch {
        return false;
      }
    });
  }

  // Calcular totales para todas las reservas
  const reservationsWithTotals = await Promise.all(
    reservationsToExport.map(async (reservation) => {
      const total = await calculateReservationTotal(reservation, apiBaseUrl);
      return { ...reservation, calculatedTotal: total };
    })
  );

  const tableRows = reservationsWithTotals.map(reservation => {
    const formattedDate = formatDateForExport(reservation.date);
    const status = reservation.status === 'pendiente' ? 'Pendiente' : 
                   reservation.status === 'confirmada' ? 'Confirmada' : 
                   reservation.status === 'cancelada' ? 'Cancelada' : reservation.status;
    
    // Sanitizar todos los valores antes de insertarlos en HTML
    const safeId = sanitizeHTML(String(reservation.id || ''));
    const safeDate = sanitizeHTML(formattedDate);
    const safeTime = sanitizeHTML(String(reservation.time || ''));
    const safeCustomerName = sanitizeHTML(String(reservation.customer_name || ''));
    const safeCustomerPhone = sanitizeHTML(String(reservation.customer_phone || ''));
    const safeBarberName = sanitizeHTML(String(reservation.barber_name || 'N/A'));
    const safeServiceName = sanitizeHTML(String(reservation.service_name || ''));
    const safeStatus = sanitizeHTML(status);
    const safeTotal = reservation.calculatedTotal.toFixed(2);
    
    return `
      <tr>
        <td>${safeId}</td>
        <td>${safeDate}</td>
        <td>${safeTime}</td>
        <td>${safeCustomerName}</td>
        <td>${safeCustomerPhone}</td>
        <td>${safeBarberName}</td>
        <td>${safeServiceName}</td>
        <td>${safeStatus}</td>
        <td>$${safeTotal}</td>
      </tr>
    `;
  }).join('');

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  let title = 'Reporte de Reservas';
  let filename = `reservas_${new Date().toISOString().split('T')[0]}.pdf`;
  
  if (monthFilter) {
    const [year, month] = monthFilter.split('-');
    const monthName = monthNames[parseInt(month) - 1];
    title = `Reporte de Reservas - ${monthName} ${year}`;
    filename = `reservas_${year}-${month}.pdf`;
  }

  // Sanitizar título y fecha de exportación
  const safeTitle = sanitizeHTML(title);
  const exportDate = new Date().toLocaleDateString('es-ES', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const safeExportDate = sanitizeHTML(exportDate);
  const safeTotalReservations = sanitizeHTML(String(reservationsWithTotals.length));

  const content = `
    <h1>${safeTitle}</h1>
    <p>Fecha de exportación: ${safeExportDate}</p>
    <p>Total de reservas: ${safeTotalReservations}</p>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Fecha</th>
          <th>Hora</th>
          <th>Cliente</th>
          <th>Teléfono</th>
          <th>Barbero</th>
          <th>Servicio</th>
          <th>Estado</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;

  exportToPDF(content, filename);
};
