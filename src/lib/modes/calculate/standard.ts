import { runExpressionAction } from '../../engine/math-engine';
import {
  classifyCalculateRuntimeAdvisories,
  classifyPlannerBlockedRuntimeAdvisories,
} from '../../kernel/runtime-policy';
import { analyzeLatex, isRelationalOperator } from '../../engine/math-analysis';
import { attachRuntimeEnvelope, buildRuntimeOutcome } from '../../kernel/runtime-envelope';
import { planMathExecution } from '../../engine/semantic-planner';
import { normalizeDirectionalLimitLatex } from '../../calculus/engine/finite-limit-target';
import {
  ignoredStoredValuePolicyLines,
  resolveStoredValueModePolicy,
  storedValueReadbackSections,
} from '../../algebra/variable-memory';
import { normalizeExplicitNamedVariablesInLatex } from '../../algebra/named-variable';
import type { ResultProducerDraft } from '../../../types/calculator';
import type { CurrentResultProducerDraft } from '../../../types/calculator/canonical-result-runtime';
import { profileDomainMathValue } from '../../display/printer';
import type { MathJsonRouteId } from '../../result-contract/mathjson-route-registry';
import { calculateMathResolver } from './math-values';
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
import { createCalculateResultOutcome, createCalculateErrorResultOutcome } from './result-document';
import { provenSpecialExpression } from '../../result-contract/current/special-producer';
import type { RunCalculateModeRequest } from './types';

function calculateMathJsonRouteId(input: {
  action: RunCalculateModeRequest['action'];
  latex: string;
  outputStyle: RunCalculateModeRequest['outputStyle'];
  responseTitle: string;
}): Extract<MathJsonRouteId, `calculate.${string}`> {
  if (input.action !== 'evaluate') return 'calculate.transforms';
  if (input.responseTitle === 'Derivative') return 'calculate.derivatives';
  if (input.responseTitle === 'Integral') return 'calculate.integrals';
  if (input.responseTitle === 'Limit') return 'calculate.limits';
  if (/\bAns\b/u.test(input.latex)) return 'calculate.ans';
  if (input.outputStyle === 'decimal') return 'calculate.numeric-format';
  if (/\\arc(?:sin|cos|tan)/u.test(input.latex)) {
    return 'calculate.inverse-trigonometry';
  }
  if (/\\(?:sin|cos|tan)/u.test(input.latex)) return 'calculate.trigonometry';
  if (/\\sqrt|\^/u.test(input.latex)) return 'calculate.exact-forms';
  return 'calculate.arithmetic';
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
}: RunCalculateModeRequest): CurrentResultProducerDraft | Extract<ResultProducerDraft, {kind: 'prompt'}> {
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

  const attachError = (draft: Extract<ResultProducerDraft, { kind: 'error' }>, options: Parameters<typeof attachRuntimeEnvelope>[1]) => {
    const enclosed = attachRuntimeEnvelope(draft, options);
    if (enclosed.kind !== 'error') throw new Error('Expected Calculate error.');
    const requestMath = planner.kind === 'blocked' ? undefined : planner.resolvedMathJson;
    return createCalculateErrorResultOutcome({ ...enclosed,
      ...(requestMath === undefined ? { resolvedInputLatex: undefined } : {}),
    }, requestMath === undefined ? undefined : calculateMathResolver('calculate.transforms', [{
      canonicalLatex: planner.kind === 'blocked' ? planner.canonicalLatex : planner.resolvedLatex,
      mathJson: requestMath, source: 'calculate-error:planned-input',
    }]));
  };

  if (planner.kind === 'blocked') {
    return attachError(
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
    return attachError(
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
    return attachError(
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
    (substitutionSource || (responseTitleText === 'Derivative' && planner.canonicalLatex.includes('\\left.')))
    && storedValuePolicy.kind === 'apply'
      ? applyCalculateStoredVariableSubstitutions(
          responseTitleText === 'Derivative' && planner.canonicalLatex.includes('\\left.')
            ? planner.canonicalLatex
            : planner.resolvedLatex,
          substitutionSource ?? [],
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
  const profiledMath = response.answerMathJson === undefined
    ? undefined
    : profileDomainMathValue(response.exactLatex, response.answerMathJson);
  const exactLatex = profiledMath?.canonicalLatex ?? response.exactLatex;
  const derivativeStrategies = mergeDerivativeStrategies(
    planner.derivativeStrategies,
    response.calculusDerivativeStrategies,
  );
  const resolvedInputLatex = executionLatex !== latex.trim() ? executionLatex : undefined;
  const variableSubstitutions = !response.error && substitution.substitutions.length > 0
    ? substitution.substitutions
    : undefined;
  const routeId = calculateMathJsonRouteId({
    action,
    latex,
    outputStyle,
    responseTitle: responseTitleText,
  });
  const mathValue = calculateMathResolver(routeId, [
    ...(profiledMath?.primaryMath?.mathJson !== undefined && exactLatex
      ? [{ canonicalLatex: exactLatex, mathJson: profiledMath.primaryMath.mathJson, source: 'calculate-expression-answer' }] : []),
    ...(response.mathJsonLeaves ?? []),
    ...('mathJsonLeaves' in substitution ? substitution.mathJsonLeaves ?? [] : []),
    ...substitution.protectedSubstitutions.map(entry => ({ canonicalLatex: entry.name,
      mathJson: entry.name, source: 'stored-value:protected-symbol' })),
    ...(resolvedInputLatex ? [{ canonicalLatex: resolvedInputLatex,
      mathJson: 'mathJson' in substitution && substitution.mathJson !== undefined
        ? substitution.mathJson : executionLatex === planner.resolvedLatex ? planner.resolvedMathJson : undefined,
      source: 'calculate-native-resolved-input' }] : []),
  ]);
  const outcome = attachRuntimeEnvelope(
    buildRuntimeOutcome({
      title: responseTitleText,
      exactLatex,
      primaryMath: profiledMath?.primaryMath,
      answerRows: response.answerRows,
      exactSupplementLatex: response.exactSupplementLatex,
      approxText: response.approxText,
      warnings: response.warnings,
      error: response.error,
      resultOrigin: response.resultOrigin,
      calculusStrategy: response.calculusStrategy,
      calculusDerivativeStrategies: derivativeStrategies,
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

  const special = response.indefiniteIntegralAuthority?.specialExpression;
  return createCalculateResultOutcome({ ...outcome, ...(special ? { answerRows: undefined } : {}),
    ...(outcome.kind === 'success' && variableSubstitutions ? { variableSubstitutions } : {}) },
    mathValue, response.domainConstraints, special ? { kind: 'special-function-expression',
      expression: provenSpecialExpression(special, mathValue, 'primary.expression') } : undefined);
}
