import type { GraphRelationIR, GraphViewportV1 } from '../contracts';
import { defaultPtxSolverPort, ptxDiscontinuityMarkers, ptxRealDiscontinuities } from '../ptx';
import type { GraphPointBatchSceneInput } from '../scene';

/**
 * Open and filled circles for the holes and jumps of a y = f(x) (or x = f(y))
 * curve in view, as point batches the renderer draws and PTX snaps to.
 */
export function graphExplicitDiscontinuityBatches(itemId: string, relation: GraphRelationIR, viewport: GraphViewportV1,
  parameters: Readonly<Record<string, number>>, isCancelled: () => boolean): GraphPointBatchSceneInput[] {
  if (relation.kind !== 'explicit-y' && relation.kind !== 'explicit-x') return [];
  const alongX = relation.kind === 'explicit-y';
  const symbol = alongX ? 'x' : 'y';
  const port = defaultPtxSolverPort();
  const f = port.realFunction(relation.rhs, symbol, parameters);
  if (!f) return [];
  const found = ptxRealDiscontinuities(f, relation.rhs.mathJson, symbol,
    alongX ? viewport.xMin : viewport.yMin, alongX ? viewport.xMax : viewport.yMax, port, parameters, { isCancelled });
  const markers = ptxDiscontinuityMarkers(found);
  const batches: GraphPointBatchSceneInput[] = [];
  for (const [marker, points] of [['open', markers.open], ['filled', markers.filled]] as const) {
    if (points.length === 0) continue;
    batches.push({
      pointBatchId: `${itemId}:endpoint:${marker}`, itemId, marker,
      coordinates: new Float64Array(points.flatMap((point) => (alongX ? [point.x, point.y] : [point.y, point.x]))),
    });
  }
  return batches;
}
