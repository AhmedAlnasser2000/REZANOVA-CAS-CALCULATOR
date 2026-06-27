import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  addExactPolynomials,
  buildExactScalarNode,
  buildExactPolynomialFromCoefficients,
  divideExactScalars,
  exactPolynomialDegree,
  exactPolynomialIsZero,
  exactScalarIsZero,
  multiplyExactScalars,
  multiplyExactPolynomials,
  parseExactPolynomial,
  readExactScalarNode,
  type ExactPolynomial,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import {
  normalizeExactRationalFunctionNode,
  type ExactRationalFunctionResult,
} from '../../algebra/rational-function-core';
import { latexToApproxText } from '../../display/format';
import {
  areEquivalentNodes,
  differentiateAst,
} from '../../symbolic-engine/differentiation';
import { expandMathJsonNode } from '../../symbolic-engine/primitives/expansion/expansion';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { flattenAdd, flattenMultiply, isNodeArray } from '../../symbolic-engine/patterns';
import { areRawExactRationalFunctionsEquivalent } from './exact-rational-equivalence';
import { normalizeTrigSquareIdentityPair } from './trig-square-equivalence';

const ce = new ComputeEngine();
const DEFAULT_SAMPLE_POINTS = [-0.75, -0.5, -0.25, 0.25, 0.5, 0.75, 1.25, 2.25];
const MIN_NUMERIC_SAMPLES = 3;
const NUMERIC_TOLERANCE = 1e-6;
const EXACT_EXPANSION_EQUIVALENCE_LIMITS = {
  maxPower: 32,
  maxExpandedTerms: 128,
  maxNodeCount: 1200,
};

export type AntiderivativeBackcheckStatus =
  | 'verified-exact'
  | 'verified-numeric-confidence'
  | 'not-verified'
  | 'not-checkable';

export type AntiderivativeBackcheck = {
  status: AntiderivativeBackcheckStatus;
  derivativeLatex?: string;
  samplesChecked?: number;
  reason?: string;
};

type BoxedLike = {
  latex: string;
  json: unknown;
  evaluate: () => BoxedLike;
  N?: () => BoxedLike;
  subs: (scope: Record<string, number>) => BoxedLike;
};

type ExactEquivalenceContext = {
  rationalNormalizationCache: Map<string, ExactRationalFunctionResult>;
  rationalEquivalenceCache: Map<string, boolean>;
};

function createExactEquivalenceContext(): ExactEquivalenceContext {
  return {
    rationalNormalizationCache: new Map(),
    rationalEquivalenceCache: new Map(),
  };
}

function boxedToFiniteNumber(expr: BoxedLike) {
  const numeric = expr.N?.() ?? expr.evaluate();

  if (typeof numeric.json === 'number' && Number.isFinite(numeric.json)) {
    return numeric.json;
  }

  if (
    typeof numeric.json === 'object'
    && numeric.json !== null
    && 'num' in numeric.json
    && typeof numeric.json.num === 'string'
  ) {
    const parsed = Number(numeric.json.num);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  const text = latexToApproxText(numeric.latex);
  if (!text) {
    return undefined;
  }

  const value = Number(text.replace(/\s+/g, ''));
  return Number.isFinite(value) ? value : undefined;
}

function evaluateNodeAt(node: unknown, variable: string, value: number) {
  try {
    const numeric = (ce.box(node as Parameters<typeof ce.box>[0]) as BoxedLike)
      .subs({ [variable]: value })
      .evaluate();
    return boxedToFiniteNumber(numeric);
  } catch {
    return undefined;
  }
}

function valuesClose(left: number, right: number) {
  const scale = Math.max(1, Math.abs(left), Math.abs(right));
  return Math.abs(left - right) <= NUMERIC_TOLERANCE * scale;
}

function stableNodeKey(node: unknown) {
  return JSON.stringify(node);
}

function cachedRationalNormalization(
  node: unknown,
  variable: string,
  context?: ExactEquivalenceContext,
) {
  if (!context) {
    return normalizeExactRationalFunctionNode(node, { variable, maxDegree: 16 });
  }

  const key = `${variable}:16:${stableNodeKey(node)}`;
  const cached = context.rationalNormalizationCache.get(key);
  if (cached) {
    return cached;
  }

  const normalized = normalizeExactRationalFunctionNode(node, { variable, maxDegree: 16 });
  context.rationalNormalizationCache.set(key, normalized);
  return normalized;
}

function areExactlyEquivalentRationalFunctions(
  left: unknown,
  right: unknown,
  variable: string,
  context?: ExactEquivalenceContext,
) {
  const leftKey = stableNodeKey(left);
  const rightKey = stableNodeKey(right);
  const pairKey = `${variable}:16:${leftKey}===${rightKey}`;
  const reversePairKey = `${variable}:16:${rightKey}===${leftKey}`;
  if (context) {
    const cached = context.rationalEquivalenceCache.get(pairKey)
      ?? context.rationalEquivalenceCache.get(reversePairKey);
    if (cached !== undefined) {
      return cached;
    }
  }

  const rawEquivalent = areRawExactRationalFunctionsEquivalent(left, right, variable);
  if (rawEquivalent !== undefined) {
    context?.rationalEquivalenceCache.set(pairKey, rawEquivalent);
    return rawEquivalent;
  }

  const leftRational = cachedRationalNormalization(left, variable, context);
  const rightRational = cachedRationalNormalization(right, variable, context);
  if (leftRational.kind === 'stop' || rightRational.kind === 'stop') {
    context?.rationalEquivalenceCache.set(pairKey, false);
    return false;
  }

  const maxProductDegree = Math.max(
    exactPolynomialDegree(leftRational.rational.numerator)
      + exactPolynomialDegree(rightRational.rational.denominator),
    exactPolynomialDegree(rightRational.rational.numerator)
      + exactPolynomialDegree(leftRational.rational.denominator),
  );
  const leftCrossProduct = multiplyExactPolynomials(
    leftRational.rational.numerator,
    rightRational.rational.denominator,
    maxProductDegree,
  );
  const rightCrossProduct = multiplyExactPolynomials(
    rightRational.rational.numerator,
    leftRational.rational.denominator,
    maxProductDegree,
  );
  if (!leftCrossProduct || !rightCrossProduct) {
    context?.rationalEquivalenceCache.set(pairKey, false);
    return false;
  }

  const difference = addExactPolynomials(leftCrossProduct, rightCrossProduct, -1);
  const equivalent = exactPolynomialIsZero(difference);
  context?.rationalEquivalenceCache.set(pairKey, equivalent);
  return equivalent;
}

function parseExpandedExactPolynomial(node: unknown, variable: string, maxDegree: number) {
  const direct = parseExactPolynomial(node, variable, maxDegree);
  if (direct) {
    return direct;
  }

  const expanded = expandMathJsonNode(node, EXACT_EXPANSION_EQUIVALENCE_LIMITS);
  return expanded.kind === 'ok'
    ? parseExactPolynomial(expanded.node, variable, maxDegree)
    : null;
}

function signedAddTerms(node: unknown, sign: 1 | -1 = 1): Array<{ node: unknown; sign: 1 | -1 }> {
  const normalized = normalizeAst(node);

  if (isNodeArray(normalized) && normalized[0] === 'Add') {
    return flattenAdd(normalized).flatMap((term) => signedAddTerms(term, sign));
  }

  if (isNodeArray(normalized) && normalized[0] === 'Subtract') {
    const [first, ...rest] = normalized.slice(1);
    return [
      ...(first === undefined ? [] : signedAddTerms(first, sign)),
      ...rest.flatMap((term) => signedAddTerms(term, sign === 1 ? -1 : 1)),
    ];
  }

  if (isNodeArray(normalized) && normalized[0] === 'Negate' && normalized.length === 2) {
    return signedAddTerms(normalized[1], sign === 1 ? -1 : 1);
  }

  return [{ node: normalized, sign }];
}

function basisKey(node: unknown) {
  return JSON.stringify(normalizeAst(node));
}

function isSupportedExactBasis(node: unknown) {
  return isNodeArray(node)
    && node.length === 2
    && (node[0] === 'Ln' || node[0] === 'Log');
}

function splitPolynomialBasisTerm(
  node: unknown,
  sign: 1 | -1,
  variable: string,
  maxDegree: number,
): { basis: unknown; coefficient: ExactPolynomial } | undefined {
  const factors = flattenMultiply(normalizeAst(node));
  const basisFactors = factors.filter(isSupportedExactBasis);
  if (basisFactors.length !== 1) {
    return undefined;
  }

  let coefficient = buildExactPolynomialFromCoefficients(
    variable,
    [{ numerator: sign, denominator: 1 }],
  );
  for (const factor of factors) {
    if (factor === basisFactors[0]) {
      continue;
    }
    const parsed = parseExpandedExactPolynomial(factor, variable, maxDegree);
    if (!parsed) {
      return undefined;
    }
    const product = multiplyExactPolynomials(coefficient, parsed, maxDegree);
    if (!product) {
      return undefined;
    }
    coefficient = product;
  }

  return { basis: basisFactors[0], coefficient };
}

function signedTermNode({ node, sign }: { node: unknown; sign: 1 | -1 }) {
  return sign === 1 ? node : ['Negate', node];
}

function exactZeroRemainder(
  terms: Array<{ node: unknown; sign: 1 | -1 }>,
  variable: string,
  context?: ExactEquivalenceContext,
) {
  if (terms.length === 0) {
    return true;
  }

  const remainder = normalizeAst(['Add', ...terms.map(signedTermNode)]);
  if (areEquivalentNodes(remainder, 0) || areExactlyEquivalentRationalFunctions(remainder, 0, variable, context)) {
    return true;
  }

  const expanded = expandMathJsonNode(remainder, EXACT_EXPANSION_EQUIVALENCE_LIMITS);
  return expanded.kind === 'ok' && (
    areEquivalentNodes(expanded.node, 0)
    || areExactlyEquivalentRationalFunctions(expanded.node, 0, variable, context)
  );
}

function areExactlyEquivalentByPolynomialBasisCancellation(
  left: unknown,
  right: unknown,
  variable: string,
  context?: ExactEquivalenceContext,
) {
  const terms = signedAddTerms(normalizeAst(['Add', left, ['Negate', right]]));
  const grouped = new Map<string, ExactPolynomial>();
  const remainder: Array<{ node: unknown; sign: 1 | -1 }> = [];
  let sawBasisTerm = false;

  for (const term of terms) {
    const split = splitPolynomialBasisTerm(
      term.node,
      term.sign,
      variable,
      EXACT_EXPANSION_EQUIVALENCE_LIMITS.maxPower,
    );
    if (!split) {
      remainder.push(term);
      continue;
    }

    sawBasisTerm = true;
    const key = basisKey(split.basis);
    const current = grouped.get(key);
    grouped.set(
      key,
      current ? addExactPolynomials(current, split.coefficient) : split.coefficient,
    );
  }

  return sawBasisTerm
    && [...grouped.values()].every(exactPolynomialIsZero)
    && exactZeroRemainder(remainder, variable, context);
}

function areExactlyEquivalentByZeroDifference(
  left: unknown,
  right: unknown,
  variable: string,
  context?: ExactEquivalenceContext,
) {
  const difference = normalizeAst(['Add', left, ['Negate', right]]);
  if (areEquivalentNodes(difference, 0) || areExactlyEquivalentRationalFunctions(difference, 0, variable, context)) {
    return true;
  }

  if (areExactlyEquivalentByPolynomialBasisCancellation(left, right, variable, context)) {
    return true;
  }

  const expanded = expandMathJsonNode(difference, EXACT_EXPANSION_EQUIVALENCE_LIMITS);
  if (expanded.kind === 'ok' && areEquivalentNodes(expanded.node, 0)) {
    return true;
  }

  try {
    const evaluated = ce.box(difference as Parameters<typeof ce.box>[0]).evaluate().json;
    if (areEquivalentNodes(evaluated, 0) || areExactlyEquivalentRationalFunctions(evaluated, 0, variable, context)) {
      return true;
    }
  } catch {
    // Continue to numeric confidence checks in the caller.
  }

  return false;
}

function tryTrigSquareIdentityEquivalence(
  left: unknown,
  right: unknown,
  variable: string,
  context?: ExactEquivalenceContext,
) {
  const normalized = normalizeTrigSquareIdentityPair(left, right);
  if (!normalized) {
    return false;
  }
  const { left: normalizedLeft, right: normalizedRight } = normalized;

  if (areEquivalentNodes(normalizedLeft, normalizedRight)) {
    return true;
  }

  if (areExactlyEquivalentByZeroDifference(normalizedLeft, normalizedRight, variable, context)) {
    return true;
  }

  try {
    const evaluatedLeft = ce.box(normalizedLeft as Parameters<typeof ce.box>[0]).evaluate().json;
    const evaluatedRight = ce.box(normalizedRight as Parameters<typeof ce.box>[0]).evaluate().json;
    return areEquivalentNodes(evaluatedLeft, evaluatedRight)
      || areExactlyEquivalentByZeroDifference(evaluatedLeft, evaluatedRight, variable, context);
  } catch {
    return false;
  }
}

function exactScalarSquare(value: ExactScalar) {
  return multiplyExactScalars(value, value);
}

type RadicalScalar = {
  rational: ExactScalar;
  radicals: Map<string, { value: ExactScalar; count: number }>;
};

function exactScalarKey(value: ExactScalar) {
  return `${value.numerator}/${value.denominator}`;
}

function oneRadicalScalar(): RadicalScalar {
  return {
    rational: { numerator: 1, denominator: 1 },
    radicals: new Map(),
  };
}

function combineRadicalScalar(
  left: RadicalScalar,
  right: RadicalScalar,
  sign: 1 | -1,
): RadicalScalar | undefined {
  const rational = sign === 1
    ? multiplyExactScalars(left.rational, right.rational)
    : divideExactScalars(left.rational, right.rational);
  if (!rational) {
    return undefined;
  }

  const radicals = new Map(left.radicals);
  for (const [key, radical] of right.radicals.entries()) {
    const current = radicals.get(key);
    radicals.set(key, {
      value: radical.value,
      count: (current?.count ?? 0) + sign * radical.count,
    });
  }

  return { rational, radicals };
}

function decomposeRadicalScalar(node: unknown): RadicalScalar | undefined {
  const scalar = readExactScalarNode(node);
  if (scalar) {
    return { rational: scalar, radicals: new Map() };
  }

  if (!Array.isArray(node) || node.length === 0) {
    return undefined;
  }

  if (node[0] === 'Sqrt' && node.length === 2) {
    const radicand = readExactScalarNode(node[1]);
    if (!radicand || radicand.numerator < 0) {
      return undefined;
    }
    return {
      rational: { numerator: 1, denominator: 1 },
      radicals: new Map([[exactScalarKey(radicand), { value: radicand, count: 1 }]]),
    };
  }

  if (node[0] === 'Divide' && node.length === 3) {
    const numerator = decomposeRadicalScalar(node[1]);
    const denominator = decomposeRadicalScalar(node[2]);
    return numerator && denominator
      ? combineRadicalScalar(numerator, denominator, -1)
      : undefined;
  }

  if (node[0] === 'Multiply' && node.length > 1) {
    return node.slice(1).reduce<RadicalScalar | undefined>((current, child) => {
      if (!current) {
        return undefined;
      }
      const childScalar = decomposeRadicalScalar(child);
      return childScalar ? combineRadicalScalar(current, childScalar, 1) : undefined;
    }, oneRadicalScalar());
  }

  return undefined;
}

function radicalScalarToNode(input: RadicalScalar): unknown {
  let rational = input.rational;
  const numeratorRadicals: unknown[] = [];
  const denominatorRadicals: unknown[] = [];

  for (const radical of input.radicals.values()) {
    let count = radical.count;
    while (count >= 2) {
      rational = multiplyExactScalars(rational, radical.value);
      count -= 2;
    }
    while (count <= -2) {
      rational = divideExactScalars(rational, radical.value) ?? rational;
      count += 2;
    }
    if (count === 1) {
      numeratorRadicals.push(['Sqrt', buildExactScalarNode(radical.value)]);
    } else if (count === -1) {
      denominatorRadicals.push(['Sqrt', buildExactScalarNode(radical.value)]);
    }
  }

  const numeratorFactors = [
    ...(rational.numerator === rational.denominator ? [] : [buildExactScalarNode(rational)]),
    ...numeratorRadicals,
  ];
  const numerator = numeratorFactors.length === 0
    ? 1
    : numeratorFactors.length === 1
      ? numeratorFactors[0]
      : normalizeAst(['Multiply', ...numeratorFactors]);

  if (denominatorRadicals.length === 0) {
    return numerator;
  }

  const denominator = denominatorRadicals.length === 1
    ? denominatorRadicals[0]
    : normalizeAst(['Multiply', ...denominatorRadicals]);
  return normalizeAst(['Divide', numerator, denominator]);
}

function exactScalarFromSquaredConstant(node: unknown): ExactScalar | undefined {
  const scalar = readExactScalarNode(node);
  if (scalar) {
    return exactScalarSquare(scalar);
  }

  if (!Array.isArray(node) || node.length === 0) {
    return undefined;
  }

  if (node[0] === 'Sqrt' && node.length === 2) {
    const radicand = readExactScalarNode(node[1]);
    return radicand && radicand.numerator >= 0 ? radicand : undefined;
  }

  if (node[0] === 'Divide' && node.length === 3) {
    const numerator = exactScalarFromSquaredConstant(node[1]);
    const denominator = exactScalarFromSquaredConstant(node[2]);
    return numerator && denominator && !exactScalarIsZero(denominator)
      ? divideExactScalars(numerator, denominator) ?? undefined
      : undefined;
  }

  if (node[0] === 'Multiply' && node.length > 1) {
    return node.slice(1).reduce<ExactScalar | undefined>((current, child) => {
      if (!current) {
        return undefined;
      }
      const childSquare = exactScalarFromSquaredConstant(child);
      return childSquare ? multiplyExactScalars(current, childSquare) : undefined;
    }, { numerator: 1, denominator: 1 });
  }

  return undefined;
}

function simplifySquaredProduct(base: unknown): unknown {
  if (!Array.isArray(base) || base.length === 0) {
    return ['Power', base, 2];
  }

  if (base[0] === 'Divide' && base.length === 3) {
    return normalizeAst([
      'Divide',
      simplifySquaredProduct(base[1]),
      simplifySquaredProduct(base[2]),
    ]);
  }

  if (base[0] !== 'Multiply' || base.length <= 1) {
    return ['Power', base, 2];
  }

  const squaredFactors = base.slice(1).map((factor) => {
    const squaredConstant = exactScalarFromSquaredConstant(factor);
    return squaredConstant
      ? buildExactScalarNode(squaredConstant)
      : ['Power', factor, 2];
  });

  return normalizeAst(['Multiply', ...squaredFactors]);
}

function simplifyExactScalarRadicalProducts(node: unknown): unknown {
  if (!Array.isArray(node) || node.length === 0) {
    return node;
  }

  const simplified = node.map((child, index) =>
    index === 0 ? child : simplifyExactScalarRadicalProducts(child));

  if (simplified[0] === 'Power' && simplified.length === 3) {
    const exponent = readExactScalarNode(simplified[2]);
    if (exponent?.numerator === 2 && exponent.denominator === 1) {
      const squaredConstant = exactScalarFromSquaredConstant(simplified[1]);
      return squaredConstant
        ? buildExactScalarNode(squaredConstant)
        : simplifySquaredProduct(simplified[1]);
    }
  }

  if (simplified[0] === 'Divide' && simplified.length === 3) {
    const numeratorScalar = decomposeRadicalScalar(simplified[1]);
    const denominatorScalar = decomposeRadicalScalar(simplified[2]);
    if (numeratorScalar && denominatorScalar) {
      const divided = combineRadicalScalar(numeratorScalar, denominatorScalar, -1);
      if (divided) {
        return radicalScalarToNode(divided);
      }
    }
    if (numeratorScalar && !denominatorScalar) {
      return normalizeAst([
        'Multiply',
        radicalScalarToNode(numeratorScalar),
        ['Divide', 1, simplified[2]],
      ]);
    }
    if (!numeratorScalar && denominatorScalar) {
      return normalizeAst([
        'Multiply',
        simplified[1],
        ['Divide', 1, radicalScalarToNode(denominatorScalar)],
      ]);
    }

    const numerator = readExactScalarNode(simplified[1]);
    const denominator = readExactScalarNode(simplified[2]);
    if (numerator && denominator && !exactScalarIsZero(denominator)) {
      const divided = divideExactScalars(numerator, denominator);
      if (divided) {
        return buildExactScalarNode(divided);
      }
    }
  }

  if (simplified[0] === 'Multiply' && simplified.length > 1) {
    const flatFactors = simplified.slice(1).flatMap((factor) =>
      Array.isArray(factor) && factor[0] === 'Multiply' ? factor.slice(1) : [factor]);
    let scalar = oneRadicalScalar();
    const remaining: unknown[] = [];
    for (const factor of flatFactors) {
      const factorScalar = decomposeRadicalScalar(factor);
      if (factorScalar) {
        const combined = combineRadicalScalar(scalar, factorScalar, 1);
        if (combined) {
          scalar = combined;
        }
      } else {
        remaining.push(factor);
      }
    }

    const scalarNode = radicalScalarToNode(scalar);
    const scalarValue = readExactScalarNode(scalarNode);
    const factors = [
      ...(scalarValue?.numerator === 1 && scalarValue.denominator === 1 ? [] : [scalarNode]),
      ...remaining,
    ];
    return factors.length === 0
      ? 1
      : factors.length === 1
        ? factors[0]
        : normalizeAst(['Multiply', ...factors]);
  }

  return normalizeAst(simplified);
}

function areExactlyEquivalent(
  left: unknown,
  right: unknown,
  variable: string,
  context?: ExactEquivalenceContext,
) {
  if (areEquivalentNodes(left, right)) {
    return true;
  }

  if (tryTrigSquareIdentityEquivalence(left, right, variable, context)) {
    return true;
  }

  const radicalSimplifiedLeft = simplifyExactScalarRadicalProducts(left);
  const radicalSimplifiedRight = simplifyExactScalarRadicalProducts(right);
  if (radicalSimplifiedLeft !== left || radicalSimplifiedRight !== right) {
    if (areEquivalentNodes(radicalSimplifiedLeft, radicalSimplifiedRight)) {
      return true;
    }

    if (areExactlyEquivalentRationalFunctions(
      radicalSimplifiedLeft,
      radicalSimplifiedRight,
      variable,
      context,
    )) {
      return true;
    }

    if (areExactlyEquivalentByZeroDifference(
      radicalSimplifiedLeft,
      radicalSimplifiedRight,
      variable,
      context,
    )) {
      return true;
    }
  }

  if (areExactlyEquivalentRationalFunctions(left, right, variable, context)) {
    return true;
  }

  if (areExactlyEquivalentByZeroDifference(left, right, variable, context)) {
    return true;
  }

  const expandedLeft = expandMathJsonNode(left, EXACT_EXPANSION_EQUIVALENCE_LIMITS);
  const expandedRight = expandMathJsonNode(right, EXACT_EXPANSION_EQUIVALENCE_LIMITS);
  if (
    expandedLeft.kind === 'ok'
    && expandedRight.kind === 'ok'
  ) {
    if (areEquivalentNodes(expandedLeft.node, expandedRight.node)) {
      return true;
    }

    try {
      const evaluatedExpandedLeft = ce.box(
        expandedLeft.node as Parameters<typeof ce.box>[0],
      ).evaluate().json;
      const evaluatedExpandedRight = ce.box(
        expandedRight.node as Parameters<typeof ce.box>[0],
      ).evaluate().json;
      if (areEquivalentNodes(evaluatedExpandedLeft, evaluatedExpandedRight)) {
        return true;
      }
    } catch {
      // Continue to the existing exact-evaluation attempt below.
    }
  }

  try {
    const evaluatedLeft = ce.box(left as Parameters<typeof ce.box>[0]).evaluate().json;
    const evaluatedRight = ce.box(right as Parameters<typeof ce.box>[0]).evaluate().json;
    return areEquivalentNodes(evaluatedLeft, evaluatedRight);
  } catch {
    return false;
  }
}

export function backcheckAntiderivative(input: {
  antiderivativeLatex: string;
  integrand: unknown;
  variable: string;
  samplePoints?: number[];
}): AntiderivativeBackcheck {
  let derivativeAst: unknown;
  let derivativeLatex: string | undefined;

  try {
    const antiderivative = ce.parse(input.antiderivativeLatex);
    derivativeAst = differentiateAst(antiderivative.json, input.variable);
  } catch {
    return {
      status: 'not-checkable',
      reason: 'candidate antiderivative could not be parsed or differentiated',
    };
  }

  const getDerivativeLatex = () => {
    derivativeLatex ??= ce.box(derivativeAst as Parameters<typeof ce.box>[0]).latex;
    return derivativeLatex;
  };

  const exactContext = createExactEquivalenceContext();
  if (areExactlyEquivalent(derivativeAst, input.integrand, input.variable, exactContext)) {
    return {
      status: 'verified-exact',
    };
  }

  let samplesChecked = 0;
  for (const sample of input.samplePoints ?? DEFAULT_SAMPLE_POINTS) {
    const derivativeValue = evaluateNodeAt(derivativeAst, input.variable, sample);
    const integrandValue = evaluateNodeAt(input.integrand, input.variable, sample);
    if (derivativeValue === undefined || integrandValue === undefined) {
      continue;
    }

    samplesChecked += 1;
    if (!valuesClose(derivativeValue, integrandValue)) {
      return {
        status: 'not-verified',
        derivativeLatex: getDerivativeLatex(),
        samplesChecked,
        reason: 'numeric derivative spot check disagreed with the integrand',
      };
    }
  }

  if (samplesChecked < MIN_NUMERIC_SAMPLES) {
    return {
      status: 'not-checkable',
      derivativeLatex: getDerivativeLatex(),
      samplesChecked,
      reason: 'not enough finite numeric sample points for confidence checking',
    };
  }

  return {
    status: 'verified-numeric-confidence',
    derivativeLatex: getDerivativeLatex(),
    samplesChecked,
    reason: 'numeric spot checks matched; this is confidence, not symbolic proof',
  };
}
