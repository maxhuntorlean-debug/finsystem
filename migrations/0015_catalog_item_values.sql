CREATE TABLE catalog_item_values (
  item_id TEXT NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  attribute_id TEXT NOT NULL REFERENCES catalog_attributes(id) ON DELETE CASCADE,
  value TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (item_id, attribute_id)
);

CREATE INDEX idx_catalog_item_values_item ON catalog_item_values(item_id);
