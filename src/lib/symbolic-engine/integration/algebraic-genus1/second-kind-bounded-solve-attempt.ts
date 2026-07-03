import type { DisplayDetailSection } from '../../../../types/calculator';
import {
  mixedDetailSection,
  textPart,
} from '../../../display/result-detail-lines';
import {
  isSymbolicCoefficientZero,
  mergeSymbolicCoefficientFacts,
  parseSymbolicCoefficient,
  symbolicCoefficientFact,
  type SymbolicCoefficient,
  type SymbolicCoefficientFact,
  type SymbolicCoefficientStopReason,
} from '../../primitives/coefficient-domain';
import {
  divideMathJsonNodes,
  multiplyMathJsonNodes,
  subtractMathJsonNodes,
} from '../../primitives/simplification/simplification';
import { isNodeArray } from '../../patterns';
import {
  buildAlgebraicGenus1SecondKindPopulatedMatrixSurface,
  type AlgebraicGenus1SecondKindPopulatedMatrixSurface,
} from './second-kind-populated-matrix-surface';

export type AlgebraicGenus1SecondKindSolveAttemptStopReason =
  | 'coefficient-growth-cap'
  | 'coefficient-parse-stop'
  | 'operation-cap'
  | 'pivot-candidate-missing'
  | 'antiderivative-backcheck-deferred';

export type AlgebraicGenus1SecondKindSolveAttemptStatus =
  | 'bounded-solve-attempt-controlled-stop'
  | 'bounded-solve-attempt-solved-vector';

export type AlgebraicGenus1SecondKindSolveAttemptLimits = {
  maxOperations: number;
  maxInitialNodeCount: number;
  maxRawOperationNodeCount: number;
  maxSimplifyNodeCount: number;
  maxCoefficientNodeCount: number;
};

export type AlgebraicGenus1SecondKindSolveAttemptOptions =
  Partial<AlgebraicGenus1SecondKindSolveAttemptLimits>;

export type AlgebraicGenus1SecondKindSolveAttemptTrace = {
  columnIndex: number;
  unknownSymbol: string;
  pivotRowIndex: number;
  pivotLatex: string;
  pivotNodeCount: number;
  acceptedFactLatex: string;
  eliminatedRows: number;
};

export type AlgebraicGenus1SecondKindBoundedSolveAttempt = {
  kind: 'success';
  variable: string;
  status: AlgebraicGenus1SecondKindSolveAttemptStatus;
  rootChartKind: AlgebraicGenus1SecondKindPopulatedMatrixSurface['rootChartKind'];
  matrixShape: AlgebraicGenus1SecondKindPopulatedMatrixSurface['matrixShape'];
  stopReason: AlgebraicGenus1SecondKindSolveAttemptStopReason;
  stopDetail: string;
  pivotTrace: AlgebraicGenus1SecondKindSolveAttemptTrace[];
  acceptedPivotFacts: string[];
  operationCount: number;
  maxObservedCoefficientNodeCount: number;
  limits: AlgebraicGenus1SecondKindSolveAttemptLimits;
  canSolveDirectly: false;
  canBackcheckAntiderivative: false;
  canAdoptLive: false;
  detailSections: DisplayDetailSection[];
  readinessNotes: string[];
  proofObligations: string[];
};

export type AlgebraicGenus1SecondKindBoundedSolveAttemptResult =
  | AlgebraicGenus1SecondKindBoundedSolveAttempt
  | {
      kind: 'stop';
      variable: string;
      reason: 'populated-matrix-stop';
      detail: string;
    };

type ParsedCoefficientResult =
  | { kind: 'success'; coefficient: SymbolicCoefficient; nodeCount: number }
  | {
      kind: 'stop';
      reason: 'coefficient-growth-cap' | 'coefficient-parse-stop';
      detail: string;
      coefficientReason?: SymbolicCoefficientStopReason;
      nodeCount?: number;
    };

type OperationStop = {
  kind: 'stop';
  reason: AlgebraicGenus1SecondKindSolveAttemptStopReason;
  detail: string;
  coefficientReason?: SymbolicCoefficientStopReason;
  nodeCount?: number;
};

type OperationResult =
  | { kind: 'success'; coefficient: SymbolicCoefficient }
  | OperationStop;

type AugmentedRow = {
  entries: SymbolicCoefficient[];
  rightHandSide: SymbolicCoefficient;
};

type OperationMeter = {
  operationCount: number;
  maxObservedCoefficientNodeCount: number;
};

const DEFAULT_LIMITS: AlgebraicGenus1SecondKindSolveAttemptLimits = {
  maxOperations: 24,
  maxInitialNodeCount: 1_000,
  maxRawOperationNodeCount: 700,
  maxSimplifyNodeCount: 700,
  maxCoefficientNodeCount: 700,
};

function normalizeLimits(
  options: AlgebraicGenus1SecondKindSolveAttemptOptions = {},
): AlgebraicGenus1SecondKindSolveAttemptLimits {
  return {
    maxOperations: Math.max(1, Math.floor(options.maxOperations ?? DEFAULT_LIMITS.maxOperations)),
    maxInitialNodeCount: Math.max(1, Math.floor(options.maxInitialNodeCount ?? DEFAULT_LIMITS.maxInitialNodeCount)),
    maxRawOperationNodeCount: Math.max(1, Math.floor(options.maxRawOperationNodeCount ?? DEFAULT_LIMITS.maxRawOperationNodeCount)),
    maxSimplifyNodeCount: Math.max(1, Math.floor(options.maxSimplifyNodeCount ?? DEFAULT_LIMITS.maxSimplifyNodeCount)),
    maxCoefficientNodeCount: Math.max(1, Math.floor(options.maxCoefficientNodeCount ?? DEFAULT_LIMITS.maxCoefficientNodeCount)),
  };
}

function countNodes(node: unknown): number {
  if (!isNodeArray(node)) {
    return 1;
  }

  return 1 + node.slice(1).reduce<number>((sum, child) => sum + countNodes(child), 0);
}

function mergeFacts(...factGroups: SymbolicCoefficientFact[][]) {
  return mergeSymbolicCoefficientFacts(factGroups.flat());
}

function parseBoundedCoefficient(input: {
  node: unknown;
  variable: string;
  facts?: SymbolicCoefficientFact[];
  limit: number;
  limits: AlgebraicGenus1SecondKindSolveAttemptLimits;
  context: string;
}): ParsedCoefficientResult {
  const rawNodeCount = countNodes(input.node);
  if (rawNodeCount > input.limit) {
    return {
      kind: 'stop',
      reason: 'coefficient-growth-cap',
      detail: `${input.context} produced ${rawNodeCount} raw nodes, exceeding the cap of ${input.limit}.`,
      nodeCount: rawNodeCount,
    };
  }

  const parsed = parseSymbolicCoefficient(
    input.node,
    input.variable,
    input.facts ?? [],
    { maxSimplifyNodeCount: input.limits.maxSimplifyNodeCount },
  );
  if (parsed.kind === 'stop') {
    return {
      kind: 'stop',
      reason: 'coefficient-parse-stop',
      detail: `${input.context} could not be parsed as a bounded coefficient: ${parsed.detail ?? parsed.reason}.`,
      coefficientReason: parsed.reason,
    };
  }

  const coefficientNodeCount = countNodes(parsed.coefficient.node);
  if (coefficientNodeCount > input.limits.maxCoefficientNodeCount) {
    return {
      kind: 'stop',
      reason: 'coefficient-growth-cap',
      detail: `${input.context} simplified to ${coefficientNodeCount} coefficient nodes, exceeding the cap of ${input.limits.maxCoefficientNodeCount}.`,
      nodeCount: coefficientNodeCount,
    };
  }

  return {
    kind: 'success',
    coefficient: parsed.coefficient,
    nodeCount: coefficientNodeCount,
  };
}

function noteObserved(meter: OperationMeter, nodeCount: number) {
  meter.maxObservedCoefficientNodeCount = Math.max(
    meter.maxObservedCoefficientNodeCount,
    nodeCount,
  );
}

function consumeOperationBudget(
  meter: OperationMeter,
  limits: AlgebraicGenus1SecondKindSolveAttemptLimits,
  context: string,
): OperationResult | undefined {
  if (meter.operationCount >= limits.maxOperations) {
    return {
      kind: 'stop',
      reason: 'operation-cap',
      detail: `${context} reached the bounded solve operation cap of ${limits.maxOperations}.`,
    };
  }

  meter.operationCount += 1;
  return undefined;
}

function parseOperationCoefficient(input: {
  node: unknown;
  variable: string;
  facts: SymbolicCoefficientFact[];
  limits: AlgebraicGenus1SecondKindSolveAttemptLimits;
  meter: OperationMeter;
  context: string;
}): OperationResult {
  const budgetStop = consumeOperationBudget(input.meter, input.limits, input.context);
  if (budgetStop) {
    return budgetStop;
  }

  const parsed = parseBoundedCoefficient({
    node: input.node,
    variable: input.variable,
    facts: input.facts,
    limit: input.limits.maxRawOperationNodeCount,
    limits: input.limits,
    context: input.context,
  });
  if (parsed.kind === 'stop') {
    return parsed;
  }

  noteObserved(input.meter, parsed.nodeCount);
  return {
    kind: 'success',
    coefficient: parsed.coefficient,
  };
}

function divideCoefficients(input: {
  numerator: SymbolicCoefficient;
  denominator: SymbolicCoefficient;
  variable: string;
  limits: AlgebraicGenus1SecondKindSolveAttemptLimits;
  meter: OperationMeter;
  context: string;
}) {
  return parseOperationCoefficient({
    node: divideMathJsonNodes(input.numerator.node, input.denominator.node),
    variable: input.variable,
    facts: mergeFacts(
      input.numerator.facts,
      input.denominator.facts,
      [symbolicCoefficientFact(input.denominator.latex)],
    ),
    limits: input.limits,
    meter: input.meter,
    context: input.context,
  });
}

function eliminateCoefficient(input: {
  current: SymbolicCoefficient;
  factor: SymbolicCoefficient;
  pivotValue: SymbolicCoefficient;
  variable: string;
  limits: AlgebraicGenus1SecondKindSolveAttemptLimits;
  meter: OperationMeter;
  context: string;
}) {
  return parseOperationCoefficient({
    node: subtractMathJsonNodes(
      input.current.node,
      multiplyMathJsonNodes(input.factor.node, input.pivotValue.node),
    ),
    variable: input.variable,
    facts: mergeFacts(
      input.current.facts,
      input.factor.facts,
      input.pivotValue.facts,
    ),
    limits: input.limits,
    meter: input.meter,
    context: input.context,
  });
}

function parseAugmentedRows(input: {
  matrix: AlgebraicGenus1SecondKindPopulatedMatrixSurface;
  limits: AlgebraicGenus1SecondKindSolveAttemptLimits;
  meter: OperationMeter;
}): OperationStop | { kind: 'rows-success'; rows: AugmentedRow[] } {
  const rows: AugmentedRow[] = [];
  for (let rowIndex = 0; rowIndex < input.matrix.matrixEntryNodes.length; rowIndex += 1) {
    const entries: SymbolicCoefficient[] = [];
    for (let columnIndex = 0; columnIndex < input.matrix.matrixEntryNodes[rowIndex].length; columnIndex += 1) {
      const parsed = parseBoundedCoefficient({
        node: input.matrix.matrixEntryNodes[rowIndex][columnIndex],
        variable: input.matrix.chartVariableSymbol,
        limit: input.limits.maxInitialNodeCount,
        limits: input.limits,
        context: `initial matrix entry (${rowIndex}, ${columnIndex})`,
      });
      if (parsed.kind === 'stop') {
        return parsed;
      }
      noteObserved(input.meter, parsed.nodeCount);
      entries.push(parsed.coefficient);
    }

    const rhs = parseBoundedCoefficient({
      node: input.matrix.rightHandSideNodes[rowIndex],
      variable: input.matrix.chartVariableSymbol,
      limit: input.limits.maxInitialNodeCount,
      limits: input.limits,
      context: `initial right-hand side row ${rowIndex}`,
    });
    if (rhs.kind === 'stop') {
      return rhs;
    }
    noteObserved(input.meter, rhs.nodeCount);
    rows.push({
      entries,
      rightHandSide: rhs.coefficient,
    });
  }

  return {
    kind: 'rows-success',
    rows,
  };
}

function findPivotRow(
  rows: AugmentedRow[],
  columnIndex: number,
  startRowIndex: number,
) {
  for (let rowIndex = startRowIndex; rowIndex < rows.length; rowIndex += 1) {
    if (!isSymbolicCoefficientZero(rows[rowIndex].entries[columnIndex])) {
      return rowIndex;
    }
  }

  return -1;
}

function runBoundedElimination(input: {
  matrix: AlgebraicGenus1SecondKindPopulatedMatrixSurface;
  rows: AugmentedRow[];
  limits: AlgebraicGenus1SecondKindSolveAttemptLimits;
  meter: OperationMeter;
}): {
  stopReason: AlgebraicGenus1SecondKindSolveAttemptStopReason;
  stopDetail: string;
  status: AlgebraicGenus1SecondKindSolveAttemptStatus;
  pivotTrace: AlgebraicGenus1SecondKindSolveAttemptTrace[];
  acceptedPivotFacts: string[];
} {
  const pivotTrace: AlgebraicGenus1SecondKindSolveAttemptTrace[] = [];
  const acceptedPivotFacts: string[] = [];
  let pivotRowIndex = 0;

  for (let columnIndex = 0; columnIndex < input.matrix.matrixShape.columns; columnIndex += 1) {
    const selectedPivotRowIndex = findPivotRow(input.rows, columnIndex, pivotRowIndex);
    if (selectedPivotRowIndex < 0) {
      return {
        status: 'bounded-solve-attempt-controlled-stop',
        stopReason: 'pivot-candidate-missing',
        stopDetail: `No nonzero pivot remained for column ${columnIndex} after ${pivotTrace.length} accepted pivots.`,
        pivotTrace,
        acceptedPivotFacts,
      };
    }

    if (selectedPivotRowIndex !== pivotRowIndex) {
      const selectedRow = input.rows[selectedPivotRowIndex];
      input.rows[selectedPivotRowIndex] = input.rows[pivotRowIndex];
      input.rows[pivotRowIndex] = selectedRow;
    }

    const pivot = input.rows[pivotRowIndex].entries[columnIndex];
    const trace: AlgebraicGenus1SecondKindSolveAttemptTrace = {
      columnIndex,
      unknownSymbol: input.matrix.unknowns[columnIndex].nodeSymbol,
      pivotRowIndex,
      pivotLatex: pivot.latex,
      pivotNodeCount: countNodes(pivot.node),
      acceptedFactLatex: `${pivot.latex}\\ne0`,
      eliminatedRows: 0,
    };
    pivotTrace.push(trace);
    acceptedPivotFacts.push(trace.acceptedFactLatex);

    for (let rowIndex = pivotRowIndex + 1; rowIndex < input.rows.length; rowIndex += 1) {
      const target = input.rows[rowIndex].entries[columnIndex];
      if (isSymbolicCoefficientZero(target)) {
        continue;
      }

      const factor = divideCoefficients({
        numerator: target,
        denominator: pivot,
        variable: input.matrix.chartVariableSymbol,
        limits: input.limits,
        meter: input.meter,
        context: `elimination factor for row ${rowIndex}, column ${columnIndex}`,
      });
      if (factor.kind === 'stop') {
        return {
          status: 'bounded-solve-attempt-controlled-stop',
          stopReason: factor.reason,
          stopDetail: factor.detail,
          pivotTrace,
          acceptedPivotFacts,
        };
      }

      for (let updateColumnIndex = columnIndex; updateColumnIndex < input.matrix.matrixShape.columns; updateColumnIndex += 1) {
        const updated = eliminateCoefficient({
          current: input.rows[rowIndex].entries[updateColumnIndex],
          factor: factor.coefficient,
          pivotValue: input.rows[pivotRowIndex].entries[updateColumnIndex],
          variable: input.matrix.chartVariableSymbol,
          limits: input.limits,
          meter: input.meter,
          context: `row ${rowIndex}, column ${updateColumnIndex} elimination update`,
        });
        if (updated.kind === 'stop') {
          return {
            status: 'bounded-solve-attempt-controlled-stop',
            stopReason: updated.reason,
            stopDetail: updated.detail,
            pivotTrace,
            acceptedPivotFacts,
          };
        }
        input.rows[rowIndex].entries[updateColumnIndex] = updated.coefficient;
      }

      const updatedRightHandSide = eliminateCoefficient({
        current: input.rows[rowIndex].rightHandSide,
        factor: factor.coefficient,
        pivotValue: input.rows[pivotRowIndex].rightHandSide,
        variable: input.matrix.chartVariableSymbol,
        limits: input.limits,
        meter: input.meter,
        context: `row ${rowIndex} right-hand-side elimination update`,
      });
      if (updatedRightHandSide.kind === 'stop') {
        return {
          status: 'bounded-solve-attempt-controlled-stop',
          stopReason: updatedRightHandSide.reason,
          stopDetail: updatedRightHandSide.detail,
          pivotTrace,
          acceptedPivotFacts,
        };
      }

      input.rows[rowIndex].rightHandSide = updatedRightHandSide.coefficient;
      trace.eliminatedRows += 1;
    }

    pivotRowIndex += 1;
  }

  return {
    status: 'bounded-solve-attempt-solved-vector',
    stopReason: 'antiderivative-backcheck-deferred',
    stopDetail: 'A bounded triangular solve completed, but no node-first antiderivative substitution or derivative backcheck has been performed.',
    pivotTrace,
    acceptedPivotFacts,
  };
}

function detailSection(input: AlgebraicGenus1SecondKindBoundedSolveAttempt) {
  return mixedDetailSection(
    'Genus-1 Second-Kind Bounded Solve Attempt',
    [
      [textPart('status: '), textPart(input.status)],
      [textPart('root chart: '), textPart(input.rootChartKind)],
      [textPart('stop reason: '), textPart(input.stopReason)],
      [textPart('accepted pivots: '), textPart(String(input.pivotTrace.length))],
      [textPart('operations: '), textPart(`${input.operationCount}/${input.limits.maxOperations}`)],
      [textPart('max coefficient nodes: '), textPart(String(input.maxObservedCoefficientNodeCount))],
      [textPart('live-adoptable: '), textPart(input.canAdoptLive ? 'yes' : 'no')],
    ],
  );
}

export function buildAlgebraicGenus1SecondKindBoundedSolveAttempt(
  node: unknown,
  variable = 'x',
  options: AlgebraicGenus1SecondKindSolveAttemptOptions = {},
): AlgebraicGenus1SecondKindBoundedSolveAttemptResult {
  const matrix = buildAlgebraicGenus1SecondKindPopulatedMatrixSurface(node, variable);
  if (matrix.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'populated-matrix-stop',
      detail: matrix.detail,
    };
  }

  const limits = normalizeLimits(options);
  const meter: OperationMeter = {
    operationCount: 0,
    maxObservedCoefficientNodeCount: 0,
  };

  const parsedRows = parseAugmentedRows({
    matrix,
    limits,
    meter,
  });

  const attempt = parsedRows.kind === 'rows-success'
    ? runBoundedElimination({
      matrix,
      rows: parsedRows.rows,
      limits,
      meter,
    })
    : {
      status: 'bounded-solve-attempt-controlled-stop' as const,
      stopReason: parsedRows.reason,
      stopDetail: parsedRows.detail,
      pivotTrace: [],
      acceptedPivotFacts: [],
    };

  const result: AlgebraicGenus1SecondKindBoundedSolveAttempt = {
    kind: 'success',
    variable,
    status: attempt.status,
    rootChartKind: matrix.rootChartKind,
    matrixShape: matrix.matrixShape,
    stopReason: attempt.stopReason,
    stopDetail: attempt.stopDetail,
    pivotTrace: attempt.pivotTrace,
    acceptedPivotFacts: attempt.acceptedPivotFacts,
    operationCount: meter.operationCount,
    maxObservedCoefficientNodeCount: meter.maxObservedCoefficientNodeCount,
    limits,
    canSolveDirectly: false,
    canBackcheckAntiderivative: false,
    canAdoptLive: false,
    detailSections: [],
    readinessNotes: [
      ...matrix.readinessNotes,
      'The populated second-kind matrix now has a bounded symbolic elimination attempt with hard operation and coefficient-growth caps.',
      'Controlled solve stops are retained as proof evidence; they do not become guessed elliptic coefficients.',
      'Live EllipticE/Pi adoption remains blocked until a solved vector is substituted into a node-first antiderivative and differentiated back to the original integrand.',
    ],
    proofObligations: [
      'Widen coefficient-field normalization only after the bounded solve can complete without exceeding operation or node caps.',
      'Collect accepted nonzero pivot facts and reject singular or branch-sensitive residues before solution adoption.',
      'Substitute solved F/E/Pi and rational-correction coefficients into the antiderivative and run an exact derivative backcheck before live dispatch changes.',
    ],
  };

  return {
    ...result,
    detailSections: [
      detailSection(result),
    ],
  };
}
