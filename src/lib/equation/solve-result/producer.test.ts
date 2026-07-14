import { describe, expect, it } from 'vitest';
import { requireCanonicalResultAuthority } from '../../result-contract';
import { createEquationResultOutcome } from './producer';

describe('Equation result producer', () => {
  it('dual-writes complete typed success evidence without reparsing LaTeX', () => {
    const outcome = createEquationResultOutcome({
      kind: 'success',
      title: 'Solve',
      exactLatex: 'x=1',
      primaryMath: {
        canonicalLatex: 'x=1',
        mathJson: ['Equal', 'x', 1],
      },
      branchReadback: {
        targetLatex: 'x',
        relationLatex: '=',
        branchesLatex: ['1'],
      },
      detailSections: [{
        title: 'Proof',
        lines: ['Substitute x=1.'],
        lineParts: [[
          { kind: 'text', text: 'Substitute ' },
          { kind: 'math', latex: 'x=1' },
          { kind: 'text', text: '.' },
        ]],
      }],
      warnings: [],
      answerMode: 'exact',
      answerDomain: 'real',
      solutionKind: 'exact-symbolic',
      resultOrigin: 'symbolic',
      candidateValues: [1],
      rejectedCandidateCount: 0,
      numericMethod: 'fixture',
    });

    expect(requireCanonicalResultAuthority(outcome, 'Equation producer test').canonicalResult)
      .toBeDefined();
    if (!outcome.canonicalResult) {
      throw new Error('Expected a native Equation result document');
    }
    expect(outcome.canonicalResult.metadata).toMatchObject({
      answerMode: 'exact',
      answerDomain: 'real',
      solutionKind: 'exact-symbolic',
      resultOrigin: 'symbolic',
      candidateValues: [1],
      rejectedCandidateCount: 0,
      numericMethod: 'fixture',
    });
  });

  it('keeps transient controls outside a typed controlled-error document', () => {
    const outcome = createEquationResultOutcome({
      kind: 'error',
      title: 'Solve',
      error: 'The requested branch is not supported.',
      warnings: [],
      detailSections: [{
        title: 'Boundary',
        lines: ['Use a bounded interval.'],
        lineKind: 'text',
      }],
      runtimeAdvisories: { stopReason: { kind: 'invalid-request', source: 'planner' } },
    });

    expect(outcome.canonicalResult).not.toHaveProperty('runtimeAdvisories');
    expect(requireCanonicalResultAuthority(outcome, 'Equation error producer test').canonicalResult)
      .toBeDefined();
  });

  it('fails closed on mismatched MathJSON and stores typed summaries', () => {
    expect(() => createEquationResultOutcome({
      kind: 'success',
      title: 'Solve',
      exactLatex: 'x=1',
      primaryMath: {
        canonicalLatex: 'x=2',
        mathJson: ['Equal', 'x', 2],
      },
      warnings: [],
    })).toThrow('must match');
    const summarized = createEquationResultOutcome({
      kind: 'success',
      title: 'Solve',
      exactLatex: 'x=1',
      solveSummaryParts: [[{ kind: 'math', latex: 'x=1' }]],
      warnings: [],
    });
    expect(summarized.canonicalResult?.summaries?.solve?.[0]?.[0]).toMatchObject({
      kind: 'math',
      math: { canonicalLatex: 'x=1' },
    });
  });
});
