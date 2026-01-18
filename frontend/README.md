# Frontend - Sistema de Reservas de Barbería

Aplicación web frontend desarrollada con React 19 y Vite para el sistema de gestión de reservas de barbería.

## Descripción

Esta aplicación actúa como la interfaz principal del sistema. Incluye un sitio web público para clientes con sistema de reservas en línea y un panel administrativo completo para gestionar todas las operaciones del negocio.

## Características Principales

- Interfaz web moderna con React 19 y Vite
- Diseño responsive con Tailwind CSS 4
- Sistema de reservas en tiempo real
- Panel administrativo completo
- Generación de facturas en formato ticket
- Progressive Web App (PWA) configurable
- Optimización de rendimiento con lazy loading
- Manejo de errores con Error Boundary

## Requisitos

- Node.js >= 18.0.0
- npm >= 9.0.0

## Instalación

1. **Instalar dependencias:**

```bash
npm install
```

2. **Configurar variables de entorno:**

Cree un archivo `.env` en la raíz del proyecto (basado en `.env.example`):

```bash
cp .env.example .env
```

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_ADMIN_PATH=/admin
```

### Ruta del panel administrativo

Por defecto, el panel administrativo se sirve bajo `/admin`. Puede cambiarse con `VITE_ADMIN_PATH` (por ejemplo `/gestion`), lo cual ajusta rutas internas y la configuracion PWA asociada.


Ajuste `VITE_API_BASE_URL` si su backend corre en otro puerto/host.

3. **Iniciar servidor de desarrollo:**

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo con hot reload
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Previsualiza la build de producción
- `npm run lint` - Ejecuta el linter

## Estructura del Proyecto

```
frontend/
├── src/
│   ├── components/       # Componentes React organizados por funcionalidad
│   │   ├── admin/        # Componentes del panel administrativo
│   │   ├── barbers/      # Componentes de barberos
│   │   ├── booking/      # Componentes de reservas
│   │   ├── home/         # Componentes de la página principal
│   │   ├── layout/       # Componentes de layout (Navbar, Footer)
│   │   ├── services/     # Componentes de servicios
│   │   └── ui/           # Componentes UI reutilizables
│   ├── config/           # Configuración (API, etc.)
│   ├── data/             # Datos y constantes compartidas
│   ├── hooks/            # Custom hooks de React
│   ├── utils/            # Utilidades y helpers
│   ├── assets/           # Imágenes y recursos estáticos
│   ├── App.jsx           # Componente principal
│   └── main.jsx          # Punto de entrada
├── public/               # Archivos estáticos públicos
└── package.json
```

## Tecnologías Utilizadas

- **React 19** - Biblioteca de UI
- **Vite** - Build tool y dev server
- **Tailwind CSS 4** - Framework de estilos
- **React Router** - Enrutado
- **Framer Motion** - Animaciones
- **Lucide React** - Iconos
- **react-qr-code** - Generación de códigos QR

## Despliegue en Producción

1. Ejecute el comando de construcción:

```bash
npm run build
```

2. Los archivos generados estarán en la carpeta `dist/`.
3. Despliegue el contenido de `dist/` en su servidor web (Apache, Nginx, Vercel, Netlify).
4. Asegúrese de configurar las reglas de reescritura para Single Page Application (SPA) si usa un servidor tradicional.

## Características Técnicas

### Lazy Loading

Implementación de lazy loading para componentes de rutas, optimizando el tamaño del bundle inicial.

### Responsive Design

Diseño con enfoque mobile-first, adaptable a dispositivos móviles, tablets y escritorio.

### PWA

Configuración básica de Progressive Web App para instalación en dispositivos.

### SEO

Configuración de meta tags, Open Graph y estructura semántica.
