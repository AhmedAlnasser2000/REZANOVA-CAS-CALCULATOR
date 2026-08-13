import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export const ROLE_POLICY = {
  calcwiz_explorer: { sandboxMode: 'read-only', purposeToken: 'repository reconnaissance' },
  calcwiz_cas_researcher: { sandboxMode: 'read-only', purposeToken: 'mathematical and CAS analyst' },
  calcwiz_implementer: { sandboxMode: 'workspace-write', purposeToken: 'sole writable' },
  calcwiz_tester: { sandboxMode: 'read-only', purposeToken: 'test runner and failure diagnostician' },
  calcwiz_reviewer: { sandboxMode: 'read-only', purposeToken: 'Independent read-only reviewer' },
};

const ROLE_NAMES = Object.keys(ROLE_POLICY).sort();
const REQUIRED_AGENT_INSTRUCTION_TOKENS = [
  'Do not spawn subagents',
  'return control to root',
];
const REQUIRED_AGENTS_POLICY_TOKENS = [
  '## Controlled Codex Subagent Policy',
  '`DIRECT` root-only work is the default',
  '`CONTROLLED` and `CRITICAL` routes require explicit user permission',
  'Root is the sole orchestrator',
  'At most three subagents may be open concurrently',
  '`calcwiz_implementer` is the only writable role',
  'Child agents must not spawn subagents',
  'After one failed remediation cycle',
  'requires an explicitly approved model-migration gate',
];
const REQUIRED_WORKFLOW_DOC_TOKENS = [
  '## Routes',
  '## Orchestration',
  '## Context Packet',
  '## Compact Result Contract',
  '## Stop Conditions',
  '## Model Portability',
];
const EXTERNAL_PROVIDER_PATTERN = /\b(?:claude|gemini|deepseek|kimi|glm|anthropic)\b/iu;

function parseString(source, key, label) {
  const match = source.match(new RegExp(`^${key}\\s*=\\s*"([^"]+)"\\s*$`, 'mu'));
  if (!match) throw new Error(`${label}: missing string ${key}`);
  return match[1];
}

function parseInteger(source, key, label) {
  const match = source.match(new RegExp(`^${key}\\s*=\\s*(\\d+)\\s*$`, 'mu'));
  if (!match) throw new Error(`${label}: missing integer ${key}`);
  return Number.parseInt(match[1], 10);
}

function parseBoolean(source, key, label, section) {
  const match = source.match(new RegExp(
    `\\[${section.replace('.', '\\.')}\\][\\s\\S]*?^${key}\\s*=\\s*(true|false)\\s*$`,
    'mu',
  ));
  if (!match) throw new Error(`${label}: missing boolean ${section}.${key}`);
  return match[1] === 'true';
}

function parseInstructions(source, label) {
  const match = source.match(/^developer_instructions\s*=\s*"""([\s\S]*?)"""\s*$/mu);
  if (!match) throw new Error(`${label}: missing developer_instructions`);
  return match[1];
}

function assertContains(source, token, label) {
  if (!source.includes(token)) throw new Error(`${label}: missing required policy text: ${token}`);
}

function validateModelBaseline(baseline) {
  if (baseline?.schemaVersion !== 1) throw new Error('Model baseline: schemaVersion must be 1');
  if (typeof baseline.acceptanceReason !== 'string' || baseline.acceptanceReason.trim().length < 20) {
    throw new Error('Model baseline: acceptanceReason must record reviewed provenance');
  }
  const names = Object.keys(baseline.roles ?? {}).sort();
  if (JSON.stringify(names) !== JSON.stringify(ROLE_NAMES)) {
    throw new Error(`Model baseline: exact role inventory required (${ROLE_NAMES.join(', ')})`);
  }
  for (const name of ROLE_NAMES) {
    const entry = baseline.roles[name];
    if (typeof entry.model !== 'string' || !entry.model.startsWith('gpt-')) {
      throw new Error(`Model baseline: ${name} requires an explicit reviewed OpenAI model`);
    }
    if (!['low', 'medium', 'high', 'xhigh', 'max', 'ultra'].includes(entry.modelReasoningEffort)) {
      throw new Error(`Model baseline: ${name} has an unsupported reasoning effort`);
    }
  }
}

export function validateCodexAgentWorkflow({
  configSource,
  agentSources,
  modelBaseline,
  agentsPolicySource,
  workflowDocSource,
}) {
  validateModelBaseline(modelBaseline);
  const configuredNames = Object.keys(agentSources).sort();
  if (JSON.stringify(configuredNames) !== JSON.stringify(ROLE_NAMES)) {
    throw new Error(`Agent files: exact role inventory required (${ROLE_NAMES.join(', ')})`);
  }

  if (!parseBoolean(configSource, 'enabled', 'Project config', 'agents')) {
    throw new Error('Project config: agents.enabled must remain true');
  }
  const concurrency = parseInteger(configSource, 'max_concurrent_threads_per_session', 'Project config');
  if (concurrency !== 3) throw new Error('Project config: concurrency maximum must remain exactly three');

  let writableCount = 0;
  for (const roleName of ROLE_NAMES) {
    const source = agentSources[roleName];
    const label = `Agent ${roleName}`;
    if (EXTERNAL_PROVIDER_PATTERN.test(source)) {
      throw new Error(`${label}: external-provider workflow roles are forbidden`);
    }
    if (parseString(source, 'name', label) !== roleName) {
      throw new Error(`${label}: name must match the reviewed role identity`);
    }
    const description = parseString(source, 'description', label);
    if (!description.includes(ROLE_POLICY[roleName].purposeToken)) {
      throw new Error(`${label}: role purpose drifted from the reviewed capability`);
    }
    const sandboxMode = parseString(source, 'sandbox_mode', label);
    if (sandboxMode !== ROLE_POLICY[roleName].sandboxMode) {
      throw new Error(`${label}: sandbox widening is forbidden; expected ${ROLE_POLICY[roleName].sandboxMode}`);
    }
    if (sandboxMode === 'workspace-write') writableCount += 1;
    const actualModel = parseString(source, 'model', label);
    const actualEffort = parseString(source, 'model_reasoning_effort', label);
    const reviewed = modelBaseline.roles[roleName];
    if (actualModel !== reviewed.model || actualEffort !== reviewed.modelReasoningEffort) {
      throw new Error(`${label}: reviewed model migration required`);
    }
    if (parseBoolean(source, 'multi_agent', label, 'features')) {
      throw new Error(`${label}: recursive spawning must remain disabled`);
    }
    const instructions = parseInstructions(source, label);
    for (const token of REQUIRED_AGENT_INSTRUCTION_TOKENS) assertContains(instructions, token, label);
    if (roleName === 'calcwiz_tester') {
      for (const token of ['Do not edit tests', 'baselines', 'production files', 'memory']) {
        assertContains(instructions, token, label);
      }
    }
  }
  if (writableCount !== 1) throw new Error('Agent files: exactly one writable role is required');

  for (const token of REQUIRED_AGENTS_POLICY_TOKENS) assertContains(agentsPolicySource, token, 'AGENTS.md');
  for (const token of REQUIRED_WORKFLOW_DOC_TOKENS) assertContains(workflowDocSource, token, '.codex/README.md');
  if (EXTERNAL_PROVIDER_PATTERN.test(workflowDocSource)) {
    throw new Error('.codex/README.md: external-provider workflow roles are forbidden');
  }

  return { roleCount: ROLE_NAMES.length, writableCount, concurrency };
}

export function validateRepoCodexAgentWorkflow({ rootDir = process.cwd() } = {}) {
  const agentDir = path.join(rootDir, '.codex/agents');
  const files = readdirSync(agentDir).filter((file) => file.endsWith('.toml')).sort();
  const agentSources = Object.fromEntries(
    files.map((file) => [path.basename(file, '.toml'), readFileSync(path.join(agentDir, file), 'utf8')]),
  );
  return validateCodexAgentWorkflow({
    configSource: readFileSync(path.join(rootDir, '.codex/config.toml'), 'utf8'),
    agentSources,
    modelBaseline: JSON.parse(readFileSync(path.join(rootDir, 'tools/codex-agent-workflow-model-baseline.json'), 'utf8')),
    agentsPolicySource: readFileSync(path.join(rootDir, 'AGENTS.md'), 'utf8'),
    workflowDocSource: readFileSync(path.join(rootDir, '.codex/README.md'), 'utf8'),
  });
}
