import type { ComplexSolveRegion, DisplayDetailSection, DisplayOutcome } from '../../../types/calculator';
import { runEquationMode } from './run';
import type { RunEquationModeRequest } from './types';

export type EquationComplexNumericScope =
  | 'global-polynomial'
  | 'bounded-region'
  | 'symbolic-family'
  | 'controlled-boundary'
  | 'locus-deferred';

export type EquationComplexEngineLabel =
  | 'exact-symbolic'
  | 'complex-polynomial-aberth'
  | 'complex-region-argument-principle'
  | 'complex-boundary-policy'
  | 'locus-deferred';

export type EquationComplexVerificationStatus =
  | 'global-polynomial'
  | 'contour-verified'
  | 'inconclusive'
  | 'unsafe'
  | 'not-applicable';

export type EquationComplexBranchPolicy =
  | 'not-applicable'
  | 'principal'
  | 'branch-family'
  | 'branch-safe'
  | 'branch-unsafe'
  | 'pole-aware'
  | 'locus-deferred';

export type EquationComplexBenchmarkRegionEvidence = {
  re_min: string;
  re_max: string;
  im_min: string;
  im_max: string;
  grid_size?: number;
  random_seed_count?: number;
  contour_samples?: number;
  subdivision_depth?: number;
  cell_budget?: number;
};

export type EquationComplexBenchmarkEvidence = {
  complex_numeric_scope: EquationComplexNumericScope;
  complex_engine: EquationComplexEngineLabel;
  complex_verification_status: EquationComplexVerificationStatus;
  complex_branch_policy: EquationComplexBranchPolicy;
  complex_region?: EquationComplexBenchmarkRegionEvidence;
  complex_contour_root_count?: number;
  complex_candidate_count?: number;
  complex_searched_region_notes?: string;
};

export type EquationComplexBenchmarkAttempt = {
  region: ComplexSolveRegion;
  outcome: DisplayOutcome;
  evidence: EquationComplexBenchmarkEvidence;
};

export type EquationComplexBenchmarkRunStatus =
  | 'primary-supported'
  | 'primary-controlled-stop'
  | 'bounded-region-supported'
  | 'bounded-region-zero-roots'
  | 'bounded-region-controlled-stop';

export type EquationComplexBenchmarkRunResult = {
  outcome: DisplayOutcome;
  status: EquationComplexBenchmarkRunStatus;
  evidence?: EquationComplexBenchmarkEvidence;
  attemptedRegions: EquationComplexBenchmarkAttempt[];
};

export const DEFAULT_COMPLEX_BENCHMARK_REGION_BOXES: readonly ComplexSolveRegion[] = [
  { reMin: '-2', reMax: '2', imMin: '-2', imMax: '2' },
  { reMin: '-10', reMax: '10', imMin: '-10', imMax: '10' },
] as const;

function detailSections(outcome: DisplayOutcome): readonly DisplayDetailSection[] {
  return outcome.kind === 'prompt' ? [] : outcome.detailSections ?? [];
}

function sectionLines(outcome: DisplayOutcome, title: string) {
  return detailSections(outcome).find((section) => section.title === title)?.lines ?? [];
}

function allDetailLines(outcome: DisplayOutcome) {
  return detailSections(outcome).flatMap((section) => section.lines);
}

function parseIntegerFromLines(lines: readonly string[], pattern: RegExp) {
  for (const line of lines) {
    const match = line.match(pattern);
    if (match?.[1]) {
      return Number.parseInt(match[1], 10);
    }
  }
  return undefined;
}

function regionEvidence(region: ComplexSolveRegion): EquationComplexBenchmarkRegionEvidence {
  return {
    re_min: region.reMin,
    re_max: region.reMax,
    im_min: region.imMin,
    im_max: region.imMax,
    ...(region.gridSize === undefined ? {} : { grid_size: region.gridSize }),
    ...(region.randomSeedCount === undefined ? {} : { random_seed_count: region.randomSeedCount }),
    ...(region.samplesPerEdge === undefined ? {} : { contour_samples: region.samplesPerEdge }),
    ...(region.subdivisionDepth === undefined ? {} : { subdivision_depth: region.subdivisionDepth }),
    ...(region.cellBudget === undefined ? {} : { cell_budget: region.cellBudget }),
  };
}

function searchedRegionNote(region: ComplexSolveRegion, index: number, total: number) {
  return `Benchmark staged region ${index + 1}/${total}: [${region.reMin}, ${region.reMax}] x [${region.imMin}, ${region.imMax}].`;
}

function boundedRegionNotes(input: {
  outcome: DisplayOutcome;
  region: ComplexSolveRegion;
  index: number;
  total: number;
}) {
  const familyLines = sectionLines(input.outcome, 'Complex Infinite-Family Policy');
  const hasInfiniteFamily = familyLines.some((line) => /not a global solution set|infinite-family carrier/i.test(line));
  return [
    searchedRegionNote(input.region, input.index, input.total),
    ...(hasInfiniteFamily
      ? ['Infinite-family policy: bounded-region evidence enumerates only roots inside the selected rectangle.']
      : []),
  ].join(' ');
}

function globalPolynomialEvidence(outcome: DisplayOutcome): EquationComplexBenchmarkEvidence | undefined {
  if (
    outcome.kind !== 'success'
    || outcome.answerDomain !== 'complex'
    || outcome.solutionKind !== 'approximate-numeric'
    || (outcome.numericMethod !== 'Complex numeric polynomial roots'
      && outcome.numericMethod !== 'Complex numeric rational roots')
  ) {
    return undefined;
  }

  const evidenceLines = sectionLines(outcome, 'Global Complex Polynomial Evidence');
  const candidateCount = parseIntegerFromLines(evidenceLines, /Accepted distinct roots:\s*(\d+);/);
  return {
    complex_numeric_scope: 'global-polynomial',
    complex_engine: 'complex-polynomial-aberth',
    complex_verification_status: 'global-polynomial',
    complex_branch_policy: outcome.numericMethod === 'Complex numeric rational roots'
      ? 'pole-aware'
      : 'not-applicable',
    ...(candidateCount === undefined ? {} : { complex_candidate_count: candidateCount }),
  };
}

function symbolicFamilyEvidence(outcome: DisplayOutcome): EquationComplexBenchmarkEvidence | undefined {
  if (
    outcome.kind !== 'success'
    || outcome.solutionKind === 'approximate-numeric'
  ) {
    return undefined;
  }
  const exactFamilyLatex = [
    outcome.exactLatex,
    ...(outcome.exactSupplementLatex ?? []),
  ].some((entry) => /[a-zA-Z]\\in\\mathbb\{Z\}/u.test(entry ?? ''));
  if (!outcome.periodicFamily && outcome.branchReadback?.label !== 'Complex Branch Family' && !exactFamilyLatex) {
    return undefined;
  }
  return {
    complex_numeric_scope: 'symbolic-family',
    complex_engine: 'exact-symbolic',
    complex_verification_status: 'not-applicable',
    complex_branch_policy: 'branch-family',
    ...(outcome.branchReadback?.branchesLatex
      ? { complex_candidate_count: outcome.branchReadback.branchesLatex.length }
      : {}),
  };
}

function controlledBoundaryEvidence(outcome: DisplayOutcome): EquationComplexBenchmarkEvidence | undefined {
  if (
    outcome.kind !== 'success'
    || sectionLines(outcome, 'Complex Abs Boundary').length === 0
  ) {
    return undefined;
  }
  return {
    complex_numeric_scope: 'controlled-boundary',
    complex_engine: 'complex-boundary-policy',
    complex_verification_status: 'not-applicable',
    complex_branch_policy: 'locus-deferred',
    complex_candidate_count: 0,
    complex_searched_region_notes: 'Controlled Complex boundary evidence; no bounded-region numeric search was run.',
  };
}

function locusDeferredEvidence(outcome: DisplayOutcome): EquationComplexBenchmarkEvidence | undefined {
  const locusLines = sectionLines(outcome, 'Complex Locus Policy');
  if (outcome.kind !== 'error' || locusLines.length === 0) {
    return undefined;
  }
  return {
    complex_numeric_scope: 'locus-deferred',
    complex_engine: 'locus-deferred',
    complex_verification_status: 'not-applicable',
    complex_branch_policy: 'locus-deferred',
    complex_searched_region_notes: 'Non-holomorphic Complex locus case; analytic bounded-region numeric solving was not run.',
  };
}

function primaryEvidence(outcome: DisplayOutcome): EquationComplexBenchmarkEvidence | undefined {
  return globalPolynomialEvidence(outcome)
    ?? symbolicFamilyEvidence(outcome)
    ?? controlledBoundaryEvidence(outcome)
    ?? locusDeferredEvidence(outcome);
}

function boundedRegionEvidence(
  outcome: DisplayOutcome,
  region: ComplexSolveRegion,
  index: number,
  total: number,
): EquationComplexBenchmarkEvidence {
  const contourLines = sectionLines(outcome, 'Complex Contour Verification');
  const contourRootCount = parseIntegerFromLines(contourLines, /Contour count verified:\s*(\d+)\s*root/)
    ?? parseIntegerFromLines(contourLines, /Contour root count estimate:\s*(\d+)\./);
  const candidateCount = parseIntegerFromLines(contourLines, /Candidate count:\s*(\d+)\./);
  const allLines = allDetailLines(outcome);
  const branchUnsafe = outcome.kind === 'error'
    && (/branch cut/i.test(outcome.error) || allLines.some((line) => /branch cut|branch point/i.test(line)));
  const contourVerified = contourLines.some((line) => line.startsWith('Contour count verified:'));
  const unsafe = branchUnsafe
    || (outcome.kind === 'error' && /unsafe/i.test(outcome.error))
    || contourLines.some((line) => /unsafe/i.test(line));

  return {
    complex_numeric_scope: 'bounded-region',
    complex_engine: 'complex-region-argument-principle',
    complex_verification_status: contourVerified
      ? 'contour-verified'
      : unsafe
        ? 'unsafe'
        : 'inconclusive',
    complex_branch_policy: branchUnsafe ? 'branch-unsafe' : 'principal',
    complex_region: regionEvidence(region),
    ...(contourRootCount === undefined ? {} : { complex_contour_root_count: contourRootCount }),
    ...(candidateCount === undefined ? {} : { complex_candidate_count: candidateCount }),
    complex_searched_region_notes: boundedRegionNotes({ outcome, region, index, total }),
  };
}

function isVerifiedZeroRootRegion(evidence: EquationComplexBenchmarkEvidence) {
  return evidence.complex_verification_status === 'contour-verified'
    && evidence.complex_contour_root_count === 0
    && evidence.complex_candidate_count === 0;
}

function isVerifiedSupportedRegion(outcome: DisplayOutcome, evidence: EquationComplexBenchmarkEvidence) {
  return outcome.kind === 'success'
    && evidence.complex_verification_status === 'contour-verified'
    && evidence.complex_contour_root_count === evidence.complex_candidate_count;
}

export function runEquationComplexBenchmarkRegionFallback(
  request: RunEquationModeRequest,
  options: {
    regions?: readonly ComplexSolveRegion[];
  } = {},
): EquationComplexBenchmarkRunResult {
  const primaryOutcome = runEquationMode({
    ...request,
    equationDomainIntent: 'complex',
    complexRegion: undefined,
  });
  const evidence = primaryEvidence(primaryOutcome);
  if (primaryOutcome.kind === 'success') {
    return {
      outcome: primaryOutcome,
      status: 'primary-supported',
      evidence,
      attemptedRegions: [],
    };
  }
  if (evidence?.complex_numeric_scope === 'locus-deferred') {
    return {
      outcome: primaryOutcome,
      status: 'primary-controlled-stop',
      evidence,
      attemptedRegions: [],
    };
  }

  const regions = options.regions ?? DEFAULT_COMPLEX_BENCHMARK_REGION_BOXES;
  const attemptedRegions: EquationComplexBenchmarkAttempt[] = [];
  for (let index = 0; index < regions.length; index += 1) {
    const region = regions[index];
    const outcome = runEquationMode({
      ...request,
      equationDomainIntent: 'complex',
      complexRegion: region,
    });
    const regionRunEvidence = boundedRegionEvidence(outcome, region, index, regions.length);
    attemptedRegions.push({
      region,
      outcome,
      evidence: regionRunEvidence,
    });

    if (isVerifiedSupportedRegion(outcome, regionRunEvidence)) {
      return {
        outcome,
        status: 'bounded-region-supported',
        evidence: regionRunEvidence,
        attemptedRegions,
      };
    }

    if (regionRunEvidence.complex_branch_policy === 'branch-unsafe') {
      return {
        outcome,
        status: 'bounded-region-controlled-stop',
        evidence: regionRunEvidence,
        attemptedRegions,
      };
    }
  }

  const lastAttempt = attemptedRegions.at(-1);
  if (lastAttempt && isVerifiedZeroRootRegion(lastAttempt.evidence)) {
    return {
      outcome: lastAttempt.outcome,
      status: 'bounded-region-zero-roots',
      evidence: lastAttempt.evidence,
      attemptedRegions,
    };
  }

  return {
    outcome: lastAttempt?.outcome ?? primaryOutcome,
    status: lastAttempt ? 'bounded-region-controlled-stop' : 'primary-controlled-stop',
    evidence: lastAttempt?.evidence,
    attemptedRegions,
  };
}
