INSERT OR IGNORE INTO categories (id, name) VALUES
  ('sneakers', 'Sneakers'),
  ('casual', 'Casual'),
  ('bota', 'Botas'),
  ('sandalia', 'Sandalias'),
  ('social', 'Social');

INSERT OR IGNORE INTO brands (id, name, lead_time_days) VALUES
  ('urban-step', 'Urban Step', 7),
  ('vento', 'Vento', 10),
  ('atelier-sole', 'Atelier Sole', 14),
  ('nord', 'Nord', 12);

INSERT OR IGNORE INTO products (
  id, name, sku, internal_code, barcode, brand_id, category_id, subcategory, gender, material, color,
  cost_price, sale_price, promotional_price, tags, status, image_hint
) VALUES
  ('p1', 'Urban Motion Knit', 'STM-UMK-001', 'TEN-001', '7891001000011', 'urban-step', 'sneakers', 'Running casual', 'Unissex', 'Knit premium', 'Azul marinho', 129.90, 249.90, 229.90, 'Best-seller,Conforto', 'active', 'tenis azul premium'),
  ('p2', 'Vento Street Lite', 'STM-VSL-014', 'TEN-014', '7891001000012', 'vento', 'sneakers', 'Streetwear', 'Masculino', 'Sintetico fosco', 'Branco gelo', 139.50, 279.90, NULL, 'Lancamento', 'active', 'tenis branco clean'),
  ('p3', 'Atelier Sole Firenze', 'STM-ASF-088', 'SOC-088', '7891001000013', 'atelier-sole', 'social', 'Oxford', 'Masculino', 'Couro legitimo', 'Cafe', 199.90, 389.90, NULL, 'Premium', 'active', 'sapato couro cafe');

INSERT OR IGNORE INTO product_variants (id, product_id, size, stock, reserved) VALUES
  ('p1-38', 'p1', '38', 4, 1),
  ('p1-39', 'p1', '39', 6, 0),
  ('p2-40', 'p2', '40', 5, 0),
  ('p2-41', 'p2', '41', 4, 0),
  ('p3-40', 'p3', '40', 4, 0),
  ('p3-41', 'p3', '41', 5, 1);

INSERT OR IGNORE INTO customers (id, name, phone, whatsapp, email, notes) VALUES
  ('c1', 'Marina Queiroz', '(11) 99444-2201', '(11) 99444-2201', 'marina@exemplo.com', 'Prefere novidades femininas e contato por WhatsApp.'),
  ('c2', 'Rafael Nunes', '(11) 98111-1414', '(11) 98111-1414', 'rafael@exemplo.com', 'Compra para trabalho e costuma levar 2 pares.');

INSERT OR IGNORE INTO suppliers (id, name, cnpj, contact, email, lead_time_days) VALUES
  ('s1', 'Urban Step Distribuicao', '44.222.111/0001-10', 'Renata Sales', 'renata@urbanstep.com', 7),
  ('s2', 'Atelier Sole Brasil', '10.300.500/0001-20', 'Paulo Vinicius', 'paulo@ateliersole.com', 14);

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('company_name', 'Smart Tech Calcados'),
  ('theme', 'Premium Light'),
  ('thermal_printer_58', 'EPSON TM-T20 58mm'),
  ('thermal_printer_80', 'ELGIN Flash 80mm');

INSERT OR IGNORE INTO app_meta (key, value) VALUES
  ('seed_version', '1'),
  ('database_name', 'smart-tech-pdv.db');
