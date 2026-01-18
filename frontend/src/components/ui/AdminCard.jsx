/**
 * AdminCard - Componente para secciones Admin
 * Hereda diseño del Dashboard pero con paleta gris
 */

export default function AdminCard({ children, className = "" }) {
  return (
    <div className={`admin-card-base admin-card ${className}`}>
      {children}
    </div>
  );
}

