const PIVOT_EPSILON = 1e-10;

export type NumericMatrix = number[][];

export type MatrixShapeFacts = {
  rows: number;
  columns: number;
  isRectangular: boolean;
  isSquare: boolean;
};

export type NumericMatrixOperation =
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'transposeA'
  | 'transposeB'
  | 'detA'
  | 'detB'
  | 'inverseA'
  | 'inverseB';

export type MatrixCoreStopReason =
  | 'matrix-a-incomplete'
  | 'matrix-b-incomplete'
  | 'add-subtract-dimension-mismatch'
  | 'multiply-dimension-mismatch'
  | 'det-a-non-square'
  | 'det-b-non-square'
  | 'inverse-a-singular-or-non-square'
  | 'inverse-b-singular-or-non-square'
  | 'unsupported-operation';

export type MatrixCoreResult =
  | { kind: 'matrix'; value: NumericMatrix }
  | { kind: 'scalar'; value: number }
  | { kind: 'error'; reason: MatrixCoreStopReason };

export type NumericMatrixRequest = {
  operation: NumericMatrixOperation;
  matrixA: NumericMatrix;
  matrixB?: NumericMatrix;
};

function cloneMatrix(matrix: NumericMatrix): NumericMatrix {
  return matrix.map((row) => [...row]);
}

export function getMatrixShapeFacts(matrix: NumericMatrix): MatrixShapeFacts {
  const rows = matrix.length;
  const columns = matrix[0]?.length ?? 0;
  const isRectangular = rows > 0 && columns > 0 && matrix.every((row) => row.length === columns);

  return {
    rows,
    columns,
    isRectangular,
    isSquare: isRectangular && rows === columns,
  };
}

export function haveSameMatrixShape(a: NumericMatrix, b: NumericMatrix): boolean {
  const shapeA = getMatrixShapeFacts(a);
  const shapeB = getMatrixShapeFacts(b);

  return shapeA.isRectangular && shapeB.isRectangular && shapeA.rows === shapeB.rows && shapeA.columns === shapeB.columns;
}

export function canMultiplyMatrices(a: NumericMatrix, b: NumericMatrix): boolean {
  const shapeA = getMatrixShapeFacts(a);
  const shapeB = getMatrixShapeFacts(b);

  return shapeA.isRectangular && shapeB.isRectangular && shapeA.columns === shapeB.rows;
}

export function addMatrices(a: NumericMatrix, b: NumericMatrix): NumericMatrix {
  return a.map((row, rowIndex) =>
    row.map((value, columnIndex) => value + b[rowIndex][columnIndex]),
  );
}

export function subtractMatrices(a: NumericMatrix, b: NumericMatrix): NumericMatrix {
  return a.map((row, rowIndex) =>
    row.map((value, columnIndex) => value - b[rowIndex][columnIndex]),
  );
}

export function multiplyMatrices(a: NumericMatrix, b: NumericMatrix): NumericMatrix {
  const result = Array.from({ length: a.length }, () =>
    Array.from({ length: b[0].length }, () => 0),
  );

  for (let row = 0; row < a.length; row += 1) {
    for (let column = 0; column < b[0].length; column += 1) {
      let sum = 0;
      for (let pivot = 0; pivot < b.length; pivot += 1) {
        sum += a[row][pivot] * b[pivot][column];
      }
      result[row][column] = sum;
    }
  }

  return result;
}

export function transposeMatrix(matrix: NumericMatrix): NumericMatrix {
  return matrix[0].map((_, columnIndex) =>
    matrix.map((row) => row[columnIndex]),
  );
}

export function determinantMatrix(matrix: NumericMatrix): number {
  if (matrix.length === 1) {
    return matrix[0][0];
  }

  if (matrix.length === 2) {
    return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
  }

  let sum = 0;
  for (let column = 0; column < matrix.length; column += 1) {
    const minor = matrix
      .slice(1)
      .map((row) => row.filter((_, index) => index !== column));
    sum += (column % 2 === 0 ? 1 : -1) * matrix[0][column] * determinantMatrix(minor);
  }
  return sum;
}

export function inverseMatrix(matrix: NumericMatrix): NumericMatrix | null {
  if (!getMatrixShapeFacts(matrix).isSquare) {
    return null;
  }

  const working = cloneMatrix(matrix);
  const size = working.length;
  const augmented = working.map((row, rowIndex) => [
    ...row,
    ...Array.from({ length: size }, (_, index) => (index === rowIndex ? 1 : 0)),
  ]);

  for (let pivot = 0; pivot < size; pivot += 1) {
    let pivotRow = pivot;
    while (pivotRow < size && Math.abs(augmented[pivotRow][pivot]) < PIVOT_EPSILON) {
      pivotRow += 1;
    }

    if (pivotRow === size) {
      return null;
    }

    [augmented[pivot], augmented[pivotRow]] = [augmented[pivotRow], augmented[pivot]];

    const pivotValue = augmented[pivot][pivot];
    for (let column = 0; column < size * 2; column += 1) {
      augmented[pivot][column] /= pivotValue;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === pivot) {
        continue;
      }

      const factor = augmented[row][pivot];
      for (let column = 0; column < size * 2; column += 1) {
        augmented[row][column] -= factor * augmented[pivot][column];
      }
    }
  }

  return augmented.map((row) => row.slice(size));
}

export function solveNumericLinearSystem(
  coefficients: NumericMatrix,
  constants: number[],
): number[] | null {
  if (!getMatrixShapeFacts(coefficients).isRectangular || coefficients.length !== constants.length) {
    return null;
  }

  const size = coefficients.length;
  const augmented = coefficients.map((row, rowIndex) => [...row, constants[rowIndex]]);

  for (let pivot = 0; pivot < size; pivot += 1) {
    let pivotRow = pivot;
    while (pivotRow < size && Math.abs(augmented[pivotRow][pivot]) < PIVOT_EPSILON) {
      pivotRow += 1;
    }

    if (pivotRow === size) {
      return null;
    }

    [augmented[pivot], augmented[pivotRow]] = [augmented[pivotRow], augmented[pivot]];

    const pivotValue = augmented[pivot][pivot];
    for (let column = pivot; column <= size; column += 1) {
      augmented[pivot][column] /= pivotValue;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === pivot) {
        continue;
      }

      const factor = augmented[row][pivot];
      for (let column = pivot; column <= size; column += 1) {
        augmented[row][column] -= factor * augmented[pivot][column];
      }
    }
  }

  return augmented.map((row) => row[size]);
}

export function runNumericMatrixOperation(req: NumericMatrixRequest): MatrixCoreResult {
  const { matrixA, matrixB } = req;
  const shapeA = getMatrixShapeFacts(matrixA);

  if (!shapeA.isRectangular) {
    return { kind: 'error', reason: 'matrix-a-incomplete' };
  }

  if (
    ['add', 'subtract', 'multiply'].includes(req.operation) &&
    (!matrixB || !getMatrixShapeFacts(matrixB).isRectangular)
  ) {
    return { kind: 'error', reason: 'matrix-b-incomplete' };
  }

  if (['add', 'subtract'].includes(req.operation) && matrixB && !haveSameMatrixShape(matrixA, matrixB)) {
    return { kind: 'error', reason: 'add-subtract-dimension-mismatch' };
  }

  if (req.operation === 'multiply' && matrixB && !canMultiplyMatrices(matrixA, matrixB)) {
    return { kind: 'error', reason: 'multiply-dimension-mismatch' };
  }

  switch (req.operation) {
    case 'add':
      return { kind: 'matrix', value: addMatrices(matrixA, matrixB!) };
    case 'subtract':
      return { kind: 'matrix', value: subtractMatrices(matrixA, matrixB!) };
    case 'multiply':
      return { kind: 'matrix', value: multiplyMatrices(matrixA, matrixB!) };
    case 'transposeA':
      return { kind: 'matrix', value: transposeMatrix(matrixA) };
    case 'transposeB':
      return matrixB && getMatrixShapeFacts(matrixB).isRectangular
        ? { kind: 'matrix', value: transposeMatrix(matrixB) }
        : { kind: 'error', reason: 'matrix-b-incomplete' };
    case 'detA':
      return shapeA.isSquare
        ? { kind: 'scalar', value: determinantMatrix(matrixA) }
        : { kind: 'error', reason: 'det-a-non-square' };
    case 'detB':
      return matrixB && getMatrixShapeFacts(matrixB).isSquare
        ? { kind: 'scalar', value: determinantMatrix(matrixB) }
        : { kind: 'error', reason: 'det-b-non-square' };
    case 'inverseA': {
      const result = inverseMatrix(matrixA);
      return result
        ? { kind: 'matrix', value: result }
        : { kind: 'error', reason: 'inverse-a-singular-or-non-square' };
    }
    case 'inverseB': {
      const result = matrixB ? inverseMatrix(matrixB) : null;
      return result
        ? { kind: 'matrix', value: result }
        : { kind: 'error', reason: matrixB ? 'inverse-b-singular-or-non-square' : 'matrix-b-incomplete' };
    }
    default:
      return { kind: 'error', reason: 'unsupported-operation' };
  }
}
