import type { GraphPiecewiseConditionEvidenceV1 } from '../../lib/graphing';

// What the piecewise coverage strip and gap note say (GRAPHING-PIECEWISE2):
// where each branch is drawn in view, where nothing is drawn, and how to word
// an interval the way it is written by hand ("−5 < x ≤ 0", "x ≥ 2", "x = 0").
// Ends that are only the edge of the view are left open-ended, never quoted.

type Interval = GraphPiecewiseConditionEvidenceV1['uncoveredGaps'][number];

export type GraphCoverageSegment = {
  /** Branch key (`otherwise` for the otherwise branch), or null for a gap. */
  branchKey: string | null;
  minimum: number;
  maximum: number;
  minimumInclusive: boolean;
  maximumInclusive: boolean;
  /** The end is the view's edge, not a boundary of the condition. */
  minimumOpenEnded: boolean;
  maximumOpenEnded: boolean;
};

const SYMBOL_TEXT = { x: 'x', y: 'y', theta: 'θ' } as const;

export function graphCoverageNumber(value: number) {
  const rounded = Math.abs(value) < 1e-12 ? 0 : Number(value.toPrecision(6));
  return String(rounded).replace('-', '−');
}

/** A boundary in closed form when it is known exactly (√2), otherwise its short decimal. */
export function graphBoundaryText(evidence: GraphPiecewiseConditionEvidenceV1, value: number) {
  return evidence.exactValues?.find((entry) => entry.value === value)?.label ?? graphCoverageNumber(value);
}

function edgeTolerance(evidence: GraphPiecewiseConditionEvidenceV1) {
  return (evidence.validatedInterval.maximum - evidence.validatedInterval.minimum) * 1e-9;
}

function segment(evidence: GraphPiecewiseConditionEvidenceV1, branchKey: string | null, interval: Interval): GraphCoverageSegment {
  const tolerance = edgeTolerance(evidence);
  return {
    branchKey,
    minimum: interval.minimum,
    maximum: interval.maximum,
    minimumInclusive: interval.minimumInclusive,
    maximumInclusive: interval.maximumInclusive,
    minimumOpenEnded: interval.minimum <= evidence.validatedInterval.minimum + tolerance,
    maximumOpenEnded: interval.maximum >= evidence.validatedInterval.maximum - tolerance,
  };
}

/** Strip segments in order along the axis: each branch's drawn intervals, the otherwise branch or gaps. */
export function graphCoverageSegments(evidence: GraphPiecewiseConditionEvidenceV1, hasOtherwise: boolean) {
  const segments = [
    ...(evidence.drawnIntervals ?? []).flatMap((entry) => entry.intervals.map((interval) => segment(evidence, entry.branchId, interval))),
    ...evidence.uncoveredGaps.map((interval) => segment(evidence, hasOtherwise ? 'otherwise' : null, interval)),
  ];
  return segments.sort((left, right) => left.minimum - right.minimum || left.maximum - right.maximum);
}

/** An interval as written by hand ("−5 < x ≤ 0", "x ≥ 2", "x = 0"); open-ended sides are the view's edge, never quoted. */
export function graphIntervalWords(
  interval: Interval & { minimumOpenEnded: boolean; maximumOpenEnded: boolean },
  symbol = 'x',
  text: (value: number) => string = graphCoverageNumber,
) {
  const low = text(interval.minimum);
  const high = text(interval.maximum);
  if (interval.minimum === interval.maximum) return `${symbol} = ${low}`;
  if (interval.minimumOpenEnded && interval.maximumOpenEnded) return `every ${symbol} in view`;
  if (interval.minimumOpenEnded) return `${symbol} ${interval.maximumInclusive ? '≤' : '<'} ${high}`;
  if (interval.maximumOpenEnded) return `${symbol} ${interval.minimumInclusive ? '≥' : '>'} ${low}`;
  return `${low} ${interval.minimumInclusive ? '≤' : '<'} ${symbol} ${interval.maximumInclusive ? '≤' : '<'} ${high}`;
}

/** An interval of a piecewise variable, with exact boundaries where known. */
export function graphIntervalText(evidence: GraphPiecewiseConditionEvidenceV1, interval: Interval) {
  return graphIntervalWords({ ...interval, ...segment(evidence, null, interval) }, SYMBOL_TEXT[evidence.independentSymbol],
    (value) => graphBoundaryText(evidence, value));
}

/** "Nothing is drawn for −5 < x ≤ 0 and x = 3." or null when every point in view is covered. */
export function graphPiecewiseGapText(evidence: GraphPiecewiseConditionEvidenceV1) {
  if (evidence.uncoveredGaps.length === 0) return null;
  const parts = evidence.uncoveredGaps.map((gap) => graphIntervalText(evidence, gap));
  const list = parts.length === 1 ? parts[0]
    : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
  return `Nothing is drawn for ${list}.`;
}
