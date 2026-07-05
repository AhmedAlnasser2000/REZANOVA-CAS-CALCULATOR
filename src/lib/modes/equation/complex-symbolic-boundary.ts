import { containsEquationImaginaryUnitLatex } from '../../equation/complex-input-policy';
import { diagnoseComplexLocusPolicyForLatex } from '../../equation/complex/locus-policy';
import { classifyEquationRuntimeAdvisories } from '../../kernel/runtime-policy';
import type { ComplexSolveRegion, DisplayOutcome, PlannerBadge } from '../../../types/calculator';
import { tryComplexAbsBoundaryNoSolution } from './complex-abs-boundary';
import {
  attachEquationRuntimeEnvelope,
  unsupportedComplexLocusOutcome,
  unsupportedComplexPreimageOutcome,
} from './outcomes';

export function tryComplexSymbolicBoundaryOutcome(input: {
  equationLatex: string;
  parameterizedEquationLatex: string;
  solveTarget: string;
  complexRegion?: ComplexSolveRegion;
  plannerResolvedLatex: string;
  plannerBadges?: PlannerBadge[];
}): DisplayOutcome | undefined {
  const complexAbsBoundary = tryComplexAbsBoundaryNoSolution({
    equationLatex: input.parameterizedEquationLatex,
    target: input.solveTarget,
  });
  if (complexAbsBoundary) {
    return attachEquationRuntimeEnvelope(
      complexAbsBoundary,
      input.equationLatex,
      input.plannerResolvedLatex,
      input.plannerBadges,
      classifyEquationRuntimeAdvisories({ outcome: complexAbsBoundary }),
    );
  }

  const locusPolicy = diagnoseComplexLocusPolicyForLatex(input.parameterizedEquationLatex, {
    target: input.solveTarget,
  });
  if (locusPolicy.hasLocusDeferredCarrier) {
    return attachEquationRuntimeEnvelope(
      unsupportedComplexLocusOutcome(locusPolicy),
      input.equationLatex,
      input.plannerResolvedLatex,
      input.plannerBadges,
      classifyEquationRuntimeAdvisories({ invalidRequest: true }),
    );
  }

  if (!input.complexRegion && containsEquationImaginaryUnitLatex(input.parameterizedEquationLatex)) {
    return attachEquationRuntimeEnvelope(
      unsupportedComplexPreimageOutcome(),
      input.equationLatex,
      input.plannerResolvedLatex,
      input.plannerBadges,
      classifyEquationRuntimeAdvisories({ invalidRequest: true }),
    );
  }

  return undefined;
}
