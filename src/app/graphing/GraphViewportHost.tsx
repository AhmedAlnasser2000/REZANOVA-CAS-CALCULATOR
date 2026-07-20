import { useCallback, useState } from 'react';
import {
  type GraphGridPolicyV1,
  type GraphPaneViewStateV1,
  type GraphRendererPresentationFrame,
  type GraphViewportV1,
  type GraphSpatialSceneRuntimeV2,
} from '../../lib/graphing';
import { GraphSvgViewport, type GraphTraceRouteKind } from './GraphSvgViewport';
import { GraphThreeViewport } from './GraphThreeViewport';

type Props = {
  grid: GraphGridPolicyV1;
  itemRoutes: Readonly<Record<string, GraphTraceRouteKind>>;
  onPaneViewChange: (values: Partial<GraphPaneViewStateV1>) => void;
  onSelectItem: (itemId: string | null) => void;
  onSizeChange: (size: { width: number; height: number }) => void;
  onViewportChange: (viewport: GraphViewportV1) => void;
  paneView: GraphPaneViewStateV1;
  pending: boolean;
  presentation: GraphRendererPresentationFrame;
  scene: GraphSpatialSceneRuntimeV2 | null;
  sceneViewport: GraphViewportV1 | null;
  selectedItemId: string | null;
  viewport: GraphViewportV1;
};

export function GraphViewportHost({
  grid, itemRoutes, onPaneViewChange, onSelectItem, onSizeChange, onViewportChange,
  paneView, pending, presentation, scene, sceneViewport, selectedItemId, viewport,
}: Props) {
  const [fallbackReason, setFallbackReason] = useState<'context-lost' | 'unavailable' | null>(null);
  const [retrySequence, setRetrySequence] = useState(0);
  const onFallbackChange = useCallback((reason: typeof fallbackReason) => setFallbackReason(reason), []);
  const useSvg = paneView.dimension === '2d' || fallbackReason !== null;
  return <div className="graph-viewport-host" data-dimension={paneView.dimension}>
    <div aria-label="Graph dimension" className="graph-dimension-switch" role="group">
      <button aria-pressed={paneView.dimension === '2d'} onClick={() => {
        setFallbackReason(null); onPaneViewChange({ dimension: '2d' });
      }} type="button">2D</button>
      <button aria-pressed={paneView.dimension === '3d'} onClick={() => {
        setFallbackReason(null); onPaneViewChange({ dimension: '3d' });
      }} type="button">3D</button>
    </div>
    {paneView.dimension === '3d' ? <GraphThreeViewport
      fallback={fallbackReason !== null}
      grid={grid}
      key={retrySequence}
      onFallbackChange={onFallbackChange}
      onSelectItem={onSelectItem}
      onSizeChange={onSizeChange}
      onViewChange={onPaneViewChange}
      presentation={presentation}
      scene={scene}
      sceneViewport={sceneViewport}
      selectedItemId={selectedItemId}
      view={paneView}
      viewport={viewport}
    /> : null}
    {useSvg ? <GraphSvgViewport
      grid={grid}
      itemRoutes={itemRoutes}
      onSizeChange={onSizeChange}
      onTraceItemChange={onSelectItem}
      onViewportChange={onViewportChange}
      pending={pending}
      presentation={presentation}
      scene={scene}
      sceneViewport={sceneViewport}
      viewport={viewport}
    /> : null}
    {fallbackReason ? <div className="graph-renderer-fallback" role="status">
      <strong>Precise 2D fallback</strong>
      <span>{fallbackReason === 'context-lost'
        ? 'WebGL2 context was lost. Your graph and camera are preserved.'
        : 'WebGL2 is unavailable. The precise SVG view remains active.'}</span>
      <button onClick={() => { setFallbackReason(null); setRetrySequence((value) => value + 1); }}
        type="button">Retry 3D</button>
    </div> : null}
  </div>;
}
