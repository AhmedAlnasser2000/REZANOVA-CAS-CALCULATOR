import type { DisplayDetailSection } from '../../../../types/calculator';
import {
  mathPart,
  mixedDetailSection,
  textPart,
} from '../../../display/result-detail-lines';
import type { AlgebraicGenus1RootPullbackBasisKind } from './root-pullback-basis-profile';
import { profileAlgebraicGenus1RootPullbackBasis } from './root-pullback-basis-profile';
import type { AlgebraicGenus1RootPullbackLegendreData } from './root-pullback-basis-profile';

export type AlgebraicGenus1RootBasisCoefficientSystemStatus =
  | 'first-kind-coefficient-solved'
  | 'linear-basis-system-required'
  | 'hermite-plus-basis-system-required';

export type AlgebraicGenus1RootBasisCoefficientUnknown = {
  id: string;
  basisKind: AlgebraicGenus1RootPullbackBasisKind;
  coefficientFieldLatex: string;
  role: string;
};

export type AlgebraicGenus1RootBasisCoefficientSystem = {
  kind: 'success';
  variable: string;
  status: AlgebraicGenus1RootBasisCoefficientSystemStatus;
  equationLatex: string;
  solvedCoefficientLatex?: string;
  unknowns: AlgebraicGenus1RootBasisCoefficientUnknown[];
  requiredBasisKinds: AlgebraicGenus1RootPullbackBasisKind[];
  rootLegendreData: AlgebraicGenus1RootPullbackLegendreData;
  detailSections: DisplayDetailSection[];
  readinessNotes: string[];
};

export type AlgebraicGenus1RootBasisCoefficientSystemResult =
  | AlgebraicGenus1RootBasisCoefficientSystem
  | {
      kind: 'stop';
      variable: string;
      reason: 'pullback-profile-stop';
      detail: string;
    };

function coefficientFieldLatex(rootSymbolsLatex: string[]) {
  return `\\mathbb{Q}\\left(${rootSymbolsLatex.join(',')}\\right)\\left(\\sin^2\\phi\\right)`;
}

function firstKindEquation(multiplierLatex: string) {
  return `\\text{pullback}=\\left(${multiplierLatex}\\right)K_F`;
}

function linearBasisEquation() {
  return [
    '\\text{pullback}=',
    'F\\left(\\sin^2\\phi\\right)K_F',
    '+E\\left(\\sin^2\\phi\\right)K_E',
    '+\\sum_p \\Pi_p\\left(\\sin^2\\phi\\right)K_{\\Pi}(p)',
  ].join('');
}

function hermiteBasisEquation() {
  return [
    '\\text{pullback}=',
    'dS+L',
    '+F\\left(\\sin^2\\phi\\right)K_F',
    '+E\\left(\\sin^2\\phi\\right)K_E',
    '+\\sum_p \\Pi_p\\left(\\sin^2\\phi\\right)K_{\\Pi}(p)',
  ].join('');
}

function unknowns(input: {
  status: AlgebraicGenus1RootBasisCoefficientSystemStatus;
  fieldLatex: string;
}): AlgebraicGenus1RootBasisCoefficientUnknown[] {
  if (input.status === 'first-kind-coefficient-solved') {
    return [];
  }

  const basisUnknowns: AlgebraicGenus1RootBasisCoefficientUnknown[] = [
    {
      id: 'F',
      basisKind: 'first-kind',
      coefficientFieldLatex: input.fieldLatex,
      role: 'first-kind residual coefficient',
    },
    {
      id: 'E',
      basisKind: 'second-kind',
      coefficientFieldLatex: input.fieldLatex,
      role: 'second-kind residual coefficient',
    },
    {
      id: '\\Pi_p',
      basisKind: 'third-kind',
      coefficientFieldLatex: input.fieldLatex,
      role: 'simple-pole third-kind residual coefficients',
    },
  ];

  if (input.status === 'linear-basis-system-required') {
    return basisUnknowns;
  }

  return [
    {
      id: 'S',
      basisKind: 'rational-log-residual',
      coefficientFieldLatex: input.fieldLatex,
      role: 'rational derivative correction',
    },
    {
      id: 'L',
      basisKind: 'rational-log-residual',
      coefficientFieldLatex: input.fieldLatex,
      role: 'logarithmic residual',
    },
    ...basisUnknowns,
  ];
}

function detailSection(input: {
  status: AlgebraicGenus1RootBasisCoefficientSystemStatus;
  equationLatex: string;
  solvedCoefficientLatex?: string;
  unknowns: AlgebraicGenus1RootBasisCoefficientUnknown[];
}) {
  return mixedDetailSection(
    'Genus-1 Root Basis Coefficient System',
    [
      [textPart('status: '), textPart(input.status)],
      [textPart('basis equation: '), mathPart(input.equationLatex)],
      ...(input.solvedCoefficientLatex
        ? [[textPart('solved coefficient: '), mathPart(input.solvedCoefficientLatex)]]
        : []),
      [
        textPart('unknowns: '),
        textPart(input.unknowns.map((unknown) => unknown.id).join(', ') || 'none'),
      ],
    ],
  );
}

export function buildAlgebraicGenus1RootBasisCoefficientSystem(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1RootBasisCoefficientSystemResult {
  const profile = profileAlgebraicGenus1RootPullbackBasis(node, variable);
  if (profile.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'pullback-profile-stop',
      detail: profile.detail,
    };
  }

  const fieldLatex = coefficientFieldLatex(profile.rootLegendreData.rootSymbolsLatex);
  const status: AlgebraicGenus1RootBasisCoefficientSystemStatus =
    profile.status === 'first-kind-ready'
      ? 'first-kind-coefficient-solved'
      : profile.status === 'coefficient-solve-required'
        ? 'linear-basis-system-required'
        : 'hermite-plus-basis-system-required';
  const solvedCoefficientLatex = status === 'first-kind-coefficient-solved'
    ? profile.rootLegendreData.multiplierLatex
    : undefined;
  const equationLatex = status === 'first-kind-coefficient-solved'
    ? firstKindEquation(profile.rootLegendreData.multiplierLatex)
    : status === 'linear-basis-system-required'
      ? linearBasisEquation()
      : hermiteBasisEquation();
  const systemUnknowns = unknowns({ status, fieldLatex });

  return {
    kind: 'success',
    variable,
    status,
    equationLatex,
    solvedCoefficientLatex,
    unknowns: systemUnknowns,
    requiredBasisKinds: profile.requiredBasisKinds,
    rootLegendreData: profile.rootLegendreData,
    detailSections: [
      ...profile.detailSections,
      detailSection({
        status,
        equationLatex,
        solvedCoefficientLatex,
        unknowns: systemUnknowns,
      }),
    ],
    readinessNotes: [
      ...profile.readinessNotes,
      status === 'first-kind-coefficient-solved'
        ? 'The first-kind coefficient is explicit and can be adopted by the existing generic first-kind rule.'
        : 'Live adoption waits for a solver that proves the displayed basis coefficient system.',
    ],
  };
}
