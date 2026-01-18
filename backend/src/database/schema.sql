-- ============================================================
-- Schema de Base de Datos Postgres - Sistema de Reservas de Barbería
-- ============================================================
-- 
-- Este archivo contiene el esquema completo de la base de datos Postgres
-- Ejecutar este script para crear todas las tablas necesarias
--
-- Uso:
--   psql -U usuario -d barberia < schema.sql
--   o desde Node.js: node scripts/setup-db.js
--
-- ============================================================

-- ===============================
-- 1. BASE DE DATOS BARBERÍA
-- ===============================

-- Asegúrese de que la base de datos exista antes de ejecutar este script


-- ===============================
-- 2. TABLAS PRINCIPALES
-- ===============================

-- ---- Tabla de Usuarios (Administradores) ----
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'admin' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_role CHECK (role IN ('admin', 'user'))
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---- Tabla de Servicios ----
CREATE TABLE IF NOT EXISTS services (
  id VARCHAR(10) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  duration INT NOT NULL, -- duración en minutos
  category VARCHAR(50),
  image_url VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---- Tabla de Barberos ----
CREATE TABLE IF NOT EXISTS barbers (
  id VARCHAR(10) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  specialty VARCHAR(150),
  experience INT,
  image_url VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_barbers_updated_at BEFORE UPDATE ON barbers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---- Tabla de Ofertas ----
CREATE TABLE IF NOT EXISTS offers (
  id VARCHAR(10) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  discount_percentage DECIMAL(5, 2), -- porcentaje de descuento (ej: 15.50)
  discount_amount DECIMAL(10, 2), -- monto fijo de descuento
  original_price DECIMAL(10, 2),
  final_price DECIMAL(10, 2) NOT NULL,
  image_url VARCHAR(255),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_offers_active ON offers(is_active);
CREATE INDEX IF NOT EXISTS idx_offers_dates ON offers(start_date, end_date);

CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---- Tabla de Productos ----
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(10) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(150), -- Tipo/Características del producto
  price DECIMAL(10, 2) NOT NULL,
  image_url VARCHAR(255),
  stock INT, -- Stock disponible (NULL = ilimitado)
  min_stock INT, -- Stock mínimo para alerta
  is_active BOOLEAN DEFAULT TRUE,
  is_active_page BOOLEAN DEFAULT FALSE, -- Activo en página pública (máximo 8)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_active_page ON products(is_active_page);

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---- Tabla de Configuraciones (Settings) ----
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  background_image VARCHAR(255), -- Fondo página pública
  admin_background_image VARCHAR(255), -- Fondo panel admin
  logo VARCHAR(255), -- Logo de la aplicación
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---- Tabla de Reservas ----
CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  service_id VARCHAR(10) NOT NULL,
  service_label VARCHAR(100), -- nombre personalizado/promo (opcional)
  service_price DECIMAL(10, 2), -- snapshot del precio al crear
  barber_id VARCHAR(10),
  barber_name VARCHAR(100), -- snapshot del nombre al crear
  date DATE NOT NULL,
  time VARCHAR(5) NOT NULL, -- formato HH:MM
  status VARCHAR(20) DEFAULT 'pendiente' NOT NULL,
  customer_name VARCHAR(100),
  customer_phone VARCHAR(30),
  customer_email VARCHAR(100),
  notes TEXT,
  delivery_status VARCHAR(20) DEFAULT NULL, -- Estado de entrega para facturas de solo productos (NULL = no aplica)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_reservation_service
    FOREIGN KEY (service_id) REFERENCES services(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  
  CONSTRAINT fk_reservation_barber
    FOREIGN KEY (barber_id) REFERENCES barbers(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  
  CONSTRAINT check_status CHECK (status IN ('pendiente', 'confirmada', 'cancelada')),
  CONSTRAINT check_delivery_status CHECK (delivery_status IS NULL OR delivery_status IN ('pendiente', 'entregado'))
);

CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_barber ON reservations(barber_id);
CREATE INDEX IF NOT EXISTS idx_reservations_service ON reservations(service_id);
CREATE INDEX IF NOT EXISTS idx_reservations_datetime ON reservations(date, time);
CREATE INDEX IF NOT EXISTS idx_reservations_available ON reservations(date, time, barber_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_delivery_status ON reservations(delivery_status);

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---- Tabla de Códigos de Descuento ----
CREATE TABLE IF NOT EXISTS discount_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  description VARCHAR(255),
  discount_type VARCHAR(20) DEFAULT 'percentage' NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL,
  min_purchase DECIMAL(10, 2) DEFAULT 0,
  max_discount DECIMAL(10, 2) DEFAULT NULL,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  usage_limit INT DEFAULT NULL,
  usage_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_discount_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_active ON discount_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_discount_dates ON discount_codes(start_date, end_date);

CREATE TRIGGER update_discount_codes_updated_at BEFORE UPDATE ON discount_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---- Tabla de Items de Reserva (Factura) ----
CREATE TABLE IF NOT EXISTS reservation_items (
  id SERIAL PRIMARY KEY,
  reservation_id INT NOT NULL,
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('service', 'product', 'offer')),
  item_id VARCHAR(10) NOT NULL,
  item_name VARCHAR(100) NOT NULL,
  quantity INT DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  discount_code_id INT DEFAULT NULL,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_reservation_item_reservation
    FOREIGN KEY (reservation_id) REFERENCES reservations(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
    
  CONSTRAINT fk_reservation_item_discount
    FOREIGN KEY (discount_code_id) REFERENCES discount_codes(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reservation_items_reservation ON reservation_items(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_items_type ON reservation_items(item_type, item_id);

CREATE TRIGGER update_reservation_items_updated_at BEFORE UPDATE ON reservation_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
