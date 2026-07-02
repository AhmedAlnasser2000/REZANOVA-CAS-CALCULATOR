import type { DisplayDetailSection } from '../../../../types/calculator';
import {
  mathPart,
  mixedDetailSection,
  textPart,
} from '../../../display/result-detail-lines';
import {
  profileAlgebraicGenus1CurveCandidate,
  type AlgebraicGenus1IntegrandShape,
} from './curve-profile';
import {
  buildAlgebraicGenus1RootLegendreData,
  type AlgebraicGenus1RootLegendreData,
  type AlgebraicGenus1RootLegendreDataResult,
} from './root-legendre-data';

export type AlgebraicGenus1RootPullbackBasisKind =
  | 'first-kind'
  | 'second-kind'
  | 'third-kind'
  | 'rational-log-residual';

export type AlgebraicGenus1RootPullbackBasisProfileStatus =
  | 'first-kind-ready'
  | 'coefficient-solve-required'
  | 'hermite-reduction-required';

export type AlgebraicGenus1RootPullbackBasisProfile = {
  kind: 'success';
  variable: string;
  integrandShape: AlgebraicGenus1IntegrandShape;
  dataKind: AlgebraicGenus1RootLegendreData['dataKind'];
  status: AlgebraicGenus1RootPullbackBasisProfileStatus;
  pullbackLatex: string;
  requiredBasisKinds: AlgebraicGenus1RootPullbackBasisKind[];
  rootLegendreData: AlgebraicGenus1RootLegendreData;
  detailSections: DisplayDetailSection[];
  readinessNotes: string[];
};

export type AlgebraicGenus1RootPullbackBasisProfileResult =
  | AlgebraicGenus1RootPullbackBasisProfile
  | {
      kind: 'stop';
      variable: string;
      reason:
        | 'curve-profile-stop'
        | 'root-legendre-stop'
        | 'unsupported-shape';
      detail: string;
      rootLegendreData?: AlgebraicGenus1RootLegendreDataResult;
    };

function radicandName(variable: string) {
  return `P\\left(${variable}\\right)`;
}

function basisKinds(shape: AlgebraicGenus1IntegrandShape): {
  status: AlgebraicGenus1RootPullbackBasisProfileStatus;
  requiredBasisKinds: AlgebraicGenus1RootPullbackBasisKind[];
} {
  if (shape === 'reciprocal-radical') {
    return {
      status: 'first-kind-ready',
      requiredBasisKinds: ['first-kind'],
    };
  }
  if (shape === 'radical') {
    return {
      status: 'coefficient-solve-required',
      requiredBasisKinds: ['first-kind', 'second-kind', 'third-kind'],
    };
  }
  return {
    status: 'hermite-reduction-required',
    requiredBasisKinds: ['first-kind', 'second-kind', 'third-kind', 'rational-log-residual'],
  };
}

function pullbackLatex(input: {
  variable: string;
  shape: AlgebraicGenus1IntegrandShape;
  parameterLatex: string;
}) {
  const variable = input.variable;
  const parameter = input.parameterLatex;
  if (input.shape === 'reciprocal-radical') {
    return `\\frac{d${variable}}{\\sqrt{${radicandName(variable)}}}=C_F\\cdot\\frac{d\\phi}{\\sqrt{1-${parameter}\\sin^2\\phi}}`;
  }
  if (input.shape === 'radical') {
    return `\\sqrt{${radicandName(variable)}}\\,d${variable}=A\\left(\\sin^2\\phi\\right)\\frac{d\\phi}{\\sqrt{1-${parameter}\\sin^2\\phi}}+B\\left(\\sin^2\\phi\\right)\\sqrt{1-${parameter}\\sin^2\\phi}\\,d\\phi+\\sum_p C_p\\left(\\sin^2\\phi\\right)\\frac{d\\phi}{\\left(1-n_p\\sin^2\\phi\\right)\\sqrt{1-${parameter}\\sin^2\\phi}}`;
  }
  return `R\\left(${variable},\\sqrt{${radicandName(variable)}}\\right)d${variable}=dS+L+F\\cdot K_F+E\\cdot K_E+\\sum_p \\Pi_p\\cdot K_{\\Pi}`;
}

function detailSection(result: {
  status: AlgebraicGenus1RootPullbackBasisProfileStatus;
  pullbackLatex: string;
  requiredBasisKinds: AlgebraicGenus1RootPullbackBasisKind[];
}) {
  return mixedDetailSection(
    'Genus-1 Root Pullback Basis Profile',
    [
      [textPart('status: '), textPart(result.status)],
      [textPart('pullback form: '), mathPart(result.pullbackLatex)],
      [
        textPart('required basis: '),
        textPart(result.requiredBasisKinds.join(', ')),
      ],
    ],
  );
}

export function profileAlgebraicGenus1RootPullbackBasis(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1RootPullbackBasisProfileResult {
  const curve = profileAlgebraicGenus1CurveCandidate(node, variable);
  if (curve.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'curve-profile-stop',
      detail: curve.detail ?? curve.reason,
    };
  }

  const rootLegendre = buildAlgebraicGenus1RootLegendreData(node, variable);
  if (rootLegendre.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'root-legendre-stop',
      detail: rootLegendre.detail,
      rootLegendreData: rootLegendre,
    };
  }

  if (
    curve.integrandShape !== 'reciprocal-radical'
    && curve.integrandShape !== 'radical'
    && curve.integrandShape !== 'rational-in-radical'
  ) {
    return {
      kind: 'stop',
      variable,
      reason: 'unsupported-shape',
      detail: 'Only one-radical genus-1 pullbacks are profiled in this prerequisite.',
      rootLegendreData: rootLegendre,
    };
  }

  const basis = basisKinds(curve.integrandShape);
  const pullback = pullbackLatex({
    variable,
    shape: curve.integrandShape,
    parameterLatex: rootLegendre.parameterLatex,
  });

  return {
    kind: 'success',
    variable,
    integrandShape: curve.integrandShape,
    dataKind: rootLegendre.dataKind,
    status: basis.status,
    pullbackLatex: pullback,
    requiredBasisKinds: basis.requiredBasisKinds,
    rootLegendreData: rootLegendre,
    detailSections: [
      detailSection({
        status: basis.status,
        pullbackLatex: pullback,
        requiredBasisKinds: basis.requiredBasisKinds,
      }),
    ],
    readinessNotes: [
      'Generic root-chart pullbacks must be solved against the displayed basis profile before live second-kind or third-kind adoption.',
      curve.integrandShape === 'reciprocal-radical'
        ? 'The reciprocal-radical shape is already the first-kind named-root live slice.'
        : 'This shape is not a pure display-string EllipticE/Pi case; coefficient solving is required before adoption.',
    ],
  };
}
