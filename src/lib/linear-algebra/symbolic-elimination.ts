import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  LinearAlgebraScalarDomain,
  LinearAlgebraScalarWireV1,
} from '../../types/calculator';
import {
  symbolicScalarAdd,
  symbolicScalarConjugate,
  symbolicScalarDivide,
  symbolicScalarFromMathJson,
  symbolicScalarMultiply,
  symbolicScalarNegate,
  symbolicScalarSubtract,
  symbolicScalarZeroStatus,
} from './symbolic-scalar-core';
import type { SymbolicMatrix } from './symbolic-matrix';

const ce = new ComputeEngine();

export const SYMBOLIC_ELIMINATION_LIMITS = {
  rows: 3,
  columns: 3,
  parameters: 6,
  predicates: 4,
  cases: 16,
} as const;

export type SymbolicZeroPredicate = {
  value: LinearAlgebraScalarWireV1;
  relation: 'zero' | 'nonzero';
};

export type SymbolicRrefCase = {
  conditions: SymbolicZeroPredicate[];
  matrix: SymbolicMatrix;
  pivotColumns: number[];
};

export type SymbolicEliminationResult =
  | { ok: true; cases: SymbolicRrefCase[]; parameterCount: number }
  | { ok: false; error: string };

export type SymbolicSystemCase = SymbolicRrefCase & {
  coefficientColumns: number;
  rhsColumns: number;
  inconsistent: boolean;
  implicitSolution?: boolean;
};

export type SymbolicSystemResult =
  | { ok: true; cases: SymbolicSystemCase[]; parameterCount: number }
  | { ok: false; error: string };

const CONSTANT_SYMBOLS = new Set([
  'CatalanConstant',
  'ExponentialE',
  'GoldenRatio',
  'ImaginaryUnit',
  'Infinity',
  'MachineEpsilon',
  'Pi',
  'True',
  'False',
  'Undefined',
  'Nothing',
]);

function scalarFromMathJson(value: unknown, domain: LinearAlgebraScalarDomain) {
  const result = symbolicScalarFromMathJson(value, domain);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

function zero(domain: LinearAlgebraScalarDomain) {
  return scalarFromMathJson(0, domain);
}

function one(domain: LinearAlgebraScalarDomain) {
  return scalarFromMathJson(1, domain);
}

function cloneMatrix(matrix: SymbolicMatrix): SymbolicMatrix {
  return matrix.map((row) => row.map((value) => structuredClone(value)));
}

function stableKey(value: unknown): string {
  return JSON.stringify(value);
}

function sameNode(left: unknown, right: unknown) {
  return stableKey(left) === stableKey(right);
}

function replaceNode(value: unknown, target: unknown, replacement: unknown): unknown {
  if (sameNode(value, target)) return structuredClone(replacement);
  if (Array.isArray(value)) {
    return value.map((entry) => replaceNode(entry, target, replacement));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
      key,
      replaceNode(entry, target, replacement),
    ]));
  }
  return value;
}

function substituteMatrix(
  matrix: SymbolicMatrix,
  target: unknown,
  replacement: unknown,
  domain: LinearAlgebraScalarDomain,
) {
  return matrix.map((row) => row.map((value) =>
    scalarFromMathJson(replaceNode(value.mathJson, target, replacement), domain)));
}

function containsOpaqueFunction(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  if (value[0] === 'Apply') return true;
  return value.slice(1).some(containsOpaqueFunction);
}

function symbolNodeKey(value: unknown): string | null {
  if (typeof value === 'string' && !value.startsWith("'") && !CONSTANT_SYMBOLS.has(value)) {
    return stableKey(value);
  }
  if (
    Array.isArray(value)
    && value[0] === 'Subscript'
    && (typeof value[1] === 'string' || Array.isArray(value[1]))
  ) {
    return stableKey(value);
  }
  return null;
}

function collectParameters(value: unknown, parameters: Set<string>) {
  const symbol = symbolNodeKey(value);
  if (symbol) {
    parameters.add(symbol);
    return;
  }
  if (!Array.isArray(value)) return;
  for (const child of value.slice(1)) collectParameters(child, parameters);
}

function inputGuard(matrix: SymbolicMatrix, coefficientColumns: number) {
  if (!matrix.length || !matrix[0]?.length || matrix.some((row) => row.length !== matrix[0].length)) {
    return { ok: false as const, error: 'Symbolic elimination requires a nonempty rectangular matrix.' };
  }
  if (
    matrix.length > SYMBOLIC_ELIMINATION_LIMITS.rows
    || coefficientColumns > SYMBOLIC_ELIMINATION_LIMITS.columns
  ) {
    return {
      ok: false as const,
      error: `Symbolic elimination supports coefficient matrices through ${SYMBOLIC_ELIMINATION_LIMITS.rows} by ${SYMBOLIC_ELIMINATION_LIMITS.columns}.`,
    };
  }
  const parameters = new Set<string>();
  for (const row of matrix) {
    for (const value of row) {
      if (containsOpaqueFunction(value.mathJson)) {
        return {
          ok: false as const,
          error: 'Formal function coefficients may pass through arithmetic, but bounded zero/nonzero classification cannot prove function identities.',
        };
      }
      collectParameters(value.mathJson, parameters);
    }
  }
  if (parameters.size > SYMBOLIC_ELIMINATION_LIMITS.parameters) {
    return {
      ok: false as const,
      error: `Symbolic elimination supports at most ${SYMBOLIC_ELIMINATION_LIMITS.parameters} remaining coefficient parameters after stored substitution.`,
    };
  }
  return { ok: true as const, parameterCount: parameters.size };
}

function predicateKey(predicate: SymbolicZeroPredicate) {
  return stableKey(predicate.value.mathJson);
}

function statusUnderConditions(
  value: LinearAlgebraScalarWireV1,
  conditions: readonly SymbolicZeroPredicate[],
) {
  const key = stableKey(value.mathJson);
  const condition = conditions.find((candidate) => predicateKey(candidate) === key);
  if (condition) return condition.relation === 'zero' ? 'zero' : 'nonzero';
  return symbolicScalarZeroStatus(value);
}

function withPredicate(
  conditions: readonly SymbolicZeroPredicate[],
  predicate: SymbolicZeroPredicate,
) {
  const key = predicateKey(predicate);
  const prior = conditions.find((candidate) => predicateKey(candidate) === key);
  if (prior) return prior.relation === predicate.relation ? [...conditions] : null;
  if (conditions.length >= SYMBOLIC_ELIMINATION_LIMITS.predicates) return undefined;
  return [...conditions, predicate];
}

type EliminationState = {
  matrix: SymbolicMatrix;
  conditions: SymbolicZeroPredicate[];
  pivotColumns: number[];
  pivotRow: number;
  column: number;
};

function pivotMatrix(
  state: EliminationState,
  selectedRow: number,
  domain: LinearAlgebraScalarDomain,
) {
  const matrix = cloneMatrix(state.matrix);
  if (selectedRow !== state.pivotRow) {
    [matrix[state.pivotRow], matrix[selectedRow]] = [matrix[selectedRow], matrix[state.pivotRow]];
  }
  const pivot = matrix[state.pivotRow][state.column];
  matrix[state.pivotRow] = matrix[state.pivotRow].map((value) =>
    symbolicScalarDivide(value, pivot, domain));
  for (let row = 0; row < matrix.length; row += 1) {
    if (row === state.pivotRow) continue;
    const factor = matrix[row][state.column];
    if (statusUnderConditions(factor, state.conditions) === 'zero') continue;
    matrix[row] = matrix[row].map((value, column) => symbolicScalarSubtract(
      value,
      symbolicScalarMultiply(factor, matrix[state.pivotRow][column], domain),
      domain,
    ));
  }
  return matrix;
}

function eliminate(
  initial: EliminationState,
  pivotColumnCount: number,
  domain: LinearAlgebraScalarDomain,
): SymbolicRrefCase[] | { error: string } {
  const pending: EliminationState[] = [initial];
  const completed: SymbolicRrefCase[] = [];
  while (pending.length) {
    const state = pending.pop()!;
    if (state.pivotRow >= state.matrix.length || state.column >= pivotColumnCount) {
      completed.push({
        conditions: state.conditions,
        matrix: state.matrix,
        pivotColumns: state.pivotColumns,
      });
      if (completed.length + pending.length > SYMBOLIC_ELIMINATION_LIMITS.cases) {
        return { error: `Symbolic classification exceeded the ${SYMBOLIC_ELIMINATION_LIMITS.cases}-case limit.` };
      }
      continue;
    }

    const candidates = Array.from(
      { length: state.matrix.length - state.pivotRow },
      (_, index) => state.pivotRow + index,
    );
    const known = candidates.find((row) =>
      statusUnderConditions(state.matrix[row][state.column], state.conditions) === 'nonzero');
    if (known !== undefined) {
      pending.push({
        matrix: pivotMatrix(state, known, domain),
        conditions: state.conditions,
        pivotColumns: [...state.pivotColumns, state.column],
        pivotRow: state.pivotRow + 1,
        column: state.column + 1,
      });
      continue;
    }

    const undecidable = candidates.find((row) =>
      statusUnderConditions(state.matrix[row][state.column], state.conditions) === 'unknown');
    if (undecidable === undefined) {
      pending.push({ ...state, column: state.column + 1 });
      continue;
    }

    const pivot = state.matrix[undecidable][state.column];
    const zeroConditions = withPredicate(state.conditions, { value: pivot, relation: 'zero' });
    const nonzeroConditions = withPredicate(state.conditions, { value: pivot, relation: 'nonzero' });
    if (zeroConditions === undefined || nonzeroConditions === undefined) {
      return { error: `Symbolic classification exceeded the ${SYMBOLIC_ELIMINATION_LIMITS.predicates}-predicate limit.` };
    }
    if (zeroConditions) {
      pending.push({
        ...state,
        matrix: substituteMatrix(state.matrix, pivot.mathJson, 0, domain),
        conditions: zeroConditions,
      });
    }
    if (nonzeroConditions) {
      const nonzeroState = { ...state, conditions: nonzeroConditions };
      pending.push({
        matrix: pivotMatrix(nonzeroState, undecidable, domain),
        conditions: nonzeroConditions,
        pivotColumns: [...state.pivotColumns, state.column],
        pivotRow: state.pivotRow + 1,
        column: state.column + 1,
      });
    }
    if (completed.length + pending.length > SYMBOLIC_ELIMINATION_LIMITS.cases) {
      return { error: `Symbolic classification exceeded the ${SYMBOLIC_ELIMINATION_LIMITS.cases}-case limit.` };
    }
  }
  return completed;
}

export function classifySymbolicRref(
  matrix: SymbolicMatrix,
  domain: LinearAlgebraScalarDomain,
  pivotColumnCount = matrix[0]?.length ?? 0,
): SymbolicEliminationResult {
  const guard = inputGuard(matrix, pivotColumnCount);
  if (!guard.ok) return guard;
  try {
    const cases = eliminate({
      matrix: cloneMatrix(matrix),
      conditions: [],
      pivotColumns: [],
      pivotRow: 0,
      column: 0,
    }, pivotColumnCount, domain);
    return 'error' in cases
      ? { ok: false, error: cases.error }
      : { ok: true, cases, parameterCount: guard.parameterCount };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error
        ? error.message
        : 'Symbolic elimination exceeded its bounded expression policy.',
    };
  }
}

function firstUndecidableRhs(
  entry: SymbolicRrefCase,
  coefficientColumns: number,
) {
  for (let row = 0; row < entry.matrix.length; row += 1) {
    const coefficientZero = entry.matrix[row]
      .slice(0, coefficientColumns)
      .every((value) => statusUnderConditions(value, entry.conditions) === 'zero');
    if (!coefficientZero) continue;
    for (let column = coefficientColumns; column < entry.matrix[row].length; column += 1) {
      const value = entry.matrix[row][column];
      if (statusUnderConditions(value, entry.conditions) === 'unknown') return value;
    }
  }
  return null;
}

function systemInconsistent(entry: SymbolicRrefCase, coefficientColumns: number) {
  return entry.matrix.some((row) => {
    const coefficientZero = row.slice(0, coefficientColumns)
      .every((value) => statusUnderConditions(value, entry.conditions) === 'zero');
    return coefficientZero && row.slice(coefficientColumns)
      .some((value) => statusUnderConditions(value, entry.conditions) === 'nonzero');
  });
}

function refineSystemCases(
  baseCases: readonly SymbolicRrefCase[],
  coefficientColumns: number,
  domain: LinearAlgebraScalarDomain,
): SymbolicSystemCase[] | { error: string } {
  const pending = baseCases.map((entry) => ({ ...entry, matrix: cloneMatrix(entry.matrix) }));
  const completed: SymbolicSystemCase[] = [];
  while (pending.length) {
    const entry = pending.pop()!;
    const undecidable = firstUndecidableRhs(entry, coefficientColumns);
    if (!undecidable) {
      completed.push({
        ...entry,
        coefficientColumns,
        rhsColumns: entry.matrix[0].length - coefficientColumns,
        inconsistent: systemInconsistent(entry, coefficientColumns),
      });
      continue;
    }
    const zeroConditions = withPredicate(entry.conditions, { value: undecidable, relation: 'zero' });
    const nonzeroConditions = withPredicate(entry.conditions, { value: undecidable, relation: 'nonzero' });
    if (zeroConditions === undefined || nonzeroConditions === undefined) {
      return { error: `Symbolic classification exceeded the ${SYMBOLIC_ELIMINATION_LIMITS.predicates}-predicate limit.` };
    }
    if (zeroConditions) {
      pending.push({
        ...entry,
        matrix: substituteMatrix(entry.matrix, undecidable.mathJson, 0, domain),
        conditions: zeroConditions,
      });
    }
    if (nonzeroConditions) pending.push({ ...entry, conditions: nonzeroConditions });
    if (completed.length + pending.length > SYMBOLIC_ELIMINATION_LIMITS.cases) {
      return { error: `Symbolic classification exceeded the ${SYMBOLIC_ELIMINATION_LIMITS.cases}-case limit.` };
    }
  }
  return completed;
}

function squaredMagnitude(
  value: LinearAlgebraScalarWireV1,
  domain: LinearAlgebraScalarDomain,
) {
  return symbolicScalarMultiply(symbolicScalarConjugate(value, domain), value, domain);
}

function sumSquaredMagnitudes(
  values: readonly LinearAlgebraScalarWireV1[],
  domain: LinearAlgebraScalarDomain,
) {
  return values.reduce((total, value) => symbolicScalarAdd(
    total,
    squaredMagnitude(value, domain),
    domain,
  ), zero(domain));
}

function determinant2(
  matrix: SymbolicMatrix,
  domain: LinearAlgebraScalarDomain,
) {
  return symbolicScalarSubtract(
    symbolicScalarMultiply(matrix[0][0], matrix[1][1], domain),
    symbolicScalarMultiply(matrix[0][1], matrix[1][0], domain),
    domain,
  );
}

type TwoByTwoBuilder = (
  conditions: SymbolicZeroPredicate[],
) => SymbolicSystemCase[] | { error: string };

function branchScalar(
  value: LinearAlgebraScalarWireV1,
  conditions: SymbolicZeroPredicate[],
  onZero: TwoByTwoBuilder,
  onNonzero: TwoByTwoBuilder,
): SymbolicSystemCase[] | { error: string } {
  const status = statusUnderConditions(value, conditions);
  if (status === 'zero') return onZero(conditions);
  if (status === 'nonzero') return onNonzero(conditions);
  const zeroConditions = withPredicate(conditions, { value, relation: 'zero' });
  const nonzeroConditions = withPredicate(conditions, { value, relation: 'nonzero' });
  if (zeroConditions === undefined || nonzeroConditions === undefined) {
    return { error: `Symbolic classification exceeded the ${SYMBOLIC_ELIMINATION_LIMITS.predicates}-predicate limit.` };
  }
  const zeroCases = zeroConditions ? onZero(zeroConditions) : [];
  if ('error' in zeroCases) return zeroCases;
  const nonzeroCases = nonzeroConditions ? onNonzero(nonzeroConditions) : [];
  if ('error' in nonzeroCases) return nonzeroCases;
  const cases = [...zeroCases, ...nonzeroCases];
  return cases.length <= SYMBOLIC_ELIMINATION_LIMITS.cases
    ? cases
    : { error: `Symbolic classification exceeded the ${SYMBOLIC_ELIMINATION_LIMITS.cases}-case limit.` };
}

function twoByTwoSystemCases(
  coefficients: SymbolicMatrix,
  rhs: SymbolicMatrix,
  domain: LinearAlgebraScalarDomain,
) {
  const [a, b] = coefficients[0];
  const [c, d] = coefficients[1];
  const e = rhs[0][0];
  const f = rhs[1][0];
  const determinant = determinant2(coefficients, domain);
  const coefficientNorm = sumSquaredMagnitudes([a, b, c, d], domain);
  const compatibilityFirst = symbolicScalarSubtract(
    symbolicScalarMultiply(a, f, domain),
    symbolicScalarMultiply(c, e, domain),
    domain,
  );
  const compatibilitySecond = symbolicScalarSubtract(
    symbolicScalarMultiply(b, f, domain),
    symbolicScalarMultiply(d, e, domain),
    domain,
  );
  const compatibilityNorm = sumSquaredMagnitudes(
    [compatibilityFirst, compatibilitySecond],
    domain,
  );
  const rhsNorm = sumSquaredMagnitudes([e, f], domain);
  const augmented = coefficients.map((row, index) => [...row, rhs[index][0]]);
  const systemCase = (
    conditions: SymbolicZeroPredicate[],
    inconsistent: boolean,
    pivotColumns: number[],
    matrix = augmented,
    implicitSolution = false,
  ): SymbolicSystemCase => ({
    conditions,
    matrix,
    pivotColumns,
    coefficientColumns: 2,
    rhsColumns: 1,
    inconsistent,
    ...(implicitSolution ? { implicitSolution: true } : {}),
  });
  const unique = (conditions: SymbolicZeroPredicate[]) => {
    const first = symbolicScalarDivide(symbolicScalarSubtract(
      symbolicScalarMultiply(d, e, domain),
      symbolicScalarMultiply(b, f, domain),
      domain,
    ), determinant, domain);
    const second = symbolicScalarDivide(compatibilityFirst, determinant, domain);
    return [systemCase(conditions, false, [0, 1], [
      [one(domain), zero(domain), first],
      [zero(domain), one(domain), second],
    ])];
  };
  const coefficientZero = (conditions: SymbolicZeroPredicate[]) => branchScalar(
    rhsNorm,
    conditions,
    (next) => [systemCase(next, false, [], augmented, true)],
    (next) => [systemCase(next, true, [])],
  );
  const coefficientRankOne = (conditions: SymbolicZeroPredicate[]) => branchScalar(
    compatibilityNorm,
    conditions,
    (next) => [systemCase(next, false, [0], augmented, true)],
    (next) => [systemCase(next, true, [0])],
  );
  const singular = (conditions: SymbolicZeroPredicate[]) => branchScalar(
    coefficientNorm,
    conditions,
    coefficientZero,
    coefficientRankOne,
  );
  return branchScalar(determinant, [], singular, unique);
}

export function classifySymbolicSystem(
  coefficients: SymbolicMatrix,
  rhs: SymbolicMatrix,
  domain: LinearAlgebraScalarDomain,
): SymbolicSystemResult {
  if (rhs.length !== coefficients.length || !rhs[0]?.length) {
    return { ok: false, error: 'The system right-hand side must have one row per equation.' };
  }
  if (rhs.some((row) => row.length !== rhs[0].length)) {
    return { ok: false, error: 'The system right-hand side must be rectangular.' };
  }
  const augmented = coefficients.map((row, index) => [...row, ...rhs[index]]);
  const guard = inputGuard(augmented, coefficients[0]?.length ?? 0);
  if (!guard.ok) return guard;
  if (
    coefficients.length === 2
    && coefficients[0]?.length === 2
    && rhs[0]?.length === 1
  ) {
    try {
      const cases = twoByTwoSystemCases(coefficients, rhs, domain);
      return 'error' in cases
        ? { ok: false, error: cases.error }
        : { ok: true, cases, parameterCount: guard.parameterCount };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error
          ? error.message
          : 'Symbolic 2 by 2 classification exceeded its bounded policy.',
      };
    }
  }
  const classified = classifySymbolicRref(augmented, domain, coefficients[0]?.length ?? 0);
  if (!classified.ok) return classified;
  const refined = refineSystemCases(classified.cases, coefficients[0].length, domain);
  return 'error' in refined
    ? { ok: false, error: refined.error }
    : { ok: true, cases: refined, parameterCount: classified.parameterCount };
}

export function predicateMathJson(predicate: SymbolicZeroPredicate) {
  return [
    predicate.relation === 'zero' ? 'Equal' : 'NotEqual',
    predicate.value.mathJson,
    0,
  ];
}

export function caseConditionMathJson(conditions: readonly SymbolicZeroPredicate[]): unknown {
  if (conditions.length === 0) return 'True';
  if (conditions.length === 1) return predicateMathJson(conditions[0]);
  return ['And', ...conditions.map(predicateMathJson)];
}

export function symbolicCasesMathJson<T extends { conditions: SymbolicZeroPredicate[] }>(
  cases: readonly T[],
  value: (entry: T) => unknown,
) {
  if (cases.length === 1 && cases[0].conditions.length === 0) return value(cases[0]);
  return ['Which', ...cases.flatMap((entry) => [caseConditionMathJson(entry.conditions), value(entry)])];
}

export function symbolicMathJsonLatex(value: unknown) {
  return ce.box(value as never, { form: 'structural' }).latex;
}

export function nullSpaceBasisForCase(
  entry: SymbolicRrefCase,
  unknowns: number,
  domain: LinearAlgebraScalarDomain,
) {
  const freeColumns = Array.from({ length: unknowns }, (_, index) => index)
    .filter((column) => !entry.pivotColumns.includes(column));
  return freeColumns.map((freeColumn) => {
    const vector = Array.from({ length: unknowns }, () => zero(domain));
    vector[freeColumn] = one(domain);
    entry.pivotColumns.forEach((pivotColumn, pivotRow) => {
      if (pivotColumn < unknowns) {
        vector[pivotColumn] = symbolicScalarNegate(entry.matrix[pivotRow][freeColumn], domain);
      }
    });
    return vector;
  });
}

function parameterNode(index: number) {
  return ['Subscript', 't', index + 1];
}

export function solutionMatrixForCase(
  entry: SymbolicSystemCase,
  domain: LinearAlgebraScalarDomain,
) {
  if (entry.inconsistent) return null;
  const unknowns = entry.coefficientColumns;
  const freeColumns = Array.from({ length: unknowns }, (_, index) => index)
    .filter((column) => !entry.pivotColumns.includes(column));
  const solutions: SymbolicMatrix = Array.from(
    { length: unknowns },
    () => Array.from({ length: entry.rhsColumns }, () => zero(domain)),
  );
  for (let rhs = 0; rhs < entry.rhsColumns; rhs += 1) {
    const freeValues = new Map<number, LinearAlgebraScalarWireV1>();
    freeColumns.forEach((column, freeIndex) => {
      const parameterIndex = rhs * freeColumns.length + freeIndex;
      const parameter = scalarFromMathJson(parameterNode(parameterIndex), domain);
      freeValues.set(column, parameter);
      solutions[column][rhs] = parameter;
    });
    entry.pivotColumns.forEach((pivotColumn, pivotRow) => {
      if (pivotColumn >= unknowns) return;
      let value = entry.matrix[pivotRow][unknowns + rhs];
      for (const freeColumn of freeColumns) {
        value = symbolicScalarSubtract(
          value,
          symbolicScalarMultiply(
            entry.matrix[pivotRow][freeColumn],
            freeValues.get(freeColumn)!,
            domain,
          ),
          domain,
        );
      }
      solutions[pivotColumn][rhs] = value;
    });
  }
  return solutions;
}

export function conditionsForCases(cases: readonly SymbolicRrefCase[]) {
  const unique = new Map<string, SymbolicZeroPredicate>();
  for (const entry of cases) {
    for (const predicate of entry.conditions) {
      unique.set(`${predicate.relation}:${predicateKey(predicate)}`, predicate);
    }
  }
  return [...unique.values()];
}
