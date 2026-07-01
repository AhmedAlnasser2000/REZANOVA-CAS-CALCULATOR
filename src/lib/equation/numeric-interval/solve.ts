import type {
  AngleUnit,
  DisplayDetailSection,
  NumericSolveInterval,
  SolveDomainConstraint,
} from '../../../types/calculator';
import { buildAbsoluteValueNumericGuidance } from '../../algebra/abs-core';
import { dedupeNumericRoots, validateCandidateRoots } from '../candidate-validation';
import {
  appendExtraneousSolutionsDetailSection,
  extraneousEvidenceFromRejectedCandidates,
} from '../candidate/extraneous';
import { formatApproxNumber } from '../../display/format';
import { createLatexTargetEvaluator, equationToZeroFormLatex } from '../domain-guards';
import {
  buildEquationNumericSegmentationPlan,
  detectEquationNumericPeriodicIntervalSummaries,
  type EquationNumericSegmentationPlan,
} from '../numeric-domain-segmentation';
import { numericSummary, parseInterval } from './interval';
import { intervalNewtonPruneCell } from './newton-pruning';
import { bisectRoot, finiteValue, localAbsMinimumCandidate, type NumericValueEvaluator } from './sampling';
import { buildTrigNoRootGuidance } from './trig-guidance';
import {
  ADAPTIVE_MAX_EXTRA_SAMPLES,
  ADAPTIVE_REFINEMENT_FACTOR,
  EMPTY_NUMERIC_DIAGNOSTICS,
  LOCAL_MIN_ACCEPT_TOLERANCE,
  LOCAL_MIN_SEED_TOLERANCE,
  NUMERIC_METHOD_LABEL,
  SAMPLE_ZERO_TOLERANCE,
  type NumericDiagnostics,
  type NumericIntervalSolveResult,
  type SamplePoint,
} from './types';

export type { NumericIntervalSolveResult } from './types';

type GridPoint = {
  x: number;
  value: number | null;
};

function isNearAny(value: number, pool: number[], tolerance = 1e-6) {
  return pool.some((candidate) => Math.abs(candidate - value) <= tolerance);
}

function isDensePeriodicCandidate(equationLatex: string) {
  return /\\(?:sin|cos|tan|ln|log)\b/.test(equationLatex);
}

function sampleGridPoint(
  zeroFormLatex: string,
  x: number,
  angleUnit: AngleUnit,
  target: string,
  evaluator?: NumericValueEvaluator,
): GridPoint {
  return { x, value: finiteValue(zeroFormLatex, x, angleUnit, target, evaluator) };
}

function appendLocalMinSeeds(
  samples: SamplePoint[],
  zeroFormLatex: string,
  angleUnit: AngleUnit,
  localMinSeeds: number[],
  target: string,
  evaluator?: NumericValueEvaluator,
) {
  for (let index = 1; index < samples.length - 1; index += 1) {
    const left = samples[index - 1];
    const middle = samples[index];
    const right = samples[index + 1];
    const leftAbs = Math.abs(left.value);
    const middleAbs = Math.abs(middle.value);
    const rightAbs = Math.abs(right.value);

    if (middleAbs > LOCAL_MIN_SEED_TOLERANCE) {
      continue;
    }
    if (!(middleAbs <= leftAbs && middleAbs <= rightAbs)) {
      continue;
    }

    const localCandidate = localAbsMinimumCandidate(zeroFormLatex, left.x, right.x, angleUnit, target, evaluator);
    if (!localCandidate) {
      continue;
    }
    if (Math.abs(localCandidate.value) <= LOCAL_MIN_ACCEPT_TOLERANCE) {
      localMinSeeds.push(localCandidate.x);
    }
  }
}

function estimateUnresolvedSignChangeSeed(
  zeroFormLatex: string,
  left: SamplePoint,
  right: SamplePoint,
  angleUnit: AngleUnit,
  target: string,
  evaluator?: NumericValueEvaluator,
) {
  let lo = left.x;
  let hi = right.x;
  let loValue = left.value;

  for (let iteration = 0; iteration < 40; iteration += 1) {
    const midpoint = (lo + hi) / 2;
    const midpointValue = finiteValue(zeroFormLatex, midpoint, angleUnit, target, evaluator);
    if (midpointValue === null) {
      return midpoint;
    }
    if (Math.abs(hi - lo) <= 1e-8) {
      return midpoint;
    }
    if (loValue * midpointValue <= 0) {
      hi = midpoint;
    } else {
      lo = midpoint;
      loValue = midpointValue;
    }
  }

  return (lo + hi) / 2;
}

function collectCandidateEvidence(
  grid: GridPoint[],
  zeroFormLatex: string,
  angleUnit: AngleUnit,
  target: string,
  evaluator?: NumericValueEvaluator,
) {
  const sampleHits: number[] = [];
  const signBracketRoots: number[] = [];
  const unresolvedBracketSeeds: number[] = [];
  const localMinSeeds: number[] = [];
  let previousFinite: SamplePoint | null = null;
  let contiguousSamples: SamplePoint[] = [];

  for (const point of grid) {
    if (point.value === null) {
      appendLocalMinSeeds(contiguousSamples, zeroFormLatex, angleUnit, localMinSeeds, target, evaluator);
      previousFinite = null;
      contiguousSamples = [];
      continue;
    }

    const sample = { x: point.x, value: point.value };
    contiguousSamples.push(sample);

    if (Math.abs(point.value) <= SAMPLE_ZERO_TOLERANCE) {
      sampleHits.push(point.x);
    }

    if (previousFinite && previousFinite.value * point.value < 0) {
      const root = bisectRoot(zeroFormLatex, previousFinite.x, point.x, angleUnit, target, evaluator);
      if (root !== null) {
        signBracketRoots.push(root);
      } else {
        unresolvedBracketSeeds.push(estimateUnresolvedSignChangeSeed(
          zeroFormLatex,
          previousFinite,
          sample,
          angleUnit,
          target,
          evaluator,
        ));
      }
    }

    previousFinite = sample;
  }

  appendLocalMinSeeds(contiguousSamples, zeroFormLatex, angleUnit, localMinSeeds, target, evaluator);

  return {
    sampleHits,
    signBracketRoots,
    unresolvedBracketSeeds,
    localMinSeeds,
  };
}

function shouldRefineCell(left: GridPoint, right: GridPoint, densePeriodic: boolean) {
  if (left.value === null || right.value === null) {
    return true;
  }

  const leftAbs = Math.abs(left.value);
  const rightAbs = Math.abs(right.value);
  const minAbs = Math.min(leftAbs, rightAbs);
  const maxAbs = Math.max(leftAbs, rightAbs);

  if (densePeriodic) {
    return true;
  }
  if (left.value * right.value < 0) {
    return true;
  }
  if (minAbs <= LOCAL_MIN_SEED_TOLERANCE * 2) {
    return true;
  }

  return maxAbs > 1 && maxAbs / Math.max(minAbs, SAMPLE_ZERO_TOLERANCE) > 20;
}

function buildAdaptiveGrid(
  zeroFormLatex: string,
  start: number,
  end: number,
  subdivisions: number,
  equationLatex: string,
  angleUnit: AngleUnit,
  target: string,
  evaluator?: NumericValueEvaluator,
  extraSamplePoints: readonly number[] = [],
) {
  const step = (end - start) / subdivisions;
  const gridByX = new Map<string, GridPoint>();
  const baseGrid: GridPoint[] = [];

  for (let index = 0; index <= subdivisions; index += 1) {
    const point = sampleGridPoint(zeroFormLatex, start + step * index, angleUnit, target, evaluator);
    baseGrid.push(point);
    gridByX.set(point.x.toPrecision(17), point);
  }

  for (const samplePoint of extraSamplePoints) {
    if (samplePoint <= start || samplePoint >= end) {
      continue;
    }
    const key = samplePoint.toPrecision(17);
    if (!gridByX.has(key)) {
      gridByX.set(key, sampleGridPoint(zeroFormLatex, samplePoint, angleUnit, target, evaluator));
    }
  }

  const densePeriodic = isDensePeriodicCandidate(equationLatex);
  let adaptiveSampleCount = 0;
  let refinedCellCount = 0;
  let newtonPrunedCellCount = 0;
  let discontinuityCellCount = 0;

  for (let index = 0; index < baseGrid.length - 1; index += 1) {
    const left = baseGrid[index];
    const right = baseGrid[index + 1];
    const discontinuityLike = left.value === null || right.value === null;
    if (discontinuityLike) {
      discontinuityCellCount += 1;
    }
    if (!densePeriodic && left.value !== null && right.value !== null && left.value * right.value >= 0) {
      const pruned = intervalNewtonPruneCell({
        left: left.x,
        right: right.x,
        leftValue: left.value,
        rightValue: right.value,
        evaluator: (value) => finiteValue(zeroFormLatex, value, angleUnit, target, evaluator),
      });
      if (pruned.kind === 'pruned') {
        newtonPrunedCellCount += 1;
        continue;
      }
    }
    if (!shouldRefineCell(left, right, densePeriodic)) {
      continue;
    }
    if (adaptiveSampleCount >= ADAPTIVE_MAX_EXTRA_SAMPLES) {
      break;
    }

    refinedCellCount += 1;
    for (let refinement = 1; refinement < ADAPTIVE_REFINEMENT_FACTOR; refinement += 1) {
      if (adaptiveSampleCount >= ADAPTIVE_MAX_EXTRA_SAMPLES) {
        break;
      }
      const x = left.x + ((right.x - left.x) * refinement) / ADAPTIVE_REFINEMENT_FACTOR;
      const key = x.toPrecision(17);
      if (gridByX.has(key)) {
        continue;
      }
      const point = sampleGridPoint(zeroFormLatex, x, angleUnit, target, evaluator);
      gridByX.set(key, point);
      adaptiveSampleCount += 1;
    }
  }

  const grid = [...gridByX.values()].sort((left, right) => left.x - right.x);

  return {
    grid,
    adaptiveSampleCount,
    refinedCellCount,
    newtonPrunedCellCount,
    discontinuityCellCount,
  };
}

function formatBoundaryValues(values: readonly number[]) {
  const visible = values.slice(0, 8).map((value) => formatApproxNumber(value));
  return values.length > visible.length
    ? `${visible.join(', ')}; ${values.length - visible.length} more`
    : visible.join(', ');
}

function intervalArithmeticLines(plan: EquationNumericSegmentationPlan) {
  const summary = plan.intervalArithmetic;
  if (summary.classifications.length === 0) {
    return [];
  }
  const visibleEvidence = summary.classifications
    .filter((classification) => classification.status !== 'safe')
    .slice(0, 4)
    .map((classification) => classification.evidence);
  return [
    `Interval arithmetic domain status: ${summary.status} (${summary.safeCount} safe, ${summary.splitRequiredCount} split-required, ${summary.invalidCount} invalid, ${summary.unknownCount} unknown).`,
    ...visibleEvidence,
    ...(summary.classifications.length > visibleEvidence.length + summary.safeCount
      ? [`${summary.classifications.length - visibleEvidence.length - summary.safeCount} additional interval domain check(s) omitted.`]
      : []),
  ];
}

function numericSegmentationDetailSections(plan: EquationNumericSegmentationPlan): DisplayDetailSection[] {
  const arithmeticLines = intervalArithmeticLines(plan);
  if (plan.boundaries.length === 0 && arithmeticLines.length === 0) {
    return [];
  }

  const grouped = new Map<string, number[]>();
  for (const boundary of plan.boundaries) {
    grouped.set(boundary.kind, [...(grouped.get(boundary.kind) ?? []), boundary.value]);
  }

  return [{
    title: 'Numeric Segmentation',
    lines: [
      ...arithmeticLines,
      `Boundary probes inside the interval: ${formatBoundaryValues(plan.gridBreakpoints)}.`,
      ...[...grouped.entries()].map(([kind, values]) =>
        `${kind}: ${formatBoundaryValues(values)}.`),
      plan.excludedBoundaryCandidates.length > 0
        ? `Excluded boundary candidates checked by validation: ${formatBoundaryValues(plan.excludedBoundaryCandidates)}.`
        : 'Boundary probes guide interval splitting and sampling; they are not global domain proofs.',
    ],
  }];
}

function numericPeriodicIntervalDetailSections(input: {
  equationLatex: string;
  target: string;
  angleUnit: AngleUnit;
  start: number;
  end: number;
  acceptedRootCount: number;
}): DisplayDetailSection[] {
  const summaries = detectEquationNumericPeriodicIntervalSummaries({
    equationLatex: input.equationLatex,
    target: input.target,
    angleUnit: input.angleUnit,
    start: input.start,
    end: input.end,
  });
  if (summaries.length === 0) {
    return [];
  }

  const visible = summaries.slice(0, 4);
  return [{
    title: 'Periodic Interval Summary',
    lines: [
      ...visible.map((summary) =>
        `${summary.operator}(${summary.carrierLatex}) carrier repeats every about ${formatApproxNumber(summary.targetPeriod)} in ${input.target}; this interval spans about ${formatApproxNumber(summary.intervalPeriodCount)} carrier period(s).`),
      ...(summaries.length > visible.length
        ? [`${summaries.length - visible.length} additional periodic carrier summary item(s) omitted.`]
        : []),
      `Accepted ${input.acceptedRootCount} validated local root(s) in the chosen interval.`,
      'Carrier periods guide interval sampling only; roots are still checked against the original equation.',
    ],
  }];
}

function numericConditioningDetailSections(input: {
  segmentation: EquationNumericSegmentationPlan;
  diagnostics: NumericDiagnostics;
}): DisplayDetailSection[] {
  const boundaryCount = input.segmentation.boundaries.length;
  const excludedCount = input.segmentation.excludedBoundaryCandidates.length;
  const intervalSplitCount = input.segmentation.intervalArithmetic.splitRequiredCount;
  const intervalInvalidCount = input.segmentation.intervalArithmetic.invalidCount;
  const intervalUnknownCount = input.segmentation.intervalArithmetic.unknownCount;
  const complexityLines = [
    `Segment complexity: ${boundaryCount} boundary probe${boundaryCount === 1 ? '' : 's'}, ${excludedCount} excluded boundary candidate${excludedCount === 1 ? '' : 's'}.`,
    `Interval arithmetic complexity: ${intervalSplitCount} split-required, ${intervalInvalidCount} invalid, ${intervalUnknownCount} unknown domain check${intervalSplitCount + intervalInvalidCount + intervalUnknownCount === 1 ? '' : 's'}.`,
    `Adaptive complexity: ${input.diagnostics.refinedCellCount} refined cell${input.diagnostics.refinedCellCount === 1 ? '' : 's'}, ${input.diagnostics.adaptiveSampleCount} adaptive sample${input.diagnostics.adaptiveSampleCount === 1 ? '' : 's'}, ${input.diagnostics.newtonPrunedCellCount} interval-Newton pruned cell${input.diagnostics.newtonPrunedCellCount === 1 ? '' : 's'}.`,
    `Discontinuity cells: ${input.diagnostics.discontinuityCellCount}.`,
  ];
  const needsGuidance =
    boundaryCount >= 4
    || excludedCount > 0
    || intervalSplitCount > 0
    || intervalInvalidCount > 0
    || input.diagnostics.discontinuityCellCount > 0
    || input.diagnostics.newtonPrunedCellCount > 0
    || input.diagnostics.adaptiveSampleCount >= ADAPTIVE_MAX_EXTRA_SAMPLES;

  if (
    boundaryCount === 0
    && intervalSplitCount === 0
    && intervalInvalidCount === 0
    && intervalUnknownCount === 0
    && input.diagnostics.refinedCellCount === 0
    && input.diagnostics.newtonPrunedCellCount === 0
    && input.diagnostics.discontinuityCellCount === 0
  ) {
    return [];
  }

  return [{
    title: 'Numeric Conditioning',
    lines: [
      ...complexityLines,
      ...(needsGuidance
        ? ['Higher precision or a narrower interval is recommended if nearby discontinuities or clustered candidates affect the result.']
        : []),
    ],
  }];
}

export function runNumericIntervalSolve(
  equationLatex: string,
  interval: NumericSolveInterval,
  constraints: SolveDomainConstraint[] = [],
  angleUnit: AngleUnit = 'rad',
  target = 'x',
): NumericIntervalSolveResult {
  const parsed = parseInterval(interval);

  if (parsed.kind === 'error') {
    return {
      kind: 'error',
      error: parsed.error,
      summaryText: `Numeric solve unavailable (${NUMERIC_METHOD_LABEL}).`,
      method: NUMERIC_METHOD_LABEL,
      diagnostics: EMPTY_NUMERIC_DIAGNOSTICS,
    };
  }

  const zeroFormLatex = equationToZeroFormLatex(equationLatex);
  const parsedEvaluator = createLatexTargetEvaluator(zeroFormLatex, target, angleUnit);
  const evaluator: NumericValueEvaluator = (value) => {
    const evaluated = parsedEvaluator(value);
    return evaluated.value !== null && Number.isFinite(evaluated.value) ? evaluated.value : null;
  };
  const segmentation = buildEquationNumericSegmentationPlan({
    equationLatex,
    zeroFormLatex,
    target,
    start: parsed.start,
    end: parsed.end,
    angleUnit,
  });
  const {
    grid,
    adaptiveSampleCount,
    refinedCellCount,
    newtonPrunedCellCount,
    discontinuityCellCount,
  } = buildAdaptiveGrid(
    zeroFormLatex,
    parsed.start,
    parsed.end,
    parsed.subdivisions,
    equationLatex,
    angleUnit,
    target,
    evaluator,
    segmentation.gridBreakpoints,
  );
  const {
    sampleHits,
    signBracketRoots,
    unresolvedBracketSeeds,
    localMinSeeds,
  } = collectCandidateEvidence(grid, zeroFormLatex, angleUnit, target, evaluator);

  const allCandidates = dedupeNumericRoots([
    ...sampleHits,
    ...signBracketRoots,
    ...segmentation.excludedBoundaryCandidates,
    ...unresolvedBracketSeeds,
    ...localMinSeeds,
  ]);

  const validated = validateCandidateRoots(
    equationLatex,
    allCandidates,
    constraints,
    'numeric-interval',
    angleUnit,
    target,
  );
  const recoveredCandidateCount = validated.accepted.filter((value) =>
    isNearAny(value, localMinSeeds) && !isNearAny(value, [...sampleHits, ...signBracketRoots])).length;

  const diagnostics: NumericDiagnostics = {
    sampleHitCount: sampleHits.length,
    signBracketCount: signBracketRoots.length,
    localMinSeedCount: localMinSeeds.length,
    adaptiveSampleCount,
    refinedCellCount,
    newtonPrunedCellCount,
    discontinuityCellCount,
    recoveredCandidateCount,
  };

  const summary = numericSummary(interval, parsed.subdivisions, diagnostics);

  if (validated.accepted.length === 0) {
    const noSeededCandidates = allCandidates.length === 0;
    const guidance = 'This is a local interval search, not a proof that no roots exist elsewhere. Try a suggested interval from exact output when available, widen or shift the interval, or increase subdivisions for dense or nested periodic cases.';
    const rejectedGuidance = 'Discontinuities, domain holes, or residual validation can reject numeric candidates; try a suggested interval, shift the interval away from a discontinuity, or increase subdivisions.';
    const discontinuityGuidance = discontinuityCellCount > 0
      ? ' The interval crossed undefined or non-real samples; move bounds away from discontinuities or domain holes.'
      : '';
    const trigGuidance = noSeededCandidates
      ? buildTrigNoRootGuidance(equationLatex, parsed.start, parsed.end, parsed.subdivisions, angleUnit)
      : null;
    const absGuidance = noSeededCandidates
      ? buildAbsoluteValueNumericGuidance(
        equationLatex,
        parsed.start,
        parsed.end,
        parsed.subdivisions,
        angleUnit,
      )
      : null;
    return {
      kind: 'error',
      error: noSeededCandidates
        ? `No bracketed or near-zero real roots were found on the chosen interval. ${guidance}${discontinuityGuidance}${trigGuidance ? ` ${trigGuidance}` : ''}${absGuidance ? ` ${absGuidance}` : ''}`
        : `Candidate roots were found but rejected after substitution back into the original equation. ${rejectedGuidance}${discontinuityGuidance}`,
      rejectedCandidateCount: validated.rejected.length,
      rejectedCandidates: validated.rejected,
      detailSections: appendExtraneousSolutionsDetailSection(
        [
          ...numericPeriodicIntervalDetailSections({
            equationLatex,
            target,
            angleUnit,
            start: parsed.start,
            end: parsed.end,
            acceptedRootCount: 0,
          }),
          ...numericSegmentationDetailSections(segmentation),
          ...numericConditioningDetailSections({ segmentation, diagnostics }),
        ],
        extraneousEvidenceFromRejectedCandidates(validated.rejected),
      ),
      summaryText: summary,
      method: NUMERIC_METHOD_LABEL,
      diagnostics,
    };
  }

  const accepted = dedupeNumericRoots(validated.accepted);
  return {
    kind: 'success',
    roots: accepted,
    rejectedCandidateCount: validated.rejected.length,
    rejectedCandidates: validated.rejected,
    detailSections: appendExtraneousSolutionsDetailSection(
      [
        ...numericPeriodicIntervalDetailSections({
          equationLatex,
          target,
          angleUnit,
          start: parsed.start,
          end: parsed.end,
          acceptedRootCount: accepted.length,
        }),
        ...numericSegmentationDetailSections(segmentation),
        ...numericConditioningDetailSections({ segmentation, diagnostics }),
      ],
      extraneousEvidenceFromRejectedCandidates(validated.rejected),
    ),
    summaryText: `${summary} Accepted ${accepted.length} root(s)${validated.rejected.length > 0 ? `, rejected ${validated.rejected.length}.` : '.'}${recoveredCandidateCount > 0 ? ` Recovered ${recoveredCandidateCount} non-bracket root(s).` : ''}`,
    method: NUMERIC_METHOD_LABEL,
    diagnostics,
  };
}
