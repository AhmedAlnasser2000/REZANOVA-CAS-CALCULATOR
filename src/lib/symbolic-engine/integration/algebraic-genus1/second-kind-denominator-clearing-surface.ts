import type { DisplayDetailSection } from '../../../../types/calculator';
import { mixedDetailSection, textPart } from '../../../display/result-detail-lines';
import {
  multiplyMathJsonNodes,
  simplifyMathJsonNodeOrOriginal,
} from '../../primitives/simplification/simplification';
import { isNodeArray } from '../../patterns';
import {
  buildAlgebraicGenus1SecondKindMatrixNodeSurface,
  type AlgebraicGenus1SecondKindMatrixNodeSurface,
} from './second-kind-matrix-node-surface';

export type AlgebraicGenus1SecondKindDenominatorClearingSurface = {
  kind: 'success';
  variable: string;
  status: 'denominator-clearing-ready';
  rootChartKind: AlgebraicGenus1SecondKindMatrixNodeSurface['rootChartKind'];
  chartVariableSymbol: 'z';
  zeroFormNode: unknown;
  denominatorFactorNodes: unknown[];
  clearingMultiplierNode: unknown;
  clearedZeroFormNode: unknown;
  rowBasisNodes: unknown[];
  canPopulateRows: false;
  canSolveDirectly: false;
  canAdoptLive: false;
  detailSections: DisplayDetailSection[];
  readinessNotes: string[];
  proofObligations: string[];
};

export type AlgebraicGenus1SecondKindDenominatorClearingSurfaceResult =
  | AlgebraicGenus1SecondKindDenominatorClearingSurface
  | {
      kind: 'stop';
      variable: string;
      reason: 'matrix-node-surface-stop' | 'malformed-comparison' | 'denominator-cap';
      detail: string;
    };

const MAX_DENOMINATOR_FACTORS = 12;

function structuralKey(node: unknown) {
  return JSON.stringify(node);
}

function uniqueNodes(nodes: unknown[]) {
  const seen = new Set<string>();
  const unique: unknown[] = [];
  for (const node of nodes) {
    const key = structuralKey(node);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(node);
  }
  return unique;
}

function collectDenominators(node: unknown, factors: unknown[]) {
  if (!isNodeArray(node)) {
    return;
  }

  if (node[0] === 'Divide' && node.length === 3) {
    factors.push(node[2]);
  }

  for (const child of node.slice(1)) {
    collectDenominators(child, factors);
  }
}

function zeroFormFromComparison(node: unknown) {
  if (isNodeArray(node) && node[0] === 'Equal' && node.length === 3 && node[2] === 0) {
    return node[1];
  }
  return null;
}

function detailSection(input: AlgebraicGenus1SecondKindDenominatorClearingSurface) {
  return mixedDetailSection(
    'Genus-1 Second-Kind Denominator Clearing Surface',
    [
      [textPart('status: '), textPart(input.status)],
      [textPart('root chart: '), textPart(input.rootChartKind)],
      [textPart('denominator factors: '), textPart(String(input.denominatorFactorNodes.length))],
      [textPart('row basis count: '), textPart(String(input.rowBasisNodes.length))],
      [textPart('cleared zero form: '), textPart('stored as an unevaluated multiplier product for bounded expansion')],
    ],
  );
}

export function buildAlgebraicGenus1SecondKindDenominatorClearingSurface(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1SecondKindDenominatorClearingSurfaceResult {
  const matrixSurface = buildAlgebraicGenus1SecondKindMatrixNodeSurface(
    node,
    variable,
    { includeDetailSections: false },
  );
  if (matrixSurface.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'matrix-node-surface-stop',
      detail: matrixSurface.detail,
    };
  }

  const zeroFormNode = zeroFormFromComparison(matrixSurface.coefficientComparisonNode);
  if (zeroFormNode === null) {
    return {
      kind: 'stop',
      variable,
      reason: 'malformed-comparison',
      detail: 'The second-kind coefficient comparison was not a zero-form equality.',
    };
  }

  const denominatorFactorNodes = uniqueNodes((() => {
    const factors: unknown[] = [];
    collectDenominators(zeroFormNode, factors);
    return factors;
  })());

  if (denominatorFactorNodes.length > MAX_DENOMINATOR_FACTORS) {
    return {
      kind: 'stop',
      variable,
      reason: 'denominator-cap',
      detail: `Denominator clearing requires ${denominatorFactorNodes.length} factors, above the cap of ${MAX_DENOMINATOR_FACTORS}.`,
    };
  }

  const clearingMultiplierNode = simplifyMathJsonNodeOrOriginal(
    multiplyMathJsonNodes(...denominatorFactorNodes),
    { maxNodeCount: 5000 },
  );
  const clearedZeroFormNode = [
    'Multiply',
    zeroFormNode,
    clearingMultiplierNode,
  ];

  const result: AlgebraicGenus1SecondKindDenominatorClearingSurface = {
    kind: 'success',
    variable,
    status: 'denominator-clearing-ready',
    rootChartKind: matrixSurface.rootChartKind,
    chartVariableSymbol: 'z',
    zeroFormNode,
    denominatorFactorNodes,
    clearingMultiplierNode,
    clearedZeroFormNode,
    rowBasisNodes: matrixSurface.rowBasisNodes,
    canPopulateRows: false,
    canSolveDirectly: false,
    canAdoptLive: false,
    detailSections: [],
    readinessNotes: [
      ...matrixSurface.readinessNotes,
      'The second-kind comparison now records the bounded denominator-clearing multiplier before row coefficient population.',
      'The cleared zero form is intentionally stored as an unevaluated product; expansion is the next bounded prerequisite.',
      'Clearing and expansion remain proof obligations; live EllipticE/Pi adoption remains blocked.',
    ],
    proofObligations: [
      'Multiply through by the clearing multiplier and expand in z under strict node and degree caps.',
      'Extract row coefficients from the cleared zero form without leaving the named-root coefficient field.',
      ...matrixSurface.proofObligations,
    ],
  };

  return {
    ...result,
    detailSections: [
      detailSection(result),
    ],
  };
}
