import { useCallback, useEffect, useState } from 'react';
import type { GraphViewportV1 } from '../../lib/graphing';
import { isMeasurableGraphPane, isSquareGraphViewport, squareGraphViewport, type GraphPaneSize } from './graph-equal-axes';

/**
 * Keeps the shared viewport square while "Equal axes" is on (the default). The
 * choice is session-local UI state, not saved with the graph. `reportSize`
 * takes the size of whichever pane is showing; the viewport is left alone until
 * a pane has been measured.
 */
export function useGraphEqualAxes({ setViewport, viewport }: {
  setViewport: (viewport: GraphViewportV1) => void;
  viewport: GraphViewportV1;
}) {
  const [equalAxes, setEqualAxes] = useState(true);
  const [size, setSize] = useState<GraphPaneSize | null>(null);
  const reportSize = useCallback((next: GraphPaneSize) => {
    setSize((current) => (current && current.width === next.width && current.height === next.height ? current : next));
  }, []);
  useEffect(() => {
    if (!equalAxes || !isMeasurableGraphPane(size) || isSquareGraphViewport(viewport, size)) return;
    setViewport(squareGraphViewport(viewport, size));
  }, [equalAxes, setViewport, size, viewport]);
  return { equalAxes, reportSize, setEqualAxes };
}
