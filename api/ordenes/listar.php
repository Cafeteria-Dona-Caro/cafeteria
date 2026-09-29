<?php
// GET /api/ordenes                       → órdenes no cobradas ni canceladas
// GET /api/ordenes?estado=abierta,lista  → filtrar por estado(s)
// GET /api/ordenes?desde=YYYY-MM-DD&hasta=YYYY-MM-DD  → por fecha de creación (todas)
declare(strict_types=1);

exigirRol(Rol::Admin, Rol::Mesero, Rol::Cocina, Rol::Caja);

$where = [];
$params = [];

if (isset($_GET['estado']) && $_GET['estado'] !== '') {
    $estados = array_unique(explode(',', (string) $_GET['estado']));
    $marcas = [];
    foreach ($estados as $i => $e) {
        if (!EstadoOrden::tryFrom($e)) error('Estado no válido.');
        $marcas[] = ":e$i";
        $params[":e$i"] = $e;
    }
    $where[] = 'o.estado IN (' . implode(',', $marcas) . ')';
} elseif (!isset($_GET['desde'])) {
    $where[] = "o.estado NOT IN ('cobrada', 'cancelada')";
}

if (isset($_GET['desde'])) {
    $where[] = 'o.creado_en >= :desde';
    $params[':desde'] = fechaParametro((string) $_GET['desde']);
}
if (isset($_GET['hasta'])) {
    $where[] = 'o.creado_en <= :hasta';
    $params[':hasta'] = fechaParametro((string) $_GET['hasta'], true);
}

$sql = "SELECT o.*,
               (SELECT COALESCE(SUM(i.cantidad), 0) FROM orden_items i WHERE i.orden_id = o.id AND i.estado <> 'cancelado') AS num_items,
               (SELECT COALESCE(SUM(i.cantidad), 0) FROM orden_items i WHERE i.orden_id = o.id AND i.estado = 'pendiente') AS items_pendientes
          FROM ordenes o"
     . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
     . ' ORDER BY o.creado_en DESC, o.id DESC LIMIT 1000';

responder(['ordenes' => array_map('formatearOrden', consulta($sql, $params)->fetchAll())]);
