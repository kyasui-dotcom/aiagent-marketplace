CREATE TABLE IF NOT EXISTS publisher_items (
  id TEXT PRIMARY KEY,
  owner_login TEXT,
  app_context_id TEXT,
  source_app TEXT,
  source_item_id TEXT,
  channel TEXT NOT NULL,
  destination TEXT,
  connector TEXT,
  connector_capability TEXT,
  item_type TEXT NOT NULL,
  contract_type TEXT,
  status TEXT NOT NULL DEFAULT 'needs_review',
  title TEXT NOT NULL,
  summary TEXT,
  body TEXT,
  validation_status TEXT NOT NULL DEFAULT 'needs_review',
  validation_json TEXT,
  selected_medium_json TEXT,
  shape_json TEXT,
  payload_json TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS publisher_item_versions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  owner_login TEXT,
  app_context_id TEXT,
  version INTEGER NOT NULL,
  reason TEXT,
  validation_json TEXT,
  selected_medium_json TEXT,
  shape_json TEXT,
  payload_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_publisher_items_owner_updated ON publisher_items(owner_login,updated_at);
CREATE INDEX IF NOT EXISTS idx_publisher_items_channel_updated ON publisher_items(channel,updated_at);
CREATE INDEX IF NOT EXISTS idx_publisher_items_validation_updated ON publisher_items(validation_status,updated_at);
CREATE INDEX IF NOT EXISTS idx_publisher_items_app_context_id ON publisher_items(app_context_id);
CREATE INDEX IF NOT EXISTS idx_publisher_item_versions_item_version ON publisher_item_versions(item_id,version);
