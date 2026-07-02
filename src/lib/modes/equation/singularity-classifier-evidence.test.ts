import { describe, expect, it } from 'vitest';
import { getEquationAnalysisEvidence } from '../../equation/analysis-evidence';
import { runEquationMode } from '../equation';
import { makeRequest } from './test-support';

function solve(equationLatex: string) {
  return runEquationMode({
    ...makeRequest(),
    equationScreen: 'symbolic',
    equationLatex,
    equationSolveTarget: 'x',
    equationAnswerMode: 'exact',
    equationDomainIntent: 'real',
    angleUnit: 'rad',
    numericInterval: { start: '-10', end: '10', subdivisions: 256 },
  });
}

function singularityEvidence(equationLatex: string) {
  return getEquationAnalysisEvidence(solve(equationLatex))
    .filter((entry) => entry.category === 'singularity');
}

describe('Equation singularity classifier evidence', () => {
  it('classifies cancelled denominator exclusions as removable candidates', () => {
    const evidence = singularityEvidence(String.raw`(x^2-4)/(x-2)=0`);

    expect(evidence).toContainEqual(expect.objectContaining({
      classification: 'removable-candidate',
      confidence: 'candidate',
      point: expect.objectContaining({ value: 2, role: 'singularity' }),
    }));
  });

  it('classifies denominator blow-up exclusions as pole or asymptote candidates', () => {
    const evidence = singularityEvidence(String.raw`1/(x-2)=0`);

    expect(evidence).toContainEqual(expect.objectContaining({
      classification: 'pole-asymptote-candidate',
      confidence: 'candidate',
      point: expect.objectContaining({ value: 2, role: 'singularity' }),
    }));
  });

  it('classifies log and root restrictions as branch/domain boundary candidates', () => {
    const evidence = singularityEvidence(String.raw`\ln(x-1)+\sqrt{x+1}=3`);

    expect(evidence.filter((entry) => entry.classification === 'branch-domain-boundary'))
      .toHaveLength(2);
    expect(evidence.map((entry) => entry.text).join(' ')).toContain('branch/domain boundary candidate');
  });

  it('classifies tangent denominator restrictions as trigonometric pole candidates', () => {
    const evidence = singularityEvidence(String.raw`\tan(x)=1`);

    expect(evidence).toContainEqual(expect.objectContaining({
      classification: 'trig-pole',
      confidence: 'candidate',
      latex: String.raw`\cos\left(x\right)\ne0`,
    }));
  });
});
