<?php
// GET /api/reportes/ventas?desde=YYYY-MM-DD&hasta=YYYY-MM-DD   (admin)
// Ventas cobradas en el periodo (por fecha de cobro), por método de pago y por producto.
declare(strict_types=1);

exigirRol(Rol::Admin);
$desde = fechaParametro((string) ($_GET['desde'] ?? date('Y-m-d')));
$hasta = fechaParametro((string) ($_GET['hasta'] ?? date('Y-m-d')), true);
if ($desde > $hasta) error('La fecha "desde" no puede ser posterior a "hasta".');
$rango = [':desde' => $desde, ':hasta' => $hasta];

$resumen = consulta(
    "SELECT COUNT(*) AS tickets, COALESCE(SUM(total), 0) AS total, COALESCE(SUM(descuento), 0) AS descuentos
       FROM ordenes WHERE estado = 'cobrada' AND cobrada_en BETWEEN :desde AND :hasta",
    $rango
)->fetch();

$porMetodo = consulta(
    "SELECT metodo_pago, COUNT(*) AS tickets, SUM(total) AS total
       FROM ordenes WHERE estado = 'cobrada' AND cobrada_en BETWEEN :desde AND :hasta
      GROUP BY metodo_pago ORDER BY total DESC",
    $rango
)->fetchAll();

$porProducto = consulta(
    "SELECT i.nombre, SUM(i.cantidad) AS cantidad, SUM(i.precio * i.cantidad) AS total
       FROM orden_items i JOIN ordenes o ON o.id = i.orden_id
      WHERE o.estado = 'cobrada' AND o.cobrada_en BETWEEN :desde AND :hasta AND i.estado <> 'cancelado'
      GROUP BY i.nombre ORDER BY total DESC LIMIT 50",
    $rango
)->fetchAll();

$ordenes = consulta(
    "SELECT o.*, (SELECT COALESCE(SUM(i.cantidad), 0) FROM orden_items i WHERE i.orden_id = o.id AND i.estado <> 'cancelado') AS num_items
       FROM ordenes o
      WHERE (o.estado = 'cobrada' AND o.cobrada_en BETWEEN :desde AND :hasta)
         OR (o.estado = 'cancelada' AND o.creado_en BETWEEN :desde2 AND :hasta2)
      ORDER BY COALESCE(o.cobrada_en, o.creado_en) DESC",
    $rango + [':desde2' => $desde, ':hasta2' => $hasta]
)->fetchAll();

$tickets = (int) $resumen['tickets'];
responder([
    'desde'      => fechaIso($desde),
    'hasta'      => fechaIso($hasta),
    'tickets'    => $tickets,
    'total'      => (float) $resumen['total'],
    'descuentos' => (float) $resumen['descuentos'],
    'promedio'   => $tickets ? round((float) $resumen['total'] / $tickets, 2) : 0,
    'por_metodo' => array_map(fn($m) => ['metodo' => $m['metodo_pago'], 'tickets' => (int) $m['tickets'], 'total' => (float) $m['total']], $porMetodo),
    'por_producto' => array_map(fn($p) => ['nombre' => $p['nombre'], 'cantidad' => (int) $p['cantidad'], 'total' => (float) $p['total']], $porProducto),
    'ordenes'    => array_map('formatearOrden', $ordenes),
]);
