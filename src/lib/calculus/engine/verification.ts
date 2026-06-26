import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  addExactPolynomials,
  exactPolynomialDegree,
  exactPolynomialIsZero,
  multiplyExactPolynomials,
} from '../../algebra/polynomial-core';
import { normalizeExactRationalFunctionNode } from '../../algebra/rational-function-core';
import { latexToApproxText } from '../../display/format';
import {
  areEquivalentNodes,
  differentiateAst,
} from '../../symbolic-engine/differentiation';
import { expandMathJsonNode } from '../../symbolic-engine/primitives/expansion/expansion';

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

function areExactlyEquivalentRationalFunctions(left: unknown, right: unknown, variable: string) {
  const leftRational = normalizeExactRationalFunctionNode(left, { variable, maxDegree: 16 });
  const rightRational = normalizeExactRationalFunctionNode(right, { variable, maxDegree: 16 });
  if (leftRational.kind === 'stop' || rightRational.kind === 'stop') {
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
    return false;
  }

  const difference = addExactPolynomials(leftCrossProduct, rightCrossProduct, -1);
  return exactPolynomialIsZero(difference);
}

function areExactlyEquivalent(left: unknown, right: unknown, variable: string) {
  if (areEquivalentNodes(left, right)) {
    return true;
  }

  if (areExactlyEquivalentRationalFunctions(left, right, variable)) {
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
  let derivativeLatex: string;

  try {
    const antiderivative = ce.parse(input.antiderivativeLatex);
    derivativeAst = differentiateAst(antiderivative.json, input.variable);
    derivativeLatex = ce.box(derivativeAst as Parameters<typeof ce.box>[0]).latex;
  } catch {
    return {
      status: 'not-checkable',
      reason: 'candidate antiderivative could not be parsed or differentiated',
    };
  }

  if (areExactlyEquivalent(derivativeAst, input.integrand, input.variable)) {
    return {
      status: 'verified-exact',
      derivativeLatex,
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
        derivativeLatex,
        samplesChecked,
        reason: 'numeric derivative spot check disagreed with the integrand',
      };
    }
  }

  if (samplesChecked < MIN_NUMERIC_SAMPLES) {
    return {
      status: 'not-checkable',
      derivativeLatex,
      samplesChecked,
      reason: 'not enough finite numeric sample points for confidence checking',
    };
  }

  return {
    status: 'verified-numeric-confidence',
    derivativeLatex,
    samplesChecked,
    reason: 'numeric spot checks matched; this is confidence, not symbolic proof',
  };
}
