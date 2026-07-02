import type { DisplayDetailSection } from '../../../../types/calculator';
import {
  mathPart,
  mixedDetailSection,
  textPart,
} from '../../../display/result-detail-lines';
import { buildAlgebraicGenus1DegenerationFacts } from './degeneration-facts';
import { buildAlgebraicGenus1NamedRootReadback } from './named-root-readback';
import { profileAlgebraicGenus1CurveCandidate } from './curve-profile';

export type AlgebraicGenus1ComplexPairRootChart = {
  kind: 'success';
  variable: string;
  chartKind: 'one-real-root-cubic-complex-pair';
  realRootLatex: string;
  radicandLatex: string;
  quadraticCofactorLatex: string;
  realBranchLatex: string;
  requiredLegendreDataLatex: string[];
  detailSections: DisplayDetailSection[];
  readinessNotes: string[];
};

export type AlgebraicGenus1ComplexPairRootChartResult =
  | AlgebraicGenus1ComplexPairRootChart
  | {
      kind: 'stop';
      variable: string;
      reason:
        | 'curve-profile-stop'
        | 'not-exact-squarefree-cubic'
        | 'not-one-real-root-cubic'
        | 'named-root-stop';
      detail: string;
    };

function detailSection(input: {
  realRootLatex: string;
  radicandLatex: string;
  quadraticCofactorLatex: string;
  realBranchLatex: string;
  requiredLegendreDataLatex: string[];
}) {
  return mixedDetailSection(
    'Genus-1 Complex-Pair Root Chart Readiness',
    [
      [textPart('real root: '), mathPart(input.realRootLatex)],
      [textPart('radicand: '), mathPart(input.radicandLatex)],
      [textPart('quadratic cofactor: '), mathPart(input.quadraticCofactorLatex)],
      [textPart('real branch: '), mathPart(input.realBranchLatex)],
      [textPart('required Legendre data: ')],
      ...input.requiredLegendreDataLatex.map((line) => [mathPart(line)]),
    ],
  );
}

export function buildAlgebraicGenus1ComplexPairRootChart(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1ComplexPairRootChartResult {
  const profile = profileAlgebraicGenus1CurveCandidate(node, variable);
  if (profile.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'curve-profile-stop',
      detail: profile.reason,
    };
  }
  if (profile.radicandDegree !== 3) {
    return {
      kind: 'stop',
      variable,
      reason: 'not-exact-squarefree-cubic',
      detail: 'Complex-pair root charts are only needed for exact-rational cubic radicands in this prerequisite.',
    };
  }

  const degeneration = buildAlgebraicGenus1DegenerationFacts(node, variable);
  if (
    degeneration.kind === 'stop'
    || degeneration.classification !== 'exact-squarefree-genus1'
  ) {
    return {
      kind: 'stop',
      variable,
      reason: 'not-exact-squarefree-cubic',
      detail: 'Complex-pair root charts require an exact squarefree genus-1 cubic.',
    };
  }

  const named = buildAlgebraicGenus1NamedRootReadback(node, variable);
  if (named.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'named-root-stop',
      detail: named.detail ?? 'Named-root readback stopped before complex-pair chart readiness.',
    };
  }
  if (named.rootSymbolsLatex.length !== 1 || named.realDomainRows.length !== 1) {
    return {
      kind: 'stop',
      variable,
      reason: 'not-one-real-root-cubic',
      detail: 'This prerequisite is only for exact cubics with one real root and one complex-conjugate pair.',
    };
  }

  const realRootLatex = named.rootSymbolsLatex[0];
  const quadraticCofactorLatex =
    `Q_{${realRootLatex}}\\left(${variable}\\right)=\\frac{P\\left(${variable}\\right)}{${variable}-${realRootLatex}}`;
  const realBranchLatex = named.realDomainRows[0]?.intervalLatex ?? `${variable}>${realRootLatex}`;
  const requiredLegendreDataLatex = [
    `Q_{${realRootLatex}}\\left(${variable}\\right)>0\\text{ on }${realBranchLatex}`,
    `\\rho_{${realRootLatex}}^2>0\\text{ from the irreducible quadratic cofactor}`,
    `\\phi=\\arctan\\left(\\frac{${variable}-${realRootLatex}}{\\rho_{${realRootLatex}}}\\right)`,
    'm\\text{ and multiplier from the real-root/complex-pair Legendre chart}',
  ];

  return {
    kind: 'success',
    variable,
    chartKind: 'one-real-root-cubic-complex-pair',
    realRootLatex,
    radicandLatex: named.radicandLatex,
    quadraticCofactorLatex,
    realBranchLatex,
    requiredLegendreDataLatex,
    detailSections: [
      ...named.detailSections,
      detailSection({
        realRootLatex,
        radicandLatex: named.radicandLatex,
        quadraticCofactorLatex,
        realBranchLatex,
        requiredLegendreDataLatex,
      }),
    ],
    readinessNotes: [
      ...named.readinessNotes,
      'One-real-root cubics need this complex-pair chart before generic elliptic adoption.',
      'This prerequisite is behavior-invisible and deliberately does not emit a live elliptic antiderivative.',
    ],
  };
}
