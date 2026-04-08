INSERT OR IGNORE INTO settings (key, value) VALUES
  ('document', '12.345.678/0001-00'),
  ('auto_backup', 'Diario as 22:00'),
  ('updater_channel', 'stable');

INSERT OR IGNORE INTO app_meta (key, value) VALUES
  ('offline_ready_baseline', 'v1');
