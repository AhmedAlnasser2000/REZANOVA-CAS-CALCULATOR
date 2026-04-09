import { ComputeEngine, expand } from '@cortex-js/compute-engine';
import {
  addExactScalars,
  buildExactScalarNode,
  divideExactScalars,
  exactPolynomialDegree,
  exactPolynomialToNode,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  negateExactScalar,
  normalizeExactScalar,
  parseExactPolynomial,
  readExactScalarNode,
  type ExactPolynomial,
  type ExactScalar,
} from '../polynomial-core';
import { factorBoundedPolynomialAst } from '../polynomial-factor-solve';
import { matchSupportedRationalPower } from '../radical-core';
import { normalizeAst } from './normalize';
import {
  compactRepeatedProductFactors,
  dependsOnVariable,
  flattenAdd,
  flattenMultiply,
  isNodeArray,
  termKey,
} from './patterns';

const ce = new ComputeEngine();
const NUMERIC_CONSTANT_SYMBOLS = new Set(['Pi', 'ExponentialE', 'ImaginaryUnit']);

type MixedCarrierCandidate = {
  variable: string;
  base: unknown;
  baseKey: string;
  denominator: number;
  carrierNode: unknown;
};

type MixedCarrierTerm = {
  coefficient: ExactScalar;
  degree: number;
};

export type MixedCarrierFactorization = {
  node: unknown;
  strategy: 'mixed-carrier-factorization';
  carrierNode: unknown;
  polynomialNode: unknown;
};

function collectVariableSymbols(node: unknown, result = new Set<string>()) {
  if (typeof node === 'string' && !NUMERIC_CONSTANT_SYMBOLS.has(node)) {
    result.add(node);
    return result;
  }

  if (!isNodeArray(node)) {
    return result;
  }

  node.forEach((child, index) => {
    if (index > 0) {
      collectVariableSymbols(child, result);
    }
  });

  return result;
}

function expandOnce(node: unknown) {
  const normalized = normalizeAst(node);
  try {
    return normalizeAst(
      (expand(ce.box(normalized as Parameters<typeof ce.box>[0]) as never) as { json: unknown }).json,
    );
  } catch {
    return normalized;
  }
}

function buildCarrierNode(base: unknown, denominator: number) {
  if (denominator === 2) {
    return normalizeAst(['Sqrt', base]);
  }

  return normalizeAst(['Power', base, ['Rational', 1, denominator]]);
}

function parsePositiveInteger(node: unknown) {
  const scalar = readExactScalarNode(node);
  if (!scalar || scalar.denominator !== 1 || scalar.numerator <= 0) {
    return null;
  }

  return scalar.numerator;
}

function buildCarrierPowerNode(candidate: MixedCarrierCandidate, degree: number): unknown {
  if (degree === 0) {
    return 1;
  }

  if (candidate.denominator === 2) {
    const integerExponent = Math.floor(degree / 2);
    const hasRadicalFactor = degree % 2 === 1;
    const parts: unknown[] = [];

    if (integerExponent > 0) {
      parts.push(integerExponent === 1 ? candidate.base : ['Power', candidate.base, integerExponent]);
    }

    if (hasRadicalFactor) {
      parts.push(candidate.carrierNode);
    }

    if (parts.length === 0) {
      return 1;
    }

    return parts.length === 1 ? parts[0] : normalizeAst(['Multiply', ...parts]);
  }

  const exponent = normalizeAst(buildExactScalarNode({ numerator: degree, denominator: candidate.denominator }));
  const exactExponent = readExactScalarNode(exponent);
  if (exactExponent?.denominator === 1) {
    return exactExponent.numerator === 1
      ? candidate.base
      : normalizeAst(['Power', candidate.base, exactExponent.numerator]);
  }

  return normalizeAst(['Power', candidate.base, exponent]);
}

function findCandidatePowers(node: unknown, variable: string) {
  const candidates = new Map<string, MixedCarrierCandidate>();

  const visit = (current: unknown) => {
    const normalized = normalizeAst(current);
    const matched = matchSupportedRationalPower(normalized, variable);
    if (matched && matched.denominator > 1) {
      const base = normalizeAst(matched.base);
      const key = `${termKey(base)}::${matched.denominator}`;
      if (!candidates.has(key)) {
        candidates.set(key, {
          variable,
          base,
          baseKey: termKey(base),
          denominator: matched.denominator,
          carrierNode: buildCarrierNode(base, matched.denominator),
        });
      }
    }

    if (!isNodeArray(normalized)) {
      return;
    }

    normalized.slice(1).forEach(visit);
  };

  visit(node);

  return [...candidates.values()];
}

function exactScalarIsZero(value: ExactScalar) {
  return normalizeExactScalar(value).numerator === 0;
}

function exactScalarIsOne(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return normalized.numerator === 1 && normalized.denominator === 1;
}

function greatestCommonDivisor(left: number, right: number) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1;
}

function leastCommonMultiple(left: number, right: number) {
  return Math.abs(left * right) / greatestCommonDivisor(left, right);
}

function positiveDivisors(value: number) {
  const absolute = Math.abs(value);
  if (absolute === 0) {
    return [0];
  }

  const divisors = new Set<number>();
  for (let candidate = 1; candidate <= absolute; candidate += 1) {
    if (absolute % candidate === 0) {
      divisors.add(candidate);
    }
  }
  return [...divisors];
}

function buildCoefficientArray(polynomial: ExactPolynomial) {
  const degree = exactPolynomialDegree(polynomial);
  return Array.from({ length: degree + 1 }, (_, index) =>
    getExactPolynomialCoefficient(polynomial, degree - index));
}

function evaluatePolynomialAtScalar(polynomial: ExactPolynomial, value: ExactScalar) {
  const coefficients = buildCoefficientArray(polynomial);
  let current = coefficients[0] ?? { numerator: 0, denominator: 1 };
  for (let index = 1; index < coefficients.length; index += 1) {
    current = addExactScalars(multiplyExactScalars(current, value), coefficients[index]);
  }
  return normalizeExactScalar(current);
}

function rationalRootCandidates(polynomial: ExactPolynomial) {
  const coefficients = buildCoefficientArray(polynomial).map((coefficient) => normalizeExactScalar(coefficient));
  const denominatorLcm = coefficients.reduce((current, coefficient) =>
    leastCommonMultiple(current, coefficient.denominator), 1);
  const integerCoefficients = coefficients.map((coefficient) =>
    coefficient.numerator * (denominatorLcm / coefficient.denominator));
  if (!integerCoefficients.every(Number.isInteger)) {
    return [] as ExactScalar[];
  }

  const leading = integerCoefficients[0] ?? 0;
  const constant = integerCoefficients[integerCoefficients.length - 1] ?? 0;
  if (leading === 0) {
    return [] as ExactScalar[];
  }

  const numerators = positiveDivisors(constant);
  const denominators = positiveDivisors(leading).filter((value) => value !== 0);
  const deduped = new Map<string, ExactScalar>();

  for (const numerator of numerators) {
    for (const denominator of denominators) {
      const signs = numerator === 0 ? [0] : [numerator, -numerator];
      for (const signedNumerator of signs) {
        const normalized = normalizeExactScalar({ numerator: signedNumerator, denominator });
        const key = `${normalized.numerator}/${normalized.denominator}`;
        if (!deduped.has(key)) {
          deduped.set(key, normalized);
        }
      }
    }
  }

  return [...deduped.values()];
}

function dividePolynomialByLinearFactor(polynomial: ExactPolynomial, root: ExactScalar) {
  const coefficients = buildCoefficientArray(polynomial);
  if (coefficients.length <= 1) {
    return null;
  }

  const quotientCoefficients: ExactScalar[] = [];
  let current = coefficients[0] ?? { numerator: 0, denominator: 1 };
  quotientCoefficients.push(current);

  for (let index = 1; index < coefficients.length - 1; index += 1) {
    current = addExactScalars(multiplyExactScalars(current, root), coefficients[index]);
    quotientCoefficients.push(current);
  }

  const remainder = addExactScalars(
    multiplyExactScalars(current, root),
    coefficients[coefficients.length - 1] ?? { numerator: 0, denominator: 1 },
  );

  const degree = exactPolynomialDegree(polynomial);
  const terms = new Map<number, ExactScalar>();
  quotientCoefficients.forEach((coefficient, index) => {
    const normalized = normalizeExactScalar(coefficient);
    const quotientDegree = degree - 1 - index;
    if (normalized.numerator !== 0) {
      terms.set(quotientDegree, normalized);
    }
  });

  return {
    quotient: {
      variable: polynomial.variable,
      terms,
    } satisfies ExactPolynomial,
    remainder: normalizeExactScalar(remainder),
  };
}

function buildLinearFactorNode(variable: string, root: ExactScalar) {
  return normalizeAst(['Add', variable, buildExactScalarNode(negateExactScalar(root))]);
}

function factorLowDegreeCarrierPolynomial(polynomial: ExactPolynomial): unknown | null {
  if (exactPolynomialDegree(polynomial) !== 2) {
    return null;
  }

  for (const root of rationalRootCandidates(polynomial)) {
    if (!exactScalarIsZero(evaluatePolynomialAtScalar(polynomial, root))) {
      continue;
    }

    const division = dividePolynomialByLinearFactor(polynomial, root);
    if (!division || !exactScalarIsZero(division.remainder)) {
      continue;
    }

    const quotientDegree = exactPolynomialDegree(division.quotient);
    if (quotientDegree !== 1) {
      continue;
    }

    const leading = getExactPolynomialCoefficient(division.quotient, 1);
    const constant = getExactPolynomialCoefficient(division.quotient, 0);
    const secondRoot = divideExactScalars(negateExactScalar(constant), leading);
    if (!secondRoot) {
      continue;
    }

    const parts: unknown[] = [];
    if (!exactScalarIsOne(leading)) {
      parts.push(buildExactScalarNode(leading));
    }
    parts.push(buildLinearFactorNode(polynomial.variable, root));
    parts.push(buildLinearFactorNode(polynomial.variable, secondRoot));

    return compactRepeatedProductFactors(
      normalizeAst(parts.length === 1 ? parts[0] : ['Multiply', ...parts]),
    );
  }

  return null;
}

function refineCarrierFactorizationNode(node: unknown, variable = 'u'): unknown {
  const normalized = normalizeAst(node);
  const polynomial = parseExactPolynomial(normalized, variable, 2);
  if (polynomial && exactPolynomialDegree(polynomial) === 2) {
    return factorLowDegreeCarrierPolynomial(polynomial) ?? normalized;
  }

  if (isNodeArray(normalized) && normalized[0] === 'Multiply') {
    return compactRepeatedProductFactors(
      normalizeAst(['Multiply', ...normalized.slice(1).map((factor) => refineCarrierFactorizationNode(factor, variable))]),
    );
  }

  return normalized;
}

function extractCarrierDegree(node: unknown, candidate: MixedCarrierCandidate): number | null {
  const normalized = normalizeAst(node);
  if (termKey(normalized) === candidate.baseKey) {
    return candidate.denominator;
  }

  if (
    isNodeArray(normalized)
    && normalized[0] === 'Power'
    && normalized.length === 3
    && termKey(normalizeAst(normalized[1])) === candidate.baseKey
  ) {
    const exponent = parsePositiveInteger(normalized[2]);
    if (exponent !== null) {
      return exponent * candidate.denominator;
    }
  }

  const matched = matchSupportedRationalPower(normalized, candidate.variable);
  if (
    matched
    && matched.denominator === candidate.denominator
    && termKey(normalizeAst(matched.base)) === candidate.baseKey
  ) {
    return matched.numerator;
  }

  return null;
}

function extractCarrierTerm(node: unknown, candidate: MixedCarrierCandidate): MixedCarrierTerm | null {
  const normalized = normalizeAst(node);
  const scalar = readExactScalarNode(normalized);
  if (scalar) {
    return { coefficient: scalar, degree: 0 };
  }

  if (!dependsOnVariable(normalized, candidate.variable)) {
    return null;
  }

  const directDegree = extractCarrierDegree(normalized, candidate);
  if (directDegree !== null) {
    return {
      coefficient: { numerator: 1, denominator: 1 },
      degree: directDegree,
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Negate' && normalized.length === 2) {
    const child = extractCarrierTerm(normalized[1], candidate);
    return child
      ? {
          coefficient: { numerator: -child.coefficient.numerator, denominator: child.coefficient.denominator },
          degree: child.degree,
        }
      : null;
  }

  if (isNodeArray(normalized) && normalized[0] === 'Divide' && normalized.length === 3) {
    const numerator = extractCarrierTerm(normalized[1], candidate);
    const denominator = readExactScalarNode(normalized[2]);
    if (!numerator || !denominator) {
      return null;
    }

    return {
      coefficient: {
        numerator: numerator.coefficient.numerator * denominator.denominator,
        denominator: numerator.coefficient.denominator * denominator.numerator,
      },
      degree: numerator.degree,
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Multiply') {
    let coefficient: ExactScalar = { numerator: 1, denominator: 1 };
    let degree = 0;

    for (const factor of flattenMultiply(normalized)) {
      const factorScalar = readExactScalarNode(factor);
      if (factorScalar) {
        coefficient = multiplyExactScalars(coefficient, factorScalar);
        continue;
      }

      const factorTerm = extractCarrierTerm(factor, candidate);
      if (!factorTerm) {
        return null;
      }

      coefficient = multiplyExactScalars(coefficient, factorTerm.coefficient);
      degree += factorTerm.degree;
    }

    return { coefficient, degree };
  }

  return null;
}

function buildCarrierPolynomial(node: unknown, candidate: MixedCarrierCandidate): ExactPolynomial | null {
  const expanded = expandOnce(node);
  const terms = flattenAdd(expanded);
  const polynomialTerms = new Map<number, ExactScalar>();
  let sawCarrierDegree = false;

  for (const term of terms) {
    const parsed = extractCarrierTerm(term, candidate);
    if (!parsed || parsed.degree < 0 || parsed.degree > 4) {
      return null;
    }

    if (parsed.degree > 0) {
      sawCarrierDegree = true;
    }

    const current = polynomialTerms.get(parsed.degree);
    const next = current ? addExactScalars(current, parsed.coefficient) : parsed.coefficient;
    if (next.numerator === 0) {
      polynomialTerms.delete(parsed.degree);
    } else {
      polynomialTerms.set(parsed.degree, next);
    }
  }

  if (!sawCarrierDegree) {
    return null;
  }

  return {
    variable: 'u',
    terms: polynomialTerms,
  };
}

function mapCarrierVariable(node: unknown, candidate: MixedCarrierCandidate): unknown {
  if (node === 'u') {
    return candidate.carrierNode;
  }

  if (
    isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && node[1] === 'u'
  ) {
    const exponent = parsePositiveInteger(node[2]);
    if (exponent !== null) {
      return buildCarrierPowerNode(candidate, exponent);
    }
  }

  if (!isNodeArray(node)) {
    return node;
  }

  return [node[0], ...node.slice(1).map((child) => mapCarrierVariable(child, candidate))];
}

function isRecognizedMixedFamily(polynomial: ExactPolynomial, candidate: MixedCarrierCandidate) {
  if (polynomial.terms.size === 0) {
    return false;
  }

  return [...polynomial.terms.keys()].some((degree) =>
    degree > 0 && degree % candidate.denominator !== 0);
}

export function factorMixedCarrierAst(ast: unknown): MixedCarrierFactorization | null {
  const variables = [...collectVariableSymbols(ast)];
  if (variables.length !== 1) {
    return null;
  }

  const variable = variables[0];
  const expanded = expandOnce(ast);
  const candidates = findCandidatePowers(expanded, variable);
  if (candidates.length === 0) {
    return null;
  }

  for (const candidate of candidates) {
    const polynomial = buildCarrierPolynomial(expanded, candidate);
    if (!polynomial || !isRecognizedMixedFamily(polynomial, candidate)) {
      continue;
    }

    const polynomialNode = exactPolynomialToNode(polynomial);
    const lowDegreeFactorization = factorLowDegreeCarrierPolynomial(polynomial);
    const factorizedPolynomialNode = lowDegreeFactorization
      ?? (() => {
        const bounded = factorBoundedPolynomialAst(polynomialNode, 'u');
        return bounded ? refineCarrierFactorizationNode(bounded.factorizedNode, 'u') : null;
      })();
    if (!factorizedPolynomialNode) {
      continue;
    }

    const mapped = mapCarrierVariable(factorizedPolynomialNode, candidate);
    const compacted = compactRepeatedProductFactors(normalizeAst(mapped));
    if (termKey(compacted) === termKey(normalizeAst(ast))) {
      continue;
    }

    return {
      node: compacted,
      strategy: 'mixed-carrier-factorization',
      carrierNode: candidate.carrierNode,
      polynomialNode,
    };
  }

  return null;
}
