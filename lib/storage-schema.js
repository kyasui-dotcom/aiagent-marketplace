// D1 table and index schema owned separately from storage runtime behavior.
export const D1_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS agents (\n  id TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  description TEXT NOT NULL,\n  task_types TEXT NOT NULL,\n  premium_rate REAL NOT NULL,\n  basic_rate REAL NOT NULL DEFAULT 0.1,\n  success_rate REAL NOT NULL,\n  avg_latency_sec INTEGER NOT NULL,\n  online INTEGER NOT NULL DEFAULT 1,\n  owner TEXT,\n  manifest_url TEXT,\n  manifest_source TEXT,\n  token TEXT,\n  earnings REAL NOT NULL DEFAULT 0,\n  metadata_json TEXT,\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS jobs (\n  id TEXT PRIMARY KEY,\n  parent_agent_id TEXT NOT NULL,\n  task_type TEXT NOT NULL,\n  prompt TEXT NOT NULL,\n  input_json TEXT,\n  budget_cap REAL,\n  deadline_sec INTEGER,\n  priority TEXT NOT NULL,\n  status TEXT NOT NULL,\n  job_kind TEXT,\n  assigned_agent_id TEXT,\n  score REAL,\n  usage_json TEXT,\n  billing_estimate_json TEXT,\n  actual_billing_json TEXT,\n  output_json TEXT,\n  failure_reason TEXT,\n  failure_category TEXT,\n  callback_token TEXT,\n  dispatch_json TEXT,\n  workflow_parent_id TEXT,\n  workflow_task TEXT,\n  workflow_agent_name TEXT,\n  workflow_json TEXT,\n  executor_state_json TEXT,\n  original_prompt TEXT,\n  prompt_optimization_json TEXT,\n  selection_mode TEXT,\n  estimate_window_json TEXT,\n  billing_reservation_json TEXT,\n  logs_json TEXT,\n  created_at TEXT NOT NULL,\n  claimed_at TEXT,\n  dispatched_at TEXT,\n  started_at TEXT,\n  last_callback_at TEXT,\n  completed_at TEXT,\n  failed_at TEXT,\n  timed_out_at TEXT\n);\n\nCREATE TABLE IF NOT EXISTS events (\n  id TEXT PRIMARY KEY,\n  type TEXT NOT NULL,\n  message TEXT NOT NULL,\n  meta_json TEXT,\n  created_at TEXT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS accounts (\n  id TEXT PRIMARY KEY,\n  login TEXT NOT NULL UNIQUE,\n  profile_json TEXT NOT NULL,\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS api_keys (\n  id TEXT PRIMARY KEY,\n  account_login TEXT NOT NULL,\n  label TEXT NOT NULL,\n  mode TEXT NOT NULL,\n  prefix TEXT,\n  key_hash TEXT NOT NULL UNIQUE,\n  scopes_json TEXT NOT NULL,\n  created_at TEXT NOT NULL,\n  last_used_at TEXT,\n  last_used_path TEXT,\n  last_used_method TEXT,\n  revoked_at TEXT,\n  updated_at TEXT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS feedback_reports (\n  id TEXT PRIMARY KEY,\n  type TEXT NOT NULL,\n  status TEXT NOT NULL,\n  title TEXT NOT NULL,\n  message TEXT NOT NULL,\n  email TEXT,\n  reporter_login TEXT,\n  reviewed_by TEXT,\n  reviewed_at TEXT,\n  resolution_note TEXT,\n  context_json TEXT,\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS chat_transcripts (\n  id TEXT PRIMARY KEY,\n  kind TEXT NOT NULL,\n  prompt TEXT NOT NULL,\n  answer TEXT NOT NULL,\n  prompt_chars INTEGER NOT NULL DEFAULT 0,\n  answer_chars INTEGER NOT NULL DEFAULT 0,\n  redacted INTEGER NOT NULL DEFAULT 0,\n  answer_kind TEXT,\n  status TEXT,\n  task_type TEXT,\n  source TEXT,\n  page_path TEXT,\n  tab TEXT,\n  session_id TEXT,\n  visitor_id TEXT,\n  logged_in INTEGER NOT NULL DEFAULT 0,\n  auth_provider TEXT,\n  account_hash TEXT,\n  url_count INTEGER NOT NULL DEFAULT 0,\n  file_count INTEGER NOT NULL DEFAULT 0,\n  file_chars INTEGER NOT NULL DEFAULT 0,\n  review_status TEXT NOT NULL DEFAULT 'new',\n  expected_handling TEXT,\n  improvement_note TEXT,\n  reviewed_by TEXT,\n  reviewed_at TEXT,\n  updated_at TEXT,\n  created_at TEXT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS email_deliveries (\n  id TEXT PRIMARY KEY,\n  account_login TEXT,\n  recipient_email TEXT NOT NULL,\n  sender_email TEXT,\n  subject TEXT NOT NULL,\n  template TEXT,\n  provider TEXT NOT NULL,\n  status TEXT NOT NULL,\n  provider_message_id TEXT,\n  payload_json TEXT,\n  response_json TEXT,\n  error_text TEXT,\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS exact_match_actions (\n  id TEXT PRIMARY KEY,\n  phrase TEXT NOT NULL,\n  normalized_phrase TEXT NOT NULL,\n  action TEXT NOT NULL,\n  enabled INTEGER NOT NULL DEFAULT 1,\n  source TEXT,\n  notes TEXT,\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n);\n\nCREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);\nCREATE INDEX IF NOT EXISTS idx_jobs_assigned_agent_id ON jobs(assigned_agent_id);\nCREATE INDEX IF NOT EXISTS idx_jobs_workflow_parent_id ON jobs(workflow_parent_id);\nCREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);\nCREATE INDEX IF NOT EXISTS idx_accounts_login ON accounts(login);\nCREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);\nCREATE INDEX IF NOT EXISTS idx_api_keys_account_login ON api_keys(account_login);\nCREATE INDEX IF NOT EXISTS idx_feedback_reports_created_at ON feedback_reports(created_at);\nCREATE INDEX IF NOT EXISTS idx_feedback_reports_status ON feedback_reports(status);\nCREATE INDEX IF NOT EXISTS idx_chat_transcripts_created_at ON chat_transcripts(created_at);\nCREATE INDEX IF NOT EXISTS idx_chat_transcripts_review_status ON chat_transcripts(review_status);\nCREATE INDEX IF NOT EXISTS idx_email_deliveries_account_login_created_at ON email_deliveries(account_login,created_at);\nCREATE INDEX IF NOT EXISTS idx_email_deliveries_status_created_at ON email_deliveries(status,created_at);\nCREATE INDEX IF NOT EXISTS idx_exact_match_actions_normalized_phrase ON exact_match_actions(normalized_phrase);`;

const RECURRING_D1_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS recurring_orders (
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
CREATE INDEX IF NOT EXISTS idx_recurring_orders_status_next_run ON recurring_orders(status,next_run_at);`;

const CHAT_SESSIONS_D1_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS chat_sessions (
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
CREATE INDEX IF NOT EXISTS idx_chat_sessions_linked_order_id ON chat_sessions(linked_order_id);`;

const APP_REGISTRY_D1_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS apps (
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
CREATE INDEX IF NOT EXISTS idx_apps_updated_at ON apps(updated_at);`;

const APP_SETTINGS_D1_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  source TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_app_settings_updated_at ON app_settings(updated_at);`;

const APP_CONTEXTS_D1_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS app_contexts (
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
CREATE INDEX IF NOT EXISTS idx_app_contexts_updated_at ON app_contexts(updated_at);`;

const DELIVERY_ITEMS_D1_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS delivery_items (
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
CREATE INDEX IF NOT EXISTS idx_delivery_items_workflow_parent_id ON delivery_items(workflow_parent_id);`;

const PUBLISHER_ITEMS_D1_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS publisher_items (
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
CREATE INDEX IF NOT EXISTS idx_publisher_item_versions_item_version ON publisher_item_versions(item_id,version);`;

const CAMPAIGNS_D1_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS campaigns (
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
CREATE INDEX IF NOT EXISTS idx_campaigns_operations_agent_job_id ON campaigns(operations_agent_job_id);`;

export const STORAGE_SCHEMA_SQL = `${D1_SCHEMA_SQL}\n\n${RECURRING_D1_SCHEMA_SQL}\n\n${CHAT_SESSIONS_D1_SCHEMA_SQL}\n\n${APP_REGISTRY_D1_SCHEMA_SQL}\n\n${APP_SETTINGS_D1_SCHEMA_SQL}\n\n${APP_CONTEXTS_D1_SCHEMA_SQL}\n\n${DELIVERY_ITEMS_D1_SCHEMA_SQL}\n\n${PUBLISHER_ITEMS_D1_SCHEMA_SQL}\n\n${CAMPAIGNS_D1_SCHEMA_SQL}`;
