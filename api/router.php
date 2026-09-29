<?php
// api/router.php — Enrutador de la API. api/.htaccess manda TODAS las
// peticiones /api/... aquí; ningún otro .php se puede abrir directamente.
declare(strict_types=1);

require __DIR__ . '/lib/respuesta.php';
require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/validar.php';
require __DIR__ . '/lib/sesion.php';
require __DIR__ . '/lib/ordenes.php';

ini_set('display_errors', '0');
header('X-Content-Type-Options: nosniff');
config(); // carga configuración y zona horaria

// [método, patrón, archivo]
const RUTAS = [
    ['POST',   'auth/login',                'auth/login.php'],
    ['POST',   'auth/logout',               'auth/logout.php'],
    ['GET',    'auth/yo',                   'auth/yo.php'],

    ['GET',    'productos',                 'productos/listar.php'],
    ['POST',   'productos',                 'productos/crear.php'],
    ['PUT',    'productos/(\d+)',           'productos/editar.php'],
    ['PATCH',  'productos/(\d+)/estado',    'productos/estado.php'],

    ['POST',   'ordenes',                   'ordenes/crear.php'],
    ['GET',    'ordenes',                   'ordenes/listar.php'],
    ['GET',    'ordenes/(\d+)',             'ordenes/detalle.php'],
    ['PATCH',  'ordenes/(\d+)/estado',      'ordenes/estado.php'],
    ['POST',   'ordenes/(\d+)/cobrar',      'ordenes/cobrar.php'],
    ['POST',   'ordenes/(\d+)/items',       'ordenes/agregar_item.php'],
    ['DELETE', 'ordenes/(\d+)/items/(\d+)', 'ordenes/quitar_item.php'],

    ['GET',    'mesas',                     'mesas/listar.php'],
    ['GET',    'mesas/mapa',                'mesas/mapa.php'],

    ['GET',    'reportes/ventas',           'reportes/ventas.php'],

    ['GET',    'usuarios',                  'usuarios/listar.php'],
    ['POST',   'usuarios',                  'usuarios/crear.php'],
    ['PUT',    'usuarios/(\d+)',            'usuarios/editar.php'],
    ['DELETE', 'usuarios/(\d+)',            'usuarios/eliminar.php'],

    ['GET',    'sse/eventos',               'sse/eventos.php'],

    ['GET',    'instalar',                  'instalar.php'],
    ['POST',   'instalar',                  'instalar.php'],
];

// Ruta relativa a /api/ (funciona también si el sitio está en una subcarpeta)
$ruta = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/api/router.php'), '/');
if (str_starts_with($ruta, $base . '/')) $ruta = substr($ruta, strlen($base) + 1);
$ruta = trim($ruta, '/');

$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
// Por si el firewall del hosting bloquea PUT/PATCH/DELETE: se aceptan por POST
// con la cabecera X-HTTP-Method-Override.
if ($metodo === 'POST' && isset($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'])) {
    $override = strtoupper((string) $_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE']);
    if (in_array($override, ['PUT', 'PATCH', 'DELETE'], true)) $metodo = $override;
}
$_SERVER['REQUEST_METHOD'] = $metodo;

if ($metodo !== 'GET') verificarOrigen();

$rutaExiste = false;
foreach (RUTAS as [$m, $patron, $archivo]) {
    if (!preg_match('#^' . $patron . '$#', $ruta, $coincide)) continue;
    $rutaExiste = true;
    if ($m !== $metodo) continue;
    $params = array_map('intval', array_slice($coincide, 1));
    require __DIR__ . '/' . $archivo;
    exit;
}

error($rutaExiste ? 'Método no permitido.' : 'Ruta no encontrada.', $rutaExiste ? 405 : 404);
