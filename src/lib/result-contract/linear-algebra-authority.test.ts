import { describe, expect, it } from 'vitest';
import type { MatrixOperation, VectorOperation } from '../../types/calculator';
import { runMatrixMode, type RunMatrixModeRequest } from '../modes/matrix';
import { runVectorMode, type RunVectorModeRequest } from '../modes/vector';

const MATRIX_OPERATIONS = [
  'add', 'subtract', 'multiply', 'transposeA', 'transposeB', 'detA', 'detB',
  'inverseA', 'inverseB', 'rankA', 'rankB', 'rrefA', 'rrefB', 'nullSpaceA',
  'nullSpaceB', 'columnSpaceA', 'columnSpaceB', 'basisA', 'basisB',
  'coordinatesA', 'coordinatesB', 'changeBasis', 'luA', 'luB', 'pluA', 'pluB',
  'luSolveA', 'luSolveB', 'pluSolveA', 'pluSolveB', 'multiRhsSolve', 'qrA',
  'qrB', 'columnProjectionA', 'columnProjectionB', 'leastSquaresA',
  'leastSquaresB', 'invertibilityA', 'invertibilityB', 'profileA', 'profileB',
  'definiteA', 'definiteB', 'eigenA', 'eigenB', 'diagonalizeA', 'diagonalizeB', 'spectralPowerA',
  'spectralPowerB', 'linearSystem',
] as const satisfies readonly MatrixOperation[];

const VECTOR_OPERATIONS = [
  'dot', 'cross', 'normA', 'normB', 'angle', 'add', 'subtract',
  'projectionUofV', 'projectionVofU', 'orthogonalToU', 'orthogonalToV',
  'unitA', 'unitB', 'orthogonalCheck', 'gramSchmidtUV', 'linearCombination',
  'parallel', 'distance', 'parallelogramArea', 'triangleArea', 'volume',
  'span', 'independent',
] as const satisfies readonly VectorOperation[];

function matrixRequest(operation: MatrixOperation): RunMatrixModeRequest {
  const orthogonal = [[1, 0], [0, 1]];
  const spectral = [[2, 1], [1, 2]];
  const useOrthogonal = operation === 'qrA'
    || operation === 'qrB'
    || operation === 'columnProjectionA'
    || operation === 'columnProjectionB'
    || operation === 'leastSquaresA'
    || operation === 'leastSquaresB';
  return {
    operation,
    matrixA: useOrthogonal ? orthogonal : spectral,
    matrixB: useOrthogonal ? orthogonal : [[1, 0], [0, 1]],
    systemRhs: [1, 2],
    coordinateVector: [3, 4],
    matrixPowerExponent: 3,
    systemForm: 'Ax=b',
  };
}

function vectorRequest(operation: VectorOperation): RunVectorModeRequest {
  return {
    operation,
    vectorA: [1, 0, 0],
    vectorB: [0, 1, 0],
    angleUnit: 'rad',
    vectorOperands: [[1, 0, 0], [0, 1, 0], [1, 1, 0]],
    vectorOperandLatexList: ['u', 'v', 'w'],
  };
}

describe('Linear Algebra canonical authority', () => {
  it('keeps all 50 Matrix selectors on canonical result V2', () => {
    expect(MATRIX_OPERATIONS).toHaveLength(50);
    for (const operation of MATRIX_OPERATIONS) {
      const outcome = runMatrixMode(matrixRequest(operation));
      expect(outcome.kind, operation).not.toBe('prompt');
      if (outcome.kind === 'prompt') throw new Error(`Unexpected Matrix prompt for ${operation}.`);
      expect(outcome.canonicalResult?.version, operation).toBe(2);
    }
  });

  it('keeps all 23 Vector selectors on V2 except the narrow gradian angle selector', () => {
    expect(VECTOR_OPERATIONS).toHaveLength(23);
    for (const operation of VECTOR_OPERATIONS) {
      const outcome = runVectorMode(vectorRequest(operation));
      expect(outcome.kind, operation).not.toBe('prompt');
      if (outcome.kind === 'prompt') throw new Error(`Unexpected Vector prompt for ${operation}.`);
      expect(outcome.canonicalResult?.version, operation).toBe(2);
    }

    for (const angleUnit of ['deg', 'rad', 'grad'] as const) {
      const outcome = runVectorMode({ ...vectorRequest('angle'), angleUnit });
      if (outcome.kind === 'prompt') throw new Error(`Unexpected Vector prompt for ${angleUnit}.`);
      expect(outcome.canonicalResult?.version, angleUnit).toBe(angleUnit === 'grad' ? 3 : 2);
    }

    const gradian = runVectorMode({
      ...vectorRequest('angle'),
      vectorA: [1, 0],
      vectorB: [0, 1],
      angleUnit: 'grad',
    });
    expect(gradian.kind).toBe('success');
    if (gradian.kind !== 'success') throw new Error('Expected gradian Vector success.');
    expect(gradian.exactLatex).toBe('100^{g}');
    expect(gradian.canonicalResult).toMatchObject({
      version: 3,
      primary: {
        kind: 'angle-quantity',
        presentation: { primaryLatex: '100^{g}' },
        magnitude: { canonicalLatex: '100', mathJson: 100 },
        unit: 'grad',
      },
    });
  });

  it('builds the unsupported spectral Equation action from native coefficients', () => {
    const outcome = runMatrixMode({
      operation: 'eigenA',
      matrixA: [[0, -1], [1, 0]],
      matrixB: [[1, 0], [0, 1]],
    });
    expect(outcome.kind).toBe('error');
    if (outcome.kind !== 'error') throw new Error('Expected unsupported Matrix spectral result.');
    expect(outcome.canonicalResult?.version).toBe(2);
    expect(outcome.actions).toEqual([{
      version: 2,
      kind: 'send',
      target: 'equation',
      math: {
        canonicalLatex: '\\lambda^{2}+1=0',
        mathJson: [
          'Equal',
          ['Add', ['Power', 'lambda', 2], ['Multiply', 0, 'lambda'], 1],
          0,
        ],
      },
    }]);
  });

  it('proves rational and negative spectral readback without a custom MathJSON operator', () => {
    const outcome = runMatrixMode({
      operation: 'eigenA',
      matrixA: [[-1, 0], [0, 0.5]],
      matrixB: [[1, 0], [0, 1]],
      exactMatrixA: [
        [{ numerator: -1, denominator: 1 }, { numerator: 0, denominator: 1 }],
        [{ numerator: 0, denominator: 1 }, { numerator: 1, denominator: 2 }],
      ],
    });
    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success') throw new Error('Expected rational Matrix spectral success.');
    expect(outcome.canonicalResult?.version).toBe(2);
  });
});
