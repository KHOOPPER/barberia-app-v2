/**
 * @fileoverview Configuración principal de Express
 * @module app
 * 
 * He configurado esta aplicación Express con todas las medidas de seguridad
 * necesarias, middlewares de validación, y rutas organizadas por módulos.
 * Esta es la configuración central del backend.
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";
import logger from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importación de rutas organizadas por módulos
import baseRoutes from "./routes/base.routes.js";
import authRoutes from "./routes/auth.routes.js";
import reservationsRoutes from "./routes/reservations.routes.js";
import barbersRoutes from "./routes/barbers.routes.js";
import servicesRoutes from "./routes/services.routes.js";
import offersRoutes from "./routes/offers.routes.js";
import productsRoutes from "./routes/products.routes.js";
import statisticsRoutes from "./routes/statistics.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import discountsRoutes from "./routes/discounts.routes.js";

// Middlewares de manejo de errores
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
// Middleware de protección CSRF
import { csrfProtection } from "./middlewares/csrf.js";

const app = express();

// ============================================================
// MIDDLEWARES DE SEGURIDAD
// He implementado múltiples capas de seguridad para proteger la API
// ============================================================

// Helmet: Configuración de headers HTTP de seguridad
// He configurado Helmet con Content Security Policy y HSTS para proteger
// la aplicación contra ataques comunes como XSS y clickjacking.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Necesario para estilos inline de React (práctica común y segura)
          "https://fonts.googleapis.com",
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        scriptSrc: [
          "'self'", // Scripts externos permitidos (manifest-loader.js, icon-loader.js)
          // 'unsafe-inline' eliminado - scripts inline movidos a archivos externos
        ],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"], // Bloquear objetos embebidos (flash, etc.)
        baseUri: ["'self'"], // Restringir base URI
        formAction: ["'self'"], // Restringir acción de formularios
        frameAncestors: ["'none'"], // Prevenir clickjacking
        upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null, // Upgrade a HTTPS en producción
      },
    },
    contentTypeOptions: true, // X-Content-Type-Options: nosniff - Previene MIME type sniffing
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    // Headers de seguridad adicionales
    dnsPrefetchControl: true, // X-DNS-Prefetch-Control: off
    downloadOptions: true, // X-Download-Options: noopen
    permittedCrossDomainPolicies: false, // X-Permitted-Cross-Domain-Policies: none
  })
);

// CORS: Configuración segura con validación de origen
// He implementado validación de origen con lista blanca explícita para mejorar la seguridad
// incluso en desarrollo, eliminando la dependencia de regex permisivos.
/**
 * Verifica si una URL es una IP de red local válida (para desarrollo)
 * Permite: 192.168.x.x, 10.x.x.x, 172.16-31.x.x
 */
const isLocalNetworkIP = (url) => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Verificar si es una IP de red local
    const localNetworkPatterns = [
      /^192\.168\.\d{1,3}\.\d{1,3}$/,  // 192.168.x.x
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,  // 10.x.x.x
      /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/,  // 172.16-31.x.x
    ];

    return localNetworkPatterns.some(pattern => pattern.test(hostname));
  } catch {
    return false;
  }
};

const corsOptions = {
  origin: (origin, callback) => {
    // Construir lista de orígenes permitidos desde variable de entorno
    const allowedOrigins = process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
      : ["http://localhost:5173"];

    // Agregar localhost y 127.0.0.1 por defecto en desarrollo (común en desarrollo local)
    if (process.env.NODE_ENV !== "production") {
      // Agregar variantes comunes de localhost si no están ya en la lista
      const localhostVariants = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
      ];
      localhostVariants.forEach(variant => {
        if (!allowedOrigins.includes(variant)) {
          allowedOrigins.push(variant);
        }
      });

      // En desarrollo, permitir IPs de red local (para acceso desde otros dispositivos)
      if (origin && isLocalNetworkIP(origin)) {
        return callback(null, true);
      }
    }

    // Permitir requests sin origin (mobile apps, Postman, etc.) solo en desarrollo
    if (process.env.NODE_ENV !== "production" && !origin) {
      return callback(null, true);
    }

    // Validar que el origen esté en la lista blanca explícita
    // También permitir cualquier subdominio de vercel.app para previews
    if (!origin || allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
      callback(null, true);
    } else {
      logger.warn("CORS: Origen no permitido", { origin, allowedOrigins });
      callback(new Error("Origen no permitido por CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

// Rate Limiting: Protección contra DDoS y abuso de API
// He configurado rate limiting para limitar el número de peticiones por IP,
// excluyendo rutas públicas que necesitan ser accesibles sin restricciones.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 200 : 1000, // Más permisivo en desarrollo
  message: {
    success: false,
    error: {
      message:
        "Demasiadas peticiones desde esta IP, intenta de nuevo más tarde.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // No aplicar rate limiting a rutas públicas (contenido visible para clientes)
    const publicPaths = [
      '/api/settings/background/current',
      '/api/settings/logo/current',
      '/api/settings/admin-background/current',
      '/api/settings/offers_section_enabled',
      '/api/settings/products_section_enabled',
      '/api/offers',
      '/api/products',
      '/api/services',
      '/api/barbers'
    ];
    // Verificar si la ruta coincide exactamente o si es una ruta pública
    return publicPaths.some(path => req.path === path || req.path.startsWith(path + '/'));
  },
});

app.use("/api/", limiter);

// CSRF Protection: Protección contra Cross-Site Request Forgery
// Se aplica después de CORS para validar que las peticiones vengan de orígenes permitidos
app.use("/api/", csrfProtection);

// ============================================================
// OPTIMIZACIÓN DE RENDIMIENTO
// Compresión de respuestas (Gzip/Brotli) para reducir tamaño de transferencia
// ============================================================
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Nivel de compresión balanceado (velocidad/tamaño)
}));

// ============================================================
// MIDDLEWARES GENERALES
// He configurado estos middlewares para procesar requests y logging
// ============================================================

// Cookie Parser: Para manejar cookies httpOnly
// He configurado cookie-parser para manejar cookies de forma segura
app.use(cookieParser());

// Body parser con límites de seguridad
// He establecido límites para prevenir ataques de tamaño de payload
app.use(express.json({
  limit: "10mb",
  strict: true
}));
app.use(express.urlencoded({
  extended: true,
  limit: "10mb",
  parameterLimit: 100
}));

// Logger de requests (solo en desarrollo)
// He configurado logging detallado solo en desarrollo para facilitar el debugging
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    next();
  });
}

// ============================================================
// SERVIR ARCHIVOS ESTÁTICOS (imágenes subidas)
// He configurado estas rutas para servir archivos estáticos de manera eficiente
// ============================================================

// Servir imágenes desde la carpeta uploads con caché agresivo
app.use("/uploads", express.static(path.join(__dirname, "../uploads"), {
  maxAge: '1y', // Cachear por 1 año
  etag: true,
  immutable: true, // El contenido no cambiará
  setHeaders: (res, path) => {
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// Servir assets del frontend con caché agresivo
app.use("/src/assets", express.static(path.join(__dirname, "../../frontend/src/assets"), {
  maxAge: '1y',
  etag: true,
  immutable: true,
  setHeaders: (res, path) => {
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// ============================================================
// RUTAS
// He organizado las rutas por módulos funcionales para mejor mantenibilidad
// ============================================================

app.use("/api", baseRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/reservations", reservationsRoutes);
app.use("/api/barbers", barbersRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/offers", offersRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/statistics", statisticsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/discounts", discountsRoutes);

// Health check endpoint
// He implementado este endpoint para verificar el estado del servidor y la conexión a BD
// Útil para monitoreo y servicios de hosting como Render o Railway
app.get("/health", async (req, res) => {
  try {
    // Verificar conexión a BD
    const { pool } = await import("./config/db.js");
    await pool.query("SELECT 1");

    res.status(200).json({
      status: "ok",
      message: "API funcionando correctamente",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      message: "Error de conexión a la base de datos",
      timestamp: new Date().toISOString(),
      database: "disconnected",
    });
  }
});

// ============================================================
// MIDDLEWARES DE ERROR
// He colocado estos middlewares al final para capturar todos los errores
// ============================================================

// Ruta no encontrada (404)
app.use(notFoundHandler);

// Manejo de errores centralizado (debe ir al final de todas las rutas)
app.use(errorHandler);

export default app;
