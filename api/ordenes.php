<?php
// api/ordenes.php — Pedidos.
//
// Lectura (personal):
//   GET ?id=N                          → orden con sus ítems
//   GET ?desde=ISO[&hasta=ISO]         → órdenes creadas en el rango (sin ítems)
//   GET ?activas=1                     → órdenes no cerradas de las últimas 24 h (cocina)
//
// Escritura (POST JSON):
//   { accion: "pedido_cliente", mesa, cliente?, items: [{ producto_id, nota? }] }   público
//   { accion: "abrir", mesa, cliente? }            → orden abierta de la mesa (la crea si no hay)
//   { accion: "agregar_item", orden_id, producto_id, nota? }
//   { accion: "quitar_item", item_id }
//   { accion: "estado", orden_id, estado }
//   { accion: "cobrar", orden_id, estado_pago, metodo_pago? }
//
// Los precios y totales SIEMPRE los calcula el servidor con los precios del menú.
declare(strict_types=1);
require __DIR__ . '/_inicio.php';

const PERSONAL = ['admin', 'caja', 'mesero', 'cocina'];
const TOMAN_PEDIDOS = ['admin', 'mesero', 'caja'];
const MAX_ITEMS_CLIENTE = 50;

/* ─── Lectura ─── */

if (metodo() === 'GET') {
    requerirRol(PERSONAL);

    if (isset($_GET['id'])) {
        $orden = sql('SELECT * FROM ordenes WHERE id = ?', [entero($_GET['id'])])->fetch();
        if (!$orden) responderError('La orden no existe.', 404);
        $items = sql('SELECT * FROM orden_items WHERE orden_id = ? ORDER BY id', [$orden['id']])->fetchAll();
        responder(['orden' => formatearOrden($orden), 'items' => array_map('formatearItem', $items)]);
    }

    $base = 'SELECT o.*, (SELECT COALESCE(SUM(cantidad), 0) FROM orden_items i WHERE i.orden_id = o.id) AS num_items
               FROM ordenes o';

    if (!empty($_GET['activas'])) {
        $filas = sql("$base WHERE o.creado_en >= UTC_TIMESTAMP() - INTERVAL 1 DAY
                        AND o.estado IN ('abierta','en_preparacion','lista')
                      ORDER BY o.creado_en")->fetchAll();
    } elseif (isset($_GET['desde'])) {
        $desde = fechaSql((string) $_GET['desde']);
        $hasta = isset($_GET['hasta']) ? fechaSql((string) $_GET['hasta']) : gmdate('Y-m-d H:i:s', time() + 60);
        $filas = sql("$base WHERE o.creado_en BETWEEN ? AND ? ORDER BY o.creado_en DESC LIMIT 2000", [$desde, $hasta])->fetchAll();
    } else {
        responderError('Indica id, desde o activas.');
    }
    responder(['ordenes' => array_map('formatearOrden', $filas), 'ahora' => gmdate('Y-m-d\TH:i:s\Z')]);
}

/* ─── Escritura ─── */

$datos = entrada();
$accion = $datos['accion'] ?? '';

/** Carga una orden bloqueándola para la transacción en curso. */
function ordenParaModificar(int $id): array
{
    $o = sql('SELECT * FROM ordenes WHERE id = ? FOR UPDATE', [$id])->fetch();
    if (!$o) responderError('La orden no existe.', 404);
    return $o;
}

function ordenEditable(array $o): void
{
    if (in_array($o['estado'], ['cerrada', 'cancelada'], true)) {
        responderError('La cuenta ya está cerrada. Abre un pedido nuevo para esta mesa.', 409);
    }
}

function productoActivo(int $id): array
{
    $p = sql('SELECT id, nombre, precio FROM productos WHERE id = ? AND activo = 1', [$id])->fetch();
    if (!$p) responderError('Uno de los productos ya no está disponible. Recarga el menú.', 409);
    return $p;
}

function responderOrden(int $id, int $codigo = 200): void
{
    $orden = sql('SELECT * FROM ordenes WHERE id = ?', [$id])->fetch();
    $items = sql('SELECT * FROM orden_items WHERE orden_id = ? ORDER BY id', [$id])->fetchAll();
    responder(['orden' => formatearOrden($orden), 'items' => array_map('formatearItem', $items)], $codigo);
}

switch ($accion) {

    /* Pedido desde el QR de la mesa, sin sesión */
    case 'pedido_cliente':
        $mesa = texto($datos['mesa'] ?? '', 20, true, 'el número de mesa');
        $cliente = texto($datos['cliente'] ?? '', 60, false, 'el nombre');
        $items = $datos['items'] ?? null;
        if (!is_array($items) || !$items) responderError('Tu pedido está vacío.');
        if (count($items) > MAX_ITEMS_CLIENTE) responderError('Máximo ' . MAX_ITEMS_CLIENTE . ' productos por pedido.');

        $ip = ipCliente();
        $recientes = (int) sql(
            "SELECT COUNT(*) FROM ordenes WHERE origen = 'cliente' AND ip_origen = ? AND creado_en > UTC_TIMESTAMP() - INTERVAL 10 MINUTE",
            [$ip]
        )->fetchColumn();
        if ($recientes >= (int) config('max_pedidos_cliente_por_10min', 6)) {
            responderError('Ya enviaste varios pedidos. Pide ayuda al mesero.', 429);
        }

        // Validar todo antes de escribir
        $lineas = [];
        foreach ($items as $it) {
            if (!is_array($it)) responderError('Producto no válido.');
            $p = productoActivo(entero($it['producto_id'] ?? null, 'producto'));
            $lineas[] = [$p, texto($it['nota'] ?? '', 140, false, 'la nota')];
        }

        db()->beginTransaction();
        sql("INSERT INTO ordenes (mesa, cliente, origen, ip_origen) VALUES (?, ?, 'cliente', ?)", [$mesa, $cliente, $ip]);
        $ordenId = (int) db()->lastInsertId();
        $st = db()->prepare('INSERT INTO orden_items (orden_id, producto_id, nombre, precio, nota) VALUES (?, ?, ?, ?, ?)');
        foreach ($lineas as [$p, $nota]) {
            $st->execute([$ordenId, $p['id'], $p['nombre'], $p['precio'], $nota]);
        }
        recalcularTotal($ordenId);
        db()->commit();

        $o = sql('SELECT id, total FROM ordenes WHERE id = ?', [$ordenId])->fetch();
        responder(['orden_id' => (int) $o['id'], 'total' => (float) $o['total']], 201);

    /* Mesero: abrir (o retomar) el pedido de una mesa */
    case 'abrir':
        $u = requerirRol(TOMAN_PEDIDOS);
        $mesa = texto($datos['mesa'] ?? '', 20, true, 'el número de mesa');
        $cliente = texto($datos['cliente'] ?? '', 60, false, 'el nombre');

        // Candado por mesa: evita que dos meseros creen dos pedidos a la vez
        $candado = 'cafedecaro:mesa:' . md5($mesa);
        sql('SELECT GET_LOCK(?, 5)', [$candado]);
        try {
            $abierta = sql(
                "SELECT id FROM ordenes WHERE mesa = ? AND estado IN ('abierta','en_preparacion','lista')
                  ORDER BY creado_en DESC LIMIT 1",
                [$mesa]
            )->fetchColumn();
            if ($abierta) {
                if ($cliente !== '') sql("UPDATE ordenes SET cliente = ? WHERE id = ? AND cliente = ''", [$cliente, $abierta]);
                $id = (int) $abierta;
                $codigo = 200;
            } else {
                sql("INSERT INTO ordenes (mesa, cliente, origen, creado_por) VALUES (?, ?, 'mesero', ?)", [$mesa, $cliente, $u['id']]);
                $id = (int) db()->lastInsertId();
                $codigo = 201;
            }
        } finally {
            sql('SELECT RELEASE_LOCK(?)', [$candado]);
        }
        responderOrden($id, $codigo);

    case 'agregar_item':
        requerirRol(TOMAN_PEDIDOS);
        $ordenId = entero($datos['orden_id'] ?? null, 'orden');
        $p = productoActivo(entero($datos['producto_id'] ?? null, 'producto'));
        $nota = texto($datos['nota'] ?? '', 140, false, 'la nota');
        db()->beginTransaction();
        ordenEditable(ordenParaModificar($ordenId));
        sql('INSERT INTO orden_items (orden_id, producto_id, nombre, precio, nota) VALUES (?, ?, ?, ?, ?)',
            [$ordenId, $p['id'], $p['nombre'], $p['precio'], $nota]);
        recalcularTotal($ordenId);
        db()->commit();
        responderOrden($ordenId);

    case 'quitar_item':
        requerirRol(TOMAN_PEDIDOS);
        $itemId = entero($datos['item_id'] ?? null, 'ítem');
        $ordenId = (int) sql('SELECT orden_id FROM orden_items WHERE id = ?', [$itemId])->fetchColumn();
        if (!$ordenId) responderError('El producto ya no está en el pedido.', 404);
        db()->beginTransaction();
        ordenEditable(ordenParaModificar($ordenId));
        sql('DELETE FROM orden_items WHERE id = ?', [$itemId]);
        recalcularTotal($ordenId);
        db()->commit();
        responderOrden($ordenId);

    case 'estado':
        $u = requerirRol(PERSONAL);
        $ordenId = entero($datos['orden_id'] ?? null, 'orden');
        $nuevo = $datos['estado'] ?? '';
        if (!in_array($nuevo, ESTADOS_ORDEN, true)) responderError('Estado no válido.');

        // Qué estados puede poner cada rol
        $permitidos = [
            'admin'  => ESTADOS_ORDEN,
            'cocina' => ['abierta', 'en_preparacion', 'lista', 'cerrada'],
            'mesero' => ['cerrada'],
            'caja'   => ['cerrada'],
        ];
        if (!in_array($nuevo, $permitidos[$u['rol']], true)) responderError('Tu rol no puede poner ese estado.', 403);

        db()->beginTransaction();
        $o = ordenParaModificar($ordenId);
        if ($o['estado'] === 'cancelada' && $u['rol'] !== 'admin') responderError('La orden está cancelada.', 409);
        sql('UPDATE ordenes SET estado = ? WHERE id = ?', [$nuevo, $ordenId]);
        db()->commit();
        responderOrden($ordenId);

    case 'cobrar':
        $u = requerirRol((array) config('roles_cobro', ['admin']));
        $ordenId = entero($datos['orden_id'] ?? null, 'orden');
        $estadoPago = $datos['estado_pago'] ?? '';
        if (!in_array($estadoPago, ['pendiente', 'pagado'], true)) responderError('Estado de pago no válido.');
        $metodo = $datos['metodo_pago'] ?? null;
        if ($metodo === '') $metodo = null;
        if ($metodo !== null && !in_array($metodo, METODOS_PAGO, true)) responderError('Forma de pago no válida.');
        if ($estadoPago === 'pagado' && $metodo === null) responderError('Selecciona la forma de pago.');

        db()->beginTransaction();
        $o = ordenParaModificar($ordenId);
        if ($o['estado'] === 'cancelada') responderError('La orden está cancelada.', 409);
        recalcularTotal($ordenId);
        if ($estadoPago === 'pagado') {
            sql("UPDATE ordenes SET estado_pago = 'pagado', metodo_pago = ?, cobrado_por = ?, pagado_en = UTC_TIMESTAMP() WHERE id = ?",
                [$metodo, $u['id'], $ordenId]);
        } else {
            sql("UPDATE ordenes SET estado_pago = 'pendiente', metodo_pago = ?, cobrado_por = NULL, pagado_en = NULL WHERE id = ?",
                [$metodo, $ordenId]);
        }
        db()->commit();
        responderOrden($ordenId);

    default:
        responderError('Acción no válida.');
}
