import type { DisplayDetailSection } from '../../../../types/calculator';
import {
  mathPart,
  mixedDetailSection,
  textPart,
} from '../../../display/result-detail-lines';
import { profileAlgebraicGenus1CurveCandidate } from './curve-profile';
import { buildAlgebraicGenus1NormalForm } from './normal-form';
import { solveAlgebraicGenus1RootBasisCoefficients } from './root-basis-coefficient-solver';
import type { AlgebraicGenus1RootPullbackLegendreData } from './root-pullback-basis-profile';

export type AlgebraicGenus1SecondKindBasisReadiness = {
  kind: 'success';
  variable: string;
  preferredBranchLatex: string;
  rootChartKind: AlgebraicGenus1RootPullbackLegendreData['dataKind'];
  amplitudeLatex: string;
  parameterLatex: string;
  multiplierLatex: string;
  rationalCoefficientLatex: string;
  coefficientFieldLatex: string;
  firstKindBasisLatex: string;
  secondKindBasisLatex: string;
  thirdKindTemplateLatex: string;
  basisEquationLatex: string;
  correctionTemplateLatex: string;
  canAdoptLive: false;
  detailSections: DisplayDetailSection[];
  readinessNotes: string[];
};

export type AlgebraicGenus1SecondKindBasisReadinessResult =
  | AlgebraicGenus1SecondKindBasisReadiness
  | {
      kind: 'stop';
      variable: string;
      reason:
        | 'curve-profile-stop'
        | 'unsupported-integrand-shape'
        | 'normal-form-stop'
        | 'coefficient-solver-stop'
        | 'not-second-kind-readiness';
      detail: string;
    };

function firstKindDifferential(parameterLatex: string) {
  return `dF=\\frac{d\\phi}{\\sqrt{1-${parameterLatex}\\sin^2\\phi}}`;
}

function secondKindDifferential(parameterLatex: string) {
  return `dE=\\sqrt{1-${parameterLatex}\\sin^2\\phi}\\,d\\phi`;
}

function thirdKindDifferential(parameterLatex: string) {
  return `d\\Pi(n)=\\frac{d\\phi}{(1-n\\sin^2\\phi)\\sqrt{1-${parameterLatex}\\sin^2\\phi}}`;
}

function detailSection(input: AlgebraicGenus1SecondKindBasisReadiness) {
  return mixedDetailSection(
    'Genus-1 Second-Kind Basis Readiness',
    [
      [textPart('preferred branch: '), mathPart(input.preferredBranchLatex)],
      [textPart('amplitude: '), mathPart(`\\phi=${input.amplitudeLatex}`)],
      [textPart('parameter: '), mathPart(`m=${input.parameterLatex}`)],
      [textPart('coefficient field: '), mathPart(input.coefficientFieldLatex)],
      [textPart('pullback coefficient: '), mathPart(input.rationalCoefficientLatex)],
      [textPart('basis equation: '), mathPart(input.basisEquationLatex)],
      [textPart('correction template: '), mathPart(input.correctionTemplateLatex)],
    ],
  );
}

export function buildAlgebraicGenus1SecondKindBasisReadiness(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1SecondKindBasisReadinessResult {
  const profile = profileAlgebraicGenus1CurveCandidate(node, variable);
  if (profile.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'curve-profile-stop',
      detail: profile.detail ?? profile.reason,
    };
  }

  if (profile.integrandShape !== 'radical') {
    return {
      kind: 'stop',
      variable,
      reason: 'unsupported-integrand-shape',
      detail: 'Second-kind readiness is scoped to raw one-radical genus-1 integrands.',
    };
  }

  const normalForm = buildAlgebraicGenus1NormalForm(node, variable);
  if (normalForm.kind !== 'success' || normalForm.normalFormKind !== 'root-based-readiness') {
    return {
      kind: 'stop',
      variable,
      reason: 'normal-form-stop',
      detail: 'Second-kind readiness needs real-root named Legendre data before coefficient solving.',
    };
  }

  const solve = solveAlgebraicGenus1RootBasisCoefficients(node, variable);
  if (solve.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'coefficient-solver-stop',
      detail: solve.detail,
    };
  }

  if (solve.status !== 'elliptic-basis-reduction-required') {
    return {
      kind: 'stop',
      variable,
      reason: 'not-second-kind-readiness',
      detail: `Expected a radical pullback basis system, received ${solve.status}.`,
    };
  }

  const rootData = solve.rootLegendreData;
  const basisEquationLatex =
    `${solve.rationalCoefficientLatex}\\frac{d\\phi}{\\sqrt{1-${rootData.parameterLatex}\\sin^2\\phi}}`
    + `=C_F\\,dF+C_E\\,dE+C_{\\Pi}\\,d\\Pi+dS`;
  const correctionTemplateLatex =
    `S(\\sin^2\\phi)\\sqrt{1-${rootData.parameterLatex}\\sin^2\\phi}`;
  const result: AlgebraicGenus1SecondKindBasisReadiness = {
    kind: 'success',
    variable,
    preferredBranchLatex: rootData.preferredBranchLatex,
    rootChartKind: rootData.dataKind,
    amplitudeLatex: rootData.amplitudeLatex,
    parameterLatex: rootData.parameterLatex,
    multiplierLatex: rootData.multiplierLatex,
    rationalCoefficientLatex: solve.rationalCoefficientLatex,
    coefficientFieldLatex: solve.coefficientFieldLatex,
    firstKindBasisLatex: firstKindDifferential(rootData.parameterLatex),
    secondKindBasisLatex: secondKindDifferential(rootData.parameterLatex),
    thirdKindTemplateLatex: thirdKindDifferential(rootData.parameterLatex),
    basisEquationLatex,
    correctionTemplateLatex,
    canAdoptLive: false,
    detailSections: [],
    readinessNotes: [
      ...normalForm.readinessNotes,
      ...solve.readinessNotes,
      'The raw radical pullback now has an explicit F/E/Pi plus rational-correction basis equation.',
      'Live second-kind adoption still waits for solving this basis equation and proof-checking the rational correction.',
    ],
  };

  return {
    ...result,
    detailSections: [
      ...normalForm.detailSections,
      ...solve.detailSections,
      detailSection(result),
    ],
  };
}
