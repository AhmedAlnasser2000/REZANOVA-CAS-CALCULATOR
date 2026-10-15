import { describe, expect, it } from 'vitest';
import type { MatrixOperation, VectorOperation, VectorRequest } from '../../types/calculator';
import { runMatrixMode, type RunMatrixModeRequest } from '../modes/matrix';
import { runVectorMode } from '../modes/vector';

const MATRIX_OPERATIONS = [
  'add', 'subtract', 'multiply', 'transposeA', 'transposeB', 'adjointA', 'adjointB', 'detA', 'detB',
  'inverseA', 'inverseB', 'rankA', 'rankB', 'rrefA', 'rrefB', 'nullSpaceA',
  'nullSpaceB', 'columnSpaceA', 'columnSpaceB', 'basisA', 'basisB',
  'coordinatesA', 'coordinatesB', 'changeBasis', 'luA', 'luB', 'pluA', 'pluB',
  'luSolveA', 'luSolveB', 'pluSolveA', 'pluSolveB', 'multiRhsSolve', 'qrA',
  'qrB', 'columnProjectionA', 'columnProjectionB', 'leastSquaresA',
  'leastSquaresB', 'invertibilityA', 'invertibilityB', 'profileA', 'profileB',
  'definiteA', 'definiteB', 'svdA', 'svdB', 'pinvA', 'pinvB', 'condA', 'condB',
  'nrankA', 'nrankB', 'charpolyA', 'charpolyB', 'eigenA', 'eigenB', 'diagonalizeA', 'diagonalizeB', 'spectralPowerA',
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

function vectorRequest(operation: VectorOperation): VectorRequest & { vectorB: number[] } {
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
  it('keeps all 62 Matrix selectors on the current canonical result', () => {
    expect(MATRIX_OPERATIONS).toHaveLength(62);
    for (const operation of MATRIX_OPERATIONS) {
      const outcome = runMatrixMode(matrixRequest(operation));
      expect(outcome.kind, operation).not.toBe('prompt');
      if (outcome.kind === 'prompt') throw new Error(`Unexpected Matrix prompt for ${operation}.`);
      expect(outcome.canonicalResult?.version, operation).toBe(7);
    }
  });

  it('keeps all 23 Vector selectors on the current contract including the typed gradian angle', () => {
    expect(VECTOR_OPERATIONS).toHaveLength(23);
    for (const operation of VECTOR_OPERATIONS) {
      const outcome = runVectorMode(vectorRequest(operation));
      expect(outcome.kind, operation).not.toBe('prompt');
      if (outcome.kind === 'prompt') throw new Error(`Unexpected Vector prompt for ${operation}.`);
      expect(outcome.canonicalResult?.version, operation).toBe(7);
    }

    for (const angleUnit of ['deg', 'rad', 'grad'] as const) {
      const outcome = runVectorMode({ ...vectorRequest('angle'), angleUnit });
      if (outcome.kind === 'prompt') throw new Error(`Unexpected Vector prompt for ${angleUnit}.`);
      expect(outcome.canonicalResult?.version, angleUnit).toBe(7);
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
      version: 7,
      primary: {
        kind: 'angle-quantity',
        presentation: { primaryLatex: '100^{g}' },
        magnitude: { canonicalLatex: '100', mathJson: 100 },
        unit: 'grad',
      },
    });
  });

  it('proves a singular Matrix null space as the span of its native basis', () => {
    const outcome = runMatrixMode({
      operation: 'nullSpaceA',
      matrixA: [[1, 1], [2, 2]],
      matrixB: [[1]],
      matrixOperandLatexA: '\\begin{bmatrix}1&1\\\\2&2\\end{bmatrix}',
    });

    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success') throw new Error('Expected singular null-space success.');
    const document = outcome.canonicalResult;
    expect(document).toMatchObject({
      version: 7,
      primary: {
        kind: 'math',
        value: {
          canonicalLatex: '\\operatorname{Null}(\\begin{bmatrix}1&1\\\\2&2\\end{bmatrix})=\\operatorname{span}\\left\\{\\begin{bmatrix}-1\\\\1\\end{bmatrix}\\right\\}',
          mathJson: expect.anything(),
        },
      },
    });
    if (document?.version !== 7) throw new Error('Expected singular null-space current authority.');
    expect(JSON.stringify(document.primary)).toContain('"Null"');
    expect(JSON.stringify(document.primary)).toContain('"span"');
  });
});
