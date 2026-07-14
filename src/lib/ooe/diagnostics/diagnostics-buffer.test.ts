import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildCanonicalResultDocumentFromProducer,
  canonicalMathValue,
} from '../../result-contract';
import {
  clearOoeDiagnostics,
  getLatestOoeDiagnostics,
  listOoeDiagnostics,
  readEquationCanonicalDiagnostics,
  recordOoeDiagnostics,
  summarizeCanonicalRuntimeOutcome,
} from './diagnostics-buffer';
import type { OoeCommitAssessment, OoeJobIdentity } from '../bridge-schema/ooe-bridge';
import {
  canonicalRuntimeResultV2Fixture,
  standardV2MathValue,
} from '../../../test-utils/canonical-result-v2-fixture';

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
    hostAdapter: {
      status: 'ready',
      hostId: 'expression-runtime',
      hostKind: 'mainThreadTypeScript',
      threadSafety: 'mainThreadOnly',
      supportedTaskClasses: ['explicit'],
      budgetPolicy: 'unbudgeted',
      cancellationPolicy: 'staleDrop',
      defaultResultStability: 'draft',
      description: 'Expression host.',
    },
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
      hostAdapter: {
        status: 'ready',
        hostKind: 'mainThreadTypeScript',
      },
    });
  });

  it('records stale, skipped, cancelled, and failed terminal statuses', () => {
    for (const terminalStatus of ['staleDropped', 'skipped', 'cancelled', 'failed'] as const) {
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
      'cancelled',
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
    const canonicalResult = buildCanonicalResultDocumentFromProducer({
      outcomeKind: 'success',
      title: 'Equation',
      primaryMath: canonicalMathValue('x=1'),
      supplements: ['x\\ne0'],
      warnings: ['domain warning'],
      detailSections: [{
        title: 'Solve Target',
        lineParts: [[{ kind: 'text', text: 'Selected target: x' }]],
        lines: ['Selected target: x'],
      }],
      metadata: { solveBadges: ['Candidate Checked'] },
    });
    expect(summarizeCanonicalRuntimeOutcome({
      kind: 'success',
      title: 'Stale title',
      exactLatex: 'x=999',
      warnings: [],
      canonicalResult,
    })).toEqual({
      kind: 'success',
      title: 'Equation',
      warningsCount: 1,
      answerDomain: undefined,
      resultOrigin: undefined,
      calculusStrategy: undefined,
      calculusDerivativeStrategies: undefined,
      plannerBadges: undefined,
      solveBadges: ['Candidate Checked'],
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

  it('projects Equation provenance through the diagnostics-owned canonical seam', () => {
    const canonicalResult = buildCanonicalResultDocumentFromProducer({
      outcomeKind: 'success',
      title: 'Equation',
      primaryMath: canonicalMathValue('x=1'),
      warnings: [],
      detailSections: [{
        title: 'Isolation steps',
        lineParts: [[
          { kind: 'text', text: 'Generated equation: ' },
          { kind: 'math', latex: 'x=1' },
        ]],
        lines: ['Generated equation: x=1'],
      }],
      metadata: {
        answerDomain: 'real',
        solutionKind: 'exact-symbolic',
      },
    });

    expect(readEquationCanonicalDiagnostics({
      kind: 'success',
      canonicalResult,
    })).toEqual({
      answerDomain: 'real',
      solutionKind: 'exact-symbolic',
      primaryLatexLength: 3,
      error: undefined,
      detailSectionTitles: ['Isolation steps'],
      generatedRewriteOrIsolationDetails: ['Generated equation: x=1'],
    });
  });

  it('detects unsafe readback markers in summaries', () => {
    const canonicalResult = buildCanonicalResultDocumentFromProducer({
      outcomeKind: 'success',
      title: 'Equation',
      primaryMath: canonicalMathValue('\\mathtip{\\blacksquare}'),
      warnings: [],
    });
    expect(summarizeCanonicalRuntimeOutcome({
      kind: 'success',
      title: 'Equation',
      exactLatex: 'stale',
      warnings: [],
      canonicalResult,
    }).unsafeReadbackMarkers).toEqual(['\\blacksquare', '\\mathtip']);
  });

  it('summarizes V2 adapter presentation without exposing typed payloads', () => {
    expect(summarizeCanonicalRuntimeOutcome(canonicalRuntimeResultV2Fixture({
      outcomeKind: 'success',
      title: 'Typed result',
      primary: { kind: 'math', value: standardV2MathValue('2', 2) },
      supplements: [{
        role: 'condition',
        presentationLatex: 'x>0',
        math: standardV2MathValue('x>0', ['Greater', 'x', 0]),
      }],
      warnings: ['typed warning'],
    }))).toMatchObject({
      kind: 'success',
      title: 'Typed result',
      warningsCount: 1,
      exactLatexLength: 1,
      exactSupplementCount: 1,
    });
  });

  it('does not inspect compatibility strings without canonical authority', () => {
    expect(summarizeCanonicalRuntimeOutcome({
      kind: 'success',
      title: 'Legacy',
      exactLatex: '\\mathtip{\\blacksquare}',
      warnings: [],
    })).toEqual({
      kind: 'success',
      errorSummary: 'Canonical result unavailable: missing-document',
    });
  });
});
