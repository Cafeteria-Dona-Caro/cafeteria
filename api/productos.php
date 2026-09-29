<?php
// api/productos.php — Menú.
//   GET                          → productos activos (público)
//   GET ?todos=1                 → todos, incluidos inactivos (admin)
//   POST { accion: "crear", nombre, categoria, precio }                (admin)
//   POST { accion: "editar", id, nombre?, categoria?, precio?, activo? } (admin)
//   POST { accion: "eliminar", id }                                    (admin)
//   POST { accion: "importar" }  → agrega lo que falte de data/menu-inicial.json (admin)
declare(strict_types=1);
require __DIR__ . '/_inicio.php';

if (metodo() === 'GET') {
    if (!empty($_GET['todos'])) {
        requerirRol(['admin']);
        $filas = sql('SELECT * FROM productos ORDER BY categoria, nombre')->fetchAll();
    } else {
        header('Cache-Control: public, max-age=60');
        $filas = sql('SELECT * FROM productos WHERE activo = 1 ORDER BY categoria, nombre')->fetchAll();
    }
    responder(['productos' => array_map('formatearProducto', $filas)]);
}

requerirRol(['admin']);
$datos = entrada();

function precioValido($valor): float
{
    if (!is_numeric($valor) || (float) $valor < 0 || (float) $valor > 100000) responderError('Precio no válido.');
    return round((float) $valor, 2);
}

function existeDuplicado(string $categoria, string $nombre, int $excepto = 0): bool
{
    return (bool) sql('SELECT 1 FROM productos WHERE categoria = ? AND nombre = ? AND id <> ?', [$categoria, $nombre, $excepto])->fetch();
}

switch ($datos['accion'] ?? '') {
    case 'crear':
        $nombre = texto($datos['nombre'] ?? '', 80, true, 'el nombre');
        $categoria = texto($datos['categoria'] ?? '', 60, true, 'la categoría');
        $precio = precioValido($datos['precio'] ?? null);
        if (existeDuplicado($categoria, $nombre)) responderError('Ya existe un producto con ese nombre en esa categoría.', 409);
        sql('INSERT INTO productos (nombre, categoria, precio) VALUES (?, ?, ?)', [$nombre, $categoria, $precio]);
        $id = (int) db()->lastInsertId();
        responder(['producto' => formatearProducto(sql('SELECT * FROM productos WHERE id = ?', [$id])->fetch())], 201);

    case 'editar':
        $id = entero($datos['id'] ?? null);
        $p = sql('SELECT * FROM productos WHERE id = ?', [$id])->fetch();
        if (!$p) responderError('El producto no existe.', 404);
        $nombre = array_key_exists('nombre', $datos) ? texto($datos['nombre'], 80, true, 'el nombre') : $p['nombre'];
        $categoria = array_key_exists('categoria', $datos) ? texto($datos['categoria'], 60, true, 'la categoría') : $p['categoria'];
        $precio = array_key_exists('precio', $datos) ? precioValido($datos['precio']) : (float) $p['precio'];
        $activo = array_key_exists('activo', $datos) ? (int) (bool) $datos['activo'] : (int) $p['activo'];
        if (existeDuplicado($categoria, $nombre, $id)) responderError('Ya existe un producto con ese nombre en esa categoría.', 409);
        sql('UPDATE productos SET nombre = ?, categoria = ?, precio = ?, activo = ? WHERE id = ?', [$nombre, $categoria, $precio, $activo, $id]);
        responder(['producto' => formatearProducto(sql('SELECT * FROM productos WHERE id = ?', [$id])->fetch())]);

    case 'eliminar':
        // Los pedidos anteriores conservan el nombre y precio (se copian en cada ítem)
        $id = entero($datos['id'] ?? null);
        sql('DELETE FROM productos WHERE id = ?', [$id]);
        responder(['ok' => true]);

    case 'importar':
        $menu = json_decode((string) file_get_contents(__DIR__ . '/../data/menu-inicial.json'), true);
        if (!is_array($menu)) responderError('No se pudo leer data/menu-inicial.json.', 500);
        $st = db()->prepare('INSERT IGNORE INTO productos (nombre, categoria, precio, activo) VALUES (?, ?, ?, ?)');
        $agregados = 0;
        db()->beginTransaction();
        foreach ($menu as $p) {
            $st->execute([
                mb_substr((string) ($p['nombre'] ?? ''), 0, 80),
                mb_substr((string) ($p['categoria'] ?? ''), 0, 60),
                round((float) ($p['precio'] ?? 0), 2),
                isset($p['activo']) ? (int) (bool) $p['activo'] : 1,
            ]);
            $agregados += $st->rowCount();
        }
        db()->commit();
        responder(['agregados' => $agregados]);

    default:
        responderError('Acción no válida.');
}
