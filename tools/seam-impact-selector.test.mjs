import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildExplicitPathPlan,
  buildSeamImpactPlan,
  formatHumanPlan,
  normalizeRepoPath,
  parseGitNameStatusZ,
  parseSelectorArgs,
  resolveSelectorPlan,
  runAdditionalCommands,
  selectGithubEventRange,
  validateRevision,
} from './seam-impact-selector-core.mjs';

describe('seam impact selector', () => {
  it('classifies seam paths and emits stable additive evidence', () => {
    const plan = buildExplicitPathPlan([
      'src/lib/ooe/runtime-control/runtime-coordinator.ts',
      'src/types/calculator/display-types.ts',
    ]);

    assert.equal(plan.summary.seamImpact, true);
    assert.equal(plan.baselinePolicy.selectorMaySkipBaselineGates, false);
    assert.deepEqual(plan.triggeredSeams.map((entry) => entry.id), [
      'ooe-control',
      'display-contract',
      'shared-type-contract',
    ]);
    assert.deepEqual(plan.additionalCommands.map((entry) => entry.id), [
      'workspace-runtime-contracts',
      'display-contracts',
      'result-contracts',
      'mathjson-coverage-ratchet',
      'equation-solve-result-contracts',
      'display-contract-inversion-ratchet',
      'app-state-contracts',
      'printer-migration-ratchet',
      'detail-segment-migration-ratchet',
      'clipboard-contracts',
    ]);
    assert.match(formatHumanPlan(plan), /Baseline CI gates remain required and unchanged\./u);
    assert.doesNotThrow(() => JSON.parse(JSON.stringify(plan)));
  });

  it('keeps lane-only changes visible without inventing seam commands', () => {
    const plan = buildExplicitPathPlan([
      'src/lib/equation/roots/readback.ts',
      'src/lib/modes/equation-worker-runtime.ts',
      'src/lib/modes/calculus-worker-client.ts',
      'src/lib/modes/worker-clients/linear-algebra-worker-client-core.ts',
      'src/lib/modes/worker-clients/matrix-worker-client.ts',
      'src/lib/modes/worker-clients/vector-worker-client.ts',
      'src/app/workspaces/MatrixWorkspace.tsx',
      'src/app/workspaces/VectorWorkspace.tsx',
    ]);

    assert.equal(plan.summary.seamImpact, false);
    assert.equal(plan.summary.laneOnly, true);
    assert.deepEqual(plan.laneIds, ['calculus', 'equation', 'matrix', 'vector']);
    assert.deepEqual(
      plan.paths.find((entry) => entry.path.endsWith('linear-algebra-worker-client-core.ts'))?.laneIds,
      ['matrix', 'vector'],
    );
    assert.deepEqual(
      plan.paths.find((entry) => entry.path.endsWith('matrix-worker-client.ts'))?.laneIds,
      ['matrix'],
    );
    assert.deepEqual(
      plan.paths.find((entry) => entry.path.endsWith('vector-worker-client.ts'))?.laneIds,
      ['vector'],
    );
    assert.deepEqual(
      plan.paths.find((entry) => entry.path.endsWith('MatrixWorkspace.tsx'))?.laneIds,
      ['matrix'],
    );
    assert.deepEqual(
      plan.paths.find((entry) => entry.path.endsWith('VectorWorkspace.tsx'))?.laneIds,
      ['vector'],
    );
    assert.deepEqual(plan.additionalCommands, []);
  });

  it('selects the History replay ratchet only for relevant replay seams', () => {
    const plan = buildExplicitPathPlan([
      'src/types/calculator/history-replay-types.ts',
      'src/app/runtime/useHistoryDisplayRuntime.ts',
    ]);

    assert.deepEqual(plan.triggeredSeams.map((entry) => entry.id), [
      'app-runtime',
      'history-replay',
      'shared-type-contract',
    ]);
    assert.deepEqual(plan.additionalCommands.map((entry) => entry.id), [
      'workspace-runtime-contracts',
      'app-runtime-contracts',
      'display-contracts',
      'result-contracts',
      'mathjson-coverage-ratchet',
      'equation-solve-result-contracts',
      'display-contract-inversion-ratchet',
      'app-state-contracts',
      'printer-migration-ratchet',
      'detail-segment-migration-ratchet',
      'clipboard-contracts',
      'history-replay',
    ]);
  });

  it('selects canonical result contracts for the neutral document district', () => {
    const plan = buildExplicitPathPlan([
      'src/lib/result-contract/runtime-outcome.ts',
      'src/types/calculator/canonical-result-types.ts',
    ]);

    assert.deepEqual(plan.triggeredSeams.map((entry) => entry.id), [
      'canonical-result-contract',
      'shared-type-contract',
    ]);
    assert.deepEqual(plan.additionalCommands.map((entry) => entry.id), [
      'workspace-runtime-contracts',
      'display-contracts',
      'result-contracts',
      'mathjson-coverage-ratchet',
      'equation-solve-result-contracts',
      'display-contract-inversion-ratchet',
      'app-state-contracts',
      'printer-migration-ratchet',
      'detail-segment-migration-ratchet',
      'clipboard-contracts',
    ]);
  });

  it('selects the Equation carrier contract for its private district and public seam', () => {
    const plan = buildExplicitPathPlan([
      'src/lib/equation/solve-result/contract.ts',
      'src/lib/equation/equation-solve-result.ts',
    ]);

    assert.deepEqual(plan.triggeredSeams.map((entry) => entry.id), [
      'equation-solve-result-contract',
    ]);
    assert.deepEqual(plan.laneIds, ['equation']);
    assert.deepEqual(plan.additionalCommands.map((entry) => entry.id), [
      'result-contracts',
      'equation-solve-result-contracts',
      'display-contract-inversion-ratchet',
    ]);
  });

  it('selects canonical result contracts for the Calculus producer adapter', () => {
    const plan = buildExplicitPathPlan([
      'src/lib/calculus/workspace/result-document.ts',
    ]);

    assert.deepEqual(plan.triggeredSeams.map((entry) => entry.id), [
      'canonical-result-contract',
    ]);
    assert.deepEqual(plan.laneIds, ['calculus']);
    assert.deepEqual(plan.additionalCommands.map((entry) => entry.id), [
      'display-contracts',
      'result-contracts',
      'mathjson-coverage-ratchet',
      'equation-solve-result-contracts',
      'display-contract-inversion-ratchet',
      'printer-migration-ratchet',
    ]);
  });

  it('selects canonical result contracts for guided-domain owner adapters', () => {
    const plan = buildExplicitPathPlan([
      'src/lib/trigonometry/result-document.ts',
      'src/lib/geometry/result-document.ts',
      'src/lib/statistics/result-document.ts',
      'src/lib/modes/table-result-document.ts',
    ]);

    assert.deepEqual(plan.triggeredSeams.map((entry) => entry.id), [
      'canonical-result-contract',
    ]);
    assert.deepEqual([...plan.laneIds].sort(), [
      'geometry',
      'statistics',
      'table',
      'trigonometry',
    ]);
    assert.deepEqual(plan.additionalCommands.map((entry) => entry.id), [
      'display-contracts',
      'result-contracts',
      'mathjson-coverage-ratchet',
      'equation-solve-result-contracts',
      'display-contract-inversion-ratchet',
      'printer-migration-ratchet',
    ]);
  });

  it('selects canonical result contracts for independent Linear Algebra adapters', () => {
    const plan = buildExplicitPathPlan([
      'src/lib/modes/matrix-result-document.ts',
      'src/lib/modes/vector-result-document.ts',
    ]);

    assert.deepEqual(plan.triggeredSeams.map((entry) => entry.id), [
      'canonical-result-contract',
    ]);
    assert.deepEqual([...plan.laneIds].sort(), ['matrix', 'vector']);
    assert.deepEqual(plan.additionalCommands.map((entry) => entry.id), [
      'display-contracts',
      'result-contracts',
      'mathjson-coverage-ratchet',
      'equation-solve-result-contracts',
      'display-contract-inversion-ratchet',
      'printer-migration-ratchet',
    ]);
  });

  it('handles rename, copy, and delete records including both rename paths', () => {
    const changes = parseGitNameStatusZ(
      'R100\0src/lib/equation/old.ts\0src/lib/ooe/new.ts\0D\0src/AppMain.tsx\0C75\0docs/a.md\0docs/b.md\0',
    );
    const plan = buildSeamImpactPlan({ changes, source: { kind: 'test' } });

    assert.equal(changes.length, 3);
    assert.deepEqual(changes[0], {
      status: 'R100',
      oldPath: 'src/lib/equation/old.ts',
      newPath: 'src/lib/ooe/new.ts',
    });
    assert.deepEqual(plan.paths.map((entry) => entry.path), [
      'docs/a.md',
      'docs/b.md',
      'src/AppMain.tsx',
      'src/lib/equation/old.ts',
      'src/lib/ooe/new.ts',
    ]);
    assert.deepEqual(plan.triggeredSeams.map((entry) => entry.id), [
      'app-shell-root',
      'ooe-control',
      'clipboard-contract',
    ]);
  });

  it('returns a stable empty plan for an empty diff', () => {
    const plan = buildSeamImpactPlan({ changes: [], source: { kind: 'git-range' } });

    assert.deepEqual(plan.summary, {
      changeCount: 0,
      pathCount: 0,
      seamImpact: false,
      laneOnly: false,
    });
    assert.deepEqual(plan.additionalCommands, []);
    assert.match(formatHumanPlan(plan), /Classified paths:\n  \(none\)/u);
  });

  it('rejects invalid paths, revisions, and mixed input modes', () => {
    assert.throws(() => normalizeRepoPath('../secret'), /invalid segment/u);
    assert.throws(() => normalizeRepoPath('/tmp/file'), /repository-relative/u);
    assert.throws(() => validateRevision('--output=x', 'Revision'), /not a safe Git revision/u);
    assert.throws(
      () => parseSelectorArgs(['--base', 'a', '--head']),
      /--head requires a value/u,
    );
    assert.throws(
      () => resolveSelectorPlan({ base: 'a', head: 'b', paths: ['x'], githubEvent: false }),
      /Choose exactly one input mode/u,
    );
    assert.throws(
      () => parseGitNameStatusZ('R100\0only-one-path\0'),
      /Incomplete Git rename\/copy record/u,
    );
  });

  it('selects pull-request and push revisions from GitHub event payloads', () => {
    assert.deepEqual(selectGithubEventRange('pull_request', {
      pull_request: { base: { sha: 'base123' }, head: { sha: 'head456' } },
    }), { base: 'base123', head: 'head456' });
    assert.deepEqual(selectGithubEventRange('push', {
      before: 'before123',
      after: 'after456',
    }), { base: 'before123', head: 'after456' });
    assert.deepEqual(selectGithubEventRange('push', {
      before: '0000000000000000000000000000000000000000',
      after: 'after456',
    }), {
      base: '4b825dc642cb6eb9a060e54bf8d69288fbee4904',
      head: 'after456',
    });
  });

  it('resolves explicit and Git-range plans without shell interpolation', () => {
    const explicit = resolveSelectorPlan({
      paths: ['src/lib/kernel/runtime-policy.ts'],
      format: 'human',
      run: false,
      githubEvent: false,
    });
    assert.equal(explicit.source.kind, 'explicit-paths');

    const calls = [];
    const ranged = resolveSelectorPlan({
      base: 'base123',
      head: 'head456',
      paths: [],
      githubEvent: false,
    }, {
      spawn: (command, args) => {
        calls.push([command, args]);
        return { status: 0, stdout: 'M\0src/AppMain.tsx\0', stderr: '' };
      },
    });
    assert.deepEqual(calls, [[
      'git',
      ['diff', '--name-status', '-z', '--find-renames', 'base123', 'head456', '--'],
    ]]);
    assert.equal(ranged.summary.seamImpact, true);
  });

  it('runs only command-registry entries and stops on command failure', () => {
    const plan = buildExplicitPathPlan(['src/lib/kernel/runtime-policy.ts']);
    const calls = [];
    runAdditionalCommands(plan, {
      logger: () => undefined,
      spawn: (command, args) => {
        calls.push([command, args]);
        return { status: 0 };
      },
    });
    assert.deepEqual(calls, [[
      'npm',
      ['run', 'test:workspace-runtime-contracts'],
    ]]);

    assert.throws(
      () => runAdditionalCommands({ additionalCommands: [{ id: 'not-allowed' }] }, {
        logger: () => undefined,
      }),
      /non-allowlisted command/u,
    );
    assert.throws(
      () => runAdditionalCommands(plan, {
        logger: () => undefined,
        spawn: () => ({ status: 2 }),
      }),
      /failed .* status 2/u,
    );
  });
});
