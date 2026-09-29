<?php
// POST /api/ordenes
//
// Cliente sin sesión (QR):  { mesa, cliente?, notas?, items: [{ producto_id, cantidad?, notas? }] }
//   → crea una orden nueva. Máx. 50 productos y N pedidos por IP cada 10 min.
//
// Personal (admin, mesero, caja):  { mesa? | tipo: "para_llevar", cliente?, notas?, items?: [...] }
//   → si la mesa ya tiene una orden abierta la devuelve (200) y le agrega los ítems;
//     si no, crea una nueva (201).
//
// El precio SIEMPRE sale de la base de datos: el navegador solo manda producto_id y cantidad.
declare(strict_types=1);

const MAX_ITEMS = 50;

$usuario = usuarioActual();
$esPersonal = $usuario && in_array($usuario['rol'], [Rol::Admin->value, Rol::Mesero->value, Rol::Caja->value], true);
if ($esPersonal) exigirLogin(); // valida el token CSRF

$datos = cuerpoJson();
$tipo = $esPersonal ? ($datos['tipo'] ?? 'mesa') : 'mesa';
if (!in_array($tipo, ['mesa', 'para_llevar', 'encargo'], true)) error('Tipo de orden no válido.');

$cliente = texto($datos['cliente'] ?? '', 100, 'el nombre');
$notas = texto($datos['notas'] ?? '', 500, 'las notas');
$lineas = validarItems($datos['items'] ?? [], MAX_ITEMS);

$mesa = null;
if ($tipo === 'mesa') {
    $numero = texto($datos['mesa'] ?? '', 10, 'el número de mesa', true);
    $mesa = consulta('SELECT id, numero FROM mesas WHERE numero = :n AND activa = 1', [':n' => $numero])->fetch();
    if (!$mesa) error("La mesa $numero no existe.", 404);
} elseif ($cliente === '') {
    error('Escribe el nombre del cliente para pedidos para llevar.');
}

if (!$esPersonal) {
    if (!$lineas) error('Tu pedido está vacío.');
    $recientes = (int) consulta(
        'SELECT COUNT(*) FROM ordenes WHERE creada_por IS NULL AND ip_origen = :ip AND creado_en > NOW() - INTERVAL 10 MINUTE',
        [':ip' => ipCliente()]
    )->fetchColumn();
    if ($recientes >= (int) (config()['app']['max_pedidos_cliente'] ?? 6)) {
        error('Ya enviaste varios pedidos. Pide ayuda al mesero.', 429);
    }
}

$db = obtenerDB();
$db->beginTransaction();

$ordenId = null;
if ($esPersonal && $mesa) {
    // ¿La mesa ya tiene cuenta abierta? Se bloquea para que dos meseros no creen dos.
    $abierta = consulta(
        "SELECT id, estado FROM ordenes
          WHERE mesa_id = :m AND estado NOT IN ('cobrada', 'cancelada')
          ORDER BY id DESC LIMIT 1 FOR UPDATE",
        [':m' => $mesa['id']]
    )->fetch();
    if ($abierta) {
        $ordenId = (int) $abierta['id'];
        if ($lineas && in_array($abierta['estado'], ['lista', 'entregada'], true)) {
            consulta("UPDATE ordenes SET estado = 'abierta' WHERE id = :id", [':id' => $ordenId]);
        }
        if ($cliente !== '') {
            consulta("UPDATE ordenes SET cliente_nombre = :c WHERE id = :id AND (cliente_nombre IS NULL OR cliente_nombre = '')",
                [':c' => $cliente, ':id' => $ordenId]);
        }
    }
}

$nueva = $ordenId === null;
if ($nueva) {
    consulta(
        'INSERT INTO ordenes (mesa_id, mesa_numero, cliente_nombre, notas, tipo, creada_por, ip_origen)
         VALUES (:mesa_id, :mesa_numero, :cliente, :notas, :tipo, :creada_por, :ip)',
        [
            ':mesa_id'     => $mesa['id'] ?? null,
            ':mesa_numero' => $mesa['numero'] ?? null,
            ':cliente'     => $cliente !== '' ? $cliente : null,
            ':notas'       => $notas !== '' ? $notas : null,
            ':tipo'        => $tipo,
            ':creada_por'  => $esPersonal ? $usuario['id'] : null,
            ':ip'          => $esPersonal ? null : ipCliente(),
        ]
    );
    $ordenId = (int) $db->lastInsertId();
}

insertarItems($ordenId, $lineas);
recalcularTotales($ordenId);
$db->commit();

if ($nueva) avisarOrden('orden_nueva', $ordenId);
elseif ($lineas) avisarOrden('orden_items', $ordenId);

responder(ordenCompleta($ordenId), $nueva ? 201 : 200);
