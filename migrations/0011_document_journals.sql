CREATE TABLE IF NOT EXISTS document_journals_meta (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  synonym TEXT NOT NULL DEFAULT '',
  comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS document_journal_members (
  journal_id TEXT NOT NULL REFERENCES document_journals_meta(id) ON DELETE CASCADE,
  document_meta_id TEXT NOT NULL REFERENCES documents_meta(id) ON DELETE CASCADE,
  PRIMARY KEY (journal_id, document_meta_id)
);
