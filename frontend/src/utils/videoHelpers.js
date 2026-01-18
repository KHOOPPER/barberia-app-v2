/**
 * Helper functions for video configuration
 */

/**
 * Convierte URL de YouTube a formato embed
 */
export const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;

    try {
        let videoId = null;

        // Formato: https://www.youtube.com/watch?v=VIDEO_ID
        const watchMatch = url.match(/[?&]v=([\w-]+)/);
        if (watchMatch) videoId = watchMatch[1];

        // Formato: https://youtu.be/VIDEO_ID
        const shortMatch = url.match(/youtu\.be\/([\w-]+)/);
        if (shortMatch) videoId = shortMatch[1];

        // Formato: https://www.youtube.com/embed/VIDEO_ID
        const embedMatch = url.match(/youtube\.com\/embed\/([\w-]+)/);
        if (embedMatch) videoId = embedMatch[1];

        if (videoId) {
            return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1`;
        }

        return null;
    } catch {
        return null;
    }
};

/**
 * Convierte URL de Google Drive a formato embed
 */
export const getGoogleDriveEmbedUrl = (url) => {
    if (!url) return null;

    try {
        const match = url.match(/\/d\/([\w-]+)/);
        if (match) {
            return `https://drive.google.com/file/d/${match[1]}/preview`;
        }
        return url;
    } catch {
        return null;
    }
};

/**
 * Valida un archivo de video
 */
export const validateVideoFile = (file) => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];

    if (file.size > maxSize) {
        throw new Error('El archivo es demasiado grande (máx 50MB)');
    }

    if (!allowedTypes.includes(file.type)) {
        throw new Error('Formato no soportado. Use MP4, WebM o MOV');
    }

    return true;
};
