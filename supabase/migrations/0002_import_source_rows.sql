ALTER TABLE import_batches ADD COLUMN source_rows jsonb NOT NULL DEFAULT '[]';
