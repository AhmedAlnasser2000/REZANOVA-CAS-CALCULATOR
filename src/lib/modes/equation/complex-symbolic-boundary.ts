import { containsEquationImaginaryUnitLatex } from '../../equation/complex-input-policy';
import { diagnoseComplexLocusPolicyForLatex } from '../../equation/complex/locus-policy';
import { classifyEquationRuntimeAdvisories } from '../../kernel/runtime-policy';
import type { ComplexSolveRegion, ResultProducerDraft, PlannerBadge } from '../../../types/calculator';
import { tryComplexAbsBoundaryNoSolution } from './complex-abs-boundary';
import { tryDirectComplexLocusOutcome } from './complex-direct-locus';
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
}): ResultProducerDraft | undefined {
  const directLocus = tryDirectComplexLocusOutcome({
    equationLatex: input.parameterizedEquationLatex,
    target: input.solveTarget,
  });
  if (directLocus) {
    return attachEquationRuntimeEnvelope(
      directLocus,
      input.equationLatex,
      input.plannerResolvedLatex,
      input.plannerBadges,
      classifyEquationRuntimeAdvisories({ outcome: directLocus }),
    );
  }

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
      unsupportedComplexLocusOutcome(locusPolicy, {
        equationLatex: input.parameterizedEquationLatex,
        target: input.solveTarget,
        complexRegion: input.complexRegion,
      }),
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
