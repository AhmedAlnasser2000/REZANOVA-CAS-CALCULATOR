import {
  matchBoundedMixedLinearTrigEquation,
  matchBoundedTrigEquation,
} from '../../trigonometry/equation-match';
import { solveParameterizedTrigEquation } from '../parameterized/trig';
import { solveTrigEquation } from '../../trigonometry/equations';
import type {
  DisplayOutcome,
  GuardedSolveRequest,
} from '../../../types/calculator';
import {
  errorOutcome,
  successOutcome,
} from './outcome';

type SolveLike = ReturnType<typeof solveTrigEquation>;

function isTrigSolveSuccess(outcome: SolveLike) {
  return !outcome.error && Boolean(outcome.exactLatex);
}

function directTrigSolve(request: GuardedSolveRequest): DisplayOutcome | null {
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
    return {
      kind: 'success',
      title: 'Solve',
      exactLatex: parameterized.exactLatex,
      branchReadback: parameterized.branchReadback,
      exactSupplementLatex: parameterized.exactSupplementLatex,
      detailSections: parameterized.detailSections,
      warnings: [],
      resultOrigin: 'symbolic',
      plannerBadges: ['Trig Solve Backend'],
    };
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
