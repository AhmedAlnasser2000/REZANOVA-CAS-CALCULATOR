import { ComputeEngine } from '@cortex-js/compute-engine';
import { latexToApproxText } from '../../display/format';
import { derivativeVariableLatex, derivativeVariableOrDefault } from '../derivative-target';
import { parseFiniteLimitTargetDraft } from '../engine/finite-limit-target';
import {
  evaluateFiniteLimitFromAst,
  evaluateInfiniteLimitFromAst,
} from '../engine/limits';
import { parseNaturalLimitRequest } from '../limit-request';
import type { CalculusCoreEvaluation } from '../engine/shared';
import type {
  CalculusFiniteLimitState,
  CalculusInfiniteLimitState,
  CalculusLimitState,
  LimitDirection,
} from '../../../types/calculator';

const ce = new ComputeEngine();

type BoxedLike = {
  latex: string;
  json: unknown;
  evaluate: () => BoxedLike;
  N?: () => BoxedLike;
};

export type AdvancedLimitEvaluation = CalculusCoreEvaluation;

function finiteTargetLabel(direction: LimitDirection) {
  return direction === 'left' ? 'Left-hand' : 'Right-hand';
}

export function evaluateCalculusFiniteLimit(
  state: CalculusFiniteLimitState,
): AdvancedLimitEvaluation {
  const bodyLatex = state.bodyLatex.trim();
  const parsedTarget = parseFiniteLimitTargetDraft(state.target);
  const variable = derivativeVariableOrDefault(state.variable);
  const variableLatex = derivativeVariableLatex(variable);
  if (!bodyLatex || !parsedTarget) {
    return {
      warnings: [],
      error: 'Limits require a numeric target or +/-infinity in this milestone.',
    };
  }
  const target = parsedTarget.value;
  const direction = parsedTarget.directionOverride ?? state.direction;

  try {
    const parsed = ce.parse(`\\lim_{${variableLatex}\\to ${target}}\\left(${bodyLatex}\\right)`) as BoxedLike;
    const body = ce.parse(bodyLatex) as BoxedLike;
    const exact = parsed.evaluate();
    if (exact.latex !== parsed.latex && !exact.latex.includes('\\lim')) {
      return {
        exactLatex: exact.latex,
        approxText: latexToApproxText((exact.N?.() ?? exact).latex),
        warnings: [],
        resultOrigin: 'symbolic',
      };
    }

    return evaluateFiniteLimitFromAst({
      body: body.json,
      variable,
      target,
      direction,
      messages: {
        mismatchError: 'Left and right behavior do not agree near the target.',
        unstableError: 'This limit could not be stabilized numerically in Calculus.',
        numericFallbackWarning: () =>
          'Symbolic limit unavailable; showing a numeric finite limit approximation.',
        oneSidedUnboundedError: (side) =>
          `${finiteTargetLabel(side)} limit appears unbounded near the target.`,
        oneSidedDomainError: (side) =>
          `${finiteTargetLabel(side)} behavior is outside the real domain near the target.`,
      },
    });
  } catch {
    return {
      warnings: [],
      error: 'This symbolic limit is outside the supported Calculus rules.',
    };
  }
}

export function evaluateCalculusInfiniteLimit(
  state: CalculusInfiniteLimitState,
): AdvancedLimitEvaluation {
  const bodyLatex = state.bodyLatex.trim();
  const variable = derivativeVariableOrDefault(state.variable);
  if (!bodyLatex) {
    return {
      warnings: [],
      error: 'Limits require a numeric target or +/-infinity in this milestone.',
    };
  }

  const body = ce.parse(bodyLatex).json;
  return evaluateInfiniteLimitFromAst({
    body,
    variable,
    targetKind: state.targetKind,
    messages: {
      targetLabel: (kind) => (kind === 'posInfinity' ? '+infinity' : '-infinity'),
      unstableError: 'This limit could not be stabilized numerically in Calculus.',
      numericFallbackWarning: 'Symbolic limit unavailable; showing a numeric infinite-target approximation.',
    },
  });
}

export function evaluateCalculusLimit(
  state: CalculusLimitState,
): AdvancedLimitEvaluation {
  const parsed = parseNaturalLimitRequest(state.requestLatex);
  if (!parsed.ok) {
    return {
      warnings: [],
      error: parsed.error,
    };
  }

  const { request } = parsed;
  if (request.target.kind === 'finite') {
    return evaluateCalculusFiniteLimit({
      bodyLatex: request.bodyLatex,
      target: request.target.normalizedTargetLatex,
      direction: request.target.direction,
      variable: request.variable,
    });
  }

  return evaluateCalculusInfiniteLimit({
    bodyLatex: request.bodyLatex,
    targetKind: request.target.targetKind,
    variable: request.variable,
  });
}
