/**
 * Convierte URLs de Google Drive al formato correcto para mostrar imágenes
 * @param {string} url - URL original
 * @returns {string} - URL convertida o la original si no es de Google Drive
 */
export const convertImageUrl = (url) => {
    if (!url) return url;

    // Detectar URLs de Google Drive - varios formatos posibles
    // Formato 1: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
    // Formato 2: https://drive.google.com/open?id=FILE_ID
    // Formato 3: https://drive.google.com/uc?export=view&id=FILE_ID (ya convertido)

    let fileId = null;

    // Intentar extraer el ID del archivo
    const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);

    if (match1) {
        fileId = match1[1];
    } else if (match2) {
        fileId = match2[1];
    }

    if (fileId) {
        // Convertir a formato de imagen directa
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }

    // Si no es de Google Drive, retornar la URL original
    return url;
};

/**
 * Valida si una URL es válida para mostrar como imagen
 * @param {string} url - URL a validar
 * @returns {boolean} - true si es válida
 */
export const isValidImageUrl = (url) => {
    if (!url || typeof url !== 'string') return false;

    // Debe empezar con http o https
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return false;
    }

    return true;
};

/**
 * Procesa una URL de imagen para asegurar que funcione correctamente
 * @param {string} url - URL original
 * @returns {string|null} - URL procesada o null si no es válida
 */
export const processImageUrl = (url) => {
    if (!isValidImageUrl(url)) return null;
    return convertImageUrl(url);
};
