import { describe, expect, it } from 'vitest';
import {
  evaluateGraphPerformanceGate,
  GRAPH_PRE_THREE_BASELINE_EXPECTATIONS,
  GRAPH_PRE_THREE_BASELINE_WORKLOAD_V2,
  GRAPH_PRE_THREE_PERFORMANCE_BUDGET_V1,
  nearestRankPercentile,
  validateGraphPerformanceBudget,
  validateGraphPerformanceEvidence,
} from './index';

const passingEvidence = {
  version: 1 as const,
  cpuSlowdownMultiplier: 4,
  totalRows: 25,
  visibleGeometryItems: 10,
  frameIntervalsMs: [16, 17, 18, 19, 20],
  mainThreadTasksMs: [10, 20, 30],
  editorFeedbackMs: [18, 30, 40],
  firstPreviewMs: 120,
  settledSceneMs: 850,
  stalePreviewCount: 0,
  soakCycles: 20,
  warmedHeapBytes: 100 * 1024 * 1024,
  finalHeapBytes: 120 * 1024 * 1024,
  activeJobsAfterDispose: 0,
  activeAnimationFramesAfterDispose: 0,
  activeListenersAfterDispose: 0,
  retainedRenderersAfterDispose: 0,
  retainedBuffersAfterDispose: 0,
};

describe('Graph pre-Three performance contract', () => {
  it('pins the approved workload composition and checkpoint budgets', () => {
    const visibleGeometry = GRAPH_PRE_THREE_BASELINE_WORKLOAD_V2.items.filter((item) => (
      item.kind !== 'parameter' && item.kind !== 'note' && item.visible
    ));
    const visibleKinds = new Set(visibleGeometry.flatMap((item) => item.kind === 'relation' ? [item.relation.kind] : [item.kind]));

    expect(GRAPH_PRE_THREE_BASELINE_WORKLOAD_V2.items).toHaveLength(GRAPH_PRE_THREE_BASELINE_EXPECTATIONS.totalRows);
    expect(visibleGeometry).toHaveLength(GRAPH_PRE_THREE_BASELINE_EXPECTATIONS.visibleGeometryItems);
    for (const kind of GRAPH_PRE_THREE_BASELINE_EXPECTATIONS.requiredVisibleKinds) expect(visibleKinds.has(kind)).toBe(true);
    expect(GRAPH_PRE_THREE_PERFORMANCE_BUDGET_V1.interaction.maximumP95FrameIntervalMs).toBe(24);
    expect(GRAPH_PRE_THREE_PERFORMANCE_BUDGET_V1.lifecycle.minimumAbsoluteHeapAllowanceBytes).toBe(24 * 1024 * 1024);
    expect(validateGraphPerformanceBudget(GRAPH_PRE_THREE_PERFORMANCE_BUDGET_V1).ok).toBe(true);
    expect(validateGraphPerformanceEvidence(passingEvidence).ok).toBe(true);
  });

  it('uses deterministic nearest-rank p95 and accepts bounded evidence', () => {
    expect(nearestRankPercentile([4, 1, 3, 2, 5], 0.95)).toBe(5);
    expect(evaluateGraphPerformanceGate(passingEvidence)).toMatchObject({ pass: true, failures: [] });
  });

  it('reports interaction, stale-work, and disposal failures independently', () => {
    const result = evaluateGraphPerformanceGate({
      ...passingEvidence,
      frameIntervalsMs: [16, 30],
      stalePreviewCount: 1,
      activeJobsAfterDispose: 1,
      finalHeapBytes: 140 * 1024 * 1024,
    });

    expect(result.pass).toBe(false);
    expect(result.failures).toEqual(expect.arrayContaining([
      'p95 frame interval exceeds the interaction budget.',
      'A stale preview was committed.',
      'Sampling jobs remain after disposal.',
      'Retained heap growth exceeds the lifecycle allowance.',
    ]));
  });

  it('fails closed on malformed or non-finite performance evidence', () => {
    expect(validateGraphPerformanceEvidence({ ...passingEvidence, firstPreviewMs: Number.NaN }).ok).toBe(false);
    expect(evaluateGraphPerformanceGate({ ...passingEvidence, frameIntervalsMs: [Number.NaN] }).pass).toBe(false);
  });
});
