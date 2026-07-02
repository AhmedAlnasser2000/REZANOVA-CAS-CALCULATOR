import { ComputeEngine } from '@cortex-js/compute-engine';
import { latexToApproxText } from '../../display/format';
import type { DisplayDetailSection } from '../../../types/calculator';
import { derivativeVariableLatex, derivativeVariableOrDefault } from '../derivative-target';
import { parseFiniteLimitTargetDraft } from '../engine/finite-limit-target';
import {
  evaluateFiniteLimitFromAst,
  evaluateInfiniteLimitFromAst,
} from '../engine/limits';
import { classifyNaturalLimitRoute } from '../limit-route-classifier';
import {
  parseNaturalLimitRequest,
  type NaturalLimitRequest,
} from '../limit-request';
import {
  analyzeNaturalLimitVariables,
  limitVariableMismatchDetails,
  limitVariableMismatchError,
} from '../limit-variable-analysis';
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

function formatBodyVariables(bodyVariables: readonly string[]) {
  return bodyVariables.length > 0
    ? bodyVariables.map(derivativeVariableLatex).join(', ')
    : 'none detected';
}

function appendUnstableLimitDiagnostic(input: {
  evaluation: AdvancedLimitEvaluation;
  request: NaturalLimitRequest;
  routeKind: string;
  bodyVariables: readonly string[];
}): AdvancedLimitEvaluation {
  if (
    !input.evaluation.error
    || !input.evaluation.error.includes('could not be stabilized')
  ) {
    return input.evaluation;
  }

  const diagnostic: DisplayDetailSection = {
    title: 'Limit Diagnostic',
    lines: [
      `Parsed variable: ${input.request.variableLatex}.`,
      `Expression variables: ${formatBodyVariables(input.bodyVariables)}.`,
      `Route classification: ${input.routeKind}.`,
      'No supported symbolic route or stable numeric sample sequence resolved this expression.',
    ],
  };

  return {
    ...input.evaluation,
    detailSections: [
      ...(input.evaluation.detailSections ?? []),
      diagnostic,
    ],
  };
}

function finiteTargetLabel(direction: LimitDirection) {
  return direction === 'left' ? 'Left-hand' : 'Right-hand';
}

export function evaluateCalculusFiniteLimit(
  state: CalculusFiniteLimitState & { routeKind?: string },
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
      routeKind: state.routeKind,
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
  state: CalculusInfiniteLimitState & { routeKind?: string },
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
    routeKind: state.routeKind,
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
  const variableAnalysis = analyzeNaturalLimitVariables(request);
  if (variableAnalysis.mismatch) {
    return {
      warnings: [],
      error: limitVariableMismatchError(variableAnalysis.mismatch),
      detailSections: limitVariableMismatchDetails(variableAnalysis.mismatch),
    };
  }

  const route = classifyNaturalLimitRoute(state.requestLatex);
  const evaluate = (): AdvancedLimitEvaluation => {
    if (request.target.kind === 'finite') {
      return evaluateCalculusFiniteLimit({
        bodyLatex: request.bodyLatex,
        target: request.target.normalizedTargetLatex,
        direction: request.target.direction,
        variable: request.variable,
        routeKind: route.kind,
      });
    }

    return evaluateCalculusInfiniteLimit({
      bodyLatex: request.bodyLatex,
      targetKind: request.target.targetKind,
      variable: request.variable,
      routeKind: route.kind,
    });
  };

  return appendUnstableLimitDiagnostic({
    evaluation: evaluate(),
    request,
    routeKind: route.kind,
    bodyVariables: variableAnalysis.bodyVariables,
  });
}
