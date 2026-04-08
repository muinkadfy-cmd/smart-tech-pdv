ALTER TABLE categories ADD COLUMN sector TEXT NOT NULL DEFAULT 'calcados';
ALTER TABLE products ADD COLUMN sector TEXT NOT NULL DEFAULT 'calcados';

UPDATE categories SET sector = 'calcados' WHERE sector IS NULL OR sector = '';
UPDATE products SET sector = 'calcados' WHERE sector IS NULL OR sector = '';

INSERT OR IGNORE INTO categories (id, name, sector) VALUES
  ('blusas', 'Blusas', 'roupas'),
  ('jeans', 'Jeans', 'roupas'),
  ('vestidos', 'Vestidos', 'roupas'),
  ('conjuntos', 'Conjuntos', 'roupas');

INSERT OR IGNORE INTO brands (id, name, lead_time_days) VALUES
  ('atelier-jade', 'Atelier Jade', 9),
  ('bella-fio', 'Bella Fio', 11);

INSERT OR IGNORE INTO products (
  id, sector, name, sku, internal_code, barcode, brand_id, category_id, subcategory, gender, material, color,
  cost_price, sale_price, promotional_price, tags, status, image_hint
) VALUES
  ('p7', 'roupas', 'Blusa Basic Glow', 'MOD-BLG-201', 'BLU-201', '7891002000201', 'bella-fio', 'blusas', 'Basica canelada', 'Feminino', 'Viscolycra', 'Rosa blush', 34.90, 79.90, 69.90, 'Moda rapida,Reposicao', 'active', 'blusa feminina rosa'),
  ('p8', 'roupas', 'Jeans City Fit', 'MOD-JCF-305', 'JEA-305', '7891002000305', 'atelier-jade', 'jeans', 'Cintura alta', 'Feminino', 'Jeans com elastano', 'Azul medio', 69.90, 149.90, NULL, 'Ticket medio', 'active', 'calca jeans feminina'),
  ('p9', 'roupas', 'Vestido Aura Midi', 'MOD-VAM-410', 'VES-410', '7891002000410', 'atelier-jade', 'vestidos', 'Midi casual', 'Feminino', 'Crepe leve', 'Verde oliva', 84.90, 189.90, 169.90, 'Vitrine,Vestidos', 'active', 'vestido midi verde');

INSERT OR IGNORE INTO product_variants (id, product_id, size, stock, reserved) VALUES
  ('p7-p', 'p7', 'P', 9, 0),
  ('p7-m', 'p7', 'M', 11, 1),
  ('p7-g', 'p7', 'G', 8, 0),
  ('p7-gg', 'p7', 'GG', 4, 0),
  ('p8-p', 'p8', 'P', 4, 0),
  ('p8-m', 'p8', 'M', 6, 0),
  ('p8-g', 'p8', 'G', 5, 0),
  ('p8-gg', 'p8', 'GG', 2, 0),
  ('p9-p', 'p9', 'P', 3, 0),
  ('p9-m', 'p9', 'M', 4, 1),
  ('p9-g', 'p9', 'G', 3, 0);

UPDATE settings SET value = 'Smart Tech Moda' WHERE key = 'company_name';
