import { useState, useCallback } from 'react';
import { Video, Upload, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { API_BASE_URL } from '../../config/api';
import { getYouTubeEmbedUrl, getGoogleDriveEmbedUrl, validateVideoFile } from '../../utils/videoHelpers';

export default function VideoConfigCard({ videoType, videoUrl, onUpdate }) {
    const [showModal, setShowModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState('');

    const handleFileUpload = useCallback(async () => {
        if (!selectedFile) {
            setError('Selecciona un archivo');
            return;
        }

        try {
            validateVideoFile(selectedFile);
            setUpdating(true);
            setError('');
            setUploadProgress(10); // Simular inicio

            const formData = new FormData();
            formData.append('video', selectedFile);

            // Usar fetch en lugar de XHR para mejor manejo de credenciales
            const res = await fetch(`${API_BASE_URL}/settings/homepage-video-upload`, {
                method: 'POST',
                body: formData,
                credentials: 'include', // Importante para enviar cookies de sesión
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error?.message || `Error ${res.status}`);
            }

            setUploadProgress(100);

            // El endpoint de upload ya actualiza el tipo a 'upload' y guarda el archivo.
            // No es necesario llamar a updateHomepageVideoConfig nuevamente.

            setShowModal(false);
            localStorage.setItem('settings_success_message', 'Video subido correctamente');
            window.location.reload();
        } catch (err) {
            setError(err.message);
            setUploadProgress(0);
        } finally {
            setUpdating(false);
        }
    }, [selectedFile]);

    return (
        <>
            <div className="p-4 sm:p-5 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                            background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.2) 0%, rgba(156, 163, 175, 0.1) 100%)',
                            border: '1px solid rgba(156, 163, 175, 0.3)',
                        }}
                    >
                        <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs uppercase tracking-wider text-white/50 mb-1">
                            Página Principal
                        </p>
                        <h3 className="text-base sm:text-lg font-semibold text-white leading-tight">
                            Video de Fondo
                        </h3>
                    </div>
                </div>

                <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-xs text-white/50 mb-1">Estado:</p>
                    <p className="text-sm text-white font-medium flex items-center gap-2">
                        {videoType === 'upload' ? (
                            <><span className="w-2 h-2 rounded-full bg-green-500"></span> Video cargado</>
                        ) : (
                            <><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Sin video personalizado</>
                        )}
                    </p>
                </div>

                <button
                    onClick={() => setShowModal(true)}
                    className="w-full px-4 py-2.5 rounded-lg font-medium text-white shadow-lg shadow-slate-500/20 hover:shadow-xl transition-all border border-slate-600/30 flex items-center justify-center gap-2"
                    style={{
                        background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 1) 100%)',
                    }}
                >
                    <Upload className="w-4 h-4" />
                    Subir Video Nuevo
                </button>
            </div>

            {/* Modal */}
            {showModal && typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-white">Subir Video de Fondo</h3>
                                <button onClick={() => setShowModal(false)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>

                            <div className="p-4 sm:p-5 space-y-4">
                                {error && (
                                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                        <p className="text-sm text-red-400">{error}</p>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <div className="p-8 border-2 border-dashed border-white/20 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex flex-col items-center justify-center text-center cursor-pointer relative">
                                        <input
                                            type="file"
                                            accept="video/mp4,video/webm,video/quicktime"
                                            onChange={(e) => setSelectedFile(e.target.files[0])}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <Upload className={`w-10 h-10 mb-3 ${selectedFile ? 'text-blue-400' : 'text-white/40'}`} />

                                        {selectedFile ? (
                                            <div>
                                                <p className="text-white font-medium break-all">{selectedFile.name}</p>
                                                <p className="text-white/50 text-xs mt-1">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-white font-medium">Click para seleccionar video</p>
                                                <p className="text-white/50 text-xs mt-1">MP4, WebM o MOV (Máx 50MB)</p>
                                            </div>
                                        )}
                                    </div>

                                    {uploadProgress > 0 && (
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs text-white/70">
                                                <span>Subiendo...</span>
                                                <span>{uploadProgress}%</span>
                                            </div>
                                            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${uploadProgress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleFileUpload}
                                        disabled={!selectedFile || updating}
                                        className="w-full px-4 py-3 rounded-lg font-bold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                                        style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}
                                    >
                                        {updating ? 'Procesando...' : 'Confirmar y Subir'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
