import {
  addExactScalars,
  buildExactScalarNode,
  exactScalarIsZero,
  multiplyExactScalars,
  readExactScalarNode,
  type ExactScalar,
} from '../../../algebra/polynomial-core';
import {
  addMathJsonNodes,
  multiplyMathJsonNodes,
  negateMathJsonNode,
  simplifyMathJsonNodeOrOriginal,
  splitAdditiveTerms as splitSimplifiedAdditiveTerms,
  squareMathJsonNode,
  structuralKey,
} from '../simplification/simplification';

export type MathJson = string | number | boolean | null | MathJson[] | { [key: string]: MathJson | undefined };

export type AffineCarrierBase = {
  base: MathJson;
  coefficient: ExactScalar;
  offset: MathJson;
  key: string;
};

export type CarrierPower = {
  carrier: AffineCarrierBase;
  exponent: number;
};

export type CarrierMonomialTerm =
  | { kind: 'term'; degree: number; coefficient: MathJson; carrier: AffineCarrierBase | null }
  | { kind: 'unsupported'; message: string };

export type CarrierTermFactor = {
  node: MathJson;
  carrierPower: CarrierPower | null;
};

export type GroupedCarrierTerm =
  | { kind: 'term'; sign: 1 | -1; factors: CarrierTermFactor[] }
  | { kind: 'unsupported' };

const EXACT_ZERO = { numerator: 0, denominator: 1 };
const EXACT_ONE = { numerator: 1, denominator: 1 };

export function isArrayNode(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

export function isZeroNode(node: unknown) {
  return typeof node === 'number' && Object.is(node, 0);
}

export function isOneNode(node: unknown) {
  return typeof node === 'number' && Object.is(node, 1);
}

export function hasTarget(node: unknown, target: string): boolean {
  if (typeof node === 'string') {
    return node === target;
  }
  if (isArrayNode(node)) {
    return node.some((entry) => hasTarget(entry, target));
  }
  if (node && typeof node === 'object') {
    return Object.values(node).some((entry) => hasTarget(entry, target));
  }
  return false;
}

export function simplifyNode(node: MathJson): MathJson {
  return simplifyMathJsonNodeOrOriginal(node) as MathJson;
}

export function addNodes(...nodes: MathJson[]): MathJson {
  return addMathJsonNodes(...nodes) as MathJson;
}

export function multiplyNodes(...nodes: MathJson[]): MathJson {
  return multiplyMathJsonNodes(...nodes) as MathJson;
}

export function negateNode(node: MathJson): MathJson {
  return negateMathJsonNode(node) as MathJson;
}

export function subtractNodes(left: MathJson, right: MathJson) {
  return addNodes(left, negateNode(right));
}

export function squareNode(node: MathJson): MathJson {
  return squareMathJsonNode(node) as MathJson;
}

export function splitAdditiveTerms(node: MathJson): MathJson[] {
  return splitSimplifiedAdditiveTerms(node) as MathJson[];
}

export function nodeKey(node: MathJson) {
  return structuralKey(node);
}

function exactScalarKey(value: ExactScalar) {
  return `${value.numerator}/${value.denominator}`;
}

function carrierKey(coefficient: ExactScalar, offset: MathJson) {
  return `${exactScalarKey(coefficient)}|${JSON.stringify(simplifyNode(offset))}`;
}

function readLinearTargetTerm(node: MathJson, target: string): ExactScalar | null {
  if (node === target) {
    return EXACT_ONE;
  }
  if (isArrayNode(node) && node[0] === 'Negate' && node[1] === target) {
    return { numerator: -1, denominator: 1 };
  }
  if (!isArrayNode(node) || node[0] !== 'Multiply') {
    return null;
  }

  let coefficient = EXACT_ONE;
  let targetCount = 0;
  for (const factor of node.slice(1) as MathJson[]) {
    const exact = readExactScalarNode(factor);
    if (exact) {
      coefficient = multiplyExactScalars(coefficient, exact);
      continue;
    }
    if (factor === target) {
      targetCount += 1;
      continue;
    }
    return null;
  }
  return targetCount === 1 ? coefficient : null;
}

export function readAffineCarrierBase(node: MathJson, target: string): AffineCarrierBase | null {
  const simplified = simplifyNode(node);
  if (simplified === target) {
    return { base: simplified, coefficient: EXACT_ONE, offset: 0, key: carrierKey(EXACT_ONE, 0) };
  }

  let coefficient = EXACT_ZERO;
  const offsetTerms: MathJson[] = [];
  for (const term of splitAdditiveTerms(simplified)) {
    if (!hasTarget(term, target)) {
      offsetTerms.push(term);
      continue;
    }
    const targetCoefficient = readLinearTargetTerm(term, target);
    if (!targetCoefficient) {
      return null;
    }
    coefficient = addExactScalars(coefficient, targetCoefficient);
  }

  if (exactScalarIsZero(coefficient)) {
    return null;
  }
  const offset = offsetTerms.length === 0 ? 0 : addNodes(...offsetTerms);
  return { base: simplified, coefficient, offset, key: carrierKey(coefficient, offset) };
}

export function parsePositiveIntegerPower(node: MathJson): { base: MathJson; exponent: number } | null {
  if (
    isArrayNode(node)
    && node[0] === 'Power'
    && typeof node[2] === 'number'
    && Number.isInteger(node[2])
    && node[2] > 0
  ) {
    return { base: node[1] as MathJson, exponent: node[2] };
  }
  return null;
}

export function readCarrierPowerFactor(node: MathJson, target: string): CarrierPower | null {
  const power = parsePositiveIntegerPower(node);
  if (power) {
    const carrier = readAffineCarrierBase(power.base, target);
    return carrier ? { carrier, exponent: power.exponent } : null;
  }
  const carrier = readAffineCarrierBase(node, target);
  return carrier ? { carrier, exponent: 1 } : null;
}

export function carrierPowerNode(carrier: AffineCarrierBase, degree: number): MathJson {
  if (degree === 0) {
    return 1;
  }
  return degree === 1 ? carrier.base : ['Power', carrier.base, degree] as MathJson;
}

export function decomposeGroupedCarrierTerm(term: MathJson, target: string): GroupedCarrierTerm {
  if (isArrayNode(term) && term[0] === 'Negate') {
    const child = decomposeGroupedCarrierTerm(term[1] as MathJson, target);
    return child.kind === 'term' ? { ...child, sign: child.sign === 1 ? -1 : 1 } : child;
  }

  const rawFactors = isArrayNode(term) && term[0] === 'Multiply'
    ? term.slice(1) as MathJson[]
    : [term];
  const factors: CarrierTermFactor[] = [];
  for (const factor of rawFactors) {
    const carrierPower = hasTarget(factor, target) ? readCarrierPowerFactor(factor, target) : null;
    if (hasTarget(factor, target) && !carrierPower) {
      return { kind: 'unsupported' };
    }
    factors.push({ node: factor, carrierPower });
  }
  return { kind: 'term', sign: 1, factors };
}

export function decomposeCarrierMonomialTerm(term: MathJson, target: string): CarrierMonomialTerm {
  const simplified = simplifyNode(term);
  if (isArrayNode(simplified) && simplified[0] === 'Negate') {
    const child = decomposeCarrierMonomialTerm(simplified[1] as MathJson, target);
    return child.kind === 'term'
      ? { ...child, coefficient: negateNode(child.coefficient) }
      : child;
  }

  const rawFactors = isArrayNode(simplified) && simplified[0] === 'Multiply'
    ? simplified.slice(1) as MathJson[]
    : [simplified];
  const coefficientFactors: MathJson[] = [];
  let carrierPower: CarrierPower | null = null;

  for (const factor of rawFactors) {
    if (!hasTarget(factor, target)) {
      coefficientFactors.push(factor);
      continue;
    }
    const parsedCarrier = readCarrierPowerFactor(factor, target);
    if (!parsedCarrier || carrierPower) {
      return {
        kind: 'unsupported',
        message: 'Symbolic factor discovery supports only powers of one pure or affine selected-target carrier with target-free coefficients.',
      };
    }
    carrierPower = parsedCarrier;
  }

  return {
    kind: 'term',
    degree: carrierPower?.exponent ?? 0,
    coefficient: coefficientFactors.length === 0 ? 1 : multiplyNodes(...coefficientFactors),
    carrier: carrierPower?.carrier ?? null,
  };
}

function exactScalarNode(value: ExactScalar): MathJson {
  return buildExactScalarNode(value) as MathJson;
}

function expandedCarrierPowerNode(carrier: AffineCarrierBase, degree: number, target: string): MathJson {
  if (degree === 0) {
    return 1;
  }
  if (degree === 1) {
    return carrier.base;
  }
  if (degree !== 2) {
    return carrierPowerNode(carrier, degree);
  }

  const q = exactScalarNode(carrier.coefficient);
  const xSquaredTerm = multiplyNodes(q, q, ['Power', target, 2] as MathJson);
  if (isZeroNode(simplifyNode(carrier.offset))) {
    return xSquaredTerm;
  }
  return addNodes(xSquaredTerm, multiplyNodes(2, q, carrier.offset, target), squareNode(carrier.offset));
}

export function polynomialNodeForCarrier(
  termsByDegree: readonly MathJson[],
  carrier: AffineCarrierBase,
  target: string,
) {
  const nodes = termsByDegree
    .map((coefficient, degree) => ({ coefficient, degree }))
    .filter(({ coefficient }) => !isZeroNode(simplifyNode(coefficient)))
    .map(({ coefficient, degree }) => {
      if (degree === 0) {
        return coefficient;
      }
      const power = expandedCarrierPowerNode(carrier, degree, target);
      return isOneNode(simplifyNode(coefficient)) ? power : multiplyNodes(coefficient, power);
    });

  return nodes.length === 0 ? 0 : addNodes(...nodes);
}
