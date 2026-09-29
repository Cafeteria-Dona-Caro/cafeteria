<?php
// GET /api/sse/eventos — Server-Sent Events (tiempo real)   (personal)
//
// Cocina, caja, mesas y mesero mantienen esta conexión abierta y reciben
// los cambios al instante. Cada conexión dura ~55 s; el navegador
// (EventSource) se reconecta solo y, gracias a Last-Event-ID, no pierde eventos.
declare(strict_types=1);

exigirRol(Rol::Admin, Rol::Mesero, Rol::Cocina, Rol::Caja);

// Liberar la sesión: si no, esta conexión larga bloquearía las demás
// peticiones del mismo usuario (PHP bloquea el archivo de sesión).
session_write_close();

const DURACION = 55;   // segundos por conexión (el hosting corta procesos largos)
const LATIDO = 15;     // comentario cada 15 s para que proxies no cierren la conexión

set_time_limit(DURACION + 10);
ignore_user_abort(false);

header('Content-Type: text/event-stream; charset=utf-8');
header('Cache-Control: no-cache, no-transform');
header('Connection: keep-alive');
header('X-Accel-Buffering: no');   // nginx / LiteSpeed: no guardar en búfer
if (function_exists('apache_setenv')) apache_setenv('no-gzip', '1');
ini_set('zlib.output_compression', '0');
ini_set('output_buffering', '0');
while (ob_get_level() > 0) ob_end_flush();
ob_implicit_flush(true);

$enviar = function (string $texto): void {
    echo $texto;
    @flush();
};

// Último evento que el navegador ya recibió. En la primera conexión se
// empieza desde "ahora" (no se reenvía la historia del día).
$idCabecera = $_SERVER['HTTP_LAST_EVENT_ID'] ?? ($_GET['desde'] ?? '');
$ultimoId = ctype_digit((string) $idCabecera) && (int) $idCabecera > 0
    ? (int) $idCabecera
    : (int) consulta('SELECT COALESCE(MAX(id), 0) FROM eventos')->fetchColumn();

// Relleno de 2 KB: algunos servidores no envían nada hasta juntar ese tamaño
$enviar(':' . str_repeat(' ', 2048) . "\n");
$enviar("retry: 2000\n");
$enviar("event: conectado\ndata: {\"ultimo_id\":$ultimoId}\n\n");

$st = obtenerDB()->prepare('SELECT id, tipo, datos FROM eventos WHERE id > :ultimo ORDER BY id LIMIT 100');
$inicio = time();
$ultimoLatido = time();

while (time() - $inicio < DURACION) {
    $st->execute([':ultimo' => $ultimoId]);
    $eventos = $st->fetchAll();

    foreach ($eventos as $ev) {
        $ultimoId = (int) $ev['id'];
        // El tipo solo puede tener letras y guion bajo; los datos son JSON de una sola línea
        $tipo = preg_replace('/[^a-z_]/', '', $ev['tipo']);
        $datos = json_encode(json_decode($ev['datos'], true), JSON_UNESCAPED_UNICODE);
        $enviar("id: $ultimoId\nevent: $tipo\ndata: $datos\n\n");
    }

    if (time() - $ultimoLatido >= LATIDO) {
        $enviar(": latido\n\n");
        $ultimoLatido = time();
    }

    if (connection_aborted()) break;
    if (!$eventos) usleep(500_000); // revisar 2 veces por segundo
}
