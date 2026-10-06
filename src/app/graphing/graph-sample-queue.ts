// The Graph controller samples one request at a time (GRAPHING-PERF1). What
// arrives meanwhile waits here: the newest input's preview runs before its
// settled and polish passes, a request the run in flight already covers is
// dropped, and a settled or polish pass for an older input is stopped so it
// cannot hold back the new preview; so is a preview of an older document. A
// preview for an older view or parameter value always finishes, so a
// continuous pan or slider drag keeps drawing.

export type GraphSampleQuality = 'preview' | 'settled' | 'polish';
export type GraphQueuedSample<Snapshot> = {
  quality: GraphSampleQuality;
  snapshot: Snapshot;
  /** The sampled input: document, view and parameter revisions and the drawing size. */
  key: string;
  /** The document revision alone. */
  mathematicsKey: string;
};

const RANK: Record<GraphSampleQuality, number> = { preview: 0, settled: 1, polish: 2 };

export function graphSampleInputKeys(
  revisions: { mathematics: number; viewport: number; parameter: number },
  width: number,
  height: number,
) {
  const mathematicsKey = String(revisions.mathematics);
  return { mathematicsKey, key: `${mathematicsKey}:${revisions.parameter}:${revisions.viewport}:${Math.round(width)}x${Math.round(height)}` };
}

/** The waiting requests once `next` arrives while `inFlight` runs, and whether to stop `inFlight`. */
export function enqueueGraphSample<Snapshot>(
  queue: readonly GraphQueuedSample<Snapshot>[],
  inFlight: GraphQueuedSample<Snapshot>,
  next: GraphQueuedSample<Snapshot>,
): { queue: GraphQueuedSample<Snapshot>[]; supersede: boolean } {
  const supersede = inFlight.key !== next.key && (inFlight.quality !== 'preview' || inFlight.mathematicsKey !== next.mathematicsKey);
  // Already being drawn at the same or a better quality.
  if (inFlight.key === next.key && RANK[inFlight.quality] >= RANK[next.quality]) return { queue: [...queue], supersede: false };
  const waiting = queue.filter((entry) => entry.key === next.key && entry.quality !== next.quality);
  return { queue: [...waiting, next].sort((a, b) => RANK[a.quality] - RANK[b.quality]), supersede };
}
