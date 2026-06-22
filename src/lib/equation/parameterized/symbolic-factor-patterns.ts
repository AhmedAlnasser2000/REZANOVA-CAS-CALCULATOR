import {
  buildExactScalarNode,
  readExactScalarNode,
  addExactScalars,
  exactScalarIsZero,
  multiplyExactScalars,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import {
  addSymbolicPolynomials,
  symbolicPolynomialDegree,
  symbolicPolynomialFromDegree,
  zeroSymbolicPolynomial,
} from './symbolic-polynomial';
import {
  createArithmeticHelpers,
  hasTarget,
  isArrayNode,
  isOneNode,
  isZeroNode,
  latexForNode,
  simplifyNode,
  type MathJson,
} from './math-json';

const EXACT_ZERO = { numerator: 0, denominator: 1 };
const EXACT_ONE = { numerator: 1, denominator: 1 };

const {
  addNodes,
  multiplyNodes,
  negateNode,
  squareNode,
  subtractNodes,
} = createArithmeticHelpers(simplifyNode);

export type SymbolicFactorPatternStopReason =
  | 'degree-limit'
  | 'unsupported-factor'
  | 'unsupported-expanded-polynomial';

export type SymbolicFactorPatternFactor = {
  node: MathJson;
  multiplicity: number;
  degree: number;
  latex: string;
};

export type SymbolicFactorPatternResult =
  | {
      kind: 'ok';
      factors: SymbolicFactorPatternFactor[];
      totalDegree: number;
      familyLines: string[];
    }
  | { kind: 'unsupported'; reason: SymbolicFactorPatternStopReason; message: string }
  | { kind: 'no-special-form' };

type AffineCarrierBase = {
  base: MathJson;
  coefficient: ExactScalar;
  offset: MathJson;
  key: string;
};

type CarrierMonomialTerm =
  | { kind: 'term'; degree: number; coefficient: MathJson; carrier: AffineCarrierBase | null }
  | { kind: 'unsupported'; message: string };

type SignedPowerTerm =
  | {
      kind: 'target-power';
      sign: 1 | -1;
      exponent: number;
      carrier: AffineCarrierBase;
    }
  | {
      kind: 'target-free-power';
      sign: 1 | -1;
      exponent: number;
      base: MathJson;
    }
  | { kind: 'unsupported' };

type CarrierTermFactor = {
  node: MathJson;
  carrierPower: { carrier: AffineCarrierBase; exponent: number } | null;
};

type GroupedCarrierTerm =
  | {
      kind: 'term';
      sign: 1 | -1;
      factors: CarrierTermFactor[];
    }
  | { kind: 'unsupported' };

function splitAdditiveTerms(node: MathJson): MathJson[] {
  if (isArrayNode(node) && node[0] === 'Add') {
    return node.slice(1) as MathJson[];
  }
  if (isArrayNode(node) && node[0] === 'Subtract' && node.length === 3) {
    return [node[1] as MathJson, negateNode(node[2] as MathJson)];
  }
  const simplified = simplifyNode(node);
  return isArrayNode(simplified) && simplified[0] === 'Add'
    ? simplified.slice(1) as MathJson[]
    : [simplified];
}

function exactScalarKey(value: ExactScalar) {
  return `${value.numerator}/${value.denominator}`;
}

function carrierKey(coefficient: ExactScalar, offset: MathJson) {
  return `${exactScalarKey(coefficient)}|${JSON.stringify(simplifyNode(offset))}`;
}

function nodeKey(node: MathJson) {
  return JSON.stringify(simplifyNode(node));
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
  return {
    base: simplified,
    coefficient,
    offset,
    key: carrierKey(coefficient, offset),
  };
}

function parsePowerFactor(node: MathJson): { base: MathJson; exponent: number } | null {
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

function readCarrierPowerFactor(node: MathJson, target: string): { carrier: AffineCarrierBase; exponent: number } | null {
  const power = parsePowerFactor(node);
  if (power) {
    const carrier = readAffineCarrierBase(power.base, target);
    return carrier ? { carrier, exponent: power.exponent } : null;
  }

  const carrier = readAffineCarrierBase(node, target);
  return carrier ? { carrier, exponent: 1 } : null;
}

function decomposeGroupedCarrierTerm(term: MathJson, target: string): GroupedCarrierTerm {
  if (isArrayNode(term) && term[0] === 'Negate') {
    const child = decomposeGroupedCarrierTerm(term[1] as MathJson, target);
    return child.kind === 'term' ? { ...child, sign: child.sign === 1 ? -1 : 1 } : child;
  }

  const rawFactors = isArrayNode(term) && term[0] === 'Multiply'
    ? term.slice(1) as MathJson[]
    : [term];
  const factors: CarrierTermFactor[] = [];

  for (const factor of rawFactors) {
    const carrierPower = hasTarget(factor, target)
      ? readCarrierPowerFactor(factor, target)
      : null;
    if (hasTarget(factor, target) && !carrierPower) {
      return { kind: 'unsupported' };
    }
    factors.push({ node: factor, carrierPower });
  }

  return { kind: 'term', sign: 1, factors };
}

function decomposeCarrierMonomialTerm(term: MathJson, target: string): CarrierMonomialTerm {
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
  let carrierPower: { carrier: AffineCarrierBase; exponent: number } | null = null;

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

  const coefficient = coefficientFactors.length === 0 ? 1 : multiplyNodes(...coefficientFactors);
  return {
    kind: 'term',
    degree: carrierPower?.exponent ?? 0,
    coefficient,
    carrier: carrierPower?.carrier ?? null,
  };
}

function carrierPowerNode(carrier: AffineCarrierBase, degree: number): MathJson {
  if (degree === 0) {
    return 1;
  }
  return degree === 1 ? carrier.base : ['Power', carrier.base, degree] as MathJson;
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

  return addNodes(
    xSquaredTerm,
    multiplyNodes(2, q, carrier.offset, target),
    squareNode(carrier.offset),
  );
}

function polynomialNodeForCarrier(
  terms: readonly MathJson[],
  carrier: AffineCarrierBase,
  target: string,
) {
  const nodes = terms
    .map((coefficient, degree) => ({ coefficient, degree }))
    .filter(({ coefficient }) => !isZeroNode(simplifyNode(coefficient)))
    .map(({ coefficient, degree }) => {
      if (degree === 0) {
        return coefficient;
      }
      const power = expandedCarrierPowerNode(carrier, degree, target);
      return isOneNode(simplifyNode(coefficient))
        ? power
        : multiplyNodes(coefficient, power);
    });

  return nodes.length === 0 ? 0 : addNodes(...nodes);
}

function buildGroupedResidualFactor(term: GroupedCarrierTerm & { kind: 'term' }, carrier: AffineCarrierBase, commonPower: number) {
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

function discoverSharedCarrierGroupingPattern(
  zeroForm: MathJson,
  target: string,
  maxTotalDegree: number,
): SymbolicFactorPatternResult {
  const terms = splitAdditiveTerms(zeroForm)
    .map((term) => decomposeGroupedCarrierTerm(term, target));
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
      const entry = carrierCounts.get(carrierPower.carrier.key) ?? {
        carrier: carrierPower.carrier,
        exponents: [],
      };
      entry.exponents.push(carrierPower.exponent);
      carrierCounts.set(carrierPower.carrier.key, entry);
      seenInTerm.add(carrierPower.carrier.key);
    }
    if (seenInTerm.size === 0) {
      return { kind: 'no-special-form' };
    }
  }

  const shared = [...carrierCounts.values()]
    .find((entry) => entry.exponents.length === terms.length);
  if (!shared) {
    return { kind: 'no-special-form' };
  }

  const commonPower = Math.min(...shared.exponents);
  if (commonPower <= 0) {
    return { kind: 'no-special-form' };
  }

  const residualNode = addNodes(...terms.map((term) =>
    term.kind === 'term'
      ? buildGroupedResidualFactor(term, shared.carrier, commonPower)
      : 0));
  const residualDegree = carrierPolynomialDegree(residualNode, target);
  if (residualDegree.kind === 'unsupported' || residualDegree.degree < 1 || residualDegree.degree > 2) {
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

  const carrierLatex = latexForNode(shared.carrier.base);
  return {
    kind: 'ok',
    totalDegree,
    factors: [
      {
        node: shared.carrier.base,
        multiplicity: commonPower,
        degree: 1,
        latex: carrierLatex,
      },
      {
        node: residualNode,
        multiplicity: 1,
        degree: residualDegree.degree,
        latex: latexForNode(residualNode),
      },
    ],
    familyLines: [
      `Detected a symbolic factor-by-grouping pattern with shared carrier ${carrierLatex}.`,
      `Delegated the grouped residual degree-${residualDegree.degree} target factor through the existing selected-target solvers.`,
      `Total selected-target degree: ${totalDegree}.`,
    ],
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
  const scalarIndex = factors.findIndex((factor) => {
    const scalar = readExactScalarNode(factor);
    return scalar !== null && Math.abs(scalar.numerator) === 2 && scalar.denominator === 1;
  });
  if (scalarIndex >= 0) {
    const scalar = readExactScalarNode(factors[scalarIndex]);
    if (scalar) {
      const rest = factors.filter((_, index) => index !== scalarIndex);
      const base = rest.length === 0 ? 1 : multiplyNodes(...rest);
      const signedBase = scalar.numerator < 0 ? negateNode(base) : base;
      candidates.push([signedBase, signedBase]);
    }
  }

  return candidates;
}

function productMatches(left: MathJson, right: MathJson, product: MathJson) {
  return nodeKey(multiplyNodes(left, right)) === nodeKey(product);
}

function factorCarrierQuadratic(
  terms: readonly MathJson[],
): Array<{ factors: [MathJson, MathJson]; repeated: boolean }> {
  const leading = simplifyNode(terms[2]);
  if (!isOneNode(leading)) {
    return [];
  }

  const linear = terms[1];
  const constant = terms[0];
  if (isZeroNode(simplifyNode(linear)) || isZeroNode(simplifyNode(constant))) {
    return [];
  }

  return splitLinearCoefficientCandidates(linear)
    .filter(([left, right]) => productMatches(left, right, constant))
    .map(([left, right]) => ({
      factors: [left, right],
      repeated: nodeKey(left) === nodeKey(right),
    }));
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

  const factored = factorCarrierQuadratic(coefficients);
  if (factored.length === 0) {
    return { kind: 'no-special-form' };
  }

  const [first] = factored;
  const carrierLatex = latexForNode(carrier.base);
  const leftFactor = addNodes(carrier.base, first.factors[0]);
  const rightFactor = addNodes(carrier.base, first.factors[1]);
  const factors: SymbolicFactorPatternFactor[] = first.repeated
    ? [{
      node: leftFactor,
      multiplicity: 2,
      degree: 1,
      latex: latexForNode(leftFactor),
    }]
    : [
      {
        node: leftFactor,
        multiplicity: 1,
        degree: 1,
        latex: latexForNode(leftFactor),
      },
      {
        node: rightFactor,
        multiplicity: 1,
        degree: 1,
        latex: latexForNode(rightFactor),
      },
    ];

  return {
    kind: 'ok',
    totalDegree: 2,
    factors,
    familyLines: [
      `Detected a symbolic grouped carrier quadratic in ${carrierLatex}.`,
      'Factored the carrier quadratic into supported linear selected-target factors.',
      'Total selected-target degree: 2.',
    ],
  };
}

function discoverCommonCarrierPowerFactor(
  zeroForm: MathJson,
  target: string,
  maxTotalDegree: number,
): SymbolicFactorPatternResult {
  const monomials: Array<{ degree: number; coefficient: MathJson; carrier: AffineCarrierBase }> = [];
  let carrier: AffineCarrierBase | null = null;
  for (const term of splitAdditiveTerms(zeroForm)) {
    const monomial = decomposeCarrierMonomialTerm(term, target);
    if (monomial.kind === 'unsupported') {
      return { kind: 'unsupported', reason: 'unsupported-factor', message: monomial.message };
    }
    if (isZeroNode(simplifyNode(monomial.coefficient))) {
      continue;
    }
    const monomialCarrier = monomial.carrier;
    if (!monomialCarrier || monomial.degree <= 0) {
      return { kind: 'no-special-form' };
    }
    if (carrier && monomialCarrier.key !== carrier.key) {
      return { kind: 'no-special-form' };
    }
    carrier = monomialCarrier;
    monomials.push({ ...monomial, carrier: monomialCarrier });
  }

  if (!carrier || monomials.length === 0) {
    return { kind: 'no-special-form' };
  }

  const degrees = monomials.map((monomial) => monomial.degree);
  const totalDegree = Math.max(...degrees);
  if (totalDegree > maxTotalDegree) {
    return {
      kind: 'unsupported',
      reason: 'degree-limit',
      message: `Symbolic factor discovery is capped at target degree ${maxTotalDegree}.`,
    };
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

  let residual = zeroSymbolicPolynomial();
  for (const monomial of monomials) {
    residual = addSymbolicPolynomials(
      residual,
      symbolicPolynomialFromDegree(monomial.degree - commonPower, monomial.coefficient),
    );
  }

  const collectedResidualDegree = symbolicPolynomialDegree(residual);
  if (collectedResidualDegree < 1) {
    return { kind: 'no-special-form' };
  }

  const residualNode = polynomialNodeForCarrier(residual.terms, carrier, target);
  const carrierLatex = latexForNode(carrier.base);
  return {
    kind: 'ok',
    totalDegree,
    factors: [
      {
        node: carrier.base,
        multiplicity: commonPower,
        degree: 1,
        latex: carrierLatex,
      },
      {
        node: residualNode,
        multiplicity: 1,
        degree: collectedResidualDegree,
        latex: latexForNode(residualNode),
      },
    ],
    familyLines: [
      `Detected a symbolic common ${carrierLatex}-power factor of multiplicity ${commonPower}.`,
      `Delegated the residual degree-${collectedResidualDegree} target factor through the existing selected-target solvers.`,
      `Total selected-target degree: ${totalDegree}.`,
    ],
  };
}

function readSignedPowerTerm(
  term: MathJson,
  target: string,
  sign: 1 | -1 = 1,
): SignedPowerTerm {
  const simplified = simplifyNode(term);
  if (isArrayNode(simplified) && simplified[0] === 'Negate') {
    return readSignedPowerTerm(simplified[1] as MathJson, target, sign === 1 ? -1 : 1);
  }

  const power = parsePowerFactor(simplified);
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
  const targetPower = parsed.find((term): term is Extract<SignedPowerTerm, { kind: 'target-power' }> =>
    term.kind === 'target-power');
  const targetFreePower = parsed.find((term): term is Extract<SignedPowerTerm, { kind: 'target-free-power' }> =>
    term.kind === 'target-free-power');
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

  const difference = subtractNodes(targetPower.carrier.base, targetFreePower.base);
  const factors: SymbolicFactorPatternFactor[] = [{
    node: difference,
    multiplicity: 1,
    degree: 1,
    latex: latexForNode(difference),
  }];

  if (exponent % 2 === 0) {
    const sum = addNodes(targetPower.carrier.base, targetFreePower.base);
    factors.push({
      node: sum,
      multiplicity: 1,
      degree: 1,
      latex: latexForNode(sum),
    });
  }

  const carrierLatex = latexForNode(targetPower.carrier.base);
  const valueLatex = latexForNode(targetFreePower.base);
  return {
    kind: 'ok',
    totalDegree: exponent,
    factors,
    familyLines: [
      `Detected the real difference-of-powers pattern ${carrierLatex}^{${exponent}}=${valueLatex}^{${exponent}}.`,
      exponent % 2 === 0
        ? `Solved the real branches ${carrierLatex}=${valueLatex} and ${carrierLatex}=-${valueLatex}.`
        : `Solved the real branch ${carrierLatex}=${valueLatex}.`,
      `Total selected-target degree: ${exponent}.`,
    ],
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
