-- Patch aditivo: preserva a migration 4 já aplicada em campo e evolui o catálogo de moda sem reescrever histórico.

UPDATE categories SET sector = 'calcados' WHERE id IN ('sneakers', 'casual', 'bota', 'sandalia', 'social');
UPDATE categories SET sector = 'roupas' WHERE id IN ('blusas', 'jeans', 'vestidos', 'conjuntos');

UPDATE products SET sector = 'calcados' WHERE id IN ('p1', 'p2', 'p3', 'p4', 'p5', 'p6');
UPDATE products SET sector = 'roupas' WHERE id IN ('p7', 'p8', 'p9', 'p10', 'p11', 'p12');

INSERT OR IGNORE INTO categories (id, name, sector) VALUES
  ('blusas', 'Blusas', 'roupas'),
  ('jeans', 'Jeans', 'roupas'),
  ('vestidos', 'Vestidos', 'roupas');

INSERT OR IGNORE INTO brands (id, name, lead_time_days) VALUES
  ('jaque-style', 'Jaque Style', 9),
  ('bella-trama', 'Bella Trama', 11);

INSERT OR IGNORE INTO products (
  id, sector, name, sku, internal_code, barcode, brand_id, category_id, subcategory, gender, material, color,
  cost_price, sale_price, promotional_price, tags, status, image_hint
) VALUES
  ('p10', 'roupas', 'Blusa Soft Elegance', 'MOD-BLS-001', 'BLU-001', '7891002000011', 'jaque-style', 'blusas', 'Manga longa', 'Feminino', 'Viscolycra premium', 'Rose', 49.90, 99.90, 89.90, 'Moda,Reposicao', 'active', 'blusa rose feminina'),
  ('p11', 'roupas', 'Jeans Urban Fit', 'MOD-JEA-010', 'JEA-010', '7891002000012', 'bella-trama', 'jeans', 'Calca reta', 'Feminino', 'Jeans com elastano', 'Azul medio', 79.90, 159.90, NULL, 'Jeans,Ticket medio', 'active', 'calca jeans azul'),
  ('p12', 'roupas', 'Vestido Festa Lumiere', 'MOD-VES-045', 'VES-045', '7891002000014', 'bella-trama', 'vestidos', 'Longo festa', 'Feminino', 'Chiffon premium', 'Preto', 129.90, 269.90, NULL, 'Premium,Festa', 'active', 'vestido longo preto');

INSERT OR IGNORE INTO product_variants (id, product_id, size, stock, reserved) VALUES
  ('p9-gg', 'p9', 'GG', 2, 0),
  ('p10-p', 'p10', 'P', 6, 0),
  ('p10-m', 'p10', 'M', 8, 1),
  ('p10-g', 'p10', 'G', 5, 0),
  ('p10-gg', 'p10', 'GG', 3, 0),
  ('p11-p', 'p11', 'P', 4, 0),
  ('p11-m', 'p11', 'M', 7, 0),
  ('p11-g', 'p11', 'G', 6, 1),
  ('p11-gg', 'p11', 'GG', 2, 0),
  ('p12-p', 'p12', 'P', 2, 0),
  ('p12-m', 'p12', 'M', 3, 0),
  ('p12-g', 'p12', 'G', 2, 0),
  ('p12-gg', 'p12', 'GG', 1, 0);

INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES
  ('company_name', 'Smart Tech Moda e Calcados', CURRENT_TIMESTAMP),
  ('document', '12.345.678/0001-00', CURRENT_TIMESTAMP),
  ('auto_backup', 'Diario as 22:00', CURRENT_TIMESTAMP),
  ('updater_channel', 'stable', CURRENT_TIMESTAMP);

INSERT OR REPLACE INTO app_meta (key, value, updated_at) VALUES
  ('fashion_catalog_patch', 'v2', CURRENT_TIMESTAMP),
  ('offline_ready_baseline', 'v1', CURRENT_TIMESTAMP);
