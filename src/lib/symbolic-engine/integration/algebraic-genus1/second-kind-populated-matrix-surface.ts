import type { DisplayDetailSection } from '../../../../types/calculator';
import {
  mixedDetailSection,
  textPart,
} from '../../../display/result-detail-lines';
import { expandMathJsonNode } from '../../primitives/expansion/expansion';
import {
  parseSymbolicCoefficient,
  type SymbolicCoefficientStopReason,
} from '../../primitives/coefficient-domain';
import {
  addMathJsonNodes,
  multiplyMathJsonNodes,
  negateMathJsonNode,
  subtractMathJsonNodes,
} from '../../primitives/simplification/simplification';
import {
  dependsOnVariable,
  flattenAdd,
  flattenMultiply,
  isNodeArray,
} from '../../patterns';
import {
  buildAlgebraicGenus1SecondKindCoefficientMatrix,
  type AlgebraicGenus1SecondKindCoefficientMatrixUnknown,
} from './second-kind-coefficient-matrix';
import {
  buildAlgebraicGenus1SecondKindRowCoefficientExtraction,
  type AlgebraicGenus1SecondKindRowCoefficientExtraction,
} from './second-kind-row-coefficient-extraction';

export type AlgebraicGenus1SecondKindPopulatedMatrixUnknown =
  AlgebraicGenus1SecondKindCoefficientMatrixUnknown & {
    columnIndex: number;
    nodeSymbol: string;
  };

export type AlgebraicGenus1SecondKindPopulatedMatrixSurface = {
  kind: 'success';
  variable: string;
  status: 'populated-matrix-ready';
  rootChartKind: AlgebraicGenus1SecondKindRowCoefficientExtraction['rootChartKind'];
  chartVariableSymbol: 'z';
  unknowns: AlgebraicGenus1SecondKindPopulatedMatrixUnknown[];
  matrixShape: {
    rows: number;
    columns: number;
  };
  matrixEntryNodes: unknown[][];
  rightHandSideNodes: unknown[];
  rowResidualNodes: unknown[];
  rowEquationNodes: unknown[];
  canBackcheckRows: true;
  canSolveDirectly: false;
  canAdoptLive: false;
  detailSections: DisplayDetailSection[];
  readinessNotes: string[];
  proofObligations: string[];
};

export type AlgebraicGenus1SecondKindPopulatedMatrixSurfaceResult =
  | AlgebraicGenus1SecondKindPopulatedMatrixSurface
  | {
      kind: 'stop';
      variable: string;
      reason:
        | 'row-coefficient-stop'
        | 'matrix-stop'
        | 'shape-mismatch'
        | 'affine-expansion-limit'
        | 'nonlinear-unknown'
        | 'coefficient-stop';
      detail: string;
      coefficientReason?: SymbolicCoefficientStopReason;
    };

type SignedNode = {
  node: unknown;
  sign: 1 | -1;
};

type AffineTermProfile =
  | { kind: 'success'; unknownIndex: number | null; coefficientNode: unknown }
  | { kind: 'stop'; reason: 'nonlinear-unknown'; detail: string };

type AffineRowResult =
  | {
      kind: 'success';
      entries: unknown[];
      rightHandSide: unknown;
      residualNode: unknown;
    }
  | {
      kind: 'stop';
      reason: 'affine-expansion-limit' | 'nonlinear-unknown' | 'coefficient-stop';
      detail: string;
      coefficientReason?: SymbolicCoefficientStopReason;
    };

const THIRD_KIND_LATEX_SYMBOL = 'C_{\\Pi,p}';
const THIRD_KIND_NODE_SYMBOL = 'C_Pi_p';
const AFFINE_EXPANSION_LIMITS = {
  maxPower: 12,
  maxExpandedTerms: 1024,
  maxNodeCount: 40_000,
};
const MATRIX_ENTRY_SIMPLIFY_NODE_CAP = 8_000;

function unknownNodeSymbol(symbolLatex: string) {
  return symbolLatex === THIRD_KIND_LATEX_SYMBOL
    ? THIRD_KIND_NODE_SYMBOL
    : symbolLatex;
}

function signedNode(node: unknown, sign: 1 | -1): unknown {
  return sign === 1 ? node : negateMathJsonNode(node);
}

function signedAddTerms(node: unknown, sign: 1 | -1 = 1): SignedNode[] {
  if (isNodeArray(node) && node[0] === 'Add') {
    return flattenAdd(node).flatMap((term) => signedAddTerms(term, sign));
  }
  if (isNodeArray(node) && node[0] === 'Subtract') {
    const [first, ...rest] = node.slice(1);
    return [
      ...(first === undefined ? [] : signedAddTerms(first, sign)),
      ...rest.flatMap((term) => signedAddTerms(term, sign === 1 ? -1 : 1)),
    ];
  }
  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    return signedAddTerms(node[1], sign === 1 ? -1 : 1);
  }
  return [{ node, sign }];
}

function dependsOnAnyUnknown(node: unknown, unknowns: readonly AlgebraicGenus1SecondKindPopulatedMatrixUnknown[]) {
  return unknowns.some((unknown) => dependsOnVariable(node, unknown.nodeSymbol));
}

function consumeAffineFactor(input: {
  factor: unknown;
  coefficientFactors: unknown[];
  unknownsInTerm: number[];
  unknowns: readonly AlgebraicGenus1SecondKindPopulatedMatrixUnknown[];
}): AffineTermProfile | null {
  if (isNodeArray(input.factor) && input.factor[0] === 'Negate' && input.factor.length === 2) {
    input.coefficientFactors.push(-1);
    const innerFactors = isNodeArray(input.factor[1]) && input.factor[1][0] === 'Multiply'
      ? flattenMultiply(input.factor[1])
      : [input.factor[1]];
    for (const factor of innerFactors) {
      const stop = consumeAffineFactor({
        ...input,
        factor,
      });
      if (stop) {
        return stop;
      }
    }
    return null;
  }

  if (isNodeArray(input.factor) && input.factor[0] === 'Multiply') {
    for (const factor of flattenMultiply(input.factor)) {
      const stop = consumeAffineFactor({
        ...input,
        factor,
      });
      if (stop) {
        return stop;
      }
    }
    return null;
  }

  const unknownIndex = input.unknowns.findIndex((unknown) => input.factor === unknown.nodeSymbol);
  if (unknownIndex >= 0) {
    input.unknownsInTerm.push(unknownIndex);
    return null;
  }

  if (dependsOnAnyUnknown(input.factor, input.unknowns)) {
    return {
      kind: 'stop',
      reason: 'nonlinear-unknown',
      detail: `Unable to isolate an affine unknown factor from ${JSON.stringify(input.factor)}.`,
    };
  }

  input.coefficientFactors.push(input.factor);
  return null;
}

function affineTermProfile(
  term: SignedNode,
  unknowns: readonly AlgebraicGenus1SecondKindPopulatedMatrixUnknown[],
): AffineTermProfile {
  const signed = signedNode(term.node, term.sign);
  const factors = isNodeArray(signed) && signed[0] === 'Multiply'
    ? flattenMultiply(signed)
    : [signed];
  const coefficientFactors: unknown[] = [];
  const unknownsInTerm: number[] = [];

  for (const factor of factors) {
    const stop = consumeAffineFactor({
      factor,
      coefficientFactors,
      unknownsInTerm,
      unknowns,
    });
    if (stop) {
      return stop;
    }
  }

  if (unknownsInTerm.length > 1) {
    return {
      kind: 'stop',
      reason: 'nonlinear-unknown',
      detail: 'A row coefficient contains a product of two or more matrix unknowns.',
    };
  }

  return {
    kind: 'success',
    unknownIndex: unknownsInTerm[0] ?? null,
    coefficientNode: coefficientFactors.length === 0
      ? 1
      : multiplyMathJsonNodes(...coefficientFactors),
  };
}

function parseEntryNode(node: unknown, variable: string) {
  return parseSymbolicCoefficient(
    node,
    variable,
    [],
    { maxSimplifyNodeCount: MATRIX_ENTRY_SIMPLIFY_NODE_CAP },
  );
}

function populateAffineRow(input: {
  rowCoefficientNode: unknown;
  unknowns: readonly AlgebraicGenus1SecondKindPopulatedMatrixUnknown[];
}): AffineRowResult {
  const expanded = expandMathJsonNode(input.rowCoefficientNode, AFFINE_EXPANSION_LIMITS);
  if (expanded.kind === 'unsupported') {
    return {
      kind: 'stop',
      reason: 'affine-expansion-limit',
      detail: expanded.message,
    };
  }

  const entries = Array.from({ length: input.unknowns.length }, () => 0 as unknown);
  let constantNode: unknown = 0;
  for (const term of signedAddTerms(expanded.node)) {
    const profile = affineTermProfile(term, input.unknowns);
    if (profile.kind === 'stop') {
      return profile;
    }
    if (profile.unknownIndex === null) {
      constantNode = addMathJsonNodes(constantNode, profile.coefficientNode);
      continue;
    }
    entries[profile.unknownIndex] = addMathJsonNodes(
      entries[profile.unknownIndex],
      profile.coefficientNode,
    );
  }

  const parsedEntries: unknown[] = [];
  for (const entry of entries) {
    const parsed = parseEntryNode(entry, 'z');
    if (parsed.kind === 'stop') {
      return {
        kind: 'stop',
        reason: 'coefficient-stop',
        detail: `Unable to parse a matrix entry: ${parsed.detail ?? parsed.reason}.`,
        coefficientReason: parsed.reason,
      };
    }
    parsedEntries.push(parsed.coefficient.node);
  }

  const rightHandSide = negateMathJsonNode(constantNode);
  const parsedRightHandSide = parseEntryNode(rightHandSide, 'z');
  if (parsedRightHandSide.kind === 'stop') {
    return {
      kind: 'stop',
      reason: 'coefficient-stop',
      detail: `Unable to parse a row right-hand side: ${parsedRightHandSide.detail ?? parsedRightHandSide.reason}.`,
      coefficientReason: parsedRightHandSide.reason,
    };
  }

  const residualNode = subtractMathJsonNodes(
    addMathJsonNodes(
      ...parsedEntries.map((entry, index) => multiplyMathJsonNodes(entry, input.unknowns[index].nodeSymbol)),
    ),
    parsedRightHandSide.coefficient.node,
  );

  return {
    kind: 'success',
    entries: parsedEntries,
    rightHandSide: parsedRightHandSide.coefficient.node,
    residualNode,
  };
}

function detailSection(input: AlgebraicGenus1SecondKindPopulatedMatrixSurface) {
  return mixedDetailSection(
    'Genus-1 Second-Kind Populated Matrix Surface',
    [
      [textPart('status: '), textPart(input.status)],
      [textPart('root chart: '), textPart(input.rootChartKind)],
      [textPart('rows: '), textPart(String(input.matrixShape.rows))],
      [textPart('columns: '), textPart(String(input.matrixShape.columns))],
      [textPart('unknowns: '), textPart(input.unknowns.map((unknown) => unknown.nodeSymbol).join(', '))],
      [textPart('row backcheck: '), textPart(input.canBackcheckRows ? 'ready' : 'blocked')],
    ],
  );
}

export function buildAlgebraicGenus1SecondKindPopulatedMatrixSurface(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1SecondKindPopulatedMatrixSurfaceResult {
  const rows = buildAlgebraicGenus1SecondKindRowCoefficientExtraction(node, variable);
  if (rows.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'row-coefficient-stop',
      detail: rows.detail,
    };
  }

  const matrix = buildAlgebraicGenus1SecondKindCoefficientMatrix(node, variable);
  if (matrix.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'matrix-stop',
      detail: matrix.detail,
    };
  }

  const unknowns = matrix.unknowns.map((unknown, columnIndex) => ({
    ...unknown,
    columnIndex,
    nodeSymbol: unknownNodeSymbol(unknown.symbolLatex),
  }));
  if (
    rows.rowCoefficients.length !== matrix.matrixShape.rows
    || unknowns.length !== matrix.matrixShape.columns
  ) {
    return {
      kind: 'stop',
      variable,
      reason: 'shape-mismatch',
      detail: 'The row coefficient surface and coefficient matrix shape disagree.',
    };
  }

  const matrixEntryNodes: unknown[][] = [];
  const rightHandSideNodes: unknown[] = [];
  const rowResidualNodes: unknown[] = [];
  for (const row of rows.rowCoefficients) {
    const populated = populateAffineRow({
      rowCoefficientNode: row.coefficientNode,
      unknowns,
    });
    if (populated.kind === 'stop') {
      return {
        kind: 'stop',
        variable,
        reason: populated.reason,
        detail: populated.detail,
        coefficientReason: populated.coefficientReason,
      };
    }
    matrixEntryNodes.push(populated.entries);
    rightHandSideNodes.push(populated.rightHandSide);
    rowResidualNodes.push(populated.residualNode);
  }

  const result: AlgebraicGenus1SecondKindPopulatedMatrixSurface = {
    kind: 'success',
    variable,
    status: 'populated-matrix-ready',
    rootChartKind: rows.rootChartKind,
    chartVariableSymbol: rows.chartVariableSymbol,
    unknowns,
    matrixShape: matrix.matrixShape,
    matrixEntryNodes,
    rightHandSideNodes,
    rowResidualNodes,
    rowEquationNodes: rowResidualNodes.map((residual) => ['Equal', residual, 0]),
    canBackcheckRows: true,
    canSolveDirectly: false,
    canAdoptLive: false,
    detailSections: [],
    readinessNotes: [
      ...rows.readinessNotes,
      'The bounded row equations are now split into matrix entries and right-hand-side nodes using the displayed unknown ordering.',
      'Rows can be backchecked against the extracted coefficient equations before any symbolic solve is attempted.',
      'The linear solve, pivot facts, node-first antiderivative, and live EllipticE/Pi adoption remain blocked.',
    ],
    proofObligations: [
      'Solve the populated matrix over the named-root coefficient field with bounded symbolic Gaussian elimination.',
      'Collect nonzero pivot facts and reject branch-sensitive or nonlinear coefficient residues.',
      'Backcheck the solved F/E/Pi plus rational-correction antiderivative before changing live dispatch.',
    ],
  };

  return {
    ...result,
    detailSections: [
      detailSection(result),
    ],
  };
}
