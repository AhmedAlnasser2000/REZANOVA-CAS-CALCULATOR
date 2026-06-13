import {
  applyExpressionTransform,
  getAlgebraTransformLabel,
} from '../../algebra/algebra-transform';
import {
  classifyCalculateRuntimeAdvisories,
  classifyPlannerBlockedRuntimeAdvisories,
} from '../../kernel/runtime-policy';
import { analyzeLatex, isRelationalOperator } from '../../engine/math-analysis';
import { attachRuntimeEnvelope } from '../../kernel/runtime-envelope';
import { planMathExecution } from '../../engine/semantic-planner';
import {
  ignoredStoredValuePolicyLines,
  resolveStoredValueModePolicy,
  storedValueReadbackSections,
} from '../../algebra/variable-memory';
import type { DisplayOutcome } from '../../../types/calculator';
import type { RunCalculateAlgebraTransformRequest } from './types';

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
