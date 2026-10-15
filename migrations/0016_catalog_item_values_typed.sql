CREATE TABLE catalog_item_values_new (
  item_id TEXT NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  attribute_id TEXT NOT NULL REFERENCES catalog_attributes(id) ON DELETE CASCADE,
  value NOT NULL DEFAULT '',
  PRIMARY KEY (item_id, attribute_id)
);

INSERT INTO catalog_item_values_new (item_id, attribute_id, value)
SELECT
  v.item_id,
  v.attribute_id,
  CASE
    WHEN a.value_type = 'boolean' THEN CASE WHEN v.value = 'true' THEN 1 ELSE 0 END
    WHEN a.value_type = 'number' AND v.value <> '' THEN CAST(v.value AS REAL)
    ELSE v.value
  END
FROM catalog_item_values v
LEFT JOIN catalog_attributes a ON a.id = v.attribute_id;

DROP TABLE catalog_item_values;
ALTER TABLE catalog_item_values_new RENAME TO catalog_item_values;

CREATE INDEX idx_catalog_item_values_item ON catalog_item_values(item_id);
