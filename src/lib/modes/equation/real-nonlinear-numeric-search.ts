import { finiteBranchReadbackMetadata } from '../../display/branch-readback';
import { formatApproxNumber } from '../../display/format';
import { dedupeNumericRoots } from '../../equation/candidate-validation';
import {
  appendExtraneousSolutionsDetailSection,
  extraneousEvidenceFromRejectedCandidates,
} from '../../equation/candidate/extraneous';
import { evaluateLatexAtTarget } from '../../equation/domain-guards';
import { equationTargetLatex } from '../../equation/equation-target';
import { runNumericIntervalSolve } from '../../equation/numeric-interval-solve';
import type {
  AngleUnit,
  DisplayDetailSection,
  DisplayOutcome,
  EquationDomainIntent,
  NumericSolveInterval,
} from '../../../types/calculator';
import { classifyEquationNumericShape } from './numeric-shape-classifier';

const UNSUPPORTED_EXACT_SYMBOLIC_FAMILY_ERROR =
  'This equation is outside the supported exact symbolic solve families.';
const NUMERIC_METHOD_NONLINEAR = 'Real nonlinear bounded numeric search';
const NUMERIC_RESIDUAL_TOLERANCE = 1e-8;

const AUTO_SEARCH_WINDOWS: NumericSolveInterval[] = [
  { start: '-10', end: '10', subdivisions: 256 },
  { start: '-100', end: '100', subdivisions: 256 },
  { start: '-1000', end: '1000', subdivisions: 256 },
  { start: '-10000', end: '10000', subdivisions: 256 },
];

function uniqueLines(lines: readonly string[]) {
  return [...new Set(lines.filter((line) => line.trim().length > 0))];
}

function windowLabel(window: NumericSolveInterval) {
  return `[${window.start}, ${window.end}]`;
}

function approximateEquationLatex(targetLatex: string, roots: readonly number[]) {
  const formatted = roots.map((value) => formatApproxNumber(value));
  return formatted.length === 1
    ? `${targetLatex}\\approx ${formatted[0]}`
    : `${targetLatex}\\approx\\left\\{${formatted.join(', ')}\\right\\}`;
}

function approximateText(target: string, roots: readonly number[]) {
  const formatted = roots.map((value) => formatApproxNumber(value));
  return formatted.length === 1
    ? `${target} ~= ${formatted[0]}`
    : `${target} ~= ${formatted.join(', ')}`;
}

function residualLines(zeroFormLatex: string, target: string, roots: readonly number[]) {
  return roots.map((root) => {
    const evaluated = evaluateLatexAtTarget(zeroFormLatex, target, root);
    const residual = evaluated.value === null ? Number.NaN : Math.abs(evaluated.value);
    return `${target}≈${formatApproxNumber(root)} residual ${Number.isFinite(residual) ? formatApproxNumber(residual) : 'undefined'}.`;
  });
}

function mergeDetailSections(sections: readonly DisplayDetailSection[]) {
  const merged = new Map<string, string[]>();
  for (const section of sections) {
    const existing = merged.get(section.title) ?? [];
    merged.set(section.title, uniqueLines([...existing, ...section.lines]));
  }

  return [...merged.entries()].map(([title, lines]) => ({ title, lines }));
}

export function tryRealNonlinearNumericSearchFallback(input: {
  equationLatex: string;
  equationSolveTarget: string;
  angleUnit: AngleUnit;
  equationDomainIntent: EquationDomainIntent;
  numericInterval?: NumericSolveInterval;
  sharedOutcome: DisplayOutcome;
}): DisplayOutcome | undefined {
  if (
    input.sharedOutcome.kind !== 'error'
    || input.sharedOutcome.error !== UNSUPPORTED_EXACT_SYMBOLIC_FAMILY_ERROR
    || input.equationDomainIntent !== 'real'
    || input.numericInterval
  ) {
    return undefined;
  }

  const classification = classifyEquationNumericShape({
    equationLatex: input.equationLatex,
    equationSolveTarget: input.equationSolveTarget,
    angleUnit: input.angleUnit,
  });
  if (
    !classification.numericReady
    || !classification.selectedTarget
    || !classification.zeroFormLatex
    || !['nonlinear-search', 'discontinuity-heavy'].includes(classification.route)
  ) {
    return undefined;
  }

  const acceptedRoots: number[] = [];
  const rejectedEvidence: DisplayDetailSection[] = [];
  let rejectedCandidateCount = 0;

  for (const window of AUTO_SEARCH_WINDOWS) {
    const result = runNumericIntervalSolve(
      input.equationLatex,
      window,
      [],
      input.angleUnit,
      classification.selectedTarget,
    );
    if (result.kind === 'success') {
      acceptedRoots.push(...result.roots);
    }
    rejectedCandidateCount += result.rejectedCandidateCount ?? 0;
    if (result.detailSections) {
      rejectedEvidence.push(...result.detailSections);
    }
  }

  const accepted = dedupeNumericRoots(acceptedRoots);
  const factLines = uniqueLines(classification.domainFacts.map((fact) => fact.message));
  const searchedWindows = AUTO_SEARCH_WINDOWS.map(windowLabel).join(', ');
  const baseSections: DisplayDetailSection[] = [
    {
      title: 'Numeric Method',
      lines: [
        'No supported exact form was found; showing validated approximate real roots.',
        `Method: ${NUMERIC_METHOD_NONLINEAR}.`,
        `Searched expanding real windows: ${searchedWindows}.`,
        'This is a bounded real search, not a proof of all real roots outside the searched range.',
      ],
    },
  ];

  if (classification.routeEvidence.length > 0) {
    baseSections.push({
      title: 'Numeric Route Evidence',
      lines: classification.routeEvidence,
    });
  }

  if (factLines.length > 0) {
    baseSections.push({
      title: 'Domain and Exclusions',
      lines: factLines,
    });
  }

  baseSections.push({
    title: 'Numeric Validation',
    lines: [
      `Accepted ${accepted.length} validated real root${accepted.length === 1 ? '' : 's'}.`,
      `Residual tolerance: ${NUMERIC_RESIDUAL_TOLERANCE}.`,
      ...residualLines(classification.zeroFormLatex, classification.selectedTarget, accepted),
      ...(rejectedCandidateCount > 0
        ? [`Rejected ${rejectedCandidateCount} candidate${rejectedCandidateCount === 1 ? '' : 's'}.`]
        : []),
    ],
  });

  const detailSections = appendExtraneousSolutionsDetailSection(
    mergeDetailSections([...baseSections, ...rejectedEvidence]),
    extraneousEvidenceFromRejectedCandidates([]),
  );

  if (accepted.length === 0) {
    return {
      kind: 'error',
      title: 'Solve',
      error: 'No validated real numeric roots were found in the bounded automatic search windows.',
      warnings: [],
      solutionKind: 'approximate-numeric',
      answerDomain: 'real',
      rejectedCandidateCount: rejectedCandidateCount > 0 ? rejectedCandidateCount : undefined,
      solveBadges: ['Candidate Checked'],
      numericMethod: NUMERIC_METHOD_NONLINEAR,
      detailSections,
    };
  }

  const targetLatex = equationTargetLatex(classification.selectedTarget);
  const formattedRoots = accepted.map((value) => formatApproxNumber(value));

  return {
    kind: 'success',
    title: 'Solve',
    exactLatex: approximateEquationLatex(targetLatex, accepted),
    approxText: approximateText(classification.selectedTarget, accepted),
    branchReadback: finiteBranchReadbackMetadata({
      targetLatex,
      relationLatex: '\\approx',
      branchesLatex: formattedRoots,
      source: 'equation-real-nonlinear-numeric-search',
    }),
    warnings: [],
    solutionKind: 'approximate-numeric',
    resultOrigin: 'numeric-fallback',
    answerDomain: 'real',
    solveBadges: ['Candidate Checked'],
    solveSummaryText: `${NUMERIC_METHOD_NONLINEAR}. Accepted ${accepted.length} validated real root${accepted.length === 1 ? '' : 's'}${rejectedCandidateCount > 0 ? `, rejected ${rejectedCandidateCount}.` : '.'}`,
    candidateValues: accepted,
    rejectedCandidateCount: rejectedCandidateCount > 0 ? rejectedCandidateCount : undefined,
    numericMethod: NUMERIC_METHOD_NONLINEAR,
    detailSections,
  };
}
