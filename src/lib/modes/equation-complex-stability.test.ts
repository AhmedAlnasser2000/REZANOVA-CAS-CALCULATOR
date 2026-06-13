import { describe, expect, it } from 'vitest';
import {
  buildEquationOoeInputRevisionId,
  runEquationMode,
  runEquationModeWithOoePilot,
} from './equation';

const system2 = [
  [1, 1, 3],
  [2, -1, 0],
];

const system3 = [
  [1, 1, 1, 6],
  [2, -1, 1, 3],
  [1, 2, -1, 3],
];

function makeRequest() {
  return {
    equationLatex: 'x^2-5x+6=0',
    quadraticCoefficients: [1, -5, 6],
    cubicCoefficients: [1, -6, 11, -6],
    quarticCoefficients: [1, 0, -5, 0, 4],
    polynomialSystem2Latex: ['x+y=3', 'x-y=1'] as const,
    system2,
    system3,
    angleUnit: 'deg' as const,
    outputStyle: 'both' as const,
    ansLatex: '0',
  };
}

describe('Equation Complex exact stability', () => {
  it('keeps Complex Exact output stable through the OOE wrapper and exact-form revisions', async () => {
    const baseRequest = {
      ...makeRequest(),
      equationScreen: 'symbolic' as const,
      equationLatex: 'x^4+i=0',
      equationSolveTarget: 'x',
      equationAnswerMode: 'exact' as const,
      equationDomainIntent: 'complex' as const,
    };

    expect(buildEquationOoeInputRevisionId({
      ...baseRequest,
      complexExactForm: 'rectangular' as const,
    })).not.toBe(buildEquationOoeInputRevisionId({
      ...baseRequest,
      complexExactForm: 'cis' as const,
    }));

    for (const complexExactForm of ['rectangular', 'polar', 'cis'] as const) {
      const request = { ...baseRequest, complexExactForm };
      const direct = runEquationMode(request);
      const wrapped = await runEquationModeWithOoePilot(request);

      expect(wrapped.payload).toEqual(direct);
      expect(wrapped.payload.kind).toBe('success');
      if (wrapped.payload.kind !== 'success') {
        throw new Error(`Expected ${complexExactForm} complex exact output to solve`);
      }
      expect(wrapped.payload.answerDomain).toBe('complex');
    }
  });

  it('keeps j and k ordinary selected-target variables under Complex intent', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'j+k=0',
      equationSolveTarget: 'j',
      equationAnswerMode: 'exact',
      equationDomainIntent: 'complex',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected ordinary j/k selected-target solve to succeed');
    }
    expect(result.answerDomain).toBeUndefined();
    expect(result.exactLatex).toBe('j=-k');
    expect(result.detailSections?.some((section) =>
      section.lines.includes('Selected target: j')
      && section.lines.includes('Symbolic parameters: k'))).toBe(true);
  });
});
