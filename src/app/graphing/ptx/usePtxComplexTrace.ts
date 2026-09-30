import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GraphDocumentV4, GraphViewportV1 } from '../../../lib/graphing';
import { complexPlaneRootAt, type GraphComplexPlaneItem } from '../graph-complex-plane';
import {
  ptxAcquireLocus,
  ptxComplexLociFrom,
  ptxComplexTracePoint,
  ptxStepComplexTrace,
  ptxSweepLocus,
  type PtxComplexTrace,
} from './ptx-complex-trace';
import type { PtxDot } from './usePtxPointsOfInterest';

/** Screen geometry of the pane for one pointer or key event. */
export type PtxPaneFrame = { live: GraphViewportV1; width: number; height: number };

export type PtxTracedPoint = { itemId: string | null; x: number; y: number } | null;

function frameMath({ live, width, height }: PtxPaneFrame) {
  const units = { x: (live.xMax - live.xMin) / Math.max(1, width), y: (live.yMax - live.yMin) / Math.max(1, height) };
  const toScreen = (x: number, y: number) => ({ x: (x - live.xMin) / units.x, y: (live.yMax - y) / units.y });
  return { units, toScreen };
}

/**
 * Click-to-acquire tracing for the Complex pane. A click picks a root point,
 * else a locus within a few pixels, else pins the z-map probe the caller
 * passes; moving sweeps a locus trace along its curve; arrows step; Escape clears.
 */
export function usePtxComplexTrace({ document, dots, onSelectItem, onTracedPointChange, parameters, plane, probeSource }: {
  document: GraphDocumentV4;
  dots: readonly PtxDot[];
  onSelectItem?: (itemId: string) => void;
  onTracedPointChange?: (point: PtxTracedPoint) => void;
  parameters: Readonly<Record<string, number>>;
  plane: readonly GraphComplexPlaneItem[];
  /** Identity of the z-map a pinned probe reads; when it changes the pin is dropped. */
  probeSource: string | null;
}) {
  const loci = useMemo(() => ptxComplexLociFrom(document, parameters), [document, parameters]);
  const [stored, setStored] = useState<PtxComplexTrace | null>(null);
  // A trace whose item was removed or hidden is gone; a root trace follows its item's current roots.
  const trace = useMemo((): PtxComplexTrace | null => {
    if (!stored) return null;
    if (stored.kind === 'locus') return loci.some((locus) => locus.itemId === stored.itemId) ? stored : null;
    if (stored.kind === 'root') {
      const roots = plane.find((item) => item.itemId === stored.itemId)?.roots ?? [];
      return roots.length ? { ...stored, roots, index: Math.min(stored.index, roots.length - 1) } : null;
    }
    return stored.source === probeSource ? stored : null;
  }, [loci, plane, probeSource, stored]);
  useEffect(() => {
    if (!onTracedPointChange) return;
    const point = trace ? ptxComplexTracePoint(trace) : null;
    onTracedPointChange(trace && point ? { itemId: trace.kind === 'probe' ? null : trace.itemId, ...point } : null);
  }, [onTracedPointChange, trace]);

  const acquire = useCallback((at: { x: number; y: number }, frame: PtxPaneFrame,
    probe: (() => Extract<PtxComplexTrace, { kind: 'probe' }> | null) | null) => {
    const { units, toScreen } = frameMath(frame);
    for (const item of plane) {
      const root = complexPlaneRootAt([item], at.x, at.y, frame.live, frame.width, frame.height);
      if (root) {
        setStored({ kind: 'root', itemId: item.itemId, roots: item.roots, index: Math.max(0, item.roots.indexOf(root)) });
        onSelectItem?.(item.itemId); return;
      }
    }
    const locus = ptxAcquireLocus(loci, at, units, dots, toScreen);
    if (locus && locus.kind === 'locus') { setStored(locus); onSelectItem?.(locus.itemId); return; }
    const pinned = probe?.() ?? null;
    setStored(pinned && probeSource ? { ...pinned, source: probeSource } : null);
  }, [dots, loci, onSelectItem, plane, probeSource]);

  const sweep = useCallback((pointer: { x: number; y: number }, frame: PtxPaneFrame) => {
    if (trace?.kind !== 'locus') return false;
    const { units, toScreen } = frameMath(frame);
    setStored(ptxSweepLocus(trace, loci, pointer, units, dots, toScreen));
    return true;
  }, [dots, loci, trace]);

  const step = useCallback((direction: 1 | -1, frame: PtxPaneFrame) => {
    if (!trace) return;
    const { units, toScreen } = frameMath(frame);
    setStored(ptxStepComplexTrace(trace, direction, loci, units, dots, toScreen));
  }, [dots, loci, trace]);

  const clear = useCallback(() => setStored(null), []);
  return { acquire, clear, step, sweep, trace };
}
