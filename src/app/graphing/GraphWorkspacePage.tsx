import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react';
import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator/workspace-instance-types';
import {
  graphPiecewiseBranchLabel,
  graphPresentationFrameItems,
  type GraphItemSpecV1,
  type GraphNoteItemV1,
} from '../../lib/graphing';
import {
  createGraphWorkspaceSessionState,
  type GraphPiecewiseAuthoringDraftV1,
  type GraphWorkspaceSessionStateV7,
} from './graph-workspace-session';
import graphBrandIcon from '../../../src-tauri/icons/32x32.png';
import { GraphViewportHost } from './GraphViewportHost';
import { GraphToolbar } from './GraphToolbar';
import { useGraphWorkbenchLayout } from './useGraphWorkbenchLayout';
import { useLightDismiss } from '../../components/useLightDismiss';
import { useGraphWorkspaceController } from './useGraphWorkspaceController';
import { GraphAnalyzeIntegration } from './GraphAnalyzeIntegration';
import { GraphComplexViewport } from './GraphComplexViewport';
import { GraphExpressionRow } from './GraphExpressionRow';
import { complexValuesOn } from './graph-document';
import { GraphPiecewiseEditor } from './GraphPiecewiseEditor';
import { GraphExamplesGallery } from './GraphExamplesGallery';
import { graphDocumentIsEmpty, graphSessionWithExample, type GraphExample } from './graph-examples';
import { useGraphGestureSampling } from './useGraphGestureSampling';
import { useGraphEqualAxes } from './useGraphEqualAxes';
import { useGraphComplexPlaneItems } from './useGraphComplexPlaneItems';
import { graphItemTraceRoutes } from './graph-item-routes';
import { graphMenuKeyDown } from './graph-menu-keys';
import { usePtxPointsOfInterest } from './ptx/usePtxPointsOfInterest';
import type { PtxTracedPoint } from './ptx/usePtxComplexTrace';

type GraphWorkspacePageProps = {
  gpuRendering?: 'auto' | 'off';
  /** Opens a new Graph tab holding the session `build` makes for it (a gallery example). */
  onOpenGraphTab?: (build: (instanceId: string, title: string) => GraphWorkspaceSessionStateV7) => void;
  session: GraphWorkspaceSessionStateV7;
  workspaceContext: WorkspaceInstanceRuntimeContext;
  onUpdateSession: (session: GraphWorkspaceSessionStateV7) => void;
};

type GraphRailEntry =
  | { kind: 'expression'; item: GraphItemSpecV1 | null; itemId: string }
  | { kind: 'note'; item: GraphNoteItemV1 }
  | { kind: 'piecewise-draft'; draft: GraphPiecewiseAuthoringDraftV1 };

function GraphNoteRow({
  item,
  onChange,
  onDelete,
  readOnly,
}: {
  item: GraphNoteItemV1;
  onChange: (text: string) => void;
  onDelete: () => void;
  readOnly: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [limitAttempted, setLimitAttempted] = useState(false);
  const resize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.height = `${Math.max(72, textarea.scrollHeight)}px`;
  }, []);
  useLayoutEffect(() => {
    resize();
  }, [item.text, resize]);
  return (
    <section className="graph-note-row" data-graph-item-id={item.itemId} data-testid="graph-note-row">
      <textarea
        aria-describedby={limitAttempted ? `${item.itemId}-note-limit` : undefined}
        aria-label="Graph note"
        onChange={(event) => {
          const next = event.currentTarget.value;
          if (next.length > 16_384) {
            setLimitAttempted(true);
            return;
          }
          setLimitAttempted(false);
          onChange(next);
          requestAnimationFrame(resize);
        }}
        placeholder="Write a note…"
        readOnly={readOnly}
        ref={textareaRef}
        value={item.text}
      />
      {!readOnly ? <button aria-label="Delete note" className="graph-icon-button" onClick={onDelete} type="button">
        <Trash2 aria-hidden="true" size={16} />
      </button> : null}
      <span className="graph-note-count">{item.text.length.toLocaleString()} / 16,384</span>
      {limitAttempted ? <p className="graph-note-limit" id={`${item.itemId}-note-limit`} role="alert">
        Notes can contain up to 16,384 characters. No text was removed.
      </p> : null}
    </section>
  );
}

function GraphRowOrderControls({
  index,
  itemId,
  itemCount,
  onMove,
}: {
  index: number;
  itemId: string;
  itemCount: number;
  onMove: (itemId: string, index: number) => void;
}) {
  const [grabbed, setGrabbed] = useState(false);
  return <div className="graph-row-order-controls">
    <button
      aria-label={`Reorder item ${index + 1}`}
      aria-pressed={grabbed}
      className="graph-row-drag-handle"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/x-graph-item-id', itemId);
      }}
      onKeyDown={(event) => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault(); setGrabbed((value) => !value); return;
        }
        if (!grabbed) return;
        if (event.key === 'Escape') { event.preventDefault(); setGrabbed(false); return; }
        if (event.key === 'ArrowUp' && index > 0) { event.preventDefault(); onMove(itemId, index - 1); }
        if (event.key === 'ArrowDown' && index < itemCount - 1) { event.preventDefault(); onMove(itemId, index + 1); }
      }}
      title="Drag to reorder. Press Space, then use arrow keys."
      type="button"
    ><GripVertical aria-hidden="true" size={16} /></button>
    <button aria-label={`Move item ${index + 1} up`} disabled={index === 0}
      onClick={() => onMove(itemId, index - 1)} type="button"><ArrowUp aria-hidden="true" size={12} /></button>
    <button aria-label={`Move item ${index + 1} down`} disabled={index === itemCount - 1}
      onClick={() => onMove(itemId, index + 1)} type="button"><ArrowDown aria-hidden="true" size={12} /></button>
  </div>;
}

export default function GraphWorkspacePage({
  gpuRendering = 'auto',
  onOpenGraphTab,
  onUpdateSession,
  session: initialSession,
  workspaceContext,
}: GraphWorkspacePageProps) {
  const [viewportSize, setViewportSize] = useState({ width: 960, height: 600 });
  const [gridPanelOpen, setGridPanelOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const addItemButtonRef = useRef<HTMLButtonElement>(null);
  const addItemMenuRef = useRef<HTMLDivElement>(null);
  const addItemTriggers = useMemo(() => [addItemButtonRef], []);
  useLightDismiss({ open: addItemOpen, onClose: () => setAddItemOpen(false), layerRef: addItemMenuRef, triggerRefs: addItemTriggers });
  const [examplesOpen, setExamplesOpen] = useState(false);
  const examplesTriggerRef = useRef<HTMLButtonElement | null>(null);
  const examplesTriggers = useMemo(() => [examplesTriggerRef, addItemButtonRef], []);
  const promotedItemIdRef = useRef<string | null>(null);
  const piecewiseFocusItemIdRef = useRef<string | null>(null);
  const controller = useGraphWorkspaceController({
    cssSize: viewportSize,
    initialSession,
    onPersistSession: onUpdateSession,
    workspaceContext,
  });
  const {
    bothDivider, panelClassName, panelRef, panelStyle, railCollapsed, railResizer, sizeClass, toggleRail, workbenchClassName,
    workbenchRef, workbenchStyle,
  } = useGraphWorkbenchLayout(controller);
  const { equalAxes, reportSize: reportPaneSize, setEqualAxes } = useGraphEqualAxes({
    setViewport: controller.setViewport, viewport: controller.session.surface.viewport,
  });
  const handleRealPaneSize = useCallback((size: { width: number; height: number }) => {
    setViewportSize(size); reportPaneSize(size);
  }, [reportPaneSize]);
  const piecewiseDrafts = useMemo(
    () => controller.session.authoring?.piecewiseDrafts ?? [],
    [controller.session.authoring?.piecewiseDrafts],
  );
  const piecewiseDraftsByItem = useMemo(() => new Map(
    piecewiseDrafts.filter((draft) => draft.mode === 'replace').map((draft) => [draft.itemId, draft]),
  ), [piecewiseDrafts]);
  const railEntries = useMemo<GraphRailEntry[]>(() => [
    ...controller.session.document.items.map((item): GraphRailEntry => item.kind === 'note'
      ? { kind: 'note', item }
      : { kind: 'expression', item, itemId: item.itemId }),
    ...piecewiseDrafts.filter((draft) => draft.mode === 'create').map((draft) => ({
      kind: 'piecewise-draft' as const, draft,
    })),
    { kind: 'expression', item: null, itemId: controller.blankItemId },
  ], [controller.blankItemId, controller.session.document.items, piecewiseDrafts]);
  const scene = useMemo(() => {
    const sampled = controller.sampleResult?.scene ?? null;
    if (!sampled || controller.suppressedPiecewiseItems.size === 0) return sampled;
    const visible = (itemId: string | undefined) => !itemId || !controller.suppressedPiecewiseItems.has(itemId);
    return {
      ...sampled,
      planarScene: {
        ...sampled.planarScene,
        paths: sampled.planarScene.paths.filter((path) => visible(path.itemId)),
        regions: sampled.planarScene.regions.filter((region) => visible(region.itemId)),
        pointBatches: sampled.planarScene.pointBatches.filter((batch) => visible(batch.itemId)),
        labels: sampled.planarScene.labels.filter((label) => visible(label.itemId)),
      },
      surfaceMeshes: sampled.surfaceMeshes.filter((mesh) => visible(mesh.itemId)),
    };
  }, [controller.sampleResult, controller.suppressedPiecewiseItems]);
  const visibleCount = controller.session.document.items.filter((item) => item.kind !== 'note' && item.visible).length;
  const presentation = useMemo(() => ({
    version: 2 as const,
    contentRevision: controller.session.document.contentRevision,
    theme: controller.session.surface.appearance.theme,
    colorVisionMode: controller.session.surface.appearance.colorVisionMode,
    items: graphPresentationFrameItems(controller.session.document.items),
  }), [
    controller.session.document.contentRevision,
    controller.session.document.items,
    controller.session.surface.appearance,
  ]);
  const piecewiseEvidenceByItem = useMemo(() => new Map((controller.sampleResult?.itemEvidence ?? [])
    .flatMap((evidence) => evidence.piecewiseCondition ? [[evidence.itemId, evidence.piecewiseCondition] as const] : [])),
  [controller.sampleResult]);
  const runtimeWarnings = useMemo(() => {
    const warnings = new Map<string, string>();
    for (const evidence of controller.sampleResult?.itemEvidence ?? []) {
      if (evidence.achievedQuality === 'unresolved') {
        warnings.set(evidence.itemId, 'Could not resolve this item in the current view.');
      } else if (evidence.achievedQuality === 'reduced-detail') {
        warnings.set(evidence.itemId, 'Reduced detail at this zoom.');
      }
    }
    for (const reason of controller.sampleResult?.stopReasons ?? []) {
      if (!reason.path || warnings.has(reason.path)) continue;
      if (reason.code === 'region-topology-inconclusive') {
        warnings.set(
          reason.path,
          'Uncertain cells were omitted rather than filling this region as complete.',
        );
      } else if (reason.code === 'sampling-budget-exceeded') {
        if (!warnings.has(reason.path)) warnings.set(reason.path, 'Reduced detail at this zoom.');
      } else if (reason.detailCode?.startsWith('piecewise-shadowed:')) {
        // Branches are named by position ("Branch 2"), whatever their internal IDs.
        const item = controller.session.document.items.find((candidate) => candidate.itemId === reason.path);
        const [earlier, later] = (reason.detailCode.split(':')[2] ?? '').split(',').map((id) => (
          item?.kind === 'piecewise' ? graphPiecewiseBranchLabel(item.piecewise, id) ?? 'A branch' : 'A branch'));
        warnings.set(reason.path, `${later} is partly covered by ${earlier?.toLowerCase()}; the first matching branch is drawn.`);
      } else if (reason.detailCode?.startsWith('piecewise-impossible:')) {
        const scope = reason.detailCode.includes('impossible-global') ? 'for every input' : 'in the current view';
        warnings.set(reason.path, `One piecewise branch cannot apply ${scope}.`);
      } else if (reason.detailCode?.startsWith('piecewise-unresolved:')
        || reason.detailCode === 'piecewise-boundary-unresolved') {
        warnings.set(reason.path, 'A piecewise condition boundary could not be resolved in this view.');
      }
    }
    return warnings;
  }, [controller.sampleResult, controller.session.document.items]);
  const itemRoutes = useMemo(() => graphItemTraceRoutes(controller.session.document.items), [controller.session.document.items]);
  const hasPolarRelation = controller.session.document.items.some((item) => (
    item.kind === 'relation' && item.visible && item.relation.kind === 'polar-radius'
  ));
  const gestureLane = useGraphGestureSampling({ cssSize: viewportSize, document: controller.session.document, workspaceContext });
  const complexPlaneItems = useGraphComplexPlaneItems(controller.session.document, scene, controller.session.surface.appearance.colorVisionMode);
  const { dots: ptxDots, asymptotes: ptxAsymptotes, stretches: ptxStretches } = usePtxPointsOfInterest({ session: controller.session, workspaceContext });
  const [complexTraced, setComplexTraced] = useState<PtxTracedPoint>(null);
  const activeComplexTile = scene?.complexTiles.find((tile) => tile.itemId === controller.session.surface.selectedItemId)
    ?? scene?.complexTiles[0] ?? null;

  const focusNextRow = useCallback((itemId: string) => {
    requestAnimationFrame(() => {
      const rows = [...document.querySelectorAll<HTMLElement>('[data-graph-item-id]')];
      const index = rows.findIndex((row) => row.dataset.graphItemId === itemId);
      const nextField = rows[index + 1]?.querySelector<HTMLElement>('math-field');
      nextField?.focus();
    });
  }, []);

  useLayoutEffect(() => {
    const itemId = promotedItemIdRef.current;
    if (!itemId) return;
    const field = document.querySelector<HTMLElement>(
      `[data-graph-item-id="${itemId}"] math-field`,
    );
    if (!field?.isConnected) return;
    if (document.activeElement !== field) {
      field.focus();
    }
    promotedItemIdRef.current = null;
  }, [controller.blankItemId]);

  useLayoutEffect(() => {
    const itemId = piecewiseFocusItemIdRef.current;
    if (!itemId) return;
    const field = document.querySelector<HTMLElement>(`[data-graph-item-id="${itemId}"] math-field`);
    if (!field) return;
    field.focus({ preventScroll: true });
    piecewiseFocusItemIdRef.current = null;
  }, [controller.session.authoring?.piecewiseDrafts.length]);

  return (
    <article className="app-page app-page--graphing graph-page" data-size-class={sizeClass} data-graph-theme={controller.session.surface.appearance.theme}
      data-testid="graph-page">
      <header className="app-page-shell-header graph-page-header">
        <span className="graph-brand-mark" aria-hidden="true">
          <img alt="" src={graphBrandIcon} />
        </span>
        <strong>REZANOVA</strong>
        <span className="graph-header-divider" aria-hidden="true" />
        <span>Graphing</span>
      </header>

      <main className={workbenchClassName} ref={workbenchRef} style={workbenchStyle}>
        <GraphToolbar controller={controller} equalAxes={equalAxes} gridPanelOpen={gridPanelOpen}
          onToggleRail={toggleRail} railCollapsed={railCollapsed}
          setEqualAxes={setEqualAxes} setGridPanelOpen={setGridPanelOpen} />
        {railResizer}

        <aside className="graph-expression-rail" aria-label="Expressions">
          <div className="graph-expression-list">
            {railEntries.map((entry) => {
              if (entry.kind === 'piecewise-draft') {
                const { draft } = entry;
                return <GraphPiecewiseEditor
                  appearance={controller.session.surface.appearance}
                  draft={draft}
                  key={draft.draftId}
                  onChange={(branchId, field, value) => controller.updatePiecewiseDraft({
                    itemId: draft.itemId, branchId, field, value,
                  })}
                  onDelete={() => controller.removePiecewiseDraft(draft.itemId)}
                  onCommit={() => controller.commitPiecewiseDraft(draft.itemId)}
                  onMutate={(edit) => controller.mutatePiecewiseDraft({ itemId: draft.itemId, ...edit })}
                />;
              }
              if (entry.kind === 'note') {
                const index = controller.session.document.items.findIndex((item) => item.itemId === entry.item.itemId);
                return <div className="graph-persisted-row" data-testid="graph-persisted-row"
                  key={entry.item.itemId} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
                    const dragged = event.dataTransfer.getData('text/x-graph-item-id');
                    if (dragged) controller.reorderItem(dragged, index);
                  }}>
                  {!controller.session.surface.presentationMode ? <GraphRowOrderControls index={index}
                    itemCount={controller.session.document.items.length} itemId={entry.item.itemId}
                    onMove={controller.reorderItem} /> : <div aria-hidden="true" className="graph-row-order-placeholder" />}
                  <GraphNoteRow item={entry.item}
                    onChange={(text) => controller.updateNote(entry.item.itemId, text)}
                    onDelete={() => controller.removeItem(entry.item.itemId)}
                    readOnly={controller.session.surface.presentationMode} />
                </div>;
              }
              const { item, itemId } = entry;
              return (
                <GraphExpressionRow
                  appearance={controller.session.surface.appearance}
                  errorVisible={item
                    ? controller.visibleDraftErrors.has(item.itemId)
                    : false}
                  item={item}
                  itemId={itemId}
                  key={itemId}
                  onBlur={() => {
                    if (item) controller.blurItem(itemId);
                    controller.flushSampling();
                  }}
                  onChange={(latex) => {
                    if (!item && latex.trim()) promotedItemIdRef.current = itemId;
                    controller.editItem(itemId, latex);
                  }}
                  onDelete={item ? () => controller.removeItem(itemId) : undefined}
                  onBeginPiecewiseDraft={item?.kind === 'piecewise'
                    ? () => { controller.beginPiecewiseDraft(itemId); }
                    : undefined}
                  onCancelPiecewiseDraft={item?.kind === 'piecewise'
                    ? () => controller.removePiecewiseDraft(itemId)
                    : undefined}
                  onChangePiecewiseDraft={item?.kind === 'piecewise'
                    ? (branchId, field, value) => { controller.updatePiecewiseDraft({ itemId, branchId, field, value }); }
                    : undefined}
                  onCommitPiecewiseDraft={item?.kind === 'piecewise'
                    ? () => controller.commitPiecewiseDraft(itemId)
                    : undefined}
                  onMutatePiecewiseDraft={item?.kind === 'piecewise'
                    ? (edit) => controller.mutatePiecewiseDraft({ itemId, ...edit })
                    : undefined}
                  onUpdateBranchPresentation={item?.kind === 'piecewise'
                    ? (branchKey, presentation) => { controller.updateBranchPresentation(itemId, branchKey, presentation); }
                    : undefined}
                  piecewiseEvidence={item?.kind === 'piecewise' ? piecewiseEvidenceByItem.get(itemId) ?? null : null}
                  onSettleParameter={item?.kind === 'parameter'
                    ? () => {
                        controller.endTypingTransaction();
                        controller.flushSampling();
                      }
                    : undefined}
                  onSubmit={() => {
                    controller.endTypingTransaction();
                    controller.flushSampling();
                    focusNextRow(itemId);
                  }}
                  onToggle={item ? () => controller.toggleItem(itemId) : undefined}
                  onToggleComplexValues={item?.kind === 'relation' && item.relation.kind === 'explicit-y'
                    ? () => controller.setComplexValues(itemId, !complexValuesOn(item)) : undefined}
                  onUpdatePresentation={item && 'presentation' in item
                    ? (presentation) => { controller.updatePresentation(itemId, presentation); }
                    : undefined}
                  onUpdateParameter={item?.kind === 'parameter'
                    ? (values) => controller.updateParameter(itemId, values)
                    : undefined}
                  runtimeWarning={item ? runtimeWarnings.get(itemId) : undefined}
                  samplingBusy={controller.status.kind === 'sampling' || controller.status.kind === 'editing'}
                  piecewiseDraft={piecewiseDraftsByItem.get(itemId)}
                  viewport={controller.session.surface.viewport}
                  onUpdateSurfaceBounds={item?.kind === 'relation' && item.relation.kind === 'real-surface'
                    ? (bounds) => controller.updateSurfaceBounds(itemId, bounds) : undefined}
                />
              );
            })}
          </div>
          <div className="graph-rail-note">
            {controller.unresolvedSymbols.length > 0 ? (
              <div className="graph-parameter-discovery" role="group" aria-label="Create graph sliders">
                <strong>Unresolved parameters</strong>
                {controller.unresolvedSymbols.map((symbol) => (
                  <button
                    key={symbol}
                    onClick={() => controller.createParameters([symbol])}
                    type="button"
                  >
                    Create slider for {symbol}
                  </button>
                ))}
                {controller.unresolvedSymbols.length > 1 ? (
                  <button onClick={() => controller.createParameters(controller.unresolvedSymbols)} type="button">
                    Create all sliders
                  </button>
                ) : null}
              </div>
            ) : null}
            <div className="graph-add-item">
              <button aria-expanded={addItemOpen} aria-haspopup="menu" className="graph-add-point-button" ref={addItemButtonRef}
                onClick={(event) => {
                  setAddItemOpen((open) => !open);
                  // Opened from the keyboard (Enter/Space): focus the first item, as a menu button should.
                  const container = event.currentTarget.parentElement;
                  if (event.detail === 0) requestAnimationFrame(() => container?.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
                }} type="button">+ Add item</button>
              {addItemOpen ? <div className="graph-add-item-menu" onKeyDown={graphMenuKeyDown(() => setAddItemOpen(false))}
                ref={addItemMenuRef} role="menu">
                <button onClick={() => {
                  const itemId = controller.addNote();
                  setAddItemOpen(false);
                  requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>(
                    `[data-graph-item-id="${itemId}"] textarea`,
                  )?.focus({ preventScroll: true }));
                }} role="menuitem" type="button">Note</button>
                <button onClick={() => {
                  const itemId = controller.createPiecewiseDraft();
                  piecewiseFocusItemIdRef.current = itemId;
                  setAddItemOpen(false);
                  setTimeout(() => document.querySelector<HTMLElement>(
                    `[data-graph-item-id="${itemId}"] math-field`,
                  )?.focus({ preventScroll: true }), 0);
                }} role="menuitem" type="button">Piecewise Function</button>
                <button onClick={() => {
                  const itemId = controller.addPointSet(); setAddItemOpen(false);
                  requestAnimationFrame(() => document.querySelector<HTMLElement>(
                    `[data-graph-item-id="${itemId}"] math-field`,
                  )?.focus({ preventScroll: true }));
                }} role="menuitem" type="button">Point Set</button>
                <button onClick={() => { setAddItemOpen(false); setExamplesOpen(true); }} role="menuitem" type="button">Examples…</button>
              </div> : null}
            </div>
            {graphDocumentIsEmpty(controller.session.document) ? <button className="graph-examples-open" onClick={() => setExamplesOpen((open) => !open)}
              ref={examplesTriggerRef} type="button">Browse examples</button>
              : <span>Bare x-based expressions plot directly. You do not need to type y =.</span>}
            {examplesOpen ? <GraphExamplesGallery graphEmpty={graphDocumentIsEmpty(controller.session.document)}
              onAdd={(example) => controller.loadExample(example, 'add')} onClose={() => setExamplesOpen(false)}
              onLoad={(example) => controller.loadExample(example, 'replace')}
              {...(onOpenGraphTab ? { onOpenInNewTab: (example: GraphExample) => onOpenGraphTab((instanceId, title) => {
                let next = 0;
                return graphSessionWithExample(createGraphWorkspaceSessionState(instanceId, title), example, 'replace', () => `${instanceId}.item.${next += 1}`);
              }) } : {})}
              triggerRefs={examplesTriggers} /> : null}
          </div>
        </aside>

        <section className={`graph-viewport-panel is-${controller.session.surface.viewPolicy.mode}${panelClassName}`} aria-label="Graph viewport"
          ref={panelRef} style={panelStyle}>
          {controller.session.surface.viewPolicy.mode !== 'complex' ? <GraphViewportHost
            document={controller.session.document} gestureLane={gestureLane} gpuRendering={gpuRendering}
            grid={controller.session.surface.grid}
            onPaneViewChange={(values) => controller.updatePaneView('real', values)}
            onSelectItem={controller.selectItem}
            onSizeChange={handleRealPaneSize} ptxAsymptotes={ptxAsymptotes} ptxDots={ptxDots} ptxStretches={ptxStretches}
            ptxMirror={controller.session.surface.viewPolicy.mode === 'both' ? complexTraced : null}
            onViewportChange={controller.setViewport}
            itemRoutes={itemRoutes}
            paneView={controller.session.surface.panes.real}
            // A piecewise item hidden while its branches are being fixed is already out of the scene; other curves stay traceable.
            pending={controller.isScenePending}
            presentation={presentation}
            scene={scene}
            sceneViewport={controller.sampleResult?.viewport ?? null}
            selectedItemId={controller.session.surface.selectedItemId}
            viewport={controller.session.surface.viewport}
          /> : null}
          {bothDivider}
          {controller.session.surface.viewPolicy.mode !== 'real' ? <GraphComplexViewport
            colorVisionMode={controller.session.surface.appearance.colorVisionMode}
            displayMode={controller.session.surface.complex.displayMode}
            document={controller.session.document} gpuRendering={gpuRendering}
            onDisplayModeChange={(displayMode) => controller.updateComplexView({ displayMode })}
            onPaneViewChange={(values) => controller.updatePaneView('complex', values)}
            onSizeChange={controller.session.surface.viewPolicy.mode === 'complex' ? reportPaneSize : undefined}
            onViewportChange={controller.setViewport}
            paneView={controller.session.surface.panes.complex}
            planeItems={complexPlaneItems} presentation={presentation} ptxDots={ptxDots}
            onSelectItem={controller.selectItem} onTracedPointChange={setComplexTraced}
            tile={activeComplexTile}
            viewport={controller.session.surface.viewport}
          /> : null}
          <GraphAnalyzeIntegration onAddAssumption={controller.addAssumption}
            onRemoveAssumption={controller.removeAssumption} onSetViewport={controller.setViewport}
            onUpdateAnalyze={controller.updateAnalyze}
            session={controller.session} workspaceContext={workspaceContext} />
          {controller.status.kind === 'sampling' || controller.suppressedPiecewiseItems.size > 0 ? (
            <span className="graph-pending-badge">{controller.suppressedPiecewiseItems.size > 0
              ? 'Complete piecewise branches' : 'Updating'}</span>
          ) : null}
          {hasPolarRelation && controller.session.surface.grid.kind !== 'polar' ? (
            <button
              className="graph-polar-grid-suggestion"
              onClick={() => controller.updateGrid({ kind: 'polar', angleLabels: true })}
              type="button"
            >
              Switch to Polar grid
            </button>
          ) : null}
        </section>
      </main>

      <footer className="app-page-shell-footer graph-page-footer">
        <span className={`graph-status is-${controller.status.kind}`}>
          <span className="graph-status-dot" aria-hidden="true" />
          {controller.status.label}
        </span>
        <span>{visibleCount} visible {visibleCount === 1 ? 'item' : 'items'}</span>
        <span>{controller.session.surface.panes.real.dimension === '3d'
          ? 'MMB pan · Alt+LMB orbit · wheel zoom · F focus · Home reset'
          : 'Click to trace · move to sweep · scroll to zoom · drag to pan'}</span>
      </footer>
    </article>
  );
}
