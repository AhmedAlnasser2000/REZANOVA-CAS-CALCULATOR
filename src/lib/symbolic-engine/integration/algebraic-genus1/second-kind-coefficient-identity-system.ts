import type { DisplayDetailSection } from '../../../../types/calculator';
import {
  mathPart,
  mixedDetailSection,
  textPart,
} from '../../../display/result-detail-lines';
import { buildAlgebraicGenus1RootPullbackRationalForm } from './root-pullback-rational-form';
import { buildAlgebraicGenus1SecondKindBasisReadiness } from './second-kind-basis-readiness';
import type { AlgebraicGenus1RootPullbackLegendreData } from './root-pullback-basis-profile';

export type AlgebraicGenus1SecondKindCoefficientIdentitySystem = {
  kind: 'success';
  variable: string;
  status: 'finite-identity-system-ready';
  rootChartKind: AlgebraicGenus1RootPullbackLegendreData['dataKind'];
  preferredBranchLatex: string;
  chartVariableLatex: string;
  coefficientFieldLatex: string;
  rationalCoefficientLatex: string;
  correctionDegreeCap: number;
  basisUnknownsLatex: string[];
  correctionUnknownsLatex: string[];
  identityLatex: string;
  coefficientComparisonLatex: string;
  canAdoptLive: false;
  proofObligations: string[];
  detailSections: DisplayDetailSection[];
  readinessNotes: string[];
};

export type AlgebraicGenus1SecondKindCoefficientIdentitySystemResult =
  | AlgebraicGenus1SecondKindCoefficientIdentitySystem
  | {
      kind: 'stop';
      variable: string;
      reason: 'second-kind-readiness-stop' | 'pullback-rational-form-stop';
      detail: string;
    };

function correctionDegreeCap(kind: AlgebraicGenus1RootPullbackLegendreData['dataKind']) {
  if (kind === 'cubic-three-real-roots') {
    return 2;
  }
  return 3;
}

function correctionUnknowns(cap: number) {
  return Array.from({ length: cap + 1 }, (_, index) => `s_${index}`);
}

function correctionPolynomial(cap: number) {
  const terms = correctionUnknowns(cap).map((symbol, index) => {
    if (index === 0) {
      return symbol;
    }
    if (index === 1) {
      return `${symbol}z`;
    }
    return `${symbol}z^${index}`;
  });
  return `S(z)=${terms.join('+')}`;
}

function identityLatex(input: {
  rationalCoefficientLatex: string;
  parameterLatex: string;
  correctionPolynomialLatex: string;
}) {
  return [
    `A(z)=${input.rationalCoefficientLatex}`,
    `A(z)K_F=C_FK_F+C_EK_E+\\sum_p C_{\\Pi,p}K_{\\Pi}(p)`,
    `+d\\left(${input.correctionPolynomialLatex}\\sqrt{1-${input.parameterLatex}z}\\right)`,
  ].join('');
}

function coefficientComparisonLatex(input: {
  rationalCoefficientLatex: string;
  parameterLatex: string;
  correctionPolynomialLatex: string;
}) {
  return [
    '\\operatorname{num}\\left(',
    `${input.rationalCoefficientLatex}-C_F-C_E(1-${input.parameterLatex}z)`,
    '-\\sum_p\\frac{C_{\\Pi,p}}{1-n_pz}',
    `-\\frac{d\\left(${input.correctionPolynomialLatex}\\sqrt{1-${input.parameterLatex}z}\\right)}{K_F}`,
    '\\right)=0',
  ].join('');
}

function detailSection(input: AlgebraicGenus1SecondKindCoefficientIdentitySystem) {
  return mixedDetailSection(
    'Genus-1 Second-Kind Coefficient Identity System',
    [
      [textPart('status: '), textPart(input.status)],
      [textPart('root chart: '), textPart(input.rootChartKind)],
      [textPart('chart variable: '), mathPart(input.chartVariableLatex)],
      [textPart('coefficient field: '), mathPart(input.coefficientFieldLatex)],
      [textPart('basis unknowns: '), mathPart(input.basisUnknownsLatex.join(', '))],
      [textPart('correction unknowns: '), mathPart(input.correctionUnknownsLatex.join(', '))],
      [textPart('identity: '), mathPart(input.identityLatex)],
      [textPart('coefficient comparison: '), mathPart(input.coefficientComparisonLatex)],
    ],
  );
}

export function buildAlgebraicGenus1SecondKindCoefficientIdentitySystem(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1SecondKindCoefficientIdentitySystemResult {
  const readiness = buildAlgebraicGenus1SecondKindBasisReadiness(node, variable);
  if (readiness.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'second-kind-readiness-stop',
      detail: readiness.detail,
    };
  }

  const pullback = buildAlgebraicGenus1RootPullbackRationalForm(node, variable);
  if (pullback.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'pullback-rational-form-stop',
      detail: pullback.detail,
    };
  }

  const cap = correctionDegreeCap(readiness.rootChartKind);
  const correctionPolynomialLatex = correctionPolynomial(cap);
  const identity = identityLatex({
    rationalCoefficientLatex: pullback.rationalCoefficientLatex,
    parameterLatex: readiness.parameterLatex,
    correctionPolynomialLatex,
  });
  const coefficientComparison = coefficientComparisonLatex({
    rationalCoefficientLatex: pullback.rationalCoefficientLatex,
    parameterLatex: readiness.parameterLatex,
    correctionPolynomialLatex,
  });
  const result: AlgebraicGenus1SecondKindCoefficientIdentitySystem = {
    kind: 'success',
    variable,
    status: 'finite-identity-system-ready',
    rootChartKind: readiness.rootChartKind,
    preferredBranchLatex: readiness.preferredBranchLatex,
    chartVariableLatex: pullback.chartVariableLatex,
    coefficientFieldLatex: readiness.coefficientFieldLatex,
    rationalCoefficientLatex: pullback.rationalCoefficientLatex,
    correctionDegreeCap: cap,
    basisUnknownsLatex: ['C_F', 'C_E', 'C_{\\Pi,p}'],
    correctionUnknownsLatex: correctionUnknowns(cap),
    identityLatex: identity,
    coefficientComparisonLatex: coefficientComparison,
    canAdoptLive: false,
    proofObligations: [
      'Solve the displayed finite coefficient-comparison identity over the named-root coefficient field.',
      'Collect nonzero pivot and pole facts from the solved coefficient system.',
      'Differentiate the resulting F/E/Pi plus rational-correction antiderivative with Compute Engine fallback denied before live adoption.',
    ],
    detailSections: [],
    readinessNotes: [
      ...readiness.readinessNotes,
      ...pullback.readinessNotes,
      'The second-kind raw radical now has a finite coefficient-identity system, but it is not live-adoptable yet.',
    ],
  };

  return {
    ...result,
    detailSections: [
      ...readiness.detailSections,
      ...pullback.detailSections,
      detailSection(result),
    ],
  };
}
