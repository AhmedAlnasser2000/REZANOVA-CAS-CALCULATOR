import type { DisplayDetailSection } from '../../../../types/calculator';
import {
  mixedDetailSection,
  textPart,
} from '../../../display/result-detail-lines';
import {
  isSymbolicCoefficientZero,
  parseSymbolicCoefficient,
} from '../../primitives/coefficient-domain';
import {
  buildAlgebraicGenus1SecondKindPopulatedMatrixSurface,
  type AlgebraicGenus1SecondKindPopulatedMatrixSurface,
} from './second-kind-populated-matrix-surface';

export type AlgebraicGenus1SecondKindPivotCandidate = {
  columnIndex: number;
  unknownSymbol: string;
  rowIndex: number;
  pivotNode: unknown;
  pivotLatex: string;
  requiredFactLatex: string;
};

export type AlgebraicGenus1SecondKindSolveBackcheckSurface = {
  kind: 'success';
  variable: string;
  status: 'solve-backcheck-surface-ready';
  rootChartKind: AlgebraicGenus1SecondKindPopulatedMatrixSurface['rootChartKind'];
  matrixShape: AlgebraicGenus1SecondKindPopulatedMatrixSurface['matrixShape'];
  pivotCandidates: AlgebraicGenus1SecondKindPivotCandidate[];
  rowResidualNodes: unknown[];
  rowEquationNodes: unknown[];
  solveStrategy: 'bounded-symbolic-gaussian-elimination';
  canAttemptSolve: true;
  canSolveDirectly: false;
  canBackcheckAntiderivative: false;
  canAdoptLive: false;
  detailSections: DisplayDetailSection[];
  readinessNotes: string[];
  proofObligations: string[];
};

export type AlgebraicGenus1SecondKindSolveBackcheckSurfaceResult =
  | AlgebraicGenus1SecondKindSolveBackcheckSurface
  | {
      kind: 'stop';
      variable: string;
      reason: 'populated-matrix-stop' | 'pivot-candidate-missing' | 'pivot-parse-stop';
      detail: string;
    };

const PIVOT_SIMPLIFY_NODE_CAP = 8_000;

function pivotCandidateForColumn(
  matrix: AlgebraicGenus1SecondKindPopulatedMatrixSurface,
  columnIndex: number,
): AlgebraicGenus1SecondKindPivotCandidate | null | { kind: 'stop'; detail: string } {
  for (let rowIndex = 0; rowIndex < matrix.matrixEntryNodes.length; rowIndex += 1) {
    const pivotNode = matrix.matrixEntryNodes[rowIndex][columnIndex];
    const parsed = parseSymbolicCoefficient(
      pivotNode,
      matrix.chartVariableSymbol,
      [],
      { maxSimplifyNodeCount: PIVOT_SIMPLIFY_NODE_CAP },
    );
    if (parsed.kind === 'stop') {
      return {
        kind: 'stop',
        detail: `Unable to parse pivot candidate for column ${columnIndex}: ${parsed.detail ?? parsed.reason}.`,
      };
    }
    if (isSymbolicCoefficientZero(parsed.coefficient)) {
      continue;
    }

    const unknown = matrix.unknowns[columnIndex];
    return {
      columnIndex,
      unknownSymbol: unknown.nodeSymbol,
      rowIndex,
      pivotNode: parsed.coefficient.node,
      pivotLatex: parsed.coefficient.latex,
      requiredFactLatex: `${parsed.coefficient.latex}\\ne0`,
    };
  }

  return null;
}

function detailSection(input: AlgebraicGenus1SecondKindSolveBackcheckSurface) {
  return mixedDetailSection(
    'Genus-1 Second-Kind Solve Backcheck Surface',
    [
      [textPart('status: '), textPart(input.status)],
      [textPart('root chart: '), textPart(input.rootChartKind)],
      [textPart('strategy: '), textPart(input.solveStrategy)],
      [textPart('pivot candidates: '), textPart(String(input.pivotCandidates.length))],
      [textPart('row residuals: '), textPart(String(input.rowResidualNodes.length))],
      [textPart('live-adoptable: '), textPart(input.canAdoptLive ? 'yes' : 'no')],
    ],
  );
}

export function buildAlgebraicGenus1SecondKindSolveBackcheckSurface(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1SecondKindSolveBackcheckSurfaceResult {
  const matrix = buildAlgebraicGenus1SecondKindPopulatedMatrixSurface(node, variable);
  if (matrix.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'populated-matrix-stop',
      detail: matrix.detail,
    };
  }

  const pivotCandidates: AlgebraicGenus1SecondKindPivotCandidate[] = [];
  for (let columnIndex = 0; columnIndex < matrix.matrixShape.columns; columnIndex += 1) {
    const candidate = pivotCandidateForColumn(matrix, columnIndex);
    if (candidate === null) {
      return {
        kind: 'stop',
        variable,
        reason: 'pivot-candidate-missing',
        detail: `No nonzero pivot candidate was found for column ${columnIndex}.`,
      };
    }
    if ('kind' in candidate) {
      return {
        kind: 'stop',
        variable,
        reason: 'pivot-parse-stop',
        detail: candidate.detail,
      };
    }
    pivotCandidates.push(candidate);
  }

  const result: AlgebraicGenus1SecondKindSolveBackcheckSurface = {
    kind: 'success',
    variable,
    status: 'solve-backcheck-surface-ready',
    rootChartKind: matrix.rootChartKind,
    matrixShape: matrix.matrixShape,
    pivotCandidates,
    rowResidualNodes: matrix.rowResidualNodes,
    rowEquationNodes: matrix.rowEquationNodes,
    solveStrategy: 'bounded-symbolic-gaussian-elimination',
    canAttemptSolve: true,
    canSolveDirectly: false,
    canBackcheckAntiderivative: false,
    canAdoptLive: false,
    detailSections: [],
    readinessNotes: [
      ...matrix.readinessNotes,
      'Each matrix column now has a parsed nonzero pivot candidate for the later bounded symbolic solve.',
      'Row residual backcheck nodes are available before solution adoption, but no solved coefficient vector is produced yet.',
      'Live EllipticE/Pi adoption remains blocked until the solve, pivot facts, and antiderivative backcheck are complete.',
    ],
    proofObligations: [
      'Run bounded symbolic Gaussian elimination using the pivot candidates and collect accepted nonzero pivot facts.',
      'Reject singular, branch-sensitive, nonlinear, or over-cap solve residues instead of guessing coefficients.',
      'Substitute solved coefficients into the node-first antiderivative and differentiate it before live dispatch changes.',
    ],
  };

  return {
    ...result,
    detailSections: [
      detailSection(result),
    ],
  };
}
