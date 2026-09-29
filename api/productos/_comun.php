<?php
// Utilidades de productos (lo incluyen crear.php y editar.php)
declare(strict_types=1);

/** Id de la categoría: existente (categoria_id) o nueva por nombre (categoria). */
function categoriaDe(array $datos): int
{
    if (isset($datos['categoria_id'])) {
        $id = entero($datos['categoria_id'], 'categoría');
        if (!consulta('SELECT 1 FROM categorias WHERE id = :id', [':id' => $id])->fetch()) error('La categoría no existe.', 404);
        return $id;
    }
    $nombre = texto($datos['categoria'] ?? '', 100, 'la categoría', true);
    $id = consulta('SELECT id FROM categorias WHERE nombre = :n', [':n' => $nombre])->fetchColumn();
    if ($id) return (int) $id;
    consulta('INSERT INTO categorias (nombre, orden) SELECT :n, COALESCE(MAX(orden), 0) + 1 FROM categorias', [':n' => $nombre]);
    return (int) obtenerDB()->lastInsertId();
}

function productoJson(int $id): array
{
    $p = consulta('SELECT p.*, c.nombre AS categoria FROM productos p JOIN categorias c ON c.id = p.categoria_id WHERE p.id = :id', [':id' => $id])->fetch();
    if (!$p) error('El producto no existe.', 404);
    return [
        'id' => (int) $p['id'], 'categoria_id' => (int) $p['categoria_id'], 'categoria' => $p['categoria'],
        'nombre' => $p['nombre'], 'descripcion' => $p['descripcion'] ?? '', 'precio' => (float) $p['precio'],
        'disponible' => (bool) $p['disponible'],
    ];
}

function duplicado(int $categoriaId, string $nombre, int $excepto = 0): bool
{
    return (bool) consulta(
        'SELECT 1 FROM productos WHERE categoria_id = :c AND nombre = :n AND id <> :id',
        [':c' => $categoriaId, ':n' => $nombre, ':id' => $excepto]
    )->fetch();
}
