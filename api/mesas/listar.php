<?php
// GET /api/mesas  → mesas activas (público: cliente.html las usa para validar el QR)
declare(strict_types=1);

$filas = consulta('SELECT id, numero, seccion, capacidad FROM mesas WHERE activa = 1 ORDER BY id')->fetchAll();
responder(['mesas' => array_map(fn($m) => [
    'id' => (int) $m['id'], 'numero' => $m['numero'], 'seccion' => $m['seccion'], 'capacidad' => (int) $m['capacidad'],
], $filas)]);
