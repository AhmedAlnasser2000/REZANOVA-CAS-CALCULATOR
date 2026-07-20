import { useMemo, useState } from 'react';
import {
  normalizeGraphItemPresentation,
  type GraphItemPresentationV2,
  type GraphSurfaceStateV4,
  type GraphViewportV1,
} from '../../lib/graphing';
import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator/workspace-instance-types';
import { graphItemSourceLatex } from './graph-document';
import { GraphAnalysisMarkers, GraphAnalyzeOverlay } from './GraphAnalyzeOverlay';
import { graphFeatureNumber, graphPinnedAnnotation } from './graph-analysis-overlay-support';
import type { GraphWorkspaceSessionStateV5 } from './graph-workspace-session';
import { useGraphAnalysis } from './useGraphAnalysis';

export function GraphAnalyzeIntegration({
  onSetViewport, onUpdateAnalyze, onUpdatePresentation, session, workspaceContext,
}: {
  onSetViewport: (viewport: GraphViewportV1) => void;
  onUpdateAnalyze: (values: Partial<GraphSurfaceStateV4['analyze']> & { open?: boolean }) => void;
  onUpdatePresentation: (itemId: string, presentation: GraphItemPresentationV2) => boolean;
  session: GraphWorkspaceSessionStateV5;
  workspaceContext: WorkspaceInstanceRuntimeContext;
}) {
  const [preview, setPreview] = useState<import('../../lib/graphing').GraphAnalysisEvidenceV1 | null>(null);
  const analysis = useGraphAnalysis({ session, workspaceContext });
  const selectedItem = session.document.items.find((item) => item.itemId === session.surface.selectedItemId);
  const evidence = useMemo(() => analysis.result?.evidence.filter((entry) =>
    session.surface.selectedItemId !== null && entry.itemIds.includes(session.surface.selectedItemId)) ?? [], [
    analysis.result, session.surface.selectedItemId,
  ]);
  return <>
    <GraphAnalysisMarkers pinned={session.surface.analyze.pinnedAnnotations} preview={preview}
      viewport={session.surface.viewport} />
    {session.surface.analyzeOpen ? <GraphAnalyzeOverlay
      activeTab={session.surface.analyze.activeTab}
      analysis={evidence}
      colorVisionMode={session.surface.appearance.colorVisionMode}
      itemPresentation={selectedItem && 'presentation' in selectedItem
        ? normalizeGraphItemPresentation(selectedItem.presentation) : undefined}
      message={analysis.message}
      onClose={() => { setPreview(null); onUpdateAnalyze({ open: false }); }}
      onPin={(entry) => {
        const annotation = graphPinnedAnnotation(entry);
        if (!annotation) return;
        const pins = session.surface.analyze.pinnedAnnotations;
        onUpdateAnalyze({ pinnedAnnotations: pins.some((pin) => pin.annotationId === annotation.annotationId)
          ? pins.filter((pin) => pin.annotationId !== annotation.annotationId) : [...pins, annotation] });
      }}
      onPreview={setPreview}
      onRecenter={(entry) => {
        const x = graphFeatureNumber(entry.coordinates?.x); const y = graphFeatureNumber(entry.coordinates?.y);
        if (x === undefined && y === undefined) return;
        const viewport = session.surface.viewport;
        const width = viewport.xMax - viewport.xMin; const height = viewport.yMax - viewport.yMin;
        onSetViewport({ ...viewport,
          ...(x === undefined ? {} : { xMin: x - width / 2, xMax: x + width / 2 }),
          ...(y === undefined ? {} : { yMin: y - height / 2, yMax: y + height / 2 }) });
      }}
      onTabChange={(activeTab) => onUpdateAnalyze({ activeTab })}
      onUpdatePresentation={selectedItem && 'presentation' in selectedItem
        ? (presentation) => { onUpdatePresentation(selectedItem.itemId, presentation); } : undefined}
      onWidthChange={(width) => onUpdateAnalyze({ width })}
      pinned={session.surface.analyze.pinnedAnnotations}
      selectedItemLabel={selectedItem && 'source' in selectedItem
        ? graphItemSourceLatex(selectedItem) : 'No item selected'}
      state={analysis.state}
      theme={session.surface.appearance.theme}
      width={session.surface.analyze.width}
    /> : null}
  </>;
}
