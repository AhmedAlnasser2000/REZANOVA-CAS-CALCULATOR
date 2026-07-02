import type { DisplayDetailSection } from '../../../../types/calculator';
import {
  mathPart,
  mixedDetailSection,
  textPart,
} from '../../../display/result-detail-lines';
import type {
  AlgebraicGenus1RootLegendreData,
  AlgebraicGenus1RootLegendreDataResult,
} from './root-legendre-data';
import type {
  AlgebraicGenus1ComplexPairLegendreData,
  AlgebraicGenus1ComplexPairLegendreDataResult,
} from './complex-pair-legendre-data';

type SupportedLegendreData =
  | AlgebraicGenus1RootLegendreData
  | AlgebraicGenus1ComplexPairLegendreData;

type SupportedLegendreDataResult =
  | AlgebraicGenus1RootLegendreDataResult
  | AlgebraicGenus1ComplexPairLegendreDataResult;

export type AlgebraicGenus1LegendreChangeOfVariableProof = {
  kind: 'success';
  variable: string;
  dataKind: SupportedLegendreData['dataKind'];
  proofStatus: 'change-of-variable-proved';
  substitutionLatex: string;
  inverseMapLatex: string;
  parameterLatex: string;
  multiplierLatex: string;
  radicandFactorizationLatex: string;
  differentialIdentityLatex: string;
  firstKindKernelLatex: string;
  detailSections: DisplayDetailSection[];
  readinessNotes: string[];
};

export type AlgebraicGenus1LegendreChangeOfVariableProofResult =
  | AlgebraicGenus1LegendreChangeOfVariableProof
  | {
      kind: 'stop';
      variable: string;
      reason: 'root-legendre-stop' | 'unsupported-root-chart';
      detail: string;
      rootLegendreData?: SupportedLegendreDataResult;
    };

type RealRootLegendreProofInput =
  Omit<
    AlgebraicGenus1RootLegendreData,
    'changeOfVariableProof' | 'rootBasisCoefficientProof'
  > & {
    changeOfVariableProof?: AlgebraicGenus1LegendreChangeOfVariableProof;
  };
type ComplexPairLegendreProofInput =
  Omit<AlgebraicGenus1ComplexPairLegendreData, 'changeOfVariableProof'> & {
    changeOfVariableProof?: AlgebraicGenus1LegendreChangeOfVariableProof;
  };
type RootLegendreProofInput =
  | RealRootLegendreProofInput
  | ComplexPairLegendreProofInput;

function isOneLatex(latex: string) {
  return latex === '1';
}

function radicandName(variable: string) {
  return `P\\left(${variable}\\right)`;
}

function scaledProduct(leadingCoefficientLatex: string, factors: string[]) {
  const product = factors.map((factor) => `\\left(${factor}\\right)`).join('');
  return isOneLatex(leadingCoefficientLatex)
    ? product
    : `${leadingCoefficientLatex}${product}`;
}

function cubicProof(data: RootLegendreProofInput) {
  const [alpha1, alpha2, alpha3] = data.rootSymbolsLatex;
  const variable = data.variable;
  const substitutionLatex =
    `\\sin^2\\phi=\\frac{${variable}-${alpha3}}{${variable}-${alpha2}}`;
  const radicandFactorizationLatex =
    `${radicandName(variable)}=${scaledProduct(data.leadingCoefficientLatex, [
      `${variable}-${alpha1}`,
      `${variable}-${alpha2}`,
      `${variable}-${alpha3}`,
    ])}`;
  const firstKindKernelLatex =
    `\\frac{d\\phi}{\\sqrt{1-${data.parameterLatex}\\sin^2\\phi}}`;
  const differentialIdentityLatex =
    `\\frac{d${variable}}{\\sqrt{${radicandName(variable)}}}=${data.multiplierLatex}\\cdot ${firstKindKernelLatex}`;

  return {
    substitutionLatex,
    radicandFactorizationLatex,
    firstKindKernelLatex,
    differentialIdentityLatex,
  };
}

function quarticProof(data: RootLegendreProofInput) {
  const [alpha1, alpha2, alpha3, alpha4] = data.rootSymbolsLatex;
  const variable = data.variable;
  const substitutionLatex =
    `\\sin^2\\phi=\\frac{(${alpha3}-${alpha1})(${variable}-${alpha2})}{(${alpha3}-${alpha2})(${variable}-${alpha1})}`;
  const radicandFactorizationLatex =
    `${radicandName(variable)}=${scaledProduct(data.leadingCoefficientLatex, [
      `${variable}-${alpha1}`,
      `${variable}-${alpha2}`,
      `${variable}-${alpha3}`,
      `${variable}-${alpha4}`,
    ])}`;
  const firstKindKernelLatex =
    `\\frac{d\\phi}{\\sqrt{1-${data.parameterLatex}\\sin^2\\phi}}`;
  const differentialIdentityLatex =
    `\\frac{d${variable}}{\\sqrt{${radicandName(variable)}}}=${data.multiplierLatex}\\cdot ${firstKindKernelLatex}`;

  return {
    substitutionLatex,
    radicandFactorizationLatex,
    firstKindKernelLatex,
    differentialIdentityLatex,
  };
}

function complexPairCubicProof(data: ComplexPairLegendreProofInput) {
  const variable = data.variable;
  const substitutionLatex =
    `\\tan^2\\left(\\frac{\\phi}{2}\\right)=\\frac{${variable}-${data.realRootLatex}}{${data.scaleSymbolLatex}}`;
  const radicandFactorizationLatex =
    `${radicandName(variable)}=${scaledProduct(data.leadingCoefficientLatex, [
      `${variable}-${data.realRootLatex}`,
      `Q_{${data.realRootLatex}}\\left(${variable}\\right)`,
    ])}`;
  const firstKindKernelLatex =
    `\\frac{d\\phi}{\\sqrt{1-${data.parameterLatex}\\sin^2\\phi}}`;
  const differentialIdentityLatex =
    `\\frac{d${variable}}{\\sqrt{${radicandName(variable)}}}=${data.multiplierLatex}\\cdot ${firstKindKernelLatex}`;

  return {
    substitutionLatex,
    radicandFactorizationLatex,
    firstKindKernelLatex,
    differentialIdentityLatex,
  };
}

function isComplexPairProofInput(
  data: RootLegendreProofInput,
): data is ComplexPairLegendreProofInput {
  return data.dataKind === 'cubic-one-real-root-complex-pair';
}

export function buildAlgebraicGenus1LegendreChangeOfVariableProofFromData(
  data: RootLegendreProofInput,
): AlgebraicGenus1LegendreChangeOfVariableProof {
  let proofParts: ReturnType<typeof cubicProof>;
  if (data.dataKind === 'cubic-three-real-roots') {
    proofParts = cubicProof(data);
  } else if (data.dataKind === 'quartic-four-real-roots') {
    proofParts = quarticProof(data);
  } else if (isComplexPairProofInput(data)) {
    proofParts = complexPairCubicProof(data);
  } else {
    proofParts = cubicProof(data);
  }
  const detailSections: DisplayDetailSection[] = [
    mixedDetailSection(
      'Genus-1 Legendre Change Of Variable Proof',
      [
        [textPart('chart: '), mathPart(data.preferredBranchLatex)],
        [textPart('substitution: '), mathPart(proofParts.substitutionLatex)],
        [textPart('inverse map: '), mathPart(data.inverseMapLatex)],
        [textPart('radicand factorization: '), mathPart(proofParts.radicandFactorizationLatex)],
        [textPart('first-kind differential identity: '), mathPart(proofParts.differentialIdentityLatex)],
      ],
    ),
  ];

  return {
    kind: 'success',
    variable: data.variable,
    dataKind: data.dataKind,
    proofStatus: 'change-of-variable-proved',
    substitutionLatex: proofParts.substitutionLatex,
    inverseMapLatex: data.inverseMapLatex,
    parameterLatex: data.parameterLatex,
    multiplierLatex: data.multiplierLatex,
    radicandFactorizationLatex: proofParts.radicandFactorizationLatex,
    differentialIdentityLatex: proofParts.differentialIdentityLatex,
    firstKindKernelLatex: proofParts.firstKindKernelLatex,
    detailSections,
    readinessNotes: [
      'The named-root substitution has an explicit exact differential identity for the first-kind Legendre kernel.',
      'Second-kind and third-kind adoption still require separate basis-coefficient solving before live use.',
    ],
  };
}

export function buildAlgebraicGenus1LegendreChangeOfVariableProof(
  rootLegendreData: SupportedLegendreDataResult,
): AlgebraicGenus1LegendreChangeOfVariableProofResult {
  if (rootLegendreData.kind === 'stop') {
    return {
      kind: 'stop',
      variable: rootLegendreData.variable,
      reason: 'root-legendre-stop',
      detail: rootLegendreData.detail,
      rootLegendreData,
    };
  }

  if (
    rootLegendreData.dataKind !== 'cubic-three-real-roots'
    && rootLegendreData.dataKind !== 'quartic-four-real-roots'
    && rootLegendreData.dataKind !== 'cubic-one-real-root-complex-pair'
  ) {
    return {
      kind: 'stop',
      variable: rootLegendreData.variable,
      reason: 'unsupported-root-chart',
      detail: 'Only three-real-root cubic and four-real-root quartic charts have Legendre change-of-variable proof evidence.',
      rootLegendreData,
    };
  }

  return buildAlgebraicGenus1LegendreChangeOfVariableProofFromData(rootLegendreData);
}
