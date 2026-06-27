import { readExactScalarNode } from '../../../algebra/polynomial-core';
import {
  addMathJsonNodes,
  multiplyMathJsonNodes,
  negateMathJsonNode,
  simplifyMathJsonNodeOrOriginal,
} from '../../primitives/simplification/simplification';
import {
  dependsOnVariable,
  flattenAdd,
  flattenMultiply,
  isNodeArray,
} from '../../patterns';
import {
  addRischNormanCoefficients,
  mergeRischNormanCoefficientFacts,
  parseRischNormanCoefficient,
  zeroRischNormanCoefficient,
  type RischNormanCoefficient,
  type RischNormanCoefficientFact,
  type RischNormanCoefficientStopReason,
} from './coefficient-field';

export type RischNormanPolynomialStopReason =
  | 'coefficient-stop'
  | 'over-cap-degree'
  | 'selected-variable-dependent-coefficient';

export type RischNormanPolynomialParseResult =
  | {
    kind: 'success';
    degree: number;
    coefficients: RischNormanCoefficient[];
    facts: RischNormanCoefficientFact[];
  }
  | {
    kind: 'stop';
    reason: RischNormanPolynomialStopReason;
    coefficientReason?: RischNormanCoefficientStopReason;
  };

type SignedNode = {
  node: unknown;
  sign: 1 | -1;
};

type TermProfile =
  | { kind: 'success'; degree: number; coefficientNode: unknown }
  | { kind: 'stop'; reason: Extract<RischNormanPolynomialStopReason, 'selected-variable-dependent-coefficient'> };

function exactNonnegativeInteger(node: unknown) {
  const scalar = readExactScalarNode(node);
  return scalar && scalar.denominator === 1 && scalar.numerator >= 0
    ? scalar.numerator
    : undefined;
}

function signedNode(node: unknown, sign: 1 | -1): unknown {
  return sign === 1 ? node : negateMathJsonNode(node);
}

function signedAddTerms(node: unknown, sign: 1 | -1 = 1): SignedNode[] {
  if (isNodeArray(node) && node[0] === 'Add') {
    return flattenAdd(node).flatMap((term) => signedAddTerms(term, sign));
  }

  if (isNodeArray(node) && node[0] === 'Subtract') {
    const [first, ...rest] = node.slice(1);
    return [
      ...(first === undefined ? [] : signedAddTerms(first, sign)),
      ...rest.flatMap((term) => signedAddTerms(term, sign === 1 ? -1 : 1)),
    ];
  }

  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    return signedAddTerms(node[1], sign === 1 ? -1 : 1);
  }

  return [{ node, sign }];
}

function variablePowerDegree(node: unknown, variable: string) {
  if (node === variable) {
    return 1;
  }

  if (
    isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && node[1] === variable
  ) {
    return exactNonnegativeInteger(node[2]);
  }

  return undefined;
}

function termProfile(term: SignedNode, variable: string): TermProfile {
  const signed = signedNode(term.node, term.sign);
  if (!dependsOnVariable(signed, variable)) {
    return {
      kind: 'success',
      degree: 0,
      coefficientNode: signed,
    };
  }

  const factors = isNodeArray(signed) && signed[0] === 'Multiply'
    ? flattenMultiply(signed)
    : [signed];
  const coefficientFactors: unknown[] = [];
  let degree = 0;
  let sawVariableFactor = false;

  for (const factor of factors) {
    const factorDegree = variablePowerDegree(factor, variable);
    if (factorDegree !== undefined) {
      degree += factorDegree;
      sawVariableFactor = true;
      continue;
    }

    if (dependsOnVariable(factor, variable)) {
      return { kind: 'stop', reason: 'selected-variable-dependent-coefficient' };
    }
    coefficientFactors.push(factor);
  }

  if (!sawVariableFactor) {
    return { kind: 'stop', reason: 'selected-variable-dependent-coefficient' };
  }

  return {
    kind: 'success',
    degree,
    coefficientNode: coefficientFactors.length === 0
      ? 1
      : multiplyMathJsonNodes(...coefficientFactors),
  };
}

function mergeCoefficientInto(
  coefficients: RischNormanCoefficient[],
  degree: number,
  coefficient: RischNormanCoefficient,
  variable: string,
): RischNormanPolynomialParseResult | undefined {
  const combined = addRischNormanCoefficients(coefficients[degree], coefficient, variable);
  if (combined.kind === 'stop') {
    return {
      kind: 'stop',
      reason: 'coefficient-stop',
      coefficientReason: combined.reason,
    };
  }
  coefficients[degree] = combined.coefficient;
  return undefined;
}

export function parseRischNormanPolynomial(
  node: unknown,
  variable: string,
  maxDegree: number,
): RischNormanPolynomialParseResult {
  const parsedTerms: Array<{ degree: number; coefficient: RischNormanCoefficient }> = [];
  let degree = 0;

  for (const term of signedAddTerms(simplifyMathJsonNodeOrOriginal(node))) {
    const profile = termProfile(term, variable);
    if (profile.kind === 'stop') {
      return { kind: 'stop', reason: profile.reason };
    }
    if (profile.degree > maxDegree) {
      return { kind: 'stop', reason: 'over-cap-degree' };
    }

    const coefficient = parseRischNormanCoefficient(profile.coefficientNode, variable);
    if (coefficient.kind === 'stop') {
      return {
        kind: 'stop',
        reason: 'coefficient-stop',
        coefficientReason: coefficient.reason,
      };
    }

    degree = Math.max(degree, profile.degree);
    parsedTerms.push({ degree: profile.degree, coefficient: coefficient.coefficient });
  }

  const zero = zeroRischNormanCoefficient(variable);
  if (zero.kind === 'stop') {
    return {
      kind: 'stop',
      reason: 'coefficient-stop',
      coefficientReason: zero.reason,
    };
  }
  const coefficients = Array.from({ length: degree + 1 }, () => zero.coefficient);
  for (const term of parsedTerms) {
    const stop = mergeCoefficientInto(coefficients, term.degree, term.coefficient, variable);
    if (stop) {
      return stop;
    }
  }

  return {
    kind: 'success',
    degree,
    coefficients,
    facts: mergeRischNormanCoefficientFacts(coefficients.flatMap((coefficient) => coefficient.facts)),
  };
}

export function buildPolynomialNodeFromCoefficients(
  coefficients: unknown[],
  variable: string,
) {
  const terms: unknown[] = [];
  coefficients.forEach((coefficientNode, degree) => {
    const scalar = readExactScalarNode(coefficientNode);
    if (scalar && scalar.numerator === 0) {
      return;
    }

    if (degree === 0) {
      terms.push(coefficientNode);
      return;
    }

    const variableNode = degree === 1 ? variable : ['Power', variable, degree];
    terms.push(multiplyMathJsonNodes(coefficientNode, variableNode));
  });

  return addMathJsonNodes(...terms);
}
