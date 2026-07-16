import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  addExactPolynomials,
  buildExactPolynomialFromCoefficients,
  exactPolynomialDegree,
  exactPolynomialIsZero,
  multiplyExactPolynomials,
  parseExactPolynomial,
  type ExactPolynomial,
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
import {
  dependsOnVariable,
  flattenAdd,
  flattenMultiply,
  isNodeArray,
} from '../../symbolic-engine/patterns';
import { areRawExactRationalFunctionsEquivalent } from './exact-rational-equivalence';
import {
  normalizeTrigSinCosPowerIdentityPair,
  normalizeTrigTanSecCotCscPowerIdentityPair,
} from './trig-power-normalization';
import { normalizeTrigProductIdentityPair } from './trig-product-equivalence';
import { normalizeTrigSquareIdentityPair } from './trig-square-equivalence';
import { simplifyExactScalarRadicalProducts } from './radical-equivalence';
import { simplifyMathJsonNodeOrOriginal } from '../../symbolic-engine/primitives/simplification/simplification';

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

function tryTrigProductIdentityEquivalence(
  left: unknown,
  right: unknown,
  variable: string,
  context?: ExactEquivalenceContext,
) {
  const normalized = normalizeTrigProductIdentityPair(left, right, variable);
  if (!normalized) {
    return false;
  }
  const { left: normalizedLeft, right: normalizedRight } = normalized;

  if (areEquivalentNodes(normalizedLeft, normalizedRight)) {
    return true;
  }

  return areExactlyEquivalentByZeroDifference(normalizedLeft, normalizedRight, variable, context);
}

function tryTrigSinCosPowerIdentityEquivalence(
  left: unknown,
  right: unknown,
  variable: string,
  context?: ExactEquivalenceContext,
) {
  const normalized = normalizeTrigSinCosPowerIdentityPair(left, right, variable);
  if (!normalized) {
    return false;
  }
  const { left: normalizedLeft, right: normalizedRight } = normalized;

  if (areEquivalentNodes(normalizedLeft, normalizedRight)) {
    return true;
  }

  return areExactlyEquivalentByZeroDifference(normalizedLeft, normalizedRight, variable, context);
}

function tryTrigTanSecCotCscPowerIdentityEquivalence(
  left: unknown,
  right: unknown,
  variable: string,
  context?: ExactEquivalenceContext,
) {
  const normalized = normalizeTrigTanSecCotCscPowerIdentityPair(left, right);
  if (!normalized) {
    return false;
  }
  const { left: normalizedLeft, right: normalizedRight } = normalized;

  if (areEquivalentNodes(normalizedLeft, normalizedRight)) {
    return true;
  }

  return areExactlyEquivalentByZeroDifference(normalizedLeft, normalizedRight, variable, context);
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

  if (tryTrigProductIdentityEquivalence(left, right, variable, context)) {
    return true;
  }

  if (tryTrigSinCosPowerIdentityEquivalence(left, right, variable, context)) {
    return true;
  }

  if (tryTrigTanSecCotCscPowerIdentityEquivalence(left, right, variable, context)) {
    return true;
  }

  const radicalSimplifiedLeft = simplifyExactScalarRadicalProducts(left, variable);
  const radicalSimplifiedRight = simplifyExactScalarRadicalProducts(right, variable);
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

function backcheckDerivativeAst(input: {
  derivativeAst: unknown;
  integrand: unknown;
  variable: string;
  samplePoints?: number[];
}): AntiderivativeBackcheck {
  let derivativeLatex: string | undefined;

  const getDerivativeLatex = () => {
    derivativeLatex ??= ce.box(input.derivativeAst as Parameters<typeof ce.box>[0]).latex;
    return derivativeLatex;
  };

  const exactContext = createExactEquivalenceContext();
  if (areExactlyEquivalent(input.derivativeAst, input.integrand, input.variable, exactContext)) {
    return {
      status: 'verified-exact',
    };
  }

  let samplesChecked = 0;
  for (const sample of input.samplePoints ?? DEFAULT_SAMPLE_POINTS) {
    const derivativeValue = evaluateNodeAt(input.derivativeAst, input.variable, sample);
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

function differentiateForCalculusBackcheck(node: unknown, variable: string): unknown {
  if (!dependsOnVariable(node, variable)) {
    return 0;
  }
  if (!isNodeArray(node) || node.length < 2) {
    return differentiateAst(node, variable);
  }

  if (node[0] === 'Add') {
    return simplifyMathJsonNodeOrOriginal([
      'Add',
      ...node.slice(1).map((term) => differentiateForCalculusBackcheck(term, variable)),
    ]);
  }
  if (node[0] === 'Subtract' && node.length === 3) {
    return simplifyMathJsonNodeOrOriginal([
      'Subtract',
      differentiateForCalculusBackcheck(node[1], variable),
      differentiateForCalculusBackcheck(node[2], variable),
    ]);
  }
  if (node[0] === 'Negate' && node.length === 2) {
    return simplifyMathJsonNodeOrOriginal([
      'Negate',
      differentiateForCalculusBackcheck(node[1], variable),
    ]);
  }
  if (
    node[0] === 'Divide'
    && node.length === 3
    && !dependsOnVariable(node[2], variable)
  ) {
    return simplifyMathJsonNodeOrOriginal([
      'Divide',
      differentiateForCalculusBackcheck(node[1], variable),
      node[2],
    ]);
  }
  if (node[0] === 'Multiply') {
    const factors = flattenMultiply(node);
    const dependentFactors = factors.filter((factor) => dependsOnVariable(factor, variable));
    if (dependentFactors.length === 1) {
      return simplifyMathJsonNodeOrOriginal([
        'Multiply',
        ...factors.filter((factor) => factor !== dependentFactors[0]),
        differentiateForCalculusBackcheck(dependentFactors[0], variable),
      ]);
    }
  }

  return differentiateAst(node, variable);
}

export function backcheckAntiderivativeAst(input: {
  antiderivative: unknown;
  integrand: unknown;
  variable: string;
  samplePoints?: number[];
}): AntiderivativeBackcheck {
  try {
    return backcheckDerivativeAst({
      derivativeAst: differentiateForCalculusBackcheck(input.antiderivative, input.variable),
      integrand: input.integrand,
      variable: input.variable,
      samplePoints: input.samplePoints,
    });
  } catch {
    return {
      status: 'not-checkable',
      reason: 'candidate antiderivative node could not be differentiated',
    };
  }
}

export function backcheckAntiderivative(input: {
  antiderivativeLatex: string;
  integrand: unknown;
  variable: string;
  samplePoints?: number[];
}): AntiderivativeBackcheck {
  try {
    const antiderivative = ce.parse(input.antiderivativeLatex);
    return backcheckDerivativeAst({
      derivativeAst: differentiateAst(antiderivative.json, input.variable),
      integrand: input.integrand,
      variable: input.variable,
      samplePoints: input.samplePoints,
    });
  } catch {
    return {
      status: 'not-checkable',
      reason: 'candidate antiderivative could not be parsed or differentiated',
    };
  }
}
