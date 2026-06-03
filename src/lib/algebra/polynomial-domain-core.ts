import { ComputeEngine } from '@cortex-js/compute-engine';
import type { SolutionKind, SolveDomainConstraint } from '../../types/calculator';
import {
  assumptionFactsFromDomainConstraints,
  type AssumptionFact,
  type AssumptionFactScope,
  type AssumptionFactTrust,
} from './assumptions-core';
import {
  buildValueDomainMetadata,
  type ValueDomainMetadata,
} from './value-domain-core';
import {
  exactPolynomialCoefficientArray,
  exactPolynomialConstantTerm,
  exactPolynomialDegree,
  exactPolynomialLeadingCoefficient,
  exactPolynomialToLatex,
  exactPolynomialToNode,
  exactPolynomialIsZero,
  makeMonicExactPolynomial,
  normalizeExactPolynomial,
  parseExactPolynomial,
  primitiveExactPolynomial,
  quadraticDiscriminant,
  type ExactPolynomial,
  type ExactScalar,
} from './polynomial-core';
import {
  normalizeExactRationalFunctionNode,
  type ExactRationalFunction,
  type RationalFunctionStopReason,
} from './rational-function-core';

const ce = new ComputeEngine();
const DEFAULT_POLYNOMIAL_DOMAIN_MAX_DEGREE = 4;
const NUMERIC_CONSTANT_SYMBOLS = new Set(['Pi', 'ExponentialE']);

export type PolynomialDomainShape =
  | 'zero'
  | 'constant'
  | 'linear'
  | 'quadratic'
  | 'cubic'
  | 'quartic';

export type PolynomialDomainStopReason =
  | 'parse-failure'
  | 'non-polynomial'
  | 'multivariable'
  | 'degree-limit'
  | 'unsupported-coefficient'
  | 'zero-denominator';

export type PolynomialDomainOptions = {
  variable?: string;
  maxDegree?: number;
};

export type PolynomialDomainMetadata = {
  kind: 'polynomial';
  variable: string;
  degree: number;
  shape: PolynomialDomainShape;
  polynomial: ExactPolynomial;
  coefficients: readonly ExactScalar[];
  leadingCoefficient: ExactScalar;
  constantTerm: ExactScalar;
  node: unknown;
  latex: string;
  primitive?: {
    scalar: ExactScalar;
    polynomial: ExactPolynomial;
    latex: string;
  };
  monic?: {
    polynomial: ExactPolynomial;
    latex: string;
  };
  discriminant?: ExactScalar;
};

export type PolynomialDomainResult =
  | { kind: 'success'; metadata: PolynomialDomainMetadata }
  | { kind: 'stop'; reason: PolynomialDomainStopReason };

export type RationalDomainMetadata = {
  kind: 'rational';
  variable: string;
  rational: ExactRationalFunction;
  numerator: PolynomialDomainMetadata;
  denominator: PolynomialDomainMetadata;
  normalizedLatex: string;
  numeratorLatex: string;
  denominatorLatex?: string;
  domainConstraints: readonly SolveDomainConstraint[];
  assumptionFacts: readonly AssumptionFact[];
};

export type RationalDomainResult =
  | { kind: 'success'; metadata: RationalDomainMetadata }
  | { kind: 'stop'; reason: PolynomialDomainStopReason };

function maxDegree(options: PolynomialDomainOptions = {}) {
  return options.maxDegree ?? DEFAULT_POLYNOMIAL_DOMAIN_MAX_DEGREE;
}

function isArrayNode(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function containsParseError(node: unknown): boolean {
  if (!isArrayNode(node)) {
    return false;
  }
  if (node[0] === 'Error') {
    return true;
  }
  return node.slice(1).some(containsParseError);
}

function containsUnsupportedNumber(node: unknown): boolean {
  if (typeof node === 'number') {
    return !Number.isInteger(node);
  }
  if (!isArrayNode(node)) {
    return false;
  }
  return node.slice(1).some(containsUnsupportedNumber);
}

function collectVariables(node: unknown, variables = new Set<string>()) {
  if (typeof node === 'string') {
    if (!NUMERIC_CONSTANT_SYMBOLS.has(node)) {
      variables.add(node);
    }
    return variables;
  }
  if (!isArrayNode(node)) {
    return variables;
  }
  for (let index = 1; index < node.length; index += 1) {
    collectVariables(node[index], variables);
  }
  return variables;
}

function resolveVariable(node: unknown, options: PolynomialDomainOptions): string | null {
  if (options.variable) {
    return options.variable;
  }
  const variables = collectVariables(node);
  if (variables.size > 1) {
    return null;
  }
  return [...variables][0] ?? 'x';
}

function shapeForDegree(degree: number, polynomial: ExactPolynomial): PolynomialDomainShape {
  if (exactPolynomialIsZero(polynomial)) {
    return 'zero';
  }
  if (degree <= 0) {
    return 'constant';
  }
  if (degree === 1) {
    return 'linear';
  }
  if (degree === 2) {
    return 'quadratic';
  }
  if (degree === 3) {
    return 'cubic';
  }
  return 'quartic';
}

function metadataFromPolynomial(polynomial: ExactPolynomial): PolynomialDomainMetadata {
  const normalized = normalizeExactPolynomial(polynomial);
  const degree = exactPolynomialDegree(normalized);
  const node = exactPolynomialToNode(normalized);
  const primitive = primitiveExactPolynomial(normalized);
  const monic = makeMonicExactPolynomial(normalized);
  const discriminant = degree === 2 ? quadraticDiscriminant(normalized) ?? undefined : undefined;
  return {
    kind: 'polynomial',
    variable: normalized.variable,
    degree,
    shape: shapeForDegree(degree, normalized),
    polynomial: normalized,
    coefficients: exactPolynomialCoefficientArray(normalized),
    leadingCoefficient: exactPolynomialLeadingCoefficient(normalized),
    constantTerm: exactPolynomialConstantTerm(normalized),
    node,
    latex: exactPolynomialToLatex(normalized),
    primitive: primitive
      ? {
        ...primitive,
        latex: exactPolynomialToLatex(primitive.polynomial),
      }
      : undefined,
    monic: monic
      ? {
        polynomial: monic,
        latex: exactPolynomialToLatex(monic),
      }
      : undefined,
    discriminant,
  };
}

function mapRationalStop(reason: RationalFunctionStopReason): PolynomialDomainStopReason {
  switch (reason) {
    case 'multivariable':
    case 'variable-mismatch':
      return 'multivariable';
    case 'degree-limit':
    case 'factorization-degree-limit':
      return 'degree-limit';
    case 'zero-denominator':
      return 'zero-denominator';
    default:
      return 'non-polynomial';
  }
}

export function classifyPolynomialDomainNode(
  node: unknown,
  options: PolynomialDomainOptions = {},
): PolynomialDomainResult {
  if (containsParseError(node)) {
    return { kind: 'stop', reason: 'parse-failure' };
  }
  if (containsUnsupportedNumber(node)) {
    return { kind: 'stop', reason: 'unsupported-coefficient' };
  }

  const variables = collectVariables(node);
  const variable = resolveVariable(node, options);
  if (!variable || variables.size > 1 || (variables.size === 1 && !variables.has(variable))) {
    return { kind: 'stop', reason: 'multivariable' };
  }

  const degreeCap = maxDegree(options);
  const polynomial = parseExactPolynomial(node, variable, degreeCap);
  if (polynomial) {
    return {
      kind: 'success',
      metadata: metadataFromPolynomial(polynomial),
    };
  }

  const unbounded = parseExactPolynomial(node, variable, Math.max(degreeCap + 1, 16));
  return unbounded && exactPolynomialDegree(unbounded) > degreeCap
    ? { kind: 'stop', reason: 'degree-limit' }
    : { kind: 'stop', reason: 'non-polynomial' };
}

export function classifyPolynomialDomainLatex(
  latex: string,
  options: PolynomialDomainOptions = {},
): PolynomialDomainResult {
  try {
    return classifyPolynomialDomainNode(ce.parse(latex).json, options);
  } catch {
    return { kind: 'stop', reason: 'parse-failure' };
  }
}

function polynomialMetadataFromNormalizedRationalPart(
  polynomial: ExactPolynomial,
): PolynomialDomainMetadata {
  return metadataFromPolynomial(polynomial);
}

export function polynomialDomainFactsFromConstraints(
  constraints: readonly SolveDomainConstraint[],
  options: {
    scope?: AssumptionFactScope;
    trust?: AssumptionFactTrust;
  } = {},
) {
  return assumptionFactsFromDomainConstraints(constraints, {
    source: 'polynomial-domain-core',
    scope: options.scope ?? 'result',
    trust: options.trust ?? 'proved',
  });
}

export function classifyRationalDomainNode(
  node: unknown,
  options: PolynomialDomainOptions = {},
): RationalDomainResult {
  if (containsParseError(node)) {
    return { kind: 'stop', reason: 'parse-failure' };
  }
  if (containsUnsupportedNumber(node)) {
    return { kind: 'stop', reason: 'unsupported-coefficient' };
  }

  const rational = normalizeExactRationalFunctionNode(node, {
    variable: options.variable,
    maxDegree: maxDegree(options),
  });
  if (rational.kind === 'stop') {
    return {
      kind: 'stop',
      reason: mapRationalStop(rational.reason),
    };
  }

  const facts = polynomialDomainFactsFromConstraints(rational.exclusionConstraints);
  return {
    kind: 'success',
    metadata: {
      kind: 'rational',
      variable: rational.rational.variable,
      rational: rational.rational,
      numerator: polynomialMetadataFromNormalizedRationalPart(rational.rational.numerator),
      denominator: polynomialMetadataFromNormalizedRationalPart(rational.rational.denominator),
      normalizedLatex: rational.normalizedLatex,
      numeratorLatex: rational.numeratorLatex,
      denominatorLatex: rational.denominatorLatex,
      domainConstraints: rational.exclusionConstraints,
      assumptionFacts: facts,
    },
  };
}

export function classifyRationalDomainLatex(
  latex: string,
  options: PolynomialDomainOptions = {},
): RationalDomainResult {
  try {
    return classifyRationalDomainNode(ce.parse(latex).json, options);
  } catch {
    return { kind: 'stop', reason: 'parse-failure' };
  }
}

export function valueDomainMetadataFromPolynomialDomain(input: {
  solutionKind: SolutionKind;
  facts?: readonly AssumptionFact[];
}): ValueDomainMetadata {
  return buildValueDomainMetadata({
    answerDomain: input.solutionKind === 'inequality-solution-set' ? 'conditional-real' : 'real',
    solutionKind: input.solutionKind,
    facts: input.facts ?? [],
  });
}
