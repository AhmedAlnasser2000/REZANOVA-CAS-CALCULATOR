import { runMatrixOperation } from '../matrix';
import type {
  DisplayOutcome,
  MatrixOperation,
} from '../../types/calculator';

type RunMatrixModeRequest = {
  operation: MatrixOperation;
  matrixA: number[][];
  matrixB: number[][];
};

function titleForOperation(operation: MatrixOperation) {
  switch (operation) {
    case 'add':
      return 'A+B';
    case 'subtract':
      return 'A-B';
    case 'multiply':
      return 'A×B';
    case 'transposeA':
      return 'Transpose A';
    case 'transposeB':
      return 'Transpose B';
    case 'detA':
      return 'det(A)';
    case 'detB':
      return 'det(B)';
    case 'inverseA':
      return 'Inverse A';
    case 'inverseB':
      return 'Inverse B';
    default:
      return 'Matrix';
  }
}

export function runMatrixMode({ operation, matrixA, matrixB }: RunMatrixModeRequest): DisplayOutcome {
  const response = runMatrixOperation({ operation, matrixA, matrixB });
  if (response.error) {
    return {
      kind: 'error',
      title: titleForOperation(operation),
      error: response.error,
      warnings: response.warnings,
      exactLatex: response.resultLatex,
      approxText: response.approxText,
    };
  }

  return {
    kind: 'success',
    title: titleForOperation(operation),
    exactLatex: response.resultLatex,
    approxText: response.approxText,
    warnings: response.warnings,
  };
}
