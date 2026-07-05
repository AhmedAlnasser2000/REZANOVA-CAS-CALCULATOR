import { describe, expect, it } from 'vitest';
import { getEquationAnalysisEvidence } from '../../equation/analysis-evidence';
import { runEquationMode } from '../equation';
import { makeRequest } from './test-support';

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

describe('Equation certified feature evidence', () => {
  it('exports Sturm-certified real polynomial roots structurally', () => {
    const result = solve({ equationLatex: 'x^7-x=5' });

    expect(result.kind).toBe('success');
    const evidence = getEquationAnalysisEvidence(result);
    expect(evidence).toContainEqual(expect.objectContaining({
      category: 'root',
      classification: 'sturm-certified-root',
      confidence: 'certified',
      sourceRoute: 'deterministic-numeric-algebraic',
      point: expect.objectContaining({ role: 'root' }),
    }));
    expect(evidence).toContainEqual(expect.objectContaining({
      category: 'root',
      classification: 'sturm-certified-intervals',
      confidence: 'certified',
    }));
  });

  it('exports interval-local validated roots and scope evidence', () => {
    const result = solve({
      equationLatex: String.raw`x^2+\sin(x)=2`,
      numericInterval: { start: '-10', end: '10', subdivisions: 256 },
    });

    expect(result.kind).toBe('success');
    const evidence = getEquationAnalysisEvidence(result);
    expect(evidence).toContainEqual(expect.objectContaining({
      category: 'root',
      classification: 'interval-local-root',
      confidence: 'validated',
      interval: expect.objectContaining({ start: '-10', end: '10', local: true }),
      point: expect.objectContaining({ role: 'root' }),
    }));
    expect(evidence).toContainEqual(expect.objectContaining({
      category: 'diagnostic',
      classification: 'interval-local-scope',
      interval: expect.objectContaining({ start: '-10', end: '10', local: true }),
    }));
  });

  it('exports extraneous candidate evidence without parsing Display cards later', () => {
    const result = solve({
      equationLatex: String.raw`\frac{x^2-4}{x-2}=0`,
      numericInterval: { start: '-5', end: '5', subdivisions: 256 },
    });

    expect(result.kind).toBe('success');
    const extraneous = getEquationAnalysisEvidence(result)
      .filter((entry) => entry.category === 'candidate');
    expect(extraneous).toContainEqual(expect.objectContaining({
      classification: 'extraneous-candidate',
      confidence: 'validated',
    }));
    expect(extraneous.map((entry) => entry.text).join(' ')).toContain('rejected');
  });

  it('exports Complex numeric polynomial roots from branch readback', () => {
    const result = solve({
      equationLatex: 'x^6+x+1=0',
      equationDomainIntent: 'complex',
      complexExactForm: 'rectangular',
    });

    expect(result.kind).toBe('success');
    const evidence = getEquationAnalysisEvidence(result)
      .filter((entry) => entry.category === 'root' && entry.classification === 'complex-polynomial-root');
    expect(evidence).toHaveLength(6);
    expect(evidence.every((entry) => entry.confidence === 'validated')).toBe(true);
    expect(evidence.some((entry) => entry.latex?.includes('i'))).toBe(true);
    expect(getEquationAnalysisEvidence(result)).toContainEqual(expect.objectContaining({
      category: 'trust',
      classification: 'global-complex-polynomial-roots',
      text: 'Global complex polynomial roots',
    }));
    expect(JSON.stringify(result)).not.toContain('complex-polynomial-root');
  });
});
