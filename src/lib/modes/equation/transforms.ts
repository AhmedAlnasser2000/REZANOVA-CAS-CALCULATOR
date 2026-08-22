import {
  applyEquationTransform,
  getAlgebraTransformLabel,
  type AlgebraTransformAction,
} from '../../algebra/algebra-transform';
import { analyzeLatex, isRelationalOperator } from '../../engine/math-analysis';
import { planMathExecution } from '../../engine/semantic-planner';
import { classifyEquationRuntimeAdvisories, classifyPlannerBlockedRuntimeAdvisories } from '../../kernel/runtime-policy';
import type { AngleUnit, ResultProducerDraft } from '../../../types/calculator';
import {
  attachEquationRuntimeEnvelope,
  containsNonEqualityRelation,
  ensureSafeEquationSuccessOutcome,
} from './outcomes';
import { createEquationResultOutcome } from '../../equation/equation-solve-result';
import { attachEquationAnalysisEvidence } from '../../equation/analysis-evidence';
import { equationMathValuesForOwnedSuccessReadback } from '../../equation/solve-result/owned-readback-math';
import type { SerializableMathJson, SolveDomainConstraint } from '../../../types/calculator';
export {
  EQUATION_USE_STORED_VALUES_ACTION,
  getEquationAlgebraActionLabel,
  type EquationAlgebraAction,
} from './transform-contract';

type RunEquationAlgebraTransformRequest = {
  action: AlgebraTransformAction;
  equationLatex: string;
  angleUnit: AngleUnit;
};

function transformConstraintEvidence(constraints: readonly SolveDomainConstraint[] = []) {
  return constraints.flatMap((constraint, index) => {
    if (
      !('expressionLatex' in constraint)
      || constraint.expressionMathJson === undefined
    ) return [];
    const relation = constraint.kind === 'nonzero'
      ? { operator: 'NotEqual', role: 'exclusion' as const, suffix: '\\ne0' }
      : constraint.kind === 'positive'
        ? { operator: 'Greater', role: 'condition' as const, suffix: '>0' }
        : constraint.kind === 'nonnegative'
          ? { operator: 'GreaterEqual', role: 'condition' as const, suffix: '\\ge0' }
          : undefined;
    if (!relation) return [];
    const canonicalLatex = `${constraint.expressionLatex}${relation.suffix}`;
    return [{
      id: `domain:equation-explicit-transform:x:${constraint.kind}:${index}`,
      target: 'x',
      sourceRoute: 'equation-explicit-transform',
      category: 'domain' as const,
      confidence: 'proven' as const,
      latex: canonicalLatex,
      supplementEvidence: {
        role: relation.role,
        expressionLatex: constraint.expressionLatex,
        canonicalLatex,
        mathJson: [
          relation.operator,
          constraint.expressionMathJson,
          0,
        ] as SerializableMathJson,
      },
    }];
  });
}

export function runEquationAlgebraTransform({
  action,
  equationLatex,
  angleUnit,
}: RunEquationAlgebraTransformRequest): ResultProducerDraft {
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

  const transformReadback = {
    exactLatex: result.exactLatex,
    exactSupplementLatex:
      result.exactSupplementLatex && result.exactSupplementLatex.length > 0
        ? result.exactSupplementLatex
        : undefined,
    transformSummaryText: result.transformSummaryText,
    transformSummaryLatex: result.transformSummaryLatex,
    ...(result.exactMathJson === undefined ? {} : {
      primaryMath: {
        canonicalLatex: result.exactLatex,
        mathJson: result.exactMathJson,
      },
    }),
  };
  let outcome = ensureSafeEquationSuccessOutcome(createEquationResultOutcome({
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
  }, result.exactMathJson === undefined ? undefined : {
    mathValues: equationMathValuesForOwnedSuccessReadback({
      readback: transformReadback,
      leaves: [{
        canonicalLatex: result.exactLatex,
        mathJson: result.exactMathJson,
        source: 'equation-explicit-transform-primary',
      }],
    }),
  }));

  outcome = attachEquationAnalysisEvidence(
    outcome,
    transformConstraintEvidence(result.domainConstraints),
  );

  return attachEquationRuntimeEnvelope(
    outcome,
    equationLatex,
    planner.resolvedLatex,
    planner.badges,
    classifyEquationRuntimeAdvisories({ outcome }),
  );
}
