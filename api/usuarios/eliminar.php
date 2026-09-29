<?php
// DELETE /api/usuarios/{id}   (admin) — no se puede eliminar a uno mismo
declare(strict_types=1);
require __DIR__ . '/_comun.php';

$yo = exigirRol(Rol::Admin);
[$id] = $params;
if ($id === $yo['id']) error('No puedes eliminarte a ti mismo.', 403);
usuarioJson($id);
consulta('DELETE FROM usuarios WHERE id = :id', [':id' => $id]);
responder(['ok' => true]);
