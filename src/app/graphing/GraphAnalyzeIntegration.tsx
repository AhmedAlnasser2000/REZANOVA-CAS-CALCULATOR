import { useMemo, useState } from 'react';
import type { GraphSurfaceStateV5, GraphViewportV1 } from '../../lib/graphing';
import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator/workspace-instance-types';
import { graphItemSourceLatex } from './graph-document';
import { GraphAnalysisMarkers, GraphAnalyzeOverlay } from './GraphAnalyzeOverlay';
import { graphFeatureNumber, graphPinnedAnnotation } from './graph-analysis-overlay-support';
import type { GraphWorkspaceSessionStateV7 } from './graph-workspace-session';
import { useGraphAnalysis } from './useGraphAnalysis';

export function GraphAnalyzeIntegration({
  onAddAssumption, onRemoveAssumption, onSetViewport, onUpdateAnalyze, session, workspaceContext,
}: {
  onAddAssumption: (sourceLatex: string) => boolean;
  onRemoveAssumption: (assumptionId: string) => void;
  onSetViewport: (viewport: GraphViewportV1) => void;
  onUpdateAnalyze: (values: Partial<GraphSurfaceStateV5['analyze']> & { open?: boolean }) => void;
  session: GraphWorkspaceSessionStateV7;
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
      assumptions={session.document.assumptions}
      complexSolve={selectedItem?.kind === 'relation' && (selectedItem.relation.kind === 'complex-mapping' || selectedItem.relation.kind === 'complex-roots')}
      hasSelection={Boolean(selectedItem)}
      message={analysis.message}
      onClose={() => { setPreview(null); onUpdateAnalyze({ open: false }); }}
      onAddAssumption={onAddAssumption}
      onPin={(entry) => {
        const annotation = graphPinnedAnnotation(entry);
        if (!annotation) return;
        const pins = session.surface.analyze.pinnedAnnotations;
        onUpdateAnalyze({ pinnedAnnotations: pins.some((pin) => pin.annotationId === annotation.annotationId)
          ? pins.filter((pin) => pin.annotationId !== annotation.annotationId) : [...pins, annotation] });
      }}
      onPreview={setPreview}
      onRemoveAssumption={onRemoveAssumption}
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
      onWidthChange={(width) => onUpdateAnalyze({ width })}
      pinned={session.surface.analyze.pinnedAnnotations}
      selectedItemLabel={selectedItem && 'source' in selectedItem
        ? graphItemSourceLatex(selectedItem) : 'No item selected'}
      state={analysis.state}
      width={session.surface.analyze.width}
    /> : null}
  </>;
}
