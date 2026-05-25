import { ComputeEngine } from '@cortex-js/compute-engine';
import { runExpressionAction } from '../engine/math-engine';
import {
  applyExpressionTransform,
  getAlgebraTransformLabel,
  type AlgebraTransformAction,
} from '../algebra/algebra-transform';
import {
  classifyCalculateRuntimeAdvisories,
  classifyPlannerBlockedRuntimeAdvisories,
} from '../kernel/runtime-policy';
import { analyzeLatex, isRelationalOperator } from '../engine/math-analysis';
import { attachRuntimeEnvelope, buildRuntimeOutcome } from '../kernel/runtime-envelope';
import { planMathExecution } from '../engine/semantic-planner';
import { normalizeDirectionalLimitLatex } from '../calculus/finite-limit-target';
import {
  applyStoredVariableSubstitutions,
  storedValuesDetailSection,
} from '../algebra/variable-memory';
import type {
  AngleUnit,
  CalculateAction,
  CalculateScreen,
  CalculusDerivativeStrategy,
  DisplayOutcome,
  LimitDirection,
  LimitTargetKind,
  OutputStyle,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';

const ce = new ComputeEngine();

type RunCalculateModeRequest = {
  action: CalculateAction;
  latex: string;
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
  ansLatex: string;
  calculateScreen?: CalculateScreen;
  limitDirection?: LimitDirection;
  limitTargetKind?: LimitTargetKind;
  storedVariables?: readonly StoredVariableValue[];
  variableSubstitutionSnapshot?: readonly VariableSubstitutionSnapshot[];
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

function addSingleLetterName(target: Set<string>, node: unknown) {
  if (typeof node === 'string' && /^[A-Za-z]$/.test(node)) {
    target.add(node);
  }
}

function collectBoundNamesFromMathJson(node: unknown, target: Set<string>) {
  if (!Array.isArray(node)) {
    if (node && typeof node === 'object') {
      for (const value of Object.values(node)) {
        collectBoundNamesFromMathJson(value, target);
      }
    }
    return;
  }

  const [operator, ...operands] = node;

  if (operator === 'D') {
    addSingleLetterName(target, operands[1]);
  }

  if (operator === 'Integrate') {
    const limits = operands[1];
    if (Array.isArray(limits) && limits[0] === 'Limits') {
      addSingleLetterName(target, limits[1]);
    }
  }

  if (operator === 'Limit') {
    const functionNode = operands[0];
    if (Array.isArray(functionNode) && functionNode[0] === 'Function') {
      for (const functionOperand of functionNode.slice(2)) {
        addSingleLetterName(target, functionOperand);
      }
    }
  }

  for (const operand of operands) {
    collectBoundNamesFromMathJson(operand, target);
  }
}

function collectBoundNamesFromLatex(latex: string) {
  const names = new Set<string>();
  try {
    collectBoundNamesFromMathJson(ce.parse(latex).json, names);
  } catch {
    // Keep substitution policy conservative when parsing fails.
  }
  return names;
}

function calculusProtectedNames(resolvedLatex: string, sourceLatex: string) {
  const names = new Set<string>();
  for (const name of collectBoundNamesFromLatex(resolvedLatex)) {
    names.add(name);
  }
  for (const name of collectBoundNamesFromLatex(sourceLatex)) {
    names.add(name);
  }

  return names.size > 0 ? Array.from(names) : ['x'];
}

function storedValuesLabelForResult(title: string) {
  if (title === 'Derivative') {
    return 'derivative expression';
  }
  if (title === 'Integral') {
    return 'integral expression';
  }
  if (title === 'Limit') {
    return 'limit expression';
  }

  return 'expression';
}

function calculateSubstitutionPolicy({
  action,
  calculateScreen = 'standard',
  resolvedLatex,
  sourceLatex,
}: {
  action: CalculateAction;
  calculateScreen?: CalculateScreen;
  resolvedLatex: string;
  sourceLatex: string;
}): { protectedNames: string[] } | null {
  if (action !== 'evaluate') {
    return null;
  }

  const title = responseTitle(action, resolvedLatex, sourceLatex);
  if (calculateScreen === 'standard' && title === 'Numeric') {
    return { protectedNames: [] };
  }

  if (title === 'Derivative' || title === 'Integral' || title === 'Limit') {
    return { protectedNames: calculusProtectedNames(resolvedLatex, sourceLatex) };
  }

  return null;
}

export function runCalculateMode({
  action,
  latex,
  angleUnit,
  outputStyle,
  ansLatex,
  calculateScreen = 'standard',
  limitDirection,
  limitTargetKind,
  storedVariables,
  variableSubstitutionSnapshot,
}: RunCalculateModeRequest): DisplayOutcome {
  const title = actionTitle(action);
  const directionalLimit = action === 'evaluate'
    ? normalizeDirectionalLimitLatex(latex)
    : { latex, directionOverride: undefined };
  const plannerInputLatex = directionalLimit.latex;
  const effectiveLimitDirection = directionalLimit.directionOverride ?? limitDirection;
  const planner = planMathExecution(plannerInputLatex, {
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

  const substitutionSource = variableSubstitutionSnapshot ?? storedVariables;
  const substitutionPolicy = calculateSubstitutionPolicy({
    action,
    calculateScreen,
    resolvedLatex: planner.resolvedLatex,
    sourceLatex: planner.canonicalLatex,
  });
  const substitution =
    substitutionSource
    && substitutionPolicy
      ? applyStoredVariableSubstitutions(planner.resolvedLatex, substitutionSource, substitutionPolicy)
      : { latex: planner.resolvedLatex, substitutions: [] };
  const responseTitleText = responseTitle(action, planner.resolvedLatex, planner.canonicalLatex);
  const storedValuesDetail = storedValuesDetailSection(
    substitution.substitutions,
    storedValuesLabelForResult(responseTitleText),
  );
  const executionLatex = substitution.latex;

  const response = runExpressionAction(
    {
      mode: 'calculate',
      document: { latex: executionLatex },
      angleUnit,
      outputStyle,
      variables: { Ans: ansLatex },
      calculusOptions: {
        limitDirection: effectiveLimitDirection,
        limitTargetKind,
      },
    },
    action,
  );

  const detailSections = [
    ...(storedValuesDetail ? [storedValuesDetail] : []),
    ...(response.detailSections ?? []),
  ];
  const outcome = attachRuntimeEnvelope(
    buildRuntimeOutcome({
      title: responseTitleText,
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
      detailSections: detailSections.length > 0 ? detailSections : undefined,
      runtimeAdvisories: classifyCalculateRuntimeAdvisories({ error: response.error }),
    }),
    {
      originalLatex: latex,
      resolvedLatex: executionLatex,
      plannerBadges: planner.badges,
      plannerBadgeMode: 'replace',
    },
  );

  return outcome.kind === 'success' && substitution.substitutions.length > 0
    ? { ...outcome, variableSubstitutions: substitution.substitutions }
    : outcome;
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
