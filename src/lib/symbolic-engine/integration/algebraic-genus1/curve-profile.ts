import { readExactScalarNode } from '../../../algebra/polynomial-core';
import {
  parseSymbolicPolynomial,
  squarefreeReadinessSymbolicPolynomial,
  type SymbolicPolynomial,
} from '../../primitives/symbolic-polynomial';
import {
  boxLatex,
  dependsOnVariable,
  isNodeArray,
  termKey,
} from '../../patterns';
import { simplifyMathJsonNodeOrOriginal } from '../../primitives/simplification/simplification';

export type AlgebraicGenus1CoefficientScope =
  | 'exact-rational'
  | 'exact-rational-plus-target-free-symbolic';

export type AlgebraicGenus1IntegrandShape =
  | 'radical'
  | 'reciprocal-radical'
  | 'rational-in-radical';

export type AlgebraicGenus1DegenerationStatus =
  | 'squarefree-candidate'
  | 'repeated-root-detected'
  | 'squarefree-check-deferred';

export type AlgebraicGenus1CurveProfileStopReason =
  | 'branch-sensitive'
  | 'constant-radicand'
  | 'genus0-radicand'
  | 'inexact-coefficient'
  | 'multiple-independent-radicals'
  | 'nested-radical'
  | 'no-radical'
  | 'over-cap-radicand-degree'
  | 'selected-variable-dependent-coefficient'
  | 'unsupported-coefficient'
  | 'unsupported-radical-shape'
  | 'unsupported-transcendental-carrier';

export type AlgebraicGenus1CurveReadyProfile = {
  kind: 'ready';
  family: 'one-radical-genus1-candidate';
  variable: string;
  integrandShape: AlgebraicGenus1IntegrandShape;
  radicalCount: number;
  radicandNode: unknown;
  radicandPolynomial: SymbolicPolynomial;
  radicandDegree: 3 | 4;
  radicandLatex: string;
  coefficientScope: AlgebraicGenus1CoefficientScope;
  coefficientFactsLatex: string[];
  degenerationStatus: AlgebraicGenus1DegenerationStatus;
  degenerationDetail?: string;
};

export type AlgebraicGenus1CurveStoppedProfile = {
  kind: 'stop';
  variable: string;
  reason: AlgebraicGenus1CurveProfileStopReason;
  detail?: string;
  radicalCount: number;
};

export type AlgebraicGenus1CurveProfile =
  | AlgebraicGenus1CurveReadyProfile
  | AlgebraicGenus1CurveStoppedProfile;

type RadicalOccurrence = {
  node: unknown;
  rawRadicand: unknown;
  canonicalRadicand: unknown;
  reciprocal: boolean;
};

const UNSUPPORTED_TRANSCENDENTAL_HEADS = new Set([
  'Arccos',
  'Arccot',
  'Arccsc',
  'Arcosh',
  'Arcsec',
  'Arcsin',
  'Arctan',
  'Arsinh',
  'Artanh',
  'Ci',
  'Cos',
  'Cot',
  'Csc',
  'Ei',
  'EllipticE',
  'EllipticF',
  'EllipticPi',
  'Erf',
  'Erfi',
  'ExponentialE',
  'FresnelC',
  'FresnelS',
  'Li',
  'Ln',
  'Log',
  'Sec',
  'Si',
  'Sin',
  'Tan',
]);

function stop(
  variable: string,
  reason: AlgebraicGenus1CurveProfileStopReason,
  radicalCount: number,
  detail?: string,
): AlgebraicGenus1CurveStoppedProfile {
  return {
    kind: 'stop',
    variable,
    reason,
    detail,
    radicalCount,
  };
}

function isExactOne(node: unknown) {
  const scalar = readExactScalarNode(node);
  return Boolean(scalar && scalar.numerator === scalar.denominator);
}

function canonicalRadicand(rawRadicand: unknown) {
  if (
    isNodeArray(rawRadicand)
    && rawRadicand[0] === 'Divide'
    && rawRadicand.length === 3
    && isExactOne(rawRadicand[1])
  ) {
    return {
      radicand: rawRadicand[2],
      reciprocal: true,
    };
  }

  return {
    radicand: rawRadicand,
    reciprocal: false,
  };
}

function hasRadical(node: unknown): boolean {
  if (!isNodeArray(node)) {
    return false;
  }
  if (node[0] === 'Sqrt') {
    return true;
  }
  return node.slice(1).some(hasRadical);
}

function collectRadicals(node: unknown, target: RadicalOccurrence[] = []) {
  if (!isNodeArray(node)) {
    return target;
  }

  if (node[0] === 'Sqrt' && node.length === 2) {
    const canonical = canonicalRadicand(node[1]);
    target.push({
      node,
      rawRadicand: node[1],
      canonicalRadicand: canonical.radicand,
      reciprocal: canonical.reciprocal,
    });
  }

  for (const child of node.slice(1)) {
    collectRadicals(child, target);
  }

  return target;
}

function containsInexactNumber(node: unknown): boolean {
  if (typeof node === 'number') {
    return Number.isFinite(node) && !Number.isInteger(node);
  }

  return isNodeArray(node) && node.slice(1).some(containsInexactNumber);
}

function containsBranchSensitiveCarrier(node: unknown): boolean {
  if (!isNodeArray(node)) {
    return false;
  }

  if (node[0] === 'Abs' || node[0] === 'AbsoluteValue') {
    return true;
  }

  return node.slice(1).some(containsBranchSensitiveCarrier);
}

function containsUnsupportedTranscendentalCarrier(node: unknown): boolean {
  if (!isNodeArray(node) || typeof node[0] !== 'string') {
    return false;
  }

  if (node[0] !== 'Sqrt' && UNSUPPORTED_TRANSCENDENTAL_HEADS.has(node[0])) {
    return true;
  }

  if (
    node[0] === 'Power'
    && node.length === 3
    && node[1] === 'ExponentialE'
  ) {
    return true;
  }

  return node.slice(1).some(containsUnsupportedTranscendentalCarrier);
}

function coefficientScope(polynomial: SymbolicPolynomial): AlgebraicGenus1CoefficientScope {
  const exact = polynomial.coefficients.every((coefficient) => Boolean(readExactScalarNode(coefficient.node)));
  return exact ? 'exact-rational' : 'exact-rational-plus-target-free-symbolic';
}

function coefficientFactsLatex(polynomial: SymbolicPolynomial) {
  return polynomial.facts.map((fact) => `${fact.expressionLatex}${fact.relation}`);
}

function mapPolynomialStopReason(reason: string, coefficientReason?: string): AlgebraicGenus1CurveProfileStopReason {
  if (coefficientReason === 'inexact-coefficient') {
    return 'inexact-coefficient';
  }
  if (coefficientReason === 'selected-variable-dependent-coefficient') {
    return 'selected-variable-dependent-coefficient';
  }
  if (coefficientReason === 'branch-sensitive') {
    return 'branch-sensitive';
  }
  if (coefficientReason === 'unsupported-transcendental-coefficient') {
    return 'unsupported-transcendental-carrier';
  }

  if (reason === 'over-cap-degree') {
    return 'over-cap-radicand-degree';
  }
  if (reason === 'selected-variable-dependent-coefficient') {
    return 'selected-variable-dependent-coefficient';
  }

  return 'unsupported-coefficient';
}

function classifyShape(
  node: unknown,
  occurrence: RadicalOccurrence,
): AlgebraicGenus1IntegrandShape {
  if (termKey(node) === termKey(occurrence.node)) {
    return occurrence.reciprocal ? 'reciprocal-radical' : 'radical';
  }

  return 'rational-in-radical';
}

function normalizeForKey(node: unknown) {
  return simplifyMathJsonNodeOrOriginal(node);
}

function squarefreeStatus(polynomial: SymbolicPolynomial): {
  status: AlgebraicGenus1DegenerationStatus;
  detail?: string;
} {
  const exact = polynomial.coefficients.every((coefficient) => Boolean(readExactScalarNode(coefficient.node)));
  if (!exact) {
    return {
      status: 'squarefree-check-deferred',
      detail: 'symbolic squarefree and branch facts are deferred to the genus-1 degeneration facts layer',
    };
  }

  const squarefree = squarefreeReadinessSymbolicPolynomial(polynomial, { maxDegree: 4 });
  if (squarefree.kind === 'stop') {
    return {
      status: 'squarefree-check-deferred',
      detail: squarefree.reason,
    };
  }

  return squarefree.squarefree
    ? { status: 'squarefree-candidate' }
    : {
        status: 'repeated-root-detected',
        detail: 'the radicand shares a nonconstant factor with its derivative',
      };
}

export function profileAlgebraicGenus1CurveCandidate(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1CurveProfile {
  const radicals = collectRadicals(node);
  if (radicals.length === 0) {
    return stop(variable, 'no-radical', 0);
  }

  if (containsInexactNumber(node)) {
    return stop(variable, 'inexact-coefficient', radicals.length);
  }
  if (containsBranchSensitiveCarrier(node)) {
    return stop(variable, 'branch-sensitive', radicals.length);
  }
  if (containsUnsupportedTranscendentalCarrier(node)) {
    return stop(variable, 'unsupported-transcendental-carrier', radicals.length);
  }
  if (radicals.some((radical) => hasRadical(radical.rawRadicand))) {
    return stop(variable, 'nested-radical', radicals.length);
  }

  const radicalKeys = new Set(radicals.map((radical) => termKey(normalizeForKey(radical.canonicalRadicand))));
  if (radicalKeys.size > 1) {
    return stop(variable, 'multiple-independent-radicals', radicals.length);
  }

  const [radical] = radicals;
  if (!radical) {
    return stop(variable, 'no-radical', 0);
  }

  const parsed = parseSymbolicPolynomial(radical.canonicalRadicand, variable, 5);
  if (parsed.kind === 'stop') {
    return stop(
      variable,
      mapPolynomialStopReason(parsed.reason, parsed.coefficientReason),
      radicals.length,
      parsed.detail,
    );
  }

  const { polynomial } = parsed;
  if (polynomial.degree === 0 || !dependsOnVariable(radical.canonicalRadicand, variable)) {
    return stop(variable, 'constant-radicand', radicals.length);
  }
  if (polynomial.degree === 1 || polynomial.degree === 2) {
    return stop(variable, 'genus0-radicand', radicals.length);
  }
  if (polynomial.degree > 4) {
    return stop(variable, 'over-cap-radicand-degree', radicals.length);
  }
  if (polynomial.degree !== 3 && polynomial.degree !== 4) {
    return stop(variable, 'unsupported-radical-shape', radicals.length);
  }

  const degeneration = squarefreeStatus(polynomial);
  return {
    kind: 'ready',
    family: 'one-radical-genus1-candidate',
    variable,
    integrandShape: classifyShape(node, radical),
    radicalCount: radicals.length,
    radicandNode: radical.canonicalRadicand,
    radicandPolynomial: polynomial,
    radicandDegree: polynomial.degree,
    radicandLatex: boxLatex(radical.canonicalRadicand),
    coefficientScope: coefficientScope(polynomial),
    coefficientFactsLatex: coefficientFactsLatex(polynomial),
    degenerationStatus: degeneration.status,
    degenerationDetail: degeneration.detail,
  };
}
