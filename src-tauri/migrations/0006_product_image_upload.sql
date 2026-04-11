ALTER TABLE products ADD COLUMN image_data_url TEXT;

INSERT OR REPLACE INTO app_meta (key, value, updated_at) VALUES
  ('product_image_upload_patch', 'enabled', CURRENT_TIMESTAMP);
