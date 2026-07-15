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
} from './canonical-evidence';
import {
  caseConditionMathJson,
  classifySymbolicRref,
  classifySymbolicSystem,
  conditionsForCases,
  nullSpaceBasisForCase,
  predicateMathJson,
  solutionMatrixForCase,
  symbolicCasesMathJson,
  symbolicMathJsonLatex,
  type SymbolicRrefCase,
  type SymbolicSystemCase,
} from './symbolic-elimination';
import type { SymbolicMatrix } from './symbolic-matrix';
import {
  symbolicScalarDivide,
  symbolicScalarFromMathJson,
  symbolicScalarMultiply,
  symbolicScalarSubtract,
  symbolicScalarZeroStatus,
} from './symbolic-scalar-core';
import { parseLinearAlgebraScalarWire } from './scalar-wire';

const SYSTEM_OPERATIONS = new Set<ScalarMatrixRequestV1['operation']>([
  'rankA', 'rankB', 'rrefA', 'rrefB',
  'nullSpaceA', 'nullSpaceB', 'columnSpaceA', 'columnSpaceB',
  'basisA', 'basisB', 'invertibilityA', 'invertibilityB',
  'profileA', 'profileB', 'coordinatesA', 'coordinatesB', 'changeBasis',
  'luA', 'luB', 'pluA', 'pluB', 'luSolveA', 'luSolveB',
  'pluSolveA', 'pluSolveB', 'multiRhsSolve', 'linearSystem',
]);

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

function matrixMathJson(matrix: SymbolicMatrix) {
  return ['Matrix', ['List', ...matrix.map((row) => [
    'List',
    ...row.map((value) => value.mathJson),
  ])], "'[]'"];
}

function vectorMathJson(vector: readonly LinearAlgebraScalarWireV1[]) {
  return matrixMathJson(vector.map((value) => [value]));
}

function vectorSetMathJson(vectors: readonly (readonly LinearAlgebraScalarWireV1[])[]) {
  return vectors.length ? ['Set', ...vectors.map(vectorMathJson)] : 'EmptySet';
}

function responseWithEvidence(
  response: MatrixResponse,
  evidence: LinearAlgebraCanonicalEvidence,
) {
  return attachLinearAlgebraCanonicalEvidence(profileLinearAlgebraResult(response), evidence);
}

function errorResponse(error: string): MatrixResponse {
  return { warnings: [], error };
}

function mathResponse(input: {
  mathJson: unknown;
  source: string;
  semanticPrimary?: LinearAlgebraCanonicalEvidence['semanticPrimary'];
  supplements?: LinearAlgebraCanonicalEvidence['supplements'];
}) {
  const resultLatex = symbolicMathJsonLatex(input.mathJson);
  return responseWithEvidence({
    resultLatex,
    ...(input.supplements?.length
      ? { exactSupplementLatex: input.supplements.map((entry) => entry.canonicalLatex) }
      : {}),
    warnings: [],
  }, {
    ...(input.semanticPrimary
      ? { semanticPrimary: input.semanticPrimary }
      : { primary: canonicalLeafEvidence(resultLatex, input.mathJson, input.source) }),
    ...(input.supplements?.length ? { supplements: input.supplements } : {}),
  });
}

function targetMatrix(request: ScalarMatrixRequestV1) {
  return request.operation.endsWith('B') ? request.matrixB?.resolved : request.matrixA.resolved;
}

function uniqueCaseValue<T extends SymbolicRrefCase>(
  cases: readonly T[],
  value: (entry: T) => unknown,
) {
  const values = cases.map((entry) => value(entry));
  const first = JSON.stringify(values[0]);
  return values.every((entry) => JSON.stringify(entry) === first)
    ? values[0]
    : symbolicCasesMathJson(cases, value);
}

function conditionsAsSupplements(cases: readonly SymbolicRrefCase[], source: string) {
  return conditionsForCases(cases).map((predicate, index) => {
    const mathJson = predicateMathJson(predicate);
    return canonicalLeafEvidence(
      symbolicMathJsonLatex(mathJson),
      mathJson,
      `${source}.predicate-${index + 1}`,
    );
  });
}

function matrixClassificationResponse(
  request: ScalarMatrixRequestV1,
  matrix: SymbolicMatrix,
) {
  const domain = request.domain ?? 'real';
  const classified = classifySymbolicRref(matrix, domain);
  if (!classified.ok) return errorResponse(classified.error);
  const operation = request.operation;
  const source = `matrix.${operation}.native-symbolic-elimination`;
  const rows = matrix.length;
  const columns = matrix[0].length;

  if (operation === 'rankA' || operation === 'rankB') {
    return mathResponse({
      mathJson: uniqueCaseValue(classified.cases, (entry) => entry.pivotColumns.length),
      source,
    });
  }
  if (operation === 'rrefA' || operation === 'rrefB') {
    return mathResponse({
      mathJson: uniqueCaseValue(classified.cases, (entry) => matrixMathJson(entry.matrix)),
      source,
    });
  }
  if (operation === 'nullSpaceA' || operation === 'nullSpaceB') {
    return mathResponse({
      mathJson: uniqueCaseValue(classified.cases, (entry) => vectorSetMathJson(
        nullSpaceBasisForCase(entry, columns, domain),
      )),
      source,
    });
  }
  if (operation === 'columnSpaceA' || operation === 'columnSpaceB') {
    return mathResponse({
      mathJson: uniqueCaseValue(classified.cases, (entry) => vectorSetMathJson(
        entry.pivotColumns.map((column) => matrix.map((row) => row[column])),
      )),
      source,
    });
  }
  if (operation === 'basisA' || operation === 'basisB') {
    return mathResponse({
      mathJson: uniqueCaseValue(classified.cases, (entry) =>
        rows === columns && entry.pivotColumns.length === rows ? 'True' : 'False'),
      source,
    });
  }
  if (operation === 'invertibilityA' || operation === 'invertibilityB') {
    if (rows !== columns) {
      return errorResponse('Invertibility applies only to square matrices; use profile for a rectangular symbolic matrix.');
    }
    return mathResponse({
      mathJson: uniqueCaseValue(classified.cases, (entry) =>
        entry.pivotColumns.length === rows ? 'True' : 'False'),
      source,
    });
  }
  if (operation === 'profileA' || operation === 'profileB') {
    const ranks = new Set(classified.cases.map((entry) => entry.pivotColumns.length));
    if (ranks.size === 1) {
      const rank = classified.cases[0].pivotColumns.length;
      return mathResponse({
        mathJson: ['Tuple', columns, rows, rank, columns - rank],
        source,
        semanticPrimary: {
          kind: 'linear-map-profile',
          operand: canonicalLeafEvidence(
            symbolicMathJsonLatex(matrixMathJson(matrix)),
            matrixMathJson(matrix),
            `${source}.operand`,
          ),
          domainDimension: columns,
          codomainDimension: rows,
          rank,
          nullity: columns - rank,
        },
      });
    }
    return mathResponse({
      mathJson: symbolicCasesMathJson(classified.cases, (entry) => [
        'Tuple',
        entry.pivotColumns.length,
        columns - entry.pivotColumns.length,
      ]),
      source,
    });
  }
  return null;
}

function rhsVectorMatrix(request: ScalarMatrixRequestV1) {
  return request.systemRhs?.resolved.map((value) => [value]);
}

function systemOperands(request: ScalarMatrixRequestV1) {
  if (request.operation === 'linearSystem') {
    return { coefficients: request.matrixA.resolved, rhs: rhsVectorMatrix(request) };
  }
  if (request.operation === 'multiRhsSolve') {
    return { coefficients: request.matrixA.resolved, rhs: request.matrixB?.resolved };
  }
  if (request.operation === 'changeBasis') {
    return { coefficients: request.matrixB?.resolved, rhs: request.matrixA.resolved };
  }
  if (request.operation === 'coordinatesA' || request.operation === 'coordinatesB') {
    return { coefficients: targetMatrix(request), rhs: request.coordinateVector?.resolved.map((value) => [value]) };
  }
  if (
    request.operation === 'luSolveA' || request.operation === 'luSolveB'
    || request.operation === 'pluSolveA' || request.operation === 'pluSolveB'
  ) {
    return { coefficients: targetMatrix(request), rhs: rhsVectorMatrix(request) };
  }
  return null;
}

function identifierNode(name: string, domain: LinearAlgebraScalarDomain): unknown {
  const parsed = parseLinearAlgebraScalarWire(name, domain);
  if (!parsed.ok) throw new Error(`Invalid system unknown ${name}: ${parsed.error}`);
  const node = parsed.value.mathJson;
  if (
    (typeof node === 'string'
      && !node.startsWith("'")
      && !['ImaginaryUnit', 'Pi', 'ExponentialE', 'Infinity'].includes(node))
    || (Array.isArray(node) && node[0] === 'Subscript')
  ) return node;
  throw new Error(`${name} is reserved and cannot be used as a system unknown.`);
}

function systemUnknownNode(request: ScalarMatrixRequestV1, unknowns: number, rhsColumns: number) {
  const domain = request.domain ?? 'real';
  if (rhsColumns > 1) return identifierNode(request.systemUnknownVectorName ?? 'X', domain);
  if (request.systemUnknowns?.length === unknowns) {
    return ['Matrix', ['List', ...request.systemUnknowns.map((name) => [
      'List',
      identifierNode(name, domain),
    ])], "'[]'"];
  }
  return identifierNode(request.systemUnknownVectorName ?? 'x', domain);
}

function solutionSetMathJson(
  entry: SymbolicSystemCase,
  request: ScalarMatrixRequestV1,
  coefficients?: SymbolicMatrix,
  rhs?: SymbolicMatrix,
) {
  if (entry.inconsistent) return 'EmptySet';
  if (entry.implicitSolution && coefficients && rhs) {
    const unknown = systemUnknownNode(
      request,
      entry.coefficientColumns,
      entry.rhsColumns,
    );
    return ['Set', ['Equal', ['Multiply', matrixMathJson(coefficients), unknown], matrixMathJson(rhs)]];
  }
  const solution = solutionMatrixForCase(entry, request.domain ?? 'real');
  if (!solution) return 'EmptySet';
  return ['Set', [
    'Equal',
    systemUnknownNode(request, entry.coefficientColumns, entry.rhsColumns),
    matrixMathJson(solution),
  ]];
}

function systemResponse(request: ScalarMatrixRequestV1) {
  const operands = systemOperands(request);
  if (!operands) return null;
  if (!operands.coefficients || !operands.rhs) {
    return errorResponse('This symbolic solve route requires both a coefficient matrix and a right-hand side.');
  }
  const classified = classifySymbolicSystem(
    operands.coefficients,
    operands.rhs,
    request.domain ?? 'real',
  );
  if (!classified.ok) return errorResponse(classified.error);
  const source = `matrix.${request.operation}.native-symbolic-system-classification`;
  return mathResponse({
    mathJson: uniqueCaseValue(classified.cases, (entry) => solutionSetMathJson(
      entry,
      request,
      operands.coefficients,
      operands.rhs,
    )),
    source,
  });
}

type SymbolicFactorization = {
  permutation: SymbolicMatrix;
  lower: SymbolicMatrix;
  upper: SymbolicMatrix;
  conditions: LinearAlgebraCanonicalEvidence['supplements'];
};

function swapRows<T>(matrix: T[][], first: number, second: number) {
  [matrix[first], matrix[second]] = [matrix[second], matrix[first]];
}

function symbolicPlu(
  input: SymbolicMatrix,
  domain: LinearAlgebraScalarDomain,
  allowPivot: boolean,
): SymbolicFactorization | { error: string } {
  if (input.length !== input[0]?.length) return { error: 'Symbolic LU and PLU require a square matrix.' };
  if (input.length > 3) return { error: 'Symbolic LU and PLU support matrices through 3 by 3.' };
  const size = input.length;
  const upper = input.map((row) => [...row]);
  const lower = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => row === column ? one(domain) : zero(domain)));
  const permutation = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => row === column ? one(domain) : zero(domain)));
  const conditions: NonNullable<LinearAlgebraCanonicalEvidence['supplements']> = [];

  for (let column = 0; column < size; column += 1) {
    let pivotRow = column;
    if (symbolicScalarZeroStatus(upper[pivotRow][column]) === 'zero') {
      const replacement = Array.from({ length: size - column - 1 }, (_, index) => column + 1 + index)
        .find((row) => symbolicScalarZeroStatus(upper[row][column]) !== 'zero');
      if (replacement === undefined) continue;
      if (!allowPivot) return { error: 'LU needs a nonzero leading pivot here; use PLU for row pivoting.' };
      pivotRow = replacement;
    }
    if (pivotRow !== column) {
      swapRows(upper, pivotRow, column);
      swapRows(permutation, pivotRow, column);
      for (let previous = 0; previous < column; previous += 1) {
        [lower[pivotRow][previous], lower[column][previous]] = [
          lower[column][previous],
          lower[pivotRow][previous],
        ];
      }
    }
    const pivot = upper[column][column];
    const status = symbolicScalarZeroStatus(pivot);
    if (status === 'zero') continue;
    if (status === 'unknown') {
      const condition = ['NotEqual', pivot.mathJson, 0];
      conditions.push(canonicalLeafEvidence(
        symbolicMathJsonLatex(condition),
        condition,
        `matrix.symbolic-${allowPivot ? 'plu' : 'lu'}.pivot-${column + 1}`,
      ));
    }
    for (let row = column + 1; row < size; row += 1) {
      const factor = symbolicScalarDivide(upper[row][column], pivot, domain);
      lower[row][column] = factor;
      upper[row] = upper[row].map((value, entryColumn) => symbolicScalarSubtract(
        value,
        symbolicScalarMultiply(factor, upper[column][entryColumn], domain),
        domain,
      ));
    }
  }
  return { permutation, lower, upper, conditions };
}

function factorizationResponse(request: ScalarMatrixRequestV1) {
  if (!request.operation.startsWith('lu') && !request.operation.startsWith('plu')) return null;
  if (request.operation.includes('Solve')) return null;
  const matrix = targetMatrix(request);
  if (!matrix) return errorResponse('Matrix B is required for this factorization.');
  const allowPivot = request.operation.startsWith('plu');
  const factorization = symbolicPlu(matrix, request.domain ?? 'real', allowPivot);
  if ('error' in factorization) return errorResponse(factorization.error);
  const mathJson = allowPivot
    ? ['Tuple', matrixMathJson(factorization.permutation), matrixMathJson(factorization.lower), matrixMathJson(factorization.upper)]
    : ['Tuple', matrixMathJson(factorization.lower), matrixMathJson(factorization.upper)];
  return mathResponse({
    mathJson,
    source: `matrix.${request.operation}.native-symbolic-factorization`,
    supplements: factorization.conditions,
  });
}

export function runSymbolicMatrixSystemsOperation(
  request: ScalarMatrixRequestV1,
): MatrixResponse | null {
  if (!SYSTEM_OPERATIONS.has(request.operation)) return null;
  try {
    const system = systemResponse(request);
    if (system) return system;
    const factorization = factorizationResponse(request);
    if (factorization) return factorization;
    const matrix = targetMatrix(request);
    if (!matrix) return errorResponse('Matrix B is required for this symbolic operation.');
    return matrixClassificationResponse(request, matrix)
      ?? errorResponse('This symbolic Matrix systems route is not available.');
  } catch (error) {
    return errorResponse(error instanceof Error
      ? error.message
      : 'Symbolic Matrix classification exceeded its bounded policy.');
  }
}

export const symbolicMatrixSystemsTesting = {
  caseConditionMathJson,
  conditionsAsSupplements,
  solutionSetMathJson,
};
