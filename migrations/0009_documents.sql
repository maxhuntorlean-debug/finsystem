CREATE TABLE IF NOT EXISTS documents_meta (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  synonym TEXT NOT NULL DEFAULT '',
  comment TEXT NOT NULL DEFAULT '',
  number_length INTEGER NOT NULL DEFAULT 9,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS document_items (
  id TEXT PRIMARY KEY,
  document_meta_id TEXT NOT NULL REFERENCES documents_meta(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_document_items_meta ON document_items(document_meta_id);

CREATE TABLE IF NOT EXISTS document_forms (
  document_meta_id TEXT PRIMARY KEY REFERENCES documents_meta(id) ON DELETE CASCADE,
  canvas_width INTEGER NOT NULL DEFAULT 340,
  canvas_height INTEGER NOT NULL DEFAULT 240,
  controls TEXT NOT NULL DEFAULT '[]',
  module TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
