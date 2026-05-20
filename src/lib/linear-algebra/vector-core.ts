export type NumericVector = number[];
export type NumericAngleUnit = 'deg' | 'rad' | 'grad';

export type VectorShapeFacts = {
  dimension: number;
  isEmpty: boolean;
};

export type NumericVectorOperation =
  | 'dot'
  | 'cross'
  | 'normA'
  | 'normB'
  | 'angle'
  | 'add'
  | 'subtract';

export type VectorCoreStopReason =
  | 'vector-a-incomplete'
  | 'vector-b-required'
  | 'dimension-mismatch'
  | 'cross-requires-3d'
  | 'angle-zero-vector'
  | 'unsupported-operation';

export type VectorCoreResult =
  | { kind: 'vector'; value: NumericVector }
  | { kind: 'scalar'; value: number; angleUnit?: NumericAngleUnit }
  | { kind: 'error'; reason: VectorCoreStopReason };

export type NumericVectorRequest = {
  operation: NumericVectorOperation;
  vectorA: NumericVector;
  vectorB?: NumericVector;
  angleUnit: NumericAngleUnit;
};

export function getVectorShapeFacts(vector: NumericVector): VectorShapeFacts {
  return {
    dimension: vector.length,
    isEmpty: vector.length === 0,
  };
}

export function haveSameVectorDimension(a: NumericVector, b: NumericVector): boolean {
  return a.length === b.length;
}

export function dotVectors(a: NumericVector, b: NumericVector): number {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

export function normVector(vector: NumericVector): number {
  return Math.sqrt(dotVectors(vector, vector));
}

export function crossVectors(a: NumericVector, b: NumericVector): NumericVector | null {
  if (a.length !== 3 || b.length !== 3) {
    return null;
  }

  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function addVectors(a: NumericVector, b: NumericVector): NumericVector {
  return a.map((value, index) => value + b[index]);
}

export function subtractVectors(a: NumericVector, b: NumericVector): NumericVector {
  return a.map((value, index) => value - b[index]);
}

function toAngleUnit(radians: number, angleUnit: NumericAngleUnit): number {
  if (angleUnit === 'deg') {
    return radians * (180 / Math.PI);
  }

  if (angleUnit === 'grad') {
    return radians * (200 / Math.PI);
  }

  return radians;
}

export function angleBetweenVectors(
  a: NumericVector,
  b: NumericVector,
  angleUnit: NumericAngleUnit,
): number | null {
  const denominator = normVector(a) * normVector(b);
  if (denominator === 0) {
    return null;
  }

  const radians = Math.acos(Math.max(-1, Math.min(1, dotVectors(a, b) / denominator)));
  return toAngleUnit(radians, angleUnit);
}

export function runNumericVectorOperation(req: NumericVectorRequest): VectorCoreResult {
  const { vectorA, vectorB } = req;

  if (getVectorShapeFacts(vectorA).isEmpty) {
    return { kind: 'error', reason: 'vector-a-incomplete' };
  }

  if (['dot', 'cross', 'angle', 'add', 'subtract'].includes(req.operation) && !vectorB) {
    return { kind: 'error', reason: 'vector-b-required' };
  }

  if (vectorB && !haveSameVectorDimension(vectorA, vectorB)) {
    return { kind: 'error', reason: 'dimension-mismatch' };
  }

  switch (req.operation) {
    case 'dot':
      return { kind: 'scalar', value: dotVectors(vectorA, vectorB!) };
    case 'cross': {
      const result = crossVectors(vectorA, vectorB!);
      return result
        ? { kind: 'vector', value: result }
        : { kind: 'error', reason: 'cross-requires-3d' };
    }
    case 'normA':
      return { kind: 'scalar', value: normVector(vectorA) };
    case 'normB':
      return { kind: 'scalar', value: normVector(vectorB!) };
    case 'angle': {
      const result = angleBetweenVectors(vectorA, vectorB!, req.angleUnit);
      return result === null
        ? { kind: 'error', reason: 'angle-zero-vector' }
        : { kind: 'scalar', value: result, angleUnit: req.angleUnit };
    }
    case 'add':
      return { kind: 'vector', value: addVectors(vectorA, vectorB!) };
    case 'subtract':
      return { kind: 'vector', value: subtractVectors(vectorA, vectorB!) };
    default:
      return { kind: 'error', reason: 'unsupported-operation' };
  }
}
