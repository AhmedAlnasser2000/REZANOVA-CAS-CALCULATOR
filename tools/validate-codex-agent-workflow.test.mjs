import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { validateCodexAgentWorkflow, validateRepoCodexAgentWorkflow } from './codex-agent-workflow-core.mjs';

const rootDir = process.cwd();
const roleNames = [
  'calcwiz_explorer',
  'calcwiz_cas_researcher',
  'calcwiz_implementer',
  'calcwiz_tester',
  'calcwiz_reviewer',
];

function fixture() {
  return {
    configSource: readFileSync(path.join(rootDir, '.codex/config.toml'), 'utf8'),
    agentSources: Object.fromEntries(roleNames.map((name) => [
      name,
      readFileSync(path.join(rootDir, `.codex/agents/${name}.toml`), 'utf8'),
    ])),
    modelBaseline: JSON.parse(readFileSync(path.join(rootDir, 'tools/codex-agent-workflow-model-baseline.json'), 'utf8')),
    agentsPolicySource: readFileSync(path.join(rootDir, 'AGENTS.md'), 'utf8'),
    workflowDocSource: readFileSync(path.join(rootDir, '.codex/README.md'), 'utf8'),
  };
}

describe('Codex controlled-agent workflow', () => {
  it('accepts the committed project workflow', () => {
    assert.deepEqual(validateRepoCodexAgentWorkflow(), { roleCount: 5, writableCount: 1, concurrency: 3 });
  });

  it('rejects missing or extra roles', () => {
    const missing = fixture();
    delete missing.agentSources.calcwiz_reviewer;
    assert.throws(() => validateCodexAgentWorkflow(missing), /exact role inventory required/u);
    const extra = fixture();
    extra.agentSources.unauthorized = extra.agentSources.calcwiz_explorer;
    assert.throws(() => validateCodexAgentWorkflow(extra), /exact role inventory required/u);
  });

  it('rejects model or reasoning drift with a migration-specific failure', () => {
    for (const replacement of ['model = "gpt-future"', 'model_reasoning_effort = "low"']) {
      const input = fixture();
      input.agentSources.calcwiz_reviewer = input.agentSources.calcwiz_reviewer.replace(
        replacement.startsWith('model =') ? /model = "[^"]+"/u : /model_reasoning_effort = "[^"]+"/u,
        replacement,
      );
      assert.throws(() => validateCodexAgentWorkflow(input), /reviewed model migration required/u);
    }
  });

  it('rejects concurrency growth and sandbox widening', () => {
    const concurrency = fixture();
    concurrency.configSource = concurrency.configSource.replace('= 3', '= 4');
    assert.throws(() => validateCodexAgentWorkflow(concurrency), /concurrency maximum/u);
    const sandbox = fixture();
    sandbox.agentSources.calcwiz_tester = sandbox.agentSources.calcwiz_tester.replace('sandbox_mode = "read-only"', 'sandbox_mode = "workspace-write"');
    assert.throws(() => validateCodexAgentWorkflow(sandbox), /sandbox widening/u);
  });

  it('rejects Tester write permission in prose', () => {
    const input = fixture();
    input.agentSources.calcwiz_tester = input.agentSources.calcwiz_tester.replace('Do not edit tests', 'You may edit tests');
    assert.throws(() => validateCodexAgentWorkflow(input), /Do not edit tests/u);
  });

  it('rejects recursive spawning', () => {
    const input = fixture();
    input.agentSources.calcwiz_explorer = input.agentSources.calcwiz_explorer.replace('multi_agent = false', 'multi_agent = true');
    assert.throws(() => validateCodexAgentWorkflow(input), /recursive spawning/u);
  });

  it('rejects explicit-per-task permission or root orchestration weakening', () => {
    for (const token of [
      '`CONTROLLED` and `CRITICAL` routes require explicit user permission',
      'Root is the sole orchestrator',
    ]) {
      const input = fixture();
      input.agentsPolicySource = input.agentsPolicySource.replace(token, 'removed policy');
      assert.throws(
        () => validateCodexAgentWorkflow(input),
        /(?:contract must remain exact|missing required policy text)/u,
      );
    }
  });

  it('rejects removal of the task-mode recommendation contract', () => {
    for (const token of [
      'Before substantive work on a new meaningful repository task',
      'states the recommended route, the main reason, and whether subagents would be used',
    ]) {
      const input = fixture();
      input.agentsPolicySource = input.agentsPolicySource.replace(token, 'removed policy');
      assert.throws(() => validateCodexAgentWorkflow(input), /contract must remain exact/u);
    }
  });

  it('rejects automatic DIRECT continuation or approval-gated route weakening', () => {
    for (const token of [
      '`DIRECT`: explain briefly and proceed automatically without waiting for approval',
      '`CONTROLLED`: pause for explicit task-specific approval before spawning agents',
      '`CRITICAL`: pause for explicit task-specific approval before spawning agents or beginning critical execution',
    ]) {
      const input = fixture();
      input.agentsPolicySource = input.agentsPolicySource.replace(token, 'removed policy');
      assert.throws(() => validateCodexAgentWorkflow(input), /contract must remain exact/u);
    }
  });

  it('rejects continuation-exemption, scope-renewal, or selected-route weakening', () => {
    for (const token of [
      'Do not repeat the recommendation for status checks, simple questions, or clear continuations of the current task',
      'A material scope change, newly discovered independent task, or completed-task transition requires a fresh recommendation',
      'If the user already names a route, explain the assessment and honor that route without reconfirmation',
    ]) {
      const input = fixture();
      input.agentsPolicySource = input.agentsPolicySource.replace(token, 'removed policy');
      assert.throws(() => validateCodexAgentWorkflow(input), /contract must remain exact/u);
    }
  });

  it('rejects route-guidance drift', () => {
    for (const token of [
      'cohesive, low-risk work with no useful independent delegation',
      'multiple independent investigation, testing, or review lanes with one bounded writer',
      'unresolved high-risk correctness, schema or persistence, security, destructive recovery, or architecture work requiring stricter stops',
    ]) {
      const input = fixture();
      input.workflowDocSource = input.workflowDocSource.replace(token, 'weakened route guidance');
      assert.throws(() => validateCodexAgentWorkflow(input), /contract must remain exact/u);
    }
  });

  it('rejects task-start recommendation weakening in the operator guide', () => {
    for (const token of [
      'root explains briefly and proceeds automatically without waiting for approval',
      'If `CONTROLLED` is recommended, root pauses for explicit task-specific approval before spawning agents',
      'Status checks, simple questions, and clear continuations do not repeat the recommendation',
      'root explains the assessment and honors it without reconfirmation',
    ]) {
      const input = fixture();
      input.workflowDocSource = input.workflowDocSource.replace(token, 'removed operator guidance');
      assert.throws(() => validateCodexAgentWorkflow(input), /contract must remain exact/u);
    }
  });

  it('rejects retained-token contradictions outside the reviewed task-mode sections', () => {
    const agentsOverride = fixture();
    agentsOverride.agentsPolicySource += '\nDIRECT must pause for approval; CONTROLLED may spawn without approval.\n';
    assert.throws(
      () => validateCodexAgentWorkflow(agentsOverride),
      /conflicting task-mode route directive outside reviewed policy sections/u,
    );

    const workflowOverride = fixture();
    workflowOverride.workflowDocSource += '\nCRITICAL may begin execution without approval.\n';
    assert.throws(
      () => validateCodexAgentWorkflow(workflowOverride),
      /conflicting task-mode route directive outside reviewed policy sections/u,
    );
  });

  it('rejects retained-token contradictions inside the controlled-subagent policy', () => {
    const input = fixture();
    input.agentsPolicySource = input.agentsPolicySource.replace(
      '- Root is the sole orchestrator.',
      '- OVERRIDE: CONTROLLED may spawn without approval and DIRECT must pause.\n- Root is the sole orchestrator.',
    );
    assert.throws(() => validateCodexAgentWorkflow(input), /contract must remain exact/u);
  });

  it('rejects relocated or duplicated reviewed task-mode sections', () => {
    const duplicate = fixture();
    duplicate.workflowDocSource += `\n\n${duplicate.workflowDocSource.match(/## Task Start Recommendation[\s\S]*?(?=\n## Routes)/u)?.[0] ?? ''}`;
    assert.throws(() => validateCodexAgentWorkflow(duplicate), /requires exactly one/u);

    const extraClause = fixture();
    extraClause.agentsPolicySource = extraClause.agentsPolicySource.replace(
      '- If the user already names a route, explain the assessment and honor that route without reconfirmation.',
      '- If the user already names a route, explain the assessment and honor that route without reconfirmation.\n- DIRECT may pause anyway.',
    );
    assert.throws(() => validateCodexAgentWorkflow(extraClause), /contract must remain exact/u);
  });

  it('rejects missing context, compact-result, or stop contracts', () => {
    for (const heading of ['## Context Packet', '## Compact Result Contract', '## Stop Conditions']) {
      const input = fixture();
      input.workflowDocSource = input.workflowDocSource.replace(heading, '## Removed');
      assert.throws(() => validateCodexAgentWorkflow(input), /missing required policy text/u);
    }
  });

  it('rejects external-provider workflow roles', () => {
    const input = fixture();
    input.workflowDocSource += '\nAdd a Claude worker.\n';
    assert.throws(() => validateCodexAgentWorkflow(input), /external-provider workflow roles are forbidden/u);
  });
});
