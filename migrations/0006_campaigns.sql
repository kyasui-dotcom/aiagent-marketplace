CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  owner_login TEXT,
  title TEXT NOT NULL,
  objective TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  source TEXT,
  cmo_plan_job_id TEXT,
  operations_agent_job_id TEXT,
  target_url TEXT,
  audience TEXT,
  channels_json TEXT,
  kpis_json TEXT,
  plan_json TEXT,
  tasks_json TEXT,
  metrics_json TEXT,
  logs_json TEXT,
  publisher_json TEXT,
  integrations_json TEXT,
  lead_source_json TEXT,
  ads_json TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_campaigns_owner_updated ON campaigns(owner_login,updated_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_status_updated ON campaigns(status,updated_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_cmo_plan_job_id ON campaigns(cmo_plan_job_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_operations_agent_job_id ON campaigns(operations_agent_job_id);
