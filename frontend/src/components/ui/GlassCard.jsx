/**
 * GlassCard - Componente ORIGINAL del Dashboard
 * Ahora con soporte para Brave/Edge
 */

export default function GlassCard({ children, className = "", ...props }) {
  return (
    <div
      className={`
        glass-card-base
        border border-white/10 
        rounded-2xl sm:rounded-3xl
        shadow-2xl shadow-black/20
        transition-all duration-300 ease-out
        ${className}
      `}
      style={{
        background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.12) 0%, rgba(0, 122, 255, 0.05) 50%, rgba(0, 0, 0, 0.7) 100%)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
      }}
      {...props}
    >
      {children}
    </div>
  );
}
