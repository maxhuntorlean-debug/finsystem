ALTER TABLE constants_meta ADD COLUMN reference_catalog_id TEXT;
ALTER TABLE constants_meta ADD COLUMN value_length INTEGER NOT NULL DEFAULT 10;
ALTER TABLE constants_meta ADD COLUMN value_unbounded INTEGER NOT NULL DEFAULT 0;
ALTER TABLE constants_meta ADD COLUMN value_precision INTEGER NOT NULL DEFAULT 0;
