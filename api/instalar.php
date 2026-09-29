<?php
// api/instalar.php — Instalación inicial (se usa UNA sola vez).
// Crea las tablas, el primer administrador y, opcionalmente, carga el menú.
// En cuanto existe un usuario, esta página se bloquea sola.
declare(strict_types=1);
require __DIR__ . '/_inicio.php';

header('Content-Type: text/html; charset=utf-8');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'");

function e(string $t): string
{
    return htmlspecialchars($t, ENT_QUOTES, 'UTF-8');
}

function pagina(string $titulo, string $cuerpo, int $codigo = 200): void
{
    http_response_code($codigo);
    echo '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<meta name="robots" content="noindex"><title>' . e($titulo) . '</title><style>'
        . 'body{font-family:system-ui,sans-serif;background:#1a1a2e;color:#eaeaea;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px}'
        . '.c{background:#16213e;border:1px solid #2c3a61;border-radius:14px;padding:24px;max-width:420px;width:100%}'
        . 'label{display:block;margin:12px 0 4px;font-size:14px;color:#8a8a9a}'
        . 'input{width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid #2c3a61;background:#1a1a2e;color:#eaeaea;font-size:16px}'
        . 'button,a.b{display:block;width:100%;margin-top:20px;padding:14px;border:0;border-radius:10px;background:#e94560;color:#fff;font-weight:700;font-size:16px;text-align:center;text-decoration:none;cursor:pointer}'
        . '.err{background:rgba(231,76,60,.15);color:#ff8a7a;padding:10px;border-radius:10px}.ok{color:#2ecc71}'
        . '</style></head><body><div class="c"><h1>' . e($titulo) . '</h1>' . $cuerpo . '</div></body></html>';
    exit;
}

function hayUsuarios(): bool
{
    try {
        return (int) sql('SELECT COUNT(*) FROM usuarios')->fetchColumn() > 0;
    } catch (PDOException $e) {
        return false; // la tabla todavía no existe
    }
}

try {
    db();
} catch (PDOException $e) {
    error_log('[cafedecaro] instalar: ' . $e->getMessage());
    pagina('Sin conexión a la base de datos',
        '<p class="err">No se pudo conectar a MySQL. Revisa los datos en <code>api/config.php</code>.</p>', 500);
}

if (hayUsuarios()) {
    pagina('Ya instalado', '<p>El sistema ya tiene usuarios, así que el instalador está bloqueado.</p><a class="b" href="../login.html">Ir al inicio de sesión</a>', 403);
}

$claveConfig = (string) config('clave_instalacion', '');
if ($claveConfig === '' || str_starts_with($claveConfig, 'CAMBIA')) {
    pagina('Falta configurar', '<p class="err">Define <code>clave_instalacion</code> en <code>api/config.php</code> antes de instalar.</p>', 500);
}

$error = '';
$v = ['email' => '', 'nombre' => ''];

if (metodo() === 'POST') {
    $v['email'] = mb_strtolower(trim((string) ($_POST['email'] ?? '')));
    $v['nombre'] = trim((string) ($_POST['nombre'] ?? ''));
    $password = (string) ($_POST['password'] ?? '');

    if (!hash_equals($claveConfig, (string) ($_POST['clave'] ?? ''))) {
        sleep(2);
        $error = 'La clave de instalación no coincide con la de config.php.';
    } elseif (!filter_var($v['email'], FILTER_VALIDATE_EMAIL) || mb_strlen($v['email']) > 120) {
        $error = 'Escribe un correo válido.';
    } elseif (mb_strlen($password) < 8) {
        $error = 'La contraseña debe tener al menos 8 caracteres.';
    } else {
        // Crear tablas
        $esquema = (string) file_get_contents(__DIR__ . '/_esquema.sql');
        $esquema = preg_replace('/^\s*--.*$/m', '', $esquema);
        foreach (array_filter(array_map('trim', explode(';', $esquema))) as $sentencia) {
            db()->exec($sentencia);
        }

        if (hayUsuarios()) {
            pagina('Ya instalado', '<p>Otra persona terminó la instalación primero.</p>', 409);
        }

        sql("INSERT INTO usuarios (email, nombre, rol, password_hash) VALUES (?, ?, 'admin', ?)",
            [$v['email'], mb_substr($v['nombre'], 0, 80), password_hash($password, PASSWORD_DEFAULT)]);

        $agregados = 0;
        if (!empty($_POST['menu'])) {
            $menu = json_decode((string) file_get_contents(__DIR__ . '/../data/menu-inicial.json'), true) ?: [];
            $st = db()->prepare('INSERT IGNORE INTO productos (nombre, categoria, precio, activo) VALUES (?, ?, ?, ?)');
            foreach ($menu as $p) {
                $st->execute([$p['nombre'], $p['categoria'], $p['precio'], isset($p['activo']) ? (int) (bool) $p['activo'] : 1]);
                $agregados += $st->rowCount();
            }
        }

        pagina('¡Listo!',
            '<p class="ok">Tablas creadas y administrador <strong>' . e($v['email']) . '</strong> registrado.</p>'
            . ($agregados ? '<p>Se cargaron ' . $agregados . ' productos del menú.</p>' : '')
            . '<p>Este instalador ya quedó bloqueado. Por orden, puedes borrar <code>api/instalar.php</code> del servidor.</p>'
            . '<a class="b" href="../login.html">Iniciar sesión</a>');
    }
}

pagina('Instalar Café de Caro',
    ($error ? '<p class="err">' . e($error) . '</p>' : '<p>Crea las tablas y la cuenta del administrador.</p>')
    . '<form method="post" autocomplete="off">'
    . '<label for="clave">Clave de instalación (la de config.php)</label><input id="clave" name="clave" type="password" required>'
    . '<label for="email">Correo del administrador</label><input id="email" name="email" type="email" required value="' . e($v['email']) . '">'
    . '<label for="nombre">Nombre</label><input id="nombre" name="nombre" value="' . e($v['nombre']) . '">'
    . '<label for="password">Contraseña (mín. 8 caracteres)</label><input id="password" name="password" type="password" minlength="8" required autocomplete="new-password">'
    . '<label><input type="checkbox" name="menu" value="1" checked style="width:auto"> Cargar el menú inicial</label>'
    . '<button type="submit">Instalar</button></form>');
