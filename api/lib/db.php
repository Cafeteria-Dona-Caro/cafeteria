<?php
// api/lib/db.php — Configuración, conexión PDO (singleton) y eventos para SSE.
declare(strict_types=1);

/** Configuración de config/config.php (se lee una sola vez). */
function config(): array
{
    static $config = null;
    if ($config === null) {
        $ruta = __DIR__ . '/../../config/config.php';
        if (!is_file($ruta)) {
            error('Falta config/config.php. Copia config/config.ejemplo.php y llénalo.', 500);
        }
        $config = require $ruta;
        date_default_timezone_set($config['app']['zona_horaria'] ?? 'America/Mexico_City');
    }
    return $config;
}

function obtenerDB(): PDO
{
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $db = config()['db'];
    // Misma zona horaria en PHP y en MariaDB (America/Mexico_City → "-06:00")
    $offset = (new DateTimeImmutable('now'))->format('P');
    $dsn = "mysql:host={$db['host']};port={$db['port']};dbname={$db['nombre']};charset={$db['charset']}";
    $pdo = new PDO($dsn, $db['usuario'], $db['password'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET time_zone = '$offset'",
    ]);
    return $pdo;
}

/** Ejecuta una consulta preparada. Nunca concatenar datos en el SQL. */
function consulta(string $sql, array $params = []): PDOStatement
{
    $st = obtenerDB()->prepare($sql);
    $st->execute($params);
    return $st;
}

/**
 * Publica un evento para las pantallas conectadas por SSE
 * (cocina, caja, mesas, mesero). Ver api/sse/eventos.php.
 */
function publicarEvento(string $tipo, array $datos): void
{
    consulta('INSERT INTO eventos (tipo, datos) VALUES (:tipo, :datos)', [
        ':tipo'  => $tipo,
        ':datos' => json_encode($datos, JSON_UNESCAPED_UNICODE),
    ]);
    // Limpieza ocasional: eventos de más de 24 h (así no hace falta un CRON)
    if (random_int(1, 200) === 1) {
        consulta('DELETE FROM eventos WHERE creado_en < NOW() - INTERVAL 24 HOUR');
    }
}
