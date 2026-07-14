import type { Editor } from '@tiptap/core';
import {
  PanelLeftOpen,
  PanelRightOpen,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  lazy,
  useMemo,
  useRef,
  useState,
  Suspense,
  type CSSProperties,
} from 'react';

import {
  NOTEBOOK_LIVE_BLOCK_TARGET,
  NOTEBOOK_PERFORMANCE_PROFILES,
  createNotebookPerformanceFixture,
  createNotebookRichDocument,
  getDefaultNotebookLibraryService,
  requestNotebookWorkspaceClose,
  type NotebookLibraryService,
  type NotebookPerformanceProfile,
  type NotebookRichDocument,
  type NotebookStoredRecordV1,
  type NotebookSurfaceState,
  type NotebookWorkspaceTarget,
} from '../../lib/notebook';
import type { WorkspaceInstanceStateSlot } from '../runtime/workspace-instances';
import { NotebookAuthoringKeyboard } from './notebook/authoring-keyboard';
import {
  NotebookRichCanvas,
  notebookEditorNodeById,
  type NotebookEditorSelection,
  type NotebookMediaStatus,
  type NotebookPaginationMetrics,
  type NotebookRibbonTab,
} from './notebook/canvas';
import {
  NotebookMathFieldProvider,
  useNotebookMathFieldController,
} from './notebook/math-field';
import { NotebookInspector } from './notebook/NotebookInspector';
import { NotebookOutline } from './notebook/NotebookOutline';
import { NotebookPaneResizer } from './notebook/NotebookPaneResizer';
import {
  NotebookTransientLayerProvider,
  useNotebookTransientLayer,
} from './notebook/transient-ui';
import { useNotebookUiState } from './notebook/useNotebookUiState';
import { useNotebookDocumentAnalysis } from './notebook/useNotebookDocumentAnalysis';
import { NotebookFileBackstage } from './notebook/library/NotebookFileBackstage';
import { downloadNotebookPackage } from './notebook/library/downloadNotebookPackage';
import { useNotebookLibrarySession } from './notebook/library/useNotebookLibrarySession';
import { NotebookPdfExportDialog } from './notebook/publication';

const NotebookDocxExportDialog = lazy(async () => {
  const module = await import('./notebook/publication/NotebookDocxExportDialog');
  return { default: module.NotebookDocxExportDialog };
});

const NotebookWebExportDialog = lazy(async () => {
  const module = await import('./notebook/publication/NotebookWebExportDialog');
  return { default: module.NotebookWebExportDialog };
});

type NotebookPageProps = {
  instanceId: string;
  libraryService?: NotebookLibraryService;
  onOpenMathInTool: (target: NotebookWorkspaceTarget, latex: string) => void;
  onUpdateSurfaceState: (instanceId: string, state: NotebookSurfaceState) => void;
  surfaceState: WorkspaceInstanceStateSlot;
};

type NotebookDrawer = 'outline' | 'inspector' | null;

function selectionUsesInspector(
  selection: NotebookEditorSelection | null,
): selection is NotebookEditorSelection {
  return selection?.type === 'inlineMath'
    || selection?.type === 'displayMath'
    || selection?.type === 'semanticBlock'
    || selection?.type === 'notebookSection';
}

function NotebookPageContent({
  instanceId,
  libraryService,
  onOpenMathInTool,
  onUpdateSurfaceState,
  surfaceState,
}: NotebookPageProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [selection, setSelection] = useState<NotebookEditorSelection | null>(null);
  const [activeRibbonTab, setActiveRibbonTab] = useState<NotebookRibbonTab>('home');
  const [pagination, setPagination] = useState<NotebookPaginationMetrics>({
    currentPage: 1,
    fragments: [],
    pageCount: 1,
    pageGapPx: 24,
    pageHeightPx: 1,
  });
  const [mediaStatus, setMediaStatus] = useState<NotebookMediaStatus | null>(null);
  const [pdfRecord, setPdfRecord] = useState<NotebookStoredRecordV1 | null>(null);
  const [docxRecord, setDocxRecord] = useState<NotebookStoredRecordV1 | null>(null);
  const [webRecord, setWebRecord] = useState<NotebookStoredRecordV1 | null>(null);
  const [lastRelevantSelection, setLastRelevantSelection] = useState<NotebookEditorSelection | null>(null);
  const { active: activeMathField } = useNotebookMathFieldController();
  const workbenchRef = useRef<HTMLDivElement | null>(null);
  const collapsedInspectorSelectionIdRef = useRef<string | null>(null);
  const { patchUiState, uiState } = useNotebookUiState(instanceId);
  const [service] = useState(() => libraryService ?? getDefaultNotebookLibraryService());
  const librarySession = useNotebookLibrarySession({
    instanceId,
    onUpdateSurfaceState,
    service,
    surfaceState,
  });
  const outlineDrawer = useNotebookTransientLayer({ id: 'notebook-outline-drawer' });
  const inspectorDrawer = useNotebookTransientLayer({ id: 'notebook-inspector-drawer' });
  const activeDrawer: NotebookDrawer = outlineDrawer.isOpen
    ? 'outline'
    : inspectorDrawer.isOpen ? 'inspector' : null;
  const [loadingDocument] = useState(() => createNotebookRichDocument({
    idPrefix: `${instanceId}.loading`,
  }));
  const [developmentFixture] = useState<NotebookRichDocument | null>(() => {
    if (!import.meta.env.DEV) {
      return null;
    }
    const requestedProfile = new URLSearchParams(window.location.search)
      .get('notebookPerformance');
    if (
      !requestedProfile
      || !Object.hasOwn(NOTEBOOK_PERFORMANCE_PROFILES, requestedProfile)
    ) {
      return null;
    }
    return createNotebookPerformanceFixture(requestedProfile as NotebookPerformanceProfile);
  });
  const sessionDocument = librarySession.document ?? loadingDocument;
  const document = developmentFixture
    && sessionDocument.id !== developmentFixture.id
    ? developmentFixture
    : sessionDocument;
  const documentAnalysis = useNotebookDocumentAnalysis(document);
  const isLargeDocument = (documentAnalysis?.blockCount ?? 0) > NOTEBOOK_LIVE_BLOCK_TARGET;
  const effectiveViewMode = isLargeDocument ? 'draft' : uiState.viewMode;
  const publicationLayout = useMemo(() => ({
    fragments: pagination.fragments,
    pageCount: pagination.pageCount,
  }), [pagination.fragments, pagination.pageCount]);
  const workbenchStyle = {
    '--notebook-inspector-width': `${uiState.inspectorWidth}px`,
    '--notebook-outline-width': `${uiState.outlineWidth}px`,
  } as CSSProperties;
  const focusedMathSelection = editor
    && activeMathField?.field.matches(':focus')
    ? notebookEditorNodeById(editor, activeMathField.nodeId)
    : null;
  const focusedMathSelectionId = focusedMathSelection?.id ?? null;
  const focusedMathSelectionType = focusedMathSelection?.type ?? null;
  const currentRelevantSelection = focusedMathSelection ?? selection;
  const currentSelectionUsesInspector = selectionUsesInspector(currentRelevantSelection);
  const inspectorIsVisible = uiState.inspectorMode === 'manual'
    || uiState.inspectorMode === 'pinned'
    || (uiState.inspectorMode === 'auto' && currentSelectionUsesInspector);
  const inspectedSelection = currentSelectionUsesInspector
    ? currentRelevantSelection
    : uiState.inspectorMode === 'pinned' ? lastRelevantSelection : null;

  const commitDocument = librarySession.commitDocument;

  const handleSelectionChange = useCallback((nextSelection: NotebookEditorSelection | null) => {
    setSelection(nextSelection);
    if (!selectionUsesInspector(nextSelection)) {
      return;
    }
    setLastRelevantSelection(nextSelection);
    if (
      uiState.inspectorMode === 'collapsed'
      && nextSelection.id !== collapsedInspectorSelectionIdRef.current
    ) {
      collapsedInspectorSelectionIdRef.current = null;
      patchUiState({ inspectorMode: 'auto' });
    }
  }, [patchUiState, uiState.inspectorMode]);

  const handleProseSelectionChange = useCallback((proseSelection: {
    from: number;
    to: number;
  } | null) => {
    patchUiState({ proseSelection });
  }, [patchUiState]);

  const handleContextualSelectionChange = useCallback((nextSelection: NotebookEditorSelection | null) => {
    setActiveRibbonTab((current) => {
      if (nextSelection?.type === 'imageFigure') {
        return current === 'video-format' ? 'home' : current;
      }
      if (nextSelection?.type === 'videoFigure') {
        return current === 'picture-format' ? 'home' : current;
      }
      return current === 'picture-format' || current === 'video-format' ? 'home' : current;
    });
  }, []);

  const handlePaginationChange = useCallback((next: NotebookPaginationMetrics) => {
    setPagination((current) => (
      current.currentPage === next.currentPage
      && current.pageCount === next.pageCount
      && Math.abs(current.pageHeightPx - next.pageHeightPx) < 0.5
        ? current
        : next
    ));
  }, []);

  const handleMediaStatusChange = useCallback((next: NotebookMediaStatus | null) => {
    setMediaStatus((current) => {
      if (
        current?.page === next?.page
        && current?.viewMode === next?.viewMode
        && current?.xPt === next?.xPt
        && current?.yPt === next?.yPt
      ) return current;
      return next;
    });
  }, []);

  useEffect(() => {
    if (!editor || !focusedMathSelectionId || !focusedMathSelectionType) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      const nextFocusedMathSelection = notebookEditorNodeById(editor, focusedMathSelectionId);
      if (
        !selectionUsesInspector(nextFocusedMathSelection)
        || nextFocusedMathSelection.type !== focusedMathSelectionType
      ) {
        return;
      }
      setLastRelevantSelection(nextFocusedMathSelection);
      if (
        uiState.inspectorMode === 'collapsed'
        && nextFocusedMathSelection.id !== collapsedInspectorSelectionIdRef.current
      ) {
        collapsedInspectorSelectionIdRef.current = null;
        patchUiState({ inspectorMode: 'auto' });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [
    editor,
    focusedMathSelectionId,
    focusedMathSelectionType,
    patchUiState,
    uiState.inspectorMode,
  ]);

  function toggleDrawer(drawer: Exclude<NotebookDrawer, null>) {
    if (drawer === 'outline') {
      patchUiState({ outlineCollapsed: false });
      outlineDrawer.toggle();
    } else {
      if (
        !inspectorDrawer.isOpen
        && (uiState.inspectorMode === 'collapsed' || !currentSelectionUsesInspector)
      ) {
        collapsedInspectorSelectionIdRef.current = null;
        patchUiState({ inspectorMode: 'manual' });
      }
      inspectorDrawer.toggle();
    }
  }

  function restoreInspector() {
    collapsedInspectorSelectionIdRef.current = null;
    patchUiState({ inspectorMode: 'manual' });
  }

  const saveStatusLabel = librarySession.saveStatus === 'saving'
    ? 'Saving…'
    : librarySession.saveStatus === 'saved'
      ? 'Saved locally'
      : librarySession.saveStatus === 'unsaved'
        ? 'Unsaved changes'
        : 'Save failed';

  if (!librarySession.document && !developmentFixture) {
    return (
      <section className="app-page app-page--notebook" data-testid="notebook-page">
        <header className="app-page-shell-header app-page-shell-header--notebook" title="Opening Notebook…">
          Opening Notebook…
        </header>
        <div className="notebook-library-loading" role={librarySession.saveStatus === 'failed' ? 'alert' : 'status'}>
          {librarySession.saveStatus === 'failed'
            ? `Notebook could not open: ${librarySession.saveError ?? 'Local storage failed.'}`
            : 'Opening local notebook…'}
        </div>
        <footer className="app-page-shell-footer">
          <span>Opening</span>
          <span>Workspace: Notebook</span>
          <span>{saveStatusLabel}</span>
        </footer>
      </section>
    );
  }

  return (
      <section className="app-page app-page--notebook" data-testid="notebook-page">
        <header className="app-page-shell-header app-page-shell-header--notebook" title={document.title || 'Untitled Notebook'}>
          <span>{document.title || 'Untitled Notebook'}</span>
        </header>
        <div
          ref={workbenchRef}
          className={`notebook-page-workbench${uiState.outlineCollapsed ? ' is-outline-collapsed' : ''}${!inspectorIsVisible ? ' is-inspector-collapsed' : ''}`}
          style={workbenchStyle}
        >
          <NotebookOutline
            className={activeDrawer === 'outline' ? 'is-drawer-open' : undefined}
            document={document}
            editor={editor}
            selectedNodeId={inspectedSelection?.id ?? document.selectedNodeId}
            onClose={() => {
              patchUiState({ outlineCollapsed: true });
              outlineDrawer.close(false);
            }}
          />
          {!uiState.outlineCollapsed ? <NotebookPaneResizer
            containerRef={workbenchRef}
            defaultWidth={320}
            maxWidth={480}
            minWidth={240}
            onResize={(outlineWidth) => patchUiState({ outlineWidth })}
            otherPaneWidth={uiState.inspectorWidth}
            side="outline"
            width={uiState.outlineWidth}
          /> : null}
          <main className="notebook-canvas" data-testid="notebook-canvas">
            <div className="notebook-canvas-header">
              <div className="notebook-canvas-heading-row">
                <div className="notebook-canvas-heading-tools">
                  <span>Math-aware document</span>
                </div>
                <div className="notebook-drawer-toggles">
                  <button
                    data-notebook-transient-trigger={outlineDrawer.id}
                    type="button"
                    aria-label="Toggle Notebook outline"
                    aria-pressed={activeDrawer === 'outline'}
                    title="Outline"
                    onClick={() => toggleDrawer('outline')}
                  ><PanelLeftOpen aria-hidden="true" size={17} /></button>
                  <button
                    data-notebook-transient-trigger={inspectorDrawer.id}
                    type="button"
                    aria-label="Toggle block inspector"
                    aria-pressed={activeDrawer === 'inspector'}
                    title="Block inspector"
                    onClick={() => toggleDrawer('inspector')}
                  ><PanelRightOpen aria-hidden="true" size={17} /></button>
                </div>
              </div>
              <input
                aria-label="Notebook title"
                value={document.title}
                onChange={(event) => commitDocument({
                  ...document,
                  title: event.target.value,
                  updatedAt: new Date().toISOString(),
                })}
              />
              <div className="notebook-canvas-meta">
                <span aria-live="polite">
                  {documentAnalysis
                    ? `${documentAnalysis.wordCount.toLocaleString()} ${documentAnalysis.wordCount === 1 ? 'word' : 'words'}`
                    : 'Counting words…'}
                </span>
                <span>{saveStatusLabel}</span>
              </div>
              {librarySession.saveStatus === 'failed' ? (
                <div className="notebook-save-failure" role="alert">
                  <div>
                    <strong>Save failed</strong>
                    <span>{librarySession.saveError ?? 'The local copy could not be updated.'}</span>
                  </div>
                  <button type="button" onClick={() => void librarySession.saveNow()}>Retry</button>
                  <button
                    type="button"
                    disabled={!librarySession.packageAvailable}
                    onClick={() => void librarySession.exportPortable().then((output) => {
                      downloadNotebookPackage(output.bytes, `Recovery - ${output.fileName}`);
                    })}
                  >
                    Export recovery copy
                  </button>
                  <button type="button" onClick={() => requestNotebookWorkspaceClose(instanceId)}>
                    Close without saving
                  </button>
                </div>
              ) : null}
              {isLargeDocument ? (
                <div className="notebook-large-document-notice" role="status">
                  Large notebook — Draft view is active to protect responsiveness.
                </div>
              ) : null}
            </div>
            <NotebookRichCanvas
              activeRibbonTab={activeRibbonTab}
              assetPort={service.asset}
              document={document}
              fileControl={(
                <NotebookFileBackstage
                  session={librarySession}
                  onExportDocx={() => setDocxRecord(librarySession.snapshotCurrentRecord())}
                  onExportPdf={() => setPdfRecord(librarySession.snapshotCurrentRecord())}
                  onExportWeb={() => setWebRecord(librarySession.snapshotCurrentRecord())}
                />
              )}
              initialProseSelection={uiState.proseSelection}
              onChange={commitDocument}
              onEditorChange={setEditor}
              onOpenMathInTool={onOpenMathInTool}
              onProseSelectionChange={handleProseSelectionChange}
              onSelectRibbonTab={setActiveRibbonTab}
              onContextualSelectionChange={handleContextualSelectionChange}
              onImageInserted={() => setActiveRibbonTab('picture-format')}
              onVideoInserted={() => setActiveRibbonTab('video-format')}
              onMediaStatusChange={handleMediaStatusChange}
              onPaginationChange={handlePaginationChange}
              onSelectionChange={handleSelectionChange}
              onViewModeChange={(viewMode) => patchUiState({ viewMode })}
              viewMode={effectiveViewMode}
            />
            <NotebookAuthoringKeyboard instanceId={instanceId} />
          </main>
          {inspectorIsVisible ? <NotebookPaneResizer
            containerRef={workbenchRef}
            defaultWidth={300}
            maxWidth={460}
            minWidth={250}
            onResize={(inspectorWidth) => patchUiState({ inspectorWidth })}
            otherPaneWidth={uiState.outlineWidth}
            side="inspector"
            width={uiState.inspectorWidth}
          /> : null}
          {inspectorIsVisible || activeDrawer === 'inspector' ? (
            <NotebookInspector
              className={activeDrawer === 'inspector' ? 'is-drawer-open' : undefined}
              editor={editor}
              mode={uiState.inspectorMode}
              selection={inspectedSelection}
              onClose={() => {
                collapsedInspectorSelectionIdRef.current = inspectedSelection?.id ?? null;
                patchUiState({ inspectorMode: 'collapsed' });
                inspectorDrawer.close(false);
              }}
              onOpenMathInTool={onOpenMathInTool}
              onPinToggle={() => {
                collapsedInspectorSelectionIdRef.current = null;
                patchUiState({
                  inspectorMode: uiState.inspectorMode === 'pinned' ? 'auto' : 'pinned',
                });
              }}
            />
          ) : null}
          {uiState.outlineCollapsed ? (
            <button
              type="button"
              className="notebook-collapsed-rail notebook-collapsed-rail--outline"
              aria-label="Restore Notebook outline"
              title="Restore outline"
              onClick={() => patchUiState({ outlineCollapsed: false })}
            ><PanelLeftOpen aria-hidden="true" size={17} /></button>
          ) : null}
          {!inspectorIsVisible ? (
            <button
              type="button"
              className="notebook-collapsed-rail notebook-collapsed-rail--inspector"
              aria-label="Restore block inspector"
              title="Restore inspector"
              onClick={restoreInspector}
            ><PanelRightOpen aria-hidden="true" size={17} /></button>
          ) : null}
          {activeDrawer ? (
            <button
              type="button"
              className="notebook-drawer-backdrop"
              aria-label="Close Notebook drawer"
              onClick={() => activeDrawer === 'outline'
                ? outlineDrawer.close(false)
                : inspectorDrawer.close(false)}
            />
          ) : null}
        </div>
        {pdfRecord ? (
          <NotebookPdfExportDialog
            assetPort={service.asset}
            layout={publicationLayout}
            record={pdfRecord}
            sourceViewMode={effectiveViewMode}
            onClose={() => setPdfRecord(null)}
          />
        ) : null}
        {docxRecord ? (
          <Suspense fallback={null}>
            <NotebookDocxExportDialog
              assetPort={service.asset}
              layout={publicationLayout}
              record={docxRecord}
              onClose={() => setDocxRecord(null)}
            />
          </Suspense>
        ) : null}
        {webRecord ? (
          <Suspense fallback={null}>
            <NotebookWebExportDialog
              assetPort={service.asset}
              layout={publicationLayout}
              record={webRecord}
              onClose={() => setWebRecord(null)}
            />
          </Suspense>
        ) : null}
        <footer className="app-page-shell-footer">
          <span>{mediaStatus
            ? mediaStatus.viewMode === 'draft'
              ? `Draft · X ${mediaStatus.xPt.toFixed(1)} pt · Y ${mediaStatus.yPt.toFixed(1)} pt`
              : `Page ${mediaStatus.page} · X ${mediaStatus.xPt.toFixed(1)} pt · Y ${mediaStatus.yPt.toFixed(1)} pt`
            : effectiveViewMode === 'draft'
              ? 'Draft view'
              : `Page ${pagination.currentPage} of ${pagination.pageCount}`}</span>
          <span>{documentAnalysis
            ? `${documentAnalysis.wordCount.toLocaleString()} ${documentAnalysis.wordCount === 1 ? 'word' : 'words'}`
            : 'Counting words…'}</span>
          <span>{saveStatusLabel}</span>
        </footer>
      </section>
  );
}

export function NotebookPage(props: NotebookPageProps) {
  return (
    <NotebookTransientLayerProvider>
      <NotebookMathFieldProvider>
        <NotebookPageContent {...props} />
      </NotebookMathFieldProvider>
    </NotebookTransientLayerProvider>
  );
}
