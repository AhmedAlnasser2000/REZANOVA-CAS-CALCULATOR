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
  | 'subtract'
  | 'projectionUofV'
  | 'projectionVofU'
  | 'orthogonalToU'
  | 'orthogonalToV'
  | 'unitA'
  | 'unitB'
  | 'orthogonalCheck'
  | 'gramSchmidtUV';

export type VectorCoreStopReason =
  | 'vector-a-incomplete'
  | 'vector-b-incomplete'
  | 'vector-b-required'
  | 'dimension-mismatch'
  | 'cross-requires-3d'
  | 'angle-zero-vector'
  | 'projection-zero-base'
  | 'unit-zero-vector'
  | 'gram-schmidt-zero-span'
  | 'unsupported-operation';

export type VectorCoreResult =
  | { kind: 'vector'; value: NumericVector }
  | { kind: 'scalar'; value: number; angleUnit?: NumericAngleUnit }
  | { kind: 'orthogonality'; orthogonal: boolean; dot: number }
  | {
      kind: 'gramSchmidt';
      orthogonalBasis: NumericVector[];
      orthonormalBasis: NumericVector[];
      notes: string[];
    }
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

export function scaleVector(vector: NumericVector, scalar: number): NumericVector {
  return vector.map((value) => value * scalar);
}

export function projectionOntoVector(base: NumericVector, target: NumericVector): NumericVector | null {
  const denominator = dotVectors(base, base);
  if (denominator === 0) {
    return null;
  }

  return scaleVector(base, dotVectors(target, base) / denominator);
}

export function orthogonalComponentToVector(base: NumericVector, target: NumericVector): NumericVector | null {
  const projection = projectionOntoVector(base, target);
  return projection ? subtractVectors(target, projection) : null;
}

export function unitVector(vector: NumericVector): NumericVector | null {
  const norm = normVector(vector);
  return norm === 0 ? null : scaleVector(vector, 1 / norm);
}

export function gramSchmidtTwoVectors(first: NumericVector, second: NumericVector) {
  const orthogonalBasis: NumericVector[] = [];
  const notes: string[] = [];

  for (const [index, vector] of [first, second].entries()) {
    let residual = [...vector];
    for (const basisVector of orthogonalBasis) {
      const next = orthogonalComponentToVector(basisVector, residual);
      if (!next) {
        notes.push(`Basis vector ${orthogonalBasis.indexOf(basisVector) + 1} is zero, so this projection was skipped.`);
        continue;
      }
      residual = next;
    }

    if (normVector(residual) <= 1e-12) {
      notes.push(index === 0
        ? 'The first vector is zero and contributes no basis direction.'
        : 'The second vector has zero residual after projection, so it is dependent on the earlier basis vectors.');
      continue;
    }

    orthogonalBasis.push(residual);
  }

  if (orthogonalBasis.length === 0) {
    return null;
  }

  const orthonormalBasis = orthogonalBasis
    .map(unitVector)
    .filter((vector): vector is NumericVector => Boolean(vector));

  return {
    orthogonalBasis,
    orthonormalBasis,
    notes,
  };
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

function vectorBRequired(operation: NumericVectorOperation) {
  return [
    'dot',
    'cross',
    'angle',
    'add',
    'subtract',
    'normB',
    'projectionUofV',
    'projectionVofU',
    'orthogonalToU',
    'orthogonalToV',
    'unitB',
    'orthogonalCheck',
    'gramSchmidtUV',
  ].includes(operation);
}

function vectorARequired(operation: NumericVectorOperation) {
  return operation !== 'normB' && operation !== 'unitB';
}

function operationUsesBothVectors(operation: NumericVectorOperation) {
  return [
    'dot',
    'cross',
    'angle',
    'add',
    'subtract',
    'projectionUofV',
    'projectionVofU',
    'orthogonalToU',
    'orthogonalToV',
    'orthogonalCheck',
    'gramSchmidtUV',
  ].includes(operation);
}

export function runNumericVectorOperation(req: NumericVectorRequest): VectorCoreResult {
  const { vectorA, vectorB } = req;

  if (vectorARequired(req.operation) && getVectorShapeFacts(vectorA).isEmpty) {
    return { kind: 'error', reason: 'vector-a-incomplete' };
  }

  if (vectorBRequired(req.operation) && !vectorB) {
    return { kind: 'error', reason: 'vector-b-required' };
  }

  if (vectorB && vectorBRequired(req.operation) && getVectorShapeFacts(vectorB).isEmpty) {
    return { kind: 'error', reason: 'vector-b-incomplete' };
  }

  if (vectorB && operationUsesBothVectors(req.operation) && !haveSameVectorDimension(vectorA, vectorB)) {
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
    case 'projectionUofV': {
      const result = projectionOntoVector(vectorA, vectorB!);
      return result ? { kind: 'vector', value: result } : { kind: 'error', reason: 'projection-zero-base' };
    }
    case 'projectionVofU': {
      const result = projectionOntoVector(vectorB!, vectorA);
      return result ? { kind: 'vector', value: result } : { kind: 'error', reason: 'projection-zero-base' };
    }
    case 'orthogonalToU': {
      const result = orthogonalComponentToVector(vectorA, vectorB!);
      return result ? { kind: 'vector', value: result } : { kind: 'error', reason: 'projection-zero-base' };
    }
    case 'orthogonalToV': {
      const result = orthogonalComponentToVector(vectorB!, vectorA);
      return result ? { kind: 'vector', value: result } : { kind: 'error', reason: 'projection-zero-base' };
    }
    case 'unitA': {
      const result = unitVector(vectorA);
      return result ? { kind: 'vector', value: result } : { kind: 'error', reason: 'unit-zero-vector' };
    }
    case 'unitB': {
      const result = unitVector(vectorB!);
      return result ? { kind: 'vector', value: result } : { kind: 'error', reason: 'unit-zero-vector' };
    }
    case 'orthogonalCheck': {
      const dot = dotVectors(vectorA, vectorB!);
      return { kind: 'orthogonality', dot, orthogonal: Math.abs(dot) <= 1e-12 };
    }
    case 'gramSchmidtUV': {
      const result = gramSchmidtTwoVectors(vectorA, vectorB!);
      return result ? { kind: 'gramSchmidt', ...result } : { kind: 'error', reason: 'gram-schmidt-zero-span' };
    }
    default:
      return { kind: 'error', reason: 'unsupported-operation' };
  }
}
