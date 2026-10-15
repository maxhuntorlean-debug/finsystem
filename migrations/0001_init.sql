CREATE TABLE catalogs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  synonym TEXT NOT NULL DEFAULT '',
  comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
