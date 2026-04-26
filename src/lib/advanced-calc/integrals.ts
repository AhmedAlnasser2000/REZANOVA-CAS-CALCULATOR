import { ComputeEngine } from '@cortex-js/compute-engine';
import { integrateAdaptiveSimpson } from '../adaptive-simpson';
import { formatApproxNumber, latexToApproxText, numberToLatex } from '../format';
import { getResultGuardError } from '../result-guard';
import {
  checkPointRealDomain,
  type DomainConstraintViolation,
} from '../algebra/domain-range-core';
import {
  evaluateDefiniteIntegralFromAst,
  resolveIndefiniteIntegralFromAst,
  type CalculusCoreEvaluation,
} from '../calculus-core';
import type {
  AdvancedDefiniteIntegralState,
  AdvancedImproperIntegralState,
  AdvancedIndefiniteIntegralState,
} from '../../types/calculator';

const ce = new ComputeEngine();
type BoxedLike = {
  latex: string;
  json: unknown;
  evaluate: () => BoxedLike;
  N?: () => BoxedLike;
  subs: (scope: Record<string, number>) => BoxedLike;
};

export type AdvancedCalcEvaluation = CalculusCoreEvaluation;

function box(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]) as BoxedLike;
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

  const approx = latexToApproxText(numeric.latex);
  if (!approx) {
    return undefined;
  }

  const parsed = Number(approx.replace(/\s+/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function evaluateAt(body: unknown, value: number) {
  try {
    return boxedToFiniteNumber(box(body).subs({ x: value }).evaluate());
  } catch {
    return undefined;
  }
}

const IMPROPER_EPSILON = 1e-8;

function improperEndpointDomainStop(
  violation: DomainConstraintViolation | null,
  value: number,
  label: string,
): AdvancedCalcEvaluation | undefined {
  if (!violation) {
    return undefined;
  }

  return {
    warnings: [],
    error: `This improper integral has a real-domain boundary at the ${label}; exact convergence classification is deferred in CALC-INT1.`,
    detailSections: [{
      title: 'Interval Safety',
      lines: [
        `At x=${numberToLatex(value)}, ${violation.message}.`,
        'CALC-INT1 keeps broad improper convergence classification deferred instead of trusting a numeric endpoint singularity.',
      ],
    }],
  };
}

function integrateHalfInfinite(
  body: unknown,
  finiteBound: number,
  direction: 'pos' | 'neg',
  finiteEndpointLabel = direction === 'pos' ? 'lower endpoint' : 'upper endpoint',
) {
  const endpointStop = improperEndpointDomainStop(
    checkPointRealDomain({ node: body, value: finiteBound }),
    finiteBound,
    finiteEndpointLabel,
  );
  if (endpointStop) {
    return endpointStop;
  }

  const result = integrateAdaptiveSimpson((value) => {
    if (value >= 1) {
      return undefined;
    }

    const mapped =
      direction === 'pos'
        ? finiteBound + value / (1 - value)
        : finiteBound - value / (1 - value);
    const integrand = evaluateAt(body, mapped);
    if (integrand === undefined) {
      return undefined;
    }

    const jacobian = 1 / (1 - value) ** 2;
    return integrand * jacobian;
  }, 0, 1 - IMPROPER_EPSILON, { tolerance: 1e-7, maxDepth: 14 });

  if (result.kind === 'unsafe') {
    return {
      warnings: [],
      error: 'The numeric integral became too large or too small to display safely.',
    } satisfies AdvancedCalcEvaluation;
  }

  if (result.kind !== 'success') {
    return {
      warnings: [],
      error: 'This improper integral could not be evaluated reliably.',
    } satisfies AdvancedCalcEvaluation;
  }

  const guardError = getResultGuardError(numberToLatex(result.value), formatApproxNumber(result.value));
  if (guardError) {
    return { warnings: [], error: guardError } satisfies AdvancedCalcEvaluation;
  }

  return {
    exactLatex: numberToLatex(result.value),
    approxText: formatApproxNumber(result.value),
    warnings: ['Symbolic improper integral unavailable; showing a numeric improper integral.'],
    resultOrigin: 'numeric-fallback',
    detailSections: [{
      title: 'Integral Method',
      lines: [
        'The improper integral was transformed to a finite numeric interval.',
        'The result remains labeled as numeric fallback.',
      ],
    }],
  } satisfies AdvancedCalcEvaluation;
}

export function evaluateAdvancedIndefiniteIntegral(
  state: AdvancedIndefiniteIntegralState,
): AdvancedCalcEvaluation {
  const bodyLatex = state.bodyLatex.trim();
  if (!bodyLatex) {
    return {
      warnings: [],
      error: 'Enter an integrand in x before evaluating the integral.',
    };
  }

  try {
    const parsed = ce.parse(`\\int ${bodyLatex}\\,dx`) as BoxedLike;
    const integrand = ce.parse(bodyLatex) as BoxedLike;
    const exact = parsed.evaluate();
    const unresolvedComputeEngine = exact.latex === parsed.latex || exact.latex.includes('\\int');
    return resolveIndefiniteIntegralFromAst({
      body: integrand.json,
      variable: 'x',
      computed: exact,
      unresolvedComputeEngine,
      computeEngineOrigin: 'symbolic',
      unsupportedError: 'This antiderivative could not be determined symbolically in Advanced Calc.',
    });
  } catch {
    return {
      warnings: [],
      error: 'This antiderivative could not be determined symbolically in Advanced Calc.',
    };
  }
}

export function evaluateAdvancedDefiniteIntegral(
  state: AdvancedDefiniteIntegralState,
): AdvancedCalcEvaluation {
  const bodyLatex = state.bodyLatex.trim();
  const lower = Number(state.lower);
  const upper = Number(state.upper);
  if (!bodyLatex || !Number.isFinite(lower) || !Number.isFinite(upper)) {
    return {
      warnings: [],
      error: 'Definite integrals require numeric bounds in Advanced Calc.',
    };
  }

  try {
    const integrand = ce.parse(bodyLatex) as BoxedLike;
    return evaluateDefiniteIntegralFromAst({
      body: integrand.json,
      variable: 'x',
      lower,
      upper,
      unreliableError: 'This definite integral could not be evaluated reliably in Advanced Calc.',
    });
  } catch {
    return {
      warnings: [],
      error: 'This definite integral could not be evaluated reliably in Advanced Calc.',
    };
  }
}

export function evaluateAdvancedImproperIntegral(
  state: AdvancedImproperIntegralState,
): AdvancedCalcEvaluation {
  const bodyLatex = state.bodyLatex.trim();
  if (!bodyLatex) {
    return {
      warnings: [],
      error: 'Enter an integrand before evaluating the improper integral.',
    };
  }

  let body: unknown;
  try {
    body = ce.parse(bodyLatex).json;
  } catch {
    return {
      warnings: [],
      error: 'This improper integral could not be evaluated reliably.',
    };
  }
  const lowerFinite = Number(state.lower);
  const upperFinite = Number(state.upper);

  if (state.lowerKind === 'finite' && state.upperKind === 'finite') {
    return {
      warnings: [],
      error: 'Improper integrals with these bounds are not supported in Advanced Calc yet.',
    };
  }

  if (state.lowerKind === 'finite' && !Number.isFinite(lowerFinite)) {
    return {
      warnings: [],
      error: 'Improper integrals with these bounds are not supported in Advanced Calc yet.',
    };
  }

  if (state.upperKind === 'finite' && !Number.isFinite(upperFinite)) {
    return {
      warnings: [],
      error: 'Improper integrals with these bounds are not supported in Advanced Calc yet.',
    };
  }

  if (state.lowerKind === 'finite' && state.upperKind === 'posInfinity') {
    return integrateHalfInfinite(body, lowerFinite, 'pos');
  }

  if (state.lowerKind === 'negInfinity' && state.upperKind === 'finite') {
    return integrateHalfInfinite(body, upperFinite, 'neg');
  }

  const left = integrateHalfInfinite(body, 0, 'neg', 'split point');
  if (left.error) {
    return left.error.includes('reliably')
      ? { warnings: [], error: 'This improper integral appears divergent.' }
      : left;
  }

  const right = integrateHalfInfinite(body, 0, 'pos', 'split point');
  if (right.error) {
    return right.error.includes('reliably')
      ? { warnings: [], error: 'This improper integral appears divergent.' }
      : right;
  }

  const leftValue = Number(left.approxText);
  const rightValue = Number(right.approxText);
  if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) {
    return {
      warnings: [],
      error: 'This improper integral could not be evaluated reliably.',
    };
  }

  const total = leftValue + rightValue;
  const guardError = getResultGuardError(numberToLatex(total), formatApproxNumber(total));
  if (guardError) {
    return { warnings: [], error: guardError };
  }

  return {
    exactLatex: numberToLatex(total),
    approxText: formatApproxNumber(total),
    warnings: ['Symbolic improper integral unavailable; showing a numeric improper integral.'],
    resultOrigin: 'numeric-fallback',
    detailSections: [{
      title: 'Integral Method',
      lines: [
        'The two-sided improper integral was split at 0 and evaluated numerically on both tails.',
        'The result remains labeled as numeric fallback.',
      ],
    }],
  };
}
