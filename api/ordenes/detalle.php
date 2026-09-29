<?php
// GET /api/ordenes/{id}  → orden con sus ítems
declare(strict_types=1);

exigirRol(Rol::Admin, Rol::Mesero, Rol::Cocina, Rol::Caja);
[$id] = $params;
responder(ordenCompleta($id));
