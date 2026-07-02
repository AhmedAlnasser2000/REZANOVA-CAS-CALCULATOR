import type {
  ExactSupplementEntry,
  ExactSupplementRelation,
} from '../../../../types/calculator/exact-supplement-types';
import {
  exactScalarToNumber,
  readExactScalarNode,
} from '../../../algebra/polynomial-core';
import { solvePolynomialRoots } from '../../../algebra/polynomial-roots';
import {
  certifyRealPolynomialRootsSturm,
  rootInSturmIntervals,
} from '../../../algebra/sturm-real-roots';
import { mergeExactSupplementLatex } from '../../../algebra/exact-supplements';
import {
  buildSymbolicPolynomialNode,
  getSymbolicPolynomialCoefficient,
  type SymbolicPolynomial,
} from '../../primitives/symbolic-polynomial';
import { simplifyMathJsonNodeOrOriginal } from '../../primitives/simplification/simplification';
import { boxLatex } from '../../patterns';
import {
  buildAlgebraicGenus1DegenerationFacts,
  type AlgebraicGenus1DegenerationFactResult,
} from './degeneration-facts';
import {
  profileAlgebraicGenus1CurveCandidate,
  type AlgebraicGenus1IntegrandShape,
} from './curve-profile';

export type AlgebraicGenus1RealRootEvidence = {
  label: string;
  order: number;
  interval: {
    left: number;
    right: number;
  };
  approximation: number;
  intervalLatex: string;
  definitionLatex: string;
};

export type AlgebraicGenus1RadicandSignBranch = {
  kind: 'radicand-positive' | 'radicand-negative';
  sign: 1 | -1;
  intervalLatex: string;
  samplePoint: number;
  endpointPolicy: 'excluded' | 'included-where-radicand-zero';
  endpointFactsLatex: string[];
};

export type AlgebraicGenus1RealBranchFactsResult =
  | {
      kind: 'success';
      variable: string;
      integrandShape: AlgebraicGenus1IntegrandShape;
      radicandLatex: string;
      rootCount: number;
      roots: AlgebraicGenus1RealRootEvidence[];
      branchRows: AlgebraicGenus1RadicandSignBranch[];
      realDomainRows: AlgebraicGenus1RadicandSignBranch[];
      endpointExclusionFacts: ExactSupplementEntry[];
      exactSupplementLatex: string[];
      readinessNotes: string[];
    }
  | {
      kind: 'stop';
      variable: string;
      reason:
        | 'branch-row-cap'
        | 'curve-profile-stop'
        | 'degeneration-not-squarefree'
        | 'sample-failed'
        | 'sturm-inconclusive'
        | 'symbolic-branch-deferred';
      degeneration?: AlgebraicGenus1DegenerationFactResult;
      detail?: string;
    };

const BRANCH_ROW_CAP = 12;
const ZERO_TOLERANCE = 1e-9;

function formatApprox(value: number) {
  const normalized = Math.abs(value) < ZERO_TOLERANCE ? 0 : value;
  const rounded = Math.round(normalized);
  if (Math.abs(normalized - rounded) < ZERO_TOLERANCE) {
    return `${rounded}`;
  }
  return normalized.toPrecision(8).replace(/\.?0+$/u, '');
}

function polynomialLatex(polynomial: SymbolicPolynomial) {
  return boxLatex(simplifyMathJsonNodeOrOriginal(buildSymbolicPolynomialNode(polynomial)));
}

function exactCoefficientArrayHighToLow(polynomial: SymbolicPolynomial) {
  const coefficients: number[] = [];
  for (let degree = polynomial.degree; degree >= 0; degree -= 1) {
    const coefficient = readExactScalarNode(getSymbolicPolynomialCoefficient(polynomial, degree).node);
    if (!coefficient) {
      return null;
    }
    coefficients.push(exactScalarToNumber(coefficient));
  }
  return coefficients;
}

function evaluatePolynomial(coefficientsHighToLow: readonly number[], value: number) {
  return coefficientsHighToLow.reduce((current, coefficient) => current * value + coefficient, 0);
}

function rootLabel(index: number) {
  return `\\alpha_{${index + 1}}`;
}

function rootEvidence(
  interval: { left: number; right: number },
  approximation: number,
  index: number,
): AlgebraicGenus1RealRootEvidence {
  const label = rootLabel(index);
  const intervalLatex = `${formatApprox(interval.left)}<${label}<${formatApprox(interval.right)}`;
  return {
    label,
    order: index + 1,
    interval,
    approximation,
    intervalLatex,
    definitionLatex: `${label}\\text{ is the unique real root in }(${formatApprox(interval.left)},${formatApprox(interval.right)})`,
  };
}

function approximateRealRoots(coefficientsHighToLow: readonly number[], expectedCount: number, intervals: readonly { left: number; right: number }[]) {
  const solved = solvePolynomialRoots({ coefficients: [...coefficientsHighToLow] });
  if (solved.kind !== 'success') {
    return null;
  }

  const realRoots = solved.roots
    .filter((root) => Math.abs(root.im) <= 1e-7)
    .map((root) => root.re)
    .sort((left, right) => left - right);

  if (realRoots.length !== expectedCount) {
    return null;
  }

  if (!realRoots.every((root) => rootInSturmIntervals(root, intervals))) {
    return null;
  }

  return realRoots;
}

function intervalLatex(variable: string, lower: AlgebraicGenus1RealRootEvidence | undefined, upper: AlgebraicGenus1RealRootEvidence | undefined) {
  if (!lower && !upper) {
    return `${variable}\\in\\mathbb{R}`;
  }
  if (!lower && upper) {
    return `${variable}<${upper.label}`;
  }
  if (lower && !upper) {
    return `${variable}>${lower.label}`;
  }
  return `${lower?.label}<${variable}<${upper?.label}`;
}

function chooseSample(lower: AlgebraicGenus1RealRootEvidence | undefined, upper: AlgebraicGenus1RealRootEvidence | undefined) {
  if (!lower && !upper) {
    return 0;
  }
  if (!lower && upper) {
    return upper.approximation - 1;
  }
  if (lower && !upper) {
    return lower.approximation + 1;
  }
  if (lower && upper && lower.approximation < upper.approximation) {
    return (lower.approximation + upper.approximation) / 2;
  }
  return null;
}

function chooseSafeSample(input: {
  lower: AlgebraicGenus1RealRootEvidence | undefined;
  upper: AlgebraicGenus1RealRootEvidence | undefined;
  coefficients: readonly number[];
}) {
  const primary = chooseSample(input.lower, input.upper);
  if (primary === null || !Number.isFinite(primary)) {
    return null;
  }
  if (Math.abs(evaluatePolynomial(input.coefficients, primary)) > ZERO_TOLERANCE) {
    return primary;
  }

  if (input.lower && input.upper) {
    const leftBiased = (2 * input.lower.approximation + input.upper.approximation) / 3;
    if (Math.abs(evaluatePolynomial(input.coefficients, leftBiased)) > ZERO_TOLERANCE) {
      return leftBiased;
    }
    const rightBiased = (input.lower.approximation + 2 * input.upper.approximation) / 3;
    if (Math.abs(evaluatePolynomial(input.coefficients, rightBiased)) > ZERO_TOLERANCE) {
      return rightBiased;
    }
  }

  return null;
}

function endpointPolicy(shape: AlgebraicGenus1IntegrandShape) {
  return shape === 'reciprocal-radical'
    ? 'excluded'
    : 'included-where-radicand-zero';
}

function endpointFactsFor(
  variable: string,
  roots: readonly AlgebraicGenus1RealRootEvidence[],
  shape: AlgebraicGenus1IntegrandShape,
) {
  if (shape !== 'reciprocal-radical') {
    return [];
  }
  return roots.map((root) => `${variable}\\ne${root.label}`);
}

function endpointEntries(
  variable: string,
  roots: readonly AlgebraicGenus1RealRootEvidence[],
  shape: AlgebraicGenus1IntegrandShape,
): ExactSupplementEntry[] {
  if (shape !== 'reciprocal-radical') {
    return [];
  }
  return roots.map((root) => ({
    kind: 'exclusion',
    expressionLatex: `${variable}-${root.label}`,
    relation: '\\ne0' as ExactSupplementRelation,
    source: 'denominator',
  }));
}

function buildSignRows(input: {
  variable: string;
  shape: AlgebraicGenus1IntegrandShape;
  roots: AlgebraicGenus1RealRootEvidence[];
  coefficients: readonly number[];
}) {
  const rows: AlgebraicGenus1RadicandSignBranch[] = [];
  const endpointFacts = endpointFactsFor(input.variable, input.roots, input.shape);
  const segments = [
    { lower: undefined, upper: input.roots[0] },
    ...input.roots.slice(0, -1).map((root, index) => ({
      lower: root,
      upper: input.roots[index + 1],
    })),
    { lower: input.roots.at(-1), upper: undefined },
  ];

  for (const segment of segments) {
    const sample = chooseSafeSample({
      lower: segment.lower,
      upper: segment.upper,
      coefficients: input.coefficients,
    });
    if (sample === null || !Number.isFinite(sample)) {
      return null;
    }
    const value = evaluatePolynomial(input.coefficients, sample);
    if (Math.abs(value) <= ZERO_TOLERANCE) {
      return null;
    }
    const sign = value > 0 ? 1 : -1;
    rows.push({
      kind: sign > 0 ? 'radicand-positive' : 'radicand-negative',
      sign,
      intervalLatex: intervalLatex(input.variable, segment.lower, segment.upper),
      samplePoint: sample,
      endpointPolicy: endpointPolicy(input.shape),
      endpointFactsLatex: endpointFacts,
    });
  }
  return rows;
}

export function buildAlgebraicGenus1RealBranchFacts(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1RealBranchFactsResult {
  const profile = profileAlgebraicGenus1CurveCandidate(node, variable);
  if (profile.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'curve-profile-stop',
      detail: profile.reason,
    };
  }

  const degeneration = buildAlgebraicGenus1DegenerationFacts(node, variable);
  if (degeneration.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'curve-profile-stop',
      degeneration,
      detail: degeneration.detail,
    };
  }
  if (degeneration.classification === 'generic-squarefree-genus1') {
    return {
      kind: 'stop',
      variable,
      reason: 'symbolic-branch-deferred',
      degeneration,
      detail: 'Symbolic real-root branch enumeration waits for named-root readback and bounded branch formulas.',
    };
  }
  if (degeneration.classification !== 'exact-squarefree-genus1') {
    return {
      kind: 'stop',
      variable,
      reason: 'degeneration-not-squarefree',
      degeneration,
      detail: 'Repeated-root radicands should use genus-0 fallback readiness before elliptic branch routing.',
    };
  }

  const coefficients = exactCoefficientArrayHighToLow(profile.radicandPolynomial);
  if (!coefficients) {
    return {
      kind: 'stop',
      variable,
      reason: 'symbolic-branch-deferred',
      degeneration,
      detail: 'Real branch enumeration is exact-rational only in this milestone.',
    };
  }

  const sturm = certifyRealPolynomialRootsSturm(coefficients);
  if (sturm.kind !== 'certified') {
    return {
      kind: 'stop',
      variable,
      reason: 'sturm-inconclusive',
      degeneration,
      detail: sturm.reason ?? 'Sturm root isolation did not certify every real root.',
    };
  }

  const approximations = approximateRealRoots(
    coefficients,
    sturm.distinctRealRootCount,
    sturm.intervals,
  );
  if (!approximations) {
    return {
      kind: 'stop',
      variable,
      reason: 'sturm-inconclusive',
      degeneration,
      detail: 'Sturm certified the root count, but numeric companion roots could not be paired for safe branch sampling.',
    };
  }

  const roots = sturm.intervals
    .slice()
    .sort((left, right) => left.left - right.left)
    .map((interval, index) => rootEvidence(interval, approximations[index], index));
  if (roots.length + 1 > BRANCH_ROW_CAP) {
    return {
      kind: 'stop',
      variable,
      reason: 'branch-row-cap',
      degeneration,
      detail: `Real branch rows exceed cap ${BRANCH_ROW_CAP}.`,
    };
  }

  const branchRows = buildSignRows({
    variable,
    shape: profile.integrandShape,
    roots,
    coefficients,
  });
  if (!branchRows) {
    return {
      kind: 'stop',
      variable,
      reason: 'sample-failed',
      degeneration,
      detail: 'Could not sample a certified branch interval away from isolated real roots.',
    };
  }

  const endpointExclusionFacts = endpointEntries(variable, roots, profile.integrandShape);
  return {
    kind: 'success',
    variable,
    integrandShape: profile.integrandShape,
    radicandLatex: polynomialLatex(profile.radicandPolynomial),
    rootCount: sturm.distinctRealRootCount,
    roots,
    branchRows,
    realDomainRows: branchRows.filter((row) => row.sign > 0),
    endpointExclusionFacts,
    exactSupplementLatex: endpointExclusionFacts.length === 0
      ? []
      : mergeExactSupplementLatex({ entries: endpointExclusionFacts, source: 'denominator' }),
    readinessNotes: [
      `Sturm certification isolated ${sturm.distinctRealRootCount} distinct real root${sturm.distinctRealRootCount === 1 ? '' : 's'}.`,
      'Radicand sign rows are behavior-invisible evidence for later Legendre branch selection.',
      profile.integrandShape === 'reciprocal-radical'
        ? 'Reciprocal-radical endpoints are denominator exclusions.'
        : 'Radical endpoints where the radicand is zero remain included in the real radical domain.',
    ],
  };
}
