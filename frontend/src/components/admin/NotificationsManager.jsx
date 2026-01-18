/**
 * @fileoverview Componente para gestionar notificaciones automáticas
 * @module components/admin/NotificationsManager
 */

import { useState, useEffect } from "react";
import { Bell, Save, Mail, MessageSquare, Clock } from "lucide-react";
import { API_BASE_URL } from "../../config/api.js";

export default function NotificationsManager() {
  const [settings, setSettings] = useState({
    emailEnabled: false,
    smsEnabled: false,
    reminderHours: 24,
    reminderEnabled: true,
    confirmationEnabled: true,
    cancellationEnabled: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings/notifications`, {
        credentials: "include", // Incluir cookies httpOnly
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          setSettings({ ...settings, ...data.data });
        }
      }
    } catch (err) {
      console.error("Error al cargar configuración:", err);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const res = await fetch(`${API_BASE_URL}/settings/notifications`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Incluir cookies httpOnly
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        throw new Error("Error al guardar configuración");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al guardar configuración");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-500/20 border border-green-500/40 text-green-300 rounded-xl text-sm">
          Configuración guardada exitosamente
        </div>
      )}

      {/* Recordatorios Automáticos */}
      <div>
        <h4 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-400" />
          Recordatorios Automáticos
        </h4>
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/10 cursor-pointer hover:bg-black/40 transition">
            <input
              type="checkbox"
              checked={settings.reminderEnabled}
              onChange={(e) => setSettings({ ...settings, reminderEnabled: e.target.checked })}
              className="w-5 h-5 rounded border-white/20 bg-black/60 text-blue-500 focus:ring-2 focus:ring-[#007AFF]/15"
            />
            <div className="flex-1">
              <span className="text-sm text-white font-medium">Activar Recordatorios</span>
              <p className="text-xs text-gray-400 mt-0.5">Enviar recordatorios automáticos antes de las citas</p>
            </div>
          </label>

          {settings.reminderEnabled && (
            <div className="ml-8 p-3 rounded-xl bg-black/20 border border-white/5">
              <label className="block text-xs font-medium text-gray-300 mb-2">
                Horas antes de la cita
              </label>
              <input
                type="number"
                min="1"
                max="168"
                value={settings.reminderHours}
                onChange={(e) => setSettings({ ...settings, reminderHours: parseInt(e.target.value) || 24 })}
                className="w-full rounded-lg border border-white/20 bg-black/60 backdrop-blur-[20px] px-3 py-2 text-sm text-white outline-none focus:border-[#007AFF]/50 focus:ring-2 focus:ring-[#007AFF]/15 transition-all"
              />
              <p className="text-xs text-gray-400 mt-1">
                Se enviará un recordatorio {settings.reminderHours} hora(s) antes de cada cita
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Canales de Notificación */}
      <div>
        <h4 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-400" />
          Canales de Notificación
        </h4>
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/10 cursor-pointer hover:bg-black/40 transition">
            <input
              type="checkbox"
              checked={settings.emailEnabled}
              onChange={(e) => setSettings({ ...settings, emailEnabled: e.target.checked })}
              className="w-5 h-5 rounded border-white/20 bg-black/60 text-blue-500 focus:ring-2 focus:ring-[#007AFF]/15"
            />
            <Mail className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <span className="text-sm text-white font-medium">Email</span>
              <p className="text-xs text-gray-400 mt-0.5">Enviar notificaciones por correo electrónico</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/10 cursor-pointer hover:bg-black/40 transition">
            <input
              type="checkbox"
              checked={settings.smsEnabled}
              onChange={(e) => setSettings({ ...settings, smsEnabled: e.target.checked })}
              className="w-5 h-5 rounded border-white/20 bg-black/60 text-blue-500 focus:ring-2 focus:ring-[#007AFF]/15"
            />
            <MessageSquare className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <span className="text-sm text-white font-medium">SMS</span>
              <p className="text-xs text-gray-400 mt-0.5">Enviar notificaciones por mensaje de texto</p>
            </div>
          </label>
        </div>
      </div>

      {/* Tipos de Notificaciones */}
      <div>
        <h4 className="text-base font-semibold text-white mb-3">Tipos de Notificaciones</h4>
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/10 cursor-pointer hover:bg-black/40 transition">
            <input
              type="checkbox"
              checked={settings.confirmationEnabled}
              onChange={(e) => setSettings({ ...settings, confirmationEnabled: e.target.checked })}
              className="w-5 h-5 rounded border-white/20 bg-black/60 text-blue-500 focus:ring-2 focus:ring-[#007AFF]/15"
            />
            <div className="flex-1">
              <span className="text-sm text-white font-medium">Confirmación de Reserva</span>
              <p className="text-xs text-gray-400 mt-0.5">Notificar cuando se confirma una reserva</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/10 cursor-pointer hover:bg-black/40 transition">
            <input
              type="checkbox"
              checked={settings.cancellationEnabled}
              onChange={(e) => setSettings({ ...settings, cancellationEnabled: e.target.checked })}
              className="w-5 h-5 rounded border-white/20 bg-black/60 text-blue-500 focus:ring-2 focus:ring-[#007AFF]/15"
            />
            <div className="flex-1">
              <span className="text-sm text-white font-medium">Cancelación de Reserva</span>
              <p className="text-xs text-gray-400 mt-0.5">Notificar cuando se cancela una reserva</p>
            </div>
          </label>
        </div>
      </div>

      {/* Botón Guardar */}
      <div className="flex justify-end pt-4 border-t border-white/10">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2.5 rounded-lg text-white font-semibold shadow-lg shadow-blue-400/20 hover:shadow-xl hover:shadow-blue-400/30 transition-all active:scale-95 text-sm flex items-center gap-2 disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.7) 0%, rgba(59, 130, 246, 0.8) 100%)',
            borderRadius: '16px',
          }}
        >
          <Save className="h-4 w-4" />
          {loading ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </div>
    </div>
  );
}
