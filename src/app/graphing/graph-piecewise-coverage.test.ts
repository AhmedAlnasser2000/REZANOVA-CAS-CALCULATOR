import { describe, expect, it } from 'vitest';
import type { GraphPiecewiseConditionEvidenceV1 } from '../../lib/graphing';
import { graphCoverageSegments, graphIntervalText, graphPiecewiseGapText } from './graph-piecewise-coverage';

const interval = (minimum: number, maximum: number, minimumInclusive: boolean, maximumInclusive: boolean) => (
  { minimum, maximum, minimumInclusive, maximumInclusive });

function evidence(extra: Partial<GraphPiecewiseConditionEvidenceV1> = {}): GraphPiecewiseConditionEvidenceV1 {
  return {
    version: 1, independentSymbol: 'x', basis: 'exact-global',
    validatedInterval: { minimum: -45, maximum: 50, tolerancePixels: 0.35 },
    branchApplicability: [], overlapBranchPairs: [], boundaries: [], unresolvedBoundaryCount: 0,
    uncoveredGaps: [interval(-5, 0, false, true)],
    drawnIntervals: [
      { branchId: 'branch.1', intervals: [interval(0, 50, false, true)] },
      { branchId: 'branch.2', intervals: [interval(-45, -5, true, true)] },
    ],
    ...extra,
  };
}

describe('Piecewise coverage wording (GRAPHING-PIECEWISE2)', () => {
  it('says where nothing is drawn, as written by hand', () => {
    expect(graphPiecewiseGapText(evidence())).toBe('Nothing is drawn for −5 < x ≤ 0.');
  });

  it('leaves view edges open-ended and names single points', () => {
    const view = evidence({ uncoveredGaps: [interval(-45, -2, true, false), interval(3, 3, true, true), interval(7, 50, false, true)] });
    expect(graphPiecewiseGapText(view)).toBe('Nothing is drawn for x < −2, x = 3 and x > 7.');
  });

  it('uses closed forms when a boundary is known exactly', () => {
    const exact = evidence({ exactValues: [{ value: Math.SQRT2, label: '√2' }] });
    expect(graphIntervalText(exact, interval(0, Math.SQRT2, true, false))).toBe('0 ≤ x < √2');
  });

  it('orders strip segments along the axis, with the gap between its neighbours', () => {
    expect(graphCoverageSegments(evidence(), false).map((segment) => [segment.branchKey, segment.minimumOpenEnded, segment.maximumOpenEnded]))
      .toEqual([['branch.2', true, false], [null, false, false], ['branch.1', false, true]]);
    expect(graphCoverageSegments(evidence(), true)[1]!.branchKey).toBe('otherwise');
  });
});
