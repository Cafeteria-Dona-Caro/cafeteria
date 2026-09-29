<?php
// api/lib/ordenes.php — Lógica compartida de órdenes: totales, formato y eventos.
declare(strict_types=1);

/** Recalcula subtotal y total con los ítems (los precios ya vienen de la BD). */
function recalcularTotales(int $ordenId): void
{
    consulta(
        "UPDATE ordenes o
            SET o.subtotal = (SELECT COALESCE(SUM(i.precio * i.cantidad), 0)
                                FROM orden_items i WHERE i.orden_id = o.id AND i.estado <> 'cancelado'),
                o.total = GREATEST(o.subtotal - o.descuento, 0)
          WHERE o.id = :id",
        [':id' => $ordenId]
    );
}

/** Carga una orden bloqueándola dentro de la transacción en curso. */
function ordenParaModificar(int $id): array
{
    $o = consulta('SELECT * FROM ordenes WHERE id = :id FOR UPDATE', [':id' => $id])->fetch();
    if (!$o) error('La orden no existe.', 404);
    return $o;
}

/** Producto disponible con su precio REAL de la base de datos. */
function productoDisponible(int $id): array
{
    $p = consulta('SELECT id, nombre, precio FROM productos WHERE id = :id AND disponible = 1', [':id' => $id])->fetch();
    if (!$p) error('Uno de los productos ya no está disponible. Recarga el menú.', 409);
    return $p;
}

/**
 * Valida la lista de ítems enviada por el navegador: solo se aceptan
 * producto_id, cantidad y notas. El precio NUNCA se toma del cliente.
 */
function validarItems(mixed $items, int $maxItems): array
{
    if (!is_array($items) || !array_is_list($items)) error('Lista de productos no válida.');
    $lineas = [];
    $unidades = 0;
    foreach ($items as $it) {
        if (!is_array($it)) error('Producto no válido.');
        $producto = productoDisponible(entero($it['producto_id'] ?? null, 'producto'));
        $cantidad = entero($it['cantidad'] ?? 1, 'cantidad', 1, 20);
        $notas = texto($it['notas'] ?? '', 255, 'la nota');
        $unidades += $cantidad;
        $lineas[] = ['producto' => $producto, 'cantidad' => $cantidad, 'notas' => $notas];
    }
    if ($unidades > $maxItems) error("Máximo $maxItems productos por pedido.");
    return $lineas;
}

function insertarItems(int $ordenId, array $lineas): void
{
    $st = obtenerDB()->prepare(
        'INSERT INTO orden_items (orden_id, producto_id, nombre, precio, cantidad, notas)
         VALUES (:orden, :producto, :nombre, :precio, :cantidad, :notas)'
    );
    foreach ($lineas as $l) {
        $st->execute([
            ':orden'    => $ordenId,
            ':producto' => $l['producto']['id'],
            ':nombre'   => $l['producto']['nombre'],
            ':precio'   => $l['producto']['precio'],
            ':cantidad' => $l['cantidad'],
            ':notas'    => $l['notas'] !== '' ? $l['notas'] : null,
        ]);
    }
}

function formatearOrden(array $o): array
{
    return [
        'id'             => (int) $o['id'],
        'mesa_id'        => $o['mesa_id'] !== null ? (int) $o['mesa_id'] : null,
        'mesa'           => $o['mesa_numero'],
        'cliente'        => $o['cliente_nombre'] ?? '',
        'notas'          => $o['notas'] ?? '',
        'tipo'           => $o['tipo'],
        'estado'         => $o['estado'],
        'subtotal'       => (float) $o['subtotal'],
        'descuento'      => (float) $o['descuento'],
        'total'          => (float) $o['total'],
        'metodo_pago'    => $o['metodo_pago'],
        'origen'         => $o['creada_por'] === null ? 'cliente' : 'personal',
        'num_items'      => isset($o['num_items']) ? (int) $o['num_items'] : null,
        'items_pendientes' => isset($o['items_pendientes']) ? (int) $o['items_pendientes'] : null,
        'creado_en'      => fechaIso($o['creado_en']),
        'actualizado_en' => fechaIso($o['actualizado_en']),
        'cobrada_en'     => fechaIso($o['cobrada_en']),
    ];
}

function formatearItem(array $i): array
{
    return [
        'id'          => (int) $i['id'],
        'producto_id' => (int) $i['producto_id'],
        'nombre'      => $i['nombre'],
        'precio'      => (float) $i['precio'],
        'cantidad'    => (int) $i['cantidad'],
        'notas'       => $i['notas'] ?? '',
        'estado'      => $i['estado'],
    ];
}

/** Orden completa (con ítems) lista para responder. */
function ordenCompleta(int $id): array
{
    $o = consulta('SELECT * FROM ordenes WHERE id = :id', [':id' => $id])->fetch();
    if (!$o) error('La orden no existe.', 404);
    $items = consulta('SELECT * FROM orden_items WHERE orden_id = :id ORDER BY id', [':id' => $id])->fetchAll();
    return ['orden' => formatearOrden($o), 'items' => array_map('formatearItem', $items)];
}

/** Aviso en tiempo real (SSE) de que una orden cambió. */
function avisarOrden(string $tipo, int $ordenId): void
{
    $o = consulta('SELECT id, estado, mesa_numero, total FROM ordenes WHERE id = :id', [':id' => $ordenId])->fetch();
    publicarEvento($tipo, [
        'orden_id' => $ordenId,
        'estado'   => $o['estado'] ?? null,
        'mesa'     => $o['mesa_numero'] ?? null,
        'total'    => isset($o['total']) ? (float) $o['total'] : null,
    ]);
}
