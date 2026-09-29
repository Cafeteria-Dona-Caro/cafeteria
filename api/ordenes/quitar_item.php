<?php
// DELETE /api/ordenes/{id}/items/{itemId}   (admin, mesero, caja)
// Solo se puede quitar un producto que cocina aún no empieza (pendiente); el admin, cualquiera.
declare(strict_types=1);

$usuario = exigirRol(Rol::Admin, Rol::Mesero, Rol::Caja);
[$id, $itemId] = $params;

$db = obtenerDB();
$db->beginTransaction();
$orden = ordenParaModificar($id);
if (EstadoOrden::from($orden['estado'])->esFinal()) error('La cuenta ya está ' . $orden['estado'] . '.', 409);

$item = consulta('SELECT estado FROM orden_items WHERE id = :i AND orden_id = :o', [':i' => $itemId, ':o' => $id])->fetch();
if (!$item) error('El producto ya no está en la orden.', 404);
if ($item['estado'] !== 'pendiente' && $usuario['rol'] !== Rol::Admin->value) {
    error('Cocina ya empezó a preparar ese producto. Pide al administrador que lo quite.', 409);
}

consulta('DELETE FROM orden_items WHERE id = :i', [':i' => $itemId]);
recalcularTotales($id);
$db->commit();

avisarOrden('orden_items', $id);
responder(ordenCompleta($id));
