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
import { runExpressionWithOoePilot } from '../ooe/expression-pilot';
import {
  applyStoredVariableSubstitutions,
  ignoredStoredValuePolicyLines,
  resolveStoredValueModePolicy,
  storedValueReadbackSections,
  type StoredVariableSubstitutionResult,
} from '../algebra/variable-memory';
import { normalizeExplicitNamedVariablesInLatex } from '../algebra/named-variable';
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

export type RunCalculateModeRequest = {
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

function protectedDescriptionForResult(title: string) {
  if (title === 'Derivative') {
    return 'the derivative variable';
  }
  if (title === 'Integral') {
    return 'the integration variable';
  }
  if (title === 'Limit') {
    return 'the limit variable';
  }

  return 'a protected variable';
}

function descriptionMap(names: readonly string[], description: string) {
  return Object.fromEntries(names.map((name) => [name, description]));
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

function isArrayNode(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function unwrapBlockNode(node: unknown) {
  if (isArrayNode(node) && node[0] === 'Block') {
    return node[1];
  }

  return node;
}

function derivativeAtPointSubstitution(
  latex: string,
  entries: readonly StoredVariableValue[] | readonly VariableSubstitutionSnapshot[] | undefined,
  protectedNames: readonly string[],
): StoredVariableSubstitutionResult | null {
  try {
    const json = ce.parse(latex).json;
    if (!isArrayNode(json) || json[0] !== 'Subscript') {
      return null;
    }

    const evaluateAt = json[1];
    const pointRule = json[2];
    if (!isArrayNode(evaluateAt) || evaluateAt[0] !== 'EvaluateAt') {
      return null;
    }
    if (!isArrayNode(pointRule) || pointRule[0] !== 'Equal') {
      return null;
    }

    const functionNode = evaluateAt[1];
    if (!isArrayNode(functionNode) || functionNode[0] !== 'Function') {
      return null;
    }

    const derivativeNode = unwrapBlockNode(functionNode[1]);
    if (!isArrayNode(derivativeNode) || derivativeNode[0] !== 'D') {
      return null;
    }

    const variable = derivativeNode[2];
    const pointVariable = pointRule[1];
    if (
      typeof variable !== 'string'
      || variable !== pointVariable
      || !/^[A-Za-z]$/.test(variable)
    ) {
      return null;
    }

    const bodyLatex = ce.box(derivativeNode[1] as Parameters<typeof ce.box>[0]).latex;
    const bodySubstitution = applyStoredVariableSubstitutions(bodyLatex, entries, {
      protectedNames: Array.from(new Set([...protectedNames, variable])),
    });
    const pointLatex = ce.box(pointRule[2] as Parameters<typeof ce.box>[0]).latex;

    return {
      latex: `\\left.\\frac{\\mathrm{d}}{\\mathrm{d}${variable}}\\left(${bodySubstitution.latex}\\right)\\right|_{${variable}=${pointLatex}}`,
      substitutions: bodySubstitution.substitutions,
      protectedSubstitutions: bodySubstitution.protectedSubstitutions,
    };
  } catch {
    return null;
  }
}

function applyCalculateStoredVariableSubstitutions(
  latex: string,
  entries: readonly StoredVariableValue[] | readonly VariableSubstitutionSnapshot[] | undefined,
  protectedNames: readonly string[],
  responseTitleText: string,
) {
  if (responseTitleText === 'Derivative') {
    const derivativePoint = derivativeAtPointSubstitution(latex, entries, protectedNames);
    if (derivativePoint) {
      return derivativePoint;
    }
  }

  return applyStoredVariableSubstitutions(latex, entries, { protectedNames });
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
  const plannerInputLatex = normalizeExplicitNamedVariablesInLatex(directionalLimit.latex).latex;
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
  const storedValuePolicy = substitutionPolicy
    ? resolveStoredValueModePolicy({
        mode: 'calculate',
        action:
          substitutionPolicy.protectedNames.length > 0
            ? 'calculus-workbench'
            : 'standard-evaluate',
        protectedNames: substitutionPolicy.protectedNames,
      })
    : resolveStoredValueModePolicy({
        mode: 'calculate',
        action: action === 'evaluate' ? 'unsupported' : 'symbolic-transform',
      });
  const responseTitleText = responseTitle(action, planner.resolvedLatex, planner.canonicalLatex);
  const substitution =
    substitutionSource
    && storedValuePolicy.kind === 'apply'
      ? applyCalculateStoredVariableSubstitutions(
          responseTitleText === 'Derivative' && planner.canonicalLatex.includes('\\left.')
            ? planner.canonicalLatex
            : planner.resolvedLatex,
          substitutionSource,
          storedValuePolicy.protectedNames,
          responseTitleText,
        )
      : { latex: planner.resolvedLatex, substitutions: [], protectedSubstitutions: [] };
  const storedValueDetails = storedValueReadbackSections({
    substitutions: substitution.substitutions,
    protectedSubstitutions: substitution.protectedSubstitutions,
    protectedNameDescriptions: descriptionMap(
      substitution.protectedSubstitutions.map((entry) => entry.name),
      protectedDescriptionForResult(responseTitleText),
    ),
    originalLatex: planner.resolvedLatex,
    effectiveLatex: substitution.latex,
    effectiveLabel: `Effective ${storedValuesLabelForResult(responseTitleText)}`,
    replayedSnapshot: Boolean(variableSubstitutionSnapshot),
    ignoredLines: ignoredStoredValuePolicyLines({
      latex: planner.resolvedLatex,
      entries: substitutionSource,
      policy: storedValuePolicy,
    }),
  });
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
    ...storedValueDetails,
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

export async function runCalculateModeWithOoePilot(
  request: RunCalculateModeRequest,
) {
  return runExpressionWithOoePilot(
    request.action,
    () => runCalculateMode(request),
    { action: request.action, request },
  );
}

type RunCalculateAlgebraTransformRequest = {
  action: AlgebraTransformAction;
  latex: string;
  angleUnit: AngleUnit;
  storedVariables?: readonly StoredVariableValue[];
  variableSubstitutionSnapshot?: readonly VariableSubstitutionSnapshot[];
};

export function runCalculateAlgebraTransform({
  action,
  latex,
  angleUnit,
  storedVariables,
  variableSubstitutionSnapshot,
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

  const substitutionSource = variableSubstitutionSnapshot ?? storedVariables;
  const storedValuePolicy = resolveStoredValueModePolicy({
    mode: 'calculate',
    action: 'symbolic-transform',
  });
  const storedValueDetails = storedValueReadbackSections({
    substitutions: [],
    ignoredLines: ignoredStoredValuePolicyLines({
      latex: planner.resolvedLatex,
      entries: substitutionSource,
      policy: storedValuePolicy,
    }),
  });

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
      detailSections: storedValueDetails.length > 0 ? storedValueDetails : undefined,
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
