import {
  applyEquationTransform,
  getAlgebraTransformLabel,
  type AlgebraTransformAction,
} from '../../algebra/algebra-transform';
import { analyzeLatex, isRelationalOperator } from '../../engine/math-analysis';
import { planMathExecution } from '../../engine/semantic-planner';
import { classifyEquationRuntimeAdvisories, classifyPlannerBlockedRuntimeAdvisories } from '../../kernel/runtime-policy';
import type { AngleUnit, DisplayOutcome } from '../../../types/calculator';
import {
  attachEquationRuntimeEnvelope,
  containsNonEqualityRelation,
  ensureSafeEquationSuccessOutcome,
} from './outcomes';
import { createEquationResultOutcome } from '../../equation/equation-solve-result';

type RunEquationAlgebraTransformRequest = {
  action: AlgebraTransformAction;
  equationLatex: string;
  angleUnit: AngleUnit;
};

export const EQUATION_USE_STORED_VALUES_ACTION = 'useStoredValues' as const;

export type EquationAlgebraAction =
  | AlgebraTransformAction
  | typeof EQUATION_USE_STORED_VALUES_ACTION;

export function getEquationAlgebraActionLabel(action: EquationAlgebraAction) {
  return action === EQUATION_USE_STORED_VALUES_ACTION
    ? 'Use Stored Values'
    : getAlgebraTransformLabel(action);
}

export function runEquationAlgebraTransform({
  action,
  equationLatex,
  angleUnit,
}: RunEquationAlgebraTransformRequest): DisplayOutcome {
  const title = getAlgebraTransformLabel(action);

  if (containsNonEqualityRelation(equationLatex)) {
    return attachEquationRuntimeEnvelope(
      {
        kind: 'error',
        title,
        error: 'Equation algebra transforms currently work only on = equations.',
        warnings: [],
      },
      equationLatex,
      equationLatex,
      undefined,
      classifyEquationRuntimeAdvisories({ invalidRequest: true }),
    );
  }

  const planner = planMathExecution(equationLatex, {
    mode: 'equation',
    intent: 'equation-solve',
    angleUnit,
    screenHint: 'symbolic',
  });

  if (planner.kind === 'blocked') {
    return attachEquationRuntimeEnvelope(
      {
        kind: 'error',
        title,
        error: planner.error,
        warnings: [],
      },
      equationLatex,
      planner.canonicalLatex,
      planner.badges,
      classifyPlannerBlockedRuntimeAdvisories(planner, 'equation'),
    );
  }

  const analysis = analyzeLatex(planner.resolvedLatex);
  if (analysis.kind !== 'equation' || isRelationalOperator(analysis.topLevelOperator)) {
    return attachEquationRuntimeEnvelope(
      {
        kind: 'error',
        title,
        error: 'Enter a symbolic = equation before using an explicit algebra transform.',
        warnings: [],
      },
      equationLatex,
      planner.resolvedLatex,
      planner.badges,
      classifyEquationRuntimeAdvisories({ invalidRequest: true }),
    );
  }

  const result = applyEquationTransform(planner.resolvedLatex, action);
  if (!result) {
    return attachEquationRuntimeEnvelope(
      {
        kind: 'error',
        title,
        error: 'No explicit algebra transform is available for this equation yet.',
        warnings: [],
      },
      equationLatex,
      planner.resolvedLatex,
      planner.badges,
      classifyEquationRuntimeAdvisories({
        outcome: {
          kind: 'error',
          title,
          error: 'No explicit algebra transform is available for this equation yet.',
          warnings: [],
        },
      }),
    );
  }

  const outcome = ensureSafeEquationSuccessOutcome(createEquationResultOutcome({
    kind: 'success',
    title,
    exactLatex: result.exactLatex,
    exactSupplementLatex:
      result.exactSupplementLatex && result.exactSupplementLatex.length > 0
        ? result.exactSupplementLatex
        : undefined,
    warnings: [],
    resultOrigin: 'symbolic-engine',
    transformBadges: result.transformBadges,
    transformSummaryText: result.transformSummaryText,
    transformSummaryLatex: result.transformSummaryLatex,
  }));

  return attachEquationRuntimeEnvelope(
    outcome,
    equationLatex,
    planner.resolvedLatex,
    planner.badges,
    classifyEquationRuntimeAdvisories({ outcome }),
  );
}
