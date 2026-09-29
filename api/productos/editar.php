<?php
// PUT /api/productos/{id}  { nombre?, precio?, descripcion?, categoria_id? | categoria? }   (admin)
declare(strict_types=1);
require __DIR__ . '/_comun.php';

exigirRol(Rol::Admin);
[$id] = $params;
$actual = productoJson($id);
$datos = cuerpoJson();

$nombre = array_key_exists('nombre', $datos) ? texto($datos['nombre'], 150, 'el nombre', true) : $actual['nombre'];
$precio = array_key_exists('precio', $datos) ? dinero($datos['precio'], 'El precio') : $actual['precio'];
$descripcion = array_key_exists('descripcion', $datos) ? texto($datos['descripcion'], 1000, 'la descripción') : $actual['descripcion'];
$categoriaId = (isset($datos['categoria_id']) || isset($datos['categoria'])) ? categoriaDe($datos) : $actual['categoria_id'];
if (duplicado($categoriaId, $nombre, $id)) error('Ya existe un producto con ese nombre en esa categoría.', 409);

consulta(
    'UPDATE productos SET nombre = :n, precio = :p, descripcion = :d, categoria_id = :c WHERE id = :id',
    [':n' => $nombre, ':p' => $precio, ':d' => $descripcion ?: null, ':c' => $categoriaId, ':id' => $id]
);
publicarEvento('producto_actualizado', ['producto_id' => $id]);
responder(['producto' => productoJson($id)]);
