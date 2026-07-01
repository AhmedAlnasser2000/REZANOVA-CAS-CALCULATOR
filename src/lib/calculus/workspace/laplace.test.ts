import { describe, expect, it } from 'vitest';
import { runCalculusWorkspaceMode } from './engine';
import { evaluateCalculusLaplaceTransform } from './laplace';

describe('calculus Laplace table', () => {
  it.each([
    ['constant', '1', '\\frac{1}{s}'],
    ['linear power', 't', '\\frac{1}{s^{2}}'],
    ['quadratic power', 't^2', '\\frac{2}{s^{3}}'],
    ['exponential', 'e^{2t}', '\\frac{1}{s-2}'],
    ['sine', '\\sin(3t)', '\\frac{3}{s^{2}+9}'],
    ['cosine', '\\cos(3t)', '\\frac{s}{s^{2}+9}'],
    ['shifted cosine', 'e^{2t}\\cos(3t)', '\\frac{s-2}{\\left(s-2\\right)^{2}+9}'],
  ])('resolves %s table case', (_label, bodyLatex, expectedLatex) => {
    const result = evaluateCalculusLaplaceTransform({ bodyLatex });

    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('rule-based-symbolic');
    expect(result.exactLatex).toBe(expectedLatex);
    expect(result.detailSections?.[0]?.title).toBe('Laplace Table');
  });

  it('supports hyperbolic and exponential sine table cases', () => {
    const sinh = evaluateCalculusLaplaceTransform({ bodyLatex: '\\sinh(2t)' });
    const cosh = evaluateCalculusLaplaceTransform({ bodyLatex: '\\cosh(2t)' });
    const shiftedSine = evaluateCalculusLaplaceTransform({ bodyLatex: 'e^{2t}\\sin(3t)' });

    expect(sinh.exactLatex).toBe('\\frac{2}{s^{2}-4}');
    expect(cosh.exactLatex).toBe('\\frac{s}{s^{2}-4}');
    expect(shiftedSine.exactLatex).toBe('\\frac{3}{\\left(s-2\\right)^{2}+9}');
  });

  it('runs through the Calculus workspace engine with fixed t and s variables', async () => {
    const result = await runCalculusWorkspaceMode({
      screen: 'laplace',
      indefiniteIntegral: { bodyLatex: '' },
      definiteIntegral: { bodyLatex: '', lower: '0', upper: '1' },
      improperIntegral: { bodyLatex: '', lowerKind: 'finite', lower: '1', upperKind: 'posInfinity', upper: '' },
      finiteLimit: { bodyLatex: '', target: '0', direction: 'two-sided' },
      infiniteLimit: { bodyLatex: '', targetKind: 'posInfinity' },
      limit: { requestLatex: '' },
      maclaurin: { bodyLatex: '', kind: 'maclaurin', center: '0', order: 3 },
      taylor: { bodyLatex: '', kind: 'taylor', center: '0', order: 3 },
      laplace: { bodyLatex: 'a t' },
      partialDerivative: { bodyLatex: '', variable: 'x' },
      firstOrderOde: { lhsLatex: '', rhsLatex: '', classification: 'separable' },
      secondOrderOde: { a2: '1', a1: '0', a0: '1', forcingLatex: '0' },
      numericIvp: { bodyLatex: '', x0: '0', y0: '1', xEnd: '1', step: '0.1', method: 'rk4' },
      storedVariables: [
        { name: 'a', valueLatex: '4', numericValue: 4 },
        { name: 't', valueLatex: '9', numericValue: 9 },
      ],
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected success');
    }
    expect(result.title).toBe('Laplace Transform');
    expect(result.exactLatex).toBe('4\\left(\\frac{1}{s^{2}}\\right)');
    expect(result.variableSubstitutions).toEqual([
      { name: 'a', valueLatex: '4', numericValue: 4 },
    ]);
    expect(result.detailSections?.[1]).toEqual({
      title: 'Variable Policy',
      lines: ['Kept t symbolic as the Laplace source variable.'],
    });
  });

  it.each([
    ['symbolic frequency', '\\sin(a t)'],
    ['time shift', '\\sin(3t+1)'],
    ['product outside v1', 't\\sin(t)'],
    ['power over cap', 't^{13}'],
  ])('keeps unsupported table case controlled: %s', (_label, bodyLatex) => {
    const result = evaluateCalculusLaplaceTransform({ bodyLatex });

    expect(result.error).toBe('This Laplace transform is outside the supported Calculus table.');
  });
});
