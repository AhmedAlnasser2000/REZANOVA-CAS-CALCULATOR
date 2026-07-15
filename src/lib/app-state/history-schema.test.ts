import { describe, expect, it } from 'vitest';
import { historyEntrySchema } from './schemas';
import { historyResultDocument } from '../../test-utils/history-result-document';

function parseHistoryEntry(input: Record<string, unknown>) {
  const resultLatex = input.resultLatex;
  const current = { ...input };
  for (const key of [
    'resolvedInputLatex',
    'resultLatex',
    'exactSupplementLatex',
    'approxText',
    'detailSections',
    'systemReadback',
    'answerDomain',
    'solutionKind',
    'variableSubstitutions',
    'resultDocumentOmissionReason',
  ]) {
    delete current[key];
  }
  return historyEntrySchema.parse({
    ...current,
    resultDocument: input.resultDocument
      ?? historyResultDocument(typeof resultLatex === 'string' ? resultLatex : '1'),
  });
}

function scalarWire(canonicalLatex: string, mathJson: unknown) {
  return { version: 1 as const, canonicalLatex, mathJson };
}

describe('history entry schema', () => {
  it('requires a canonical V1 result document', () => {
    expect(() => historyEntrySchema.parse({
      id: 'legacy-1',
      mode: 'calculate',
      inputLatex: '2+2',
      resultLatex: '4',
      timestamp: '2026-04-28T00:00:00.000Z',
    })).toThrow();
  });

  it('accepts a complete versioned deterministic replay snapshot', () => {
    const parsed = parseHistoryEntry({
      id: 'versioned-replay-1',
      mode: 'calculate',
      inputLatex: 'arcsin(1)',
      resultLatex: '\\frac{\\pi}{2}',
      replaySnapshot: {
        version: 1,
        ansLatex: '0',
        angleUnit: 'rad',
        outputStyle: 'exact',
        equationAnswerMode: 'exact',
        equationDomainIntent: 'real',
        complexExactForm: 'rectangular',
        mathNotationDisplay: 'rendered',
        historyInspectorNotationMode: 'rendered',
        historyPageNotationMode: 'latex',
        symbolicDisplayMode: 'auto',
        flattenNestedRootsWhenSafe: true,
        approxDigits: 10,
        numericNotationMode: 'decimal',
        scientificNotationStyle: 'times10',
        detailedFactsEnabled: true,
      },
      timestamp: '2026-07-11T00:00:00.000Z',
    });

    expect(parsed.replaySnapshot?.version).toBe(1);
    expect(parsed.replaySnapshot?.angleUnit).toBe('rad');
  });

  it('accepts optional Equation selected-target replay context', () => {
    const parsed = parseHistoryEntry({
      id: 'equation-target-1',
      mode: 'equation',
      inputLatex: 'x+z=5',
      resultLatex: 'z=5-x',
      equationSolveTarget: 'z',
      timestamp: '2026-05-23T00:00:00.000Z',
    });

    expect(parsed.equationSolveTarget).toBe('z');
  });

  it('accepts optional runtime elapsed milliseconds', () => {
    const parsed = parseHistoryEntry({
      id: 'runtime-elapsed-1',
      mode: 'equation',
      inputLatex: 'x+1=2',
      resultLatex: 'x=1',
      runtimeElapsedMs: 42,
      timestamp: '2026-06-18T00:00:00.000Z',
    });

    expect(parsed.runtimeElapsedMs).toBe(42);
  });

  it('accepts canonical stored-value substitution snapshots', () => {
    const parsed = parseHistoryEntry({
      id: 'calculate-vars-1',
      mode: 'calculate',
      inputLatex: 'a+1',
      resolvedInputLatex: '4+1',
      resultLatex: '5',
      resultDocument: historyResultDocument('5', {
        metadata: {
          resolvedInput: { canonicalLatex: '4+1' },
          variableSubstitutions: [
            { name: 'a', value: { canonicalLatex: '4' }, numericValue: 4 },
          ],
        },
      }),
      timestamp: '2026-05-24T00:00:00.000Z',
    });

    expect(parsed.resultDocument.metadata?.variableSubstitutions).toEqual([
      { name: 'a', value: { canonicalLatex: '4' }, numericValue: 4 },
    ]);
  });

  it('accepts canonical typed detail sections for history replay cards', () => {
    const parsed = parseHistoryEntry({
      id: 'matrix-history-cards-1',
      mode: 'matrix',
      inputLatex: '\\operatorname{coords}(A,b)',
      resultLatex: 'c=\\begin{bmatrix}1\\\\2\\end{bmatrix}',
      resultDocument: historyResultDocument('c=\\begin{bmatrix}1\\\\2\\end{bmatrix}', {
        overrides: {
          details: [{
            title: 'Coordinate Proof',
            lines: [
              [{ kind: 'math', math: { canonicalLatex: 'A c=b' } }],
              [
                { kind: 'text', text: 'Therefore ' },
                { kind: 'math', math: { canonicalLatex: 'c=\\begin{bmatrix}1\\\\2\\end{bmatrix}' } },
              ],
            ],
          }],
        },
      }),
      timestamp: '2026-07-03T00:00:00.000Z',
    });

    expect(parsed.resultDocument.details?.[0]).toMatchObject({
      title: 'Coordinate Proof',
    });
  });

  it('accepts typed Basic Calculus replay context', () => {
    const parsed = parseHistoryEntry({
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
    const parsed = parseHistoryEntry({
      id: 'calculus-series-1',
      mode: 'calculus',
      inputLatex: '\\text{Maclaurin}_{5}\\left(\\sin(x)\\right)',
      resultLatex: 'x-\\frac{x^3}{6}+\\frac{x^5}{120}',
      calculusScreen: 'maclaurin',
      calculusSeed: {
        bodyLatex: '\\sin(x)',
        kind: 'maclaurin',
        center: '0',
        order: 5,
      },
      timestamp: '2026-04-28T00:00:00.000Z',
    });

    expect(parsed.calculusScreen).toBe('maclaurin');
    expect(parsed.calculusSeed?.order).toBe(5);
  });

  it('rejects retired Calculus replay compatibility records', () => {
    const retiredPrefix = ['advan', 'ced'].join('');
    const retiredMode = `${retiredPrefix}${'Calculus'}`;
    const retiredScreenField = `${retiredPrefix}${'Calc'}Screen`;
    const retiredSeedField = `${retiredPrefix}${'Calc'}Seed`;

    expect(() =>
      parseHistoryEntry({
        id: 'retired-calculus-series-1',
        mode: retiredMode,
        inputLatex: '\\text{Maclaurin}_{5}\\left(\\sin(x)\\right)',
        resultLatex: 'x-\\frac{x^3}{6}+\\frac{x^5}{120}',
        [retiredScreenField]: 'maclaurin',
        [retiredSeedField]: {
          bodyLatex: '\\sin(x)',
          kind: 'maclaurin',
          center: '0',
          order: 5,
        },
        timestamp: '2026-04-28T00:00:00.000Z',
      }),
    ).toThrow();
  });

  it.each([
    ['derivative', { bodyLatex: 'x^2' }],
    ['derivativePoint', { bodyLatex: 'x^2', point: '2' }],
    ['integral', { kind: 'definite', bodyLatex: '2x', lower: '0', upper: '1' }],
    ['limit', { bodyLatex: '\\frac{1}{x}', target: '0', direction: 'right', targetKind: 'finite' }],
  ] as const)('accepts typed Basic Calculus %s seeds', (calculateScreen, calculateSeed) => {
    const parsed = parseHistoryEntry({
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
    ['derivative', { bodyLatex: '\\frac{d}{dt}\\left(t^2\\right)' }],
    ['derivativePoint', { bodyLatex: '\\frac{d}{d\\theta}\\left(\\theta^2\\right)', point: '3' }],
    ['limit', { requestLatex: '\\lim_{x\\to 0}\\frac{\\sin(x)}{x}' }],
    ['finiteLimit', { bodyLatex: '\\frac{1}{x}', target: '0', direction: 'left' }],
    ['infiniteLimit', { bodyLatex: '\\frac{2x}{x+1}', targetKind: 'posInfinity' }],
    ['maclaurin', { bodyLatex: '\\sin(x)', kind: 'maclaurin', center: '0', order: 5 }],
    ['taylor', { bodyLatex: '\\cos(x)', kind: 'taylor', center: '1', order: 4 }],
    ['laplace', { bodyLatex: 't^2' }],
    ['partialDerivative', { bodyLatex: '\\frac{\\partial}{\\partial \\theta}\\left(\\theta^2+x\\theta\\right)' }],
    ['implicitDerivative', { relationLatex: 'x^2+y^2=25', independentVariable: 'x', dependentVariable: 'y' }],
    ['odeFirstOrder', { lhsLatex: '\\frac{dy}{dx}', rhsLatex: 'xy', classification: 'separable' }],
    ['odeSecondOrder', { a2: '1', a1: '0', a0: '1', forcingLatex: '0' }],
    ['odeNumericIvp', { rhsLatex: 'xy', x0: '0', y0: '1', xEnd: '1', step: '0.1', method: 'rk4' }],
  ] as const)('accepts typed Calculus %s seeds', (calculusScreen, calculusSeed) => {
    const parsed = parseHistoryEntry({
      id: `calculus-${calculusScreen}`,
      mode: 'calculus',
      inputLatex: 'x',
      calculusScreen,
      calculusSeed,
      timestamp: '2026-04-28T00:00:00.000Z',
    });

    expect(parsed.calculusScreen).toBe(calculusScreen);
    expect(parsed.calculusSeed).toMatchObject(calculusSeed);
  });

  it('accepts natural Calculus derivative request seeds and still validates optional side variables', () => {
    const parsed = parseHistoryEntry({
      id: 'calculus-derivative-target-canonical',
      mode: 'calculus',
      inputLatex: '\\frac{d}{d\\theta}\\left(\\theta^2\\right)',
      calculusScreen: 'derivative',
      calculusSeed: {
        bodyLatex: '\\frac{d}{d\\theta}\\left(\\theta^2\\right)',
      },
      timestamp: '2026-06-29T00:00:00.000Z',
    });

    expect(parsed.calculusSeed?.bodyLatex).toBe('\\frac{d}{d\\theta}\\left(\\theta^2\\right)');
    expect(() =>
      parseHistoryEntry({
        id: 'calculus-derivative-target-invalid',
        mode: 'calculus',
        inputLatex: '\\frac{d}{dxy}\\left(xy\\right)',
        calculusScreen: 'derivative',
        calculusSeed: {
          bodyLatex: 'xy',
          variable: 'xy',
        },
        timestamp: '2026-06-29T00:00:00.000Z',
      }),
    ).toThrow();
  });

  it('accepts natural higher-order Calculus derivative request seeds for replay', () => {
    const parsed = parseHistoryEntry({
      id: 'calculus-derivative-operator-seed',
      mode: 'calculus',
      inputLatex: '\\frac{d^{3}}{dt^{3}}\\left(t^5\\right)',
      calculusScreen: 'derivative',
      calculusSeed: {
        bodyLatex: '\\frac{d^{3}}{dt^{3}}\\left(t^5\\right)',
      },
      timestamp: '2026-06-30T00:00:00.000Z',
    });

    expect(parsed.calculusSeed).toMatchObject({
      bodyLatex: '\\frac{d^{3}}{dt^{3}}\\left(t^5\\right)',
    });
    expect(parsed.calculusSeed?.operatorLatex).toBeUndefined();
  });

  it('canonicalizes and validates Calculus implicit derivative variables in seeds', () => {
    const parsed = parseHistoryEntry({
      id: 'calculus-implicit-derivative-seed',
      mode: 'calculus',
      inputLatex: '\\operatorname{implicitD}_{\\theta,t}\\left(t^2+\\theta^2=1\\right)',
      calculusScreen: 'implicitDerivative',
      calculusSeed: {
        relationLatex: 't^2+\\theta^2=1',
        independentVariable: 't',
        dependentVariable: '\\theta',
      },
      timestamp: '2026-06-30T00:00:00.000Z',
    });

    expect(parsed.calculusSeed).toMatchObject({
      relationLatex: 't^2+\\theta^2=1',
      independentVariable: 't',
      dependentVariable: 'theta',
    });
    expect(() =>
      parseHistoryEntry({
        id: 'calculus-implicit-derivative-invalid',
        mode: 'calculus',
        inputLatex: 'x^2+y^2=1',
        calculusScreen: 'implicitDerivative',
        calculusSeed: {
          relationLatex: 'x^2+y^2=1',
          independentVariable: 'xy',
          dependentVariable: 'y',
        },
        timestamp: '2026-06-30T00:00:00.000Z',
      }),
    ).toThrow();
  });

  it('accepts typed Matrix replay seeds', () => {
    const parsed = parseHistoryEntry({
      id: 'matrix-seed-1',
      mode: 'matrix',
      inputLatex: 'A\\times B',
      resultLatex: '\\begin{bmatrix}19&22\\\\43&50\\end{bmatrix}',
      matrixSeed: {
        operation: 'multiply',
        matrixA: [[1, 2], [3, 4]],
        matrixB: [[5, 6], [7, 8]],
        approxDigits: 9,
        editorExpressionLatex: 'A\\times B',
        matrixOperandLatexA: 'A',
        matrixOperandLatexB: 'B',
        matrixValues: [
          { id: 'matrix-a', name: 'A', value: [[1, 2], [3, 4]] },
          { id: 'matrix-b', name: 'B', value: [[5, 6], [7, 8]] },
        ],
        activeMatrixLeftId: 'matrix-a',
        activeMatrixRightId: 'matrix-b',
      },
      timestamp: '2026-06-08T00:00:00.000Z',
    });

    expect(parsed.matrixSeed).toEqual({
      operation: 'multiply',
      matrixA: [[1, 2], [3, 4]],
      matrixB: [[5, 6], [7, 8]],
      approxDigits: 9,
      editorExpressionLatex: 'A\\times B',
      matrixOperandLatexA: 'A',
      matrixOperandLatexB: 'B',
      matrixValues: [
        { id: 'matrix-a', name: 'A', value: [[1, 2], [3, 4]] },
        { id: 'matrix-b', name: 'B', value: [[5, 6], [7, 8]] },
      ],
      activeMatrixLeftId: 'matrix-a',
      activeMatrixRightId: 'matrix-b',
    });

    expect(parseHistoryEntry({
      id: 'matrix-seed-definite',
      mode: 'matrix',
      inputLatex: '\\operatorname{definite}\\left(A\\right)',
      resultLatex: '\\operatorname{definite}(A)=\\text{Positive definite}',
      matrixSeed: {
        operation: 'definiteA',
        matrixA: [[2, -1], [-1, 2]],
        matrixB: [[1, 0], [0, 1]],
      },
      timestamp: '2026-07-15T00:00:00.000Z',
    }).matrixSeed?.operation).toBe('definiteA');

    expect(parseHistoryEntry({
      id: 'matrix-seed-pinv',
      mode: 'matrix',
      inputLatex: '\\operatorname{pinv}\\left(A\\right)',
      resultLatex: '\\operatorname{pinv}\\left(A\\right)\\approx \\begin{bmatrix}0.12&0.16\\\\0&0\\end{bmatrix}',
      matrixSeed: {
        operation: 'pinvA',
        matrixA: [[3, 0], [4, 0]],
        matrixB: [[1, 0], [0, 1]],
        approxDigits: 6,
      },
      timestamp: '2026-07-15T00:00:00.000Z',
    }).matrixSeed?.operation).toBe('pinvA');

    expect(parseHistoryEntry({
      id: 'matrix-seed-rref',
      mode: 'matrix',
      inputLatex: '\\operatorname{rref}\\left(A\\right)',
      resultLatex: '\\begin{bmatrix}1&2\\\\0&0\\end{bmatrix}',
      matrixSeed: {
        operation: 'rrefA',
        matrixA: [[1, 2], [2, 4]],
        matrixB: [[5, 6], [7, 8]],
      },
      timestamp: '2026-06-08T00:00:00.000Z',
    }).matrixSeed?.operation).toBe('rrefA');

    expect(parseHistoryEntry({
      id: 'matrix-seed-invertible',
      mode: 'matrix',
      inputLatex: '\\operatorname{invertible}\\left(A\\right)',
      resultLatex: '\\operatorname{invertible}(A)=\\text{Yes}',
      matrixSeed: {
        operation: 'invertibilityA',
        matrixA: [[1, 2], [3, 4]],
        matrixB: [[5, 6], [7, 8]],
      },
      timestamp: '2026-06-08T00:00:00.000Z',
    }).matrixSeed?.operation).toBe('invertibilityA');

    expect(parseHistoryEntry({
      id: 'matrix-seed-basis',
      mode: 'matrix',
      inputLatex: '\\operatorname{basis}\\left(A\\right)',
      resultLatex: '\\operatorname{basis}(A)=\\text{Yes}',
      matrixSeed: {
        operation: 'basisA',
        matrixA: [[1, 2], [3, 4]],
        matrixB: [[5, 6], [7, 8]],
      },
      timestamp: '2026-06-08T00:00:00.000Z',
    }).matrixSeed?.operation).toBe('basisA');

    expect(parseHistoryEntry({
      id: 'matrix-seed-coordinates',
      mode: 'matrix',
      inputLatex: '\\operatorname{coords}\\left(A,\\begin{bmatrix}5\\\\11\\end{bmatrix}\\right)',
      resultLatex: '[\\begin{bmatrix}5\\\\11\\end{bmatrix}]_{A}=\\begin{bmatrix}1\\\\2\\end{bmatrix}',
      matrixSeed: {
        operation: 'coordinatesA',
        matrixA: [[1, 2], [3, 4]],
        matrixB: [[5, 6], [7, 8]],
        coordinateVector: [5, 11],
        exactCoordinateVector: [
          { numerator: 5, denominator: 1 },
          { numerator: 11, denominator: 1 },
        ],
        editorExpressionLatex: '\\operatorname{coords}\\left(A,\\begin{bmatrix}5\\\\11\\end{bmatrix}\\right)',
        matrixOperandLatexA: 'A',
        coordinateVectorLatex: '\\begin{bmatrix}5\\\\11\\end{bmatrix}',
      },
      timestamp: '2026-06-08T00:00:00.000Z',
    }).matrixSeed?.coordinateVector).toEqual([5, 11]);

    expect(parseHistoryEntry({
      id: 'matrix-seed-change-basis',
      mode: 'matrix',
      inputLatex: '\\operatorname{change}\\left(A,B\\right)',
      resultLatex: 'P_{B\\leftarrow A}=\\begin{bmatrix}1 & -1\\\\0 & 1\\end{bmatrix}',
      matrixSeed: {
        operation: 'changeBasis',
        matrixA: [[1, 0], [0, 1]],
        matrixB: [[1, 1], [0, 1]],
        editorExpressionLatex: '\\operatorname{change}\\left(A,B\\right)',
        matrixOperandLatexA: 'A',
        matrixOperandLatexB: 'B',
      },
      timestamp: '2026-06-08T00:00:00.000Z',
    }).matrixSeed?.operation).toBe('changeBasis');

    expect(parseHistoryEntry({
      id: 'matrix-seed-lu',
      mode: 'matrix',
      inputLatex: '\\operatorname{lu}\\left(A\\right)',
      resultLatex: 'A=LU',
      matrixSeed: {
        operation: 'luA',
        matrixA: [[2, 1], [4, 3]],
        matrixB: [[5, 6], [7, 8]],
        editorExpressionLatex: '\\operatorname{lu}\\left(A\\right)',
        matrixOperandLatexA: 'A',
      },
      timestamp: '2026-06-08T00:00:00.000Z',
    }).matrixSeed?.operation).toBe('luA');

    expect(parseHistoryEntry({
      id: 'matrix-seed-plu',
      mode: 'matrix',
      inputLatex: '\\operatorname{plu}\\left(A\\right)',
      resultLatex: 'PA=LU',
      matrixSeed: {
        operation: 'pluA',
        matrixA: [[0, 1], [1, 0]],
        matrixB: [[5, 6], [7, 8]],
        editorExpressionLatex: '\\operatorname{plu}\\left(A\\right)',
        matrixOperandLatexA: 'A',
      },
      timestamp: '2026-06-08T00:00:00.000Z',
    }).matrixSeed?.operation).toBe('pluA');

    expect(parseHistoryEntry({
      id: 'matrix-seed-lu-solve',
      mode: 'matrix',
      inputLatex: '\\operatorname{lusolve}\\left(A,\\begin{bmatrix}5\\\\11\\end{bmatrix}\\right)',
      resultLatex: 'x=\\begin{bmatrix}2\\\\1\\end{bmatrix}',
      matrixSeed: {
        operation: 'luSolveA',
        matrixA: [[2, 1], [4, 3]],
        matrixB: [[5, 6], [7, 8]],
        systemRhs: [5, 11],
        exactSystemRhs: [
          { numerator: 5, denominator: 1 },
          { numerator: 11, denominator: 1 },
        ],
        editorExpressionLatex: '\\operatorname{lusolve}\\left(A,\\begin{bmatrix}5\\\\11\\end{bmatrix}\\right)',
        matrixOperandLatexA: 'A',
        systemRhsLatex: '\\begin{bmatrix}5\\\\11\\end{bmatrix}',
      },
      timestamp: '2026-06-08T00:00:00.000Z',
    }).matrixSeed?.systemRhs).toEqual([5, 11]);

    expect(parseHistoryEntry({
      id: 'matrix-seed-multi-rhs',
      mode: 'matrix',
      inputLatex: 'A X = B',
      resultLatex: 'X=\\begin{bmatrix}1 & 2\\\\2 & 2\\end{bmatrix}',
      matrixSeed: {
        operation: 'multiRhsSolve',
        matrixA: [[1, 2], [3, 4]],
        matrixB: [[5, 6], [11, 14]],
        editorExpressionLatex: 'A X = B',
        matrixOperandLatexA: 'A',
        matrixOperandLatexB: 'B',
      },
      timestamp: '2026-06-08T00:00:00.000Z',
    }).matrixSeed?.operation).toBe('multiRhsSolve');

    expect(parseHistoryEntry({
      id: 'matrix-seed-qr',
      mode: 'matrix',
      inputLatex: '\\operatorname{qr}\\left(A\\right)',
      resultLatex: 'A=QR',
      matrixSeed: {
        operation: 'qrA',
        matrixA: [[3, 0], [4, 5]],
        matrixB: [[5, 6], [7, 8]],
      },
      timestamp: '2026-06-08T00:00:00.000Z',
    }).matrixSeed?.operation).toBe('qrA');

    expect(parseHistoryEntry({
      id: 'matrix-seed-column-projection',
      mode: 'matrix',
      inputLatex: '\\operatorname{projcol}\\left(A,\\begin{bmatrix}2\\\\3\\\\4\\end{bmatrix}\\right)',
      resultLatex: '\\operatorname{proj}_{\\operatorname{Col}(A)}(b)',
      matrixSeed: {
        operation: 'columnProjectionA',
        matrixA: [[1, 0], [0, 1], [0, 0]],
        matrixB: [[5, 6], [7, 8]],
        systemRhs: [2, 3, 4],
      },
      timestamp: '2026-06-08T00:00:00.000Z',
    }).matrixSeed?.operation).toBe('columnProjectionA');

    expect(parseHistoryEntry({
      id: 'matrix-seed-least-squares',
      mode: 'matrix',
      inputLatex: '\\operatorname{ls}\\left(A,\\begin{bmatrix}2\\\\3\\\\4\\end{bmatrix}\\right)',
      resultLatex: 'x_{\\mathrm{LS}}=\\begin{bmatrix}2\\\\3\\end{bmatrix}',
      matrixSeed: {
        operation: 'leastSquaresA',
        matrixA: [[1, 0], [0, 1], [0, 0]],
        matrixB: [[5, 6], [7, 8]],
        systemRhs: [2, 3, 4],
      },
      timestamp: '2026-06-08T00:00:00.000Z',
    }).matrixSeed?.operation).toBe('leastSquaresA');

    expect(parseHistoryEntry({
      id: 'matrix-seed-eigen',
      mode: 'matrix',
      inputLatex: '\\operatorname{eigen}\\left(A\\right)',
      resultLatex: '\\operatorname{eigen}(A)',
      matrixSeed: {
        operation: 'eigenA',
        matrixA: [[2, 1], [1, 2]],
        matrixB: [[5, 6], [7, 8]],
      },
      timestamp: '2026-06-08T00:00:00.000Z',
    }).matrixSeed?.operation).toBe('eigenA');

    expect(parseHistoryEntry({
      id: 'matrix-seed-diagonalize',
      mode: 'matrix',
      inputLatex: '\\operatorname{diag}\\left(A\\right)',
      resultLatex: '\\operatorname{diag}(A)=A=PDP^{-1}',
      matrixSeed: {
        operation: 'diagonalizeA',
        matrixA: [[2, 1], [1, 2]],
        matrixB: [[5, 6], [7, 8]],
      },
      timestamp: '2026-06-08T00:00:00.000Z',
    }).matrixSeed?.operation).toBe('diagonalizeA');

    expect(parseHistoryEntry({
      id: 'matrix-seed-spectral-power',
      mode: 'matrix',
      inputLatex: '\\operatorname{mpow}\\left(A,3\\right)',
      resultLatex: 'A^{3}=\\begin{bmatrix}14 & 13\\\\13 & 14\\end{bmatrix}',
      matrixSeed: {
        operation: 'spectralPowerA',
        matrixA: [[2, 1], [1, 2]],
        matrixB: [[5, 6], [7, 8]],
        matrixPowerExponent: 3,
        matrixPowerExponentLatex: '3',
      },
      timestamp: '2026-06-08T00:00:00.000Z',
    }).matrixSeed?.operation).toBe('spectralPowerA');

    expect(parseHistoryEntry({
      id: 'matrix-seed-system',
      mode: 'matrix',
      inputLatex: 'Ax=\\begin{bmatrix}5\\\\11\\end{bmatrix}',
      resultLatex: 'x=\\begin{bmatrix}1\\\\2\\end{bmatrix}',
      matrixSeed: {
        operation: 'linearSystem',
        matrixA: [[1, 2], [3, 4]],
        matrixB: [[5, 6], [7, 8]],
        systemRhs: [5, 11],
        systemForm: 'Ax=b',
        editorExpressionLatex: 'Ax=\\begin{bmatrix}5\\\\11\\end{bmatrix}',
        matrixOperandLatexA: 'A',
        systemRhsLatex: '\\begin{bmatrix}5\\\\11\\end{bmatrix}',
      },
      timestamp: '2026-06-08T00:00:00.000Z',
    }).matrixSeed?.systemRhs).toEqual([5, 11]);
  });

  it('accepts typed Vector replay seeds', () => {
    const parsed = parseHistoryEntry({
      id: 'vector-seed-1',
      mode: 'vector',
      inputLatex: '\\angle(A,B)',
      resultLatex: '90^\\circ',
      vectorSeed: {
        operation: 'angle',
        vectorA: [1, 0, 0],
        vectorB: [0, 1, 0],
        angleUnit: 'deg',
        approxDigits: 7,
        editorExpressionLatex: '\\angle(u,v)',
        vectorOperandLatexA: 'u',
        vectorOperandLatexB: 'v',
        vectorValues: [
          { id: 'vector-u', name: 'u', value: [1, 0, 0] },
          { id: 'vector-v', name: 'v', value: [0, 1, 0] },
        ],
        activeVectorLeftId: 'vector-u',
        activeVectorRightId: 'vector-v',
      },
      timestamp: '2026-06-08T00:00:00.000Z',
    });

    expect(parsed.vectorSeed).toEqual({
      operation: 'angle',
      vectorA: [1, 0, 0],
      vectorB: [0, 1, 0],
      angleUnit: 'deg',
      approxDigits: 7,
      editorExpressionLatex: '\\angle(u,v)',
      vectorOperandLatexA: 'u',
      vectorOperandLatexB: 'v',
      vectorValues: [
        { id: 'vector-u', name: 'u', value: [1, 0, 0] },
        { id: 'vector-v', name: 'v', value: [0, 1, 0] },
      ],
      activeVectorLeftId: 'vector-u',
      activeVectorRightId: 'vector-v',
    });

    expect(parseHistoryEntry({
      id: 'vector-seed-projection',
      mode: 'vector',
      inputLatex: '\\operatorname{proj}_{u}\\left(v\\right)',
      resultLatex: '\\begin{bmatrix}2\\\\0\\end{bmatrix}',
      vectorSeed: {
        operation: 'projectionUofV',
        vectorA: [1, 0],
        vectorB: [2, 3],
        exactVectorB: [
          { numerator: 2, denominator: 1 },
          { numerator: 3, denominator: 1 },
        ],
        angleUnit: 'deg',
      },
      timestamp: '2026-06-08T00:00:00.000Z',
    }).vectorSeed).toMatchObject({
      operation: 'projectionUofV',
      exactVectorB: [
        { numerator: 2, denominator: 1 },
        { numerator: 3, denominator: 1 },
      ],
    });

    expect(parseHistoryEntry({
      id: 'vector-seed-gram',
      mode: 'vector',
      inputLatex: '\\operatorname{gram}\\left(u,v\\right)',
      resultLatex: '\\operatorname{orthogonal\\ basis}=\\left\\{\\begin{bmatrix}1\\\\1\\end{bmatrix}\\right\\}',
      vectorSeed: {
        operation: 'gramSchmidtUV',
        vectorA: [1, 1],
        vectorB: [2, 2],
        vectorOperands: [[1, 1], [2, 2], [0, 1]],
        vectorOperandLatexList: ['p', 'q', 'r'],
        angleUnit: 'deg',
      },
      timestamp: '2026-06-08T00:00:00.000Z',
    }).vectorSeed).toMatchObject({
      operation: 'gramSchmidtUV',
      vectorOperands: [[1, 1], [2, 2], [0, 1]],
      vectorOperandLatexList: ['p', 'q', 'r'],
    });

    expect(parseHistoryEntry({
      id: 'vector-seed-volume',
      mode: 'vector',
      inputLatex: '\\operatorname{volume}\\left(p,q,r\\right)',
      resultLatex: '6',
      vectorSeed: {
        operation: 'volume',
        vectorA: [1, 0, 0],
        vectorB: [0, 2, 0],
        vectorOperands: [[1, 0, 0], [0, 2, 0], [0, 0, 3]],
        vectorOperandLatexList: ['p', 'q', 'r'],
        angleUnit: 'rad',
      },
      timestamp: '2026-07-15T00:00:00.000Z',
    }).vectorSeed).toMatchObject({
      operation: 'volume',
      vectorOperands: [[1, 0, 0], [0, 2, 0], [0, 0, 3]],
      vectorOperandLatexList: ['p', 'q', 'r'],
    });

    expect(parseHistoryEntry({
      id: 'vector-seed-combination',
      mode: 'vector',
      inputLatex: '2p-\\frac{q}{3}',
      resultLatex: '\\begin{bmatrix}4\\\\11\\end{bmatrix}',
      vectorSeed: {
        operation: 'linearCombination',
        vectorA: [4, 11],
        vectorB: [6, 3],
        angleUnit: 'rad',
      },
      timestamp: '2026-07-10T00:00:00.000Z',
    }).vectorSeed?.operation).toBe('linearCombination');

    const familySeed = parseHistoryEntry({
      id: 'vector-seed-span',
      mode: 'vector',
      inputLatex: '\\operatorname{span}\\left(p,q,r\\right)',
      resultLatex: '\\operatorname{span}\\left(p,q,r\\right)=\\operatorname{span}\\left\\{p,q\\right\\}',
      vectorSeed: {
        operation: 'span',
        vectorA: [1, 0],
        vectorB: [0, 1],
        vectorOperands: [[1, 0], [0, 1], [1, 1]],
        exactVectorOperands: [
          [{ numerator: 1, denominator: 1 }, { numerator: 0, denominator: 1 }],
          [{ numerator: 0, denominator: 1 }, { numerator: 1, denominator: 1 }],
          [{ numerator: 1, denominator: 1 }, { numerator: 1, denominator: 1 }],
        ],
        vectorOperandLatexList: ['p', 'q', 'r'],
        angleUnit: 'rad',
      },
      timestamp: '2026-07-10T00:00:00.000Z',
    }).vectorSeed;
    expect(familySeed).toMatchObject({
      operation: 'span',
      vectorOperands: [[1, 0], [0, 1], [1, 1]],
      vectorOperandLatexList: ['p', 'q', 'r'],
    });
  });

  it('accepts Matrix linear-map profile replay seeds', () => {
    expect(parseHistoryEntry({
      id: 'matrix-profile-seed',
      mode: 'matrix',
      inputLatex: '\\operatorname{profile}\\left(A\\right)',
      resultLatex: 'A:\\mathbb{R}^{2}\\to\\mathbb{R}^{2}',
      matrixSeed: {
        operation: 'profileA',
        matrixA: [[1, 1], [2, 2]],
        matrixB: [[1, 0], [0, 1]],
        editorExpressionLatex: '\\operatorname{profile}\\left(A\\right)',
        matrixOperandLatexA: 'A',
      },
      timestamp: '2026-07-10T00:00:00.000Z',
    }).matrixSeed?.operation).toBe('profileA');
  });

  it('accepts discriminated symbolic Matrix and Vector replay seeds without numeric shadows', () => {
    const source = scalarWire('a', 'a');
    const resolved = scalarWire('2', 2);
    const matrix = parseHistoryEntry({
      id: 'matrix-scalar-seed',
      mode: 'matrix',
      inputLatex: '\\det(A)',
      matrixSeed: {
        operation: 'detA',
        operandEncoding: 'scalar-v1',
        matrixA: { encoding: 'scalar-v1', source: [[source]], resolved: [[resolved]] },
        matrixValues: [{ id: 'matrix-a', name: 'A', encoding: 'scalar-v1', value: [[source]] }],
        domain: 'real',
        substitutionMode: 'use-stored-values',
        substitutionSnapshot: [{ name: 'a', valueLatex: '2', numericValue: 2 }],
        complexExactForm: 'rectangular',
      },
      timestamp: '2026-07-15T00:00:00.000Z',
    }).matrixSeed;
    expect(matrix).toMatchObject({
      operandEncoding: 'scalar-v1',
      domain: 'real',
      matrixA: { source: [[{ canonicalLatex: 'a' }]], resolved: [[{ canonicalLatex: '2' }]] },
    });

    const symbolicSystem = parseHistoryEntry({
      id: 'matrix-symbolic-system-seed',
      mode: 'matrix',
      inputLatex: 'A[u;v]=[g,h]',
      matrixSeed: {
        operation: 'linearSystem',
        operandEncoding: 'scalar-v1',
        matrixA: { encoding: 'scalar-v1', source: [[source]], resolved: [[source]] },
        matrixB: { encoding: 'scalar-v1', source: [[source]], resolved: [[source]] },
        systemRhs: { encoding: 'scalar-v1', source: [source], resolved: [resolved] },
        systemUnknowns: ['u', 'v'],
        systemUnknownVectorName: 'z',
        domain: 'real',
      },
      timestamp: '2026-07-15T00:00:00.000Z',
    }).matrixSeed;
    expect(symbolicSystem).toMatchObject({
      systemUnknowns: ['u', 'v'],
      systemUnknownVectorName: 'z',
    });

    const vector = parseHistoryEntry({
      id: 'vector-scalar-seed',
      mode: 'vector',
      inputLatex: 'u\\cdot v',
      vectorSeed: {
        operation: 'dot',
        operandEncoding: 'scalar-v1',
        vectorA: { encoding: 'scalar-v1', source: [source], resolved: [source] },
        vectorB: { encoding: 'scalar-v1', source: [resolved], resolved: [resolved] },
        angleUnit: 'rad',
        domain: 'complex',
        substitutionMode: 'symbolic',
        complexExactForm: 'cis',
      },
      timestamp: '2026-07-15T00:00:00.000Z',
    }).vectorSeed;
    expect(vector).toMatchObject({ operandEncoding: 'scalar-v1', domain: 'complex' });
  });

  it('rejects malformed scalar wires, custom MathJSON heads, and extra scalar fields', () => {
    for (const badWire of [
      { version: 1, canonicalLatex: 'a', mathJson: ['PrivateScalar', 'a'] },
      { version: 1, canonicalLatex: '', mathJson: 'a' },
      { version: 1, canonicalLatex: 'a', mathJson: 'a', extra: true },
    ]) {
      expect(() => parseHistoryEntry({
        id: 'bad-scalar-seed',
        mode: 'vector',
        inputLatex: 'u',
        vectorSeed: {
          operation: 'normA',
          operandEncoding: 'scalar-v1',
          vectorA: { encoding: 'scalar-v1', source: [badWire], resolved: [badWire] },
          angleUnit: 'rad',
        },
        timestamp: '2026-07-15T00:00:00.000Z',
      })).toThrow();
    }

    const imaginary = scalarWire('i', 'ImaginaryUnit');
    expect(() => parseHistoryEntry({
      id: 'bad-real-complex-seed',
      mode: 'vector',
      inputLatex: 'u',
      vectorSeed: {
        operation: 'normA',
        operandEncoding: 'scalar-v1',
        vectorA: { encoding: 'scalar-v1', source: [imaginary], resolved: [imaginary] },
        angleUnit: 'rad',
        domain: 'real',
      },
      timestamp: '2026-07-15T00:00:00.000Z',
    })).toThrow();

    const mismatchedExact = {
      ...scalarWire('a', 'a'),
      exactRational: { numerator: 1, denominator: 1 },
    };
    expect(() => parseHistoryEntry({
      id: 'bad-scalar-exact-sidecar',
      mode: 'vector',
      inputLatex: 'u',
      vectorSeed: {
        operation: 'normA',
        operandEncoding: 'scalar-v1',
        vectorA: { encoding: 'scalar-v1', source: [mismatchedExact], resolved: [mismatchedExact] },
        angleUnit: 'rad',
      },
      timestamp: '2026-07-15T00:00:00.000Z',
    })).toThrow();
  });

  it('accepts typed Trigonometry Period & Phase replay seeds', () => {
    const parsed = parseHistoryEntry({
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

  it('accepts typed Geometry replay seeds while preserving legacy screen hints', () => {
    const parsed = parseHistoryEntry({
      id: 'geometry-seed-1',
      mode: 'geometry',
      inputLatex: 'rectangle(width=?, height=5, area=40)',
      resultLatex: 'width=8',
      geometryScreen: 'rectangle',
      geometrySeed: {
        screen: 'rectangle',
        request: {
          kind: 'rectangleSolveMissing',
          widthLatex: '?',
          heightLatex: '5',
          areaLatex: '40',
          unknown: 'width',
        },
      },
      timestamp: '2026-06-10T00:00:00.000Z',
    });

    expect(parsed.geometryScreen).toBe('rectangle');
    expect(parsed.geometrySeed).toEqual({
      screen: 'rectangle',
      request: {
        kind: 'rectangleSolveMissing',
        widthLatex: '?',
        heightLatex: '5',
        areaLatex: '40',
        unknown: 'width',
      },
    });
  });
});
