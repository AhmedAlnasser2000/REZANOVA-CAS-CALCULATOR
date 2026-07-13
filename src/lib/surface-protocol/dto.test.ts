import { describe, expect, it } from 'vitest';
import type { DisplayOutcome } from '../../types/calculator';
import {
  buildCanonicalResultDocumentFromProducer,
  canonicalMathValue,
} from '../result-contract';
import {
  SURFACE_PROTOCOL_VERSION,
  displayOutcomeToSurfaceResultSummary,
  emptySurfaceResultSummary,
  surfaceFailure,
  surfaceOk,
} from './dto';

describe('Surface Protocol DTO firewall', () => {
  it('maps a DisplayOutcome to a compact Surface result summary', () => {
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Equation Result',
      exactLatex: 'x=2',
      canonicalMath: {
        version: 1,
        canonicalLatex: 'x=2',
        mathJson: ['Equal', 'x', 2],
      },
      approxText: 'x ≈ 2',
      exactSupplementLatex: ['x\\ne0'],
      answerDomain: 'real',
      solutionKind: 'exact-symbolic',
      solveSummaryText: 'Solved exactly.',
      solveSummaryParts: [[{ kind: 'text', text: 'Solved exactly.' }]],
      branchReadback: {
        targetLatex: 'x',
        relationLatex: '=',
        branchesLatex: ['2'],
        countLabel: 'roots',
      },
      warnings: ['Check denominator exclusions.'],
      rejectedCandidateCount: 1,
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

    expect(displayOutcomeToSurfaceResultSummary('equation', outcome)).toEqual({
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
    const serialized = JSON.stringify(displayOutcomeToSurfaceResultSummary('equation', outcome));
    expect(serialized).not.toContain('canonicalMath');
    expect(serialized).not.toContain('Equal');
  });

  it('does not expose Display block trees or runtime internals', () => {
    const summary = displayOutcomeToSurfaceResultSummary('calculate', {
      kind: 'error',
      title: 'Unsupported',
      error: 'No route.',
      warnings: [],
      detailSections: [{ title: 'Diagnostics', lines: ['internal route missed'], lineKind: 'text' }],
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
