<?php
// POST /api/ordenes/{id}/items  { producto_id, cantidad?, notas? }   (admin, mesero, caja)
declare(strict_types=1);

exigirRol(Rol::Admin, Rol::Mesero, Rol::Caja);
[$id] = $params;
$lineas = validarItems([cuerpoJson()], 20);

$db = obtenerDB();
$db->beginTransaction();
$orden = ordenParaModificar($id);
if (EstadoOrden::from($orden['estado'])->esFinal()) error('La cuenta ya está ' . $orden['estado'] . '.', 409);

insertarItems($id, $lineas);
// Si ya estaba lista o entregada, vuelve a cocina por el producto nuevo
if (in_array($orden['estado'], ['lista', 'entregada'], true)) {
    consulta("UPDATE ordenes SET estado = 'abierta' WHERE id = :id", [':id' => $id]);
}
recalcularTotales($id);
$db->commit();

avisarOrden('orden_items', $id);
responder(ordenCompleta($id));
