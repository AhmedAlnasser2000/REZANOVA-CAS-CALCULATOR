import { finiteBranchReadbackMetadata } from '../../display/branch-readback';
import { formatApproxNumber } from '../../display/format';
import { dedupeNumericRoots } from '../../equation/candidate-validation';
import { buildNumericConfidenceSection } from '../../equation/numeric-confidence-readback';
import {
  buildDomainProbeSection,
  buildExtraneousDiagnosticsSection,
  buildFactSection,
  buildSearchDiagnosticsSection,
  hardDomainFactLines,
  periodicStructureLines,
  piecewiseBreakpointLines,
  type NumericSearchWindowDiagnostic,
} from './numeric-search-diagnostics';
import { evaluateLatexAtTarget } from '../../equation/domain-guards';
import { equationTargetLatex } from '../../equation/equation-target';
import { runNumericIntervalSolve } from '../../equation/numeric-interval-solve';
import type {
  AngleUnit,
  CandidateValidationResult,
  DisplayDetailSection,
  DisplayOutcome,
  EquationDomainIntent,
  NumericSolveInterval,
} from '../../../types/calculator';
import { classifyEquationNumericShape } from './numeric-shape-classifier';
import { profileEquationResult } from '../../display/printer';
import { proseSolveSummary } from '../../display/result-detail-lines';
import { createEquationResultOutcome } from '../../equation/equation-solve-result';

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

function windowLabel(window: NumericSolveInterval) {
  return `[${window.start}, ${window.end}]`;
}

function numericRootKey(value: number) {
  return formatApproxNumber(value);
}

function rejectedCandidates(rejected: readonly CandidateValidationResult[]) {
  return rejected.filter((candidate): candidate is Extract<CandidateValidationResult, { kind: 'rejected' }> =>
    candidate.kind === 'rejected');
}

function rejectedCandidateKey(candidate: Extract<CandidateValidationResult, { kind: 'rejected' }>) {
  return `${formatApproxNumber(candidate.value)}|${candidate.reason}`;
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
  const rejectedCandidatesAcrossWindows: CandidateValidationResult[] = [];
  const windowDiagnostics: NumericSearchWindowDiagnostic[] = [];
  const seenRootKeys = new Set<string>();
  const seenRejectedKeys = new Set<string>();
  let stableStopped = false;

  for (const window of AUTO_SEARCH_WINDOWS) {
    const previousRootCount = seenRootKeys.size;
    const previousRejectedCount = seenRejectedKeys.size;
    const result = runNumericIntervalSolve(
      input.equationLatex,
      window,
      [],
      input.angleUnit,
      classification.selectedTarget,
    );
    if (result.kind === 'success') {
      acceptedRoots.push(...result.roots);
      for (const root of result.roots) {
        seenRootKeys.add(numericRootKey(root));
      }
    }
    const rejected = rejectedCandidates(result.rejectedCandidates ?? []);
    rejectedCandidatesAcrossWindows.push(...rejected);
    for (const candidate of rejected) {
      seenRejectedKeys.add(rejectedCandidateKey(candidate));
    }

    windowDiagnostics.push({
      label: windowLabel(window),
      roots: result.kind === 'success' ? result.roots : [],
      rejectedCandidates: rejected,
      diagnostics: result.diagnostics,
    });

    if (
      windowDiagnostics.length > 1
      && seenRootKeys.size === previousRootCount
      && seenRejectedKeys.size === previousRejectedCount
      && (seenRootKeys.size > 0 || seenRejectedKeys.size > 0)
    ) {
      stableStopped = true;
      break;
    }
  }

  const accepted = dedupeNumericRoots(acceptedRoots);
  const factLines = hardDomainFactLines(classification.domainFacts);
  const breakpointLines = piecewiseBreakpointLines(classification.domainFacts);
  const periodicLines = periodicStructureLines(classification.domainFacts);
  const rejectedCandidateCount = rejectedCandidatesAcrossWindows.length;
  const hasDomainSegmentationEvidence = factLines.length > 0
    || Boolean(classification.sampleProbe && classification.sampleProbe.undefinedSampleCount > 0)
    || windowDiagnostics.some((window) => window.diagnostics.discontinuityCellCount > 0);
  const baseSections: DisplayDetailSection[] = [
    {
      title: 'Numeric Method',
      lineKind: 'text',
      lines: [
        'No supported exact form was found; showing validated approximate real roots.',
        `Method: ${NUMERIC_METHOD_NONLINEAR}.`,
        'This is a bounded real search, not a proof of all real roots outside the searched range.',
      ],
    },
  ];
  const confidenceSection = buildNumericConfidenceSection([
    ...(accepted.length > 0 ? ['Validated roots from bounded search.'] : []),
    'Search may be incomplete outside the searched windows.',
    ...(hasDomainSegmentationEvidence ? ['Domain segmented around exclusions.'] : []),
    'Candidate roots validated against original equation.',
    ...(rejectedCandidateCount > 0 ? ['Higher precision recommended.'] : []),
  ]);
  if (confidenceSection) {
    baseSections.push(confidenceSection);
  }

  if (classification.routeEvidence.length > 0) {
    baseSections.push({
      title: 'Numeric Route Evidence',
      lineKind: 'text',
      lines: classification.routeEvidence,
    });
  }

  if (factLines.length > 0) {
    const section = buildFactSection('Domain and Exclusions', factLines);
    if (section) {
      baseSections.push(section);
    }
  }

  const breakpointSection = buildFactSection('Piecewise Breakpoints', breakpointLines);
  if (breakpointSection) {
    baseSections.push(breakpointSection);
  }

  const periodicSection = buildFactSection('Periodic Structure', periodicLines);
  if (periodicSection) {
    baseSections.push(periodicSection);
  }

  const domainProbeSection = buildDomainProbeSection(classification);
  if (domainProbeSection) {
    baseSections.push(domainProbeSection);
  }

  baseSections.push(buildSearchDiagnosticsSection({
    windows: windowDiagnostics,
    stableStopped,
  }));

  baseSections.push({
    title: 'Numeric Validation',
    lineKind: 'text',
    lines: [
      `Accepted ${accepted.length} validated real root${accepted.length === 1 ? '' : 's'}.`,
      `Residual tolerance: ${NUMERIC_RESIDUAL_TOLERANCE}.`,
      ...residualLines(classification.zeroFormLatex, classification.selectedTarget, accepted),
      ...(rejectedCandidateCount > 0
        ? [`Extraneous candidate attempts: ${rejectedCandidateCount}.`]
        : []),
    ],
  });

  const extraneousSection = buildExtraneousDiagnosticsSection(rejectedCandidatesAcrossWindows);
  const detailSections = extraneousSection ? [...baseSections, extraneousSection] : baseSections;

  if (accepted.length === 0) {
    return createEquationResultOutcome({
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
    });
  }

  const targetLatex = equationTargetLatex(classification.selectedTarget);
  const formattedRoots = accepted.map((value) => formatApproxNumber(value));

  return profileEquationResult(createEquationResultOutcome({
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
    ...proseSolveSummary(`${NUMERIC_METHOD_NONLINEAR}. Accepted ${accepted.length} validated real root${accepted.length === 1 ? '' : 's'}${rejectedCandidateCount > 0 ? `, marked ${rejectedCandidateCount} extraneous candidate attempt${rejectedCandidateCount === 1 ? '' : 's'}.` : '.'}`),
    candidateValues: accepted,
    rejectedCandidateCount: rejectedCandidateCount > 0 ? rejectedCandidateCount : undefined,
    numericMethod: NUMERIC_METHOD_NONLINEAR,
    detailSections,
  }));
}
