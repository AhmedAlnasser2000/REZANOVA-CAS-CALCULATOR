import type {
  LinearAlgebraScalarDomain,
  LinearAlgebraScalarWireV1,
  MatrixResponse,
  ScalarMatrixRequestV1,
} from '../../types/calculator';
import { profileLinearAlgebraResult } from '../display/printer';
import {
  attachLinearAlgebraCanonicalEvidence,
  canonicalLeafEvidence,
  type LinearAlgebraCanonicalEvidence,
  type LinearAlgebraCanonicalLeafEvidence,
} from './canonical-evidence';
import {
  symbolicScalarAdd,
  symbolicScalarApproxText,
  symbolicScalarConjugate,
  symbolicScalarDivide,
  symbolicScalarFromMathJson,
  symbolicScalarMultiply,
  symbolicScalarNegate,
  symbolicScalarSubtract,
  symbolicScalarZeroStatus,
} from './symbolic-scalar-core';
import { runSymbolicMatrixSystemsOperation } from './symbolic-matrix-systems';

export type SymbolicMatrix = LinearAlgebraScalarWireV1[][];

const MAX_SYMBOLIC_MATRIX_DIMENSION = 8;
const MAX_DETERMINANT_DIMENSION = 4;
const MAX_INVERSE_DIMENSION = 3;
const MAX_MATRIX_POWER_EXPONENT = 12;

function scalarFromNode(node: unknown, domain: LinearAlgebraScalarDomain) {
  const result = symbolicScalarFromMathJson(node, domain);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

function zero(domain: LinearAlgebraScalarDomain) {
  return scalarFromNode(0, domain);
}

function one(domain: LinearAlgebraScalarDomain) {
  return scalarFromNode(1, domain);
}

export function symbolicMatrixMathJson(matrix: SymbolicMatrix) {
  return ['Matrix', ['List', ...matrix.map((row) => [
    'List',
    ...row.map((value) => value.mathJson),
  ])], "'[]'"];
}

export function symbolicMatrixLatex(matrix: SymbolicMatrix) {
  return `\\begin{bmatrix}${matrix
    .map((row) => row.map((value) => value.canonicalLatex).join('&'))
    .join('\\\\')}\\end{bmatrix}`;
}

function errorResponse(error: string): MatrixResponse {
  return { warnings: [], error };
}

function responseWithEvidence(
  response: MatrixResponse,
  evidence: LinearAlgebraCanonicalEvidence,
) {
  return attachLinearAlgebraCanonicalEvidence(profileLinearAlgebraResult(response), evidence);
}

function matrixResponse(input: {
  matrix: SymbolicMatrix;
  source: string;
  supplements?: LinearAlgebraCanonicalEvidence['supplements'];
}) {
  const resultLatex = symbolicMatrixLatex(input.matrix);
  return responseWithEvidence({
    resultLatex,
    ...(input.supplements?.length
      ? { exactSupplementLatex: input.supplements.map((entry) => entry.canonicalLatex) }
      : {}),
    warnings: [],
  }, {
    primary: canonicalLeafEvidence(
      resultLatex,
      symbolicMatrixMathJson(input.matrix),
      input.source,
    ),
    ...(input.supplements?.length ? { supplements: input.supplements } : {}),
  });
}

function scalarResponse(input: {
  value: LinearAlgebraScalarWireV1;
  source: string;
  request: ScalarMatrixRequestV1;
}) {
  return responseWithEvidence({
    resultLatex: input.value.canonicalLatex,
    approxText: symbolicScalarApproxText(
      input.value,
      input.request.complexExactForm ?? 'rectangular',
    ),
    warnings: [],
  }, {
    primary: canonicalLeafEvidence(
      input.value.canonicalLatex,
      input.value.mathJson,
      input.source,
    ),
  });
}

function validateMatrix(matrix: SymbolicMatrix | undefined, name: string) {
  if (!matrix?.length || !matrix[0]?.length) return `${name} is required for this operation.`;
  const columns = matrix[0].length;
  if (matrix.some((row) => row.length !== columns)) return `${name} must be rectangular.`;
  if (matrix.length > MAX_SYMBOLIC_MATRIX_DIMENSION || columns > MAX_SYMBOLIC_MATRIX_DIMENSION) {
    return `Symbolic Matrix operations support dimensions through ${MAX_SYMBOLIC_MATRIX_DIMENSION} by ${MAX_SYMBOLIC_MATRIX_DIMENSION}.`;
  }
  return null;
}

function sameShape(left: SymbolicMatrix, right: SymbolicMatrix) {
  return left.length === right.length && left[0]?.length === right[0]?.length;
}

function square(matrix: SymbolicMatrix) {
  return matrix.length === matrix[0]?.length;
}

export function addSymbolicMatrices(
  left: SymbolicMatrix,
  right: SymbolicMatrix,
  domain: LinearAlgebraScalarDomain,
) {
  if (!sameShape(left, right)) return null;
  return left.map((row, rowIndex) => row.map((value, columnIndex) =>
    symbolicScalarAdd(value, right[rowIndex][columnIndex], domain)));
}

export function subtractSymbolicMatrices(
  left: SymbolicMatrix,
  right: SymbolicMatrix,
  domain: LinearAlgebraScalarDomain,
) {
  if (!sameShape(left, right)) return null;
  return left.map((row, rowIndex) => row.map((value, columnIndex) =>
    symbolicScalarSubtract(value, right[rowIndex][columnIndex], domain)));
}

export function multiplySymbolicMatrices(
  left: SymbolicMatrix,
  right: SymbolicMatrix,
  domain: LinearAlgebraScalarDomain,
) {
  if (left[0]?.length !== right.length) return null;
  return left.map((row) => right[0].map((_, columnIndex) => row.reduce(
    (total, value, innerIndex) => symbolicScalarAdd(
      total,
      symbolicScalarMultiply(value, right[innerIndex][columnIndex], domain),
      domain,
    ),
    zero(domain),
  )));
}

export function transposeSymbolicMatrix(matrix: SymbolicMatrix) {
  return matrix[0].map((_, columnIndex) => matrix.map((row) => row[columnIndex]));
}

export function adjointSymbolicMatrix(
  matrix: SymbolicMatrix,
  domain: LinearAlgebraScalarDomain,
) {
  return transposeSymbolicMatrix(matrix).map((row) =>
    row.map((value) => symbolicScalarConjugate(value, domain)));
}

function minor(matrix: SymbolicMatrix, row: number, column: number) {
  return matrix
    .filter((_, rowIndex) => rowIndex !== row)
    .map((entry) => entry.filter((_, columnIndex) => columnIndex !== column));
}

export function determinantSymbolicMatrix(
  matrix: SymbolicMatrix,
  domain: LinearAlgebraScalarDomain,
): LinearAlgebraScalarWireV1 {
  if (matrix.length === 1) return matrix[0][0];
  if (matrix.length === 2) {
    return symbolicScalarSubtract(
      symbolicScalarMultiply(matrix[0][0], matrix[1][1], domain),
      symbolicScalarMultiply(matrix[0][1], matrix[1][0], domain),
      domain,
    );
  }
  return matrix[0].reduce((total, value, columnIndex) => {
    const term = symbolicScalarMultiply(
      value,
      determinantSymbolicMatrix(minor(matrix, 0, columnIndex), domain),
      domain,
    );
    return symbolicScalarAdd(
      total,
      columnIndex % 2 === 0 ? term : symbolicScalarNegate(term, domain),
      domain,
    );
  }, zero(domain));
}

function determinantRequirement(
  determinant: LinearAlgebraScalarWireV1,
  source: string,
):
  | { ok: true; supplements: LinearAlgebraCanonicalLeafEvidence[] }
  | { ok: false; error: string } {
  const status = symbolicScalarZeroStatus(determinant);
  if (status === 'zero') {
    return {
      ok: false,
      error: 'This Matrix is singular, so the requested inverse or negative power does not exist.',
    };
  }
  if (status === 'nonzero') return { ok: true, supplements: [] };
  const mathJson = ['NotEqual', determinant.mathJson, 0];
  return {
    ok: true,
    supplements: [canonicalLeafEvidence(
      `${determinant.canonicalLatex}\\ne0`,
      mathJson,
      source,
    )],
  } as const;
}

export function inverseSymbolicMatrix(
  matrix: SymbolicMatrix,
  domain: LinearAlgebraScalarDomain,
):
  | {
      ok: true;
      matrix: SymbolicMatrix;
      determinant: LinearAlgebraScalarWireV1;
      supplements: LinearAlgebraCanonicalLeafEvidence[];
    }
  | { ok: false; error: string } {
  const determinant = determinantSymbolicMatrix(matrix, domain);
  const requirement = determinantRequirement(
    determinant,
    'matrix.symbolic.inverse.native-determinant-condition',
  );
  if (!requirement.ok) return requirement;
  if (matrix.length === 1) {
    return {
      ok: true,
      matrix: [[symbolicScalarDivide(one(domain), matrix[0][0], domain)]],
      determinant,
      supplements: requirement.supplements,
    };
  }
  const cofactors = matrix.map((row, rowIndex) => row.map((_, columnIndex) => {
    const value = determinantSymbolicMatrix(minor(matrix, rowIndex, columnIndex), domain);
    return (rowIndex + columnIndex) % 2 === 0
      ? value
      : symbolicScalarNegate(value, domain);
  }));
  return {
    ok: true,
    matrix: transposeSymbolicMatrix(cofactors).map((row) =>
      row.map((value) => symbolicScalarDivide(value, determinant, domain))),
    determinant,
    supplements: requirement.supplements,
  };
}

function identityMatrix(size: number, domain: LinearAlgebraScalarDomain) {
  return Array.from({ length: size }, (_, rowIndex) =>
    Array.from({ length: size }, (_, columnIndex) =>
      rowIndex === columnIndex ? one(domain) : zero(domain)));
}

function nonnegativePower(
  matrix: SymbolicMatrix,
  exponent: number,
  domain: LinearAlgebraScalarDomain,
) {
  let result = identityMatrix(matrix.length, domain);
  let factor = matrix;
  let remaining = exponent;
  while (remaining > 0) {
    if (remaining % 2 === 1) result = multiplySymbolicMatrices(result, factor, domain)!;
    remaining = Math.floor(remaining / 2);
    if (remaining > 0) factor = multiplySymbolicMatrices(factor, factor, domain)!;
  }
  return result;
}

function powerResponse(
  matrix: SymbolicMatrix,
  request: ScalarMatrixRequestV1,
  source: string,
) {
  const exponent = request.matrixPowerExponent;
  if (!Number.isInteger(exponent) || Math.abs(exponent ?? 0) > MAX_MATRIX_POWER_EXPONENT) {
    return errorResponse(`Matrix powers require a literal integer n with |n| <= ${MAX_MATRIX_POWER_EXPONENT}.`);
  }
  if (!square(matrix)) return errorResponse('Matrix powers require a square matrix.');
  if (exponent! >= 0) {
    if (matrix.length > MAX_DETERMINANT_DIMENSION) {
      return errorResponse(`Nonnegative symbolic Matrix powers support dimensions through ${MAX_DETERMINANT_DIMENSION} by ${MAX_DETERMINANT_DIMENSION}.`);
    }
    return matrixResponse({
      matrix: nonnegativePower(matrix, exponent!, request.domain ?? 'real'),
      source,
    });
  }
  if (matrix.length > MAX_INVERSE_DIMENSION) {
    return errorResponse(`Negative symbolic Matrix powers support dimensions through ${MAX_INVERSE_DIMENSION} by ${MAX_INVERSE_DIMENSION}.`);
  }
  const inverse = inverseSymbolicMatrix(matrix, request.domain ?? 'real');
  if (!inverse.ok) return errorResponse(inverse.error);
  return matrixResponse({
    matrix: nonnegativePower(inverse.matrix, Math.abs(exponent!), request.domain ?? 'real'),
    source,
    supplements: inverse.supplements,
  });
}

function targetMatrix(request: ScalarMatrixRequestV1) {
  return request.operation.endsWith('B') ? request.matrixB?.resolved : request.matrixA.resolved;
}

export function runSymbolicMatrixOperation(request: ScalarMatrixRequestV1): MatrixResponse {
  const domain = request.domain ?? 'real';
  const matrixA = request.matrixA.resolved;
  const matrixB = request.matrixB?.resolved;
  const validationError = validateMatrix(matrixA, 'Matrix A')
    ?? (matrixB ? validateMatrix(matrixB, 'Matrix B') : null);
  if (validationError) return errorResponse(validationError);

  try {
    if (request.operation === 'add' || request.operation === 'subtract') {
      if (!matrixB) return errorResponse('Matrix B is required for this operation.');
      const result = request.operation === 'add'
        ? addSymbolicMatrices(matrixA, matrixB, domain)
        : subtractSymbolicMatrices(matrixA, matrixB, domain);
      return result
        ? matrixResponse({ matrix: result, source: `matrix.${request.operation}.native-symbolic-matrix` })
        : errorResponse('Addition and subtraction require matching matrix dimensions.');
    }
    if (request.operation === 'multiply') {
      if (!matrixB) return errorResponse('Matrix B is required for multiplication.');
      const result = multiplySymbolicMatrices(matrixA, matrixB, domain);
      return result
        ? matrixResponse({ matrix: result, source: 'matrix.multiply.native-symbolic-matrix' })
        : errorResponse('Matrix multiplication requires A columns to match B rows.');
    }
    if (request.operation === 'transposeA' || request.operation === 'transposeB') {
      const matrix = targetMatrix(request);
      return matrix
        ? matrixResponse({
            matrix: transposeSymbolicMatrix(matrix),
            source: `matrix.${request.operation}.native-symbolic-transpose`,
          })
        : errorResponse('Matrix B is required for this operation.');
    }
    if (request.operation === 'adjointA' || request.operation === 'adjointB') {
      const matrix = targetMatrix(request);
      return matrix
        ? matrixResponse({
            matrix: adjointSymbolicMatrix(matrix, domain),
            source: `matrix.${request.operation}.native-symbolic-adjoint`,
          })
        : errorResponse('Matrix B is required for this operation.');
    }
    if (request.operation === 'detA' || request.operation === 'detB') {
      const matrix = targetMatrix(request);
      if (!matrix) return errorResponse('Matrix B is required for this operation.');
      if (!square(matrix)) return errorResponse('Determinant requires a square matrix.');
      if (matrix.length > MAX_DETERMINANT_DIMENSION) {
        return errorResponse(`Symbolic determinants support dimensions through ${MAX_DETERMINANT_DIMENSION} by ${MAX_DETERMINANT_DIMENSION}.`);
      }
      return scalarResponse({
        value: determinantSymbolicMatrix(matrix, domain),
        source: `matrix.${request.operation}.native-symbolic-determinant`,
        request,
      });
    }
    if (request.operation === 'inverseA' || request.operation === 'inverseB') {
      const matrix = targetMatrix(request);
      if (!matrix) return errorResponse('Matrix B is required for this operation.');
      if (!square(matrix)) return errorResponse('Inverse requires a square matrix.');
      if (matrix.length > MAX_INVERSE_DIMENSION) {
        return errorResponse(`Symbolic inverses support dimensions through ${MAX_INVERSE_DIMENSION} by ${MAX_INVERSE_DIMENSION}.`);
      }
      const inverse = inverseSymbolicMatrix(matrix, domain);
      return !inverse.ok
        ? errorResponse(inverse.error)
        : matrixResponse({
            matrix: inverse.matrix,
            source: `matrix.${request.operation}.native-symbolic-inverse`,
            supplements: inverse.supplements,
          });
    }
    if (request.operation === 'spectralPowerA' || request.operation === 'spectralPowerB') {
      const matrix = targetMatrix(request);
      return matrix
        ? powerResponse(matrix, request, `matrix.${request.operation}.native-symbolic-integer-power`)
        : errorResponse('Matrix B is required for this operation.');
    }
    const systemsResponse = runSymbolicMatrixSystemsOperation(request);
    if (systemsResponse) return systemsResponse;
    if ([
      'qrA', 'qrB', 'columnProjectionA', 'columnProjectionB',
      'leastSquaresA', 'leastSquaresB', 'svdA', 'svdB',
      'pinvA', 'pinvB', 'condA', 'condB', 'nrankA', 'nrankB',
      'definiteA', 'definiteB',
    ].includes(request.operation)) {
      return errorResponse('This engineering route remains Real numeric; use finite real entries with no formal parameters.');
    }
  } catch (error) {
    return errorResponse(error instanceof Error
      ? error.message
      : 'This symbolic Matrix expression exceeded the bounded arithmetic policy.');
  }

  return errorResponse('This symbolic Matrix route belongs to the bounded systems or spectral milestone.');
}
