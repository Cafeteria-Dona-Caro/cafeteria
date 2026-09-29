<?php
// PATCH /api/productos/{id}/estado  { disponible: true|false }   (admin)
declare(strict_types=1);
require __DIR__ . '/_comun.php';

exigirRol(Rol::Admin);
[$id] = $params;
productoJson($id);
$datos = cuerpoJson();
if (!is_bool($datos['disponible'] ?? null)) error('Indica disponible: true o false.');

consulta('UPDATE productos SET disponible = :d WHERE id = :id', [':d' => $datos['disponible'] ? 1 : 0, ':id' => $id]);
publicarEvento('producto_actualizado', ['producto_id' => $id]);
responder(['producto' => productoJson($id)]);
