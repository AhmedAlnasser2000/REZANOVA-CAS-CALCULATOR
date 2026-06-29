import type {
  DisplayOutcome,
  GuardedSolveRequest,
} from '../../../types/calculator';
import { finiteBranchReadbackMetadata } from '../../display/branch-readback';
import { formatApproxNumber } from '../../display/format';
import { equationToZeroFormLatex } from '../domain-guards';
import {
  addSampledDiscontinuityFact,
  collectEquationNumericDomainFacts,
  probeEquationZeroForm,
} from '../numeric-domain-segmentation';
import { runNumericIntervalSolve } from '../numeric-interval-solve';
import {
  errorOutcome,
  successOutcome,
} from './outcome';

function uniqueLines(lines: readonly string[]) {
  return [...new Set(lines.filter((line) => line.trim().length > 0))];
}

function numericIntervalDetailSections(request: GuardedSolveRequest) {
  const target = request.solveTarget ?? 'x';
  const facts = collectEquationNumericDomainFacts(request.resolvedLatex, target);
  const zeroFormLatex = equationToZeroFormLatex(request.resolvedLatex);
  addSampledDiscontinuityFact(facts, probeEquationZeroForm(zeroFormLatex, target, request.angleUnit));
  const factLines = uniqueLines(facts.map((fact) => fact.message));
  const interval = request.numericInterval;
  return [
    {
      title: 'Numeric Interval Scope',
      lines: [
        interval
          ? `Searched real interval [${interval.start}, ${interval.end}] with ${interval.subdivisions} subdivisions.`
          : 'Searched the chosen real interval.',
        'Roots are local to this chosen interval; this is not a claim of all real roots.',
      ],
    },
    ...(factLines.length > 0
      ? [{
          title: 'Domain and Exclusions',
          lines: factLines,
        }]
      : []),
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
      numeric.summaryText,
      numeric.rejectedCandidateCount,
      undefined,
      numeric.method,
    );
    return {
      ...outcome,
      detailSections: [
        ...numericDetails,
        ...(numeric.detailSections ?? []),
      ],
    };
  }

  const formattedRoots = numeric.roots.map((value) => formatApproxNumber(value));

  const outcome = successOutcome(
    'Solve',
    undefined,
    `${target} ~= ${formattedRoots.join(', ')}`,
    [],
    [],
    ['Numeric Interval', 'Candidate Checked'],
    numeric.summaryText,
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
  return {
    ...outcome,
    detailSections: [
      ...numericDetails,
      ...(numeric.detailSections ?? []),
    ],
  };
}

export { numericIntervalSolve };
