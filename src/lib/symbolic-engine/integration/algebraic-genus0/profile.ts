import { readExactScalarNode } from '../../../algebra/polynomial-core';
import { parseSymbolicPolynomial, type SymbolicPolynomial } from '../../primitives/symbolic-polynomial';
import {
  boxLatex,
  dependsOnVariable,
  isNodeArray,
  termKey,
} from '../../patterns';
import { simplifyMathJsonNodeOrOriginal } from '../../primitives/simplification/simplification';

export type AlgebraicGenus0CoefficientScope =
  | 'exact-rational'
  | 'exact-rational-plus-target-free-symbolic';

export type AlgebraicGenus0IntegrandShape =
  | 'radical'
  | 'reciprocal-radical'
  | 'rational-in-radical';

export type AlgebraicGenus0RadicandKind =
  | 'affine'
  | 'quadratic';

export type AlgebraicGenus0ProfileStopReason =
  | 'branch-sensitive'
  | 'constant-radicand'
  | 'cubic-quartic-radicand'
  | 'inexact-coefficient'
  | 'multiple-independent-radicals'
  | 'nested-radical'
  | 'no-radical'
  | 'over-cap-radicand-degree'
  | 'selected-variable-dependent-coefficient'
  | 'unsupported-coefficient'
  | 'unsupported-radical-shape'
  | 'unsupported-transcendental-carrier';

export type AlgebraicGenus0ReadyProfile = {
  kind: 'ready';
  family: 'one-radical-genus0-candidate';
  variable: string;
  integrandShape: AlgebraicGenus0IntegrandShape;
  radicalCount: number;
  radicandDegree: 1 | 2;
  radicandKind: AlgebraicGenus0RadicandKind;
  radicandLatex: string;
  coefficientScope: AlgebraicGenus0CoefficientScope;
  coefficientFactsLatex: string[];
};

export type AlgebraicGenus0StoppedProfile = {
  kind: 'stop';
  variable: string;
  reason: AlgebraicGenus0ProfileStopReason;
  detail?: string;
  radicalCount: number;
};

export type AlgebraicGenus0Profile =
  | AlgebraicGenus0ReadyProfile
  | AlgebraicGenus0StoppedProfile;

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
  'Arcsec',
  'Arcsin',
  'Arctan',
  'Ci',
  'Cos',
  'Cot',
  'Csc',
  'Ei',
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
  reason: AlgebraicGenus0ProfileStopReason,
  radicalCount: number,
  detail?: string,
): AlgebraicGenus0StoppedProfile {
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

function coefficientScope(polynomial: SymbolicPolynomial): AlgebraicGenus0CoefficientScope {
  const exact = polynomial.coefficients.every((coefficient) => Boolean(readExactScalarNode(coefficient.node)));
  return exact ? 'exact-rational' : 'exact-rational-plus-target-free-symbolic';
}

function coefficientFactsLatex(polynomial: SymbolicPolynomial) {
  return polynomial.facts.map((fact) => `${fact.expressionLatex}${fact.relation}`);
}

function mapPolynomialStopReason(reason: string, coefficientReason?: string): AlgebraicGenus0ProfileStopReason {
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

function classifyShape(node: unknown, occurrence: RadicalOccurrence): AlgebraicGenus0IntegrandShape {
  if (termKey(node) === termKey(occurrence.node)) {
    return occurrence.reciprocal ? 'reciprocal-radical' : 'radical';
  }

  return 'rational-in-radical';
}

function normalizeForKey(node: unknown) {
  return simplifyMathJsonNodeOrOriginal(node);
}

export function profileAlgebraicGenus0Candidate(
  node: unknown,
  variable = 'x',
): AlgebraicGenus0Profile {
  const radicals = collectRadicals(node);
  if (radicals.length === 0) {
    return stop(variable, 'no-radical', 0);
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

  const polynomial = parseSymbolicPolynomial(radical.canonicalRadicand, variable, 4);
  if (polynomial.kind === 'stop') {
    return stop(
      variable,
      mapPolynomialStopReason(polynomial.reason, polynomial.coefficientReason),
      radicals.length,
      polynomial.detail,
    );
  }

  if (polynomial.polynomial.degree === 0 || !dependsOnVariable(radical.canonicalRadicand, variable)) {
    return stop(variable, 'constant-radicand', radicals.length);
  }
  if (polynomial.polynomial.degree === 3 || polynomial.polynomial.degree === 4) {
    return stop(variable, 'cubic-quartic-radicand', radicals.length);
  }
  if (polynomial.polynomial.degree > 4) {
    return stop(variable, 'over-cap-radicand-degree', radicals.length);
  }
  if (polynomial.polynomial.degree !== 1 && polynomial.polynomial.degree !== 2) {
    return stop(variable, 'unsupported-radical-shape', radicals.length);
  }

  const radicandDegree = polynomial.polynomial.degree as 1 | 2;
  return {
    kind: 'ready',
    family: 'one-radical-genus0-candidate',
    variable,
    integrandShape: classifyShape(node, radical),
    radicalCount: radicals.length,
    radicandDegree,
    radicandKind: radicandDegree === 1 ? 'affine' : 'quadratic',
    radicandLatex: boxLatex(radical.canonicalRadicand),
    coefficientScope: coefficientScope(polynomial.polynomial),
    coefficientFactsLatex: coefficientFactsLatex(polynomial.polynomial),
  };
}
