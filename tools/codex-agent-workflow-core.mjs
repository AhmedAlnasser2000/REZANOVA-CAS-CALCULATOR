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
const REVIEWED_AGENTS_TASK_MODE_SECTION = `## Task Mode Recommendation Policy
- Before substantive work on a new meaningful repository task, root performs only enough read-only grounding to classify the task, then states the recommended route, the main reason, and whether subagents would be used.
- \`DIRECT\`: explain briefly and proceed automatically without waiting for approval. Use it for cohesive, low-risk work with no useful independent delegation.
- \`CONTROLLED\`: pause for explicit task-specific approval before spawning agents. Use it for multiple independent investigation, testing, or review lanes with one bounded writer.
- \`CRITICAL\`: pause for explicit task-specific approval before spawning agents or beginning critical execution. Use it for unresolved high-risk correctness, schema or persistence, security, destructive recovery, or architecture work requiring stricter stops.
- Do not repeat the recommendation for status checks, simple questions, or clear continuations of the current task.
- A material scope change, newly discovered independent task, or completed-task transition requires a fresh recommendation.
- If the user already names a route, explain the assessment and honor that route without reconfirmation.`;
const REVIEWED_CONTROLLED_SUBAGENT_SECTION = `## Controlled Codex Subagent Policy
- \`DIRECT\` root-only work is the default. The existence of \`.codex/\` configuration does not authorize delegation.
- \`CONTROLLED\` and \`CRITICAL\` routes require explicit user permission for the specific current task. Permission expires when that task completes or its material scope changes; prior permission never carries forward.
- Root is the sole orchestrator. Only root may spawn, steer, interrupt, or close subagents, and root owns final decisions and the user-facing handoff.
- At most three subagents may be open concurrently. At most one writable role may be active, and \`calcwiz_implementer\` is the only writable role.
- Explorer, CAS Researcher, Tester, and Reviewer are read-only. Tester must never edit tests, baselines, snapshots, configuration, production code, or durable memory.
- Child agents must not spawn subagents. Recursive delegation is forbidden even when the parent task is authorized.
- Every delegated task requires a bounded context packet naming goal, role need, architecture, execution path, inspect paths, allowed write paths, forbidden paths, invariants, expected output, verification, and stop conditions.
- After one failed remediation cycle, delegated remediation stops and control returns to root. Scope expansion, conflicting ownership, unclassified regressions, or missing authority also return control to root.
- Root or Implementer owns required durable-memory changes. Do not add a Documentation role.
- Role purpose, permissions, output contracts, and stop conditions are model-independent. Current model assignments live only in the reviewed enforcement baseline.
- A model assignment change requires an explicitly approved model-migration gate that checks the installed Codex model catalog and current official OpenAI documentation, updates the baseline and affected agent files together, validates configuration and workflow, and records user approval and rationale in durable memory.
- Never silently replace a retired model, automatically select \`latest\`, or assume future model families or reasoning levels. Model migration must not widen permissions, concurrency, responsibilities, or spawning authority.`;
const REVIEWED_WORKFLOW_TASK_START_SECTION = `## Task Start Recommendation

Before substantive work on a new meaningful repository task, root performs only enough read-only grounding to classify it, then states the recommended route, the main reason, and whether subagents would be used.

- If \`DIRECT\` is recommended, root explains briefly and proceeds automatically without waiting for approval.
- If \`CONTROLLED\` is recommended, root pauses for explicit task-specific approval before spawning agents.
- If \`CRITICAL\` is recommended, root pauses for explicit task-specific approval before spawning agents or beginning critical execution.
- Status checks, simple questions, and clear continuations do not repeat the recommendation.
- A material scope change, newly discovered independent task, or completed-task transition requires a fresh recommendation.
- If the user already names a route, root explains the assessment and honors it without reconfirmation.`;
const REVIEWED_WORKFLOW_ROUTES_SECTION = `## Routes

- \`DIRECT\`: cohesive, low-risk work with no useful independent delegation; root works alone. This is the default.
- \`CONTROLLED\`: multiple independent investigation, testing, or review lanes with one bounded writer; root may delegate only after explicit per-task permission.
- \`CRITICAL\`: unresolved high-risk correctness, schema or persistence, security, destructive recovery, or architecture work requiring stricter stops and root-owned decisions.

Permission expires when the task completes or its material scope changes. Configuration presence, prior permission, or a prior task does not authorize delegation.`;
const REQUIRED_AGENTS_POLICY_TOKENS = [
  '## Task Mode Recommendation Policy',
  'Before substantive work on a new meaningful repository task',
  'states the recommended route, the main reason, and whether subagents would be used',
  '`DIRECT`: explain briefly and proceed automatically without waiting for approval',
  '`CONTROLLED`: pause for explicit task-specific approval before spawning agents',
  '`CRITICAL`: pause for explicit task-specific approval before spawning agents or beginning critical execution',
  'Do not repeat the recommendation for status checks, simple questions, or clear continuations of the current task',
  'A material scope change, newly discovered independent task, or completed-task transition requires a fresh recommendation',
  'If the user already names a route, explain the assessment and honor that route without reconfirmation',
  'cohesive, low-risk work with no useful independent delegation',
  'multiple independent investigation, testing, or review lanes with one bounded writer',
  'unresolved high-risk correctness, schema or persistence, security, destructive recovery, or architecture work requiring stricter stops',
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
  '## Task Start Recommendation',
  'states the recommended route, the main reason, and whether subagents would be used',
  'root explains briefly and proceeds automatically without waiting for approval',
  'If `CONTROLLED` is recommended, root pauses for explicit task-specific approval before spawning agents',
  'If `CRITICAL` is recommended, root pauses for explicit task-specific approval before spawning agents or beginning critical execution',
  'Status checks, simple questions, and clear continuations do not repeat the recommendation',
  'A material scope change, newly discovered independent task, or completed-task transition requires a fresh recommendation',
  'root explains the assessment and honors it without reconfirmation',
  'cohesive, low-risk work with no useful independent delegation',
  'multiple independent investigation, testing, or review lanes with one bounded writer',
  'unresolved high-risk correctness, schema or persistence, security, destructive recovery, or architecture work requiring stricter stops',
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

function extractMarkdownSection(source, heading, label) {
  const headingPattern = new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}$`, 'gmu');
  const matches = [...source.matchAll(headingPattern)];
  if (matches.length !== 1) throw new Error(`${label}: requires exactly one ${heading} section`);
  const start = matches[0].index;
  const remainder = source.slice(start + heading.length);
  const nextHeading = remainder.search(/^## /mu);
  return source.slice(start, nextHeading < 0 ? source.length : start + heading.length + nextHeading).trim();
}

function removeReviewedSections(source, sections) {
  return sections.reduce((remaining, section) => remaining.replace(section, ''), source);
}

function assertExactSection(source, heading, reviewed, label) {
  const actual = extractMarkdownSection(source, heading, label);
  if (actual !== reviewed) throw new Error(`${label}: reviewed ${heading} contract must remain exact`);
  return actual;
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

  const agentsTaskModeSection = assertExactSection(
    agentsPolicySource,
    '## Task Mode Recommendation Policy',
    REVIEWED_AGENTS_TASK_MODE_SECTION,
    'AGENTS.md',
  );
  const controlledSubagentSection = assertExactSection(
    agentsPolicySource,
    '## Controlled Codex Subagent Policy',
    REVIEWED_CONTROLLED_SUBAGENT_SECTION,
    'AGENTS.md',
  );
  if (/\b(?:DIRECT|CONTROLLED|CRITICAL)\b/u.test(removeReviewedSections(
    agentsPolicySource,
    [agentsTaskModeSection, controlledSubagentSection],
  ))) {
    throw new Error('AGENTS.md: conflicting task-mode route directive outside reviewed policy sections');
  }

  const workflowTaskStartSection = assertExactSection(
    workflowDocSource,
    '## Task Start Recommendation',
    REVIEWED_WORKFLOW_TASK_START_SECTION,
    '.codex/README.md',
  );
  const workflowRoutesSection = assertExactSection(
    workflowDocSource,
    '## Routes',
    REVIEWED_WORKFLOW_ROUTES_SECTION,
    '.codex/README.md',
  );
  if (/\b(?:DIRECT|CONTROLLED|CRITICAL)\b/u.test(removeReviewedSections(
    workflowDocSource,
    [workflowTaskStartSection, workflowRoutesSection],
  ))) {
    throw new Error('.codex/README.md: conflicting task-mode route directive outside reviewed policy sections');
  }

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
