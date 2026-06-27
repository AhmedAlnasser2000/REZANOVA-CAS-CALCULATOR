import {
  divideRischNormanCoefficients,
  isRischNormanCoefficientZero,
  mergeRischNormanCoefficientFacts,
  multiplyRischNormanCoefficients,
  parseRischNormanCoefficient,
  subtractRischNormanCoefficients,
  type RischNormanCoefficient,
  type RischNormanCoefficientFact,
  type RischNormanCoefficientStopReason,
} from './coefficient-field';

export type RischNormanLinearSolveStopReason =
  | 'coefficient-stop'
  | 'empty-system'
  | 'non-square-system'
  | 'over-cap-size'
  | 'singular-system';

export type RischNormanLinearSolveResult =
  | {
    kind: 'success';
    solution: RischNormanCoefficient[];
    facts: RischNormanCoefficientFact[];
  }
  | {
    kind: 'stop';
    reason: RischNormanLinearSolveStopReason;
    detail?: string;
    coefficientReason?: RischNormanCoefficientStopReason;
  };

const DEFAULT_LINEAR_SOLVER_CAP = 16;

type CoefficientResult =
  | { kind: 'success'; coefficient: RischNormanCoefficient }
  | { kind: 'stop'; reason: RischNormanCoefficientStopReason; detail?: string };

function coefficientStop(result: Extract<CoefficientResult, { kind: 'stop' }>): RischNormanLinearSolveResult {
  return {
    kind: 'stop',
    reason: 'coefficient-stop',
    coefficientReason: result.reason,
    detail: result.detail,
  };
}

function checked(result: CoefficientResult): RischNormanCoefficient | RischNormanLinearSolveResult {
  return result.kind === 'success'
    ? result.coefficient
    : coefficientStop(result);
}

function isStop(value: RischNormanCoefficient | RischNormanLinearSolveResult): value is RischNormanLinearSolveResult {
  return 'kind' in value && value.kind === 'stop';
}

function validateShape(
  matrix: RischNormanCoefficient[][],
  rhs: RischNormanCoefficient[],
  maxSize: number,
): RischNormanLinearSolveResult | undefined {
  const size = matrix.length;
  if (size === 0) {
    return { kind: 'stop', reason: 'empty-system' };
  }
  if (size > maxSize) {
    return {
      kind: 'stop',
      reason: 'over-cap-size',
      detail: `Risch-Norman linear system size ${size} exceeds cap ${maxSize}.`,
    };
  }
  if (rhs.length !== size || matrix.some((row) => row.length !== size)) {
    return { kind: 'stop', reason: 'non-square-system' };
  }

  return undefined;
}

function collectFacts(coefficients: RischNormanCoefficient[]) {
  return mergeRischNormanCoefficientFacts(coefficients.flatMap((coefficient) => coefficient.facts));
}

export function solveRischNormanLinearSystem(
  matrix: RischNormanCoefficient[][],
  rhs: RischNormanCoefficient[],
  variable: string,
  maxSize = DEFAULT_LINEAR_SOLVER_CAP,
): RischNormanLinearSolveResult {
  const shapeStop = validateShape(matrix, rhs, maxSize);
  if (shapeStop) {
    return shapeStop;
  }

  const size = matrix.length;
  const working = matrix.map((row) => [...row]);
  const constants = [...rhs];

  for (let pivotColumn = 0; pivotColumn < size; pivotColumn += 1) {
    const pivotRow = working.findIndex((row, rowIndex) =>
      rowIndex >= pivotColumn && !isRischNormanCoefficientZero(row[pivotColumn]));
    if (pivotRow === -1) {
      return { kind: 'stop', reason: 'singular-system' };
    }

    if (pivotRow !== pivotColumn) {
      [working[pivotColumn], working[pivotRow]] = [working[pivotRow], working[pivotColumn]];
      [constants[pivotColumn], constants[pivotRow]] = [constants[pivotRow], constants[pivotColumn]];
    }

    const pivot = working[pivotColumn][pivotColumn];
    for (let rowIndex = pivotColumn + 1; rowIndex < size; rowIndex += 1) {
      if (isRischNormanCoefficientZero(working[rowIndex][pivotColumn])) {
        continue;
      }

      const factor = checked(divideRischNormanCoefficients(working[rowIndex][pivotColumn], pivot, variable));
      if (isStop(factor)) {
        return factor;
      }

      for (let columnIndex = pivotColumn; columnIndex < size; columnIndex += 1) {
        const scaled = checked(multiplyRischNormanCoefficients(factor, working[pivotColumn][columnIndex], variable));
        if (isStop(scaled)) {
          return scaled;
        }
        const reduced = checked(subtractRischNormanCoefficients(working[rowIndex][columnIndex], scaled, variable));
        if (isStop(reduced)) {
          return reduced;
        }
        working[rowIndex][columnIndex] = reduced;
      }

      const scaledConstant = checked(multiplyRischNormanCoefficients(factor, constants[pivotColumn], variable));
      if (isStop(scaledConstant)) {
        return scaledConstant;
      }
      const reducedConstant = checked(subtractRischNormanCoefficients(constants[rowIndex], scaledConstant, variable));
      if (isStop(reducedConstant)) {
        return reducedConstant;
      }
      constants[rowIndex] = reducedConstant;
    }
  }

  const solution: RischNormanCoefficient[] = new Array(size);
  for (let rowIndex = size - 1; rowIndex >= 0; rowIndex -= 1) {
    let residual = constants[rowIndex];
    for (let columnIndex = rowIndex + 1; columnIndex < size; columnIndex += 1) {
      const scaled = checked(multiplyRischNormanCoefficients(working[rowIndex][columnIndex], solution[columnIndex], variable));
      if (isStop(scaled)) {
        return scaled;
      }
      const reduced = checked(subtractRischNormanCoefficients(residual, scaled, variable));
      if (isStop(reduced)) {
        return reduced;
      }
      residual = reduced;
    }

    const pivot = working[rowIndex][rowIndex];
    if (isRischNormanCoefficientZero(pivot)) {
      return { kind: 'stop', reason: 'singular-system' };
    }
    const solved = checked(divideRischNormanCoefficients(residual, pivot, variable));
    if (isStop(solved)) {
      return solved;
    }
    solution[rowIndex] = solved;
  }

  return {
    kind: 'success',
    solution,
    facts: collectFacts(solution),
  };
}

export function solveRischNormanLinearSystemFromNodes(
  matrix: unknown[][],
  rhs: unknown[],
  variable: string,
  maxSize = DEFAULT_LINEAR_SOLVER_CAP,
): RischNormanLinearSolveResult {
  const size = matrix.length;
  if (size === 0) {
    return { kind: 'stop', reason: 'empty-system' };
  }
  if (size > maxSize) {
    return {
      kind: 'stop',
      reason: 'over-cap-size',
      detail: `Risch-Norman linear system size ${size} exceeds cap ${maxSize}.`,
    };
  }
  if (rhs.length !== size || matrix.some((row) => row.length !== size)) {
    return { kind: 'stop', reason: 'non-square-system' };
  }

  const parsedMatrix: RischNormanCoefficient[][] = [];
  for (const row of matrix) {
    const parsedRow: RischNormanCoefficient[] = [];
    for (const entry of row) {
      const parsed = parseRischNormanCoefficient(entry, variable);
      if (parsed.kind === 'stop') {
        return coefficientStop(parsed);
      }
      parsedRow.push(parsed.coefficient);
    }
    parsedMatrix.push(parsedRow);
  }

  const parsedRhs: RischNormanCoefficient[] = [];
  for (const entry of rhs) {
    const parsed = parseRischNormanCoefficient(entry, variable);
    if (parsed.kind === 'stop') {
      return coefficientStop(parsed);
    }
    parsedRhs.push(parsed.coefficient);
  }

  return solveRischNormanLinearSystem(parsedMatrix, parsedRhs, variable, maxSize);
}
