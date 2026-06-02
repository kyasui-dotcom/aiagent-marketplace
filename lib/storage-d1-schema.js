export async function ensureD1StorageSchema(db, schemaSql) {
  const statements = String(schemaSql || '').split(';').map((statement) => statement.trim()).filter(Boolean);
  await runSchemaStatements(db, statements);
  await ensureAgentColumns(db);
  await ensureJobWorkflowColumns(db);
  await ensureChatTranscriptColumns(db);
  await ensureChatSessionColumns(db);
  await ensureApiKeyColumns(db);
  await ensureFeedbackReportColumns(db);
  await ensureRecurringOrderColumns(db);
  await ensureEmailDeliveryColumns(db);
  await ensureExactMatchActionColumns(db);
  await ensureAppRegistryColumns(db);
  await ensureAppSettingColumns(db);
  await ensureAppContextColumns(db);
  await ensureDeliveryItemColumns(db);
  await ensurePublisherItemColumns(db);
  await ensureCampaignColumns(db);
}

async function runSchemaStatements(db, statements = []) {
  if (!Array.isArray(statements) || !statements.length) return;
  if (typeof db.batch === 'function') {
    await db.batch(statements.map((sql) => db.prepare(sql)));
    return;
  }
  for (const sql of statements) await db.prepare(sql).run();
}

async function ensureColumns(db, tableName, additions = []) {
  const safeTable = String(tableName || '').trim();
  if (!safeTable) return;
  const columns = await db.prepare(`PRAGMA table_info(${safeTable})`).all();
  const existing = new Set((columns.results || []).map((row) => String(row.name || '').trim()).filter(Boolean));
  for (const [name, ddl] of additions) {
    if (!existing.has(name)) await db.prepare(`ALTER TABLE ${safeTable} ADD COLUMN ${ddl}`).run();
  }
}

async function ensureAgentColumns(db) {
  await ensureColumns(db, 'agents', [
    ['description', "description TEXT NOT NULL DEFAULT ''"],
    ['task_types', "task_types TEXT NOT NULL DEFAULT '[]'"],
    ['premium_rate', 'premium_rate REAL NOT NULL DEFAULT 0.1'],
    ['basic_rate', 'basic_rate REAL NOT NULL DEFAULT 0.1'],
    ['success_rate', 'success_rate REAL NOT NULL DEFAULT 0.9'],
    ['avg_latency_sec', 'avg_latency_sec INTEGER NOT NULL DEFAULT 20'],
    ['online', 'online INTEGER NOT NULL DEFAULT 1'],
    ['owner', 'owner TEXT'],
    ['manifest_url', 'manifest_url TEXT'],
    ['manifest_source', 'manifest_source TEXT'],
    ['token', 'token TEXT'],
    ['earnings', 'earnings REAL NOT NULL DEFAULT 0'],
    ['metadata_json', 'metadata_json TEXT'],
    ['created_at', "created_at TEXT NOT NULL DEFAULT ''"],
    ['updated_at', "updated_at TEXT NOT NULL DEFAULT ''"]
  ]);
}

async function ensureChatTranscriptColumns(db) {
  await ensureColumns(db, 'chat_transcripts', [
    ['kind', "kind TEXT NOT NULL DEFAULT 'work_chat'"],
    ['prompt', "prompt TEXT NOT NULL DEFAULT ''"],
    ['answer', "answer TEXT NOT NULL DEFAULT ''"],
    ['prompt_chars', 'prompt_chars INTEGER NOT NULL DEFAULT 0'],
    ['answer_chars', 'answer_chars INTEGER NOT NULL DEFAULT 0'],
    ['redacted', 'redacted INTEGER NOT NULL DEFAULT 0'],
    ['answer_kind', 'answer_kind TEXT'],
    ['status', 'status TEXT'],
    ['task_type', 'task_type TEXT'],
    ['source', 'source TEXT'],
    ['page_path', 'page_path TEXT'],
    ['tab', 'tab TEXT'],
    ['session_id', 'session_id TEXT'],
    ['visitor_id', 'visitor_id TEXT'],
    ['logged_in', 'logged_in INTEGER NOT NULL DEFAULT 0'],
    ['auth_provider', 'auth_provider TEXT'],
    ['account_hash', 'account_hash TEXT'],
    ['url_count', 'url_count INTEGER NOT NULL DEFAULT 0'],
    ['file_count', 'file_count INTEGER NOT NULL DEFAULT 0'],
    ['file_chars', 'file_chars INTEGER NOT NULL DEFAULT 0'],
    ['review_status', "review_status TEXT NOT NULL DEFAULT 'new'"],
    ['expected_handling', 'expected_handling TEXT'],
    ['improvement_note', 'improvement_note TEXT'],
    ['reviewed_by', 'reviewed_by TEXT'],
    ['reviewed_at', 'reviewed_at TEXT'],
    ['updated_at', 'updated_at TEXT'],
    ['created_at', "created_at TEXT NOT NULL DEFAULT ''"]
  ]);
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_chat_transcripts_session_id ON chat_transcripts(session_id)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_chat_transcripts_account_hash_created_at ON chat_transcripts(account_hash,created_at)').run();
}

async function ensureChatSessionColumns(db) {
  await ensureColumns(db, 'chat_sessions', [
    ['account_hash', "account_hash TEXT NOT NULL DEFAULT ''"],
    ['title', 'title TEXT'],
    ['session_json', "session_json TEXT NOT NULL DEFAULT '{}'"],
    ['linked_order_id', 'linked_order_id TEXT'],
    ['active_job_ids_json', 'active_job_ids_json TEXT'],
    ['related_order_ids_json', 'related_order_ids_json TEXT'],
    ['deleted_at', 'deleted_at TEXT'],
    ['created_at', "created_at TEXT NOT NULL DEFAULT ''"],
    ['updated_at', "updated_at TEXT NOT NULL DEFAULT ''"]
  ]);
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_chat_sessions_account_hash_updated_at ON chat_sessions(account_hash,updated_at)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_chat_sessions_linked_order_id ON chat_sessions(linked_order_id)').run();
}

async function ensureJobWorkflowColumns(db) {
  await ensureColumns(db, 'jobs', [
    ['parent_agent_id', "parent_agent_id TEXT NOT NULL DEFAULT ''"],
    ['task_type', "task_type TEXT NOT NULL DEFAULT 'research'"],
    ['prompt', "prompt TEXT NOT NULL DEFAULT ''"],
    ['input_json', 'input_json TEXT'],
    ['budget_cap', 'budget_cap REAL'],
    ['deadline_sec', 'deadline_sec INTEGER'],
    ['priority', "priority TEXT NOT NULL DEFAULT 'normal'"],
    ['status', "status TEXT NOT NULL DEFAULT 'queued'"],
    ['job_kind', 'job_kind TEXT'],
    ['assigned_agent_id', 'assigned_agent_id TEXT'],
    ['score', 'score REAL'],
    ['usage_json', 'usage_json TEXT'],
    ['billing_estimate_json', 'billing_estimate_json TEXT'],
    ['actual_billing_json', 'actual_billing_json TEXT'],
    ['output_json', 'output_json TEXT'],
    ['failure_reason', 'failure_reason TEXT'],
    ['failure_category', 'failure_category TEXT'],
    ['callback_token', 'callback_token TEXT'],
    ['dispatch_json', 'dispatch_json TEXT'],
    ['workflow_parent_id', 'workflow_parent_id TEXT'],
    ['workflow_task', 'workflow_task TEXT'],
    ['workflow_agent_name', 'workflow_agent_name TEXT'],
    ['workflow_json', 'workflow_json TEXT'],
    ['executor_state_json', 'executor_state_json TEXT'],
    ['original_prompt', 'original_prompt TEXT'],
    ['prompt_optimization_json', 'prompt_optimization_json TEXT'],
    ['selection_mode', 'selection_mode TEXT'],
    ['estimate_window_json', 'estimate_window_json TEXT'],
    ['billing_reservation_json', 'billing_reservation_json TEXT'],
    ['logs_json', 'logs_json TEXT'],
    ['created_at', "created_at TEXT NOT NULL DEFAULT ''"],
    ['claimed_at', 'claimed_at TEXT'],
    ['dispatched_at', 'dispatched_at TEXT'],
    ['started_at', 'started_at TEXT'],
    ['last_callback_at', 'last_callback_at TEXT'],
    ['completed_at', 'completed_at TEXT'],
    ['failed_at', 'failed_at TEXT'],
    ['timed_out_at', 'timed_out_at TEXT']
  ]);
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_jobs_workflow_parent_id ON jobs(workflow_parent_id)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_jobs_workflow_parent_created_at ON jobs(workflow_parent_id,created_at)').run();
}

async function ensureApiKeyColumns(db) {
  await ensureColumns(db, 'api_keys', [
    ['account_login', "account_login TEXT NOT NULL DEFAULT ''"],
    ['label', "label TEXT NOT NULL DEFAULT 'default'"],
    ['mode', "mode TEXT NOT NULL DEFAULT 'live'"],
    ['prefix', 'prefix TEXT'],
    ['key_hash', "key_hash TEXT NOT NULL DEFAULT ''"],
    ['scopes_json', "scopes_json TEXT NOT NULL DEFAULT '[]'"],
    ['created_at', "created_at TEXT NOT NULL DEFAULT ''"],
    ['last_used_at', 'last_used_at TEXT'],
    ['last_used_path', 'last_used_path TEXT'],
    ['last_used_method', 'last_used_method TEXT'],
    ['revoked_at', 'revoked_at TEXT'],
    ['updated_at', "updated_at TEXT NOT NULL DEFAULT ''"]
  ]);
}

async function ensureFeedbackReportColumns(db) {
  await ensureColumns(db, 'feedback_reports', [
    ['type', "type TEXT NOT NULL DEFAULT 'general'"],
    ['status', "status TEXT NOT NULL DEFAULT 'open'"],
    ['title', "title TEXT NOT NULL DEFAULT ''"],
    ['message', "message TEXT NOT NULL DEFAULT ''"],
    ['email', 'email TEXT'],
    ['reporter_login', 'reporter_login TEXT'],
    ['reviewed_by', 'reviewed_by TEXT'],
    ['reviewed_at', 'reviewed_at TEXT'],
    ['resolution_note', 'resolution_note TEXT'],
    ['context_json', 'context_json TEXT'],
    ['created_at', "created_at TEXT NOT NULL DEFAULT ''"],
    ['updated_at', "updated_at TEXT NOT NULL DEFAULT ''"]
  ]);
}

async function ensureRecurringOrderColumns(db) {
  await ensureColumns(db, 'recurring_orders', [
    ['owner_login', "owner_login TEXT NOT NULL DEFAULT ''"],
    ['status', "status TEXT NOT NULL DEFAULT 'active'"],
    ['schedule_json', "schedule_json TEXT NOT NULL DEFAULT '{}'"],
    ['payload_json', "payload_json TEXT NOT NULL DEFAULT '{}'"],
    ['runs_attempted', 'runs_attempted INTEGER NOT NULL DEFAULT 0'],
    ['max_runs', 'max_runs INTEGER NOT NULL DEFAULT 0'],
    ['next_run_at', 'next_run_at TEXT'],
    ['last_run_at', 'last_run_at TEXT'],
    ['last_job_id', 'last_job_id TEXT'],
    ['last_error', 'last_error TEXT'],
    ['created_at', "created_at TEXT NOT NULL DEFAULT ''"],
    ['updated_at', "updated_at TEXT NOT NULL DEFAULT ''"]
  ]);
}

async function ensureEmailDeliveryColumns(db) {
  await ensureColumns(db, 'email_deliveries', [
    ['account_login', 'account_login TEXT'],
    ['recipient_email', "recipient_email TEXT NOT NULL DEFAULT ''"],
    ['sender_email', 'sender_email TEXT'],
    ['subject', "subject TEXT NOT NULL DEFAULT ''"],
    ['template', 'template TEXT'],
    ['provider', "provider TEXT NOT NULL DEFAULT 'resend'"],
    ['status', "status TEXT NOT NULL DEFAULT 'queued'"],
    ['provider_message_id', 'provider_message_id TEXT'],
    ['payload_json', 'payload_json TEXT'],
    ['response_json', 'response_json TEXT'],
    ['error_text', 'error_text TEXT'],
    ['created_at', "created_at TEXT NOT NULL DEFAULT ''"],
    ['updated_at', "updated_at TEXT NOT NULL DEFAULT ''"]
  ]);
}

async function ensureExactMatchActionColumns(db) {
  await ensureColumns(db, 'exact_match_actions', [
    ['phrase', "phrase TEXT NOT NULL DEFAULT ''"],
    ['normalized_phrase', "normalized_phrase TEXT NOT NULL DEFAULT ''"],
    ['action', "action TEXT NOT NULL DEFAULT ''"],
    ['enabled', 'enabled INTEGER NOT NULL DEFAULT 1'],
    ['source', 'source TEXT'],
    ['notes', 'notes TEXT'],
    ['created_at', "created_at TEXT NOT NULL DEFAULT ''"],
    ['updated_at', "updated_at TEXT NOT NULL DEFAULT ''"]
  ]);
}

async function ensureAppSettingColumns(db) {
  await ensureColumns(db, 'app_settings', [
    ['value', "value TEXT NOT NULL DEFAULT ''"],
    ['source', 'source TEXT'],
    ['created_at', "created_at TEXT NOT NULL DEFAULT ''"],
    ['updated_at', "updated_at TEXT NOT NULL DEFAULT ''"]
  ]);
}

async function ensureAppContextColumns(db) {
  await ensureColumns(db, 'app_contexts', [
    ['owner_login', 'owner_login TEXT'],
    ['source_app', 'source_app TEXT'],
    ['source_app_label', 'source_app_label TEXT'],
    ['title', "title TEXT NOT NULL DEFAULT ''"],
    ['summary', 'summary TEXT'],
    ['payload_json', "payload_json TEXT NOT NULL DEFAULT '{}'"],
    ['access_token', 'access_token TEXT'],
    ['status', "status TEXT NOT NULL DEFAULT 'ready'"],
    ['expires_at', 'expires_at TEXT'],
    ['created_at', "created_at TEXT NOT NULL DEFAULT ''"],
    ['updated_at', "updated_at TEXT NOT NULL DEFAULT ''"]
  ]);
}

async function ensureDeliveryItemColumns(db) {
  await ensureColumns(db, 'delivery_items', [
    ['owner_login', 'owner_login TEXT'],
    ['surface', "surface TEXT NOT NULL DEFAULT 'general'"],
    ['item_type', "item_type TEXT NOT NULL DEFAULT 'delivery_asset'"],
    ['status', "status TEXT NOT NULL DEFAULT 'needs_review'"],
    ['title', "title TEXT NOT NULL DEFAULT 'Delivery item'"],
    ['summary', 'summary TEXT'],
    ['body', 'body TEXT'],
    ['metadata_json', 'metadata_json TEXT'],
    ['source_json', 'source_json TEXT'],
    ['job_id', "job_id TEXT NOT NULL DEFAULT ''"],
    ['workflow_parent_id', 'workflow_parent_id TEXT'],
    ['workflow_task', 'workflow_task TEXT'],
    ['workflow_agent_name', 'workflow_agent_name TEXT'],
    ['created_at', "created_at TEXT NOT NULL DEFAULT ''"],
    ['updated_at', "updated_at TEXT NOT NULL DEFAULT ''"]
  ]);
}

async function ensurePublisherItemColumns(db) {
  await ensureColumns(db, 'publisher_items', [
    ['owner_login', 'owner_login TEXT'],
    ['app_context_id', 'app_context_id TEXT'],
    ['source_app', 'source_app TEXT'],
    ['source_item_id', 'source_item_id TEXT'],
    ['channel', "channel TEXT NOT NULL DEFAULT 'generic'"],
    ['destination', 'destination TEXT'],
    ['connector', 'connector TEXT'],
    ['connector_capability', 'connector_capability TEXT'],
    ['item_type', "item_type TEXT NOT NULL DEFAULT 'publish_asset'"],
    ['contract_type', 'contract_type TEXT'],
    ['status', "status TEXT NOT NULL DEFAULT 'needs_review'"],
    ['title', "title TEXT NOT NULL DEFAULT 'Publisher item'"],
    ['summary', 'summary TEXT'],
    ['body', 'body TEXT'],
    ['validation_status', "validation_status TEXT NOT NULL DEFAULT 'needs_review'"],
    ['validation_json', 'validation_json TEXT'],
    ['selected_medium_json', 'selected_medium_json TEXT'],
    ['shape_json', 'shape_json TEXT'],
    ['payload_json', 'payload_json TEXT'],
    ['version', 'version INTEGER NOT NULL DEFAULT 1'],
    ['created_at', "created_at TEXT NOT NULL DEFAULT ''"],
    ['updated_at', "updated_at TEXT NOT NULL DEFAULT ''"]
  ]);
  await ensureColumns(db, 'publisher_item_versions', [
    ['item_id', "item_id TEXT NOT NULL DEFAULT ''"],
    ['owner_login', 'owner_login TEXT'],
    ['app_context_id', 'app_context_id TEXT'],
    ['version', 'version INTEGER NOT NULL DEFAULT 1'],
    ['reason', 'reason TEXT'],
    ['validation_json', 'validation_json TEXT'],
    ['selected_medium_json', 'selected_medium_json TEXT'],
    ['shape_json', 'shape_json TEXT'],
    ['payload_json', 'payload_json TEXT'],
    ['created_at', "created_at TEXT NOT NULL DEFAULT ''"]
  ]);
}

async function ensureCampaignColumns(db) {
  await ensureColumns(db, 'campaigns', [
    ['owner_login', 'owner_login TEXT'],
    ['title', "title TEXT NOT NULL DEFAULT 'Untitled campaign'"],
    ['objective', 'objective TEXT'],
    ['status', "status TEXT NOT NULL DEFAULT 'draft'"],
    ['source', 'source TEXT'],
    ['cmo_plan_job_id', 'cmo_plan_job_id TEXT'],
    ['operations_agent_job_id', 'operations_agent_job_id TEXT'],
    ['target_url', 'target_url TEXT'],
    ['audience', 'audience TEXT'],
    ['channels_json', 'channels_json TEXT'],
    ['kpis_json', 'kpis_json TEXT'],
    ['plan_json', 'plan_json TEXT'],
    ['tasks_json', 'tasks_json TEXT'],
    ['metrics_json', 'metrics_json TEXT'],
    ['logs_json', 'logs_json TEXT'],
    ['publisher_json', 'publisher_json TEXT'],
    ['integrations_json', 'integrations_json TEXT'],
    ['lead_source_json', 'lead_source_json TEXT'],
    ['ads_json', 'ads_json TEXT'],
    ['metadata_json', 'metadata_json TEXT'],
    ['created_at', "created_at TEXT NOT NULL DEFAULT ''"],
    ['updated_at', "updated_at TEXT NOT NULL DEFAULT ''"]
  ]);
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_campaigns_owner_updated ON campaigns(owner_login,updated_at)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_campaigns_status_updated ON campaigns(status,updated_at)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_campaigns_cmo_plan_job_id ON campaigns(cmo_plan_job_id)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_campaigns_operations_agent_job_id ON campaigns(operations_agent_job_id)').run();
}

async function ensureAppRegistryColumns(db) {
  await ensureColumns(db, 'apps', [
    ['name', "name TEXT NOT NULL DEFAULT ''"],
    ['description', "description TEXT NOT NULL DEFAULT ''"],
    ['kind', "kind TEXT NOT NULL DEFAULT 'application'"],
    ['base_url', 'base_url TEXT'],
    ['entry_url', "entry_url TEXT NOT NULL DEFAULT ''"],
    ['healthcheck_url', 'healthcheck_url TEXT'],
    ['capabilities_json', 'capabilities_json TEXT'],
    ['required_connectors_json', 'required_connectors_json TEXT'],
    ['requires_approval_for_json', 'requires_approval_for_json TEXT'],
    ['input_contract_json', 'input_contract_json TEXT'],
    ['handoff_json', 'handoff_json TEXT'],
    ['tags_json', 'tags_json TEXT'],
    ['owner', 'owner TEXT'],
    ['visibility', "visibility TEXT NOT NULL DEFAULT 'public'"],
    ['status', "status TEXT NOT NULL DEFAULT 'active'"],
    ['verification_status', 'verification_status TEXT'],
    ['verification_checked_at', 'verification_checked_at TEXT'],
    ['verification_error', 'verification_error TEXT'],
    ['verification_details_json', 'verification_details_json TEXT'],
    ['manifest_url', 'manifest_url TEXT'],
    ['manifest_source', 'manifest_source TEXT'],
    ['metadata_json', 'metadata_json TEXT'],
    ['created_at', "created_at TEXT NOT NULL DEFAULT ''"],
    ['updated_at', "updated_at TEXT NOT NULL DEFAULT ''"]
  ]);
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_apps_owner ON apps(owner)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_apps_updated_at ON apps(updated_at)').run();
}
