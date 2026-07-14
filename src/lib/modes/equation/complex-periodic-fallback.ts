import type {
  AngleUnit,
  ResultProducerDraft,
  PlannerBadge,
} from '../../../types/calculator';
import type { resolveEquationSolveTarget } from '../../equation/equation-target';
import { trySelectedTargetParameterizedExactSolve } from './symbolic-parameterized-exact';
import { withDeferredComplexWrapperBoundary } from './complex-wrapper-fallback';

type TargetResolution = ReturnType<typeof resolveEquationSolveTarget>;

function hasIntegerPeriodicEvidence(outcome: ResultProducerDraft) {
  if (outcome.kind !== 'success') {
    return false;
  }
  return /\\mathbb\{Z\}|\\pi\s*n|\\pi n|\\frac\{\\pi n\}/u.test([
    outcome.exactLatex,
    ...(outcome.exactSupplementLatex ?? []),
    ...(outcome.branchReadback?.branchesLatex ?? []),
  ].filter(Boolean).join(' '));
}

export function tryDeferredComplexPeriodicFallback(input: {
  deferredComplexWrapperOutcome: ResultProducerDraft | undefined;
  equationLatex: string;
  angleUnit: AngleUnit;
  plannerResolvedLatex: string;
  plannerBadges?: PlannerBadge[];
  targetResolution: TargetResolution;
}) {
  if (!input.deferredComplexWrapperOutcome || !input.targetResolution.selectedTarget) {
    return undefined;
  }

  const realParameterized = trySelectedTargetParameterizedExactSolve({
    equationLatex: input.equationLatex,
    angleUnit: input.angleUnit,
    plannerResolvedLatex: input.plannerResolvedLatex,
    plannerBadges: input.plannerBadges,
    targetResolution: input.targetResolution,
  });

  return realParameterized && hasIntegerPeriodicEvidence(realParameterized)
    ? withDeferredComplexWrapperBoundary(realParameterized, input.deferredComplexWrapperOutcome)
    : undefined;
}
