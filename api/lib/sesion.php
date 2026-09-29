<?php
// api/lib/sesion.php — Sesiones PHP, autenticación, roles y CSRF.
declare(strict_types=1);

function esHttps(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

function iniciarSesionSegura(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $cfg = config()['sesion'];
    session_name($cfg['nombre']);
    session_set_cookie_params([
        'lifetime' => (int) $cfg['lifetime'],
        'path'     => '/',
        'secure'   => esHttps(),   // en Hostinger siempre es HTTPS
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    ini_set('session.use_strict_mode', '1');
    ini_set('session.gc_maxlifetime', (string) $cfg['lifetime']);
    session_start();
}

/**
 * Usuario con sesión o null. Se relee de la base de datos en cada petición:
 * si el admin lo desactiva o le cambia el rol, surte efecto de inmediato.
 */
function usuarioActual(): ?array
{
    static $usuario = false;
    if ($usuario !== false) return $usuario;
    iniciarSesionSegura();
    $usuario = null;
    $id = $_SESSION['usuario_id'] ?? null;
    if ($id) {
        $u = consulta('SELECT id, email, nombre, rol FROM usuarios WHERE id = :id AND activo = 1', [':id' => $id])->fetch();
        if ($u) {
            $usuario = ['id' => (int) $u['id'], 'email' => $u['email'], 'nombre' => $u['nombre'], 'rol' => $u['rol']];
        } else {
            $_SESSION = [];
        }
    }
    return $usuario;
}

function exigirLogin(): array
{
    $usuario = usuarioActual();
    if (!$usuario) error('No autorizado. Inicia sesión.', 401);
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') verificarCsrf();
    return $usuario;
}

/** Exige sesión con uno de los roles indicados. */
function exigirRol(Rol ...$roles): array
{
    $usuario = exigirLogin();
    if (!in_array(Rol::from($usuario['rol']), $roles, true)) error('Permisos insuficientes.', 403);
    return $usuario;
}

function iniciarSesionUsuario(array $usuario): void
{
    iniciarSesionSegura();
    session_regenerate_id(true);
    $_SESSION = ['usuario_id' => (int) $usuario['id'], 'csrf' => bin2hex(random_bytes(32))];
}

function cerrarSesionUsuario(): void
{
    iniciarSesionSegura();
    $_SESSION = [];
    session_regenerate_id(true);
}

function tokenCsrf(): string
{
    iniciarSesionSegura();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}

/** Las acciones del personal deben traer la cabecera X-CSRF-Token de su sesión. */
function verificarCsrf(): void
{
    $enviado = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!is_string($enviado) || !hash_equals(tokenCsrf(), $enviado)) {
        error('La sesión expiró. Recarga la página.', 403);
    }
}

/**
 * Rechaza peticiones que modifican datos si vienen de otro sitio
 * (cabecera Origin distinta al dominio propio).
 */
function verificarOrigen(): void
{
    $origen = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origen === '') return; // peticiones del mismo sitio sin Origin (algunos navegadores en GET)
    // "https://cafedecaro.eniguala.com" → "cafedecaro.eniguala.com" (con puerto si lo hay)
    if (preg_replace('#^https?://#i', '', $origen) !== ($_SERVER['HTTP_HOST'] ?? '')) {
        error('Origen no permitido.', 403);
    }
}
