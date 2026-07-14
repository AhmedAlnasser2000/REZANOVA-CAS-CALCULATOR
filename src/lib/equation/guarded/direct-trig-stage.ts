import {
  matchBoundedMixedLinearTrigEquation,
  matchBoundedTrigEquation,
} from '../../trigonometry/equation-match';
import { solveParameterizedTrigEquation } from '../parameterized/trig';
import { solveTrigEquation } from '../../trigonometry/equations';
import type {
  ResultProducerDraft,
  GuardedSolveRequest,
  PlannerBadge,
} from '../../../types/calculator';
import {
  errorOutcome,
  successOutcome,
} from './outcome';
import {
  createEquationFiniteRootSuccessOutcome,
  createEquationResultOutcome,
  equationMathValuesFromOwnedLeaves,
} from '../solve-result';

type SolveLike = ReturnType<typeof solveTrigEquation>;

function isTrigSolveSuccess(outcome: SolveLike) {
  return !outcome.error && Boolean(outcome.exactLatex);
}

function directTrigSolve(request: GuardedSolveRequest): ResultProducerDraft | null {
  const directMatch = matchBoundedTrigEquation(request.resolvedLatex);
  const mixedMatch = matchBoundedMixedLinearTrigEquation(request.resolvedLatex);
  if (!directMatch && !mixedMatch) {
    return null;
  }

  const parameterized = solveParameterizedTrigEquation(
    request.resolvedLatex,
    'x',
    request.angleUnit,
  );
  if (parameterized.kind === 'success') {
    const producerInput = {
      kind: 'success' as const,
      title: 'Solve',
      exactLatex: parameterized.exactLatex,
      branchReadback: parameterized.branchReadback,
      exactSupplementLatex: parameterized.exactSupplementLatex,
      detailSections: parameterized.detailSections,
      warnings: [],
      resultOrigin: 'symbolic' as const,
      plannerBadges: ['Trig Solve Backend'] as PlannerBadge[],
    };
    if (parameterized.primaryMath) {
      const supplementalValues = equationMathValuesFromOwnedLeaves({
        outcome: producerInput,
        routeId: 'equation.trig-exp-log',
        leaves: parameterized.mathJsonLeaves ?? [],
      });
      return createEquationFiniteRootSuccessOutcome({
        ...producerInput,
        primaryMath: parameterized.primaryMath,
        mathJsonRouteId: 'equation.trig-exp-log',
        mathJsonSource: 'equation-parameterized-trig-branches',
      }, {
        mathValues: supplementalValues.supplements
          ? { supplements: supplementalValues.supplements }
          : undefined,
      });
    }
    return createEquationResultOutcome(producerInput);
  }

  const trig = solveTrigEquation({
    equationLatex: request.resolvedLatex,
    variable: 'x',
    angleUnit: request.angleUnit,
  });

  if (isTrigSolveSuccess(trig)) {
    return successOutcome(
      'Solve',
      trig.exactLatex,
      trig.approxText,
      trig.warnings,
      ['Trig Solve Backend'],
    );
  }

  return errorOutcome(
    'Solve',
    trig.error ?? 'No symbolic solution was found for x.',
    trig.warnings,
    ['Trig Solve Backend'],
  );
}

export { directTrigSolve, isTrigSolveSuccess };
