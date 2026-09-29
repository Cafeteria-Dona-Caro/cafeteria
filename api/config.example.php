<?php
// ─────────────────────────────────────────────────────────────
//  Configuración de Café de Caro
//
//  1. Copia este archivo como  api/config.php  (en el servidor).
//  2. Llena los datos de hPanel → Bases de datos → Administración.
//  3. config.php NO se sube a GitHub (está en .gitignore) y el
//     servidor no permite descargarlo (api/.htaccess).
// ─────────────────────────────────────────────────────────────

return [
    // Base de datos (en Hostinger el host es "localhost")
    'db_host'    => 'localhost',
    'db_nombre'  => 'u282498274_cafedecaro',
    'db_usuario' => 'u282498274_caro',
    'db_clave'   => 'CAMBIA-ESTA-CONTRASEÑA',

    // Texto largo y secreto que pide api/instalar.php para crear el primer admin.
    // Después de instalar ya no se usa (el instalador se bloquea solo).
    'clave_instalacion' => 'CAMBIA-ESTE-TEXTO-POR-ALGO-LARGO-Y-SECRETO',

    // Quién puede registrar cobros en caja. Agrega 'caja' si el cajero debe cobrar.
    'roles_cobro' => ['admin'],

    // Límite de pedidos que puede enviar un mismo teléfono/IP desde cliente.html
    'max_pedidos_cliente_por_10min' => 6,
];
