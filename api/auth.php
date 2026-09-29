<?php
// api/auth.php — Sesión del personal.
//   GET                                   → { usuario|null, csrf }
//   POST { accion: "entrar", email, password }
//   POST { accion: "salir" }
declare(strict_types=1);
require __DIR__ . '/_inicio.php';

const MAX_INTENTOS = 8;       // intentos fallidos…
const VENTANA_MINUTOS = 15;   // …por IP en esta ventana

/** Usuario con sesión y lo que la interfaz necesita saber de sus permisos. */
function sesion(): array
{
    $u = usuarioActual();
    if ($u) $u['puede_cobrar'] = in_array($u['rol'], (array) config('roles_cobro', ['admin']), true);
    return ['usuario' => $u, 'csrf' => tokenCsrf()];
}

if (metodo() === 'GET') {
    responder(sesion());
}

$datos = entrada();
$accion = $datos['accion'] ?? '';

if ($accion === 'salir') {
    iniciarSesion();
    verificarCsrf();
    $_SESSION = [];
    session_regenerate_id(true);
    responder(['ok' => true, 'csrf' => tokenCsrf()]);
}

if ($accion !== 'entrar') responderError('Acción no válida.');

$email = mb_strtolower(texto($datos['email'] ?? '', 120, true, 'el correo'));
$password = is_string($datos['password'] ?? null) ? $datos['password'] : '';
if ($password === '' || strlen($password) > 200) responderError('Escribe tu contraseña.');

$ip = ipCliente();
sql('DELETE FROM intentos_login WHERE creado_en < UTC_TIMESTAMP() - INTERVAL 1 DAY');
$fallidos = (int) sql(
    'SELECT COUNT(*) FROM intentos_login WHERE ip = ? AND creado_en > UTC_TIMESTAMP() - INTERVAL ' . VENTANA_MINUTOS . ' MINUTE',
    [$ip]
)->fetchColumn();
if ($fallidos >= MAX_INTENTOS) {
    responderError('Demasiados intentos. Espera unos minutos.', 429);
}

$u = sql('SELECT id, password_hash, activo FROM usuarios WHERE email = ?', [$email])->fetch();

// password_verify también se ejecuta si el usuario no existe, para no revelar qué correos existen
$hash = $u['password_hash'] ?? '$2y$12$ZDduxpEiQzcmF6dlqc7DSO5cbVdExZN5JZh69cXCpju0AUxaBBvg6';
$valido = password_verify($password, $hash) && $u && (int) $u['activo'] === 1;

if (!$valido) {
    sql('INSERT INTO intentos_login (ip, email) VALUES (?, ?)', [$ip, $email]);
    responderError('Correo o contraseña incorrectos.', 401);
}

if (password_needs_rehash($u['password_hash'], PASSWORD_DEFAULT)) {
    sql('UPDATE usuarios SET password_hash = ? WHERE id = ?', [password_hash($password, PASSWORD_DEFAULT), $u['id']]);
}
sql('DELETE FROM intentos_login WHERE ip = ?', [$ip]);

iniciarSesion();
session_regenerate_id(true);
$_SESSION = ['usuario_id' => (int) $u['id']];

responder(sesion());
