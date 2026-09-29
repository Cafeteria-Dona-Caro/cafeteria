<?php
// Utilidades de usuarios (admin)
declare(strict_types=1);

function usuarioJson(int $id): array
{
    $u = consulta('SELECT id, email, nombre, rol, activo, creado_en FROM usuarios WHERE id = :id', [':id' => $id])->fetch();
    if (!$u) error('El usuario no existe.', 404);
    return ['id' => (int) $u['id'], 'email' => $u['email'], 'nombre' => $u['nombre'], 'rol' => $u['rol'],
            'activo' => (bool) $u['activo'], 'creado_en' => fechaIso($u['creado_en'])];
}

function correoLibre(string $email, int $excepto = 0): void
{
    if (consulta('SELECT 1 FROM usuarios WHERE email = :e AND id <> :id', [':e' => $email, ':id' => $excepto])->fetch()) {
        error('Ya existe un usuario con ese correo.', 409);
    }
}
