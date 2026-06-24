import {
  addExactScalars,
  buildExactPolynomialFromCoefficients,
  buildExactScalarNode,
  divideExactScalars,
  exactScalarIsZero,
  exactScalarToNumber,
  multiplyExactScalars,
  negateExactScalar,
  readExactScalarNode,
  type ExactPolynomial,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import { exactScalarToLatex } from './exact';
import { containsTarget, isArrayNode, latexForNode, simplifyNode } from './math-json';
import type { MathJson } from './types';

export const MAX_COMPLEX_SPECIAL_FORM_DEGREE = 12;

const EXACT_ZERO: ExactScalar = { numerator: 0, denominator: 1 };
const EXACT_ONE: ExactScalar = { numerator: 1, denominator: 1 };

export type AffineCarrierBase = {
  base: MathJson;
  coefficient: ExactScalar;
  offset: MathJson;
  key: string;
};

type CarrierTerm =
  | { kind: 'exact'; coefficient: ExactScalar; exponent: number; carrier: AffineCarrierBase }
  | { kind: 'exact-constant'; coefficient: ExactScalar }
  | { kind: 'symbolic-coefficient'; exponent: number; carrier: AffineCarrierBase }
  | { kind: 'symbolic-constant'; node: MathJson }
  | { kind: 'unsupported-carrier' };

export type CarrierCollectResult =
  | {
      kind: 'direct';
      carrier: AffineCarrierBase;
      degree: number;
      carrierValue: MathJson;
      carrierValueNumeric: number;
    }
  | {
      kind: 'direct-symbolic';
      carrier: AffineCarrierBase;
      degree: number;
      carrierValue: MathJson;
    }
  | {
      kind: 'quadratic';
      carrier: AffineCarrierBase;
      carrierDegree: number;
      totalDegree: number;
      quadratic: ExactPolynomial;
    }
  | { kind: 'degree-limit' }
  | { kind: 'symbolic-coefficients' }
  | { kind: 'unsupported-carrier' }
  | { kind: 'no-special-form' };

function splitTerms(node: MathJson) {
  const simplified = simplifyNode(node);
  if (!isArrayNode(simplified)) {
    return [simplified];
  }
  if (simplified[0] === 'Add') {
    return simplified.slice(1) as MathJson[];
  }
  if (simplified[0] === 'Subtract' && simplified.length === 3) {
    return [
      simplified[1] as MathJson,
      simplifyNode(['Negate', simplified[2] as MathJson] as MathJson),
    ];
  }
  return [simplified];
}

function exactScalarKey(value: ExactScalar) {
  return `${value.numerator}/${value.denominator}`;
}

function carrierKey(coefficient: ExactScalar, offset: MathJson) {
  return `${exactScalarKey(coefficient)}|${JSON.stringify(simplifyNode(offset))}`;
}

function exactScalarNode(value: ExactScalar): MathJson {
  return buildExactScalarNode(value) as MathJson;
}

function isZeroExact(value: ExactScalar) {
  return exactScalarIsZero(value);
}

function addNodes(nodes: MathJson[]) {
  const terms = nodes.filter((node) => node !== 0);
  if (terms.length === 0) {
    return 0;
  }
  if (terms.length === 1) {
    return terms[0];
  }
  return simplifyNode(['Add', ...terms] as MathJson);
}

function negateNode(node: MathJson) {
  if (typeof node === 'number') {
    return node === 0 ? 0 : -node;
  }
  if (isArrayNode(node) && node[0] === 'Negate') {
    return node[1] as MathJson;
  }
  return simplifyNode(['Negate', node] as MathJson);
}

function divideNode(numerator: MathJson, denominator: MathJson) {
  if (denominator === 1) {
    return numerator;
  }
  if (denominator === -1) {
    return negateNode(numerator);
  }
  return simplifyNode(['Divide', numerator, denominator] as MathJson);
}

function directSymbolicCarrierValue(
  exactConstant: ExactScalar,
  symbolicConstants: MathJson[],
  coefficient: ExactScalar,
) {
  const constantTerms = [
    ...(!isZeroExact(exactConstant) ? [exactScalarNode(exactConstant)] : []),
    ...symbolicConstants,
  ];
  const constant = addNodes(constantTerms);
  return divideNode(negateNode(constant), exactScalarNode(coefficient));
}

function exactScalarIsOne(value: ExactScalar) {
  return value.numerator === 1 && value.denominator === 1;
}

function exactScalarIsNegativeOne(value: ExactScalar) {
  return value.numerator === -1 && value.denominator === 1;
}

function addExactCoefficient(
  coefficients: Map<number, ExactScalar>,
  degree: number,
  coefficient: ExactScalar,
) {
  const previous = coefficients.get(degree) ?? EXACT_ZERO;
  coefficients.set(degree, addExactScalars(previous, coefficient));
}

function parsePositivePower(node: MathJson): { base: MathJson; exponent: number } | null {
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

function readAffineCarrierBase(node: MathJson, target: string): AffineCarrierBase | null {
  const simplified = simplifyNode(node);
  if (simplified === target) {
    return {
      base: simplified,
      coefficient: EXACT_ONE,
      offset: 0,
      key: carrierKey(EXACT_ONE, 0),
    };
  }

  const offsetTerms: MathJson[] = [];
  let coefficient = EXACT_ZERO;
  for (const term of splitTerms(simplified)) {
    if (!containsTarget(term, target)) {
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

  const offset = offsetTerms.length === 0 ? 0 : simplifyNode(['Add', ...offsetTerms] as MathJson);
  return {
    base: simplified,
    coefficient,
    offset,
    key: carrierKey(coefficient, offset),
  };
}

function readCarrierTerm(term: MathJson, target: string): CarrierTerm {
  const simplified = simplifyNode(term);
  if (isArrayNode(simplified) && simplified[0] === 'Negate') {
    const child = readCarrierTerm(simplified[1] as MathJson, target);
    if (child.kind === 'exact') {
      return { ...child, coefficient: negateExactScalar(child.coefficient) };
    }
    if (child.kind === 'exact-constant') {
      return { kind: 'exact-constant', coefficient: negateExactScalar(child.coefficient) };
    }
    if (child.kind === 'symbolic-constant') {
      return { kind: 'symbolic-constant', node: negateNode(child.node) };
    }
    return child;
  }

  const scalar = readExactScalarNode(simplified);
  if (scalar) {
    return { kind: 'exact-constant', coefficient: scalar };
  }

  const factors = isArrayNode(simplified) && simplified[0] === 'Multiply'
    ? simplified.slice(1) as MathJson[]
    : [simplified];
  let coefficient = EXACT_ONE;
  let carrierPower: { base: MathJson; exponent: number } | null = null;
  let hasTargetFreeCoefficient = false;

  for (const factor of factors) {
    const exact = readExactScalarNode(factor);
    if (exact) {
      coefficient = multiplyExactScalars(coefficient, exact);
      continue;
    }
    if (!containsTarget(factor, target)) {
      hasTargetFreeCoefficient = true;
      continue;
    }

    const power = parsePositivePower(factor);
    if (!power || carrierPower) {
      return { kind: 'unsupported-carrier' };
    }
    carrierPower = power;
  }

  if (!carrierPower) {
    return { kind: 'symbolic-constant', node: simplified };
  }

  const carrier = readAffineCarrierBase(carrierPower.base, target);
  if (!carrier) {
    return { kind: 'unsupported-carrier' };
  }
  return hasTargetFreeCoefficient
    ? { kind: 'symbolic-coefficient', exponent: carrierPower.exponent, carrier }
    : { kind: 'exact', coefficient, exponent: carrierPower.exponent, carrier };
}

export function collectCarrierSpecialForm(node: MathJson, target: string): CarrierCollectResult {
  const coefficients = new Map<number, ExactScalar>();
  const symbolicDegrees = new Set<number>();
  const symbolicConstants: MathJson[] = [];
  let carrier: AffineCarrierBase | null = null;
  let sawUnsupported = false;

  for (const term of splitTerms(node)) {
    const parsed = readCarrierTerm(term, target);
    if (parsed.kind === 'unsupported-carrier') {
      sawUnsupported = true;
      continue;
    }
    if (parsed.kind === 'symbolic-constant') {
      symbolicConstants.push(parsed.node);
      continue;
    }
    if (parsed.kind === 'exact-constant') {
      addExactCoefficient(coefficients, 0, parsed.coefficient);
      continue;
    }
    if (carrier && parsed.carrier.key !== carrier.key) {
      return { kind: 'unsupported-carrier' };
    }
    carrier = parsed.carrier;
    if (parsed.exponent > MAX_COMPLEX_SPECIAL_FORM_DEGREE) {
      return { kind: 'degree-limit' };
    }
    if (parsed.kind === 'symbolic-coefficient') {
      symbolicDegrees.add(parsed.exponent);
      continue;
    }
    addExactCoefficient(coefficients, parsed.exponent, parsed.coefficient);
  }

  if (!carrier) {
    return sawUnsupported ? { kind: 'unsupported-carrier' } : { kind: 'no-special-form' };
  }

  const positiveDegrees = [...coefficients.keys()]
    .filter((degree) => degree > 0 && !exactScalarIsZero(coefficients.get(degree) ?? EXACT_ZERO))
    .concat([...symbolicDegrees])
    .sort((left, right) => left - right);
  const totalDegree = positiveDegrees[positiveDegrees.length - 1] ?? 0;
  if (totalDegree > MAX_COMPLEX_SPECIAL_FORM_DEGREE) {
    return { kind: 'degree-limit' };
  }
  if (sawUnsupported) {
    return { kind: 'unsupported-carrier' };
  }
  const hasSymbolicCoefficient = symbolicDegrees.size > 0;
  const hasSymbolicConstant = symbolicConstants.length > 0;
  if ((hasSymbolicCoefficient || hasSymbolicConstant) && totalDegree <= 4) {
    return { kind: 'no-special-form' };
  }

  if (positiveDegrees.length === 1) {
    if (hasSymbolicCoefficient) {
      return { kind: 'symbolic-coefficients' };
    }
    const degree = positiveDegrees[0];
    const coefficient = coefficients.get(degree) ?? EXACT_ZERO;
    if (degree < 1 || exactScalarIsZero(coefficient)) {
      return { kind: 'no-special-form' };
    }
    if (hasSymbolicConstant) {
      return {
        kind: 'direct-symbolic',
        carrier,
        degree,
        carrierValue: directSymbolicCarrierValue(
          coefficients.get(0) ?? EXACT_ZERO,
          symbolicConstants,
          coefficient,
        ),
      };
    }
    const constant = coefficients.get(0) ?? EXACT_ZERO;
    const carrierValue = divideExactScalars(negateExactScalar(constant), coefficient);
    if (!carrierValue) {
      return { kind: 'unsupported-carrier' };
    }
    return {
      kind: 'direct',
      carrier,
      degree,
      carrierValue: exactScalarNode(carrierValue),
      carrierValueNumeric: exactScalarToNumber(carrierValue),
    };
  }

  if (positiveDegrees.length !== 2) {
    return { kind: 'no-special-form' };
  }

  const total = positiveDegrees[1];
  const carrierDegree = total / 2;
  if (
    total < 6
    || total % 2 !== 0
    || positiveDegrees[0] !== carrierDegree
  ) {
    return { kind: 'no-special-form' };
  }

  if (hasSymbolicCoefficient || hasSymbolicConstant) {
    return { kind: 'symbolic-coefficients' };
  }

  return {
    kind: 'quadratic',
    carrier,
    carrierDegree,
    totalDegree: total,
    quadratic: buildExactPolynomialFromCoefficients('u', [
      coefficients.get(total) ?? EXACT_ZERO,
      coefficients.get(carrierDegree) ?? EXACT_ZERO,
      coefficients.get(0) ?? EXACT_ZERO,
    ]),
  };
}

function subtractOffsetLatex(valueLatex: string, offset: MathJson) {
  const simplifiedOffset = simplifyNode(offset);
  if (simplifiedOffset === 0) {
    return valueLatex;
  }
  const offsetLatex = latexForNode(simplifiedOffset);
  return offsetLatex.startsWith('-')
    ? `${valueLatex}+${offsetLatex.slice(1)}`
    : `${valueLatex}-${offsetLatex}`;
}

export function solveAffineCarrierLatex(carrier: AffineCarrierBase, carrierValueLatex: string) {
  const numerator = subtractOffsetLatex(carrierValueLatex, carrier.offset);
  if (exactScalarIsOne(carrier.coefficient)) {
    return numerator;
  }
  if (exactScalarIsNegativeOne(carrier.coefficient)) {
    return `-\\left(${numerator}\\right)`;
  }
  return `\\frac{${numerator}}{${exactScalarToLatex(carrier.coefficient)}}`;
}
