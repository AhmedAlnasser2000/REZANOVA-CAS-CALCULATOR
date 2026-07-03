import type { DisplayDetailSection } from '../../../../types/calculator';
import {
  mathPart,
  mixedDetailSection,
  textPart,
} from '../../../display/result-detail-lines';
import {
  buildSymbolicPolynomialNode,
} from '../../primitives/symbolic-polynomial';
import {
  substituteMathJsonSymbols,
} from '../../primitives/substitution/substitution';
import {
  addMathJsonNodes,
  divideMathJsonNodes,
  multiplyMathJsonNodes,
  simplifyMathJsonNodeOrOriginal,
  subtractMathJsonNodes,
} from '../../primitives/simplification/simplification';
import { boxLatex } from '../../patterns';
import { profileAlgebraicGenus1CurveCandidate } from './curve-profile';
import {
  buildAlgebraicGenus1RootPullbackNodeForm,
  type AlgebraicGenus1RootPullbackNodeForm,
} from './root-pullback-node-form';
import {
  buildAlgebraicGenus1SecondKindCoefficientMatrix,
  type AlgebraicGenus1SecondKindCoefficientMatrix,
} from './second-kind-coefficient-matrix';

export type AlgebraicGenus1SecondKindMatrixNodeSurface = {
  kind: 'success';
  variable: string;
  status: 'matrix-node-surface-ready';
  rootChartKind: AlgebraicGenus1RootPullbackNodeForm['rootChartKind'];
  integrandShape: 'radical';
  chartVariableSymbol: 'z';
  chartVariableLatex: string;
  selectedVariableInChartNode: unknown;
  dxDzNode: unknown;
  radicandInChartNode: unknown;
  rawPullbackNode: unknown;
  pullbackOverFirstKindKernelNode: unknown;
  correctionPolynomialNode: unknown;
  correctionDerivativeNode: unknown;
  correctionDerivativeFormula: 'expanded-normalized-second-kind-kernel';
  coefficientComparisonNode: unknown;
  rowBasisNodes: unknown[];
  unknownSymbols: string[];
  matrixShape: AlgebraicGenus1SecondKindCoefficientMatrix['matrixShape'];
  canPopulateEntries: true;
  canSolveDirectly: false;
  canAdoptLive: false;
  detailSections: DisplayDetailSection[];
  readinessNotes: string[];
  proofObligations: string[];
};

export type AlgebraicGenus1SecondKindMatrixNodeSurfaceResult =
  | AlgebraicGenus1SecondKindMatrixNodeSurface
  | {
      kind: 'stop';
      variable: string;
      reason:
        | 'curve-profile-stop'
        | 'node-form-stop'
        | 'matrix-stop'
        | 'unsupported-shape'
        | 'substitution-stop';
      detail: string;
    };

export type AlgebraicGenus1SecondKindMatrixNodeSurfaceOptions = {
  includeDetailSections?: boolean;
};

const Z = 'z';
const THIRD_KIND_CHARACTERISTIC = 'n_p';
const THIRD_KIND_COEFFICIENT = 'C_Pi_p';

function power(node: unknown, exponent: number) {
  return exponent === 0 ? 1 : exponent === 1 ? node : ['Power', node, exponent];
}

function correctionPolynomial(symbols: readonly string[]) {
  return addMathJsonNodes(
    ...symbols.map((symbol, index) => multiplyMathJsonNodes(symbol, power(Z, index))),
  );
}

function correctionPolynomialDerivative(symbols: readonly string[]) {
  const derivativeTerms = symbols.flatMap((symbol, index) => (
    index === 0 ? [] : [multiplyMathJsonNodes(index, symbol, power(Z, index - 1))]
  ));
  return addMathJsonNodes(...derivativeTerms);
}

function normalizedCorrectionDerivative(input: {
  correctionSymbols: readonly string[];
  correctionPolynomialNode: unknown;
  parameterNode: unknown;
}) {
  const polynomialDerivative = correctionPolynomialDerivative(input.correctionSymbols);
  const secondKindKernelSquared = subtractMathJsonNodes(
    1,
    multiplyMathJsonNodes(input.parameterNode, Z),
  );
  return simplifyMathJsonNodeOrOriginal(
    subtractMathJsonNodes(
      multiplyMathJsonNodes(polynomialDerivative, secondKindKernelSquared),
      multiplyMathJsonNodes(
        divideMathJsonNodes(input.parameterNode, 2),
        input.correctionPolynomialNode,
      ),
    ),
    { maxNodeCount: 5000 },
  );
}

function coefficientComparison(input: {
  pullbackOverFirstKindKernelNode: unknown;
  parameterNode: unknown;
  correctionDerivativeNode: unknown;
}) {
  const firstKindUnknown = 'C_F';
  const secondKindContribution = multiplyMathJsonNodes(
    'C_E',
    subtractMathJsonNodes(1, multiplyMathJsonNodes(input.parameterNode, Z)),
  );
  const thirdKindContribution = divideMathJsonNodes(
    THIRD_KIND_COEFFICIENT,
    subtractMathJsonNodes(1, multiplyMathJsonNodes(THIRD_KIND_CHARACTERISTIC, Z)),
  );

  return [
    'Equal',
    subtractMathJsonNodes(
      input.pullbackOverFirstKindKernelNode,
      addMathJsonNodes(
        firstKindUnknown,
        secondKindContribution,
        thirdKindContribution,
        input.correctionDerivativeNode,
      ),
    ),
    0,
  ];
}

function rowBasisNodes(rowCount: number) {
  return Array.from({ length: rowCount }, (_, index) => power(Z, index));
}

function substituteVariable(node: unknown, variable: string, replacement: unknown) {
  return substituteMathJsonSymbols(node, { [variable]: replacement }, { maxNodeCount: 5000 });
}

function detailSection(input: AlgebraicGenus1SecondKindMatrixNodeSurface) {
  return mixedDetailSection(
    'Genus-1 Second-Kind Matrix Node Surface',
    [
      [textPart('status: '), textPart(input.status)],
      [textPart('root chart: '), textPart(input.rootChartKind)],
      [textPart('chart variable: '), mathPart(input.chartVariableLatex)],
      [textPart('radicand in chart: '), mathPart(boxLatex(input.radicandInChartNode))],
      [textPart('raw pullback: '), mathPart(boxLatex(input.rawPullbackNode))],
      [textPart('rhs node: '), mathPart(boxLatex(input.pullbackOverFirstKindKernelNode))],
      [textPart('correction polynomial: '), mathPart(boxLatex(input.correctionPolynomialNode))],
      [textPart('correction derivative: '), mathPart(boxLatex(input.correctionDerivativeNode))],
      [textPart('coefficient comparison: '), mathPart(boxLatex(input.coefficientComparisonNode))],
    ],
  );
}

export function buildAlgebraicGenus1SecondKindMatrixNodeSurface(
  node: unknown,
  variable = 'x',
  options: AlgebraicGenus1SecondKindMatrixNodeSurfaceOptions = {},
): AlgebraicGenus1SecondKindMatrixNodeSurfaceResult {
  const curve = profileAlgebraicGenus1CurveCandidate(node, variable);
  if (curve.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'curve-profile-stop',
      detail: curve.detail ?? curve.reason,
    };
  }

  if (curve.integrandShape !== 'radical') {
    return {
      kind: 'stop',
      variable,
      reason: 'unsupported-shape',
      detail: 'The second-kind matrix node surface is only needed for raw radical genus-1 pullbacks.',
    };
  }

  const nodeForm = buildAlgebraicGenus1RootPullbackNodeForm(node, variable);
  if (nodeForm.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'node-form-stop',
      detail: nodeForm.detail,
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

  const radicandNode = buildSymbolicPolynomialNode(curve.radicandPolynomial);
  const substituted = substituteVariable(
    radicandNode,
    variable,
    nodeForm.selectedVariableInChartNode,
  );
  if (substituted.kind === 'unsupported') {
    return {
      kind: 'stop',
      variable,
      reason: 'substitution-stop',
      detail: substituted.message,
    };
  }

  const radicandInChartNode = simplifyMathJsonNodeOrOriginal(substituted.node, { maxNodeCount: 5000 });
  const rawIntegrandPullback = multiplyMathJsonNodes(
    ['Sqrt', radicandInChartNode],
    nodeForm.dxDzNode,
  );
  const rawPullbackNode = simplifyMathJsonNodeOrOriginal(rawIntegrandPullback, { maxNodeCount: 5000 });
  const pullbackOverFirstKindKernelNode = simplifyMathJsonNodeOrOriginal(
    divideMathJsonNodes(rawPullbackNode, nodeForm.firstKindKernelNode),
    { maxNodeCount: 5000 },
  );
  const correctionSymbols = matrix.unknowns
    .filter((unknown) => unknown.block === 'rational-correction')
    .map((unknown) => unknown.symbolLatex);
  const correctionPolynomialNode = correctionPolynomial(correctionSymbols);
  const correctionDerivativeNode = normalizedCorrectionDerivative({
    correctionSymbols,
    correctionPolynomialNode,
    parameterNode: nodeForm.parameterNode,
  });
  const comparisonNode = coefficientComparison({
    pullbackOverFirstKindKernelNode,
    parameterNode: nodeForm.parameterNode,
    correctionDerivativeNode,
  });

  const result: AlgebraicGenus1SecondKindMatrixNodeSurface = {
    kind: 'success',
    variable,
    status: 'matrix-node-surface-ready',
    rootChartKind: nodeForm.rootChartKind,
    integrandShape: 'radical',
    chartVariableSymbol: Z,
    chartVariableLatex: nodeForm.chartVariableLatex,
    selectedVariableInChartNode: nodeForm.selectedVariableInChartNode,
    dxDzNode: nodeForm.dxDzNode,
    radicandInChartNode,
    rawPullbackNode,
    pullbackOverFirstKindKernelNode,
    correctionPolynomialNode,
    correctionDerivativeNode,
    correctionDerivativeFormula: 'expanded-normalized-second-kind-kernel',
    coefficientComparisonNode: comparisonNode,
    rowBasisNodes: rowBasisNodes(matrix.matrixShape.rows),
    unknownSymbols: matrix.unknowns.map((unknown) => unknown.symbolLatex),
    matrixShape: matrix.matrixShape,
    canPopulateEntries: true,
    canSolveDirectly: false,
    canAdoptLive: false,
    detailSections: [],
    readinessNotes: [
      ...nodeForm.readinessNotes,
      ...matrix.readinessNotes,
      'The coefficient matrix now has a MathJSON node surface for the pullback RHS, basis kernels, correction polynomial, and row powers.',
      'The rational-correction derivative is expanded as S\\prime(z)(1-mz) - (m/2)S(z) over the first-kind kernel.',
      'Expansion into actual matrix entries and root-field solving remain separate prerequisites before live EllipticE/Pi adoption.',
    ],
    proofObligations: [
      'Expand the node coefficient comparison in z under strict caps to populate matrix entries.',
      'Solve the populated matrix over the named-root coefficient field and collect pivot facts.',
      'Build a node-first F/E/Pi antiderivative and proof-check it before changing live dispatch.',
    ],
  };

  if (options.includeDetailSections === false) {
    return result;
  }

  return {
    ...result,
    detailSections: [
      ...nodeForm.detailSections,
      ...matrix.detailSections,
      detailSection(result),
    ],
  };
}
