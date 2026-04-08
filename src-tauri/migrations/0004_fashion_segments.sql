ALTER TABLE products ADD COLUMN sector TEXT NOT NULL DEFAULT 'calcados';

UPDATE products SET sector = 'calcados' WHERE sector IS NULL OR TRIM(sector) = '';

INSERT OR IGNORE INTO categories (id, name) VALUES
  ('blusas', 'Blusas'),
  ('calca-jeans', 'Calcas Jeans'),
  ('conjuntos', 'Conjuntos'),
  ('vestido-midi', 'Vestidos Midi'),
  ('vestido-festa', 'Vestidos Festa');

INSERT OR IGNORE INTO brands (id, name, lead_time_days) VALUES
  ('luna-style', 'Luna Style', 9),
  ('atelier-jade', 'Atelier Jade', 12);

INSERT OR IGNORE INTO products (
  id, name, sector, sku, internal_code, barcode, brand_id, category_id, subcategory, gender, material, color,
  cost_price, sale_price, promotional_price, tags, status, image_hint
) VALUES
  ('p9', 'Luna Essential Blazer', 'roupas', 'STM-LEB-201', 'ROU-201', '7891001000019', 'luna-style', 'blusas', 'Blazer feminino', 'Feminino', 'Alfaiataria premium', 'Areia', 119.90, 249.90, 229.90, 'Look completo,Moda', 'active', 'blazer feminino areia'),
  ('p10', 'Luna Denim Wide Leg', 'roupas', 'STM-LDW-214', 'ROU-214', '7891001000020', 'luna-style', 'calca-jeans', 'Jeans wide leg', 'Feminino', 'Jeans premium', 'Azul medio', 89.90, 189.90, NULL, 'Jeans,Reposicao', 'active', 'calca jeans feminina'),
  ('p11', 'Atelier Jade Lumiere', 'vestidos', 'STM-AJL-305', 'VES-305', '7891001000021', 'atelier-jade', 'vestido-festa', 'Vestido festa longo', 'Feminino', 'Crepe acetinado', 'Rose', 179.90, 389.90, 349.90, 'Vestido,Festa', 'active', 'vestido festa rose');

INSERT OR IGNORE INTO product_variants (id, product_id, size, stock, reserved) VALUES
  ('p9-p', 'p9', 'P', 5, 0),
  ('p9-m', 'p9', 'M', 7, 1),
  ('p9-g', 'p9', 'G', 4, 0),
  ('p9-gg', 'p9', 'GG', 2, 0),
  ('p10-36', 'p10', '36', 3, 0),
  ('p10-38', 'p10', '38', 6, 0),
  ('p10-40', 'p10', '40', 5, 0),
  ('p10-42', 'p10', '42', 2, 0),
  ('p11-38', 'p11', '38', 2, 0),
  ('p11-40', 'p11', '40', 3, 0),
  ('p11-42', 'p11', '42', 2, 0),
  ('p11-44', 'p11', '44', 1, 0);

INSERT OR IGNORE INTO stock_movements (id, product_id, type, quantity, reason, size) VALUES
  ('m-p9-seed', 'p9', 'entrada', 18, 'Carga inicial moda', 'grade'),
  ('m-p10-seed', 'p10', 'entrada', 16, 'Carga inicial moda', 'grade'),
  ('m-p11-seed', 'p11', 'entrada', 8, 'Carga inicial moda', 'grade');
