import { describe, expect, it } from 'vitest';
import type { DisplayOutcome } from '../../../types/calculator';
import { buildCanonicalDisplayBlocksFixture as buildDisplayBlocks } from '../../../test-utils/canonical-display-outcome';
import { attachEquationAnalysisEvidence, getEquationAnalysisEvidence } from '../../equation/analysis-evidence';
import { runEquationMode } from '../../modes/equation';
import { makeRequest } from '../../modes/equation/test-support';
import { displayBlockSummaryText } from './display-blocks';
import { buildFormulaViewerArtifact } from '../../../app/runtime/formula-viewer-artifacts';

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
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Symbolic',
      solutionKind: 'approximate-numeric',
      resultOrigin: 'numeric-fallback',
      approxText: 'x ≈ 0',
      branchReadback: {
        targetLatex: 'x',
        relationLatex: '\\approx',
        branchesLatex: ['0'],
      },
      warnings: [],
    };
    attachEquationAnalysisEvidence(outcome, [{
      id: 'trust:numeric-interval:x:local-numeric-roots',
      target: 'x',
      sourceRoute: 'numeric-interval',
      category: 'trust',
      classification: 'local-numeric-roots',
      confidence: 'reported',
      text: 'Local numeric roots in [0, 10]',
      interval: { start: '0', end: '10', local: true },
    }]);

    const answer = buildDisplayBlocks(outcome).find((block) => block.id === 'answer');

    expect(displayBlockSummaryText(answer!)).toBe('Local numeric roots in [0, 10]');
    expect(JSON.stringify(outcome)).not.toContain('local-numeric-roots');
  });

  it('emits certified polynomial trust evidence for real numeric polynomial fallback', () => {
    const result = solve({ equationLatex: 'x^7-x=5' });
    const evidence = getEquationAnalysisEvidence(result);

    expect(evidence).toContainEqual(expect.objectContaining({
      category: 'trust',
      classification: 'certified-polynomial-roots',
      text: 'Certified polynomial roots',
    }));

    const answer = buildDisplayBlocks(result).find((block) => block.id === 'answer');
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

    const answer = buildDisplayBlocks(result).find((block) => block.id === 'answer');
    expect(displayBlockSummaryText(answer!)).toBe('Global complex polynomial roots · 6 roots');
  });

  it('carries evidence-derived trust wording into Formula Viewer artifacts', () => {
    const result = solve({
      equationLatex: String.raw`x^2+\sin(x)=2`,
      numericInterval: { start: '-10', end: '10', subdivisions: 256 },
    });
    const blocks = buildDisplayBlocks(result);
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
