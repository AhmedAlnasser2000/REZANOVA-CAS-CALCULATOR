import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearOoeDiagnostics,
  getLatestOoeDiagnostics,
  listOoeDiagnostics,
  recordOoeDiagnostics,
  summarizeDisplayOutcome,
} from './diagnostics-buffer';
import type { OoeCommitAssessment, OoeJobIdentity } from './ooe-bridge';

const job: OoeJobIdentity = {
  jobId: 'job.expression.evaluate.abc',
  planId: 'plan.expression.evaluate',
  capabilityId: 'expression.evaluate',
  hostId: 'expression-runtime',
  nodeId: 'node.expression.evaluate',
  phaseId: 'expression.evaluate',
  inputRevisionId: 'input.expression.evaluate.abc',
};

const committedAssessment: OoeCommitAssessment = {
  job,
  activeInputRevisionId: job.inputRevisionId,
  commitPolicy: 'commitLatestOnly',
  legality: 'commitAllowed',
  commitDecision: 'committed',
  resultStability: 'stable',
};

function record(index: number) {
  return recordOoeDiagnostics({
    job: {
      ...job,
      jobId: `job.expression.evaluate.${index}`,
      inputRevisionId: `input.expression.evaluate.${index}`,
    },
    routeLabel: 'expression.evaluate',
    terminalStatus: 'completed',
    commitAssessment: committedAssessment,
    traceEvents: [],
    provenance: {
      depth: 'coarse',
      mode: 'calculate',
      route: 'expression.evaluate',
      outputSummary: {
        kind: 'success',
        title: `Result ${index}`,
      },
    },
    startedAt: index,
    finishedAt: index + 1,
  });
}

describe('OOE diagnostics buffer', () => {
  beforeEach(() => {
    clearOoeDiagnostics();
  });

  it('records and returns completed diagnostics in newest-first order', () => {
    const first = record(1);
    const second = record(2);

    expect(listOoeDiagnostics().map((entry) => entry.diagnosticsId)).toEqual([
      second.diagnosticsId,
      first.diagnosticsId,
    ]);
    expect(getLatestOoeDiagnostics()).toMatchObject({
      diagnosticsId: second.diagnosticsId,
      terminalStatus: 'completed',
      routeLabel: 'expression.evaluate',
      durationMs: 1,
    });
  });

  it('records stale, skipped, and failed terminal statuses', () => {
    for (const terminalStatus of ['staleDropped', 'skipped', 'failed'] as const) {
      recordOoeDiagnostics({
        job,
        routeLabel: 'test.route',
        terminalStatus,
        commitAssessment: {
          ...committedAssessment,
          legality: terminalStatus === 'staleDropped' ? 'staleDrop' : 'notApplicable',
          commitDecision: terminalStatus === 'staleDropped' ? 'staleDropped' : 'notApplicable',
          resultStability: terminalStatus === 'failed' ? 'failed' : 'stale',
        },
        startedAt: 10,
        finishedAt: 15,
        errorMessage: terminalStatus === 'failed' ? 'runtime exploded' : undefined,
      });
    }

    expect(listOoeDiagnostics().map((entry) => entry.terminalStatus)).toEqual([
      'failed',
      'skipped',
      'staleDropped',
    ]);
    expect(
      getLatestOoeDiagnostics((entry) => entry.terminalStatus === 'failed')?.errorMessage,
    ).toBe('runtime exploded');
  });

  it('enforces bounded retention', () => {
    clearOoeDiagnostics({ limit: 2 });

    record(1);
    record(2);
    record(3);

    expect(listOoeDiagnostics().map((entry) => entry.jobId)).toEqual([
      'job.expression.evaluate.3',
      'job.expression.evaluate.2',
    ]);
  });

  it('summarizes display outcomes without storing full math payloads', () => {
    expect(summarizeDisplayOutcome({
      kind: 'success',
      title: 'Equation',
      exactLatex: 'x=1',
      exactSupplementLatex: ['x\\ne0'],
      warnings: ['domain warning'],
      solveBadges: ['Symbolic'],
      detailSections: [{ title: 'Solve Target', lines: ['Selected target: x'] }],
    })).toEqual({
      kind: 'success',
      title: 'Equation',
      warningsCount: 1,
      resultOrigin: undefined,
      calculusStrategy: undefined,
      calculusDerivativeStrategies: undefined,
      plannerBadges: undefined,
      solveBadges: ['Symbolic'],
      transformBadges: undefined,
      hasExactLatex: true,
      exactLatexLength: 3,
      exactSupplementCount: 1,
      hasPeriodicFamily: false,
      hasApproxText: false,
      approxTextLength: undefined,
      detailSectionTitles: ['Solve Target'],
      summaryText: undefined,
      errorSummary: undefined,
      unsafeReadbackMarkers: undefined,
    });
  });

  it('detects unsafe readback markers in summaries', () => {
    expect(summarizeDisplayOutcome({
      kind: 'success',
      title: 'Equation',
      exactLatex: '\\mathtip{\\blacksquare}',
      warnings: [],
    }).unsafeReadbackMarkers).toEqual(['\\blacksquare', '\\mathtip']);
  });
});
