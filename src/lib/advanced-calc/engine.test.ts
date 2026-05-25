import { describe, expect, it } from 'vitest';
import { runAdvancedCalcMode } from './engine';
import type { AdvancedCalcScreen } from '../../types/calculator';

function makeRequest(screen: AdvancedCalcScreen, overrides = {}) {
  return {
    screen,
    indefiniteIntegral: { bodyLatex: '' },
    definiteIntegral: { bodyLatex: '', lower: '0', upper: '1' },
    improperIntegral: { bodyLatex: '', lowerKind: 'finite' as const, lower: '1', upperKind: 'posInfinity' as const, upper: '' },
    finiteLimit: { bodyLatex: '', target: '0', direction: 'two-sided' as const },
    infiniteLimit: { bodyLatex: '', targetKind: 'posInfinity' as const },
    maclaurin: { bodyLatex: '', kind: 'maclaurin' as const, center: '0', order: 3 },
    taylor: { bodyLatex: '', kind: 'taylor' as const, center: '0', order: 3 },
    partialDerivative: { bodyLatex: '', variable: 'x' as const },
    firstOrderOde: { lhsLatex: '', rhsLatex: '', classification: 'separable' as const },
    secondOrderOde: { a2: '1', a1: '0', a0: '1', forcingLatex: '0' },
    numericIvp: { bodyLatex: '', x0: '0', y0: '1', xEnd: '1', step: '0.1', method: 'rk4' as const },
    ...overrides,
  };
}

describe('runAdvancedCalcMode stored values', () => {
  it('substitutes integral parameters without replacing the active variable', async () => {
    const result = await runAdvancedCalcMode(makeRequest('indefiniteIntegral', {
      indefiniteIntegral: { bodyLatex: 'a x' },
      storedVariables: [
        { name: 'a', valueLatex: '4', numericValue: 4 },
        { name: 'x', valueLatex: '9', numericValue: 9 },
      ],
    }));

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected success');
    }
    expect(result.exactLatex).toContain('x^{2}');
    expect(result.exactLatex).not.toContain('9');
    expect(result.variableSubstitutions).toEqual([
      { name: 'a', valueLatex: '4', numericValue: 4 },
    ]);
    expect(result.detailSections?.[0]).toEqual({
      title: 'Stored Values',
      lines: ['Used stored values: a=4.'],
    });
    expect(result.detailSections?.[1]).toEqual({
      title: 'Variable Policy',
      lines: ['Kept x symbolic as the integration variable.'],
    });
  });

  it('protects the selected partial derivative variable', async () => {
    const result = await runAdvancedCalcMode(makeRequest('partialDerivative', {
      partialDerivative: { bodyLatex: 'a y+y^2', variable: 'y' },
      storedVariables: [
        { name: 'a', valueLatex: '4', numericValue: 4 },
        { name: 'y', valueLatex: '9', numericValue: 9 },
      ],
    }));

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected success');
    }
    expect(result.exactLatex).toContain('4');
    expect(result.exactLatex).toContain('y');
    expect(result.variableSubstitutions).toEqual([
      { name: 'a', valueLatex: '4', numericValue: 4 },
    ]);
    expect(result.detailSections?.[1]).toEqual({
      title: 'Variable Policy',
      lines: ['Kept y symbolic as the partial derivative variable.'],
    });
  });
});
