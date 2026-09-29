<?php
// api/usuarios.php — Personal (solo admin).
//   GET                                                        → lista
//   POST { accion: "guardar", id?, email, nombre, rol, activo?, password? }
//        · sin id  → crea (password obligatoria, mín. 8 caracteres)
//        · con id  → actualiza; si viene password, la restablece
//   POST { accion: "eliminar", id }
// Nadie puede cambiar su propio rol, desactivarse ni eliminarse.
declare(strict_types=1);
require __DIR__ . '/_inicio.php';

$yo = requerirRol(['admin']);

function formatearUsuario(array $u): array
{
    return [
        'id' => (int) $u['id'],
        'email' => $u['email'],
        'nombre' => $u['nombre'],
        'rol' => $u['rol'],
        'activo' => (bool) $u['activo'],
        'creado_en' => fechaIso($u['creado_en']),
    ];
}

function passwordValida($valor): string
{
    if (!is_string($valor) || mb_strlen($valor) < 8) responderError('La contraseña debe tener al menos 8 caracteres.');
    if (strlen($valor) > 200) responderError('La contraseña es demasiado larga.');
    return $valor;
}

if (metodo() === 'GET') {
    $filas = sql("SELECT * FROM usuarios ORDER BY FIELD(rol, 'admin','caja','mesero','cocina'), nombre, email")->fetchAll();
    responder(['usuarios' => array_map('formatearUsuario', $filas)]);
}

$datos = entrada();

switch ($datos['accion'] ?? '') {
    case 'guardar':
        $email = mb_strtolower(texto($datos['email'] ?? '', 120, true, 'el correo'));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) responderError('Correo no válido.');
        $nombre = texto($datos['nombre'] ?? '', 80, false, 'el nombre');
        $rol = $datos['rol'] ?? '';
        if (!in_array($rol, ROLES, true)) responderError('Rol no válido.');
        $activo = array_key_exists('activo', $datos) ? (int) (bool) $datos['activo'] : 1;

        $id = isset($datos['id']) && $datos['id'] !== null && $datos['id'] !== '' ? entero($datos['id']) : 0;

        $otro = sql('SELECT id FROM usuarios WHERE email = ? AND id <> ?', [$email, $id])->fetchColumn();
        if ($otro) responderError('Ya existe un usuario con ese correo.', 409);

        if ($id === 0) {
            $hash = password_hash(passwordValida($datos['password'] ?? ''), PASSWORD_DEFAULT);
            sql('INSERT INTO usuarios (email, nombre, rol, activo, password_hash) VALUES (?, ?, ?, ?, ?)',
                [$email, $nombre, $rol, $activo, $hash]);
            $id = (int) db()->lastInsertId();
            $codigo = 201;
        } else {
            $actual = sql('SELECT * FROM usuarios WHERE id = ?', [$id])->fetch();
            if (!$actual) responderError('El usuario no existe.', 404);
            if ($id === $yo['id'] && ($rol !== $actual['rol'] || $activo !== 1)) {
                responderError('No puedes cambiar tu propio rol ni desactivarte.', 403);
            }
            sql('UPDATE usuarios SET email = ?, nombre = ?, rol = ?, activo = ? WHERE id = ?', [$email, $nombre, $rol, $activo, $id]);
            if (!empty($datos['password'])) {
                sql('UPDATE usuarios SET password_hash = ? WHERE id = ?',
                    [password_hash(passwordValida($datos['password']), PASSWORD_DEFAULT), $id]);
            }
            $codigo = 200;
        }
        responder(['usuario' => formatearUsuario(sql('SELECT * FROM usuarios WHERE id = ?', [$id])->fetch())], $codigo);

    case 'eliminar':
        $id = entero($datos['id'] ?? null);
        if ($id === $yo['id']) responderError('No puedes eliminarte a ti mismo.', 403);
        sql('DELETE FROM usuarios WHERE id = ?', [$id]);
        responder(['ok' => true]);

    default:
        responderError('Acción no válida.');
}
