CREATE TABLE IF NOT EXISTS chart_of_accounts_meta (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  synonym TEXT NOT NULL DEFAULT '',
  comment TEXT NOT NULL DEFAULT '',
  code_length INTEGER NOT NULL DEFAULT 2,
  levels INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chart_of_accounts_items (
  id TEXT PRIMARY KEY,
  chart_meta_id TEXT NOT NULL REFERENCES chart_of_accounts_meta(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  account_type TEXT NOT NULL DEFAULT 'active',
  currency INTEGER NOT NULL DEFAULT 0,
  quantitative INTEGER NOT NULL DEFAULT 0,
  off_balance INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chart_items_meta ON chart_of_accounts_items(chart_meta_id);

CREATE TABLE IF NOT EXISTS chart_of_accounts_forms (
  chart_meta_id TEXT PRIMARY KEY REFERENCES chart_of_accounts_meta(id) ON DELETE CASCADE,
  canvas_width INTEGER NOT NULL DEFAULT 340,
  canvas_height INTEGER NOT NULL DEFAULT 240,
  controls TEXT NOT NULL DEFAULT '[]',
  module TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
