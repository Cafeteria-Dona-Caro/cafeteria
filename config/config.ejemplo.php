<?php
// ─────────────────────────────────────────────────────────────
//  Configuración de Café de Caro
//  Copiar como  config/config.php  y llenar con los datos reales
//  (hPanel → Bases de datos → Administración).
//  config.php NO se versiona (.gitignore) y el servidor no lo sirve
//  (config/.htaccess).
// ─────────────────────────────────────────────────────────────
return [
    'db' => [
        'host'     => '127.0.0.1',
        'port'     => 3306,
        'nombre'   => 'NOMBRE_DE_LA_BASE',
        'usuario'  => 'USUARIO_DE_LA_BASE',
        'password' => 'CONTRASEÑA_DE_LA_BASE',
        'charset'  => 'utf8mb4',
    ],
    'app' => [
        'nombre'       => 'Café de Caro',
        'url'          => 'https://cafedecaro.eniguala.com',
        'zona_horaria' => 'America/Mexico_City',
        'debug'        => false,
        // Texto largo y secreto que pide api/instalar.php para crear el primer admin.
        'clave_instalacion' => 'CAMBIA-ESTE-TEXTO-POR-ALGO-LARGO-Y-SECRETO',
        // Pedidos que puede enviar una misma IP desde cliente.html cada 10 minutos
        'max_pedidos_cliente' => 6,
    ],
    'sesion' => [
        'nombre'   => 'cafedecaro_sid',
        'lifetime' => 28800,  // 8 horas
    ],
];
