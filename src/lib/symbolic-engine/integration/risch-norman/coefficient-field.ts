import { readExactScalarNode } from '../../../algebra/polynomial-core';
import {
  addMathJsonNodes,
  divideMathJsonNodes,
  multiplyMathJsonNodes,
  negateMathJsonNode,
  simplifyMathJsonNode,
  simplifyMathJsonNodeOrOriginal,
  structuralKey,
  subtractMathJsonNodes,
} from '../../primitives/simplification/simplification';
import { boxLatex, dependsOnVariable, isNodeArray } from '../../patterns';

export type RischNormanCoefficientStopReason =
  | 'branch-sensitive'
  | 'inexact-coefficient'
  | 'node-limit'
  | 'selected-variable-dependent-coefficient'
  | 'unsupported-transcendental-coefficient'
  | 'zero-denominator';

export type RischNormanCoefficientFact = {
  kind: 'nonzero';
  expressionLatex: string;
  relation: '\\ne0';
};

export type RischNormanCoefficient = {
  node: unknown;
  latex: string;
  key: string;
  facts: RischNormanCoefficientFact[];
};

export type RischNormanCoefficientParseResult =
  | { kind: 'success'; coefficient: RischNormanCoefficient }
  | { kind: 'stop'; reason: RischNormanCoefficientStopReason; detail?: string };

const UNSUPPORTED_TRANSCENDENTAL_HEADS = new Set([
  'Sin',
  'Cos',
  'Tan',
  'Cot',
  'Sec',
  'Csc',
  'Ln',
  'Log',
  'Sqrt',
]);

const COEFFICIENT_SIMPLIFY_LIMIT = 700;

export function coefficientFact(expressionLatex: string): RischNormanCoefficientFact {
  return {
    kind: 'nonzero',
    expressionLatex,
    relation: '\\ne0',
  };
}

function dedupeFacts(facts: RischNormanCoefficientFact[]) {
  const seen = new Set<string>();
  const deduped: RischNormanCoefficientFact[] = [];
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

function isExactZero(node: unknown) {
  const scalar = readExactScalarNode(node);
  return Boolean(scalar && scalar.numerator === 0);
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

function containsUnsupportedTranscendental(node: unknown): boolean {
  if (!isNodeArray(node) || typeof node[0] !== 'string') {
    return false;
  }

  if (UNSUPPORTED_TRANSCENDENTAL_HEADS.has(node[0])) {
    return true;
  }

  if (node[0] === 'Power' && node.length === 3 && node[1] === 'ExponentialE') {
    return true;
  }

  return node.slice(1).some(containsUnsupportedTranscendental);
}

function containsZeroDenominator(node: unknown): boolean {
  if (
    node === 'ComplexInfinity'
    || node === 'PositiveInfinity'
    || node === 'NegativeInfinity'
    || node === 'Infinity'
  ) {
    return true;
  }

  if (!isNodeArray(node)) {
    return false;
  }

  if (node[0] === 'Divide' && node.length === 3 && isExactZero(node[2])) {
    return true;
  }

  return node.slice(1).some(containsZeroDenominator);
}

function collectDenominatorFacts(node: unknown): RischNormanCoefficientFact[] {
  if (!isNodeArray(node)) {
    return [];
  }

  const childFacts = node.slice(1).flatMap(collectDenominatorFacts);
  if (node[0] !== 'Divide' || node.length !== 3) {
    return childFacts;
  }

  return [
    ...childFacts,
    coefficientFact(boxLatex(simplifyMathJsonNodeOrOriginal(node[2]))),
  ];
}

function validateCoefficientNode(node: unknown, variable: string): RischNormanCoefficientParseResult | undefined {
  if (containsInexactNumber(node)) {
    return { kind: 'stop', reason: 'inexact-coefficient' };
  }
  if (containsBranchSensitiveCarrier(node)) {
    return { kind: 'stop', reason: 'branch-sensitive' };
  }
  if (containsUnsupportedTranscendental(node)) {
    return { kind: 'stop', reason: 'unsupported-transcendental-coefficient' };
  }
  if (dependsOnVariable(node, variable)) {
    return { kind: 'stop', reason: 'selected-variable-dependent-coefficient' };
  }
  if (containsZeroDenominator(node)) {
    return { kind: 'stop', reason: 'zero-denominator' };
  }

  return undefined;
}

export function parseRischNormanCoefficient(
  node: unknown,
  variable: string,
  facts: RischNormanCoefficientFact[] = [],
): RischNormanCoefficientParseResult {
  const validation = validateCoefficientNode(node, variable);
  if (validation) {
    return validation;
  }

  const simplified = simplifyMathJsonNode(node, { maxNodeCount: COEFFICIENT_SIMPLIFY_LIMIT });
  if (simplified.kind === 'unsupported') {
    return { kind: 'stop', reason: 'node-limit', detail: simplified.message };
  }

  const denominatorFacts = collectDenominatorFacts(simplified.node);
  return {
    kind: 'success',
    coefficient: {
      node: simplified.node,
      latex: boxLatex(simplified.node),
      key: structuralKey(simplified.node),
      facts: dedupeFacts([...facts, ...denominatorFacts]),
    },
  };
}

function parseOperationResult(
  node: unknown,
  variable: string,
  facts: RischNormanCoefficientFact[],
) {
  return parseRischNormanCoefficient(node, variable, facts);
}

export function zeroRischNormanCoefficient(variable: string) {
  return parseRischNormanCoefficient(0, variable);
}

export function oneRischNormanCoefficient(variable: string) {
  return parseRischNormanCoefficient(1, variable);
}

export function isRischNormanCoefficientZero(coefficient: RischNormanCoefficient) {
  return isExactZero(coefficient.node);
}

export function isRischNormanCoefficientOne(coefficient: RischNormanCoefficient) {
  const scalar = readExactScalarNode(coefficient.node);
  return Boolean(scalar && scalar.numerator === scalar.denominator);
}

export function negateRischNormanCoefficient(
  coefficient: RischNormanCoefficient,
  variable: string,
) {
  return parseOperationResult(
    negateMathJsonNode(coefficient.node),
    variable,
    coefficient.facts,
  );
}

export function addRischNormanCoefficients(
  left: RischNormanCoefficient,
  right: RischNormanCoefficient,
  variable: string,
) {
  return parseOperationResult(
    addMathJsonNodes(left.node, right.node),
    variable,
    [...left.facts, ...right.facts],
  );
}

export function subtractRischNormanCoefficients(
  left: RischNormanCoefficient,
  right: RischNormanCoefficient,
  variable: string,
) {
  return parseOperationResult(
    subtractMathJsonNodes(left.node, right.node),
    variable,
    [...left.facts, ...right.facts],
  );
}

export function multiplyRischNormanCoefficients(
  left: RischNormanCoefficient,
  right: RischNormanCoefficient,
  variable: string,
) {
  return parseOperationResult(
    multiplyMathJsonNodes(left.node, right.node),
    variable,
    [...left.facts, ...right.facts],
  );
}

export function divideRischNormanCoefficients(
  left: RischNormanCoefficient,
  right: RischNormanCoefficient,
  variable: string,
) {
  if (isRischNormanCoefficientZero(right)) {
    return { kind: 'stop' as const, reason: 'zero-denominator' as const };
  }

  return parseOperationResult(
    divideMathJsonNodes(left.node, right.node),
    variable,
    [
      ...left.facts,
      ...right.facts,
      coefficientFact(right.latex),
    ],
  );
}
