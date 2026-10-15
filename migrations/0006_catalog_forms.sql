CREATE TABLE catalog_forms (
  catalog_id TEXT PRIMARY KEY REFERENCES catalogs(id),
  canvas_width INTEGER NOT NULL,
  canvas_height INTEGER NOT NULL,
  controls TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
