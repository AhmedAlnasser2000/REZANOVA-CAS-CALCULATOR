import { readExactScalarNode } from '../../../algebra/polynomial-core';
import { expandMathJsonNode } from '../expansion/expansion';
import { multiplyMathJsonNodes, negateMathJsonNode } from '../simplification/simplification';
import {
  mergeSymbolicCoefficientFacts,
  parseSymbolicCoefficient,
  zeroSymbolicCoefficient,
  type SymbolicCoefficient,
} from '../coefficient-domain';
import {
  dependsOnVariable,
  flattenAdd,
  flattenMultiply,
  isNodeArray,
} from '../../patterns';
import { addSymbolicPolynomials, constantSymbolicPolynomial, monomialSymbolicPolynomial } from './arithmetic';
import type {
  SymbolicPolynomial,
  SymbolicPolynomialParseResult,
} from './types';

const PARSE_EXPANSION_LIMITS = {
  maxTerms: 48,
  maxNodes: 900,
};

type SignedNode = {
  node: unknown;
  sign: 1 | -1;
};

type TermProfile =
  | { kind: 'success'; degree: number; coefficientNode: unknown }
  | { kind: 'stop' };

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
  if (!dependsOnVariable(term.node, variable)) {
    return {
      kind: 'success',
      degree: 0,
      coefficientNode: signedNode(term.node, term.sign),
    };
  }

  const factors = isNodeArray(term.node) && term.node[0] === 'Multiply'
    ? flattenMultiply(term.node)
    : [term.node];
  const coefficientFactors: unknown[] = term.sign === -1 ? [-1] : [];
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
      return { kind: 'stop' };
    }
    coefficientFactors.push(factor);
  }

  if (!sawVariableFactor) {
    return { kind: 'stop' };
  }

  return {
    kind: 'success',
    degree,
    coefficientNode: coefficientFactors.length === 0
      ? 1
      : multiplyMathJsonNodes(...coefficientFactors),
  };
}

function polynomialFromCoefficient(
  coefficient: SymbolicCoefficient,
  variable: string,
  degree: number,
): SymbolicPolynomialParseResult {
  if (degree === 0) {
    return {
      kind: 'success',
      polynomial: constantSymbolicPolynomial(coefficient, variable),
    };
  }
  const monomial = monomialSymbolicPolynomial(variable, degree, coefficient);
  return monomial.kind === 'success' ? monomial : monomial;
}

export function parseSymbolicPolynomial(
  node: unknown,
  variable: string,
  maxDegree = 8,
): SymbolicPolynomialParseResult {
  const expanded = expandMathJsonNode(node, {
    ...PARSE_EXPANSION_LIMITS,
    maxPower: Math.max(maxDegree + 1, 2),
  });
  if (expanded.kind === 'unsupported') {
    return { kind: 'stop', reason: 'expansion-limit', detail: expanded.reason };
  }

  const zero = zeroSymbolicCoefficient(variable);
  if (zero.kind === 'stop') {
    return { kind: 'stop', reason: 'coefficient-stop', coefficientReason: zero.reason };
  }
  let accumulator: SymbolicPolynomial = constantSymbolicPolynomial(zero.coefficient, variable);

  for (const term of signedAddTerms(expanded.node)) {
    const profile = termProfile(term, variable);
    if (profile.kind === 'stop') {
      return { kind: 'stop', reason: 'selected-variable-dependent-coefficient' };
    }
    if (profile.degree > maxDegree) {
      return { kind: 'stop', reason: 'over-cap-degree' };
    }

    const coefficient = parseSymbolicCoefficient(profile.coefficientNode, variable);
    if (coefficient.kind === 'stop') {
      return {
        kind: 'stop',
        reason: 'coefficient-stop',
        coefficientReason: coefficient.reason,
      };
    }

    const monomial = polynomialFromCoefficient(coefficient.coefficient, variable, profile.degree);
    if (monomial.kind === 'stop') {
      return monomial;
    }

    const summed = addSymbolicPolynomials(accumulator, monomial.polynomial, { maxDegree });
    if (summed.kind === 'stop') {
      return summed;
    }
    accumulator = summed.polynomial;
  }

  return {
    kind: 'success',
    polynomial: {
      ...accumulator,
      facts: mergeSymbolicCoefficientFacts(accumulator.coefficients.flatMap((coefficient) => coefficient.facts)),
    },
  };
}
