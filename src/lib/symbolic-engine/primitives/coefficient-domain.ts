import { readExactScalarNode } from '../../algebra/polynomial-core';
import {
  addMathJsonNodes,
  divideMathJsonNodes,
  multiplyMathJsonNodes,
  negateMathJsonNode,
  simplifyMathJsonNode,
  simplifyMathJsonNodeOrOriginal,
  structuralKey,
  subtractMathJsonNodes,
} from './simplification/simplification';
import {
  boxLatex,
  buildTermNode,
  decomposeProduct,
  dependsOnVariable,
  flattenAdd,
  flattenMultiply,
  isNodeArray,
  termKey,
  type FactorMap,
} from '../patterns';

export type SymbolicCoefficientStopReason =
  | 'branch-sensitive'
  | 'inexact-coefficient'
  | 'node-limit'
  | 'selected-variable-dependent-coefficient'
  | 'unsupported-transcendental-coefficient'
  | 'zero-denominator';

export type SymbolicCoefficientFact = {
  kind: 'nonzero';
  expressionLatex: string;
  relation: '\\ne0';
};

export type SymbolicCoefficient = {
  node: unknown;
  latex: string;
  key: string;
  facts: SymbolicCoefficientFact[];
};

export type SymbolicCoefficientParseResult =
  | { kind: 'success'; coefficient: SymbolicCoefficient }
  | { kind: 'stop'; reason: SymbolicCoefficientStopReason; detail?: string };

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

export function symbolicCoefficientFact(expressionLatex: string): SymbolicCoefficientFact {
  return {
    kind: 'nonzero',
    expressionLatex,
    relation: '\\ne0',
  };
}

export function mergeSymbolicCoefficientFacts(facts: SymbolicCoefficientFact[]) {
  const seen = new Set<string>();
  const deduped: SymbolicCoefficientFact[] = [];
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

function nonzeroFactForNode(node: unknown) {
  const scalar = readExactScalarNode(node);
  if (scalar && scalar.numerator !== 0) {
    return [];
  }

  return [symbolicCoefficientFact(boxLatex(simplifyMathJsonNodeOrOriginal(node)))];
}

function isExactZero(node: unknown) {
  const scalar = readExactScalarNode(node);
  return Boolean(scalar && scalar.numerator === 0);
}

function signedAdditiveKeys(node: unknown, sign: 1 | -1 = 1): Array<{ key: string; sign: 1 | -1 }> {
  if (isNodeArray(node) && node[0] === 'Add') {
    return flattenAdd(node).flatMap((term) => signedAdditiveKeys(term, sign));
  }

  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    return signedAdditiveKeys(node[1], sign === 1 ? -1 : 1);
  }

  return [{ key: termKey(node), sign }];
}

function cancelsToSymbolicZero(node: unknown) {
  if (!isNodeArray(node) || node[0] !== 'Add') {
    return false;
  }

  const counts = new Map<string, number>();
  for (const term of signedAdditiveKeys(node)) {
    counts.set(term.key, (counts.get(term.key) ?? 0) + term.sign);
  }

  return [...counts.values()].every((count) => count === 0);
}

function factorMapKey(factors: FactorMap): string {
  return JSON.stringify(
    [...factors.values()]
      .map(({ node, exponent }) => [termKey(node), exponent] as const)
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function combineLikeAddTerms(node: unknown): unknown {
  if (!isNodeArray(node) || node[0] !== 'Add') {
    return node;
  }

  const groups = new Map<string, { coefficient: number; factors: FactorMap }>();
  const unmerged: unknown[] = [];
  for (const term of flattenAdd(node)) {
    const decomposed = decomposeProduct(term);
    if (!decomposed) {
      unmerged.push(term);
      continue;
    }

    const key = factorMapKey(decomposed.factors);
    const existing = groups.get(key);
    if (existing) {
      existing.coefficient += decomposed.coefficient;
    } else {
      groups.set(key, {
        coefficient: decomposed.coefficient,
        factors: decomposed.factors,
      });
    }
  }

  const merged = [...groups.values()]
    .filter(({ coefficient }) => coefficient !== 0)
    .map(({ coefficient, factors }) => buildTermNode(coefficient, factors));
  const terms = [...merged, ...unmerged];
  if (terms.length === 0) {
    return 0;
  }
  return terms.length === 1 ? terms[0] : ['Add', ...terms];
}

function cloneFactors(factors: FactorMap): FactorMap {
  return new Map([...factors].map(([key, value]) => [key, { ...value }]));
}

function removeCanceledFactors(numerator: FactorMap, denominator: FactorMap) {
  for (const [key, denominatorFactor] of [...denominator]) {
    const numeratorFactor = numerator.get(key);
    if (!numeratorFactor) {
      continue;
    }

    const canceled = Math.min(numeratorFactor.exponent, denominatorFactor.exponent);
    numeratorFactor.exponent -= canceled;
    denominatorFactor.exponent -= canceled;
    if (numeratorFactor.exponent === 0) {
      numerator.delete(key);
    }
    if (denominatorFactor.exponent === 0) {
      denominator.delete(key);
    }
  }
}

function reduceProductQuotient(node: unknown): unknown {
  if (!isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3) {
    return node;
  }

  const numeratorNode = combineLikeAddTerms(node[1]);
  const denominatorNode = combineLikeAddTerms(node[2]);
  if (isExactZero(numeratorNode) || cancelsToSymbolicZero(numeratorNode)) {
    return 0;
  }

  const numerator = decomposeProduct(numeratorNode);
  const denominator = decomposeProduct(denominatorNode);
  if (!numerator || !denominator || denominator.coefficient === 0) {
    return ['Divide', numeratorNode, denominatorNode];
  }

  const numeratorFactors = cloneFactors(numerator.factors);
  const denominatorFactors = cloneFactors(denominator.factors);
  removeCanceledFactors(numeratorFactors, denominatorFactors);

  const coefficientRatio = numerator.coefficient / denominator.coefficient;
  if (denominatorFactors.size === 0 && Number.isInteger(coefficientRatio)) {
    return buildTermNode(coefficientRatio, numeratorFactors);
  }

  const reducedNumerator = buildTermNode(numerator.coefficient, numeratorFactors);
  const reducedDenominator = buildTermNode(denominator.coefficient, denominatorFactors);
  return reducedDenominator === 1
    ? reducedNumerator
    : ['Divide', reducedNumerator, reducedDenominator];
}

function multiplyNodeWithoutDistribution(factors: unknown[]): unknown {
  const flattened = factors.flatMap(flattenMultiply);
  if (flattened.length === 0) {
    return 1;
  }
  return flattened.length === 1 ? flattened[0] : ['Multiply', ...flattened];
}

function distributeCoefficientProduct(factors: unknown[]): unknown {
  const choices: unknown[][] = [];
  let termCount = 1;
  for (const factor of factors.flatMap(flattenMultiply)) {
    const factorChoices = isNodeArray(factor) && factor[0] === 'Add'
      ? flattenAdd(factor)
      : [factor];
    termCount *= factorChoices.length;
    if (termCount > 32) {
      return multiplyNodeWithoutDistribution(factors);
    }
    choices.push(factorChoices);
  }

  let products: unknown[][] = [[]];
  for (const factorChoices of choices) {
    const nextProducts: unknown[][] = [];
    for (const product of products) {
      for (const choice of factorChoices) {
        nextProducts.push([...product, choice]);
      }
    }
    products = nextProducts;
  }

  const terms = products.map(multiplyNodeWithoutDistribution);
  return combineLikeAddTerms(terms.length === 1 ? terms[0] : ['Add', ...terms]);
}

function normalizeCoefficientNode(node: unknown): unknown {
  if (!isNodeArray(node)) {
    return node;
  }

  const normalizedChildren = node.slice(1).map(normalizeCoefficientNode);
  const rebuilt = [node[0], ...normalizedChildren];
  if (node[0] === 'Add') {
    return combineLikeAddTerms(rebuilt);
  }
  if (node[0] === 'Divide') {
    return reduceProductQuotient(rebuilt);
  }
  if (node[0] === 'Multiply') {
    return distributeCoefficientProduct(normalizedChildren);
  }
  return rebuilt;
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

function collectDenominatorFacts(node: unknown): SymbolicCoefficientFact[] {
  if (!isNodeArray(node)) {
    return [];
  }

  const childFacts = node.slice(1).flatMap(collectDenominatorFacts);
  if (node[0] !== 'Divide' || node.length !== 3) {
    return childFacts;
  }

  return [
    ...childFacts,
    ...nonzeroFactForNode(node[2]),
  ];
}

function validateCoefficientNode(node: unknown, variable: string): SymbolicCoefficientParseResult | undefined {
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

export function parseSymbolicCoefficient(
  node: unknown,
  variable: string,
  facts: SymbolicCoefficientFact[] = [],
): SymbolicCoefficientParseResult {
  const validation = validateCoefficientNode(node, variable);
  if (validation) {
    return validation;
  }

  const simplified = simplifyMathJsonNode(node, { maxNodeCount: COEFFICIENT_SIMPLIFY_LIMIT });
  if (simplified.kind === 'unsupported') {
    return { kind: 'stop', reason: 'node-limit', detail: simplified.message };
  }

  const nodeWithLikeTerms = normalizeCoefficientNode(simplified.node);
  const denominatorFacts = collectDenominatorFacts(nodeWithLikeTerms);
  return {
    kind: 'success',
    coefficient: {
      node: nodeWithLikeTerms,
      latex: boxLatex(nodeWithLikeTerms),
      key: structuralKey(nodeWithLikeTerms),
      facts: mergeSymbolicCoefficientFacts([...facts, ...denominatorFacts]),
    },
  };
}

function parseOperationResult(
  node: unknown,
  variable: string,
  facts: SymbolicCoefficientFact[],
) {
  return parseSymbolicCoefficient(node, variable, facts);
}

export function zeroSymbolicCoefficient(variable: string) {
  return parseSymbolicCoefficient(0, variable);
}

export function oneSymbolicCoefficient(variable: string) {
  return parseSymbolicCoefficient(1, variable);
}

export function isSymbolicCoefficientZero(coefficient: SymbolicCoefficient) {
  return isExactZero(coefficient.node) || cancelsToSymbolicZero(coefficient.node);
}

export function isSymbolicCoefficientOne(coefficient: SymbolicCoefficient) {
  const scalar = readExactScalarNode(coefficient.node);
  return Boolean(scalar && scalar.numerator === scalar.denominator);
}

export function negateSymbolicCoefficient(
  coefficient: SymbolicCoefficient,
  variable: string,
) {
  return parseOperationResult(
    negateMathJsonNode(coefficient.node),
    variable,
    coefficient.facts,
  );
}

export function addSymbolicCoefficients(
  left: SymbolicCoefficient,
  right: SymbolicCoefficient,
  variable: string,
) {
  return parseOperationResult(
    addMathJsonNodes(left.node, right.node),
    variable,
    [...left.facts, ...right.facts],
  );
}

export function subtractSymbolicCoefficients(
  left: SymbolicCoefficient,
  right: SymbolicCoefficient,
  variable: string,
) {
  return parseOperationResult(
    subtractMathJsonNodes(left.node, right.node),
    variable,
    [...left.facts, ...right.facts],
  );
}

export function multiplySymbolicCoefficients(
  left: SymbolicCoefficient,
  right: SymbolicCoefficient,
  variable: string,
) {
  return parseOperationResult(
    multiplyMathJsonNodes(left.node, right.node),
    variable,
    [...left.facts, ...right.facts],
  );
}

export function divideSymbolicCoefficients(
  left: SymbolicCoefficient,
  right: SymbolicCoefficient,
  variable: string,
) {
  if (isSymbolicCoefficientZero(right)) {
    return { kind: 'stop' as const, reason: 'zero-denominator' as const };
  }

  return parseOperationResult(
    divideMathJsonNodes(left.node, right.node),
    variable,
    [
      ...left.facts,
      ...right.facts,
      ...nonzeroFactForNode(right.node),
    ],
  );
}
