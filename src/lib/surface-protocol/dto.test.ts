import { describe, expect, it } from 'vitest';
import type { CanonicalRuntimeOutcome } from '../../types/calculator';
import {
  buildCanonicalResultDocumentFromProducer,
  canonicalMathValue,
} from '../result-contract';
import {
  SURFACE_PROTOCOL_VERSION,
  canonicalOutcomeToSurfaceResultSummary,
  emptySurfaceResultSummary,
  surfaceFailure,
  surfaceOk,
} from './dto';
import {
  canonicalRuntimeResultV2Fixture,
  standardV2MathValue,
} from '../../test-utils/canonical-result-v2-fixture';

describe('Surface Protocol DTO firewall', () => {
  it('maps a canonical runtime outcome to a compact Surface result summary', () => {
    const outcome: CanonicalRuntimeOutcome = {
      kind: 'success',
      canonicalResult: buildCanonicalResultDocumentFromProducer({
        outcomeKind: 'success',
        title: 'Equation Result',
        primaryMath: canonicalMathValue('x=2', ['Equal', 'x', 2]),
        approxText: 'x ≈ 2',
        supplements: ['x\\ne0'],
        solveSummaryParts: [[{ kind: 'text', text: 'Solved exactly.' }]],
        branchReadback: {
          targetLatex: 'x',
          relationLatex: '=',
          branchesLatex: ['2'],
          countLabel: 'roots',
        },
        warnings: ['Check denominator exclusions.'],
        metadata: {
          answerDomain: 'real',
          solutionKind: 'exact-symbolic',
          rejectedCandidateCount: 1,
        },
      }),
    };

    expect(canonicalOutcomeToSurfaceResultSummary('equation', outcome)).toEqual({
      protocolVersion: SURFACE_PROTOCOL_VERSION,
      workspaceKind: 'equation',
      status: 'success',
      title: 'Equation Result',
      resultKind: 'exact',
      primaryLatex: 'x=2',
      approximateText: 'x ≈ 2',
      answerDomain: 'real',
      solutionKind: 'exact-symbolic',
      facts: [
        { kind: 'condition', label: 'Valid when', latex: 'x\\ne0' },
        { kind: 'summary', label: 'Solve summary', text: 'Solved exactly.' },
        { kind: 'domain', label: 'Answer domain', text: 'real' },
      ],
      warnings: [{ text: 'Check denominator exclusions.' }],
      counts: [
        { kind: 'roots', count: 1, label: 'Roots' },
        { kind: 'rejectedCandidates', count: 1, label: 'Rejected candidates' },
        { kind: 'warnings', count: 1, label: 'Warnings' },
        { kind: 'facts', count: 3, label: 'Facts' },
      ],
    });
    const serialized = JSON.stringify(canonicalOutcomeToSurfaceResultSummary('equation', outcome));
    expect(serialized).not.toContain('primaryMath');
    expect(serialized).not.toContain('Equal');
  });

  it('does not expose Display block trees or runtime internals', () => {
    const summary = canonicalOutcomeToSurfaceResultSummary('calculate', {
      kind: 'error',
      runtimeAdvisories: {
        stopReason: { kind: 'unsupported-family', source: 'host' },
      },
      canonicalResult: buildCanonicalResultDocumentFromProducer({
        outcomeKind: 'error',
        title: 'Unsupported',
        error: 'No route.',
        detailSections: [{
          title: 'Diagnostics',
          lines: ['internal route missed'],
          lineKind: 'text',
        }],
        warnings: [],
      }),
    });

    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain('detailSections');
    expect(serialized).not.toContain('runtimeAdvisories');
    expect(serialized).not.toContain('DisplayBlock');
    expect(serialized).not.toContain('internal route missed');
  });

  it('maps V2 through the same normalized Surface DTO without leaking typed internals', () => {
    const outcome = canonicalRuntimeResultV2Fixture({
      outcomeKind: 'success',
      title: 'Typed Equation Result',
      primary: { kind: 'math', value: standardV2MathValue('x=2', ['Equal', 'x', 2]) },
      supplements: [{
        role: 'exclusion',
        presentationLatex: 'x\\ne0',
        math: standardV2MathValue('x\\ne0', ['NotEqual', 'x', 0]),
      }],
      warnings: [],
      metadata: { answerDomain: 'real', solutionKind: 'exact-symbolic' },
    });

    const summary = canonicalOutcomeToSurfaceResultSummary('equation', outcome);
    expect(summary).toMatchObject({
      status: 'success',
      title: 'Typed Equation Result',
      primaryLatex: 'x=2',
    });
    expect(summary.facts).toContainEqual(expect.objectContaining({
      kind: 'condition',
      latex: 'x\\ne0',
    }));
    expect(JSON.stringify(summary)).not.toMatch(/mathJson|presentationLatex|"kind":"exclusion"/u);
  });

  it('creates explicit empty and wrapper DTOs', () => {
    expect(emptySurfaceResultSummary('calculate')).toMatchObject({
      protocolVersion: SURFACE_PROTOCOL_VERSION,
      workspaceKind: 'calculate',
      status: 'empty',
    });
    expect(surfaceOk({ value: 42 })).toEqual({
      ok: true,
      protocolVersion: SURFACE_PROTOCOL_VERSION,
      value: { value: 42 },
    });
    expect(surfaceFailure('unsupported-workspace', 'Unsupported workspace.', 'workspaceKind')).toEqual({
      ok: false,
      protocolVersion: SURFACE_PROTOCOL_VERSION,
      error: {
        protocolVersion: SURFACE_PROTOCOL_VERSION,
        code: 'unsupported-workspace',
        message: 'Unsupported workspace.',
        field: 'workspaceKind',
      },
    });
  });
});
