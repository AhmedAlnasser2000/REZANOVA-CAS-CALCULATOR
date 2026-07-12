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
import { proseSolveSummary } from '../../display/result-detail-lines';
import { createEquationResultOutcome } from '../solve-result/producer';

const MAX_VISIBLE_NUMERIC_INTERVAL_ROOTS = 64;

function numericIntervalDetailSections(request: GuardedSolveRequest) {
  const interval = request.numericInterval;
  return [
    {
      title: 'Numeric Interval Scope',
      lineKind: 'text' as const,
      lines: [
        interval
          ? `Searched real interval [${interval.start}, ${interval.end}] with ${interval.subdivisions} subdivisions.`
          : 'Searched the chosen real interval.',
        `Angle unit: ${request.angleUnit.toUpperCase()}.`,
        'Roots are local to this chosen interval; this is not a claim of all real roots.',
      ],
    },
  ];
}

function numericIntervalSolve(request: GuardedSolveRequest): DisplayOutcome | null {
  if (!request.numericInterval) {
    return null;
  }

  const target = request.solveTarget ?? 'x';
  const numeric = runNumericIntervalSolve(
    request.resolvedLatex,
    request.numericInterval,
    request.domainConstraints,
    request.angleUnit,
    target,
  );
  const numericDetails = numericIntervalDetailSections(request);
  if (numeric.kind === 'error') {
    const outcome = errorOutcome(
      'Solve',
      numeric.error,
      [],
      [],
      ['Numeric Interval', 'Candidate Checked'],
      proseSolveSummary(numeric.summaryText),
      numeric.rejectedCandidateCount,
      undefined,
      numeric.method,
    );
    return createEquationResultOutcome({
      ...outcome,
      detailSections: [
        ...numericDetails,
        ...(numeric.detailSections ?? []),
      ],
    });
  }

  const visibleRoots = numeric.roots.slice(0, MAX_VISIBLE_NUMERIC_INTERVAL_ROOTS);
  const formattedRoots = visibleRoots.map((value) => formatApproxNumber(value));
  const cappedRootDetails = numeric.roots.length > MAX_VISIBLE_NUMERIC_INTERVAL_ROOTS
    ? [{
        title: 'Search Diagnostics',
        lineKind: 'text' as const,
        lines: [
          `Found ${numeric.roots.length} validated roots in the chosen interval; showing the first ${MAX_VISIBLE_NUMERIC_INTERVAL_ROOTS}.`,
          'Narrow the interval to inspect a dense local root set.',
        ],
      }]
    : [];

  const outcome = successOutcome(
    'Solve',
    undefined,
    `${target} ~= ${formattedRoots.join(', ')}`,
    [],
    [],
    ['Numeric Interval', 'Candidate Checked'],
    proseSolveSummary(numeric.summaryText),
    numeric.rejectedCandidateCount,
    undefined,
    numeric.method,
    finiteBranchReadbackMetadata({
      targetLatex: target,
      relationLatex: '\\approx',
      branchesLatex: formattedRoots,
      source: 'equation-numeric-interval',
    }),
  );
  return createEquationResultOutcome({
    ...outcome,
    detailSections: [
      ...numericDetails,
      ...cappedRootDetails,
      ...(numeric.detailSections ?? []),
    ],
  });
}

export { numericIntervalSolve };
