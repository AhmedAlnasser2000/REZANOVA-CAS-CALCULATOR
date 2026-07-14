import { describe, expect, it } from 'vitest';
import { requireCanonicalResultAuthority } from '../../result-contract';
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
    limit: { requestLatex: '' },
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
    expect(result.detailSections?.[0]).toMatchObject({
      title: 'Stored Values',
      lines: ['Used stored values: a=4.'],
    });
    expect(result.detailSections?.[1]).toMatchObject({
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
    expect(result.detailSections?.[1]).toMatchObject({
      title: 'Variable Policy',
      lines: ['Kept y symbolic as the partial derivative variable.'],
    });
  });

  it('evaluates natural limit requests and protects the parsed variable', async () => {
    const result = await runCalculusWorkspaceMode(makeRequest('limit', {
      limit: { requestLatex: '\\lim_{t\\to 0}\\frac{\\sin(t)}{t}' },
      storedVariables: [
        { name: 'a', valueLatex: '4', numericValue: 4 },
        { name: 't', valueLatex: '9', numericValue: 9 },
      ],
    }));

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected success');
    }
    expect(result.title).toBe('Limit');
    expect(result.exactLatex).toBe('1');
    expect(result.variableSubstitutions).toBeUndefined();
    expect(result.detailSections?.[0]).toMatchObject({
      title: 'Variable Policy',
      lines: ['Kept t symbolic as the limit variable.'],
    });
    expect(requireCanonicalResultAuthority(result, 'Calculus limit test').canonicalResult)
      .toBeDefined();
  });

  it('stops natural limit variable mismatches before stored-value substitution', async () => {
    const result = await runCalculusWorkspaceMode(makeRequest('limit', {
      limit: { requestLatex: 'lim x -> infinity (3t^2+1)/(2t^2-5)' },
      storedVariables: [
        { name: 't', valueLatex: '9', numericValue: 9 },
      ],
    }));

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected error');
    }
    expect(result.error).toContain('approaches x');
    expect(result.error).toContain('uses t');
    expect(result.error).toContain('\\lim_{t\\to \\infty}');
    expect(result.detailSections?.[0]?.title).toBe('Limit Variable Check');
    expect(requireCanonicalResultAuthority(result, 'Calculus stopped-limit test').canonicalResult)
      .toBeDefined();
  });

  it('threads complex domain intent into natural limit evaluation', async () => {
    const result = await runCalculusWorkspaceMode(makeRequest('limit', {
      limit: { requestLatex: '\\lim_{x\\to 0}\\left(\\sqrt{x^2+x}-x\\right)' },
      equationDomainIntent: 'complex',
    }));

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected success');
    }
    expect(result.exactLatex).toBe('0');
    expect(result.detailSections?.some((section) => section.title === 'Complex Domain')).toBe(true);
    expect(result.canonicalResult?.title).toBe('Limit');
  });

  it('builds native documents for guided finite and infinite Limit screens', async () => {
    const finite = await runCalculusWorkspaceMode(makeRequest('finiteLimit', {
      finiteLimit: { bodyLatex: '1/x', target: '0', direction: 'left' },
    }));
    const infinite = await runCalculusWorkspaceMode(makeRequest('infiniteLimit', {
      infiniteLimit: { bodyLatex: '1/x', targetKind: 'posInfinity' },
    }));

    expect(finite.kind === 'prompt' ? undefined : finite.canonicalResult?.title)
      .toBe('Finite Limit');
    expect(infinite.kind === 'prompt' ? undefined : infinite.canonicalResult?.title)
      .toBe('Infinite Limit');
    if (finite.kind === 'prompt' || infinite.kind === 'prompt') {
      throw new Error('Limit workspace requests must return results, not prompts.');
    }
    expect(requireCanonicalResultAuthority(finite, 'Finite Limit test').canonicalResult).toBeDefined();
    expect(requireCanonicalResultAuthority(infinite, 'Infinite Limit test').canonicalResult).toBeDefined();
  });

  it('builds native documents for Symbolic Integration owner screens', async () => {
    const cases: Array<{
      screen: CalculusScreen;
      overrides: Record<string, unknown>;
      title: string;
    }> = [
      {
        screen: 'indefiniteIntegral',
        overrides: { indefiniteIntegral: { bodyLatex: 'x' } },
        title: 'Indefinite Integral',
      },
      {
        screen: 'definiteIntegral',
        overrides: { definiteIntegral: { bodyLatex: '2x', lower: '0', upper: '1' } },
        title: 'Definite Integral',
      },
      {
        screen: 'improperIntegral',
        overrides: {
          improperIntegral: {
            bodyLatex: '1/(1+x^2)',
            lowerKind: 'finite',
            lower: '0',
            upperKind: 'posInfinity',
            upper: '',
          },
        },
        title: 'Improper Integral',
      },
      {
        screen: 'laplace',
        overrides: { laplace: { bodyLatex: '1' } },
        title: 'Laplace Transform',
      },
      {
        screen: 'partialDerivative',
        overrides: { partialDerivative: { bodyLatex: 'x^2 y', variable: 'x' } },
        title: 'Partial Derivative',
      },
    ];

    for (const entry of cases) {
      const result = await runCalculusWorkspaceMode(makeRequest(entry.screen, entry.overrides));
      expect(result.title, entry.screen).toBe(entry.title);
      expect(result.kind, entry.screen).not.toBe('prompt');
      if (result.kind === 'prompt') {
        throw new Error(`${entry.screen} must return a result, not a prompt.`);
      }
      expect(requireCanonicalResultAuthority(result, `${entry.screen} test`).canonicalResult, entry.screen)
        .toBeDefined();
    }
  });

  it('builds native documents for every remaining Calculus result screen', async () => {
    const cases: Array<{
      screen: CalculusScreen;
      overrides: Record<string, unknown>;
      title: string;
    }> = [
      {
        screen: 'derivative',
        overrides: { derivative: { bodyLatex: 'x^2', variable: 'x' } },
        title: 'Derivative',
      },
      {
        screen: 'derivativePoint',
        overrides: { derivativePoint: { bodyLatex: 'x^2', point: '2', variable: 'x' } },
        title: 'Derivative',
      },
      {
        screen: 'implicitDerivative',
        overrides: {
          implicitDerivative: {
            relationLatex: 'x^2+y^2=1',
            independentVariable: 'x',
            dependentVariable: 'y',
          },
        },
        title: 'Implicit Derivative',
      },
      {
        screen: 'maclaurin',
        overrides: { maclaurin: { bodyLatex: 'e^x', kind: 'maclaurin', center: '0', order: 4 } },
        title: 'Maclaurin Series',
      },
      {
        screen: 'taylor',
        overrides: { taylor: { bodyLatex: 'e^x', kind: 'taylor', center: '1', order: 3 } },
        title: 'Taylor Series',
      },
      {
        screen: 'odeFirstOrder',
        overrides: {
          firstOrderOde: {
            lhsLatex: '\\frac{dy}{dx}',
            rhsLatex: 'xy',
            classification: 'separable',
          },
        },
        title: 'First-Order ODE',
      },
      {
        screen: 'odeSecondOrder',
        overrides: { secondOrderOde: { a2: '1', a1: '0', a0: '1', forcingLatex: '0' } },
        title: 'Second-Order ODE',
      },
      {
        screen: 'odeNumericIvp',
        overrides: {
          numericIvp: {
            bodyLatex: 'y',
            x0: '0',
            y0: '1',
            xEnd: '0.1',
            step: '0.1',
            method: 'rk4',
          },
        },
        title: 'Numeric IVP',
      },
    ];

    for (const entry of cases) {
      const result = await runCalculusWorkspaceMode(makeRequest(entry.screen, entry.overrides));
      expect(result.title, entry.screen).toBe(entry.title);
      expect(result.kind, entry.screen).not.toBe('prompt');
      if (result.kind === 'prompt') {
        throw new Error(`${entry.screen} must return a result, not a prompt.`);
      }
      expect(requireCanonicalResultAuthority(result, `${entry.screen} test`).canonicalResult, entry.screen)
        .toBeDefined();
    }
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
    expect(requireCanonicalResultAuthority(result, 'Calculus derivative test').canonicalResult)
      .toBeDefined();
    const steps = result.detailSections?.find((section) => section.title === 'Derivative Steps');
    expect(steps?.lineKind).toBe('math');
    expect(steps?.lines).toContain('\\operatorname{operator}\\quad \\frac{d}{dt}');
    expect(steps?.lines).toContain('\\operatorname{applied}\\quad t');
    expect(steps?.lines).toContain('D_{1}=2t');
  });

  it('evaluates higher-order ordinary derivatives from the parsed operator', async () => {
    const result = await runCalculusWorkspaceMode(makeRequest('derivative', {
      derivative: { bodyLatex: 'd^3/dt^3(t^5)', variable: 'x' },
    }));

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected success');
    }
    expect(result.exactLatex).toBe('60t^2');
    expect(result.calculusDerivativeStrategies).toEqual(['direct-rule']);
    const steps = result.detailSections?.find((section) => section.title === 'Derivative Steps');
    expect(steps?.lines).toContain('D_{1}=5t^4');
    expect(steps?.lines).toContain('D_{2}=20t^3');
    expect(steps?.lines).toContain('D_{3}=60t^2');
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

  it('normalizes higher-order derivative output and step lines', async () => {
    const result = await runCalculusWorkspaceMode(makeRequest('derivative', {
      derivative: { bodyLatex: 'd^4/dt^4(\\sin(t^2)+a*t)', variable: 't' },
    }));

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected success');
    }
    expect(result.exactLatex).toBe('16\\sin(t^2)t^4-48\\cos(t^2)t^2-12\\sin(t^2)');
    expect(result.exactLatex).not.toContain('tt');
    expect(result.exactLatex).not.toContain('\\times');
    const steps = result.detailSections?.find((section) => section.title === 'Derivative Steps');
    expect(steps?.lines).toContain('D_{2}=2\\cos(t^2)-4\\sin(t^2)t^2');
    expect(steps?.lines).toContain('D_{3}=-8\\cos(t^2)t^3-12t\\sin(t^2)');
    expect(steps?.lines).toContain('D_{4}=16\\sin(t^2)t^4-48\\cos(t^2)t^2-12\\sin(t^2)');
    expect(steps?.lines.join('\\n')).not.toContain('tt');
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
    expect(result.detailSections?.[1]).toMatchObject({
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
      derivativePoint: { bodyLatex: 'd^2/dx^2(x^3)', point: '2', variable: 'x' },
    }));

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected success');
    }
    expect(result.exactLatex).toBe('12');
    expect(result.resultOrigin).toBe('symbolic-engine');
    const steps = result.detailSections?.find((section) => section.title === 'Derivative Steps');
    expect(steps?.lines).toContain('D_{1}=3x^2');
    expect(steps?.lines).toContain('D_{2}=6x');
    expect(steps?.lines).toContain('D_{2}\\big|_{x=2}=12');
  });

  it('evaluates mixed partials from the parsed applied path', async () => {
    const result = await runCalculusWorkspaceMode(makeRequest('partialDerivative', {
      partialDerivative: {
        bodyLatex: '\\frac{\\partial^3}{\\partial x\\partial y^2}\\left(x^3y^2+z\\right)',
        variable: 'x',
      },
    }));

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected success');
    }
    expect(result.exactLatex).toBe('6x^2');
    const steps = result.detailSections?.find((section) => section.title === 'Derivative Steps');
    expect(steps?.lines).toContain('\\operatorname{applied}\\quad y\\to y\\to x');
    expect(steps?.lines).toContain('D_{3}=6x^2');
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
    expect(result.detailSections?.[1]).toMatchObject({
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
    expect(result.detailSections?.[0]).toMatchObject({
      title: 'Stored Values',
      lines: ['Used stored values: a=2.'],
    });
    expect(result.detailSections?.[1]).toMatchObject({
      title: 'Variable Policy',
      lines: [
        'Kept x symbolic as the independent ODE variable.',
        'Kept y symbolic as the dependent ODE variable.',
      ],
    });
  });
});
