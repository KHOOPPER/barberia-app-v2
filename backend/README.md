# Backend API - Sistema de Reservas de Barbería

API REST desarrollada con Node.js, Express y PostgreSQL para el sistema de gestión de reservas de barbería.

## Descripción

Este backend funciona como la capa de servicios del sistema. Proporciona una API RESTful completa para gestionar reservas, servicios, barberos, productos, ofertas, códigos de descuento y configuraciones del sistema. Incluye autenticación JWT, validación exhaustiva de datos, logging profesional y múltiples capas de seguridad.

## Características Principales

- API RESTful completa
- Autenticación JWT con roles
- Validación de datos con express-validator
- Manejo de errores centralizado
- Logging con Winston
- Seguridad: Helmet, CORS, Rate Limiting
- Base de datos PostgreSQL con pool de conexiones
- Scripts de setup y seed
- Gestión de archivos con Multer (almacenamiento local)
- Documentación interna en código (JSDoc)

## Requisitos

- Node.js >= 18.0.0
- PostgreSQL >= 12
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

Edite `.env` con sus credenciales:

```env
# Base de Datos PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=su_password
DB_NAME=barberia

# Servidor
PORT=3000
NODE_ENV=development

# Frontend (CORS)
FRONTEND_URL=http://localhost:5173

# Autenticación JWT
JWT_SECRET=su_clave_secreta_jwt_minimo_32_caracteres
JWT_EXPIRES_IN=7d

# Usuario Administrador Inicial (Se creará en el setup)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-this-password
```

3. **Crear base de datos:**

Conéctese a PostgreSQL y ejecute:

```sql
CREATE DATABASE barberia;
```

4. **Configurar tablas:**

```bash
npm run db:setup
```

5. **Poblar datos iniciales:**

```bash
npm run db:seed
```

6. **Iniciar servidor:**

```bash
# Desarrollo (con recarga automática)
npm run dev

# Producción
npm start
```

El servidor estará disponible en `http://localhost:3000` (o el puerto configurado).

## Estructura del Proyecto

```
backend/
├── src/
│   ├── config/           # Configuración (DB, env)
│   ├── constants/        # Constantes del sistema
│   ├── controllers/      # Controladores de rutas
│   ├── database/         # Schema SQL y queries
│   ├── middlewares/      # Middlewares (auth, errors, validation, upload)
│   ├── routes/           # Definición de rutas
│   ├── services/         # Lógica de negocio
│   ├── utils/            # Utilidades (logger, errors, validators)
│   ├── validators/       # Validaciones de express-validator
│   ├── app.js            # Configuración Express
│   └── server.js         # Punto de entrada
├── scripts/              # Scripts de setup y seed
├── logs/                 # Logs de la aplicación
├── uploads/              # Archivos subidos (Videos, Imágenes)
├── .env                  # Variables de entorno (no commitear)
├── .env.example          # Ejemplo de variables de entorno
└── package.json
```

## Scripts Disponibles

- `npm start` - Inicia el servidor en modo producción
- `npm run dev` - Inicia el servidor en modo desarrollo con nodemon
- `npm run db:setup` - Crea todas las tablas de la base de datos
- `npm run db:seed` - Puebla la base de datos con datos de prueba

## API Endpoints

### Autenticación

- `POST /api/auth/login` - Iniciar sesión

### Reservas

- `GET /api/reservations` - Obtener reservas disponibles (público)
- `POST /api/reservations` - Crear reserva (público)
- `GET /api/reservations/admin` - Listar todas las reservas (admin)
- `PUT /api/reservations/:id/status` - Cambiar estado (admin)
- `DELETE /api/reservations/:id` - Eliminar reserva (admin)

### Recursos (Barberos, Servicios, Productos)

La API cuenta con endpoints CRUD completos para `/api/barbers`, `/api/services`, `/api/products` y `/api/offers`.

### Configuración

- `GET /api/settings/...` - Obtener configuraciones públicas
- `POST /api/settings/...` - Actualizar configuraciones (admin)

## Seguridad

El sistema implementa las siguientes medidas de seguridad:

- **Autenticación JWT:** Tokens seguros con expiración configurable.
- **Helmet:** Protección de headers HTTP con CSP y HSTS.
- **CORS:** Configuración segura con validación de origen estricta.
- **Rate Limiting:** Protección contra DDoS.
- **Validación de datos:** Express-validator en todos los endpoints de entrada.
- **SQL Injection:** Protegido mediante consultas parametrizadas (node-postgres).
- **Password Hashing:** Encriptación con bcrypt.

## Despliegue en Producción

1. Configure las variables de entorno para el entorno productivo.
2. Utilice un gestor de procesos como PM2 (`pm2 start src/server.js`).
3. Configure un proxy inverso (Nginx) para SSL y manejo de carga.

## Soporte

Para más información, revisar la documentación interna del código.
