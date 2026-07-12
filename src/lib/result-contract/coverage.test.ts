import { describe, expect, it } from 'vitest';
import { goldenCases } from '../__golden__/golden-cases';
import { runGoldenCase, type GoldenExecution } from '../__golden__/golden-execution';
import {
  collectDisplayOutcomeMathFragments,
  collectTableResponseMathFragments,
  normalizePrintHygieneValue,
} from '../display/print-hygiene';
import { HISTORY_REPLAY_FIXTURES } from '../history-replay/fixtures';
import { executeHistoryReplayRequest } from '../history-replay/native-execution';
import type { HistoryReplayExecution } from '../history-replay/fixture-contract';
import { hasNativeCalculusResultDocument } from '../calculus/workspace/result-document';
import type { CalculusScreen } from '../../types/calculator';
import {
  projectCanonicalResultToDisplayOutcome,
  projectCanonicalResultToTableResponse,
  projectDisplayOutcomeToCanonicalResult,
} from './projection';
import { resolveCanonicalResultForStorage } from './storage';

function stableMathValues(execution: GoldenExecution | HistoryReplayExecution) {
  return [
    ...collectDisplayOutcomeMathFragments(execution.outcome),
    ...collectTableResponseMathFragments(execution.tableResponse),
  ]
    .filter((fragment) => fragment.kind !== 'action' && fragment.kind !== 'canonical-payload')
    .map((fragment) => normalizePrintHygieneValue(fragment.value));
}

function detailLines(execution: GoldenExecution | HistoryReplayExecution) {
  return execution.outcome.kind === 'prompt'
    ? []
    : execution.outcome.detailSections?.map((section) => ({
        title: section.title,
        lines: [...section.lines],
      })) ?? [];
}

function stableOutcomeMetadata(execution: GoldenExecution | HistoryReplayExecution) {
  const outcome = execution.outcome;
  if (outcome.kind === 'prompt') return { kind: outcome.kind, title: outcome.title };
  return {
    kind: outcome.kind,
    title: outcome.title,
    ...(outcome.kind === 'error' ? { error: outcome.error } : {}),
    warnings: outcome.warnings,
    approxText: outcome.approxText,
    answerMode: outcome.answerMode,
    answerDomain: outcome.answerDomain,
    solutionKind: outcome.solutionKind,
    plannerBadges: outcome.plannerBadges ?? [],
    solveBadges: outcome.solveBadges ?? [],
    transformBadges: outcome.transformBadges ?? [],
    rejectedCandidateCount: outcome.rejectedCandidateCount,
    substitutionDiagnostics: outcome.substitutionDiagnostics,
    numericMethod: outcome.numericMethod,
    sourceMode: outcome.sourceMode,
    ...(outcome.kind === 'success'
      ? {
          resultOrigin: outcome.resultOrigin,
          calculusStrategy: outcome.calculusStrategy,
          calculusDerivativeStrategies: outcome.calculusDerivativeStrategies ?? [],
          candidateValues: outcome.candidateValues ?? [],
          variableSubstitutions: outcome.variableSubstitutions ?? [],
        }
      : {}),
  };
}

function assertCanonicalRoundTrip(
  execution: GoldenExecution | HistoryReplayExecution,
  label: string,
) {
  const projected = projectDisplayOutcomeToCanonicalResult(execution.outcome, {
    tableResponse: execution.tableResponse,
  });
  if (!projected.ok) {
    throw new Error(`${label}: ${projected.failure.reason}: ${projected.failure.message}`);
  }
  expect(projected.ok, label).toBe(true);
  if (execution.outcome.kind !== 'prompt' && execution.outcome.canonicalResult) {
    expect(resolveCanonicalResultForStorage(execution.outcome, {
      tableResponse: execution.tableResponse,
    }), `${label} native parity`).toMatchObject({ ok: true, source: 'native' });
  }

  const restored: GoldenExecution = {
    outcome: projectCanonicalResultToDisplayOutcome(projected.document),
    tableResponse: projectCanonicalResultToTableResponse(projected.document),
  };
  expect(stableMathValues(restored), `${label} math values`).toEqual(stableMathValues(execution));
  expect(detailLines(restored), `${label} details`).toEqual(detailLines(execution));
  expect(stableOutcomeMetadata(restored), `${label} metadata`).toEqual(stableOutcomeMetadata(execution));
  expect(restored.tableResponse, `${label} Table response`).toEqual(execution.tableResponse);
  expect(restored.outcome.kind === 'prompt' ? undefined : restored.outcome.actions).toBeUndefined();
  expect(restored.outcome.runtimeAdvisories).toBeUndefined();

  const repeated = projectDisplayOutcomeToCanonicalResult(restored.outcome, {
    tableResponse: restored.tableResponse,
  });
  expect(repeated, `${label} idempotence`).toEqual(projected);
}

describe('canonical result corpus coverage', () => {
  it('projects all 43 golden executions without visible or mathematical drift', async () => {
    expect(goldenCases).toHaveLength(43);
    for (const goldenCase of goldenCases) {
      const execution = await runGoldenCase(goldenCase);
      assertCanonicalRoundTrip(execution, goldenCase.id);
      if (
        goldenCase.mode === 'calculate'
        || goldenCase.mode === 'equation'
        || goldenCase.mode === 'calculus'
      ) {
        expect(
          execution.outcome.kind === 'prompt'
            ? undefined
            : execution.outcome.canonicalResult,
          `${goldenCase.id} native ${goldenCase.mode} document`,
        ).toBeDefined();
      }
    }
  }, 60_000);

  it('projects all 100 deterministic History replay executions', async () => {
    expect(HISTORY_REPLAY_FIXTURES).toHaveLength(100);
    const nativeEquationFixtures: string[] = [];
    const nativeCalculusFixtures: string[] = [];
    for (const fixture of HISTORY_REPLAY_FIXTURES) {
      const execution = await executeHistoryReplayRequest(fixture.workspace, fixture.request);
      assertCanonicalRoundTrip(execution, fixture.id);
      const nativeDocument = execution.outcome.kind === 'prompt'
        ? undefined
        : execution.outcome.canonicalResult;
      if (fixture.workspace === 'calculate') {
        expect(nativeDocument, `${fixture.id} native Calculate document`).toBeDefined();
      }
      if (fixture.workspace === 'equation' && nativeDocument) {
        nativeEquationFixtures.push(fixture.id);
      }
      if (
        fixture.workspace === 'calculus'
        && typeof fixture.request.screen === 'string'
        && hasNativeCalculusResultDocument(fixture.request.screen as CalculusScreen)
      ) {
        expect(nativeDocument, `${fixture.id} native Calculus family document`).toBeDefined();
        if (nativeDocument) nativeCalculusFixtures.push(fixture.id);
      }
    }
    expect(nativeEquationFixtures).toEqual(
      HISTORY_REPLAY_FIXTURES
        .filter((fixture) => fixture.workspace === 'equation')
        .map((fixture) => fixture.id),
    );
    expect(nativeCalculusFixtures).toEqual(
      HISTORY_REPLAY_FIXTURES
        .filter((fixture) => fixture.workspace === 'calculus')
        .map((fixture) => fixture.id),
    );
  }, 60_000);
});
