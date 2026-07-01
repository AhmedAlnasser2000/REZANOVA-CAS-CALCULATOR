import type {
  DisplayOutcome,
  GuardedSolveRequest,
} from '../../../types/calculator';
import { finiteBranchReadbackMetadata } from '../../display/branch-readback';
import { formatApproxNumber } from '../../display/format';
import { equationToZeroFormLatex } from '../domain-guards';
import {
  collectEquationNumericDomainFacts,
  probeEquationZeroForm,
} from '../numeric-domain-segmentation';
import { runNumericIntervalSolve } from '../numeric-interval-solve';
import {
  errorOutcome,
  successOutcome,
} from './outcome';

const MAX_VISIBLE_NUMERIC_INTERVAL_ROOTS = 64;

function uniqueLines(lines: readonly string[]) {
  return [...new Set(lines.filter((line) => line.trim().length > 0))];
}

function numericIntervalDetailSections(request: GuardedSolveRequest) {
  const target = request.solveTarget ?? 'x';
  const facts = collectEquationNumericDomainFacts(request.resolvedLatex, target);
  const zeroFormLatex = equationToZeroFormLatex(request.resolvedLatex);
  const sampleProbe = probeEquationZeroForm(zeroFormLatex, target, request.angleUnit);
  const factLines = uniqueLines(
    facts
      .filter((fact) => fact.kind !== 'sampled-discontinuity')
      .map((fact) => fact.message),
  );
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
    ...(sampleProbe.undefinedSampleCount > 0
      ? [{
          title: 'Domain Probe',
          lines: [
            `Probe set: ${sampleProbe.samplePoints.length} fixed numeric ${target} samples.`,
            `Undefined or non-real samples: ${sampleProbe.undefinedSampleCount}; finite samples: ${sampleProbe.finiteSampleCount}.`,
            'Probe evidence guides segmentation; it is not a complete domain proof.',
          ],
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

  const visibleRoots = numeric.roots.slice(0, MAX_VISIBLE_NUMERIC_INTERVAL_ROOTS);
  const formattedRoots = visibleRoots.map((value) => formatApproxNumber(value));
  const cappedRootDetails = numeric.roots.length > MAX_VISIBLE_NUMERIC_INTERVAL_ROOTS
    ? [{
        title: 'Search Diagnostics',
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
      ...cappedRootDetails,
      ...(numeric.detailSections ?? []),
    ],
  };
}

export { numericIntervalSolve };
