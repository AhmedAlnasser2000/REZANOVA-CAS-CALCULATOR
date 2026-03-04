import type {
  MatrixRequest,
  MatrixResponse,
} from '../types/calculator';
import { formatNumber, matrixToLatex, scalarToLatex } from './format';

function cloneMatrix(matrix: number[][]) {
  return matrix.map((row) => [...row]);
}

function isRectangular(matrix: number[][]) {
  if (matrix.length === 0) {
    return false;
  }

  const width = matrix[0].length;
  return width > 0 && matrix.every((row) => row.length === width);
}

function sameShape(a: number[][], b: number[][]) {
  return a.length === b.length && a[0]?.length === b[0]?.length;
}

function isSquare(matrix: number[][]) {
  return matrix.length > 0 && matrix.length === matrix[0]?.length;
}

function addOrSubtract(a: number[][], b: number[][], sign: 1 | -1) {
  return a.map((row, rowIndex) =>
    row.map((value, columnIndex) => value + sign * b[rowIndex][columnIndex]),
  );
}

function multiply(a: number[][], b: number[][]) {
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

function transpose(matrix: number[][]) {
  return matrix[0].map((_, columnIndex) =>
    matrix.map((row) => row[columnIndex]),
  );
}

function determinant(matrix: number[][]): number {
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
    sum += (column % 2 === 0 ? 1 : -1) * matrix[0][column] * determinant(minor);
  }
  return sum;
}

function inverse(matrix: number[][]) {
  if (!isSquare(matrix)) {
    return null;
  }

  const size = matrix.length;
  const augmented = matrix.map((row, rowIndex) => [
    ...row,
    ...Array.from({ length: size }, (_, index) => (index === rowIndex ? 1 : 0)),
  ]);

  for (let pivot = 0; pivot < size; pivot += 1) {
    let pivotRow = pivot;
    while (pivotRow < size && Math.abs(augmented[pivotRow][pivot]) < 1e-10) {
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

export function solveLinearSystem(coefficients: number[][], constants: number[]) {
  if (!isRectangular(coefficients) || coefficients.length !== constants.length) {
    return null;
  }

  const size = coefficients.length;
  const augmented = coefficients.map((row, rowIndex) => [...row, constants[rowIndex]]);

  for (let pivot = 0; pivot < size; pivot += 1) {
    let pivotRow = pivot;
    while (pivotRow < size && Math.abs(augmented[pivotRow][pivot]) < 1e-10) {
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

export function runMatrixOperation(req: MatrixRequest): MatrixResponse {
  const { matrixA, matrixB } = req;

  if (!isRectangular(matrixA)) {
    return {
      warnings: [],
      error: 'Matrix A is incomplete.',
    };
  }

  if (
    ['add', 'subtract', 'multiply'].includes(req.operation) &&
    (!matrixB || !isRectangular(matrixB))
  ) {
    return {
      warnings: [],
      error: 'Matrix B is incomplete.',
    };
  }

  if (
    ['add', 'subtract'].includes(req.operation) &&
    matrixB &&
    !sameShape(matrixA, matrixB)
  ) {
    return {
      warnings: [],
      error: 'Addition and subtraction require matching matrix dimensions.',
    };
  }

  if (req.operation === 'multiply' && matrixB && matrixA[0].length !== matrixB.length) {
    return {
      warnings: [],
      error: 'Matrix multiplication requires A columns to match B rows.',
    };
  }

  switch (req.operation) {
    case 'add':
      return {
        resultLatex: matrixToLatex(addOrSubtract(matrixA, matrixB!, 1)),
        warnings: [],
      };
    case 'subtract':
      return {
        resultLatex: matrixToLatex(addOrSubtract(matrixA, matrixB!, -1)),
        warnings: [],
      };
    case 'multiply':
      return {
        resultLatex: matrixToLatex(multiply(matrixA, matrixB!)),
        warnings: [],
      };
    case 'transposeA':
      return {
        resultLatex: matrixToLatex(transpose(matrixA)),
        warnings: [],
      };
    case 'transposeB':
      return matrixB
        ? {
            resultLatex: matrixToLatex(transpose(matrixB)),
            warnings: [],
          }
        : { warnings: [], error: 'Matrix B is incomplete.' };
    case 'detA':
      if (!isSquare(matrixA)) {
        return {
          warnings: [],
          error: 'det(A) requires a square matrix.',
        };
      }
      return {
        resultLatex: scalarToLatex(determinant(matrixA)),
        approxText: formatNumber(determinant(matrixA)),
        warnings: [],
      };
    case 'detB':
      if (!matrixB || !isSquare(matrixB)) {
        return {
          warnings: [],
          error: 'det(B) requires a square Matrix B.',
        };
      }
      return {
        resultLatex: scalarToLatex(determinant(matrixB)),
        approxText: formatNumber(determinant(matrixB)),
        warnings: [],
      };
    case 'inverseA': {
      const result = inverse(cloneMatrix(matrixA));
      return result
        ? {
            resultLatex: matrixToLatex(result),
            warnings: [],
          }
        : {
            warnings: [],
            error: 'Matrix A is singular or not square.',
          };
    }
    case 'inverseB': {
      if (!matrixB) {
        return {
          warnings: [],
          error: 'Matrix B is incomplete.',
        };
      }
      const result = inverse(cloneMatrix(matrixB));
      return result
        ? {
            resultLatex: matrixToLatex(result),
            warnings: [],
          }
        : {
            warnings: [],
            error: 'Matrix B is singular or not square.',
          };
    }
    default:
      return {
        warnings: [],
        error: 'Unsupported matrix operation.',
      };
  }
}
