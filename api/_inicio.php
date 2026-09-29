<?php
// api/_inicio.php — Arranque común de la API: configuración, base de datos,
// sesión, seguridad y utilidades. Todos los endpoints lo incluyen primero.
declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);

const ROLES = ['admin', 'caja', 'mesero', 'cocina'];
const ESTADOS_ORDEN = ['abierta', 'en_preparacion', 'lista', 'cerrada', 'cancelada'];
const METODOS_PAGO = ['efectivo', 'tarjeta', 'transferencia', 'vales', 'mixto'];

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

set_exception_handler(function (Throwable $e): void {
    error_log('[cafedecaro] ' . $e);
    if (!headers_sent()) http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor.'], JSON_UNESCAPED_UNICODE);
});

/* ─── Configuración ─── */

function config(string $clave, $defecto = null)
{
    static $cfg = null;
    if ($cfg === null) {
        $ruta = __DIR__ . '/config.php';
        if (!is_file($ruta)) {
            responderError('Falta api/config.php. Copia api/config.example.php y llénalo.', 500);
        }
        $cfg = require $ruta;
    }
    return $cfg[$clave] ?? $defecto;
}

/* ─── Base de datos ─── */

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', config('db_host'), config('db_nombre'));
        $pdo = new PDO($dsn, config('db_usuario'), config('db_clave'), [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_STRINGIFY_FETCHES => false,
        ]);
        // Todas las fechas en UTC; el navegador las muestra en hora local
        $pdo->exec("SET time_zone = '+00:00'");
    }
    return $pdo;
}

/** Ejecuta una consulta preparada y devuelve el statement. */
function sql(string $consulta, array $params = []): PDOStatement
{
    $st = db()->prepare($consulta);
    $st->execute($params);
    return $st;
}

/* ─── Respuestas ─── */

function responder($datos, int $codigo = 200): void
{
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function responderError(string $mensaje, int $codigo = 400): void
{
    responder(['error' => $mensaje], $codigo);
}

/** DATETIME de MySQL (UTC) → ISO 8601 para el navegador. */
function fechaIso(?string $fecha): ?string
{
    return $fecha ? str_replace(' ', 'T', $fecha) . 'Z' : null;
}

/** ISO 8601 del navegador → DATETIME UTC. */
function fechaSql(string $iso): string
{
    try {
        $f = new DateTimeImmutable($iso);
    } catch (Exception $e) {
        responderError('Fecha no válida.');
    }
    return $f->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
}

/* ─── Entrada ─── */

function metodo(): string
{
    return $_SERVER['REQUEST_METHOD'] ?? 'GET';
}

/** Cuerpo JSON de la petición (solo se aceptan POST con Content-Type JSON). */
function entrada(): array
{
    static $datos = null;
    if ($datos !== null) return $datos;
    if (metodo() !== 'POST') responderError('Método no permitido.', 405);
    $tipo = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($tipo, 'application/json') !== 0) responderError('Se esperaba JSON.', 415);
    $crudo = file_get_contents('php://input', false, null, 0, 65536);
    $datos = json_decode($crudo ?: '', true);
    if (!is_array($datos)) responderError('JSON no válido.');
    return $datos;
}

/** Texto limpio: sin espacios sobrantes, sin caracteres de control, con longitud máxima. */
function texto($valor, int $max, bool $obligatorio = false, string $campo = 'campo'): string
{
    $t = is_scalar($valor) ? trim(preg_replace('/[\x00-\x1F\x7F]/u', '', (string) $valor) ?? '') : '';
    if ($obligatorio && $t === '') responderError("Falta $campo.");
    if (mb_strlen($t) > $max) responderError("$campo es demasiado largo (máx. $max caracteres).");
    return $t;
}

function entero($valor, string $campo = 'id'): int
{
    if (!is_numeric($valor) || (int) $valor <= 0) responderError("$campo no válido.");
    return (int) $valor;
}

function ipCliente(): string
{
    // En Hostinger REMOTE_ADDR ya es la IP real del visitante
    return substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
}

/* ─── Sesión y permisos ─── */

function iniciarSesion(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_name('cafedecaro');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $https,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    ini_set('session.use_strict_mode', '1');
    ini_set('session.gc_maxlifetime', (string) (12 * 3600)); // un turno
    session_start();
}

/** Usuario con sesión (recargado de la BD para reflejar cambios de rol o bajas) o null. */
function usuarioActual(): ?array
{
    static $usuario = false;
    if ($usuario !== false) return $usuario;
    iniciarSesion();
    $usuario = null;
    if (!empty($_SESSION['usuario_id'])) {
        $u = sql('SELECT id, email, nombre, rol, activo FROM usuarios WHERE id = ?', [$_SESSION['usuario_id']])->fetch();
        if ($u && (int) $u['activo'] === 1) {
            $usuario = ['id' => (int) $u['id'], 'email' => $u['email'], 'nombre' => $u['nombre'], 'rol' => $u['rol']];
        } else {
            $_SESSION = [];
        }
    }
    return $usuario;
}

function tokenCsrf(): string
{
    iniciarSesion();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}

/** Exige la cabecera X-CSRF-Token en peticiones que modifican datos del personal. */
function verificarCsrf(): void
{
    $enviado = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!is_string($enviado) || !hash_equals(tokenCsrf(), $enviado)) {
        responderError('La sesión expiró. Recarga la página.', 403);
    }
}

/**
 * Exige sesión con uno de los roles indicados. En POST también exige CSRF.
 * Devuelve el usuario.
 */
function requerirRol(array $roles): array
{
    $u = usuarioActual();
    if (!$u) responderError('Inicia sesión.', 401);
    if (!in_array($u['rol'], $roles, true)) responderError('No tienes permiso para esta acción.', 403);
    if (metodo() === 'POST') verificarCsrf();
    return $u;
}

/* ─── Órdenes ─── */

/** Recalcula el total de una orden a partir de sus ítems (única fuente de verdad). */
function recalcularTotal(int $ordenId): void
{
    sql('UPDATE ordenes
            SET total = (SELECT COALESCE(SUM(precio * cantidad), 0) FROM orden_items WHERE orden_id = ?)
          WHERE id = ?', [$ordenId, $ordenId]);
}

function formatearOrden(array $o): array
{
    return [
        'id' => (int) $o['id'],
        'mesa' => $o['mesa'],
        'cliente' => $o['cliente'],
        'estado' => $o['estado'],
        'origen' => $o['origen'],
        'total' => (float) $o['total'],
        'estado_pago' => $o['estado_pago'],
        'metodo_pago' => $o['metodo_pago'],
        'num_items' => isset($o['num_items']) ? (int) $o['num_items'] : null,
        'creado_en' => fechaIso($o['creado_en']),
        'actualizado_en' => fechaIso($o['actualizado_en']),
        'pagado_en' => fechaIso($o['pagado_en'] ?? null),
    ];
}

function formatearItem(array $i): array
{
    return [
        'id' => (int) $i['id'],
        'producto_id' => $i['producto_id'] !== null ? (int) $i['producto_id'] : null,
        'nombre' => $i['nombre'],
        'precio' => (float) $i['precio'],
        'cantidad' => (int) $i['cantidad'],
        'nota' => $i['nota'],
        'creado_en' => fechaIso($i['creado_en']),
    ];
}

function formatearProducto(array $p): array
{
    return [
        'id' => (int) $p['id'],
        'nombre' => $p['nombre'],
        'categoria' => $p['categoria'],
        'precio' => (float) $p['precio'],
        'activo' => (bool) $p['activo'],
    ];
}
