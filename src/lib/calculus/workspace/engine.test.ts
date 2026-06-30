import { describe, expect, it } from 'vitest';
import { runCalculusWorkspaceMode } from './engine';
import type { CalculusScreen } from '../../../types/calculator';

function makeRequest(screen: CalculusScreen, overrides = {}) {
  return {
    screen,
    indefiniteIntegral: { bodyLatex: '' },
    definiteIntegral: { bodyLatex: '', lower: '0', upper: '1' },
    improperIntegral: { bodyLatex: '', lowerKind: 'finite' as const, lower: '1', upperKind: 'posInfinity' as const, upper: '' },
    finiteLimit: { bodyLatex: '', target: '0', direction: 'two-sided' as const },
    infiniteLimit: { bodyLatex: '', targetKind: 'posInfinity' as const },
    maclaurin: { bodyLatex: '', kind: 'maclaurin' as const, center: '0', order: 3 },
    taylor: { bodyLatex: '', kind: 'taylor' as const, center: '0', order: 3 },
    laplace: { bodyLatex: '' },
    partialDerivative: { bodyLatex: '', variable: 'x' as const },
    firstOrderOde: { lhsLatex: '', rhsLatex: '', classification: 'separable' as const },
    secondOrderOde: { a2: '1', a1: '0', a0: '1', forcingLatex: '0' },
    numericIvp: { bodyLatex: '', x0: '0', y0: '1', xEnd: '1', step: '0.1', method: 'rk4' as const },
    ...overrides,
  };
}

describe('runCalculusWorkspaceMode stored values', () => {
  it('substitutes integral parameters without replacing the active variable', async () => {
    const result = await runCalculusWorkspaceMode(makeRequest('indefiniteIntegral', {
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

  it('substitutes explicit named integral parameters', async () => {
    const result = await runCalculusWorkspaceMode(makeRequest('indefiniteIntegral', {
      indefiniteIntegral: { bodyLatex: '@mass x' },
      storedVariables: [
        { name: 'mass', valueLatex: '4', numericValue: 4 },
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
      { name: 'mass', valueLatex: '4', numericValue: 4 },
    ]);
  });

  it('protects the selected partial derivative variable', async () => {
    const result = await runCalculusWorkspaceMode(makeRequest('partialDerivative', {
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

  it('runs unified derivative workflows through Calculus', async () => {
    const result = await runCalculusWorkspaceMode(makeRequest('derivative', {
      derivative: { bodyLatex: 't^2', variable: 't' },
    }));

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected success');
    }
    expect(result.exactLatex).toContain('2');
    expect(result.exactLatex).toContain('t');
  });

  it('evaluates higher-order ordinary derivatives from the parsed operator', async () => {
    const result = await runCalculusWorkspaceMode(makeRequest('derivative', {
      derivative: { bodyLatex: 't^5', variable: 't', operatorLatex: 'd^3/dt^3' },
    }));

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected success');
    }
    expect(result.exactLatex).toBe('60t^2');
    expect(result.calculusDerivativeStrategies).toEqual(['direct-rule']);
  });

  it('evaluates higher-order trigonometric derivatives with the selected variable', async () => {
    const result = await runCalculusWorkspaceMode(makeRequest('derivative', {
      derivative: { bodyLatex: '\\sin(t)', variable: 't', operatorLatex: 'd^2/dt^2' },
    }));

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected success');
    }
    expect(result.exactLatex).toBe('-\\sin(t)');
  });

  it('protects the higher-order derivative variable while substituting parameters', async () => {
    const result = await runCalculusWorkspaceMode(makeRequest('derivative', {
      derivative: { bodyLatex: 'a t^3+c t', variable: 't', operatorLatex: 'd^2/dt^2' },
      storedVariables: [
        { name: 'a', valueLatex: '2', numericValue: 2 },
        { name: 'c', valueLatex: '5', numericValue: 5 },
        { name: 't', valueLatex: '9', numericValue: 9 },
      ],
    }));

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected success');
    }
    expect(result.exactLatex).toBe('12t');
    expect(result.variableSubstitutions).toEqual([
      { name: 'a', valueLatex: '2', numericValue: 2 },
      { name: 'c', valueLatex: '5', numericValue: 5 },
    ]);
    expect(result.detailSections?.[1]).toEqual({
      title: 'Variable Policy',
      lines: ['Kept t symbolic as the derivative variable.'],
    });
  });

  it('runs unified derivative-at-point workflows through Calculus', async () => {
    const result = await runCalculusWorkspaceMode(makeRequest('derivativePoint', {
      derivativePoint: { bodyLatex: 'a t^2+c t', point: '3', variable: 't' },
      storedVariables: [
        { name: 'a', valueLatex: '4', numericValue: 4 },
        { name: 'c', valueLatex: '2', numericValue: 2 },
        { name: 't', valueLatex: '9', numericValue: 9 },
      ],
    }));

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected success');
    }
    expect(result.exactLatex).toContain('26');
  });

  it('evaluates higher-order derivative-at-point by symbolic differentiation then substitution', async () => {
    const result = await runCalculusWorkspaceMode(makeRequest('derivativePoint', {
      derivativePoint: { bodyLatex: 'x^3', point: '2', variable: 'x', operatorLatex: 'd^2/dx^2' },
    }));

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected success');
    }
    expect(result.exactLatex).toBe('12');
    expect(result.resultOrigin).toBe('symbolic-engine');
  });

  it('evaluates mixed partials from the parsed applied path', async () => {
    const result = await runCalculusWorkspaceMode(makeRequest('partialDerivative', {
      partialDerivative: {
        bodyLatex: 'x^3y^2+z',
        variable: 'x',
        operatorLatex: '\\frac{\\partial^3}{\\partial x\\partial y^2}',
      },
    }));

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected success');
    }
    expect(result.exactLatex).toBe('6x^2');
  });

  it('preserves compact written order while computing rightmost-first mixed partials', async () => {
    const result = await runCalculusWorkspaceMode(makeRequest('partialDerivative', {
      partialDerivative: {
        bodyLatex: '\\sin(xy)',
        variable: 'x',
        operatorLatex: '\\frac{\\partial^2}{\\partial x\\partial y}',
      },
    }));

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected success');
    }
    expect(result.exactLatex).toBe('\\cos(xy)-xy\\sin(xy)');
  });

  it('protects all mixed partial variables while substituting parameters', async () => {
    const result = await runCalculusWorkspaceMode(makeRequest('partialDerivative', {
      partialDerivative: {
        bodyLatex: 'a x^2y^2+b z',
        variable: 'x',
        operatorLatex: '\\frac{\\partial^2}{\\partial x\\partial y}',
      },
      storedVariables: [
        { name: 'a', valueLatex: '3', numericValue: 3 },
        { name: 'b', valueLatex: '9', numericValue: 9 },
        { name: 'x', valueLatex: '8', numericValue: 8 },
        { name: 'y', valueLatex: '7', numericValue: 7 },
        { name: 'z', valueLatex: '1', numericValue: 1 },
      ],
    }));

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected success');
    }
    expect(result.exactLatex).toBe('12xy');
    expect(result.variableSubstitutions).toEqual([
      { name: 'a', valueLatex: '3', numericValue: 3 },
      { name: 'b', valueLatex: '9', numericValue: 9 },
      { name: 'z', valueLatex: '1', numericValue: 1 },
    ]);
    expect(result.detailSections?.[1]).toEqual({
      title: 'Variable Policy',
      lines: [
        'Kept x symbolic as a partial derivative variable.',
        'Kept y symbolic as a partial derivative variable.',
      ],
    });
  });

  it('substitutes numeric IVP parameters while protecting ODE variables', async () => {
    const result = await runCalculusWorkspaceMode(makeRequest('odeNumericIvp', {
      numericIvp: {
        bodyLatex: 'a x+y',
        x0: '0',
        y0: '1',
        xEnd: '0.1',
        step: '0.1',
        method: 'rk4' as const,
      },
      storedVariables: [
        { name: 'a', valueLatex: '2', numericValue: 2 },
        { name: 'x', valueLatex: '9', numericValue: 9 },
        { name: 'y', valueLatex: '8', numericValue: 8 },
      ],
    }));

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected success');
    }
    expect(result.variableSubstitutions).toEqual([
      { name: 'a', valueLatex: '2', numericValue: 2 },
    ]);
    expect(result.detailSections?.[0]).toEqual({
      title: 'Stored Values',
      lines: ['Used stored values: a=2.'],
    });
    expect(result.detailSections?.[1]).toEqual({
      title: 'Variable Policy',
      lines: [
        'Kept x symbolic as the independent ODE variable.',
        'Kept y symbolic as the dependent ODE variable.',
      ],
    });
  });
});
