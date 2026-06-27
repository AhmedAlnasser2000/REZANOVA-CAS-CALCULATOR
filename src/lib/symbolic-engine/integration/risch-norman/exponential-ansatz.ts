import { normalizeExactScalar, readExactScalarNode } from '../../../algebra/polynomial-core';
import {
  divideMathJsonNodes,
  multiplyMathJsonNodes,
  subtractMathJsonNodes,
  simplifyMathJsonNodeOrOriginal,
} from '../../primitives/simplification/simplification';
import {
  boxLatex,
  dependsOnVariable,
  flattenMultiply,
  isNodeArray,
  wrapGroupedLatex,
} from '../../patterns';
import { parseSymbolicAffine } from '../symbolic-coefficients';
import { BY_PARTS_POLYNOMIAL_DEGREE_CAP } from '../types';
import {
  parseRischNormanCoefficient,
  type RischNormanCoefficientFact,
  type RischNormanCoefficientStopReason,
} from './coefficient-field';
import {
  buildPolynomialNodeFromCoefficients,
  parseRischNormanPolynomial,
  type RischNormanPolynomialStopReason,
} from './polynomial';

export type RischNormanAnsatzFact = {
  kind: 'nonzero' | 'positive' | 'nonunit';
  expressionLatex: string;
  relation: '\\ne0' | '>0' | '\\ne1';
};

export type RischNormanExponentialAnsatzStopReason =
  | 'coefficient-stop'
  | 'invalid-base'
  | 'mixed-transcendental-tower'
  | 'no-exponential-factor'
  | 'non-affine-exponent'
  | RischNormanPolynomialStopReason;

export type RischNormanExponentialAnsatzResult =
  | {
    kind: 'success';
    family: 'affine-exp' | 'positive-base-exp';
    variable: string;
    polynomialDegree: number;
    antiderivativeNode: unknown;
    exactLatex: string;
    facts: RischNormanAnsatzFact[];
    proof: 'risch-norman-exp-ansatz-rule-proof';
  }
  | {
    kind: 'stop';
    reason: RischNormanExponentialAnsatzStopReason;
    coefficientReason?: RischNormanCoefficientStopReason;
  };

type ExponentialCarrier = {
  base: unknown;
  exponent: unknown;
};

function ansatzFact(kind: RischNormanAnsatzFact['kind'], expressionLatex: string): RischNormanAnsatzFact {
  if (kind === 'positive') {
    return { kind, expressionLatex, relation: '>0' };
  }
  if (kind === 'nonunit') {
    return { kind, expressionLatex, relation: '\\ne1' };
  }
  return { kind, expressionLatex, relation: '\\ne0' };
}

function coefficientFactsToAnsatzFacts(facts: RischNormanCoefficientFact[]) {
  return facts.map((fact): RischNormanAnsatzFact => ({
    kind: 'nonzero',
    expressionLatex: fact.expressionLatex,
    relation: fact.relation,
  }));
}

function dedupeFacts(facts: RischNormanAnsatzFact[]) {
  const seen = new Set<string>();
  const deduped: RischNormanAnsatzFact[] = [];
  for (const fact of facts) {
    const key = `${fact.kind}:${fact.expressionLatex}:${fact.relation}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(fact);
  }
  return deduped;
}

function exactZero(node: unknown) {
  const scalar = readExactScalarNode(node);
  return Boolean(scalar && scalar.numerator === 0);
}

function exactPositiveNonUnit(node: unknown) {
  const scalar = readExactScalarNode(node);
  if (!scalar) {
    return undefined;
  }

  const normalized = normalizeExactScalar(scalar);
  return normalized.denominator > 0
    && normalized.numerator > 0
    && normalized.numerator !== normalized.denominator;
}

function exponentialCarrier(node: unknown): ExponentialCarrier | undefined {
  if (
    isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && node[1] === 'ExponentialE'
  ) {
    return { base: node[1], exponent: node[2] };
  }

  if (
    isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
  ) {
    return { base: node[1], exponent: node[2] };
  }

  return undefined;
}

function splitExponentialProductForVariable(node: unknown, variable: string): RischNormanExponentialAnsatzResult | {
  carrier: ExponentialCarrier;
  polynomialNode: unknown;
} {
  const factors = isNodeArray(node) && node[0] === 'Multiply'
    ? flattenMultiply(node)
    : [node];
  const carrierIndexes = factors
    .map((factor, index) => ({ factor, index, carrier: exponentialCarrier(factor) }))
    .filter((entry): entry is { factor: unknown; index: number; carrier: ExponentialCarrier } => {
      if (!entry.carrier) {
        return false;
      }
      return dependsOnVariable(entry.carrier.exponent, variable);
    });

  if (carrierIndexes.length === 0) {
    return { kind: 'stop', reason: 'no-exponential-factor' };
  }
  if (carrierIndexes.length > 1) {
    return { kind: 'stop', reason: 'mixed-transcendental-tower' };
  }

  const selected = carrierIndexes[0];
  const remaining = factors.filter((_, index) => index !== selected.index);
  return {
    carrier: selected.carrier,
    polynomialNode: remaining.length === 0 ? 1 : multiplyMathJsonNodes(...remaining),
  };
}

function coefficientStop(
  reason: RischNormanCoefficientStopReason,
): RischNormanExponentialAnsatzResult {
  return {
    kind: 'stop',
    reason: 'coefficient-stop',
    coefficientReason: reason,
  };
}

function solveCoefficientRecurrence(
  coefficients: unknown[],
  derivativeFactor: unknown,
) {
  const solution = Array.from({ length: coefficients.length }, () => 0 as unknown);
  for (let degree = coefficients.length - 1; degree >= 0; degree -= 1) {
    const carry = degree + 1 < coefficients.length
      ? multiplyMathJsonNodes(degree + 1, solution[degree + 1])
      : 0;
    const residual = subtractMathJsonNodes(coefficients[degree], carry);
    solution[degree] = simplifyMathJsonNodeOrOriginal(divideMathJsonNodes(residual, derivativeFactor));
  }
  return solution;
}

export function solveRischNormanExponentialAnsatz(
  node: unknown,
  variable: string,
): RischNormanExponentialAnsatzResult {
  const split = splitExponentialProductForVariable(node, variable);
  if ('kind' in split) {
    return split;
  }

  const affine = parseSymbolicAffine(split.carrier.exponent, variable);
  if (!affine || exactZero(affine.slope)) {
    return { kind: 'stop', reason: 'non-affine-exponent' };
  }

  const slope = parseRischNormanCoefficient(affine.slope, variable);
  if (slope.kind === 'stop') {
    return coefficientStop(slope.reason);
  }

  const polynomial = parseRischNormanPolynomial(
    split.polynomialNode,
    variable,
    BY_PARTS_POLYNOMIAL_DEGREE_CAP,
  );
  if (polynomial.kind === 'stop') {
    return polynomial.reason === 'coefficient-stop'
      ? {
        kind: 'stop',
        reason: 'coefficient-stop',
        coefficientReason: polynomial.coefficientReason,
      }
      : { kind: 'stop', reason: polynomial.reason };
  }

  const baseLatex = boxLatex(split.carrier.base);
  const facts: RischNormanAnsatzFact[] = [
    ...coefficientFactsToAnsatzFacts(polynomial.facts),
    ...coefficientFactsToAnsatzFacts(slope.coefficient.facts),
    ansatzFact('nonzero', slope.coefficient.latex),
  ];
  let derivativeFactor = slope.coefficient.node;
  let family: 'affine-exp' | 'positive-base-exp' = 'affine-exp';

  if (split.carrier.base !== 'ExponentialE') {
    const base = parseRischNormanCoefficient(split.carrier.base, variable);
    if (base.kind === 'stop') {
      return coefficientStop(base.reason);
    }

    const baseIsExactPositiveNonUnit = exactPositiveNonUnit(split.carrier.base);
    if (readExactScalarNode(split.carrier.base) && !baseIsExactPositiveNonUnit) {
      return { kind: 'stop', reason: 'invalid-base' };
    }

    derivativeFactor = multiplyMathJsonNodes(
      derivativeFactor,
      ['Ln', split.carrier.base],
    );
    facts.push(
      ...coefficientFactsToAnsatzFacts(base.coefficient.facts),
      ansatzFact('positive', base.coefficient.latex),
      ansatzFact('nonunit', base.coefficient.latex),
    );
    family = 'positive-base-exp';
  }

  const antiderivativeCoefficients = solveCoefficientRecurrence(
    polynomial.coefficients.map((coefficient) => coefficient.node),
    derivativeFactor,
  );
  const polynomialNode = buildPolynomialNodeFromCoefficients(antiderivativeCoefficients, variable);
  const carrierNode = ['Power', split.carrier.base, split.carrier.exponent];
  const antiderivativeNode = simplifyMathJsonNodeOrOriginal(multiplyMathJsonNodes(carrierNode, polynomialNode));
  const carrierLatex = family === 'affine-exp'
    ? `e^{${affine.latex}}`
    : `${wrapGroupedLatex(baseLatex)}^{${affine.latex}}`;

  return {
    kind: 'success',
    family,
    variable,
    polynomialDegree: polynomial.degree,
    antiderivativeNode,
    exactLatex: `${carrierLatex}\\left(${boxLatex(polynomialNode)}\\right)`,
    facts: dedupeFacts(facts),
    proof: 'risch-norman-exp-ansatz-rule-proof',
  };
}
