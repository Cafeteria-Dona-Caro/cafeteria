<?php
// PUT /api/usuarios/{id}  { email?, nombre?, rol?, activo?, password? }   (admin)
// Nadie puede cambiar su propio rol ni desactivarse.
declare(strict_types=1);
require __DIR__ . '/_comun.php';

$yo = exigirRol(Rol::Admin);
[$id] = $params;
$actual = usuarioJson($id);
$datos = cuerpoJson();

$email = array_key_exists('email', $datos) ? email($datos['email']) : $actual['email'];
$nombre = array_key_exists('nombre', $datos) ? texto($datos['nombre'], 100, 'el nombre', true) : $actual['nombre'];
$rol = array_key_exists('rol', $datos) ? (Rol::tryFrom((string) $datos['rol']) ?? error('Rol no válido.'))->value : $actual['rol'];
$activo = array_key_exists('activo', $datos) ? (bool) $datos['activo'] : $actual['activo'];

if ($id === $yo['id'] && ($rol !== $actual['rol'] || !$activo)) {
    error('No puedes cambiar tu propio rol ni desactivarte.', 403);
}
correoLibre($email, $id);

consulta(
    'UPDATE usuarios SET email = :e, nombre = :n, rol = :r, activo = :a WHERE id = :id',
    [':e' => $email, ':n' => $nombre, ':r' => $rol, ':a' => $activo ? 1 : 0, ':id' => $id]
);
if (!empty($datos['password'])) {
    consulta('UPDATE usuarios SET password = :p WHERE id = :id',
        [':p' => password_hash(passwordNueva($datos['password']), PASSWORD_BCRYPT), ':id' => $id]);
}
responder(['usuario' => usuarioJson($id)]);
