<?php
// POST /api/auth/login  { email, password }
declare(strict_types=1);

const MAX_INTENTOS = 5;      // intentos fallidos por IP…
const VENTANA_MINUTOS = 15;  // …en esta ventana

$datos = cuerpoJson();
$email = mb_strtolower(texto($datos['email'] ?? '', 255, 'el correo', true));
$password = is_string($datos['password'] ?? null) ? $datos['password'] : '';
if ($password === '' || strlen($password) > 200) error('Escribe tu contraseña.');

$ip = ipCliente();
consulta('DELETE FROM intentos_login WHERE creado_en < NOW() - INTERVAL 1 DAY');
$fallidos = (int) consulta(
    'SELECT COUNT(*) FROM intentos_login WHERE ip = :ip AND creado_en > NOW() - INTERVAL ' . VENTANA_MINUTOS . ' MINUTE',
    [':ip' => $ip]
)->fetchColumn();
if ($fallidos >= MAX_INTENTOS) error('Demasiados intentos. Espera 15 minutos.', 429);

$u = consulta('SELECT id, password, activo FROM usuarios WHERE email = :email', [':email' => $email])->fetch();

// password_verify se ejecuta aunque el correo no exista, para no revelar qué correos hay
$hash = $u['password'] ?? '$2y$12$ZDduxpEiQzcmF6dlqc7DSO5cbVdExZN5JZh69cXCpju0AUxaBBvg6';
$valido = password_verify($password, $hash) && $u && (int) $u['activo'] === 1;

if (!$valido) {
    consulta('INSERT INTO intentos_login (ip, email) VALUES (:ip, :email)', [':ip' => $ip, ':email' => $email]);
    error('Correo o contraseña incorrectos.', 401);
}

if (password_needs_rehash($u['password'], PASSWORD_BCRYPT)) {
    consulta('UPDATE usuarios SET password = :p WHERE id = :id', [':p' => password_hash($password, PASSWORD_BCRYPT), ':id' => $u['id']]);
}
consulta('DELETE FROM intentos_login WHERE ip = :ip', [':ip' => $ip]);

iniciarSesionUsuario($u);
require __DIR__ . '/yo.php';
