-- ============================================================
-- Datos iniciales (Seed) Postgres - Sistema de Reservas de Barbería
-- ============================================================
-- 
-- Este archivo contiene datos de ejemplo para poblar la base de datos
-- Ejecutar después de schema.sql
--
-- NOTA: El usuario admin se crea desde el código (scripts/seed-db.js)
-- para poder hashear la contraseña correctamente
--
-- ============================================================

-- Limpiar datos existentes (opcional - descomentar si quieres resetear)
-- TRUNCATE TABLE reservations CASCADE;
-- TRUNCATE TABLE services CASCADE;
-- TRUNCATE TABLE barbers CASCADE;
-- TRUNCATE TABLE products CASCADE;
-- TRUNCATE TABLE offers CASCADE;
-- TRUNCATE TABLE settings CASCADE;
-- TRUNCATE TABLE users CASCADE;

-- ============================================================
-- SERVICIOS
-- ============================================================
INSERT INTO services (id, name, description, price, duration, category) VALUES
  ('s1', 'Corte Clásico', 'Corte limpio, simétrico y con acabado profesional.', 25.00, 45, 'Corte'),
  ('s2', 'Afeitado Premium', 'Afeitado caliente con productos de primera calidad.', 20.00, 30, 'Afeitado'),
  ('s3', 'Corte + Barba', 'Renovación completa: corte, barba y detalles al máximo.', 40.00, 75, 'Combo'),
  ('s4', 'Diseño de Cejas', 'Cejas definidas con técnica precisa y natural.', 10.00, 15, 'Detalles')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  duration = EXCLUDED.duration,
  category = EXCLUDED.category,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================================
-- BARBEROS
-- ============================================================
INSERT INTO barbers (id, name, specialty, experience, is_active) VALUES
  ('b1', 'Barbero Principal', 'Cortes Clásicos', 12, TRUE),
  ('b2', 'Especialista en Estilos', 'Diseño de Barba y Tatuajes', 10, TRUE),
  ('b3', 'Estilista Senior', 'Fade y Estilos Modernos', 8, TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  specialty = EXCLUDED.specialty,
  experience = EXCLUDED.experience,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================================
-- CONFIGURACIÓN INICIAL (SETTINGS)
-- ============================================================
INSERT INTO settings (key, value) VALUES
  ('homepage_video_type', 'default'),
  ('homepage_video_url', ''),
  ('homepage_video_file', ''),
  ('homepage_background_image', NULL),
  ('admin_background_image', NULL),
  ('logo', NULL)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- NOTAS:
-- ============================================================
-- 1. El usuario admin se crea desde scripts/seed-db.js
--    para poder hashear la contraseña con bcrypt
--
-- 2. Las reservas de ejemplo son opcionales y se pueden
--    crear manualmente desde el panel admin o desde el código
