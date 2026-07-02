import type { DisplayDetailSection } from '../../../../types/calculator';
import {
  mathPart,
  mixedDetailSection,
  textPart,
} from '../../../display/result-detail-lines';
import { boxLatex } from '../../patterns';
import {
  divideMathJsonNodes,
  multiplyMathJsonNodes,
  subtractMathJsonNodes,
} from '../../primitives/simplification/simplification';
import {
  profileAlgebraicGenus1RootPullbackBasis,
  type AlgebraicGenus1RootPullbackBasisProfile,
  type AlgebraicGenus1RootPullbackLegendreData,
} from './root-pullback-basis-profile';

export type AlgebraicGenus1RootPullbackNodeForm = {
  kind: 'success';
  variable: string;
  status: 'node-pullback-ready';
  integrandShape: AlgebraicGenus1RootPullbackBasisProfile['integrandShape'];
  rootChartKind: AlgebraicGenus1RootPullbackLegendreData['dataKind'];
  chartVariableSymbol: 'z';
  chartVariableLatex: string;
  selectedVariableInChartNode: unknown;
  selectedVariableInChartLatex: string;
  dxDzNode: unknown;
  dxDzLatex: string;
  parameterNode: unknown;
  parameterLatex: string;
  firstKindKernelNode: unknown;
  firstKindKernelLatex: string;
  secondKindKernelNode: unknown;
  secondKindKernelLatex: string;
  thirdKindKernelTemplateNode: unknown;
  thirdKindKernelTemplateLatex: string;
  canPopulateCoefficientMatrix: boolean;
  canAdoptLive: false;
  proofObligations: string[];
  detailSections: DisplayDetailSection[];
  readinessNotes: string[];
};

export type AlgebraicGenus1RootPullbackNodeFormResult =
  | AlgebraicGenus1RootPullbackNodeForm
  | {
      kind: 'stop';
      variable: string;
      reason: 'pullback-profile-stop';
      detail: string;
    };

type ChartNodeData = {
  chartVariableLatex: string;
  selectedVariableInChartNode: unknown;
  dxDzNode: unknown;
  parameterNode: unknown;
};

const Z = 'z';
const THIRD_KIND_CHARACTERISTIC = 'n_p';

function alpha(index: number) {
  return `alpha_${index}`;
}

function betaForAlpha1() {
  return 'beta_alpha_1';
}

function scaleForAlpha1() {
  return 'A_alpha_1';
}

function power(node: unknown, exponent: number) {
  return ['Power', node, exponent];
}

function add(left: unknown, right: unknown) {
  return ['Add', left, right];
}

function sub(left: unknown, right: unknown) {
  return subtractMathJsonNodes(left, right);
}

function mul(...nodes: unknown[]) {
  return multiplyMathJsonNodes(...nodes);
}

function div(left: unknown, right: unknown) {
  return divideMathJsonNodes(left, right);
}

function sqrt(node: unknown) {
  return ['Sqrt', node];
}

function firstKindKernel(parameterNode: unknown) {
  return div(1, sqrt(sub(1, mul(parameterNode, Z))));
}

function secondKindKernel(parameterNode: unknown) {
  return sqrt(sub(1, mul(parameterNode, Z)));
}

function thirdKindKernel(parameterNode: unknown) {
  return div(
    1,
    mul(
      sub(1, mul(THIRD_KIND_CHARACTERISTIC, Z)),
      sqrt(sub(1, mul(parameterNode, Z))),
    ),
  );
}

function cubicThreeRealRootNodes(): ChartNodeData {
  const a1 = alpha(1);
  const a2 = alpha(2);
  const a3 = alpha(3);
  const denominator = sub(1, Z);
  const selectedVariableInChartNode = div(
    sub(a3, mul(a2, Z)),
    denominator,
  );
  const dxDzNode = div(
    sub(a3, a2),
    power(denominator, 2),
  );
  const parameterNode = div(
    sub(a2, a1),
    sub(a3, a1),
  );

  return {
    chartVariableLatex: 'z=\\sin^2\\phi',
    selectedVariableInChartNode,
    dxDzNode,
    parameterNode,
  };
}

function quarticFourRealRootNodes(): ChartNodeData {
  const a1 = alpha(1);
  const a2 = alpha(2);
  const a3 = alpha(3);
  const a4 = alpha(4);
  const leftGap = sub(a3, a1);
  const middleGap = sub(a3, a2);
  const denominator = sub(leftGap, mul(middleGap, Z));
  const numerator = sub(
    mul(leftGap, a2),
    mul(middleGap, a1, Z),
  );
  const numeratorDerivative = mul(-1, middleGap, a1);
  const denominatorDerivative = mul(-1, middleGap);
  const selectedVariableInChartNode = div(numerator, denominator);
  const dxDzNode = div(
    sub(
      mul(numeratorDerivative, denominator),
      mul(numerator, denominatorDerivative),
    ),
    power(denominator, 2),
  );
  const parameterNode = div(
    mul(middleGap, sub(a4, a1)),
    mul(sub(a4, a2), leftGap),
  );

  return {
    chartVariableLatex: 'z=\\sin^2\\phi',
    selectedVariableInChartNode,
    dxDzNode,
    parameterNode,
  };
}

function cubicComplexPairNodes(): ChartNodeData {
  const a1 = alpha(1);
  const beta = betaForAlpha1();
  const scale = scaleForAlpha1();
  const selectedVariableInChartNode = add(a1, mul(scale, Z));
  const dxDzNode = scale;
  const parameterNode = div(
    add(sub(scale, a1), beta),
    mul(2, scale),
  );

  return {
    chartVariableLatex: 'z=\\tan^2\\left(\\frac{\\phi}{2}\\right)',
    selectedVariableInChartNode,
    dxDzNode,
    parameterNode,
  };
}

function chartNodesFor(
  dataKind: AlgebraicGenus1RootPullbackLegendreData['dataKind'],
) {
  if (dataKind === 'cubic-three-real-roots') {
    return cubicThreeRealRootNodes();
  }
  if (dataKind === 'quartic-four-real-roots') {
    return quarticFourRealRootNodes();
  }
  return cubicComplexPairNodes();
}

function canPopulateCoefficientMatrix(profile: AlgebraicGenus1RootPullbackBasisProfile) {
  return profile.integrandShape === 'radical' || profile.integrandShape === 'rational-in-radical';
}

function detailSection(input: AlgebraicGenus1RootPullbackNodeForm) {
  return mixedDetailSection(
    'Genus-1 Root Pullback Node Form',
    [
      [textPart('status: '), textPart(input.status)],
      [textPart('chart variable: '), mathPart(input.chartVariableLatex)],
      [textPart('selected variable in chart: '), mathPart(input.selectedVariableInChartLatex)],
      [textPart('chart derivative: '), mathPart(input.dxDzLatex)],
      [textPart('parameter: '), mathPart(input.parameterLatex)],
      [textPart('first-kind kernel: '), mathPart(input.firstKindKernelLatex)],
      [textPart('second-kind kernel: '), mathPart(input.secondKindKernelLatex)],
      [textPart('third-kind kernel template: '), mathPart(input.thirdKindKernelTemplateLatex)],
    ],
  );
}

export function buildAlgebraicGenus1RootPullbackNodeForm(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1RootPullbackNodeFormResult {
  const profile = profileAlgebraicGenus1RootPullbackBasis(node, variable);
  if (profile.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'pullback-profile-stop',
      detail: profile.detail,
    };
  }

  const chart = chartNodesFor(profile.rootLegendreData.dataKind);
  const firstKernel = firstKindKernel(chart.parameterNode);
  const secondKernel = secondKindKernel(chart.parameterNode);
  const thirdKernel = thirdKindKernel(chart.parameterNode);
  const canPopulate = canPopulateCoefficientMatrix(profile);

  const baseResult: AlgebraicGenus1RootPullbackNodeForm = {
    kind: 'success',
    variable,
    status: 'node-pullback-ready',
    integrandShape: profile.integrandShape,
    rootChartKind: profile.rootLegendreData.dataKind,
    chartVariableSymbol: Z,
    chartVariableLatex: chart.chartVariableLatex,
    selectedVariableInChartNode: chart.selectedVariableInChartNode,
    selectedVariableInChartLatex: boxLatex(chart.selectedVariableInChartNode),
    dxDzNode: chart.dxDzNode,
    dxDzLatex: boxLatex(chart.dxDzNode),
    parameterNode: chart.parameterNode,
    parameterLatex: boxLatex(chart.parameterNode),
    firstKindKernelNode: firstKernel,
    firstKindKernelLatex: boxLatex(firstKernel),
    secondKindKernelNode: secondKernel,
    secondKindKernelLatex: boxLatex(secondKernel),
    thirdKindKernelTemplateNode: thirdKernel,
    thirdKindKernelTemplateLatex: boxLatex(thirdKernel),
    canPopulateCoefficientMatrix: canPopulate,
    canAdoptLive: false,
    proofObligations: [
      'Use the MathJSON chart nodes, not display-only strings, when populating genus-1 basis or Hermite coefficient matrices.',
      'Substitute the chart variable node into the original radical differential before comparing coefficients.',
      'Live adoption remains blocked until node-built matrix entries are solved and proof-checked.',
    ],
    detailSections: [],
    readinessNotes: [
      ...profile.readinessNotes,
      'The root chart now has MathJSON nodes for x(z), dx/dz, the Legendre parameter, and the elliptic basis kernels.',
      canPopulate
        ? 'Future coefficient-matrix population may consume these nodes directly.'
        : 'The reciprocal-radical shape remains owned by the existing first-kind live route; this node form is evidence only.',
    ],
  };

  return {
    ...baseResult,
    detailSections: [
      ...profile.detailSections,
      detailSection(baseResult),
    ],
  };
}
