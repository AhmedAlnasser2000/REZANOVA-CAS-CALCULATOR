export type GraphPerformanceBudgetV1 = {
  version: 1;
  cpuSlowdownMultiplier: number;
  workload: { totalRows: number; visibleGeometryItems: number };
  interaction: {
    targetRefreshHz: number;
    maximumP95FrameIntervalMs: number;
    maximumMainThreadTaskMs: number;
    maximumEditorFeedbackMs: number;
  };
  sampling: { maximumFirstPreviewMs: number; maximumSettledSceneMs: number };
  lifecycle: {
    soakCycles: number;
    minimumAbsoluteHeapAllowanceBytes: number;
    relativeHeapAllowance: number;
  };
};

export const GRAPH_PRE_THREE_PERFORMANCE_BUDGET_V1: GraphPerformanceBudgetV1 = {
  version: 1,
  cpuSlowdownMultiplier: 4,
  workload: { totalRows: 25, visibleGeometryItems: 10 },
  interaction: {
    targetRefreshHz: 60,
    maximumP95FrameIntervalMs: 24,
    maximumMainThreadTaskMs: 50,
    maximumEditorFeedbackMs: 50,
  },
  sampling: { maximumFirstPreviewMs: 150, maximumSettledSceneMs: 1_000 },
  lifecycle: {
    soakCycles: 20,
    minimumAbsoluteHeapAllowanceBytes: 24 * 1024 * 1024,
    relativeHeapAllowance: 0.15,
  },
};

export type GraphPerformanceEvidenceV1 = {
  version: 1;
  cpuSlowdownMultiplier: number;
  totalRows: number;
  visibleGeometryItems: number;
  frameIntervalsMs: number[];
  mainThreadTasksMs: number[];
  editorFeedbackMs: number[];
  firstPreviewMs: number;
  settledSceneMs: number;
  stalePreviewCount: number;
  soakCycles: number;
  warmedHeapBytes: number;
  finalHeapBytes: number;
  activeJobsAfterDispose: number;
  activeAnimationFramesAfterDispose: number;
  activeListenersAfterDispose: number;
  retainedRenderersAfterDispose: number;
  retainedBuffersAfterDispose: number;
};

export type GraphPerformanceGateResult = {
  pass: boolean;
  metrics: {
    p95FrameIntervalMs: number;
    maximumMainThreadTaskMs: number;
    maximumEditorFeedbackMs: number;
    heapGrowthBytes: number;
    heapAllowanceBytes: number;
  };
  failures: string[];
};

export type GraphPerformanceValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; failure: string };

function allFiniteNonnegative(values: number[]) {
  return values.every((value) => Number.isFinite(value) && value >= 0);
}

export function validateGraphPerformanceBudget(input: unknown): GraphPerformanceValidationResult<GraphPerformanceBudgetV1> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, failure: 'Performance budget must be an object.' };
  const budget = input as GraphPerformanceBudgetV1;
  const values = [
    budget.cpuSlowdownMultiplier,
    budget.workload?.totalRows,
    budget.workload?.visibleGeometryItems,
    budget.interaction?.targetRefreshHz,
    budget.interaction?.maximumP95FrameIntervalMs,
    budget.interaction?.maximumMainThreadTaskMs,
    budget.interaction?.maximumEditorFeedbackMs,
    budget.sampling?.maximumFirstPreviewMs,
    budget.sampling?.maximumSettledSceneMs,
    budget.lifecycle?.soakCycles,
    budget.lifecycle?.minimumAbsoluteHeapAllowanceBytes,
    budget.lifecycle?.relativeHeapAllowance,
  ];
  if (budget.version !== 1 || values.some((value) => !Number.isFinite(value) || value <= 0)) {
    return { ok: false, failure: 'Performance budget values must be finite and positive.' };
  }
  if (!Number.isInteger(budget.workload.totalRows)
    || !Number.isInteger(budget.workload.visibleGeometryItems)
    || budget.workload.visibleGeometryItems > budget.workload.totalRows
    || !Number.isInteger(budget.lifecycle.soakCycles)) {
    return { ok: false, failure: 'Performance workload and lifecycle counts are invalid.' };
  }
  return { ok: true, value: budget };
}

export function validateGraphPerformanceEvidence(input: unknown): GraphPerformanceValidationResult<GraphPerformanceEvidenceV1> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, failure: 'Performance evidence must be an object.' };
  const evidence = input as GraphPerformanceEvidenceV1;
  const arrays = [evidence.frameIntervalsMs, evidence.mainThreadTasksMs, evidence.editorFeedbackMs];
  if (evidence.version !== 1 || arrays.some((values) => !Array.isArray(values) || !allFiniteNonnegative(values))) {
    return { ok: false, failure: 'Performance timing arrays must be finite and nonnegative.' };
  }
  const counters = [
    evidence.cpuSlowdownMultiplier, evidence.totalRows, evidence.visibleGeometryItems,
    evidence.firstPreviewMs, evidence.settledSceneMs, evidence.stalePreviewCount,
    evidence.soakCycles, evidence.warmedHeapBytes, evidence.finalHeapBytes,
    evidence.activeJobsAfterDispose, evidence.activeAnimationFramesAfterDispose,
    evidence.activeListenersAfterDispose, evidence.retainedRenderersAfterDispose,
    evidence.retainedBuffersAfterDispose,
  ];
  if (!allFiniteNonnegative(counters)) return { ok: false, failure: 'Performance counters must be finite and nonnegative.' };
  return { ok: true, value: evidence };
}

function maximum(values: number[]) {
  return values.length === 0 ? 0 : Math.max(...values);
}

export function nearestRankPercentile(values: number[], percentile: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(percentile * sorted.length) - 1)] ?? 0;
}

export function evaluateGraphPerformanceGate(
  evidence: GraphPerformanceEvidenceV1,
  budget = GRAPH_PRE_THREE_PERFORMANCE_BUDGET_V1,
): GraphPerformanceGateResult {
  const budgetValidation = validateGraphPerformanceBudget(budget);
  const evidenceValidation = validateGraphPerformanceEvidence(evidence);
  const validationFailure = !budgetValidation.ok
    ? budgetValidation.failure
    : !evidenceValidation.ok
      ? evidenceValidation.failure
      : null;
  if (validationFailure) {
    return {
      pass: false,
      metrics: {
        p95FrameIntervalMs: 0,
        maximumMainThreadTaskMs: 0,
        maximumEditorFeedbackMs: 0,
        heapGrowthBytes: 0,
        heapAllowanceBytes: 0,
      },
      failures: [validationFailure],
    };
  }
  const p95FrameIntervalMs = nearestRankPercentile(evidence.frameIntervalsMs, 0.95);
  const maximumMainThreadTaskMs = maximum(evidence.mainThreadTasksMs);
  const maximumEditorFeedbackMs = maximum(evidence.editorFeedbackMs);
  const heapGrowthBytes = Math.max(0, evidence.finalHeapBytes - evidence.warmedHeapBytes);
  const heapAllowanceBytes = Math.max(
    budget.lifecycle.minimumAbsoluteHeapAllowanceBytes,
    evidence.warmedHeapBytes * budget.lifecycle.relativeHeapAllowance,
  );
  const failures: string[] = [];
  const assert = (condition: boolean, message: string) => { if (!condition) failures.push(message); };

  assert(evidence.cpuSlowdownMultiplier === budget.cpuSlowdownMultiplier, 'CPU slowdown does not match the checkpoint budget.');
  assert(evidence.totalRows === budget.workload.totalRows, 'Workload row count does not match the checkpoint fixture.');
  assert(evidence.visibleGeometryItems === budget.workload.visibleGeometryItems, 'Visible geometry count does not match the checkpoint fixture.');
  assert(p95FrameIntervalMs <= budget.interaction.maximumP95FrameIntervalMs, 'p95 frame interval exceeds the interaction budget.');
  assert(maximumMainThreadTaskMs <= budget.interaction.maximumMainThreadTaskMs, 'A main-thread task exceeds the long-task budget.');
  assert(maximumEditorFeedbackMs <= budget.interaction.maximumEditorFeedbackMs, 'Editor feedback exceeds the latency budget.');
  assert(evidence.firstPreviewMs <= budget.sampling.maximumFirstPreviewMs, 'First preview exceeds the sampling budget.');
  assert(evidence.settledSceneMs <= budget.sampling.maximumSettledSceneMs, 'Settled scene exceeds the sampling budget.');
  assert(evidence.stalePreviewCount === 0, 'A stale preview was committed.');
  assert(evidence.soakCycles >= budget.lifecycle.soakCycles, 'Lifecycle soak did not run enough cycles.');
  assert(heapGrowthBytes <= heapAllowanceBytes, 'Retained heap growth exceeds the lifecycle allowance.');
  assert(evidence.activeJobsAfterDispose === 0, 'Sampling jobs remain after disposal.');
  assert(evidence.activeAnimationFramesAfterDispose === 0, 'Animation frames remain after disposal.');
  assert(evidence.activeListenersAfterDispose === 0, 'Listeners remain after disposal.');
  assert(evidence.retainedRenderersAfterDispose === 0, 'Renderers remain after disposal.');
  assert(evidence.retainedBuffersAfterDispose === 0, 'Transferred buffers remain after disposal.');

  return {
    pass: failures.length === 0,
    metrics: { p95FrameIntervalMs, maximumMainThreadTaskMs, maximumEditorFeedbackMs, heapGrowthBytes, heapAllowanceBytes },
    failures,
  };
}
