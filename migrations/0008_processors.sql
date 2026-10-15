CREATE TABLE IF NOT EXISTS processors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  synonym TEXT NOT NULL DEFAULT '',
  comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS processor_forms (
  processor_id TEXT PRIMARY KEY REFERENCES processors(id) ON DELETE CASCADE,
  canvas_width INTEGER NOT NULL DEFAULT 340,
  canvas_height INTEGER NOT NULL DEFAULT 240,
  controls TEXT NOT NULL DEFAULT '[]',
  module TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
