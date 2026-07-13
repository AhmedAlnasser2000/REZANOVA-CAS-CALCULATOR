import type {
  DisplayDetailLinePart,
  DisplayDetailSection,
  DisplayOutcome,
  StatisticsRequest,
} from '../../types/calculator';
import {
  tryProvenCanonicalMathValue,
  type CanonicalResultProducerMathValuesV1,
  type ProvenCanonicalMathValue,
} from '../result-contract';
import type { MathJsonRouteId } from '../result-contract/mathjson-route-registry';
import { roundedApproxNumberValue } from '../display/notation/numeric-output';
import type { MeanInferenceSummary } from './inference';
import type { RegressionDiagnostics, RegressionFitSummary } from './quality-readback';
import { formatStatisticsNumber } from './shared';

export type StatisticsMathJsonRouteId = Extract<MathJsonRouteId, `statistics.${string}`>;

export type StatisticsOwnedMathJsonLeaf = {
  canonicalLatex: string;
  mathJson: unknown;
  source: string;
};

type DescriptiveMathJsonSummary = MeanInferenceSummary & {
  sum: number;
  median: number;
  min: number;
  max: number;
  range: number;
  variance: number;
  standardDeviation: number;
};

function statisticsMathNumber(value: number) {
  if (!Number.isFinite(value)) return undefined;
  const normalized = Math.abs(value) < 1e-10 ? 0 : value;
  return Number(normalized.toFixed(6));
}

function primaryMathJsonLeaf(canonicalLatex: string, mathJson: unknown, source: string) {
  return [{ canonicalLatex, mathJson, source } satisfies StatisticsOwnedMathJsonLeaf];
}

function mathSequence(...values: unknown[]) {
  return ['Delimiter', ['Sequence', ...values], "','"];
}

export function descriptiveSummaryMathJsonLeaves(
  canonicalLatex: string,
  summary: DescriptiveMathJsonSummary,
) {
  const relations: unknown[] = [
    ['Equal', 'n', summary.count],
    ['Equal', ['Reduce', 'x', 'Add'], statisticsMathNumber(summary.sum)],
    ['Equal', ['Mean', 'x'], statisticsMathNumber(summary.mean)],
    ['Equal', 'Median', statisticsMathNumber(summary.median)],
    ['Equal', 'Min', statisticsMathNumber(summary.min)],
    ['Equal', 'Max', statisticsMathNumber(summary.max)],
    ['Equal', 'range', statisticsMathNumber(summary.range)],
    ['Equal', ['Power', 'sigma', 2], statisticsMathNumber(summary.variance)],
    ['Equal', 'sigma', statisticsMathNumber(summary.standardDeviation)],
  ];
  if (summary.sampleVariance !== null) {
    relations.push(['Equal', ['Power', 's', 2], statisticsMathNumber(summary.sampleVariance)]);
  }
  if (summary.sampleStandardDeviation !== null) {
    relations.push(['Equal', 's', statisticsMathNumber(summary.sampleStandardDeviation)]);
  }
  return primaryMathJsonLeaf(
    canonicalLatex,
    mathSequence(...relations),
    'statistics.descriptive.native-summary',
  );
}

export function frequencySummaryMathJsonLeaves(input: {
  canonicalLatex: string;
  rows: readonly { value: number; frequency: number }[];
  totalCount: number;
  modeValue?: number;
}) {
  const relations: unknown[] = [
    ['Equal', 'n', input.totalCount],
    ['Set', ...input.rows.map((row) => ['Colon', statisticsMathNumber(row.value), row.frequency])],
  ];
  if (input.modeValue !== undefined) {
    relations.push(['Equal', 'mode', statisticsMathNumber(input.modeValue)]);
  }
  return primaryMathJsonLeaf(
    input.canonicalLatex,
    mathSequence(...relations),
    'statistics.frequency.native-frequency-rows',
  );
}

export function confidenceIntervalMathJsonLeaves(input: {
  canonicalLatex: string;
  summary: MeanInferenceSummary;
  result: {
    criticalValue: number;
    marginOfError: number;
    lowerBound: number;
    upperBound: number;
  };
}) {
  if (input.summary.sampleStandardDeviation === null) return [];
  return primaryMathJsonLeaf(
    input.canonicalLatex,
    mathSequence(
      ['Equal', ['Mean', 'x'], statisticsMathNumber(input.summary.mean)],
      ['Equal', 's', statisticsMathNumber(input.summary.sampleStandardDeviation)],
      ['Equal', 'n', input.summary.count],
      ['Equal', ['Superstar', 't'], statisticsMathNumber(input.result.criticalValue)],
      ['Equal', ['InvisibleOperator', 'M', 'E'], statisticsMathNumber(input.result.marginOfError)],
      ['LessEqual',
        ['Equal', ['InvisibleOperator', 'C', 'I'], statisticsMathNumber(input.result.lowerBound)],
        'mu',
        statisticsMathNumber(input.result.upperBound),
      ],
    ),
    'statistics.inference.native-confidence-interval',
  );
}

export function binomialMathJsonLeaves(input: {
  canonicalLatex: string;
  mode: 'pmf' | 'cdf';
  x: number;
  value: number;
}) {
  return primaryMathJsonLeaf(
    input.canonicalLatex,
    ['Equal',
      ['P', [input.mode === 'pmf' ? 'Equal' : 'LessEqual', 'X', input.x]],
      statisticsMathNumber(input.value),
    ],
    'statistics.probability.native-binomial-value',
  );
}

export function regressionMathJsonLeaves(
  canonicalLatex: string,
  summary: RegressionFitSummary,
  diagnostics: RegressionDiagnostics,
) {
  const details = [diagnostics.sse, diagnostics.mse, diagnostics.residualStandardError]
    .flatMap((value): StatisticsOwnedMathJsonLeaf[] => {
      if (value === null) return [];
      const detailLatex = formatStatisticsNumber(value);
      const mathJson = roundedApproxNumberValue(value);
      return mathJson === undefined
        ? []
        : [{
            canonicalLatex: detailLatex,
            mathJson,
            source: 'statistics.relationship.native-regression-diagnostics',
          }];
    });
  return [
    ...primaryMathJsonLeaf(
      canonicalLatex,
      mathSequence(
        ['Equal', ['OverHat', 'y'], ['Add', ['InvisibleOperator', statisticsMathNumber(summary.slope), 'x'], statisticsMathNumber(summary.intercept)]],
        ['Equal', 'm', statisticsMathNumber(summary.slope)],
        ['Equal', 'b', statisticsMathNumber(summary.intercept)],
        ['Equal', 'r', statisticsMathNumber(summary.r)],
        ['Equal', ['Power', 'r', 2], statisticsMathNumber(summary.rSquared)],
        ['Equal', 'n', summary.count],
      ),
      'statistics.relationship.native-regression-summary',
    ),
    ...details,
  ];
}

function unproven(canonicalLatex: string) {
  return { canonicalLatex };
}

function detailPart(
  part: DisplayDetailLinePart,
  proven: ReadonlyMap<string, ProvenCanonicalMathValue>,
) {
  return part.kind === 'math'
    ? { kind: 'math' as const, math: proven.get(part.latex) ?? unproven(part.latex) }
    : { kind: 'text' as const, text: part.text };
}

function details(
  sections: readonly DisplayDetailSection[] | undefined,
  proven: ReadonlyMap<string, ProvenCanonicalMathValue>,
) {
  return sections?.map((section, sectionIndex) => ({
    title: section.title,
    lines: section.lines.map((line, lineIndex) => {
      const parts = section.lineParts?.[lineIndex];
      if (parts?.length) return parts.map((part) => detailPart(part, proven));
      const kind = section.lineKinds?.[lineIndex] ?? section.lineKind;
      if (kind === 'math') {
        return [{ kind: 'math' as const, math: proven.get(line) ?? unproven(line) }];
      }
      if (kind === 'text') return [{ kind: 'text' as const, text: line }];
      throw new Error(`Statistics producer detail ${sectionIndex}:${lineIndex} has no typed intent.`);
    }),
  }));
}

export function statisticsMathValuesFromOwnedLeaves(input: {
  outcome: Exclude<DisplayOutcome, { kind: 'prompt' }>;
  routeId: StatisticsMathJsonRouteId;
  leaves: readonly StatisticsOwnedMathJsonLeaf[];
}): CanonicalResultProducerMathValuesV1 {
  const proven = new Map<string, ProvenCanonicalMathValue>();
  for (const leaf of input.leaves) {
    const value = tryProvenCanonicalMathValue({
      canonicalLatex: leaf.canonicalLatex,
      mathJson: leaf.mathJson,
      owner: 'statistics',
      routeId: input.routeId,
      source: leaf.source,
    });
    if (value) proven.set(leaf.canonicalLatex, value);
  }

  const values: CanonicalResultProducerMathValuesV1 = {};
  if (input.outcome.exactLatex) {
    values.primaryMath = proven.get(input.outcome.exactLatex) ?? unproven(input.outcome.exactLatex);
  }
  const detailValues = details(input.outcome.detailSections, proven);
  if (detailValues?.length) values.details = detailValues;
  return values;
}

export function statisticsMathJsonRouteForRequest(
  request: StatisticsRequest,
): StatisticsMathJsonRouteId {
  if (request.kind === 'descriptive' || request.kind === 'dataset') {
    return 'statistics.descriptive';
  }
  if (request.kind === 'frequency') return 'statistics.frequency';
  if (request.kind === 'meanInference') return 'statistics.inference';
  if (request.kind === 'regression' || request.kind === 'correlation') {
    return 'statistics.relationship';
  }
  return 'statistics.probability';
}
