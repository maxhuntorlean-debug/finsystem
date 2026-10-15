CREATE TABLE IF NOT EXISTS constants_meta (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  synonym TEXT NOT NULL DEFAULT '',
  comment TEXT NOT NULL DEFAULT '',
  value_type TEXT NOT NULL DEFAULT 'string',
  value TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
