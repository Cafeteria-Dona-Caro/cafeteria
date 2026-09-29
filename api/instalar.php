<?php
// GET|POST /api/instalar — Instalación inicial (se usa UNA sola vez).
// Crea las tablas (db/esquema.sql), carga los datos iniciales (db/semilla.sql)
// y el primer administrador. En cuanto existe un usuario, se bloquea sola.
declare(strict_types=1);

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');

function e(string $t): string
{
    return htmlspecialchars($t, ENT_QUOTES, 'UTF-8');
}

function pagina(string $titulo, string $cuerpo, int $codigo = 200): never
{
    http_response_code($codigo);
    echo '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<meta name="robots" content="noindex"><title>' . e($titulo) . '</title><style>'
        . 'body{font-family:system-ui,sans-serif;background:#1a1a2e;color:#eaeaea;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px}'
        . '.c{background:#16213e;border:1px solid #2c3a61;border-radius:14px;padding:24px;max-width:420px;width:100%;box-sizing:border-box}'
        . 'label{display:block;margin:12px 0 4px;font-size:14px;color:#8a8a9a}'
        . 'input{width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid #2c3a61;background:#1a1a2e;color:#eaeaea;font-size:16px}'
        . 'button,a.b{display:block;width:100%;margin-top:20px;padding:14px;border:0;border-radius:10px;background:#e94560;color:#fff;font-weight:700;font-size:16px;text-align:center;text-decoration:none;cursor:pointer}'
        . '.err{background:rgba(231,76,60,.15);color:#ff8a7a;padding:10px;border-radius:10px}.ok{color:#2ecc71}'
        . '</style></head><body><div class="c"><h1>' . e($titulo) . '</h1>' . $cuerpo . '</div></body></html>';
    exit;
}

/** Ejecuta un archivo .sql sentencia por sentencia. */
function ejecutarSql(string $archivo): void
{
    $sql = (string) file_get_contents($archivo);
    $sql = preg_replace('/^\s*--.*$/m', '', $sql);
    foreach (array_filter(array_map('trim', explode(';', $sql))) as $sentencia) {
        obtenerDB()->exec($sentencia);
    }
}

function hayUsuarios(): bool
{
    try {
        return (int) consulta('SELECT COUNT(*) FROM usuarios')->fetchColumn() > 0;
    } catch (PDOException) {
        return false; // la tabla todavía no existe
    }
}

try {
    obtenerDB();
} catch (PDOException $ex) {
    error_log('[cafedecaro] instalar: ' . $ex->getMessage());
    pagina('Sin conexión a la base de datos', '<p class="err">No se pudo conectar a MariaDB. Revisa <code>config/config.php</code>.</p>', 500);
}

if (hayUsuarios()) {
    pagina('Ya instalado', '<p>El sistema ya tiene usuarios, así que el instalador está bloqueado.</p><a class="b" href="../login.html">Ir al inicio de sesión</a>', 403);
}

$clave = (string) (config()['app']['clave_instalacion'] ?? '');
if ($clave === '' || str_starts_with($clave, 'CAMBIA')) {
    pagina('Falta configurar', '<p class="err">Define <code>clave_instalacion</code> en <code>config/config.php</code> antes de instalar.</p>', 500);
}

$error = '';
$v = ['email' => '', 'nombre' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $v['email'] = mb_strtolower(trim((string) ($_POST['email'] ?? '')));
    $v['nombre'] = trim((string) ($_POST['nombre'] ?? ''));
    $password = (string) ($_POST['password'] ?? '');

    if (!hash_equals($clave, (string) ($_POST['clave'] ?? ''))) {
        sleep(2);
        $error = 'La clave de instalación no coincide con la de config.php.';
    } elseif (!filter_var($v['email'], FILTER_VALIDATE_EMAIL) || mb_strlen($v['email']) > 255) {
        $error = 'Escribe un correo válido.';
    } elseif ($v['nombre'] === '' || mb_strlen($v['nombre']) > 100) {
        $error = 'Escribe tu nombre.';
    } elseif (mb_strlen($password) < 8) {
        $error = 'La contraseña debe tener al menos 8 caracteres.';
    } else {
        ejecutarSql(__DIR__ . '/../db/esquema.sql');
        if (hayUsuarios()) pagina('Ya instalado', '<p>Otra persona terminó la instalación primero.</p>', 409);
        if (!empty($_POST['semilla'])) ejecutarSql(__DIR__ . '/../db/semilla.sql');

        consulta("INSERT INTO usuarios (email, nombre, password, rol) VALUES (:e, :n, :p, 'admin')",
            [':e' => $v['email'], ':n' => $v['nombre'], ':p' => password_hash($password, PASSWORD_BCRYPT)]);

        $productos = (int) consulta('SELECT COUNT(*) FROM productos')->fetchColumn();
        $mesas = (int) consulta('SELECT COUNT(*) FROM mesas')->fetchColumn();
        pagina('¡Listo!',
            '<p class="ok">Base de datos creada y administrador <strong>' . e($v['email']) . '</strong> registrado.</p>'
            . "<p>Menú: $productos productos · Mesas: $mesas.</p>"
            . '<p>El instalador ya quedó bloqueado.</p>'
            . '<a class="b" href="../login.html">Iniciar sesión</a>');
    }
}

pagina('Instalar Café de Caro',
    ($error ? '<p class="err">' . e($error) . '</p>' : '<p>Crea las tablas, carga el menú y la cuenta del administrador.</p>')
    . '<form method="post" autocomplete="off">'
    . '<label for="clave">Clave de instalación (la de config.php)</label><input id="clave" name="clave" type="password" required>'
    . '<label for="email">Correo del administrador</label><input id="email" name="email" type="email" required value="' . e($v['email']) . '">'
    . '<label for="nombre">Nombre</label><input id="nombre" name="nombre" required maxlength="100" value="' . e($v['nombre']) . '">'
    . '<label for="password">Contraseña (mín. 8 caracteres)</label><input id="password" name="password" type="password" minlength="8" required autocomplete="new-password">'
    . '<label><input type="checkbox" name="semilla" value="1" checked style="width:auto"> Cargar menú y mesas iniciales (db/semilla.sql)</label>'
    . '<button type="submit">Instalar</button></form>');
