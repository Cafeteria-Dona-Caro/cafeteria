<?php
// POST /api/usuarios  { email, nombre, rol, password }   (admin)
declare(strict_types=1);
require __DIR__ . '/_comun.php';

exigirRol(Rol::Admin);
$datos = cuerpoJson();
$email = email($datos['email'] ?? '');
$nombre = texto($datos['nombre'] ?? '', 100, 'el nombre', true);
$rol = Rol::tryFrom((string) ($datos['rol'] ?? '')) ?? error('Rol no válido.');
$password = passwordNueva($datos['password'] ?? null);
correoLibre($email);

consulta(
    'INSERT INTO usuarios (email, nombre, password, rol) VALUES (:e, :n, :p, :r)',
    [':e' => $email, ':n' => $nombre, ':p' => password_hash($password, PASSWORD_BCRYPT), ':r' => $rol->value]
);
responder(['usuario' => usuarioJson((int) obtenerDB()->lastInsertId())], 201);
