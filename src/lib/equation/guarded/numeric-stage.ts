import type {
  DisplayOutcome,
  GuardedSolveRequest,
} from '../../../types/calculator';
import { finiteBranchReadbackMetadata } from '../../display/branch-readback';
import { formatApproxNumber } from '../../display/format';
import { runNumericIntervalSolve } from '../numeric-interval-solve';
import {
  errorOutcome,
  successOutcome,
} from './outcome';

function numericIntervalSolve(request: GuardedSolveRequest): DisplayOutcome | null {
  if (!request.numericInterval) {
    return null;
  }

  const numeric = runNumericIntervalSolve(
    request.resolvedLatex,
    request.numericInterval,
    request.domainConstraints,
    request.angleUnit,
  );
  if (numeric.kind === 'error') {
    return errorOutcome(
      'Solve',
      numeric.error,
      [],
      [],
      ['Numeric Interval', 'Candidate Checked'],
      numeric.summaryText,
      numeric.rejectedCandidateCount,
      undefined,
      numeric.method,
    );
  }

  const formattedRoots = numeric.roots.map((value) => formatApproxNumber(value));

  return successOutcome(
    'Solve',
    undefined,
    `x ~= ${formattedRoots.join(', ')}`,
    [],
    [],
    ['Numeric Interval', 'Candidate Checked'],
    numeric.summaryText,
    numeric.rejectedCandidateCount,
    undefined,
    numeric.method,
    finiteBranchReadbackMetadata({
      targetLatex: 'x',
      relationLatex: '\\approx',
      branchesLatex: formattedRoots,
      source: 'equation-numeric-interval',
    }),
  );
}

export { numericIntervalSolve };
