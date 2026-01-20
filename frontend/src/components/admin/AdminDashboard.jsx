/**
 * @fileoverview Dashboard principal con gráficas y estadísticas
 * @module components/admin/AdminDashboard
 */

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  CalendarDays,
  DollarSign,
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import GlassCard from "../ui/GlassCard";
import { API_BASE_URL } from "../../config/api.js";
import { apiRequest } from "../../utils/api.js";
import logo from "../../assets/logo.png";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [monthlySales, setMonthlySales] = useState([]);
  const [currentLogo, setCurrentLogo] = useState(logo);

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

  useEffect(() => {
    fetchDashboardData();

    // Escuchar eventos de actualización de facturas
    const handleInvoiceUpdate = () => {
      fetchDashboardData();
    };

    // Escuchar evento personalizado cuando se guarda una factura
    window.addEventListener('invoice-saved', handleInvoiceUpdate);

    // Polling: actualizar cada 30 segundos si la ventana está visible
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchDashboardData();
      }
    }, 30000);

    // Actualizar cuando la ventana vuelve a estar visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchDashboardData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('invoice-saved', handleInvoiceUpdate);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener estadísticas del dashboard
      const statsData = await apiRequest("/statistics/dashboard");
      setStats(statsData.data);

      // Obtener ventas mensuales
      try {
        const salesData = await apiRequest("/statistics/monthly-sales");
        setMonthlySales(salesData.data || []);
      } catch (e) {
        console.error("Error loading monthly sales", e);
        setMonthlySales([]);
      }
    } catch (err) {
      console.error(err);
      setError("Error al cargar datos del dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
            <p className="text-gray-400">Cargando estadísticas...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="rounded-2xl bg-gray-500/20 border border-gray-500/50 text-gray-200 px-6 py-4">
          {error}
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // Preparar datos para gráficas
  const statusChartData = stats.statusStats?.map((item) => ({
    name:
      item.status === "confirmada"
        ? "Confirmadas"
        : item.status === "pendiente"
          ? "Pendientes"
          : "Canceladas",
    value: item.total,
    status: item.status,
  })) || [];

  const last31DaysData = stats.last31Days?.map((item) => ({
    date: new Date(item.date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    }),
    Reservas: item.count,
  })) || [];

  const monthlyData = monthlySales.map((item) => ({
    mes: item.monthName,
    Reservas: item.totalReservations,
    Ingresos: item.revenue,
  }));

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-5 md:px-6 lg:px-8 pt-0 sm:pt-1 md:pt-2 lg:pt-3 pb-4 sm:pb-5 md:pb-6 lg:pb-8 space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6">
      {/* Contenedor con fondo oscuro para mejor contraste sobre el fondo */}
      <div className="rounded-2xl sm:rounded-3xl p-2 sm:p-2.5 md:p-3 lg:p-4 xl:p-5 border border-white/10 shadow-2xl space-y-2 sm:space-y-2.5 md:space-y-3 lg:space-y-4"
        style={{
          background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.08) 0%, rgba(0, 122, 255, 0.02) 50%, rgba(0, 0, 0, 0.4) 100%)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        }}
      >
        {/* Header - Mobile: simple, Desktop: con logo */}
        <div className="mb-1.5 sm:mb-2 md:mb-3 lg:mb-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            {/* Mobile: sin logo, solo título */}
            <div className="flex items-center gap-2 sm:gap-3 lg:hidden">
              <BarChart className="h-4 w-4 sm:h-5 sm:w-5 text-white/60 flex-shrink-0" />
              <h1 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
                Dashboard
              </h1>
            </div>
            {/* Desktop: con logo y descripción */}
            <div className="hidden lg:flex flex-col items-center justify-center flex-1">
              <div className="relative mb-3">
                <img
                  src={currentLogo}
                  alt="Logo"
                  className="h-20 w-20 lg:h-24 lg:w-24 object-contain"
                  onError={(e) => {
                    if (e.target.src !== logo) {
                      e.target.onerror = null;
                      e.target.src = logo;
                    }
                  }}
                />
              </div>
              <div className="flex items-center justify-center gap-3 mb-2">
                <BarChart className="h-5 w-5 md:h-6 md:w-6 text-white/60" />
                <h1 className="text-3xl lg:text-4xl font-semibold text-white tracking-tight">
                  Dashboard
                </h1>
              </div>
            </div>
          </div>
          <p className="text-xs sm:text-sm md:text-base text-white/50 font-light lg:text-center">
            Estadísticas y análisis de tu barbería
          </p>
        </div>

        {/* Stats Cards - Mobile: vertical compacto, Desktop: grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
          <GlassCard className="p-3 sm:p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm text-white/50 mb-1 sm:mb-1.5">
                  Reservas Hoy
                </p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white truncate">
                  {stats.todayReservations}
                </p>
              </div>
              <div className="h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-14 lg:w-14 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0 ml-2 sm:ml-3"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.2) 0%, rgba(0, 122, 255, 0.1) 100%)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(0, 122, 255, 0.3)',
                }}
              >
                <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-blue-400" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-3 sm:p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm text-white/50 mb-1 sm:mb-1.5">
                  Este Mes
                </p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white truncate">
                  {stats.monthReservations}
                </p>
              </div>
              <div className="h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-14 lg:w-14 rounded-lg sm:rounded-xl md:rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center flex-shrink-0 ml-2 sm:ml-3">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-blue-400" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-3 sm:p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm text-white/50 mb-1 sm:mb-1.5">
                  Ingresos del Mes
                </p>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white truncate">
                  ${stats.monthRevenue.toFixed(2)}
                </p>
              </div>
              <div className="h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-14 lg:w-14 rounded-lg sm:rounded-xl md:rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center flex-shrink-0 ml-2 sm:ml-3">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-blue-400" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-3 sm:p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm text-white/50 mb-1 sm:mb-1.5">
                  Total Reservas
                </p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white truncate">
                  {stats.totalReservations}
                </p>
              </div>
              <div className="h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-14 lg:w-14 rounded-lg sm:rounded-xl md:rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center flex-shrink-0 ml-2 sm:ml-3">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-blue-400" />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
          {/* Ventas Mensuales */}
          <GlassCard className="p-3 sm:p-4 md:p-5 lg:p-6">
            <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-white mb-3 sm:mb-4 md:mb-5 lg:mb-6">
              Ventas por Mes
            </h3>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250} className="sm:h-[280px] md:h-[300px]">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="mes"
                    stroke="rgba(255,255,255,0.5)"
                    style={{ fontSize: "10px" }}
                    className="sm:text-xs md:text-sm"
                  />
                  <YAxis stroke="rgba(255,255,255,0.5)" style={{ fontSize: "10px" }} className="sm:text-xs md:text-sm" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.85)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: "8px",
                    }}
                    labelStyle={{
                      color: "rgba(255,255,255,0.95)",
                      fontWeight: "600",
                      marginBottom: "4px",
                    }}
                    itemStyle={{
                      color: "rgba(255,255,255,0.9)",
                    }}
                    cursor={{ fill: "rgba(255,255,255,0.1)" }}
                    formatter={(value, name) => [value, name]}
                  />
                  <Legend wrapperStyle={{ color: "rgba(255,255,255,0.9)", fontSize: "12px" }} />
                  <Bar dataKey="Ingresos" fill="#007AFF" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] sm:h-[280px] md:h-[300px] text-white/50 text-sm sm:text-base">
                No hay datos disponibles
              </div>
            )}
          </GlassCard>

          {/* Reservas por Estado */}
          <GlassCard className="p-3 sm:p-4 md:p-5 lg:p-6">
            <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-white mb-3 sm:mb-4 md:mb-5 lg:mb-6">
              Reservas por Estado
            </h3>
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250} className="sm:h-[280px] md:h-[300px]">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={80}
                    className="sm:outerRadius-90 md:outerRadius-100"
                    fill="#007AFF"
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.status === "confirmada"
                            ? "#007AFF"
                            : entry.status === "pendiente"
                              ? "#FFC107"
                              : "#EF4444"
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.85)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: "8px",
                    }}
                    labelStyle={{
                      color: "rgba(255,255,255,0.95)",
                      fontWeight: "600",
                      marginBottom: "4px",
                    }}
                    itemStyle={{
                      color: "rgba(255,255,255,0.9)",
                    }}
                    formatter={(value, name) => [value, name]}
                  />
                  <Legend
                    wrapperStyle={{
                      color: "rgba(255,255,255,0.9)",
                      paddingTop: "20px",
                      fontSize: "12px",
                    }}
                    iconType="circle"
                    formatter={(value) => {
                      const entry = statusChartData.find((d) => d.name === value);
                      const total = statusChartData.reduce(
                        (sum, d) => sum + d.value,
                        0
                      );
                      const percent = entry
                        ? ((entry.value / total) * 100).toFixed(0)
                        : "0";
                      return `${value} ${percent}%`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] sm:h-[280px] md:h-[300px] text-white/50 text-sm sm:text-base">
                No hay datos disponibles
              </div>
            )}
          </GlassCard>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
          {/* Últimos 31 Días */}
          <GlassCard className="p-3 sm:p-4 md:p-5 lg:p-6">
            <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-white mb-3 sm:mb-4 md:mb-5 lg:mb-6">
              Últimos 31 Días
            </h3>
            {last31DaysData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250} className="sm:h-[280px] md:h-[300px]">
                <LineChart data={last31DaysData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="date"
                    stroke="rgba(255,255,255,0.5)"
                    style={{ fontSize: "10px" }}
                    className="sm:text-xs md:text-sm"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="rgba(255,255,255,0.5)" style={{ fontSize: "10px" }} className="sm:text-xs md:text-sm" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.8)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Legend wrapperStyle={{ color: "#fff", fontSize: "12px" }} />
                  <Line
                    type="monotone"
                    dataKey="Reservas"
                    stroke="#007AFF"
                    strokeWidth={2}
                    dot={{ fill: "#007AFF", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] sm:h-[280px] md:h-[300px] text-white/50 text-sm sm:text-base">
                No hay datos disponibles
              </div>
            )}
          </GlassCard>

          {/* Top Servicios */}
          <GlassCard className="p-3 sm:p-4 md:p-5 lg:p-6">
            <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-white mb-3 sm:mb-4 md:mb-5 lg:mb-6">
              Top Servicios del Mes
            </h3>
            {stats.topServices && stats.topServices.length > 0 ? (
              <div className="space-y-2 sm:space-y-2.5 md:space-y-3 lg:space-y-4">
                {stats.topServices.map((service, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2.5 sm:p-3 md:p-4 rounded-xl bg-gray-900/95 backdrop-blur-md border border-white/20"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
                      <div className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm md:text-base flex-shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)',
                        }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm md:text-base font-medium text-white truncate">
                          {service.serviceName}
                        </p>
                        <p className="text-[10px] sm:text-xs md:text-sm text-white/50">
                          {service.count} reservas
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-xs sm:text-sm md:text-base font-semibold text-blue-300 whitespace-nowrap">
                        ${service.revenue.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[250px] sm:h-[280px] md:h-[300px] text-white/50 text-sm sm:text-base">
                No hay servicios este mes
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

