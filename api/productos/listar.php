<?php
// GET /api/productos            → menú público (solo disponibles)
// GET /api/productos?todos=1    → incluye no disponibles (admin)
declare(strict_types=1);

$todos = !empty($_GET['todos']);
if ($todos) exigirRol(Rol::Admin);

$filas = consulta(
    'SELECT p.*, c.nombre AS categoria
       FROM productos p JOIN categorias c ON c.id = p.categoria_id
      WHERE (:todos = 1 OR (p.disponible = 1 AND c.activa = 1))
      ORDER BY c.orden, c.nombre, p.orden, p.nombre',
    [':todos' => $todos ? 1 : 0]
)->fetchAll();

$categorias = consulta('SELECT id, nombre, orden FROM categorias ORDER BY orden, nombre')->fetchAll();

responder([
    'categorias' => array_map(fn($c) => ['id' => (int) $c['id'], 'nombre' => $c['nombre']], $categorias),
    'productos'  => array_map(fn($p) => [
        'id'           => (int) $p['id'],
        'categoria_id' => (int) $p['categoria_id'],
        'categoria'    => $p['categoria'],
        'nombre'       => $p['nombre'],
        'descripcion'  => $p['descripcion'] ?? '',
        'precio'       => (float) $p['precio'],
        'disponible'   => (bool) $p['disponible'],
    ], $filas),
]);
