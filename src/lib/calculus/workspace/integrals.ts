import { ComputeEngine } from '@cortex-js/compute-engine';
import { integrateAdaptiveSimpson } from '../engine/adaptive-simpson';
import { formatApproxNumber, latexToApproxText, numberToLatex } from '../../display/format';
import { getResultGuardError } from '../../engine/result-guard';
import { canonicalizeMathInput } from '../../input/input-canonicalization';
import {
  checkPointRealDomain,
  type DomainConstraintViolation,
} from '../../algebra/domain-range-core';
import { buildAssumptionFact } from '../../algebra/assumptions-core';
import { mergeAssumptionDetailSections } from '../../algebra/assumption-readback';
import {
  evaluateDefiniteIntegralFromAst,
  resolveIndefiniteIntegralFromAst,
} from '../engine/integration';
import { presentCalculusIndefiniteEvaluation } from '../engine/indefinite-presentation';
import {
  integralVariableErrorMessage,
  normalizeIntegralVariableDraft,
} from './integral-variable';
import type { CalculusCoreEvaluation } from '../engine/shared';
import type {
  CalculusDefiniteIntegralState,
  CalculusImproperIntegralState,
  CalculusIndefiniteIntegralState,
} from '../../../types/calculator';

const ce = new ComputeEngine();
type BoxedLike = {
  latex: string;
  json: unknown;
  evaluate: () => BoxedLike;
  N?: () => BoxedLike;
  subs: (scope: Record<string, number>) => BoxedLike;
};

export type CalculusWorkspaceEvaluation = CalculusCoreEvaluation;

function box(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]) as BoxedLike;
}

function canonicalIntegralBodyLatex(bodyLatex: string) {
  const canonicalized = canonicalizeMathInput(bodyLatex, {
    mode: 'calculus',
    screenHint: 'indefinite-integral',
    liveAssist: true,
  });
  return canonicalized.ok ? canonicalized.canonicalLatex : bodyLatex;
}

function isNodeArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function normalizeTopLevelQuotientProduct(node: unknown): unknown {
  if (!isNodeArray(node) || node[0] !== 'Multiply') {
    return node;
  }

  const factors = node.slice(1);
  const divideFactors = factors.filter((factor) =>
    isNodeArray(factor) && factor[0] === 'Divide' && factor.length === 3,
  ) as unknown[][];
  if (divideFactors.length !== 1 || divideFactors[0].length !== 3) {
    return node;
  }

  const divideFactor = divideFactors[0];
  const otherFactors = factors.filter((factor) => factor !== divideFactor);
  if (otherFactors.length === 0) {
    return node;
  }

  const numerator = otherFactors.length === 1
    ? ['Multiply', otherFactors[0], divideFactor[1]]
    : ['Multiply', ...otherFactors, divideFactor[1]];
  return ['Divide', numerator, divideFactor[2]];
}

function parseIntegralBody(bodyLatex: string) {
  const canonicalBodyLatex = canonicalIntegralBodyLatex(bodyLatex);
  const parsed = ce.parse(canonicalBodyLatex) as BoxedLike;
  return {
    canonicalBodyLatex,
    body: normalizeTopLevelQuotientProduct(parsed.json),
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

  const approx = latexToApproxText(numeric.latex);
  if (!approx) {
    return undefined;
  }

  const parsed = Number(approx.replace(/\s+/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function evaluateAt(body: unknown, variable: string, value: number) {
  try {
    return boxedToFiniteNumber(box(body).subs({ [variable]: value }).evaluate());
  } catch {
    return undefined;
  }
}

const IMPROPER_EPSILON = 1e-8;

function improperEndpointDomainStop(
  violation: DomainConstraintViolation | null,
  value: number,
  label: string,
): CalculusWorkspaceEvaluation | undefined {
  if (!violation) {
    return undefined;
  }

  return {
    warnings: [],
    error: `This improper integral has a real-domain boundary at the ${label}; exact convergence classification is deferred in CALC-INT1.`,
    detailSections: mergeAssumptionDetailSections([{
      title: 'Interval Safety',
      lines: [
        `At x=${numberToLatex(value)}, ${violation.message}.`,
        'CALC-INT1 keeps broad improper convergence classification deferred instead of trusting a numeric endpoint singularity.',
      ],
    }], [buildAssumptionFact({
      kind: 'interval-hazard',
      source: 'domain-range-core',
      trust: 'blocked',
      scope: 'interval',
      expressionLatex: 'expressionLatex' in violation.constraint
        ? violation.constraint.expressionLatex
        : undefined,
      message: `${violation.message} at the ${label}.`,
    })]),
  };
}

function integrateHalfInfinite(
  body: unknown,
  variable: string,
  finiteBound: number,
  direction: 'pos' | 'neg',
  finiteEndpointLabel = direction === 'pos' ? 'lower endpoint' : 'upper endpoint',
) {
  const endpointStop = improperEndpointDomainStop(
    checkPointRealDomain({ node: body, variable, value: finiteBound }),
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
    const integrand = evaluateAt(body, variable, mapped);
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
    } satisfies CalculusWorkspaceEvaluation;
  }

  if (result.kind !== 'success') {
    return {
      warnings: [],
      error: 'This improper integral could not be evaluated reliably.',
    } satisfies CalculusWorkspaceEvaluation;
  }

  const guardError = getResultGuardError(numberToLatex(result.value), formatApproxNumber(result.value));
  if (guardError) {
    return { warnings: [], error: guardError } satisfies CalculusWorkspaceEvaluation;
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
  } satisfies CalculusWorkspaceEvaluation;
}

export function evaluateCalculusIndefiniteIntegral(
  state: CalculusIndefiniteIntegralState,
): CalculusWorkspaceEvaluation {
  const bodyLatex = state.bodyLatex.trim();
  const variable = normalizeIntegralVariableDraft(state.integrationVariable);
  if (!variable) {
    return {
      warnings: [],
      error: integralVariableErrorMessage(),
    };
  }

  if (!bodyLatex) {
    return {
      warnings: [],
      error: `Enter an integrand in ${variable.latex} before evaluating the integral.`,
    };
  }

  try {
    const integrand = parseIntegralBody(bodyLatex);
    const resolved = resolveIndefiniteIntegralFromAst({
      body: integrand.body,
      variable: variable.id,
      computeEngineFallback: () => {
        const parsed = ce.parse(`\\int ${integrand.canonicalBodyLatex}\\,d${variable.latex}`) as BoxedLike;
        const exact = parsed.evaluate();
        return {
          computed: exact,
          unresolved: exact.latex === parsed.latex || exact.latex.includes('\\int'),
        };
      },
      computeEngineOrigin: 'symbolic',
      unsupportedError: 'This antiderivative could not be determined symbolically in Calculus.',
    });
    return presentCalculusIndefiniteEvaluation(resolved, integrand.body, variable.id);
  } catch {
    return {
      warnings: [],
      error: 'This antiderivative could not be determined symbolically in Calculus.',
    };
  }
}

export function evaluateCalculusDefiniteIntegral(
  state: CalculusDefiniteIntegralState,
): CalculusWorkspaceEvaluation {
  const bodyLatex = state.bodyLatex.trim();
  const variable = normalizeIntegralVariableDraft(state.integrationVariable);
  if (!variable) {
    return {
      warnings: [],
      error: integralVariableErrorMessage(),
    };
  }
  const lower = Number(state.lower);
  const upper = Number(state.upper);
  if (!bodyLatex || !Number.isFinite(lower) || !Number.isFinite(upper)) {
    return {
      warnings: [],
      error: 'Definite integrals require numeric bounds in Calculus.',
    };
  }

  try {
    const integrand = parseIntegralBody(bodyLatex);
    return evaluateDefiniteIntegralFromAst({
      body: integrand.body,
      variable: variable.id,
      lower,
      upper,
      unreliableError: 'This definite integral could not be evaluated reliably in Calculus.',
    });
  } catch {
    return {
      warnings: [],
      error: 'This definite integral could not be evaluated reliably in Calculus.',
    };
  }
}

export function evaluateCalculusImproperIntegral(
  state: CalculusImproperIntegralState,
): CalculusWorkspaceEvaluation {
  const bodyLatex = state.bodyLatex.trim();
  const variable = normalizeIntegralVariableDraft(state.integrationVariable);
  if (!variable) {
    return {
      warnings: [],
      error: integralVariableErrorMessage(),
    };
  }
  if (!bodyLatex) {
    return {
      warnings: [],
      error: 'Enter an integrand before evaluating the improper integral.',
    };
  }

  let body: unknown;
  try {
    body = parseIntegralBody(bodyLatex).body;
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
      error: 'Improper integrals with these bounds are not supported in Calculus yet.',
    };
  }

  if (state.lowerKind === 'finite' && !Number.isFinite(lowerFinite)) {
    return {
      warnings: [],
      error: 'Improper integrals with these bounds are not supported in Calculus yet.',
    };
  }

  if (state.upperKind === 'finite' && !Number.isFinite(upperFinite)) {
    return {
      warnings: [],
      error: 'Improper integrals with these bounds are not supported in Calculus yet.',
    };
  }

  if (state.lowerKind === 'finite' && state.upperKind === 'posInfinity') {
    return integrateHalfInfinite(body, variable.id, lowerFinite, 'pos');
  }

  if (state.lowerKind === 'negInfinity' && state.upperKind === 'finite') {
    return integrateHalfInfinite(body, variable.id, upperFinite, 'neg');
  }

  const left = integrateHalfInfinite(body, variable.id, 0, 'neg', 'split point');
  if (left.error) {
    return left.error.includes('reliably')
      ? { warnings: [], error: 'This improper integral appears divergent.' }
      : left;
  }

  const right = integrateHalfInfinite(body, variable.id, 0, 'pos', 'split point');
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
