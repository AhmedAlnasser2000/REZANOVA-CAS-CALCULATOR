import { readExactScalarNode } from '../../../algebra/polynomial-core';
import {
  addMathJsonNodes,
  divideMathJsonNodes,
  multiplyMathJsonNodes,
  negateMathJsonNode,
  simplifyMathJsonNodeOrOriginal,
} from '../../primitives/simplification/simplification';
import {
  boxLatex,
  dependsOnVariable,
  flattenMultiply,
  isNodeArray,
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
import type { RischNormanAnsatzFact } from './exponential-ansatz';
import { normalizeGeneratedRischNormanLatex } from './output-hygiene';
import { profileSymbolicIntegrationResult } from '../../../display/printer';

export type RischNormanSinCosAnsatzStopReason =
  | 'coefficient-stop'
  | 'extra-trig-factor'
  | 'no-sin-cos-factor'
  | 'non-affine-argument'
  | RischNormanPolynomialStopReason;

export type RischNormanSinCosAnsatzResult =
  | {
    kind: 'success';
    family: 'affine-sin-cos';
    variable: string;
    source: 'Sin' | 'Cos';
    polynomialDegree: number;
    antiderivativeNode: unknown;
    exactLatex: string;
    facts: RischNormanAnsatzFact[];
    proof: 'risch-norman-sincos-ansatz-rule-proof';
  }
  | {
    kind: 'stop';
    reason: RischNormanSinCosAnsatzStopReason;
    coefficientReason?: RischNormanCoefficientStopReason;
    detail?: string;
  };

type TrigCarrier = {
  head: 'Sin' | 'Cos';
  argument: unknown;
};

function coefficientFactsToAnsatzFacts(facts: RischNormanCoefficientFact[]) {
  return facts.map((fact): RischNormanAnsatzFact => ({
    kind: 'nonzero',
    expressionLatex: fact.expressionLatex,
    relation: fact.relation,
  }));
}

function nonzeroFact(expressionLatex: string): RischNormanAnsatzFact {
  return {
    kind: 'nonzero',
    expressionLatex,
    relation: '\\ne0',
  };
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

function trigCarrier(node: unknown): TrigCarrier | undefined {
  if (
    isNodeArray(node)
    && node.length === 2
    && (node[0] === 'Sin' || node[0] === 'Cos')
  ) {
    return {
      head: node[0],
      argument: node[1],
    };
  }

  return undefined;
}

function splitTrigProduct(node: unknown, variable: string): RischNormanSinCosAnsatzResult | {
  carrier: TrigCarrier;
  polynomialNode: unknown;
} {
  const factors = isNodeArray(node) && node[0] === 'Multiply'
    ? flattenMultiply(node)
    : [node];
  const carrierIndexes = factors
    .map((factor, index) => ({ index, carrier: trigCarrier(factor) }))
    .filter((entry): entry is { index: number; carrier: TrigCarrier } => {
      if (!entry.carrier) {
        return false;
      }
      return dependsOnVariable(entry.carrier.argument, variable);
    });

  if (carrierIndexes.length === 0) {
    return { kind: 'stop', reason: 'no-sin-cos-factor' };
  }
  if (carrierIndexes.length > 1) {
    return { kind: 'stop', reason: 'extra-trig-factor' };
  }

  const selected = carrierIndexes[0];
  const remaining = factors.filter((_, index) => index !== selected.index);
  return {
    carrier: selected.carrier,
    polynomialNode: remaining.length === 0 ? 1 : multiplyMathJsonNodes(...remaining),
  };
}

function coefficientStop(reason: RischNormanCoefficientStopReason): RischNormanSinCosAnsatzResult {
  return {
    kind: 'stop',
    reason: 'coefficient-stop',
    coefficientReason: reason,
  };
}

function exactZero(node: unknown) {
  const scalar = readExactScalarNode(node);
  return Boolean(scalar && scalar.numerator === 0);
}

function trimTrailingZeros(coefficients: unknown[]) {
  let last = coefficients.length - 1;
  while (last >= 0 && exactZero(coefficients[last])) {
    last -= 1;
  }
  return coefficients.slice(0, last + 1);
}

function derivativeCoefficients(coefficients: unknown[]) {
  if (coefficients.length <= 1) {
    return [];
  }

  return trimTrailingZeros(coefficients.slice(1).map((coefficient, index) =>
    simplifyMathJsonNodeOrOriginal(multiplyMathJsonNodes(index + 1, coefficient))));
}

function addPolynomialTerm(
  target: unknown[],
  degree: number,
  coefficient: unknown,
) {
  target[degree] = simplifyMathJsonNodeOrOriginal(addMathJsonNodes(target[degree] ?? 0, coefficient));
}

function solveByFiniteRecurrence(
  polynomialCoefficients: unknown[],
  slopeNode: unknown,
  source: 'Sin' | 'Cos',
) {
  const size = polynomialCoefficients.length;
  const q = Array.from({ length: size }, () => 0 as unknown);
  const r = Array.from({ length: size }, () => 0 as unknown);
  let derivative = trimTrailingZeros(polynomialCoefficients);
  let current: 'Sin' | 'Cos' = source;
  let sign: 1 | -1 = 1;
  let slopePower = slopeNode;

  while (derivative.length > 0) {
    const head = current === 'Sin' ? 'Cos' : 'Sin';
    const termSign: 1 | -1 = current === 'Sin' ? (sign === 1 ? -1 : 1) : sign;
    for (let degree = 0; degree < derivative.length; degree += 1) {
      const scaled = simplifyMathJsonNodeOrOriginal(divideMathJsonNodes(derivative[degree], slopePower));
      const signed = termSign === 1 ? scaled : negateMathJsonNode(scaled);
      addPolynomialTerm(head === 'Sin' ? q : r, degree, signed);
    }

    derivative = derivativeCoefficients(derivative);
    current = current === 'Sin' ? 'Cos' : 'Sin';
    sign = current === 'Sin' ? (sign === 1 ? -1 : 1) : sign;
    slopePower = multiplyMathJsonNodes(slopePower, slopeNode);
  }

  return { q, r };
}

export function solveRischNormanSinCosAnsatz(
  node: unknown,
  variable: string,
): RischNormanSinCosAnsatzResult {
  const split = splitTrigProduct(node, variable);
  if ('kind' in split) {
    return split;
  }

  const affine = parseSymbolicAffine(split.carrier.argument, variable);
  if (!affine) {
    return { kind: 'stop', reason: 'non-affine-argument' };
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

  const solved = solveByFiniteRecurrence(
    polynomial.coefficients.map((coefficient) => coefficient.node),
    slope.coefficient.node,
    split.carrier.head,
  );
  const qNode = buildPolynomialNodeFromCoefficients(
    solved.q,
    variable,
  );
  const rNode = buildPolynomialNodeFromCoefficients(
    solved.r,
    variable,
  );
  const sinNode = ['Sin', split.carrier.argument];
  const cosNode = ['Cos', split.carrier.argument];
  const antiderivativeNode = simplifyMathJsonNodeOrOriginal(addMathJsonNodes(
    multiplyMathJsonNodes(qNode, sinNode),
    multiplyMathJsonNodes(rNode, cosNode),
  ));

  return profileSymbolicIntegrationResult({
    kind: 'success',
    family: 'affine-sin-cos',
    variable,
    source: split.carrier.head,
    polynomialDegree: polynomial.degree,
    antiderivativeNode,
    exactLatex: normalizeGeneratedRischNormanLatex(boxLatex(antiderivativeNode), variable),
    facts: dedupeFacts([
      ...coefficientFactsToAnsatzFacts(polynomial.facts),
      ...coefficientFactsToAnsatzFacts(slope.coefficient.facts),
      nonzeroFact(slope.coefficient.latex),
    ]),
    proof: 'risch-norman-sincos-ansatz-rule-proof',
  });
}
