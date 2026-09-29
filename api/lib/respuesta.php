<?php
// api/lib/respuesta.php — Respuestas JSON uniformes.
declare(strict_types=1);

function responder(mixed $datos, int $codigo = 200): never
{
    if (!headers_sent()) {
        http_response_code($codigo);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
    }
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function error(string $mensaje, int $codigo = 400): never
{
    responder(['error' => $mensaje], $codigo);
}

/** DATETIME local de la BD → ISO 8601 con zona ("2026-09-29T14:05:00-06:00"). */
function fechaIso(?string $fecha): ?string
{
    return $fecha ? (new DateTimeImmutable($fecha))->format(DATE_ATOM) : null;
}

/** Cualquier error no previsto: se registra en el log y se responde 500 sin detalles. */
set_exception_handler(function (Throwable $e): void {
    error_log('[cafedecaro] ' . $e);
    $debug = false;
    try { $debug = (bool) (config()['app']['debug'] ?? false); } catch (Throwable) {}
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode(['error' => $debug ? $e->getMessage() : 'Error interno del servidor.'], JSON_UNESCAPED_UNICODE);
});
