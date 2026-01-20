/**
 * @fileoverview Componente para gestionar horarios de trabajo y días cerrados
 * @module components/admin/HoursManager
 */

import { useState, useEffect } from "react";
import { Clock, Calendar, Save, X, Plus, Trash2 } from "lucide-react";
import { apiRequest } from "../../utils/api.js";

const DAYS_OF_WEEK = [
  { id: 0, name: 'Domingo', short: 'Dom' },
  { id: 1, name: 'Lunes', short: 'Lun' },
  { id: 2, name: 'Martes', short: 'Mar' },
  { id: 3, name: 'Miércoles', short: 'Mié' },
  { id: 4, name: 'Jueves', short: 'Jue' },
  { id: 5, name: 'Viernes', short: 'Vie' },
  { id: 6, name: 'Sábado', short: 'Sáb' },
];

export default function HoursManager() {
  const [workingHours, setWorkingHours] = useState({
    0: { open: '09:00', close: '18:00', closed: false },
    1: { open: '09:00', close: '18:00', closed: false },
    2: { open: '09:00', close: '18:00', closed: false },
    3: { open: '09:00', close: '18:00', closed: false },
    4: { open: '09:00', close: '18:00', closed: false },
    5: { open: '09:00', close: '18:00', closed: false },
    6: { open: '09:00', close: '18:00', closed: false },
  });
  const [closedDays, setClosedDays] = useState([]);
  const [newClosedDay, setNewClosedDay] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Cargar horarios guardados
  useEffect(() => {
    loadHours();
  }, []);

  const loadHours = async () => {
    try {
      const data = await apiRequest("/settings/hours");
      if (data.data?.workingHours) {
        // Mergear con valores por defecto para asegurar que todos los días estén presentes
        setWorkingHours({ ...workingHours, ...data.data.workingHours });
      }
      if (data.data?.closedDays) {
        setClosedDays(data.data.closedDays || []);
      }
    } catch (err) {
      console.error("Error al cargar horarios:", err);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      await apiRequest("/settings/hours", {
        method: "PUT",
        body: JSON.stringify({
          workingHours,
          closedDays,
        }),
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al guardar horarios");
    } finally {
      setLoading(false);
    }
  };

  const handleAddClosedDay = () => {
    if (newClosedDay && !closedDays.includes(newClosedDay)) {
      setClosedDays([...closedDays, newClosedDay]);
      setNewClosedDay('');
    }
  };

  const handleRemoveClosedDay = (day) => {
    setClosedDays(closedDays.filter(d => d !== day));
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
          Horarios guardados exitosamente
        </div>
      )}

      {/* Horarios de Trabajo */}
      <div>
        <h4 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-400" />
          Horarios de Trabajo
        </h4>
        <div className="space-y-2">
          {DAYS_OF_WEEK.map(day => (
            <div key={day.id} className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/10">
              <div className="w-20 flex-shrink-0">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!workingHours[day.id].closed}
                    onChange={(e) => {
                      setWorkingHours({
                        ...workingHours,
                        [day.id]: {
                          ...workingHours[day.id],
                          closed: !e.target.checked,
                        },
                      });
                    }}
                    className="w-4 h-4 rounded border-white/20 bg-black/60 text-blue-500"
                  />
                  <span className="text-sm text-white font-medium">{day.short}</span>
                </label>
              </div>
              {!workingHours[day.id].closed && (
                <>
                  <input
                    type="time"
                    value={workingHours[day.id].open}
                    onChange={(e) => {
                      setWorkingHours({
                        ...workingHours,
                        [day.id]: {
                          ...workingHours[day.id],
                          open: e.target.value,
                        },
                      });
                    }}
                    className="flex-1 rounded-lg border border-white/20 bg-black/60 backdrop-blur-[20px] px-3 py-2 text-sm text-white outline-none focus:border-[#007AFF]/50 focus:ring-2 focus:ring-[#007AFF]/15 transition-all"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="time"
                    value={workingHours[day.id].close}
                    onChange={(e) => {
                      setWorkingHours({
                        ...workingHours,
                        [day.id]: {
                          ...workingHours[day.id],
                          close: e.target.value,
                        },
                      });
                    }}
                    className="flex-1 rounded-lg border border-white/20 bg-black/60 backdrop-blur-[20px] px-3 py-2 text-sm text-white outline-none focus:border-[#007AFF]/50 focus:ring-2 focus:ring-[#007AFF]/15 transition-all"
                  />
                </>
              )}
              {workingHours[day.id].closed && (
                <span className="flex-1 text-sm text-gray-400">Cerrado</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Días Cerrados Especiales */}
      <div>
        <h4 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-400" />
          Días Cerrados Especiales
        </h4>
        <div className="flex gap-2 mb-3">
          <input
            type="date"
            value={newClosedDay}
            onChange={(e) => setNewClosedDay(e.target.value)}
            className="flex-1 rounded-lg border border-white/20 bg-black/60 backdrop-blur-[20px] px-3 py-2 text-sm text-white outline-none focus:border-[#007AFF]/50 focus:ring-2 focus:ring-[#007AFF]/15 transition-all"
          />
          <button
            onClick={handleAddClosedDay}
            className="px-4 py-2 rounded-lg text-white font-medium shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all text-sm flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.7) 0%, rgba(59, 130, 246, 0.8) 100%)',
              borderRadius: '16px',
            }}
          >
            <Plus className="h-4 w-4" />
            Agregar
          </button>
        </div>
        {closedDays.length > 0 && (
          <div className="space-y-2">
            {closedDays.map((day, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/10">
                <span className="text-sm text-white">
                  {new Date(day).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <button
                  onClick={() => handleRemoveClosedDay(day)}
                  className="p-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
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
          {loading ? 'Guardando...' : 'Guardar Horarios'}
        </button>
      </div>
    </div>
  );
}
