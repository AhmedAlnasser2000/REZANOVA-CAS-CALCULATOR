import { useCallback, useRef } from 'react';
import type { GraphDocumentV4, GraphRendererPresentationFrame, GraphViewportV1 } from '../../lib/graphing';
import { useGraphRealFieldGpu } from './useGraphRealFieldGpu';

const NO_SURFACES: ReadonlyMap<string, { minimum: number; maximum: number }> = new Map();

/**
 * GPU visual evaluation of complex loci for the Complex pane. The GPU renders
 * each locus into an off-screen canvas that this pane composites into its own
 * 2-D canvas, so loci sit between the Argand plane and the root points and
 * follow the live viewport every frame. The CPU scene still draws a locus the
 * GPU refuses, and stays the authority for trace, Analyze and export.
 */
export function useGraphComplexLocusGpu({ document, enabled, presentation }: {
  document: GraphDocumentV4 | null;
  enabled: boolean;
  presentation: GraphRendererPresentationFrame;
}) {
  const slotRef = useRef<HTMLDivElement | null>(null);
  const getSlot = useCallback(() => slotRef.current, []);
  const { draw, status, suppressed } = useGraphRealFieldGpu({
    document, enabled, getSlot, presentation, scope: 'complex-plane', surfaceRanges: NO_SURFACES,
  });
  /** Draws the GPU loci and composites them onto `context`; a no-op while the GPU draws none. */
  const paintInto = useCallback((context: CanvasRenderingContext2D, live: GraphViewportV1, interacting: boolean,
    width: number, height: number) => {
    if (suppressed.size === 0) return;
    draw(live, interacting);
    const canvas = slotRef.current?.querySelector('canvas');
    if (canvas && canvas.width > 0 && canvas.height > 0) context.drawImage(canvas, 0, 0, width, height);
  }, [draw, suppressed]);
  return { paintInto, slotRef, status, suppressed };
}
