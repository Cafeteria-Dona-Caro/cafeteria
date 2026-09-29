-- ─────────────────────────────────────────────────────────────
--  Datos iniciales de Café de Caro — carta "Cafecito de Doña Caro"
--  Importar DESPUÉS de db/esquema.sql. Se puede importar varias veces:
--  INSERT IGNORE no duplica ni cambia precios ya editados.
--
--  El usuario administrador NO va aquí (una contraseña fija en un archivo
--  público sería un riesgo): se crea con /api/instalar.
--  Los precios se editan después en admin.html → Productos.
-- ─────────────────────────────────────────────────────────────

SET NAMES utf8mb4;

-- Categorías (en el orden de la carta)
INSERT IGNORE INTO categorias (nombre, orden) VALUES
('Cafés clásicos', 1),
('Extras', 2),
('Especialidades calientes', 3),
('Tés e infusiones', 4),
('Tisanas frías', 5),
('Soda italiana', 6),
('Bebidas frías', 7),
('Frappés', 8),
('Smoothies', 9),
('Lattes fríos', 10),
('Coctelería', 11),
('Pasteles', 12),
('Pays', 13),
('Chocolate de la casa', 14),
('Café de Atoyac', 15),
('Embotellados', 16);

-- Mesas (distribución del local)
INSERT IGNORE INTO mesas (numero, seccion, capacidad) VALUES
('PB-01', 'Planta baja', 4),
('PB-02', 'Planta baja', 4),
('PB-03', 'Planta baja', 4),
('PB-04', 'Planta baja', 4),
('PB-05', 'Planta baja', 4),
('PB-06', 'Planta baja', 4),
('PB-07', 'Planta baja', 4),
('PB-08', 'Planta baja', 4),
('PA-01', 'Planta alta', 4),
('PA-02', 'Planta alta', 4),
('PA-03', 'Planta alta', 4),
('PA-04', 'Planta alta', 4),
('PA-05', 'Planta alta', 4),
('PA-06', 'Planta alta', 4),
('B-01', 'Balcón', 2),
('B-02', 'Balcón', 2),
('B-03', 'Balcón', 2),
('B-04', 'Balcón', 2);

-- Cafés clásicos
INSERT IGNORE INTO productos (categoria_id, nombre, descripcion, precio, orden)
SELECT c.id, v.nombre, NULLIF(v.descripcion, ''), v.precio, v.orden FROM categorias c
JOIN (
            SELECT 'Café latte' AS nombre, 'Leche cremada, suave y sedosa, que se funde con un espresso intenso y aromático.' AS descripcion, 60.00 AS precio, 1 AS orden
  UNION ALL SELECT 'Capuccino' AS nombre, 'Espresso intenso, leche cremosa y una espuma espesa que corona cada sorbo con carácter y suavidad.' AS descripcion, 60.00 AS precio, 2 AS orden
  UNION ALL SELECT 'Espresso' AS nombre, 'Bebida intensa y aromática resultado de la extracción de nuestro mejor grano.' AS descripcion, 35.00 AS precio, 3 AS orden
  UNION ALL SELECT 'Macchiato' AS nombre, 'Ideal para quienes disfrutan del sabor fuerte del café pero desean un toque de cremosidad sin opacar el espresso.' AS descripcion, 40.00 AS precio, 4 AS orden
  UNION ALL SELECT 'Café de la casa' AS nombre, 'Método de infusión, sabor intenso.' AS descripcion, 35.00 AS precio, 5 AS orden
  UNION ALL SELECT 'Café de olla' AS nombre, 'Tradicional bebida mexicana (café, piloncillo y canela).' AS descripcion, 35.00 AS precio, 6 AS orden
  UNION ALL SELECT 'Café americano' AS nombre, 'Suave y aromático, preparado a partir de espresso y agua caliente.' AS descripcion, 35.00 AS precio, 7 AS orden
  UNION ALL SELECT 'Café con anís' AS nombre, 'Reduce la ansiedad, controla los antojos de azúcar, mejora la digestión y protege tus vías respiratorias.' AS descripcion, 40.00 AS precio, 8 AS orden
  UNION ALL SELECT 'Café con clavo' AS nombre, 'Suaviza los picos de ansiedad del café, mantiene la energía más estable y aporta antioxidantes.' AS descripcion, 40.00 AS precio, 9 AS orden
  UNION ALL SELECT 'Café con romero' AS nombre, 'Aromático y relajante, ayuda a la concentración y digestión.' AS descripcion, 40.00 AS precio, 10 AS orden
  UNION ALL SELECT 'Moka' AS nombre, 'Una mezcla de espresso, leche vaporizada y chocolate.' AS descripcion, 65.00 AS precio, 11 AS orden
  UNION ALL SELECT 'Affogato' AS nombre, 'Helado de vainilla bañado con espresso caliente.' AS descripcion, 65.00 AS precio, 12 AS orden
  UNION ALL SELECT 'Flat white' AS nombre, 'Espresso con leche vaporizada, textura suave y cremosa.' AS descripcion, 65.00 AS precio, 13 AS orden
) v
WHERE c.nombre = 'Cafés clásicos';

-- Extras
INSERT IGNORE INTO productos (categoria_id, nombre, descripcion, precio, orden)
SELECT c.id, v.nombre, NULLIF(v.descripcion, ''), v.precio, v.orden FROM categorias c
JOIN (
            SELECT 'Saborizante caramelo' AS nombre, 'Extra para tu bebida.' AS descripcion, 10.00 AS precio, 1 AS orden
  UNION ALL SELECT 'Saborizante avellana' AS nombre, 'Extra para tu bebida.' AS descripcion, 10.00 AS precio, 2 AS orden
  UNION ALL SELECT 'Saborizante rol de canela' AS nombre, 'Extra para tu bebida.' AS descripcion, 10.00 AS precio, 3 AS orden
  UNION ALL SELECT 'Saborizante vainilla' AS nombre, 'Extra para tu bebida.' AS descripcion, 10.00 AS precio, 4 AS orden
  UNION ALL SELECT 'Saborizante coco' AS nombre, 'Extra para tu bebida.' AS descripcion, 10.00 AS precio, 5 AS orden
  UNION ALL SELECT 'Saborizante crema irlandesa' AS nombre, 'Extra para tu bebida.' AS descripcion, 10.00 AS precio, 6 AS orden
  UNION ALL SELECT 'Saborizante mazapán' AS nombre, 'Extra para tu bebida.' AS descripcion, 10.00 AS precio, 7 AS orden
  UNION ALL SELECT 'Carga extra de espresso' AS nombre, '' AS descripcion, 10.00 AS precio, 8 AS orden
) v
WHERE c.nombre = 'Extras';

-- Especialidades calientes
INSERT IGNORE INTO productos (categoria_id, nombre, descripcion, precio, orden)
SELECT c.id, v.nombre, NULLIF(v.descripcion, ''), v.precio, v.orden FROM categorias c
JOIN (
            SELECT 'Chai caliente' AS nombre, 'Preparado con té negro y una mezcla aromática de especias como canela, jengibre, clavo y cardamomo. Se combina con leche caliente para lograr un sabor intenso, especiado y ligeramente dulce.' AS descripcion, 60.00 AS precio, 1 AS orden
  UNION ALL SELECT 'Chocolate Doña Caro (leche)' AS nombre, 'Chocolate caliente preparado al momento con un toque artesanal que evoca el sabor del hogar.' AS descripcion, 60.00 AS precio, 2 AS orden
  UNION ALL SELECT 'Chocolate Doña Caro (agua)' AS nombre, 'Bebida tradicional de origen prehispánico, preparada con cacao molido y agua caliente. De sabor intenso y auténtico, conecta cada sorbo con la historia ancestral del cacao.' AS descripcion, 60.00 AS precio, 3 AS orden
  UNION ALL SELECT 'Tisana caliente' AS nombre, 'Infusión natural de frutas, flores y hierbas.' AS descripcion, 60.00 AS precio, 4 AS orden
  UNION ALL SELECT 'Expresso bombón' AS nombre, 'Bebida dulce que combina café con leche condensada.' AS descripcion, 45.00 AS precio, 5 AS orden
) v
WHERE c.nombre = 'Especialidades calientes';

-- Tés e infusiones
INSERT IGNORE INTO productos (categoria_id, nombre, descripcion, precio, orden)
SELECT c.id, v.nombre, NULLIF(v.descripcion, ''), v.precio, v.orden FROM categorias c
JOIN (
            SELECT 'Té de jengibre' AS nombre, '' AS descripcion, 30.00 AS precio, 1 AS orden
  UNION ALL SELECT 'Té de canela' AS nombre, '' AS descripcion, 30.00 AS precio, 2 AS orden
  UNION ALL SELECT 'Té de romero' AS nombre, '' AS descripcion, 30.00 AS precio, 3 AS orden
) v
WHERE c.nombre = 'Tés e infusiones';

-- Tisanas frías
INSERT IGNORE INTO productos (categoria_id, nombre, descripcion, precio, orden)
SELECT c.id, v.nombre, NULLIF(v.descripcion, ''), v.precio, v.orden FROM categorias c
JOIN (
            SELECT 'Tisana fría frutos de la vida' AS nombre, 'Infusión fría natural con frutas y hierbas.' AS descripcion, 65.00 AS precio, 1 AS orden
  UNION ALL SELECT 'Tisana fría frutos de la pasión' AS nombre, 'Infusión fría natural con frutas y hierbas.' AS descripcion, 65.00 AS precio, 2 AS orden
  UNION ALL SELECT 'Tisana fría frutos tropicales' AS nombre, 'Infusión fría natural con frutas y hierbas.' AS descripcion, 65.00 AS precio, 3 AS orden
  UNION ALL SELECT 'Tisana fría frutas caribeñas' AS nombre, 'Infusión fría natural con frutas y hierbas.' AS descripcion, 65.00 AS precio, 4 AS orden
) v
WHERE c.nombre = 'Tisanas frías';

-- Soda italiana
INSERT IGNORE INTO productos (categoria_id, nombre, descripcion, precio, orden)
SELECT c.id, v.nombre, NULLIF(v.descripcion, ''), v.precio, v.orden FROM categorias c
JOIN (
            SELECT 'Soda italiana frutos rojos' AS nombre, 'Refrescante bebida italiana con un toque frutal.' AS descripcion, 65.00 AS precio, 1 AS orden
  UNION ALL SELECT 'Soda italiana coco' AS nombre, 'Refrescante bebida italiana con un toque frutal.' AS descripcion, 65.00 AS precio, 2 AS orden
  UNION ALL SELECT 'Soda italiana mojito' AS nombre, 'Refrescante bebida italiana con un toque frutal.' AS descripcion, 65.00 AS precio, 3 AS orden
  UNION ALL SELECT 'Soda italiana conga' AS nombre, 'Refrescante bebida italiana con un toque frutal.' AS descripcion, 65.00 AS precio, 4 AS orden
  UNION ALL SELECT 'Soda italiana fruta del dragón' AS nombre, 'Refrescante bebida italiana con un toque frutal.' AS descripcion, 65.00 AS precio, 5 AS orden
  UNION ALL SELECT 'Soda italiana mora azul' AS nombre, 'Refrescante bebida italiana con un toque frutal.' AS descripcion, 65.00 AS precio, 6 AS orden
) v
WHERE c.nombre = 'Soda italiana';

-- Bebidas frías
INSERT IGNORE INTO productos (categoria_id, nombre, descripcion, precio, orden)
SELECT c.id, v.nombre, NULLIF(v.descripcion, ''), v.precio, v.orden FROM categorias c
JOIN (
            SELECT 'Ice americano' AS nombre, 'Espresso con agua fría y hielo, refrescante y ligero.' AS descripcion, 40.00 AS precio, 1 AS orden
  UNION ALL SELECT 'Cold brew' AS nombre, 'Extracción en frío por varias horas, suave y de baja acidez.' AS descripcion, 50.00 AS precio, 2 AS orden
  UNION ALL SELECT 'Moka frío' AS nombre, 'Bebida de moka con hielo.' AS descripcion, 60.00 AS precio, 3 AS orden
  UNION ALL SELECT 'Cerveza de raíz' AS nombre, 'Bebida artesanal, dulce y especiada.' AS descripcion, 60.00 AS precio, 4 AS orden
) v
WHERE c.nombre = 'Bebidas frías';

-- Frappés
INSERT IGNORE INTO productos (categoria_id, nombre, descripcion, precio, orden)
SELECT c.id, v.nombre, NULLIF(v.descripcion, ''), v.precio, v.orden FROM categorias c
JOIN (
            SELECT 'Frappé Oreo' AS nombre, '' AS descripcion, 65.00 AS precio, 1 AS orden
  UNION ALL SELECT 'Frappé taro' AS nombre, '' AS descripcion, 65.00 AS precio, 2 AS orden
  UNION ALL SELECT 'Frappé algodón de azúcar' AS nombre, '' AS descripcion, 65.00 AS precio, 3 AS orden
  UNION ALL SELECT 'Frappé chocolate' AS nombre, '' AS descripcion, 65.00 AS precio, 4 AS orden
  UNION ALL SELECT 'Frappé chocolate blanco' AS nombre, '' AS descripcion, 65.00 AS precio, 5 AS orden
  UNION ALL SELECT 'Frappé caramelo' AS nombre, '' AS descripcion, 65.00 AS precio, 6 AS orden
  UNION ALL SELECT 'Frappé chai' AS nombre, '' AS descripcion, 65.00 AS precio, 7 AS orden
  UNION ALL SELECT 'Frappé capuccino' AS nombre, '' AS descripcion, 65.00 AS precio, 8 AS orden
  UNION ALL SELECT 'Frappé moka' AS nombre, '' AS descripcion, 65.00 AS precio, 9 AS orden
  UNION ALL SELECT 'Frappé mazapán' AS nombre, '' AS descripcion, 65.00 AS precio, 10 AS orden
  UNION ALL SELECT 'Frappé vainilla' AS nombre, '' AS descripcion, 65.00 AS precio, 11 AS orden
  UNION ALL SELECT 'Frappé chilate' AS nombre, 'Cacao, arroz, canela y especias. Tradición y frescura en cada sorbo.' AS descripcion, 70.00 AS precio, 12 AS orden
  UNION ALL SELECT 'Frappé de tisana' AS nombre, 'Frutas y hierbas infusionadas, mezcladas con hielo y un toque dulce.' AS descripcion, 70.00 AS precio, 13 AS orden
) v
WHERE c.nombre = 'Frappés';

-- Smoothies
INSERT IGNORE INTO productos (categoria_id, nombre, descripcion, precio, orden)
SELECT c.id, v.nombre, NULLIF(v.descripcion, ''), v.precio, v.orden FROM categorias c
JOIN (
            SELECT 'Smoothie limón' AS nombre, '' AS descripcion, 65.00 AS precio, 1 AS orden
  UNION ALL SELECT 'Smoothie maracuyá' AS nombre, '' AS descripcion, 65.00 AS precio, 2 AS orden
  UNION ALL SELECT 'Smoothie mango' AS nombre, '' AS descripcion, 65.00 AS precio, 3 AS orden
  UNION ALL SELECT 'Smoothie moras' AS nombre, '' AS descripcion, 65.00 AS precio, 4 AS orden
  UNION ALL SELECT 'Smoothie piña colada' AS nombre, '' AS descripcion, 65.00 AS precio, 5 AS orden
  UNION ALL SELECT 'Smoothie fresa' AS nombre, '' AS descripcion, 65.00 AS precio, 6 AS orden
  UNION ALL SELECT 'Smoothie plátano' AS nombre, '' AS descripcion, 65.00 AS precio, 7 AS orden
) v
WHERE c.nombre = 'Smoothies';

-- Lattes fríos
INSERT IGNORE INTO productos (categoria_id, nombre, descripcion, precio, orden)
SELECT c.id, v.nombre, NULLIF(v.descripcion, ''), v.precio, v.orden FROM categorias c
JOIN (
            SELECT 'Latte frío caramelo' AS nombre, '' AS descripcion, 65.00 AS precio, 1 AS orden
  UNION ALL SELECT 'Latte frío avellana' AS nombre, '' AS descripcion, 65.00 AS precio, 2 AS orden
  UNION ALL SELECT 'Latte frío crema irlandesa' AS nombre, '' AS descripcion, 65.00 AS precio, 3 AS orden
  UNION ALL SELECT 'Latte frío vainilla' AS nombre, '' AS descripcion, 65.00 AS precio, 4 AS orden
  UNION ALL SELECT 'Latte frío coco' AS nombre, '' AS descripcion, 65.00 AS precio, 5 AS orden
) v
WHERE c.nombre = 'Lattes fríos';

-- Coctelería
INSERT IGNORE INTO productos (categoria_id, nombre, descripcion, precio, orden)
SELECT c.id, v.nombre, NULLIF(v.descripcion, ''), v.precio, v.orden FROM categorias c
JOIN (
            SELECT 'Carajillo' AS nombre, 'Espresso con licor, intenso y elegante.' AS descripcion, 85.00 AS precio, 1 AS orden
  UNION ALL SELECT 'Café irlandés' AS nombre, 'Café, azúcar y whisky irlandés.' AS descripcion, 65.00 AS precio, 2 AS orden
  UNION ALL SELECT 'Alfonso 13' AS nombre, 'Licor, crema, café y hielo. Suave y delicioso.' AS descripcion, 85.00 AS precio, 3 AS orden
) v
WHERE c.nombre = 'Coctelería';

-- Pasteles
INSERT IGNORE INTO productos (categoria_id, nombre, descripcion, precio, orden)
SELECT c.id, v.nombre, NULLIF(v.descripcion, ''), v.precio, v.orden FROM categorias c
JOIN (
            SELECT 'Red velvet' AS nombre, 'Suave, aterciopelado y con un toque irresistible.' AS descripcion, 75.00 AS precio, 1 AS orden
  UNION ALL SELECT 'Pastel de plátano' AS nombre, 'Casero, esponjoso y lleno de sabor.' AS descripcion, 75.00 AS precio, 2 AS orden
  UNION ALL SELECT 'Trufa de chocolate' AS nombre, 'Intenso, cremoso y perfecto para los amantes del chocolate.' AS descripcion, 70.00 AS precio, 3 AS orden
  UNION ALL SELECT 'Pastel de zanahoria' AS nombre, 'Especiado, suave y deliciosamente tradicional.' AS descripcion, 75.00 AS precio, 4 AS orden
  UNION ALL SELECT 'Carlota de limón' AS nombre, 'Refrescante, cremosa y con el equilibrio perfecto de limón.' AS descripcion, 50.00 AS precio, 5 AS orden
  UNION ALL SELECT 'Carlota de Oreo' AS nombre, 'Cremosa, con trozos de galleta Oreo y un sabor irresistible.' AS descripcion, 50.00 AS precio, 6 AS orden
  UNION ALL SELECT 'Pastel de chocolate helado' AS nombre, 'Frío, intenso y totalmente irresistible.' AS descripcion, 80.00 AS precio, 7 AS orden
  UNION ALL SELECT 'Helado de vainilla' AS nombre, 'Suave, cremoso y clásico, el complemento perfecto.' AS descripcion, 50.00 AS precio, 8 AS orden
) v
WHERE c.nombre = 'Pasteles';

-- Pays
INSERT IGNORE INTO productos (categoria_id, nombre, descripcion, precio, orden)
SELECT c.id, v.nombre, NULLIF(v.descripcion, ''), v.precio, v.orden FROM categorias c
JOIN (
            SELECT 'Pay de queso' AS nombre, 'Clásico y suave.' AS descripcion, 40.00 AS precio, 1 AS orden
  UNION ALL SELECT 'Pay de elote' AS nombre, 'Dulce y con sabor casero.' AS descripcion, 40.00 AS precio, 2 AS orden
  UNION ALL SELECT 'Pay helado de limón' AS nombre, 'Refrescante, cremoso y perfecto para cualquier momento.' AS descripcion, 80.00 AS precio, 3 AS orden
) v
WHERE c.nombre = 'Pays';

-- Chocolate de la casa
INSERT IGNORE INTO productos (categoria_id, nombre, descripcion, precio, orden)
SELECT c.id, v.nombre, NULLIF(v.descripcion, ''), v.precio, v.orden FROM categorias c
JOIN (
            SELECT 'Chocolate de la casa 1/4 kg' AS nombre, 'Molienda artesanal de chocolate con el auténtico sabor tradicional, ideal para preparar una bebida caliente.' AS descripcion, 100.00 AS precio, 1 AS orden
  UNION ALL SELECT 'Chocolate de la casa 1/2 kg' AS nombre, 'Molienda artesanal de chocolate con el auténtico sabor tradicional, ideal para preparar una bebida caliente.' AS descripcion, 200.00 AS precio, 2 AS orden
  UNION ALL SELECT 'Chocolate de la casa 1 kg' AS nombre, 'Molienda artesanal de chocolate con el auténtico sabor tradicional, ideal para preparar una bebida caliente.' AS descripcion, 400.00 AS precio, 3 AS orden
) v
WHERE c.nombre = 'Chocolate de la casa';

-- Café de Atoyac
INSERT IGNORE INTO productos (categoria_id, nombre, descripcion, precio, orden)
SELECT c.id, v.nombre, NULLIF(v.descripcion, ''), v.precio, v.orden FROM categorias c
JOIN (
            SELECT 'Café de Atoyac 1/4 kg' AS nombre, 'Café artesanal de altura, con aroma intenso y sabor tradicional. Disponible molido o en grano.' AS descripcion, 100.00 AS precio, 1 AS orden
  UNION ALL SELECT 'Café de Atoyac 1/2 kg' AS nombre, 'Café artesanal de altura, con aroma intenso y sabor tradicional. Disponible molido o en grano.' AS descripcion, 200.00 AS precio, 2 AS orden
  UNION ALL SELECT 'Café de Atoyac 1 kg' AS nombre, 'Café artesanal de altura, con aroma intenso y sabor tradicional. Disponible molido o en grano.' AS descripcion, 395.00 AS precio, 3 AS orden
) v
WHERE c.nombre = 'Café de Atoyac';

-- Embotellados
INSERT IGNORE INTO productos (categoria_id, nombre, descripcion, precio, orden)
SELECT c.id, v.nombre, NULLIF(v.descripcion, ''), v.precio, v.orden FROM categorias c
JOIN (
            SELECT 'Agua mineral 600 ml' AS nombre, '' AS descripcion, 30.00 AS precio, 1 AS orden
  UNION ALL SELECT 'Coca-Cola 600 ml' AS nombre, '' AS descripcion, 30.00 AS precio, 2 AS orden
  UNION ALL SELECT 'Agua natural 600 ml' AS nombre, '' AS descripcion, 15.00 AS precio, 3 AS orden
) v
WHERE c.nombre = 'Embotellados';
