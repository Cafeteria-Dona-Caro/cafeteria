<?php
// GET /api/usuarios   (admin)
declare(strict_types=1);
require __DIR__ . '/_comun.php';

exigirRol(Rol::Admin);
$ids = consulta("SELECT id FROM usuarios ORDER BY FIELD(rol, 'admin', 'caja', 'mesero', 'cocina'), nombre")->fetchAll(PDO::FETCH_COLUMN);
responder(['usuarios' => array_map(fn($id) => usuarioJson((int) $id), $ids)]);
