import type { DisplayDetailSection } from '../../../../types/calculator';
import {
  buildExactScalarNode,
  exactScalarToNumber,
  readExactScalarNode,
} from '../../../algebra/polynomial-core';
import {
  mathPart,
  mixedDetailSection,
  textPart,
} from '../../../display/result-detail-lines';
import { getSymbolicPolynomialCoefficient } from '../../primitives/symbolic-polynomial';
import { boxLatex } from '../../patterns';
import {
  buildAlgebraicGenus1LegendreChangeOfVariableProofFromData,
  type AlgebraicGenus1LegendreChangeOfVariableProof,
} from './legendre-change-of-variable-proof';
import { profileAlgebraicGenus1CurveCandidate } from './curve-profile';
import {
  buildAlgebraicGenus1NamedRootReadback,
  type AlgebraicGenus1NamedRootReadbackResult,
} from './named-root-readback';

export type AlgebraicGenus1RootLegendreDataKind =
  | 'cubic-three-real-roots'
  | 'quartic-four-real-roots';

export type AlgebraicGenus1RootLegendreData = {
  kind: 'success';
  dataKind: AlgebraicGenus1RootLegendreDataKind;
  variable: string;
  rootSymbolsLatex: string[];
  leadingCoefficientLatex: string;
  preferredBranchLatex: string;
  amplitudeLatex: string;
  parameterLatex: string;
  multiplierLatex: string;
  inverseMapLatex: string;
  firstKindPrototypeLatex: string;
  secondKindBasisLatex: string;
  thirdKindCharacteristicTemplateLatex: string;
  changeOfVariableProof: AlgebraicGenus1LegendreChangeOfVariableProof;
  branchFactsLatex: string[];
  realDomainLatex: string[];
  detailSections: DisplayDetailSection[];
  readinessNotes: string[];
};

export type AlgebraicGenus1RootLegendreDataStopReason =
  | 'named-root-stop'
  | 'nonpositive-leading-coefficient'
  | 'insufficient-real-roots'
  | 'unsupported-root-count';

export type AlgebraicGenus1RootLegendreDataResult =
  | AlgebraicGenus1RootLegendreData
  | {
      kind: 'stop';
      variable: string;
      reason: AlgebraicGenus1RootLegendreDataStopReason;
      namedRootReadback?: AlgebraicGenus1NamedRootReadbackResult;
      detail: string;
    };

function square(latex: string) {
  return `\\sin^2\\left(${latex}\\right)`;
}

function ellipticF(amplitudeLatex: string, parameterLatex: string) {
  return `\\operatorname{EllipticF}\\left(${amplitudeLatex},${parameterLatex}\\right)`;
}

function ellipticE(amplitudeLatex: string, parameterLatex: string) {
  return `\\operatorname{EllipticE}\\left(${amplitudeLatex},${parameterLatex}\\right)`;
}

function isOneLatex(latex: string) {
  return latex === '1';
}

function scaledRadicandFactor(leadingCoefficientLatex: string, rootFactorLatex: string) {
  return isOneLatex(leadingCoefficientLatex)
    ? rootFactorLatex
    : `${leadingCoefficientLatex}\\left(${rootFactorLatex}\\right)`;
}

function cubicRootLegendreData(
  named: Extract<AlgebraicGenus1NamedRootReadbackResult, { kind: 'success' }>,
  leadingCoefficientLatex: string,
): AlgebraicGenus1RootLegendreData {
  const [alpha1, alpha2, alpha3] = named.rootSymbolsLatex;
  const phi = '\\phi';
  const sinSquared = square(phi);
  const amplitudeLatex =
    `\\arcsin\\sqrt{\\frac{${named.variable}-${alpha3}}{${named.variable}-${alpha2}}}`;
  const parameterLatex = `\\frac{${alpha2}-${alpha1}}{${alpha3}-${alpha1}}`;
  const multiplierLatex = `\\frac{2}{\\sqrt{${scaledRadicandFactor(leadingCoefficientLatex, `${alpha3}-${alpha1}`)}}}`;
  const inverseMapLatex =
    `${named.variable}=\\frac{${alpha3}-${alpha2}${sinSquared}}{1-${sinSquared}}`;
  const preferredBranchLatex = `${named.variable}>${alpha3}`;
  const firstKindPrototypeLatex =
    `${multiplierLatex}\\cdot ${ellipticF(amplitudeLatex, parameterLatex)}`;
  const secondKindBasisLatex =
    `${ellipticE(amplitudeLatex, parameterLatex)}\\text{ after differential-basis reduction}`;
  const thirdKindCharacteristicTemplateLatex =
    `n(p)=\\frac{(${alpha2}-${alpha1})(p-${alpha3})}{(${alpha3}-${alpha1})(p-${alpha2})}`;

  return buildResult({
    dataKind: 'cubic-three-real-roots',
    variable: named.variable,
    named,
    leadingCoefficientLatex,
    preferredBranchLatex,
    amplitudeLatex,
    parameterLatex,
    multiplierLatex,
    inverseMapLatex,
    firstKindPrototypeLatex,
    secondKindBasisLatex,
    thirdKindCharacteristicTemplateLatex,
  });
}

function quarticRootLegendreData(
  named: Extract<AlgebraicGenus1NamedRootReadbackResult, { kind: 'success' }>,
  leadingCoefficientLatex: string,
): AlgebraicGenus1RootLegendreData {
  const [alpha1, alpha2, alpha3, alpha4] = named.rootSymbolsLatex;
  const phi = '\\phi';
  const sinSquared = square(phi);
  const amplitudeLatex =
    `\\arcsin\\sqrt{\\frac{(${alpha3}-${alpha1})(${named.variable}-${alpha2})}{(${alpha3}-${alpha2})(${named.variable}-${alpha1})}}`;
  const parameterLatex =
    `\\frac{(${alpha3}-${alpha2})(${alpha4}-${alpha1})}{(${alpha4}-${alpha2})(${alpha3}-${alpha1})}`;
  const multiplierLatex =
    `\\frac{2}{\\sqrt{${scaledRadicandFactor(leadingCoefficientLatex, `(${alpha4}-${alpha2})(${alpha3}-${alpha1})`)}}}`;
  const inverseMapLatex =
    `${named.variable}=\\frac{(${alpha3}-${alpha1})${alpha2}-(${alpha3}-${alpha2})${alpha1}${sinSquared}}{(${alpha3}-${alpha1})-(${alpha3}-${alpha2})${sinSquared}}`;
  const preferredBranchLatex = `${alpha2}<${named.variable}<${alpha3}`;
  const firstKindPrototypeLatex =
    `${multiplierLatex}\\cdot ${ellipticF(amplitudeLatex, parameterLatex)}`;
  const secondKindBasisLatex =
    `${ellipticE(amplitudeLatex, parameterLatex)}\\text{ after differential-basis reduction}`;
  const thirdKindCharacteristicTemplateLatex =
    `n(p)=\\frac{(${alpha3}-${alpha2})(p-${alpha1})}{(${alpha3}-${alpha1})(p-${alpha2})}`;

  return buildResult({
    dataKind: 'quartic-four-real-roots',
    variable: named.variable,
    named,
    leadingCoefficientLatex,
    preferredBranchLatex,
    amplitudeLatex,
    parameterLatex,
    multiplierLatex,
    inverseMapLatex,
    firstKindPrototypeLatex,
    secondKindBasisLatex,
    thirdKindCharacteristicTemplateLatex,
  });
}

function buildResult(input: {
  dataKind: AlgebraicGenus1RootLegendreDataKind;
  variable: string;
  named: Extract<AlgebraicGenus1NamedRootReadbackResult, { kind: 'success' }>;
  leadingCoefficientLatex: string;
  preferredBranchLatex: string;
  amplitudeLatex: string;
  parameterLatex: string;
  multiplierLatex: string;
  inverseMapLatex: string;
  firstKindPrototypeLatex: string;
  secondKindBasisLatex: string;
  thirdKindCharacteristicTemplateLatex: string;
}): AlgebraicGenus1RootLegendreData {
  const realDomainLatex = input.named.realDomainRows.map((row) => row.intervalLatex);
  const branchFactsLatex = [
    input.preferredBranchLatex,
    ...realDomainLatex,
  ];

  const baseResult = {
    kind: 'success' as const,
    dataKind: input.dataKind,
    variable: input.variable,
    rootSymbolsLatex: input.named.rootSymbolsLatex,
    leadingCoefficientLatex: input.leadingCoefficientLatex,
    preferredBranchLatex: input.preferredBranchLatex,
    amplitudeLatex: input.amplitudeLatex,
    parameterLatex: input.parameterLatex,
    multiplierLatex: input.multiplierLatex,
    inverseMapLatex: input.inverseMapLatex,
    firstKindPrototypeLatex: input.firstKindPrototypeLatex,
    secondKindBasisLatex: input.secondKindBasisLatex,
    thirdKindCharacteristicTemplateLatex: input.thirdKindCharacteristicTemplateLatex,
    branchFactsLatex,
    realDomainLatex,
    detailSections: [] as DisplayDetailSection[],
    readinessNotes: [] as string[],
  };
  const changeOfVariableProof = buildAlgebraicGenus1LegendreChangeOfVariableProofFromData(baseResult);

  const detailSections: DisplayDetailSection[] = [
    mixedDetailSection(
      'Root Legendre Data',
      [
        [textPart('preferred branch: '), mathPart(input.preferredBranchLatex)],
        [textPart('leading coefficient: '), mathPart(input.leadingCoefficientLatex)],
        [textPart('amplitude: '), mathPart(`\\phi=${input.amplitudeLatex}`)],
        [textPart('parameter: '), mathPart(`m=${input.parameterLatex}`)],
        [textPart('multiplier: '), mathPart(input.multiplierLatex)],
        [textPart('inverse map: '), mathPart(input.inverseMapLatex)],
      ],
    ),
    mixedDetailSection(
      'Root Elliptic Basis Readiness',
      [
        [textPart('first kind: '), mathPart(input.firstKindPrototypeLatex)],
        [textPart('second kind: '), mathPart(input.secondKindBasisLatex)],
        [textPart('third-kind characteristic template: '), mathPart(input.thirdKindCharacteristicTemplateLatex)],
      ],
    ),
    ...changeOfVariableProof.detailSections,
  ];

  return {
    ...baseResult,
    changeOfVariableProof,
    detailSections,
    readinessNotes: [
      'Exact-rational named-root Legendre data is behavior-invisible evidence for generic genus-1 adoption.',
      'The displayed branch chooses one real Legendre chart; later live routes must add chart selection or casewise branches before adoption.',
      ...changeOfVariableProof.readinessNotes,
    ],
  };
}

export function buildAlgebraicGenus1RootLegendreData(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1RootLegendreDataResult {
  const named = buildAlgebraicGenus1NamedRootReadback(node, variable);
  if (named.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'named-root-stop',
      namedRootReadback: named,
      detail: named.detail ?? 'Named-root evidence stopped before root Legendre data could be built.',
    };
  }

  const profile = profileAlgebraicGenus1CurveCandidate(node, variable);
  if (profile.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'named-root-stop',
      namedRootReadback: named,
      detail: profile.detail ?? profile.reason,
    };
  }

  const leadingCoefficient = readExactScalarNode(
    getSymbolicPolynomialCoefficient(profile.radicandPolynomial, profile.radicandDegree).node,
  );
  if (!leadingCoefficient || exactScalarToNumber(leadingCoefficient) <= 0) {
    return {
      kind: 'stop',
      variable,
      reason: 'nonpositive-leading-coefficient',
      namedRootReadback: named,
      detail: 'The current root Legendre chart is live only for positive exact leading coefficients.',
    };
  }
  const leadingCoefficientLatex = boxLatex(buildExactScalarNode(leadingCoefficient));

  if (named.rootSymbolsLatex.length === 3) {
    return cubicRootLegendreData(named, leadingCoefficientLatex);
  }
  if (named.rootSymbolsLatex.length === 4) {
    return quarticRootLegendreData(named, leadingCoefficientLatex);
  }
  if (named.rootSymbolsLatex.length < 3) {
    return {
      kind: 'stop',
      variable,
      reason: 'insufficient-real-roots',
      namedRootReadback: named,
      detail: 'This exact genus-1 curve needs a complex-pair or alternate root chart before real Legendre data is live.',
    };
  }

  return {
    kind: 'stop',
    variable,
    reason: 'unsupported-root-count',
    namedRootReadback: named,
    detail: 'Only three-real-root cubics and four-real-root quartics have root Legendre readiness data in this milestone.',
  };
}
