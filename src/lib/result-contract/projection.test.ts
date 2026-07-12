import { describe, expect, it } from 'vitest';
import type { DisplayOutcome, TableResponse } from '../../types/calculator';
import {
  projectCanonicalResultToDisplayOutcome,
  projectCanonicalResultToTableResponse,
  projectDisplayOutcomeToCanonicalResult,
} from './projection';

const TABLE_RESPONSE: TableResponse = {
  headers: ['x', 'f(x)', 'g(x)'],
  rows: [
    { x: '-1', primary: 'undefined', secondary: '0' },
    { x: '0', primary: '0', secondary: '1' },
  ],
  warnings: ['One warning'],
};

function richOutcome(): Extract<DisplayOutcome, { kind: 'success' }> {
  return {
    kind: 'success',
    title: 'Solved equation',
    exactLatex: 'x=1',
    canonicalMath: {
      version: 1,
      canonicalLatex: 'x=1',
      mathJson: ['Equal', 'x', 1],
    },
    answerRows: { label: 'Answers', rows: [{ latex: 'x=1', label: 'Root' }] },
    branchReadback: {
      targetLatex: 'x',
      relationLatex: '=',
      branchesLatex: ['1', '2'],
      countLabel: 'roots',
      source: 'polynomial',
    },
    systemReadback: {
      variablesLatex: ['x', 'y'],
      rows: [{ valuesLatex: ['1', '2'], approxText: '(1.0, 2.0)' }],
      source: 'linear-system',
    },
    periodicFamily: {
      carrierLatex: '\\sin(x)',
      parameterLatex: 'n',
      parameterConstraintLatex: ['n\\in\\mathbb{Z}'],
      branchesLatex: ['x=2n\\pi'],
      discoveredFamilies: ['x=(2n+1)\\pi'],
      representatives: [{ label: 'Principal', exactLatex: '0', approxText: '0.0' }],
      suggestedIntervals: [{ label: 'Cycle', start: '0', end: '2\\pi' }],
      piecewiseBranches: [{ conditionLatex: 'n>0', resultLatex: '2n\\pi' }],
      principalRangeLatex: '[-\\pi,\\pi]',
      reducedCarrierLatex: '\\sin(x)',
    },
    exactSupplementLatex: ['x\\ne0'],
    approxText: '1.000000',
    detailSections: [
      {
        title: 'Proof',
        lines: ['Substitute x=1'],
        lineParts: [[
          { kind: 'text', text: 'Substitute ' },
          { kind: 'math', latex: 'x=1' },
        ]],
      },
      { title: 'Boundary', lines: ['x>0'], lineKind: 'math' },
      { title: 'Method', lines: ['Exact route'], lineKind: 'text' },
    ],
    warnings: ['One warning'],
    answerMode: 'exact',
    answerDomain: 'real',
    solutionKind: 'exact-symbolic',
    resultOrigin: 'symbolic',
    calculusStrategy: 'direct-rule',
    calculusDerivativeStrategies: ['chain-rule'],
    actions: [{ kind: 'send', target: 'equation', latex: 'x=1' }],
    resolvedInputLatex: 'x+1=2',
    plannerBadges: ['Canonicalized'],
    solveBadges: ['Candidate Checked'],
    solveSummaryText: 'Candidate: x=1',
    solveSummaryParts: [[
      { kind: 'text', text: 'Candidate: ' },
      { kind: 'math', latex: 'x=1' },
    ]],
    transformBadges: ['Cancel Factors'],
    transformSummaryText: 'Factored form',
    transformSummaryLatex: '(x-1)(x-2)',
    candidateValues: [1, 2],
    rejectedCandidateCount: 1,
    substitutionDiagnostics: {
      family: 'exp-polynomial',
      carrierKind: 'exp',
      polynomialDegree: 2,
      branchCount: 2,
      filteredBranchCount: 1,
    },
    numericMethod: 'Exact factorization',
    sourceMode: 'equation',
    runtimeAdvisories: {
      stopReason: { kind: 'range-guard', source: 'stage' },
    },
    variableSubstitutions: [{ name: 'a', valueLatex: '2', numericValue: 2 }],
  };
}

describe('canonical result compatibility projections', () => {
  it('projects typed Display and Table data without retaining transient authority', () => {
    const outcome = richOutcome();
    const result = projectDisplayOutcomeToCanonicalResult(outcome, {
      tableResponse: TABLE_RESPONSE,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.failure.message);
    expect(result.document).toMatchObject({
      version: 1,
      outcomeKind: 'success',
      title: 'Solved equation',
      primaryMath: { canonicalLatex: 'x=1', mathJson: ['Equal', 'x', 1] },
    });
    expect(result.document.table?.rows[0]).toMatchObject({
      x: { canonicalLatex: '-1' },
      primary: { canonicalLatex: 'undefined' },
    });
    expect(JSON.stringify(result.document)).not.toContain('actions');
    expect(JSON.stringify(result.document)).not.toContain('runtimeAdvisories');
    expect(JSON.stringify(result.document)).not.toContain('workspaceInstance');
  });

  it('round-trips canonical structure idempotently without parsing LaTeX', () => {
    const first = projectDisplayOutcomeToCanonicalResult(richOutcome(), {
      tableResponse: TABLE_RESPONSE,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error(first.failure.message);

    const display = projectCanonicalResultToDisplayOutcome(first.document);
    const table = projectCanonicalResultToTableResponse(first.document);
    expect(display).toMatchObject({
      kind: 'success',
      title: 'Solved equation',
      exactLatex: 'x=1',
      answerRows: { rows: [{ latex: 'x=1' }] },
      branchReadback: { branchesLatex: ['1', '2'] },
      systemReadback: { rows: [{ valuesLatex: ['1', '2'] }] },
      exactSupplementLatex: ['x\\ne0'],
    });
    expect('actions' in display).toBe(false);
    expect('runtimeAdvisories' in display).toBe(false);
    expect(display.detailSections?.map((section) => section.lines)).toEqual([
      ['Substitute x=1'],
      ['x>0'],
      ['Exact route'],
    ]);
    expect(table).toEqual(TABLE_RESPONSE);

    const second = projectDisplayOutcomeToCanonicalResult(display, { tableResponse: table });
    expect(second).toEqual(first);
  });

  it('keeps controlled error math and error text in the neutral document', () => {
    const outcome: DisplayOutcome = {
      kind: 'error',
      title: 'Boundary',
      error: 'No real solution.',
      exactLatex: 'x\\notin\\mathbb{R}',
      canonicalMath: { version: 1, canonicalLatex: 'x\\notin\\mathbb{R}' },
      branchReadback: {
        targetLatex: 'x',
        relationLatex: '\\in',
        branchesLatex: ['\\varnothing'],
      },
      warnings: [],
      detailSections: [{ title: 'Domain', lines: ['x<0'], lineKind: 'math' }],
    };
    const projected = projectDisplayOutcomeToCanonicalResult(outcome);
    expect(projected.ok).toBe(true);
    if (!projected.ok) throw new Error(projected.failure.message);
    expect(projected.document).toMatchObject({
      outcomeKind: 'error',
      error: 'No real solution.',
      primaryMath: { canonicalLatex: 'x\\notin\\mathbb{R}' },
    });
    const restored = projectCanonicalResultToDisplayOutcome(projected.document);
    expect(restored).toMatchObject({
      kind: 'error',
      title: outcome.title,
      error: outcome.error,
      exactLatex: outcome.exactLatex,
      branchReadback: outcome.branchReadback,
      warnings: outcome.warnings,
    });
    expect(restored.detailSections?.[0]).toMatchObject({
      title: 'Domain',
      lines: ['x<0'],
      lineParts: [[{ kind: 'math', latex: 'x<0' }]],
    });
  });

  it('rejects prompts, mismatched payloads, and undeclared math-bearing compatibility text', () => {
    expect(projectDisplayOutcomeToCanonicalResult({
      kind: 'prompt',
      title: 'Open Equation',
      message: 'Continue there.',
      targetMode: 'equation',
      carryLatex: 'x+1=2',
      warnings: [],
    })).toMatchObject({ ok: false, failure: { reason: 'prompt-outcome' } });

    const mismatched = richOutcome();
    mismatched.canonicalMath = { version: 1, canonicalLatex: 'x=2' };
    expect(projectDisplayOutcomeToCanonicalResult(mismatched)).toMatchObject({
      ok: false,
      failure: { reason: 'canonical-math-mismatch' },
    });

    const undeclaredDetail = richOutcome();
    undeclaredDetail.detailSections = [{ title: 'Legacy', lines: ['x=1'] }];
    expect(projectDisplayOutcomeToCanonicalResult(undeclaredDetail)).toMatchObject({
      ok: false,
      failure: { reason: 'undeclared-detail' },
    });

    const undeclaredSummary = richOutcome();
    delete undeclaredSummary.solveSummaryParts;
    expect(projectDisplayOutcomeToCanonicalResult(undeclaredSummary)).toMatchObject({
      ok: false,
      failure: { reason: 'undeclared-summary' },
    });
  });
});
