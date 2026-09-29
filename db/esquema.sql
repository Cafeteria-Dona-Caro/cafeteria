-- ─────────────────────────────────────────────────────────────
--  Esquema de Café de Caro — MariaDB 10.x / MySQL 8.x
--  Zona horaria: America/Mexico_City (UTC-6, sin horario de verano)
--
--  Importar en phpMyAdmin (hPanel → Bases de datos → phpMyAdmin →
--  Importar) ANTES de db/semilla.sql. También lo ejecuta api/instalar.php.
-- ─────────────────────────────────────────────────────────────

SET NAMES utf8mb4;
SET time_zone = '-06:00';

-- ── Usuarios del sistema ──
CREATE TABLE IF NOT EXISTS usuarios (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(255) NOT NULL UNIQUE,
    nombre      VARCHAR(100) NOT NULL,
    password    VARCHAR(255) NOT NULL,              -- password_hash() de PHP
    rol         ENUM('admin', 'caja', 'mesero', 'cocina') NOT NULL DEFAULT 'mesero',
    activo      TINYINT(1) NOT NULL DEFAULT 1,
    creado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_rol (rol),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Intentos fallidos de login (bloqueo por IP) ──
CREATE TABLE IF NOT EXISTS intentos_login (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ip          VARCHAR(45)  NOT NULL,
    email       VARCHAR(255) NOT NULL DEFAULT '',
    creado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ip_fecha (ip, creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Categorías de productos ──
CREATE TABLE IF NOT EXISTS categorias (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL UNIQUE,
    orden       INT UNSIGNED NOT NULL DEFAULT 0,
    activa      TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Productos (menú) ──
CREATE TABLE IF NOT EXISTS productos (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    categoria_id INT UNSIGNED NOT NULL,
    nombre       VARCHAR(150) NOT NULL,
    descripcion  TEXT,
    precio       DECIMAL(10,2) NOT NULL,
    disponible   TINYINT(1) NOT NULL DEFAULT 1,
    imagen       VARCHAR(255) DEFAULT NULL,
    orden        INT UNSIGNED NOT NULL DEFAULT 0,
    creado_en    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id),
    UNIQUE KEY uk_producto_categoria (categoria_id, nombre),
    INDEX idx_disponible (disponible),
    INDEX idx_categoria (categoria_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Mesas ──
CREATE TABLE IF NOT EXISTS mesas (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    numero      VARCHAR(10) NOT NULL UNIQUE,         -- ej: "PB-01", "B-03"
    seccion     VARCHAR(50) DEFAULT 'principal',
    capacidad   TINYINT UNSIGNED DEFAULT 4,
    activa      TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Órdenes ──
-- Flujo: abierta → en_preparacion → lista → entregada → cobrada   (o cancelada)
CREATE TABLE IF NOT EXISTS ordenes (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    mesa_id        INT UNSIGNED DEFAULT NULL,
    mesa_numero    VARCHAR(10) DEFAULT NULL,          -- desnormalizado para rapidez
    cliente_nombre VARCHAR(100) DEFAULT NULL,
    notas          TEXT,
    tipo           ENUM('mesa', 'para_llevar', 'encargo') NOT NULL DEFAULT 'mesa',
    estado         ENUM('abierta', 'en_preparacion', 'lista', 'entregada', 'cobrada', 'cancelada')
                   NOT NULL DEFAULT 'abierta',
    subtotal       DECIMAL(10,2) NOT NULL DEFAULT 0,
    descuento      DECIMAL(10,2) NOT NULL DEFAULT 0,
    total          DECIMAL(10,2) NOT NULL DEFAULT 0,
    metodo_pago    ENUM('efectivo', 'tarjeta', 'transferencia', 'vales', 'mixto') DEFAULT NULL,
    cobrada_por    INT UNSIGNED DEFAULT NULL,
    cobrada_en     DATETIME DEFAULT NULL,
    creada_por     INT UNSIGNED DEFAULT NULL,         -- NULL si la creó un cliente (QR)
    ip_origen      VARCHAR(45) DEFAULT NULL,          -- para limitar pedidos desde el QR
    creado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (mesa_id) REFERENCES mesas(id) ON DELETE SET NULL,
    FOREIGN KEY (creada_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (cobrada_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_estado (estado),
    INDEX idx_mesa (mesa_id),
    INDEX idx_fecha (creado_en),
    INDEX idx_ip_fecha (ip_origen, creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Items de cada orden ──
CREATE TABLE IF NOT EXISTS orden_items (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    orden_id    INT UNSIGNED NOT NULL,
    producto_id INT UNSIGNED NOT NULL,
    nombre      VARCHAR(150) NOT NULL,                -- snapshot al momento del pedido
    precio      DECIMAL(10,2) NOT NULL,               -- precio al momento del pedido
    cantidad    SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    notas       VARCHAR(255) DEFAULT NULL,
    estado      ENUM('pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado')
                NOT NULL DEFAULT 'pendiente',
    FOREIGN KEY (orden_id) REFERENCES ordenes(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id),
    INDEX idx_orden (orden_id),
    INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Cola de eventos para SSE (tiempo real) ──
CREATE TABLE IF NOT EXISTS eventos (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tipo        VARCHAR(50) NOT NULL,                 -- 'orden_nueva', 'orden_estado', 'orden_items', 'producto_actualizado'
    datos       JSON NOT NULL,
    creado_en   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_tipo (tipo),
    INDEX idx_fecha (creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Los eventos de más de 24 h se borran solos desde la API.
-- Opcional (CRON de Hostinger cada hora):
--   DELETE FROM eventos WHERE creado_en < NOW() - INTERVAL 24 HOUR;
