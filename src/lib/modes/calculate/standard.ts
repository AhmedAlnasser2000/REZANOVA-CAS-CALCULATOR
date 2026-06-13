import { runExpressionAction } from '../../engine/math-engine';
import {
  classifyCalculateRuntimeAdvisories,
  classifyPlannerBlockedRuntimeAdvisories,
} from '../../kernel/runtime-policy';
import { analyzeLatex, isRelationalOperator } from '../../engine/math-analysis';
import { attachRuntimeEnvelope, buildRuntimeOutcome } from '../../kernel/runtime-envelope';
import { planMathExecution } from '../../engine/semantic-planner';
import { normalizeDirectionalLimitLatex } from '../../calculus/finite-limit-target';
import {
  ignoredStoredValuePolicyLines,
  resolveStoredValueModePolicy,
  storedValueReadbackSections,
} from '../../algebra/variable-memory';
import { normalizeExplicitNamedVariablesInLatex } from '../../algebra/named-variable';
import type { DisplayOutcome } from '../../../types/calculator';
import {
  applyCalculateStoredVariableSubstitutions,
  calculateSubstitutionPolicy,
  descriptionMap,
  protectedDescriptionForResult,
  storedValuesLabelForResult,
} from './stored-values';
import {
  actionTitle,
  mergeDerivativeStrategies,
  responseTitle,
} from './titles';
import type { RunCalculateModeRequest } from './types';

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
