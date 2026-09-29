<?php
// GET /api/mesas/mapa  → cada mesa con su orden activa (si tiene)   (mesero, admin)
declare(strict_types=1);

exigirRol(Rol::Mesero, Rol::Admin);

$mesas = consulta('SELECT id, numero, seccion, capacidad FROM mesas WHERE activa = 1 ORDER BY id')->fetchAll();
$ordenes = consulta(
    "SELECT o.*, (SELECT COALESCE(SUM(i.cantidad), 0) FROM orden_items i WHERE i.orden_id = o.id AND i.estado <> 'cancelado') AS num_items
       FROM ordenes o
      WHERE o.mesa_id IS NOT NULL AND o.estado NOT IN ('cobrada', 'cancelada')
      ORDER BY o.id"
)->fetchAll();

$porMesa = [];
foreach ($ordenes as $o) $porMesa[(int) $o['mesa_id']][] = formatearOrden($o);

responder(['mesas' => array_map(fn($m) => [
    'id'        => (int) $m['id'],
    'numero'    => $m['numero'],
    'seccion'   => $m['seccion'],
    'capacidad' => (int) $m['capacidad'],
    'ordenes'   => $porMesa[(int) $m['id']] ?? [],
], $mesas)]);
