import { useState, useCallback, useEffect } from 'react';
import { Image as ImageIcon, Upload, X, Trash2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { API_BASE_URL } from '../../config/api';
import { apiRequest } from '../../utils/api';

export default function VideoConfigCard({ videoType, videoUrl, heroImages = [], onUpdate }) {
    const [showModal, setShowModal] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState('');

    // Initialize previews with existing images if available
    useEffect(() => {
        if (heroImages && heroImages.length > 0) {
            // Only set if we are not currently selecting new files
            if (selectedFiles.length === 0) {
                // We don't set previews here because previews are for *new* files usually, 
                // but we can show existing images in the main card.
            }
        }
    }, [heroImages, selectedFiles.length]);

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 3) {
            setError('Máximo 3 imágenes');
            return;
        }

        setSelectedFiles(files);
        setError('');

        // Generate previews
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setPreviews(newPreviews);
    };

    const handleFileUpload = useCallback(async () => {
        if (selectedFiles.length === 0) {
            setError('Selecciona al menos una imagen');
            return;
        }

        try {
            setUpdating(true);
            setError('');
            setUploadProgress(10);

            const formData = new FormData();
            selectedFiles.forEach(file => {
                formData.append('images', file);
            });

            await apiRequest('/settings/homepage-hero-images', {
                method: 'POST',
                body: formData,
            });

            setUploadProgress(100);

            // Close modal and reload
            setShowModal(false);
            localStorage.setItem('settings_success_message', 'Imágenes del hero actualizadas correctamente');
            window.location.reload();

        } catch (err) {
            setError(err.message);
            setUploadProgress(0);
        } finally {
            setUpdating(false);
        }
    }, [selectedFiles]);

    const removeFile = (index) => {
        const newFiles = [...selectedFiles];
        newFiles.splice(index, 1);
        setSelectedFiles(newFiles);

        const newPreviews = [...previews];
        URL.revokeObjectURL(newPreviews[index]);
        newPreviews.splice(index, 1);
        setPreviews(newPreviews);
    };

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
                        <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs uppercase tracking-wider text-white/50 mb-1">
                            Página Principal
                        </p>
                        <h3 className="text-base sm:text-lg font-semibold text-white leading-tight">
                            Imágenes del Hero
                        </h3>
                    </div>
                </div>

                <div className="mb-4">
                    {heroImages && heroImages.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                            {heroImages.map((img, idx) => (
                                <div key={idx} className="aspect-video rounded-lg overflow-hidden bg-white/5 border border-white/10 relative group">
                                    <img
                                        src={img.startsWith('http') ? img : `${API_BASE_URL.replace(/\/api$/, '')}${img}`}
                                        alt={`Hero ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-1 right-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white">
                                        {idx + 1}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                            <p className="text-xs text-white/50 mb-1">Estado:</p>
                            <p className="text-sm text-white font-medium flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-yellow-500"></span> Sin imágenes personalizadas
                            </p>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => setShowModal(true)}
                    className="w-full px-4 py-2.5 rounded-lg font-medium text-white shadow-lg shadow-slate-500/20 hover:shadow-xl transition-all border border-slate-600/30 flex items-center justify-center gap-2"
                    style={{
                        background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 1) 100%)',
                    }}
                >
                    <Upload className="w-4 h-4" />
                    {heroImages.length > 0 ? 'Cambiar Imágenes' : 'Subir Imágenes'}
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
                                <h3 className="text-lg font-semibold text-white">Subir Imágenes del Hero</h3>
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
                                    {/* Area de carga / Previews */}
                                    <div className="min-h-[160px] p-4 border-2 border-dashed border-white/20 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex flex-col items-center justify-center text-center cursor-pointer relative overflow-hidden">

                                        {selectedFiles.length > 0 ? (
                                            <div className="w-full grid grid-cols-3 gap-2 relative z-10">
                                                {previews.map((preview, idx) => (
                                                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group">
                                                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                                                            className="absolute top-1 right-1 bg-red-500/80 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {selectedFiles.length < 3 && (
                                                    <div className="aspect-square rounded-lg border border-white/20 flex items-center justify-center">
                                                        <Plus className="w-6 h-6 text-white/30" />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="w-10 h-10 mb-3 text-white/40" />
                                                <div>
                                                    <p className="text-white font-medium">Click para seleccionar</p>
                                                    <p className="text-white/50 text-xs mt-1">Máximo 3 imágenes</p>
                                                </div>
                                            </>
                                        )}

                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={handleFileSelect}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                        />
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
                                        disabled={selectedFiles.length === 0 || updating}
                                        className="w-full px-4 py-3 rounded-lg font-bold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                                        style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}
                                    >
                                        {updating ? 'Procesando...' : 'Confirmar y Actualizar'}
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
