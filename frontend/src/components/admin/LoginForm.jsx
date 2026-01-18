/**
 * @fileoverview Componente de login para el panel administrativo
 * @module components/admin/LoginForm
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../utils/api.js";
import GlassCard from "../ui/GlassCard";
import { getAdminBasePath } from "../../config/adminPath.js";

/**
 * Formulario de login para administradores
 */
export default function LoginForm({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await login(username, password);

      if (response.success) {
        // Disparar evento personalizado para actualizar el estado de autenticación
        window.dispatchEvent(new Event("storage"));
        
        if (onLoginSuccess) {
          onLoginSuccess(response.data);
        }
        // Solo navegar si estamos usando navigate (no cuando estamos en ProtectedRoute)
        if (navigate) {
          navigate(getAdminBasePath());
        }
      } else {
        setError("Credenciales inválidas");
      }
    } catch (err) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <GlassCard className="p-6 sm:p-8 md:p-10">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white mb-2 tracking-tight">
            Panel Administrativo
          </h2>
          <p className="text-sm sm:text-base text-white/60">
            Inicia sesión para continuar
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
          {error && (
            <div className="bg-gray-500/20 backdrop-blur-xl border border-gray-500/40 text-gray-200 px-4 py-3 rounded-xl text-sm sm:text-base transition-all duration-200">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-white/90 mb-2 text-sm sm:text-base font-medium">
              Usuario
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-3 sm:py-3.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all duration-200 text-sm sm:text-base"
              placeholder="Ingresa tu usuario"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-white/90 mb-2 text-sm sm:text-base font-medium">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 sm:py-3.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all duration-200 text-sm sm:text-base"
              placeholder="Ingresa tu contraseña"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500/90 to-blue-600/90 hover:from-blue-500 hover:to-blue-600 text-white font-semibold py-3 sm:py-3.5 md:py-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-lg shadow-blue-500/20 text-sm sm:text-base"
            style={{
              background: loading 
                ? 'linear-gradient(135deg, rgba(0, 122, 255, 0.5) 0%, rgba(0, 122, 255, 0.5) 100%)'
                : 'linear-gradient(135deg, rgba(0, 122, 255, 0.9) 0%, rgba(0, 122, 255, 1) 100%)',
            }}
          >
            {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </button>
        </form>
      </GlassCard>
    </div>
  );
}


