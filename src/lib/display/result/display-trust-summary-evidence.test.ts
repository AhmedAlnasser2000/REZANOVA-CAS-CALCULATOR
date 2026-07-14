import { describe, expect, it } from 'vitest';
import {
  canonicalMathValue,
  type CanonicalResultProducerInputV1,
} from '../../result-contract';
import { canonicalResultFixture } from '../../../test-utils/canonical-result-fixture';
import { getEquationAnalysisEvidence } from '../../equation/analysis-evidence';
import { runEquationMode } from '../../modes/equation';
import { makeRequest } from '../../modes/equation/test-support';
import { buildDisplayBlocks, displayBlockSummaryText } from './display-blocks';
import { buildFormulaViewerArtifact } from '../../../app/runtime/formula-viewer-artifacts';
import { finalizeEquationCanonicalRuntimeOutcome } from '../../equation/equation-solve-result';

function solve(extra: Partial<Parameters<typeof runEquationMode>[0]>) {
  return runEquationMode({
    ...makeRequest(),
    equationScreen: 'symbolic',
    equationLatex: 'x^2-4=0',
    equationSolveTarget: 'x',
    equationAnswerMode: 'exact',
    equationDomainIntent: 'real',
    angleUnit: 'rad',
    ...extra,
  });
}

describe('Equation consumer trust readback', () => {
  it('uses structured trust evidence before Numeric Confidence prose', () => {
    const outcome: CanonicalResultProducerInputV1 = {
      outcomeKind: 'success' as const,
      title: 'Symbolic',
      primaryMath: canonicalMathValue('x\\approx0'),
      approxText: 'x ≈ 0',
      branchReadback: {
        targetLatex: 'x',
        relationLatex: '\\approx',
        branchesLatex: ['0'],
      },
      warnings: [],
      metadata: {
        solutionKind: 'approximate-numeric' as const,
        resultOrigin: 'numeric-fallback' as const,
        numericMethod: 'Local numeric roots in [0, 10]',
        trustEvidence: [{
          classification: 'local-numeric-roots',
          text: 'Local numeric roots in [0, 10]',
          interval: { start: '0', end: '10' },
        }],
      },
    };

    const answer = buildDisplayBlocks(canonicalResultFixture(outcome))
      .find((block) => block.id === 'answer');

    expect(displayBlockSummaryText(answer!)).toBe('Local numeric roots in [0, 10]');
  });

  it('emits certified polynomial trust evidence for real numeric polynomial fallback', () => {
    const result = solve({ equationLatex: 'x^7-x=5' });
    const evidence = getEquationAnalysisEvidence(result);

    expect(evidence).toContainEqual(expect.objectContaining({
      category: 'trust',
      classification: 'certified-polynomial-roots',
      text: 'Certified polynomial roots',
    }));

    const answer = buildDisplayBlocks(finalizeEquationCanonicalRuntimeOutcome(
      result,
      'Equation trust test',
    )).find((block) => block.id === 'answer');
    expect(displayBlockSummaryText(answer!)).toBe('Certified polynomial roots');
  });

  it('does not summarize approximate Complex polynomial branches as exact roots', () => {
    const result = solve({
      equationLatex: 'x^6+x+1=0',
      equationDomainIntent: 'complex',
      complexExactForm: 'rectangular',
    });
    const evidence = getEquationAnalysisEvidence(result);

    expect(evidence).toContainEqual(expect.objectContaining({
      category: 'trust',
      classification: 'global-complex-polynomial-roots',
      text: 'Global complex polynomial roots',
    }));

    const answer = buildDisplayBlocks(finalizeEquationCanonicalRuntimeOutcome(
      result,
      'Equation trust test',
    )).find((block) => block.id === 'answer');
    expect(displayBlockSummaryText(answer!)).toBe('Global complex polynomial roots · 6 roots');
  });

  it('carries evidence-derived trust wording into Formula Viewer artifacts', () => {
    const result = solve({
      equationLatex: String.raw`x^2+\sin(x)=2`,
      numericInterval: { start: '-10', end: '10', subdivisions: 256 },
    });
    const blocks = buildDisplayBlocks(finalizeEquationCanonicalRuntimeOutcome(
      result,
      'Equation trust test',
    ));
    const answer = blocks.find((block) => block.id === 'answer');

    expect(answer?.trustSummary).toBe('Local numeric roots in [-10, 10]');

    const artifact = buildFormulaViewerArtifact({
      block: answer!,
      displayBlocks: blocks,
      now: () => 123,
    });

    expect(artifact.trustSummary).toBe('Local numeric roots in [-10, 10]');
  });
});
