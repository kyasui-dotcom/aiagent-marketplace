import promptBrushup from './prompt-brushup.js';
import research from './research.js';
import writer from './writer.js';
import code from './code.js';
import pricing from './pricing.js';
import teardown from './teardown.js';
import landing from './landing.js';
import validation from './validation.js';
import growth from './growth.js';
import acquisitionAutomation from './acquisition-automation.js';
import mediaPlanner from './media-planner.js';
import listCreator from './list-creator.js';
import directorySubmission from './directory-submission.js';
import citationOps from './citation-ops.js';
import freeWebGrowthLeader from './free-web-growth-leader.js';
import agentTeamLeader from './agent-team-leader.js';
import launchTeamLeader from './launch-team-leader.js';
import researchTeamLeader from './research-team-leader.js';
import buildTeamLeader from './build-team-leader.js';
import cmoLeader from './cmo-leader.js';
import ctoLeader from './cto-leader.js';
import cpoLeader from './cpo-leader.js';
import cfoLeader from './cfo-leader.js';
import legalLeader from './legal-leader.js';
import secretaryLeader from './secretary-leader.js';
import inboxTriage from './inbox-triage.js';
import replyDraft from './reply-draft.js';
import scheduleCoordination from './schedule-coordination.js';
import followUp from './follow-up.js';
import meetingPrep from './meeting-prep.js';
import meetingNotes from './meeting-notes.js';
import instagram from './instagram.js';
import xPost from './x-post.js';
import emailOps from './email-ops.js';
import coldEmail from './cold-email.js';
import reddit from './reddit.js';
import indieHackers from './indie-hackers.js';
import dataAnalysis from './data-analysis.js';
import seoSpecialist from './seo-specialist.js';
import campaignOperations from './campaign-operations.js';
import adsPlanner from './ads-planner.js';
import hiring from './hiring.js';
import diligence from './diligence.js';

function agentManifestMetadataWithContracts(definition = {}) {
  const manifest = definition?.manifest && typeof definition.manifest === 'object' ? definition.manifest : {};
  const metadata = manifest.metadata && typeof manifest.metadata === 'object' ? manifest.metadata : {};
  return Object.freeze({
    ...metadata,
    agent_purpose: definition.agentPurpose || metadata.agent_purpose || null,
    action_boundaries: Array.isArray(definition.agentActionBoundaries)
      ? definition.agentActionBoundaries
      : (Array.isArray(metadata.action_boundaries) ? metadata.action_boundaries : []),
    delivery_contract: definition.deliveryContract && typeof definition.deliveryContract === 'object'
      ? definition.deliveryContract
      : (metadata.delivery_contract && typeof metadata.delivery_contract === 'object' ? metadata.delivery_contract : {})
  });
}

function agentDefinitionWithManifestContracts(definition = {}) {
  const manifest = definition?.manifest && typeof definition.manifest === 'object' ? definition.manifest : {};
  if (!manifest.kind) return definition;
  return Object.freeze({
    ...definition,
    manifest: Object.freeze({
      ...manifest,
      metadata: agentManifestMetadataWithContracts(definition)
    })
  });
}

export const SAMPLE_AGENT_DEFINITIONS = Object.freeze({
  prompt_brushup: agentDefinitionWithManifestContracts(promptBrushup),
  research: agentDefinitionWithManifestContracts(research),
  writer: agentDefinitionWithManifestContracts(writer),
  code: agentDefinitionWithManifestContracts(code),
  pricing: agentDefinitionWithManifestContracts(pricing),
  teardown: agentDefinitionWithManifestContracts(teardown),
  landing: agentDefinitionWithManifestContracts(landing),
  validation: agentDefinitionWithManifestContracts(validation),
  growth: agentDefinitionWithManifestContracts(growth),
  acquisition_automation: agentDefinitionWithManifestContracts(acquisitionAutomation),
  media_planner: agentDefinitionWithManifestContracts(mediaPlanner),
  list_creator: agentDefinitionWithManifestContracts(listCreator),
  directory_submission: agentDefinitionWithManifestContracts(directorySubmission),
  citation_ops: agentDefinitionWithManifestContracts(citationOps),
  free_web_growth_leader: agentDefinitionWithManifestContracts(freeWebGrowthLeader),
  agent_team_leader: agentDefinitionWithManifestContracts(agentTeamLeader),
  launch_team_leader: agentDefinitionWithManifestContracts(launchTeamLeader),
  research_team_leader: agentDefinitionWithManifestContracts(researchTeamLeader),
  build_team_leader: agentDefinitionWithManifestContracts(buildTeamLeader),
  cmo_leader: agentDefinitionWithManifestContracts(cmoLeader),
  cto_leader: agentDefinitionWithManifestContracts(ctoLeader),
  cpo_leader: agentDefinitionWithManifestContracts(cpoLeader),
  cfo_leader: agentDefinitionWithManifestContracts(cfoLeader),
  legal_leader: agentDefinitionWithManifestContracts(legalLeader),
  secretary_leader: agentDefinitionWithManifestContracts(secretaryLeader),
  inbox_triage: agentDefinitionWithManifestContracts(inboxTriage),
  reply_draft: agentDefinitionWithManifestContracts(replyDraft),
  schedule_coordination: agentDefinitionWithManifestContracts(scheduleCoordination),
  follow_up: agentDefinitionWithManifestContracts(followUp),
  meeting_prep: agentDefinitionWithManifestContracts(meetingPrep),
  meeting_notes: agentDefinitionWithManifestContracts(meetingNotes),
  instagram: agentDefinitionWithManifestContracts(instagram),
  x_post: agentDefinitionWithManifestContracts(xPost),
  email_ops: agentDefinitionWithManifestContracts(emailOps),
  cold_email: agentDefinitionWithManifestContracts(coldEmail),
  reddit: agentDefinitionWithManifestContracts(reddit),
  indie_hackers: agentDefinitionWithManifestContracts(indieHackers),
  data_analysis: agentDefinitionWithManifestContracts(dataAnalysis),
  seo_specialist: agentDefinitionWithManifestContracts(seoSpecialist),
  campaign_operations: agentDefinitionWithManifestContracts(campaignOperations),
  ads_planner: agentDefinitionWithManifestContracts(adsPlanner),
  hiring: agentDefinitionWithManifestContracts(hiring),
  diligence: agentDefinitionWithManifestContracts(diligence)
});

function normalizedSampleKind(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function manifestKindForDefinition(fallbackKind = '', definition = {}) {
  const fallback = normalizedSampleKind(fallbackKind);
  const manifestKind = normalizedSampleKind(definition?.manifest?.kind || fallback);
  if (fallback && fallback !== manifestKind && manifestAliasesForDefinition(definition).includes(fallback)) return fallback;
  return manifestKind;
}

function manifestAliasesForDefinition(definition = {}) {
  const manifest = definition?.manifest || {};
  const metadata = manifest?.metadata && typeof manifest.metadata === 'object' ? manifest.metadata : {};
  const aliases = [
    ...(Array.isArray(manifest.aliases) ? manifest.aliases : []),
    ...(Array.isArray(metadata.aliases) ? metadata.aliases : [])
  ];
  return Array.from(new Set(aliases.map(normalizedSampleKind).filter(Boolean)));
}

function manifestIsRoutable(manifest = {}) {
  const metadata = manifest?.metadata && typeof manifest.metadata === 'object' ? manifest.metadata : {};
  return metadata.routable !== false && metadata.not_routable !== true;
}

export const SAMPLE_AGENT_MANIFESTS = Object.freeze(Object.fromEntries(
  Object.entries(SAMPLE_AGENT_DEFINITIONS)
    .map(([fallbackKind, definition]) => [manifestKindForDefinition(fallbackKind, definition), definition?.manifest || null])
    .filter(([kind, manifest]) => kind && manifest)
));

export const SAMPLE_AGENT_KINDS = Object.freeze(Object.entries(SAMPLE_AGENT_MANIFESTS)
  .filter(([, manifest]) => manifestIsRoutable(manifest))
  .map(([kind]) => kind));

const LEGACY_SAMPLE_AGENT_KIND_ALIASES = Object.freeze({
  seo_gap: 'seo_specialist',
  seogap: 'seo_specialist'
});

export function sampleAgentDefinitionForKind(kind = '') {
  const normalized = normalizedSampleKind(kind);
  const canonical = LEGACY_SAMPLE_AGENT_KIND_ALIASES[normalized] || normalized;
  const direct = SAMPLE_AGENT_DEFINITIONS[canonical] || null;
  if (direct?.manifest && (
    manifestKindForDefinition(canonical, direct) === canonical
    || manifestAliasesForDefinition(direct).includes(canonical)
    || LEGACY_SAMPLE_AGENT_KIND_ALIASES[normalized] === canonical
  )) return direct;
  return Object.values(SAMPLE_AGENT_DEFINITIONS)
    .find((definition) => manifestKindForDefinition('', definition) === normalized || manifestAliasesForDefinition(definition).includes(normalized)) || null;
}

export function sampleAgentManifestForKind(kind = '') {
  return sampleAgentDefinitionForKind(kind)?.manifest || null;
}
