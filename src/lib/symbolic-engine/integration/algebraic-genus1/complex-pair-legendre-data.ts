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
import { profileAlgebraicGenus1CurveCandidate } from './curve-profile';
import {
  buildAlgebraicGenus1ComplexPairRootChart,
  type AlgebraicGenus1ComplexPairRootChart,
} from './complex-pair-root-chart';
import {
  buildAlgebraicGenus1LegendreChangeOfVariableProofFromData,
  type AlgebraicGenus1LegendreChangeOfVariableProof,
} from './legendre-change-of-variable-proof';

export type AlgebraicGenus1ComplexPairLegendreData = {
  kind: 'success';
  variable: string;
  dataKind: 'cubic-one-real-root-complex-pair';
  rootSymbolsLatex: string[];
  realRootLatex: string;
  betaLatex: string;
  rhoLatex: string;
  scaleSymbolLatex: string;
  scaleLatex: string;
  leadingCoefficientLatex: string;
  completedSquareCofactorLatex: string;
  amplitudeLatex: string;
  parameterLatex: string;
  multiplierLatex: string;
  inverseMapLatex: string;
  firstKindPrototypeLatex: string;
  changeOfVariableProof: AlgebraicGenus1LegendreChangeOfVariableProof;
  preferredBranchLatex: string;
  detailSections: DisplayDetailSection[];
  readinessNotes: string[];
};

export type AlgebraicGenus1ComplexPairLegendreDataResult =
  | AlgebraicGenus1ComplexPairLegendreData
  | {
      kind: 'stop';
      variable: string;
      reason:
        | 'chart-stop'
        | 'curve-profile-stop'
        | 'nonpositive-leading-coefficient';
      chart?: AlgebraicGenus1ComplexPairRootChart;
      detail: string;
    };

function ellipticF(amplitudeLatex: string, parameterLatex: string) {
  return `\\operatorname{EllipticF}\\left(${amplitudeLatex},${parameterLatex}\\right)`;
}

function isOneLatex(latex: string) {
  return latex === '1';
}

function scaledFactor(leadingCoefficientLatex: string, factorLatex: string) {
  return isOneLatex(leadingCoefficientLatex)
    ? factorLatex
    : `${leadingCoefficientLatex}${factorLatex}`;
}

function dataDetailSection(input: {
  realRootLatex: string;
  betaLatex: string;
  rhoLatex: string;
  scaleLatex: string;
  completedSquareCofactorLatex: string;
  amplitudeLatex: string;
  parameterLatex: string;
  multiplierLatex: string;
  inverseMapLatex: string;
  firstKindPrototypeLatex: string;
}) {
  return mixedDetailSection(
    'Complex-Pair Legendre Data',
    [
      [textPart('completed-square cofactor: '), mathPart(input.completedSquareCofactorLatex)],
      [textPart('complex-pair center: '), mathPart(input.betaLatex)],
      [textPart('complex-pair radius: '), mathPart(input.rhoLatex)],
      [textPart('real-root scale: '), mathPart(input.scaleLatex)],
      [textPart('amplitude: '), mathPart(`\\phi=${input.amplitudeLatex}`)],
      [textPart('parameter: '), mathPart(`m=${input.parameterLatex}`)],
      [textPart('multiplier: '), mathPart(input.multiplierLatex)],
      [textPart('inverse map: '), mathPart(input.inverseMapLatex)],
      [textPart('first kind: '), mathPart(input.firstKindPrototypeLatex)],
    ],
  );
}

export function buildAlgebraicGenus1ComplexPairLegendreData(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1ComplexPairLegendreDataResult {
  const chart = buildAlgebraicGenus1ComplexPairRootChart(node, variable);
  if (chart.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'chart-stop',
      detail: chart.detail,
    };
  }

  const profile = profileAlgebraicGenus1CurveCandidate(node, variable);
  if (profile.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'curve-profile-stop',
      chart,
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
      chart,
      detail: 'The current complex-pair Legendre chart is prepared only for positive exact leading coefficients.',
    };
  }

  const leadingCoefficientLatex = boxLatex(buildExactScalarNode(leadingCoefficient));
  const realRootLatex = chart.realRootLatex;
  const betaLatex = `\\beta_{${realRootLatex}}`;
  const rhoLatex = `\\rho_{${realRootLatex}}`;
  const scaleLatex =
    `A_{${realRootLatex}}=\\sqrt{\\left(${realRootLatex}-${betaLatex}\\right)^2+${rhoLatex}^2}`;
  const scaleSymbolLatex = `A_{${realRootLatex}}`;
  const completedSquareCofactorLatex =
    `Q_{${realRootLatex}}\\left(${variable}\\right)=\\left(${variable}-${betaLatex}\\right)^2+${rhoLatex}^2`;
  const amplitudeLatex =
    `2\\arctan\\sqrt{\\frac{${variable}-${realRootLatex}}{${scaleSymbolLatex}}}`;
  const parameterLatex =
    `\\frac{${scaleSymbolLatex}-${realRootLatex}+${betaLatex}}{2${scaleSymbolLatex}}`;
  const multiplierLatex =
    `\\frac{1}{\\sqrt{${scaledFactor(leadingCoefficientLatex, scaleSymbolLatex)}}}`;
  const inverseMapLatex =
    `${variable}=${realRootLatex}+${scaleSymbolLatex}\\tan^2\\left(\\frac{\\phi}{2}\\right)`;
  const firstKindPrototypeLatex =
    `${multiplierLatex}\\cdot ${ellipticF(amplitudeLatex, parameterLatex)}`;
  const baseResult = {
    kind: 'success' as const,
    variable,
    dataKind: 'cubic-one-real-root-complex-pair' as const,
    rootSymbolsLatex: [
      realRootLatex,
      betaLatex,
      rhoLatex,
      scaleSymbolLatex,
    ],
    realRootLatex,
    betaLatex,
    rhoLatex,
    scaleSymbolLatex,
    scaleLatex,
    leadingCoefficientLatex,
    completedSquareCofactorLatex,
    amplitudeLatex,
    parameterLatex,
    multiplierLatex,
    inverseMapLatex,
    firstKindPrototypeLatex,
    preferredBranchLatex: chart.realBranchLatex,
    detailSections: [] as DisplayDetailSection[],
    readinessNotes: [] as string[],
  };
  const changeOfVariableProof =
    buildAlgebraicGenus1LegendreChangeOfVariableProofFromData(baseResult);

  return {
    ...baseResult,
    changeOfVariableProof,
    detailSections: [
      ...chart.detailSections,
      dataDetailSection({
        realRootLatex,
        betaLatex,
        rhoLatex,
        scaleLatex,
        completedSquareCofactorLatex,
        amplitudeLatex,
        parameterLatex,
        multiplierLatex,
        inverseMapLatex,
        firstKindPrototypeLatex,
      }),
      ...changeOfVariableProof.detailSections,
    ],
    readinessNotes: [
      ...chart.readinessNotes,
      ...changeOfVariableProof.readinessNotes,
      'Complex-pair Legendre data now carries first-kind change-of-variable proof evidence.',
      'Live adoption remains deferred until the derivative proof and branch facts use this chart.',
    ],
  };
}
