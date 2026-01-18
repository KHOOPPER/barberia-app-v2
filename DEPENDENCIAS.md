# Dependencias y Requisitos del Sistema

Este documento lista todas las tecnologías y librerías necesarias para que el sistema funcione correctamente, ordenadas por importancia.

## 1. Requisitos del Sistema (Infraestructura)

Estas son las dependencias base que deben estar instaladas en el servidor o máquina local antes de empezar.

*   **Node.js** (v18.0.0 o superior): Entorno de ejecución para el código JavaScript.
*   **PostgreSQL** (v12 o superior): Motor de base de datos relacional.
*   **npm** (v9.0.0 o superior): Gestor de paquetes incluido con Node.js.

---

## 2. Backend (Servidor API)

Estas dependencias se encuentran en la carpeta `backend/` y son críticas para la lógica de negocio, seguridad y conexión a base de datos.
*(Se instalan automáticamente con `npm install`)*

### Core y Base de Datos (Críticos)
*   **express**: Framework web para manejar las rutas y el servidor HTTP.
*   **pg**: Cliente oficial de PostgreSQL para conectar la aplicación a la base de datos.
*   **dotenv**: Carga variables de entorno (secretos) desde el archivo `.env`.

### Seguridad y Autenticación
*   **cors**: Permite el acceso seguro desde el frontend (Cross-Origin Resource Sharing).
*   **helmet**: Agrega múltiples capas de seguridad mediante headers HTTP.
*   **express-rate-limit**: Protege contra ataques de fuerza bruta limitando peticiones repetidas.
*   **express-validator**: Valida y sanitiza los datos que envían los clientes.
*   **jsonwebtoken (JWT)**: Genera tokens seguros para el inicio de sesión.
*   **bcryptjs**: Encripta las contraseñas de los usuarios para que no sean legibles.
*   **cookie-parser**: Permite leer y establecer cookies seguras (httpOnly).

### Utilidades
*   **multer**: Maneja la subida de archivos (imágenes y videos) al servidor.
*   **winston**: Sistema de registros (logs) profesional para monitorear errores.

### Desarrollo (DevDependencies)
*   **nodemon**: Reinicia el servidor automáticamente al detectar cambios en el código.

---

## 3. Frontend (Interfaz Cliente)

Estas dependencias se encuentran en la carpeta `frontend/` y son necesarias para construir y visualizar la página web.

### Core y Build
*   **react**: Biblioteca principal para construir la interfaz de usuario.
*   **react-dom**: Conecta React con el navegador.
*   **vite**: Herramienta de compilación ultrarrápida y servidor de desarrollo.

### Navegación
*   **react-router-dom**: Gestiona la navegación entre páginas sin recargar el sitio.

### Diseño y Estilos
*   **tailwindcss**: Framework de CSS para diseño moderno y responsivo.
*   **@tailwindcss/vite**: Plugin oficial para integrar Tailwind con Vite.
*   **framer-motion**: Biblioteca potente para animaciones fluidas y transiciones.
*   **lucide-react**: Set de iconos modernos y ligeros.

### Utilidades UI
*   **react-qr-code**: Genera códigos QR para las facturas/tickets.
*   **recharts**: Dibuja gráficos estadísticos en el panel de administrador.
*   **vite-plugin-image-optimizer**: Optimiza automáticamente las imágenes para web.
