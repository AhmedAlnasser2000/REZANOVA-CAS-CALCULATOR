import { describe, expect, it } from 'vitest';
import { historyEntrySchema } from './schemas';

describe('history entry schema', () => {
  it('accepts legacy history entries without calculus replay context', () => {
    const parsed = historyEntrySchema.parse({
      id: 'legacy-1',
      mode: 'calculate',
      inputLatex: '2+2',
      resultLatex: '4',
      timestamp: '2026-04-28T00:00:00.000Z',
    });

    expect(parsed.calculateScreen).toBeUndefined();
    expect(parsed.advancedCalcScreen).toBeUndefined();
  });

  it('accepts optional Equation selected-target replay context', () => {
    const parsed = historyEntrySchema.parse({
      id: 'equation-target-1',
      mode: 'equation',
      inputLatex: 'x+z=5',
      resultLatex: 'z=5-x',
      equationSolveTarget: 'z',
      timestamp: '2026-05-23T00:00:00.000Z',
    });

    expect(parsed.equationSolveTarget).toBe('z');
  });

  it('accepts optional Calculate stored-value substitution snapshots', () => {
    const parsed = historyEntrySchema.parse({
      id: 'calculate-vars-1',
      mode: 'calculate',
      inputLatex: 'a+1',
      resolvedInputLatex: '4+1',
      resultLatex: '5',
      variableSubstitutions: [
        { name: 'a', valueLatex: '4', numericValue: 4 },
      ],
      timestamp: '2026-05-24T00:00:00.000Z',
    });

    expect(parsed.variableSubstitutions).toEqual([
      { name: 'a', valueLatex: '4', numericValue: 4 },
    ]);
  });

  it('accepts typed Basic Calculus replay context', () => {
    const parsed = historyEntrySchema.parse({
      id: 'calc-limit-1',
      mode: 'calculate',
      inputLatex: '\\lim_{x\\to 0^-}\\frac{1}{x}',
      resultLatex: '-\\infty',
      calculateScreen: 'limit',
      calculateSeed: {
        bodyLatex: '\\frac{1}{x}',
        target: '0',
        direction: 'left',
        targetKind: 'finite',
      },
      timestamp: '2026-04-28T00:00:00.000Z',
    });

    expect(parsed.calculateScreen).toBe('limit');
    expect(parsed.calculateSeed?.direction).toBe('left');
  });

  it('accepts typed Calculus replay context', () => {
    const parsed = historyEntrySchema.parse({
      id: 'advanced-series-1',
      mode: 'advancedCalculus',
      inputLatex: '\\text{Maclaurin}_{5}\\left(\\sin(x)\\right)',
      resultLatex: 'x-\\frac{x^3}{6}+\\frac{x^5}{120}',
      advancedCalcScreen: 'maclaurin',
      advancedCalcSeed: {
        bodyLatex: '\\sin(x)',
        kind: 'maclaurin',
        center: '0',
        order: 5,
      },
      timestamp: '2026-04-28T00:00:00.000Z',
    });

    expect(parsed.advancedCalcScreen).toBe('maclaurin');
    expect(parsed.advancedCalcSeed?.order).toBe(5);
  });

  it.each([
    ['derivative', { bodyLatex: 'x^2' }],
    ['derivativePoint', { bodyLatex: 'x^2', point: '2' }],
    ['integral', { kind: 'definite', bodyLatex: '2x', lower: '0', upper: '1' }],
    ['limit', { bodyLatex: '\\frac{1}{x}', target: '0', direction: 'right', targetKind: 'finite' }],
  ] as const)('accepts typed Basic Calculus %s seeds', (calculateScreen, calculateSeed) => {
    const parsed = historyEntrySchema.parse({
      id: `calc-${calculateScreen}`,
      mode: 'calculate',
      inputLatex: 'x',
      calculateScreen,
      calculateSeed,
      timestamp: '2026-04-28T00:00:00.000Z',
    });

    expect(parsed.calculateScreen).toBe(calculateScreen);
    expect(parsed.calculateSeed).toMatchObject(calculateSeed);
  });

  it.each([
    ['indefiniteIntegral', { bodyLatex: '\\frac{1}{1+x^2}' }],
    ['definiteIntegral', { bodyLatex: '2x', lower: '0', upper: '1' }],
    ['improperIntegral', { bodyLatex: '\\frac{1}{x^2}', lowerKind: 'finite', lower: '1', upperKind: 'posInfinity' }],
    ['finiteLimit', { bodyLatex: '\\frac{1}{x}', target: '0', direction: 'left' }],
    ['infiniteLimit', { bodyLatex: '\\frac{2x}{x+1}', targetKind: 'posInfinity' }],
    ['maclaurin', { bodyLatex: '\\sin(x)', kind: 'maclaurin', center: '0', order: 5 }],
    ['taylor', { bodyLatex: '\\cos(x)', kind: 'taylor', center: '1', order: 4 }],
    ['partialDerivative', { bodyLatex: 'x^2y', variable: 'x' }],
    ['odeFirstOrder', { lhsLatex: '\\frac{dy}{dx}', rhsLatex: 'xy', classification: 'separable' }],
    ['odeSecondOrder', { a2: '1', a1: '0', a0: '1', forcingLatex: '0' }],
    ['odeNumericIvp', { rhsLatex: 'xy', x0: '0', y0: '1', xEnd: '1', step: '0.1', method: 'rk4' }],
  ] as const)('accepts typed Calculus %s seeds', (advancedCalcScreen, advancedCalcSeed) => {
    const parsed = historyEntrySchema.parse({
      id: `advanced-${advancedCalcScreen}`,
      mode: 'advancedCalculus',
      inputLatex: 'x',
      advancedCalcScreen,
      advancedCalcSeed,
      timestamp: '2026-04-28T00:00:00.000Z',
    });

    expect(parsed.advancedCalcScreen).toBe(advancedCalcScreen);
    expect(parsed.advancedCalcSeed).toMatchObject(advancedCalcSeed);
  });

  it('accepts typed Matrix replay seeds', () => {
    const parsed = historyEntrySchema.parse({
      id: 'matrix-seed-1',
      mode: 'matrix',
      inputLatex: 'A\\times B',
      resultLatex: '\\begin{bmatrix}19&22\\\\43&50\\end{bmatrix}',
      matrixSeed: {
        operation: 'multiply',
        matrixA: [[1, 2], [3, 4]],
        matrixB: [[5, 6], [7, 8]],
      },
      timestamp: '2026-06-08T00:00:00.000Z',
    });

    expect(parsed.matrixSeed).toEqual({
      operation: 'multiply',
      matrixA: [[1, 2], [3, 4]],
      matrixB: [[5, 6], [7, 8]],
    });
  });

  it('accepts typed Vector replay seeds', () => {
    const parsed = historyEntrySchema.parse({
      id: 'vector-seed-1',
      mode: 'vector',
      inputLatex: '\\angle(A,B)',
      resultLatex: '90^\\circ',
      vectorSeed: {
        operation: 'angle',
        vectorA: [1, 0, 0],
        vectorB: [0, 1, 0],
        angleUnit: 'deg',
      },
      timestamp: '2026-06-08T00:00:00.000Z',
    });

    expect(parsed.vectorSeed).toEqual({
      operation: 'angle',
      vectorA: [1, 0, 0],
      vectorB: [0, 1, 0],
      angleUnit: 'deg',
    });
  });

  it('accepts typed Trigonometry Period & Phase replay seeds', () => {
    const parsed = historyEntrySchema.parse({
      id: 'trig-period-phase-seed-1',
      mode: 'trigonometry',
      inputLatex: '2\\sin(3x-\\pi)+1',
      resultLatex: 'y=2\\sin(3(x-\\frac{\\pi}{3}))+1',
      trigScreen: 'periodPhase',
      trigSeed: {
        screen: 'periodPhase',
        request: {
          kind: 'periodPhase',
          expressionLatex: '2\\sin(3x-\\pi)+1',
          variable: 'x',
          angleUnit: 'deg',
        },
      },
      timestamp: '2026-06-08T00:00:00.000Z',
    });

    expect(parsed.trigScreen).toBe('periodPhase');
    expect(parsed.trigSeed).toEqual({
      screen: 'periodPhase',
      request: {
        kind: 'periodPhase',
        expressionLatex: '2\\sin(3x-\\pi)+1',
        variable: 'x',
        angleUnit: 'deg',
      },
    });
  });
});
