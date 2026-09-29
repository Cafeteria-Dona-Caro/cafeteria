<?php
// api/lib/validar.php — Validación de datos de entrada y tipos del dominio.
declare(strict_types=1);

enum Rol: string
{
    case Admin = 'admin';
    case Caja = 'caja';
    case Mesero = 'mesero';
    case Cocina = 'cocina';
}

enum EstadoOrden: string
{
    case Abierta = 'abierta';
    case EnPreparacion = 'en_preparacion';
    case Lista = 'lista';
    case Entregada = 'entregada';
    case Cobrada = 'cobrada';
    case Cancelada = 'cancelada';

    /** Una orden cobrada o cancelada ya no se puede modificar. */
    public function esFinal(): bool
    {
        return $this === self::Cobrada || $this === self::Cancelada;
    }

    /** Estados que puede poner cada rol con PATCH /ordenes/{id}/estado. */
    public static function permitidosPara(Rol $rol): array
    {
        return match ($rol) {
            Rol::Admin  => [self::Abierta, self::EnPreparacion, self::Lista, self::Entregada, self::Cancelada],
            Rol::Cocina => [self::Abierta, self::EnPreparacion, self::Lista],
            Rol::Caja   => [self::Entregada, self::Cancelada],
            Rol::Mesero => [self::Entregada],
        };
    }
}

enum MetodoPago: string
{
    case Efectivo = 'efectivo';
    case Tarjeta = 'tarjeta';
    case Transferencia = 'transferencia';
    case Vales = 'vales';
    case Mixto = 'mixto';
}

/** Cuerpo JSON de la petición. */
function cuerpoJson(): array
{
    static $datos = null;
    if ($datos !== null) return $datos;
    $tipo = $_SERVER['CONTENT_TYPE'] ?? '';
    if (!str_starts_with(strtolower($tipo), 'application/json')) error('Se esperaba JSON.', 415);
    $crudo = file_get_contents('php://input', false, null, 0, 65536);
    $datos = json_decode($crudo ?: 'null', true);
    if (!is_array($datos)) error('JSON no válido.');
    return $datos;
}

/** Texto limpio (sin caracteres de control), con longitud máxima. */
function texto(mixed $valor, int $max, string $campo, bool $obligatorio = false): string
{
    $t = is_scalar($valor) ? trim((string) preg_replace('/[\x00-\x1F\x7F]/u', '', (string) $valor)) : '';
    if ($obligatorio && $t === '') error("Falta $campo.");
    if (mb_strlen($t) > $max) error("$campo es demasiado largo (máx. $max caracteres).");
    return $t;
}

function entero(mixed $valor, string $campo, int $min = 1, int $max = PHP_INT_MAX): int
{
    if (!is_int($valor) && !(is_string($valor) && ctype_digit($valor))) error("$campo no válido.");
    $n = (int) $valor;
    if ($n < $min || $n > $max) error("$campo fuera de rango.");
    return $n;
}

function dinero(mixed $valor, string $campo, float $max = 100000): float
{
    if (!is_int($valor) && !is_float($valor) && !(is_string($valor) && is_numeric($valor))) error("$campo no válido.");
    $n = round((float) $valor, 2);
    if ($n < 0 || $n > $max) error("$campo fuera de rango.");
    return $n;
}

function email(mixed $valor): string
{
    $e = mb_strtolower(texto($valor, 255, 'el correo', true));
    if (!filter_var($e, FILTER_VALIDATE_EMAIL)) error('Correo no válido.');
    return $e;
}

function passwordNueva(mixed $valor): string
{
    if (!is_string($valor) || mb_strlen($valor) < 8) error('La contraseña debe tener al menos 8 caracteres.');
    if (strlen($valor) > 200) error('La contraseña es demasiado larga.');
    return $valor;
}

/** Fecha "YYYY-MM-DD" o ISO 8601 → DATETIME local. */
function fechaParametro(string $valor, bool $finDelDia = false): string
{
    try {
        $f = new DateTimeImmutable($valor);
    } catch (Exception) {
        error('Fecha no válida.');
    }
    $f = $f->setTimezone(new DateTimeZone(date_default_timezone_get()));
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $valor)) {
        $f = $finDelDia ? $f->setTime(23, 59, 59) : $f->setTime(0, 0, 0);
    }
    return $f->format('Y-m-d H:i:s');
}

function ipCliente(): string
{
    return substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
}
