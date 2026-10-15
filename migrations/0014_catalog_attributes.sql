CREATE TABLE catalog_attributes (
  id TEXT PRIMARY KEY,
  catalog_id TEXT NOT NULL REFERENCES catalogs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  synonym TEXT NOT NULL DEFAULT '',
  comment TEXT NOT NULL DEFAULT '',
  value_type TEXT NOT NULL DEFAULT 'string',
  reference_catalog_id TEXT,
  value_length INTEGER NOT NULL DEFAULT 10,
  value_unbounded INTEGER NOT NULL DEFAULT 0,
  value_precision INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_catalog_attributes_catalog ON catalog_attributes(catalog_id);
