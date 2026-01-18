import React, { Suspense, lazy, useMemo } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import ProtectedRoute from "./components/admin/ProtectedRoute";
import { useBackgroundImage } from "./hooks/useSettings";
import { API_BASE_URL } from "./config/api.js";
import { CartProvider } from "./contexts/CartContext";
import fondoCita from "./assets/fondo_cita.jpg";

const Inicio = lazy(() => import("./components/home/Inicio"));
const Quienes = lazy(() => import("./components/layout/Quienes"));
const Services = lazy(() => import("./components/services/Services"));
const BarberList = lazy(() => import("./components/barbers/BarberList"));
const AppointmentScheduler = lazy(
  () => import("./components/booking/AppointmentScheduler")
);
const AdminLayout = lazy(
  () => import("./components/admin/AdminLayout")
);
const AdminDashboard = lazy(
  () => import("./components/admin/AdminDashboard")
);
const AdminClients = lazy(
  () => import("./components/admin/AdminClients")
);
const AdminReservations = lazy(
  () => import("./components/admin/AdminReservations")
);
const AdminBarbers = lazy(
  () => import("./components/admin/AdminBarbers")
);
const AdminServices = lazy(
  () => import("./components/admin/AdminServices")
);
const AdminOffers = lazy(
  () => import("./components/admin/AdminOffers")
);
const AdminProducts = lazy(
  () => import("./components/admin/AdminProducts")
);
const AdminSettings = lazy(
  () => import("./components/admin/AdminSettings")
);

function InicioPage() {
  return (
    <div className="pt-2">
      <Inicio />
    </div>
  );
}

function CitasPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 sm:px-6 lg:px-0">
      <section className="pt-4">
        <Services />
      </section>
      <section>
        <BarberList />
      </section>
      <section className="pb-4">
        <AppointmentScheduler />
      </section>
    </div>
  );
}

function AdminPage() {
  return (
    <ProtectedRoute>
      <AdminLayout />
    </ProtectedRoute>
  );
}

function AppContent() {
  const location = useLocation();
  const ADMIN_PATH = import.meta.env.VITE_ADMIN_PATH || "/admin";
  const isAdminRoute = useMemo(() => location.pathname.startsWith(ADMIN_PATH), [location.pathname, ADMIN_PATH]);
  const { backgroundImage } = useBackgroundImage();

  const backgroundUrl = useMemo(() => {
    if (!backgroundImage) return fondoCita;

    return backgroundImage.startsWith('http')
      ? backgroundImage
      : `${API_BASE_URL.replace('/api', '')}${backgroundImage}`;
  }, [backgroundImage]);

  return (
    <CartProvider>
      <div
        className="min-h-screen text-white scroll-smooth bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${backgroundUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="relative min-h-screen bg-black/40">
          {!isAdminRoute && <Navbar />}
          <main className={isAdminRoute ? "" : "pt-20 md:pt-24 pb-12"}>
            <Suspense
              fallback={
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-0">
                  <div className="h-24 animate-pulse rounded-3xl bg-white/5" />
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<InicioPage />} />
                <Route path="/quienes-somos" element={<Quienes />} />
                <Route path="/citas" element={<CitasPage />} />
                <Route path={import.meta.env.VITE_ADMIN_PATH || "/admin"} element={<AdminPage />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="clients" element={<AdminClients />} />
                  <Route path="reservations" element={<AdminReservations />} />
                  <Route path="barbers" element={<AdminBarbers />} />
                  <Route path="services" element={<AdminServices />} />
                  <Route path="offers" element={<AdminOffers />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="settings" element={<AdminSettings />} />
                </Route>
                <Route path="/admin" element={<Navigate to="/" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
          {!isAdminRoute && <Footer />}
        </div>
      </div>
    </CartProvider>
  );
}

export default function App() {
  return <AppContent />;
}
