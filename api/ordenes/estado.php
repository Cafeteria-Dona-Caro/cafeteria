<?php
// PATCH /api/ordenes/{id}/estado  { estado }
//   cocina: abierta ↔ en_preparacion → lista
//   mesero/caja: entregada · caja: cancelada · admin: cualquiera (menos cobrada: usar /cobrar)
declare(strict_types=1);

$usuario = exigirRol(Rol::Admin, Rol::Cocina, Rol::Caja, Rol::Mesero);
[$id] = $params;
$nuevo = EstadoOrden::tryFrom((string) (cuerpoJson()['estado'] ?? '')) ?? error('Estado no válido.');

if (!in_array($nuevo, EstadoOrden::permitidosPara(Rol::from($usuario['rol'])), true)) {
    error('Tu rol no puede poner ese estado.', 403);
}

$db = obtenerDB();
$db->beginTransaction();
$orden = ordenParaModificar($id);
if (EstadoOrden::from($orden['estado'])->esFinal()) error('La orden ya está ' . $orden['estado'] . '.', 409);

consulta('UPDATE ordenes SET estado = :e WHERE id = :id', [':e' => $nuevo->value, ':id' => $id]);

// Los ítems acompañan al estado de la orden (los ya entregados no cambian)
[$itemsDe, $itemsA] = match ($nuevo) {
    EstadoOrden::Abierta       => [['en_preparacion'], 'pendiente'],
    EstadoOrden::EnPreparacion => [['pendiente'], 'en_preparacion'],
    EstadoOrden::Lista         => [['pendiente', 'en_preparacion'], 'listo'],
    EstadoOrden::Entregada     => [['pendiente', 'en_preparacion', 'listo'], 'entregado'],
    EstadoOrden::Cancelada     => [['pendiente', 'en_preparacion', 'listo'], 'cancelado'],
    default                    => [[], ''],
};
foreach ($itemsDe as $de) {
    consulta('UPDATE orden_items SET estado = :a WHERE orden_id = :id AND estado = :de', [':a' => $itemsA, ':id' => $id, ':de' => $de]);
}
if ($nuevo === EstadoOrden::Cancelada) recalcularTotales($id);
$db->commit();

avisarOrden('orden_estado', $id);
responder(ordenCompleta($id));
