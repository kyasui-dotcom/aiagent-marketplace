CREATE TABLE IF NOT EXISTS delivery_items (
  id TEXT PRIMARY KEY,
  owner_login TEXT,
  surface TEXT NOT NULL,
  item_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'needs_review',
  title TEXT NOT NULL,
  summary TEXT,
  body TEXT,
  metadata_json TEXT,
  source_json TEXT,
  job_id TEXT NOT NULL,
  workflow_parent_id TEXT,
  workflow_task TEXT,
  workflow_agent_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_delivery_items_owner_surface_updated ON delivery_items(owner_login,surface,updated_at);
CREATE INDEX IF NOT EXISTS idx_delivery_items_surface_updated ON delivery_items(surface,updated_at);
CREATE INDEX IF NOT EXISTS idx_delivery_items_job_id ON delivery_items(job_id);
CREATE INDEX IF NOT EXISTS idx_delivery_items_workflow_parent_id ON delivery_items(workflow_parent_id);
