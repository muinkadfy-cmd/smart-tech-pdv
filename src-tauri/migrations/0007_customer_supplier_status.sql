ALTER TABLE customers ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE suppliers ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

UPDATE customers SET status = 'active' WHERE status IS NULL OR status = '';
UPDATE suppliers SET status = 'active' WHERE status IS NULL OR status = '';
