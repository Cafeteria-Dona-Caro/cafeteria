<?php
// POST /api/ordenes/{id}/cobrar  { metodo_pago, descuento? }   (caja, admin)
// El total se recalcula en el servidor: subtotal de los ítems − descuento.
declare(strict_types=1);

$usuario = exigirRol(Rol::Caja, Rol::Admin);
[$id] = $params;
$datos = cuerpoJson();
$metodo = MetodoPago::tryFrom((string) ($datos['metodo_pago'] ?? '')) ?? error('Selecciona la forma de pago.');
$descuento = dinero($datos['descuento'] ?? 0, 'El descuento');

$db = obtenerDB();
$db->beginTransaction();
$orden = ordenParaModificar($id);
if (EstadoOrden::from($orden['estado'])->esFinal()) error('La orden ya está ' . $orden['estado'] . '.', 409);

recalcularTotales($id);
$subtotal = (float) consulta('SELECT subtotal FROM ordenes WHERE id = :id', [':id' => $id])->fetchColumn();
if ($subtotal <= 0) error('La orden no tiene productos.', 409);
if ($descuento > $subtotal) error('El descuento no puede ser mayor que el subtotal.');

consulta(
    "UPDATE ordenes
        SET descuento = :d, total = :t, metodo_pago = :m, estado = 'cobrada',
            cobrada_por = :u, cobrada_en = NOW()
      WHERE id = :id",
    [':d' => $descuento, ':t' => round($subtotal - $descuento, 2), ':m' => $metodo->value, ':u' => $usuario['id'], ':id' => $id]
);
consulta("UPDATE orden_items SET estado = 'entregado' WHERE orden_id = :id AND estado IN ('pendiente', 'en_preparacion', 'listo')", [':id' => $id]);
$db->commit();

avisarOrden('orden_estado', $id);
responder(ordenCompleta($id));
