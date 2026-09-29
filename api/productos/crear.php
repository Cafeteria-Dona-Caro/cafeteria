<?php
// POST /api/productos  { nombre, precio, categoria_id | categoria, descripcion? }   (admin)
declare(strict_types=1);
require __DIR__ . '/_comun.php';

exigirRol(Rol::Admin);
$datos = cuerpoJson();
$nombre = texto($datos['nombre'] ?? '', 150, 'el nombre', true);
$precio = dinero($datos['precio'] ?? null, 'El precio');
$descripcion = texto($datos['descripcion'] ?? '', 1000, 'la descripción');
$categoriaId = categoriaDe($datos);
if (duplicado($categoriaId, $nombre)) error('Ya existe un producto con ese nombre en esa categoría.', 409);

consulta(
    'INSERT INTO productos (categoria_id, nombre, descripcion, precio, orden)
     SELECT :c, :n, :d, :p, COALESCE(MAX(orden), 0) + 1 FROM productos WHERE categoria_id = :c2',
    [':c' => $categoriaId, ':n' => $nombre, ':d' => $descripcion ?: null, ':p' => $precio, ':c2' => $categoriaId]
);
$id = (int) obtenerDB()->lastInsertId();
publicarEvento('producto_actualizado', ['producto_id' => $id]);
responder(['producto' => productoJson($id)], 201);
