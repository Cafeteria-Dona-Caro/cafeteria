-- ─────────────────────────────────────────────────────────────
--  Café de Caro — esquema MySQL / MariaDB
--  Lo ejecuta api/instalar.php. También se puede importar a mano
--  desde phpMyAdmin (hPanel → Bases de datos → phpMyAdmin → Importar).
--  Todas las fechas se guardan en UTC.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS usuarios (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email           VARCHAR(120) NOT NULL,
  nombre          VARCHAR(80)  NOT NULL DEFAULT '',
  rol             ENUM('admin','caja','mesero','cocina') NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  activo          TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_usuarios_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS productos (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(80)   NOT NULL,
  categoria       VARCHAR(60)   NOT NULL,
  precio          DECIMAL(10,2) NOT NULL,
  activo          TINYINT(1)    NOT NULL DEFAULT 1,
  creado_en       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_productos_categoria_nombre (categoria, nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ordenes (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mesa            VARCHAR(20)   NOT NULL,
  cliente         VARCHAR(60)   NOT NULL DEFAULT '',
  estado          ENUM('abierta','en_preparacion','lista','cerrada','cancelada') NOT NULL DEFAULT 'abierta',
  origen          ENUM('cliente','mesero') NOT NULL,
  total           DECIMAL(10,2) NOT NULL DEFAULT 0,
  estado_pago     ENUM('pendiente','pagado') NOT NULL DEFAULT 'pendiente',
  metodo_pago     ENUM('efectivo','tarjeta','transferencia','vales','mixto') NULL,
  pagado_en       DATETIME      NULL,
  creado_por      INT UNSIGNED  NULL,
  cobrado_por     INT UNSIGNED  NULL,
  ip_origen       VARCHAR(45)   NULL,
  creado_en       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_ordenes_creado (creado_en),
  KEY idx_ordenes_mesa_estado (mesa, estado),
  KEY idx_ordenes_ip (ip_origen, creado_en),
  CONSTRAINT fk_ordenes_creado_por  FOREIGN KEY (creado_por)  REFERENCES usuarios(id) ON DELETE SET NULL,
  CONSTRAINT fk_ordenes_cobrado_por FOREIGN KEY (cobrado_por) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orden_items (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  orden_id        INT UNSIGNED      NOT NULL,
  producto_id     INT UNSIGNED      NULL,
  nombre          VARCHAR(80)       NOT NULL,      -- copia del nombre al momento del pedido
  precio          DECIMAL(10,2)     NOT NULL,      -- copia del precio al momento del pedido
  cantidad        SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  nota            VARCHAR(140)      NOT NULL DEFAULT '',
  creado_en       DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_items_orden (orden_id),
  CONSTRAINT fk_items_orden    FOREIGN KEY (orden_id)    REFERENCES ordenes(id)   ON DELETE CASCADE,
  CONSTRAINT fk_items_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS intentos_login (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ip              VARCHAR(45)  NOT NULL,
  email           VARCHAR(120) NOT NULL DEFAULT '',
  creado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_intentos_ip (ip, creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
