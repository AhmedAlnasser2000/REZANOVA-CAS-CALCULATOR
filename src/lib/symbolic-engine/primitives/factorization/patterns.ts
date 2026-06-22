import {
  addNodes,
  carrierPowerNode,
  decomposeCarrierMonomialTerm,
  decomposeGroupedCarrierTerm,
  hasTarget,
  isArrayNode,
  isOneNode,
  isZeroNode,
  multiplyNodes,
  negateNode,
  nodeKey,
  parsePositiveIntegerPower,
  polynomialNodeForCarrier,
  readAffineCarrierBase,
  simplifyNode,
  splitAdditiveTerms,
  subtractNodes,
  type AffineCarrierBase,
  type GroupedCarrierTerm,
  type MathJson,
} from './node-helpers';
import type {
  SymbolicFactorPatternFactor,
  SymbolicFactorPatternResult,
} from './types';

type SignedPowerTerm =
  | { kind: 'target-power'; sign: 1 | -1; exponent: number; carrier: AffineCarrierBase }
  | { kind: 'target-free-power'; sign: 1 | -1; exponent: number; base: MathJson }
  | { kind: 'unsupported' };

function carrierPolynomialDegree(
  node: MathJson,
  target: string,
): { kind: 'ok'; degree: number } | { kind: 'unsupported' } {
  let degree = 0;
  let carrier: AffineCarrierBase | null = null;
  for (const term of splitAdditiveTerms(node)) {
    const monomial = decomposeCarrierMonomialTerm(term, target);
    if (monomial.kind === 'unsupported') {
      return { kind: 'unsupported' };
    }
    if (monomial.carrier) {
      if (carrier && monomial.carrier.key !== carrier.key) {
        return { kind: 'unsupported' };
      }
      carrier = monomial.carrier;
    }
    degree = Math.max(degree, monomial.degree);
  }
  return { kind: 'ok', degree };
}

function buildGroupedResidualFactor(
  term: GroupedCarrierTerm & { kind: 'term' },
  carrier: AffineCarrierBase,
  commonPower: number,
) {
  const residualFactors: MathJson[] = [];
  let removed = false;
  for (const factor of term.factors) {
    const carrierPower = factor.carrierPower;
    if (!removed && carrierPower && carrierPower.carrier.key === carrier.key) {
      const remainingPower = carrierPower.exponent - commonPower;
      if (remainingPower > 0) {
        residualFactors.push(carrierPowerNode(carrier, remainingPower));
      }
      removed = true;
      continue;
    }
    residualFactors.push(factor.node);
  }
  const residual = residualFactors.length === 0 ? 1 : multiplyNodes(...residualFactors);
  return term.sign === 1 ? residual : negateNode(residual);
}

function discoverSharedCarrierGroupingPattern(
  zeroForm: MathJson,
  target: string,
  maxTotalDegree: number,
): SymbolicFactorPatternResult {
  const terms = splitAdditiveTerms(zeroForm).map((term) => decomposeGroupedCarrierTerm(term, target));
  if (terms.length < 2 || terms.some((term) => term.kind === 'unsupported')) {
    return { kind: 'no-special-form' };
  }

  const carrierCounts = new Map<string, { carrier: AffineCarrierBase; exponents: number[] }>();
  for (const term of terms) {
    if (term.kind !== 'term') {
      continue;
    }
    const seenInTerm = new Set<string>();
    for (const factor of term.factors) {
      const carrierPower = factor.carrierPower;
      if (!carrierPower) {
        continue;
      }
      const entry = carrierCounts.get(carrierPower.carrier.key) ?? { carrier: carrierPower.carrier, exponents: [] };
      entry.exponents.push(carrierPower.exponent);
      carrierCounts.set(carrierPower.carrier.key, entry);
      seenInTerm.add(carrierPower.carrier.key);
    }
    if (seenInTerm.size === 0) {
      return { kind: 'no-special-form' };
    }
  }

  const shared = [...carrierCounts.values()].find((entry) => entry.exponents.length === terms.length);
  if (!shared) {
    return { kind: 'no-special-form' };
  }

  const commonPower = Math.min(...shared.exponents);
  const residualNode = addNodes(...terms.map((term) =>
    term.kind === 'term' ? buildGroupedResidualFactor(term, shared.carrier, commonPower) : 0));
  const residualDegree = carrierPolynomialDegree(residualNode, target);
  if (commonPower <= 0 || residualDegree.kind === 'unsupported' || residualDegree.degree < 1 || residualDegree.degree > 2) {
    return { kind: 'no-special-form' };
  }

  const totalDegree = commonPower + residualDegree.degree;
  if (totalDegree > maxTotalDegree) {
    return {
      kind: 'unsupported',
      reason: 'degree-limit',
      message: `Symbolic factor-by-grouping discovery is capped at target degree ${maxTotalDegree}.`,
    };
  }

  return {
    kind: 'ok',
    totalDegree,
    factors: [
      { node: shared.carrier.base, multiplicity: commonPower, degree: 1 },
      { node: residualNode, multiplicity: 1, degree: residualDegree.degree },
    ],
    metadata: {
      pattern: 'shared-carrier-grouping',
      carrier: shared.carrier,
      commonPower,
      residualDegree: residualDegree.degree,
    },
  };
}

function splitLinearCoefficientCandidates(coefficient: MathJson): Array<[MathJson, MathJson]> {
  const simplified = simplifyNode(coefficient);
  const terms = splitAdditiveTerms(simplified);
  const candidates: Array<[MathJson, MathJson]> = [];
  if (terms.length === 2) {
    candidates.push([terms[0], terms[1]]);
  }

  const factors = isArrayNode(simplified) && simplified[0] === 'Multiply'
    ? simplified.slice(1) as MathJson[]
    : [simplified];
  const scalarIndex = factors.findIndex((factor) =>
    isArrayNode(factor)
      ? false
      : typeof factor === 'number' && Math.abs(factor) === 2);
  if (scalarIndex >= 0) {
    const rest = factors.filter((_, index) => index !== scalarIndex);
    const base = rest.length === 0 ? 1 : multiplyNodes(...rest);
    const signedBase = (factors[scalarIndex] as number) < 0 ? negateNode(base) : base;
    candidates.push([signedBase, signedBase]);
  }

  return candidates;
}

function productMatches(left: MathJson, right: MathJson, product: MathJson) {
  return nodeKey(multiplyNodes(left, right)) === nodeKey(product);
}

function factorCarrierQuadratic(terms: readonly MathJson[]) {
  if (!isOneNode(simplifyNode(terms[2])) || isZeroNode(simplifyNode(terms[1])) || isZeroNode(simplifyNode(terms[0]))) {
    return [];
  }
  return splitLinearCoefficientCandidates(terms[1])
    .filter(([left, right]) => productMatches(left, right, terms[0]))
    .map(([left, right]) => ({ factors: [left, right] as [MathJson, MathJson], repeated: nodeKey(left) === nodeKey(right) }));
}

function discoverCarrierQuadraticGroupingPattern(
  zeroForm: MathJson,
  target: string,
  maxTotalDegree: number,
): SymbolicFactorPatternResult {
  let carrier: AffineCarrierBase | null = null;
  const coefficients = [0, 0, 0] as [MathJson, MathJson, MathJson];

  for (const term of splitAdditiveTerms(zeroForm)) {
    const monomial = decomposeCarrierMonomialTerm(term, target);
    if (monomial.kind === 'unsupported') {
      return { kind: 'no-special-form' };
    }
    if (monomial.carrier) {
      if (carrier && monomial.carrier.key !== carrier.key) {
        return { kind: 'no-special-form' };
      }
      carrier = monomial.carrier;
    }
    if (monomial.degree > 2) {
      return { kind: 'no-special-form' };
    }
    coefficients[monomial.degree] = addNodes(coefficients[monomial.degree], monomial.coefficient);
  }

  if (!carrier || isZeroNode(simplifyNode(coefficients[2]))) {
    return { kind: 'no-special-form' };
  }
  if (maxTotalDegree < 2) {
    return {
      kind: 'unsupported',
      reason: 'degree-limit',
      message: `Symbolic carrier quadratic grouping is capped at target degree ${maxTotalDegree}.`,
    };
  }

  const [first] = factorCarrierQuadratic(coefficients);
  if (!first) {
    return { kind: 'no-special-form' };
  }
  const leftFactor = addNodes(carrier.base, first.factors[0]);
  const rightFactor = addNodes(carrier.base, first.factors[1]);
  const factors: SymbolicFactorPatternFactor[] = first.repeated
    ? [{ node: leftFactor, multiplicity: 2, degree: 1 }]
    : [
      { node: leftFactor, multiplicity: 1, degree: 1 },
      { node: rightFactor, multiplicity: 1, degree: 1 },
    ];

  return {
    kind: 'ok',
    totalDegree: 2,
    factors,
    metadata: { pattern: 'grouped-carrier-quadratic', carrier, repeated: first.repeated },
  };
}

function addCoefficient(coefficients: Map<number, MathJson>, degree: number, coefficient: MathJson) {
  coefficients.set(degree, addNodes(coefficients.get(degree) ?? 0, coefficient));
}

function coefficientArray(coefficients: Map<number, MathJson>) {
  const maxDegree = Math.max(0, ...coefficients.keys());
  return Array.from({ length: maxDegree + 1 }, (_, degree) => coefficients.get(degree) ?? 0);
}

function symbolicDegree(coefficients: Map<number, MathJson>) {
  return [...coefficients.entries()]
    .filter(([, coefficient]) => !isZeroNode(simplifyNode(coefficient)))
    .reduce((max, [degree]) => Math.max(max, degree), -1);
}

function discoverCommonCarrierPowerFactor(
  zeroForm: MathJson,
  target: string,
  maxTotalDegree: number,
): SymbolicFactorPatternResult {
  const monomials = [];
  let carrier: AffineCarrierBase | null = null;
  for (const term of splitAdditiveTerms(zeroForm)) {
    const monomial = decomposeCarrierMonomialTerm(term, target);
    if (monomial.kind === 'unsupported') {
      return { kind: 'unsupported', reason: 'unsupported-factor', message: monomial.message };
    }
    if (isZeroNode(simplifyNode(monomial.coefficient))) {
      continue;
    }
    if (!monomial.carrier || monomial.degree <= 0) {
      return { kind: 'no-special-form' };
    }
    if (carrier && monomial.carrier.key !== carrier.key) {
      return { kind: 'no-special-form' };
    }
    carrier = monomial.carrier;
    monomials.push({ ...monomial, carrier: monomial.carrier });
  }

  if (!carrier || monomials.length === 0) {
    return { kind: 'no-special-form' };
  }
  const degrees = monomials.map((monomial) => monomial.degree);
  const totalDegree = Math.max(...degrees);
  if (totalDegree > maxTotalDegree) {
    return { kind: 'unsupported', reason: 'degree-limit', message: `Symbolic factor discovery is capped at target degree ${maxTotalDegree}.` };
  }

  const commonPower = Math.min(...degrees);
  const residualDegree = totalDegree - commonPower;
  if (commonPower <= 0 || residualDegree < 1) {
    return { kind: 'no-special-form' };
  }
  if (residualDegree > 2) {
    return {
      kind: 'unsupported',
      reason: 'unsupported-expanded-polynomial',
      message: 'Symbolic common-factor discovery only delegates residual linear or quadratic factors.',
    };
  }

  const residual = new Map<number, MathJson>();
  for (const monomial of monomials) {
    addCoefficient(residual, monomial.degree - commonPower, monomial.coefficient);
  }
  const collectedResidualDegree = symbolicDegree(residual);
  if (collectedResidualDegree < 1) {
    return { kind: 'no-special-form' };
  }

  return {
    kind: 'ok',
    totalDegree,
    factors: [
      { node: carrier.base, multiplicity: commonPower, degree: 1 },
      { node: polynomialNodeForCarrier(coefficientArray(residual), carrier, target), multiplicity: 1, degree: collectedResidualDegree },
    ],
    metadata: { pattern: 'common-carrier-power', carrier, commonPower, residualDegree: collectedResidualDegree },
  };
}

function readSignedPowerTerm(term: MathJson, target: string, sign: 1 | -1 = 1): SignedPowerTerm {
  const simplified = simplifyNode(term);
  if (isArrayNode(simplified) && simplified[0] === 'Negate') {
    return readSignedPowerTerm(simplified[1] as MathJson, target, sign === 1 ? -1 : 1);
  }

  const power = parsePositiveIntegerPower(simplified);
  if (power) {
    if (hasTarget(power.base, target)) {
      const carrier = readAffineCarrierBase(power.base, target);
      return carrier ? { kind: 'target-power', sign, exponent: power.exponent, carrier } : { kind: 'unsupported' };
    }
    return { kind: 'target-free-power', sign, exponent: power.exponent, base: power.base };
  }

  if (hasTarget(simplified, target)) {
    const carrier = readAffineCarrierBase(simplified, target);
    return carrier ? { kind: 'target-power', sign, exponent: 1, carrier } : { kind: 'unsupported' };
  }
  return { kind: 'unsupported' };
}

function discoverDifferenceOfPowersPattern(
  zeroForm: MathJson,
  target: string,
  maxTotalDegree: number,
): SymbolicFactorPatternResult {
  const terms = splitAdditiveTerms(zeroForm);
  if (terms.length !== 2) {
    return { kind: 'no-special-form' };
  }

  const parsed = terms.map((term) => readSignedPowerTerm(term, target));
  const targetPower = parsed.find((term): term is Extract<SignedPowerTerm, { kind: 'target-power' }> => term.kind === 'target-power');
  const targetFreePower = parsed.find((term): term is Extract<SignedPowerTerm, { kind: 'target-free-power' }> => term.kind === 'target-free-power');
  if (!targetPower || !targetFreePower) {
    return parsed.some((term) => term.kind === 'unsupported' && hasTarget(terms[parsed.indexOf(term)], target))
      ? {
        kind: 'unsupported',
        reason: 'unsupported-factor',
        message: 'Difference-of-powers discovery requires a pure or affine selected-target carrier and a target-free matching power.',
      }
      : { kind: 'no-special-form' };
  }

  if (targetPower.sign === targetFreePower.sign || targetPower.exponent !== targetFreePower.exponent) {
    return { kind: 'no-special-form' };
  }
  const exponent = targetPower.exponent;
  if (exponent < 2) {
    return { kind: 'no-special-form' };
  }
  if (exponent > maxTotalDegree) {
    return {
      kind: 'unsupported',
      reason: 'degree-limit',
      message: `Symbolic difference-of-powers discovery is capped at target degree ${maxTotalDegree}.`,
    };
  }

  const factors = [{ node: subtractNodes(targetPower.carrier.base, targetFreePower.base), multiplicity: 1, degree: 1 }];
  if (exponent % 2 === 0) {
    factors.push({ node: addNodes(targetPower.carrier.base, targetFreePower.base), multiplicity: 1, degree: 1 });
  }

  return {
    kind: 'ok',
    totalDegree: exponent,
    factors,
    metadata: {
      pattern: 'difference-of-powers',
      carrier: targetPower.carrier,
      valueNode: targetFreePower.base,
      exponent,
      branchKind: exponent % 2 === 0 ? 'two-real' : 'single-real',
    },
  };
}

export function discoverSymbolicFactorPattern(
  zeroForm: MathJson,
  target: string,
  maxTotalDegree: number,
): SymbolicFactorPatternResult {
  const carrierQuadraticGrouping = discoverCarrierQuadraticGroupingPattern(zeroForm, target, maxTotalDegree);
  if (carrierQuadraticGrouping.kind !== 'no-special-form') {
    return carrierQuadraticGrouping;
  }

  const commonCarrier = discoverCommonCarrierPowerFactor(zeroForm, target, maxTotalDegree);
  if (commonCarrier.kind !== 'no-special-form') {
    if (commonCarrier.kind === 'unsupported') {
      const sharedGrouping = discoverSharedCarrierGroupingPattern(zeroForm, target, maxTotalDegree);
      return sharedGrouping.kind !== 'no-special-form' ? sharedGrouping : commonCarrier;
    }
    return commonCarrier;
  }

  const sharedGrouping = discoverSharedCarrierGroupingPattern(zeroForm, target, maxTotalDegree);
  if (sharedGrouping.kind !== 'no-special-form') {
    return sharedGrouping;
  }

  return discoverDifferenceOfPowersPattern(zeroForm, target, maxTotalDegree);
}
