import { runVectorOperation } from '../vector';
import type {
  AngleUnit,
  DisplayOutcome,
  VectorOperation,
} from '../../types/calculator';

type RunVectorModeRequest = {
  operation: VectorOperation;
  vectorA: number[];
  vectorB: number[];
  angleUnit: AngleUnit;
};

function titleForOperation(operation: VectorOperation) {
  switch (operation) {
    case 'dot':
      return 'Dot';
    case 'cross':
      return 'Cross';
    case 'normA':
      return 'Norm A';
    case 'normB':
      return 'Norm B';
    case 'angle':
      return 'Angle';
    case 'add':
      return 'A+B';
    case 'subtract':
      return 'A-B';
    default:
      return 'Vector';
  }
}

export function runVectorMode({ operation, vectorA, vectorB, angleUnit }: RunVectorModeRequest): DisplayOutcome {
  const response = runVectorOperation({ operation, vectorA, vectorB, angleUnit });
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
