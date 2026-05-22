CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  task_types TEXT NOT NULL,
  premium_rate REAL NOT NULL,
  basic_rate REAL NOT NULL DEFAULT 0.1,
  success_rate REAL NOT NULL,
  avg_latency_sec INTEGER NOT NULL,
  online INTEGER NOT NULL DEFAULT 1,
  owner TEXT,
  manifest_url TEXT,
  manifest_source TEXT,
  token TEXT,
  earnings REAL NOT NULL DEFAULT 0,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  parent_agent_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  prompt TEXT NOT NULL,
  input_json TEXT,
  budget_cap REAL,
  deadline_sec INTEGER,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  job_kind TEXT,
  assigned_agent_id TEXT,
  score REAL,
  usage_json TEXT,
  billing_estimate_json TEXT,
  actual_billing_json TEXT,
  output_json TEXT,
  failure_reason TEXT,
  failure_category TEXT,
  callback_token TEXT,
  dispatch_json TEXT,
  workflow_parent_id TEXT,
  workflow_task TEXT,
  workflow_agent_name TEXT,
  workflow_json TEXT,
  executor_state_json TEXT,
  original_prompt TEXT,
  prompt_optimization_json TEXT,
  selection_mode TEXT,
  estimate_window_json TEXT,
  billing_reservation_json TEXT,
  logs_json TEXT,
  created_at TEXT NOT NULL,
  claimed_at TEXT,
  dispatched_at TEXT,
  started_at TEXT,
  last_callback_at TEXT,
  completed_at TEXT,
  failed_at TEXT,
  timed_out_at TEXT
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  meta_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  login TEXT NOT NULL UNIQUE,
  profile_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  account_login TEXT NOT NULL,
  label TEXT NOT NULL,
  mode TEXT NOT NULL,
  prefix TEXT,
  key_hash TEXT NOT NULL UNIQUE,
  scopes_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_used_at TEXT,
  last_used_path TEXT,
  last_used_method TEXT,
  revoked_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback_reports (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  email TEXT,
  reporter_login TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  resolution_note TEXT,
  context_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_transcripts (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  prompt TEXT NOT NULL,
  answer TEXT NOT NULL,
  prompt_chars INTEGER NOT NULL DEFAULT 0,
  answer_chars INTEGER NOT NULL DEFAULT 0,
  redacted INTEGER NOT NULL DEFAULT 0,
  answer_kind TEXT,
  status TEXT,
  task_type TEXT,
  source TEXT,
  page_path TEXT,
  tab TEXT,
  session_id TEXT,
  visitor_id TEXT,
  logged_in INTEGER NOT NULL DEFAULT 0,
  auth_provider TEXT,
  account_hash TEXT,
  url_count INTEGER NOT NULL DEFAULT 0,
  file_count INTEGER NOT NULL DEFAULT 0,
  file_chars INTEGER NOT NULL DEFAULT 0,
  review_status TEXT NOT NULL DEFAULT 'new',
  expected_handling TEXT,
  improvement_note TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  updated_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_deliveries (
  id TEXT PRIMARY KEY,
  account_login TEXT,
  recipient_email TEXT NOT NULL,
  sender_email TEXT,
  subject TEXT NOT NULL,
  template TEXT,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_message_id TEXT,
  payload_json TEXT,
  response_json TEXT,
  error_text TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exact_match_actions (
  id TEXT PRIMARY KEY,
  phrase TEXT NOT NULL,
  normalized_phrase TEXT NOT NULL,
  action TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  source TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

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

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_agent_id ON jobs(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_jobs_workflow_parent_id ON jobs(workflow_parent_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_accounts_login ON accounts(login);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_account_login ON api_keys(account_login);
CREATE INDEX IF NOT EXISTS idx_feedback_reports_created_at ON feedback_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_reports_status ON feedback_reports(status);
CREATE INDEX IF NOT EXISTS idx_chat_transcripts_created_at ON chat_transcripts(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_transcripts_review_status ON chat_transcripts(review_status);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_account_login_created_at ON email_deliveries(account_login,created_at);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_status_created_at ON email_deliveries(status,created_at);
CREATE INDEX IF NOT EXISTS idx_exact_match_actions_normalized_phrase ON exact_match_actions(normalized_phrase);
CREATE INDEX IF NOT EXISTS idx_campaigns_owner_updated ON campaigns(owner_login,updated_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_status_updated ON campaigns(status,updated_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_cmo_plan_job_id ON campaigns(cmo_plan_job_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_operations_agent_job_id ON campaigns(operations_agent_job_id);

CREATE TABLE IF NOT EXISTS recurring_orders (
  id TEXT PRIMARY KEY,
  owner_login TEXT NOT NULL,
  status TEXT NOT NULL,
  schedule_json TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  runs_attempted INTEGER NOT NULL DEFAULT 0,
  max_runs INTEGER NOT NULL DEFAULT 0,
  next_run_at TEXT,
  last_run_at TEXT,
  last_job_id TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recurring_orders_owner_login ON recurring_orders(owner_login);
CREATE INDEX IF NOT EXISTS idx_recurring_orders_status_next_run ON recurring_orders(status,next_run_at);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  account_hash TEXT NOT NULL,
  title TEXT,
  session_json TEXT NOT NULL,
  linked_order_id TEXT,
  active_job_ids_json TEXT,
  related_order_ids_json TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_account_hash_updated_at ON chat_sessions(account_hash,updated_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_linked_order_id ON chat_sessions(linked_order_id);

CREATE TABLE IF NOT EXISTS apps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'application',
  base_url TEXT,
  entry_url TEXT NOT NULL,
  healthcheck_url TEXT,
  capabilities_json TEXT,
  required_connectors_json TEXT,
  requires_approval_for_json TEXT,
  input_contract_json TEXT,
  handoff_json TEXT,
  tags_json TEXT,
  owner TEXT,
  visibility TEXT NOT NULL DEFAULT 'public',
  status TEXT NOT NULL DEFAULT 'active',
  verification_status TEXT,
  verification_checked_at TEXT,
  verification_error TEXT,
  verification_details_json TEXT,
  manifest_url TEXT,
  manifest_source TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_apps_owner ON apps(owner);
CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status);
CREATE INDEX IF NOT EXISTS idx_apps_updated_at ON apps(updated_at);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  source TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_app_settings_updated_at ON app_settings(updated_at);

CREATE TABLE IF NOT EXISTS app_contexts (
  id TEXT PRIMARY KEY,
  owner_login TEXT,
  source_app TEXT,
  source_app_label TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  payload_json TEXT NOT NULL,
  access_token TEXT,
  status TEXT NOT NULL DEFAULT 'ready',
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_app_contexts_owner_login ON app_contexts(owner_login);
CREATE INDEX IF NOT EXISTS idx_app_contexts_source_app ON app_contexts(source_app);
CREATE INDEX IF NOT EXISTS idx_app_contexts_expires_at ON app_contexts(expires_at);
CREATE INDEX IF NOT EXISTS idx_app_contexts_updated_at ON app_contexts(updated_at);

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
