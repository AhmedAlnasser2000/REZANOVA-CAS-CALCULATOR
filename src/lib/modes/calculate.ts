import { runExpressionAction } from '../math-engine';
import {
  applyExpressionTransform,
  getAlgebraTransformLabel,
  type AlgebraTransformAction,
} from '../algebra-transform';
import {
  classifyCalculateRuntimeAdvisories,
  classifyPlannerBlockedRuntimeAdvisories,
} from '../kernel/runtime-policy';
import { analyzeLatex, isRelationalOperator } from '../math-analysis';
import { attachRuntimeEnvelope, buildRuntimeOutcome } from '../kernel/runtime-envelope';
import { planMathExecution } from '../semantic-planner';
import type {
  AngleUnit,
  CalculateAction,
  CalculusDerivativeStrategy,
  DisplayOutcome,
  LimitDirection,
  LimitTargetKind,
  OutputStyle,
} from '../../types/calculator';

type RunCalculateModeRequest = {
  action: CalculateAction;
  latex: string;
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
  ansLatex: string;
  limitDirection?: LimitDirection;
  limitTargetKind?: LimitTargetKind;
};

function actionTitle(action: CalculateAction) {
  switch (action) {
    case 'evaluate':
      return 'Numeric';
    case 'simplify':
      return 'Simplify';
    case 'factor':
      return 'Factor';
    case 'expand':
      return 'Expand';
    default:
      return 'Calculate';
  }
}

function responseTitle(action: CalculateAction, resolvedLatex: string, sourceLatex = resolvedLatex) {
  if (action !== 'evaluate') {
    return actionTitle(action);
  }

  if (resolvedLatex.includes('\\int') || sourceLatex.includes('\\int')) {
    return 'Integral';
  }

  if (resolvedLatex.includes('\\lim') || sourceLatex.includes('\\lim')) {
    return 'Limit';
  }

  if (
    resolvedLatex.includes('\\frac{d}')
    || resolvedLatex.includes('\\frac{\\mathrm{d}}')
    || sourceLatex.includes('\\frac{d}')
    || sourceLatex.includes('\\frac{\\mathrm{d}}')
  ) {
    return 'Derivative';
  }

  return actionTitle(action);
}

function mergeDerivativeStrategies(
  ...strategyLists: Array<readonly CalculusDerivativeStrategy[] | undefined>
) {
  const merged = strategyLists.flatMap((strategies) => strategies ?? []);
  return merged.length > 0 ? Array.from(new Set(merged)) : undefined;
}

export function runCalculateMode({
  action,
  latex,
  angleUnit,
  outputStyle,
  ansLatex,
  limitDirection,
  limitTargetKind,
}: RunCalculateModeRequest): DisplayOutcome {
  const title = actionTitle(action);
  const planner = planMathExecution(latex, {
    mode: 'calculate',
    intent:
      action === 'evaluate'
        ? 'calculate-evaluate'
        : action === 'simplify'
          ? 'calculate-simplify'
          : action === 'factor'
            ? 'calculate-factor'
            : 'calculate-expand',
    angleUnit,
    screenHint: 'standard',
  });

  if (planner.kind === 'blocked') {
    return attachRuntimeEnvelope(
      {
        kind: 'error',
        title,
        error: planner.error,
        warnings: [],
      },
      {
        originalLatex: latex,
        resolvedLatex: planner.canonicalLatex,
        plannerBadges: planner.badges,
        plannerBadgeMode: 'replace',
        runtimeAdvisories: classifyPlannerBlockedRuntimeAdvisories(planner, 'calculate'),
      },
    );
  }

  const analysis = analyzeLatex(planner.resolvedLatex);

  if (analysis.kind === 'equation') {
    return {
      kind: 'prompt',
      title,
      message: 'Use Equation mode to solve this expression.',
      targetMode: 'equation',
      carryLatex: planner.resolvedLatex,
      warnings: [],
    };
  }

  if (isRelationalOperator(analysis.topLevelOperator)) {
    return attachRuntimeEnvelope(
      {
        kind: 'error',
        title,
        error: 'Inequalities and ≠ notation are visible in Algebra, but this milestone only evaluates expressions and equations.',
        warnings: [],
      },
      {
        originalLatex: latex,
        resolvedLatex: planner.resolvedLatex,
        plannerBadges: planner.badges,
        plannerBadgeMode: 'replace',
        runtimeAdvisories: classifyCalculateRuntimeAdvisories({ invalidRequest: true }),
      },
    );
  }

  if (analysis.kind === 'invalid') {
    return attachRuntimeEnvelope(
      {
        kind: 'error',
        title,
        error: 'Expression could not be parsed or evaluated.',
        warnings: [],
      },
      {
        originalLatex: latex,
        resolvedLatex: planner.resolvedLatex,
        plannerBadges: planner.badges,
        plannerBadgeMode: 'replace',
        runtimeAdvisories: classifyCalculateRuntimeAdvisories({ invalidRequest: true }),
      },
    );
  }

  const response = runExpressionAction(
    {
      mode: 'calculate',
      document: { latex: planner.resolvedLatex },
      angleUnit,
      outputStyle,
      variables: { Ans: ansLatex },
      calculusOptions: {
        limitDirection,
        limitTargetKind,
      },
    },
    action,
  );

  return attachRuntimeEnvelope(
    buildRuntimeOutcome({
      title: responseTitle(action, planner.resolvedLatex, planner.canonicalLatex),
      exactLatex: response.exactLatex,
      exactSupplementLatex: response.exactSupplementLatex,
      approxText: response.approxText,
      warnings: response.warnings,
      error: response.error,
      resultOrigin: response.resultOrigin,
      calculusStrategy: response.calculusStrategy,
      calculusDerivativeStrategies: mergeDerivativeStrategies(
        planner.derivativeStrategies,
        response.calculusDerivativeStrategies,
      ),
      runtimeAdvisories: classifyCalculateRuntimeAdvisories({ error: response.error }),
    }),
    {
      originalLatex: latex,
      resolvedLatex: planner.resolvedLatex,
      plannerBadges: planner.badges,
      plannerBadgeMode: 'replace',
    },
  );
}

type RunCalculateAlgebraTransformRequest = {
  action: AlgebraTransformAction;
  latex: string;
  angleUnit: AngleUnit;
};

export function runCalculateAlgebraTransform({
  action,
  latex,
  angleUnit,
}: RunCalculateAlgebraTransformRequest): DisplayOutcome {
  const title = getAlgebraTransformLabel(action);
  const planner = planMathExecution(latex, {
    mode: 'calculate',
    intent: 'calculate-simplify',
    angleUnit,
    screenHint: 'standard',
  });

  if (planner.kind === 'blocked') {
    return attachRuntimeEnvelope(
      {
        kind: 'error',
        title,
        error: planner.error,
        warnings: [],
      },
      {
        originalLatex: latex,
        resolvedLatex: planner.canonicalLatex,
        plannerBadges: planner.badges,
        plannerBadgeMode: 'replace',
        runtimeAdvisories: classifyPlannerBlockedRuntimeAdvisories(planner, 'calculate'),
      },
    );
  }

  const analysis = analyzeLatex(planner.resolvedLatex);

  if (analysis.kind === 'equation') {
    return {
      kind: 'prompt',
      title,
      message: 'Use Equation mode to transform or solve this equation.',
      targetMode: 'equation',
      carryLatex: planner.resolvedLatex,
      warnings: [],
    };
  }

  if (isRelationalOperator(analysis.topLevelOperator)) {
    return attachRuntimeEnvelope(
      {
        kind: 'error',
        title,
        error: 'This explicit algebra tray currently works only on expressions, not relations or inequalities.',
        warnings: [],
      },
      {
        originalLatex: latex,
        resolvedLatex: planner.resolvedLatex,
        plannerBadges: planner.badges,
        plannerBadgeMode: 'replace',
        runtimeAdvisories: classifyCalculateRuntimeAdvisories({ invalidRequest: true }),
      },
    );
  }

  if (analysis.kind === 'invalid') {
    return attachRuntimeEnvelope(
      {
        kind: 'error',
        title,
        error: 'Expression could not be parsed for explicit algebra transforms.',
        warnings: [],
      },
      {
        originalLatex: latex,
        resolvedLatex: planner.resolvedLatex,
        plannerBadges: planner.badges,
        plannerBadgeMode: 'replace',
        runtimeAdvisories: classifyCalculateRuntimeAdvisories({ invalidRequest: true }),
      },
    );
  }

  const result = applyExpressionTransform(planner.resolvedLatex, action);
  if (!result) {
    return attachRuntimeEnvelope(
      {
        kind: 'error',
        title,
        error: 'No explicit algebra transform is available for this expression yet.',
        warnings: [],
      },
      {
        originalLatex: latex,
        resolvedLatex: planner.resolvedLatex,
        plannerBadges: planner.badges,
        plannerBadgeMode: 'replace',
        runtimeAdvisories: classifyCalculateRuntimeAdvisories({
          error: 'No explicit algebra transform is available for this expression yet.',
        }),
      },
    );
  }

  return attachRuntimeEnvelope(
    {
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
    },
    {
      originalLatex: latex,
      resolvedLatex: planner.resolvedLatex,
      plannerBadges: planner.badges,
      plannerBadgeMode: 'replace',
    },
  );
}
