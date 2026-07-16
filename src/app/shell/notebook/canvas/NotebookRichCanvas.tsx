import type { Editor } from '@tiptap/core';
import type { MathfieldElement } from 'mathlive';
import { EditorContent, useEditor } from '@tiptap/react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { readClipboardEventFile } from '../../../../lib/clipboard';
import {
  createNotebookStarterContent,
  clampNotebookFloatingPlacementToPageSetup,
  notebookPageGeometry,
  notebookSha256Hex,
  validateNotebookImage,
  type NotebookAssetPort,
  type NotebookHeaderFooterSettings,
  type NotebookImageInspection,
  type NotebookPageSetup,
  type NotebookRichDocument,
  type NotebookStarterTemplateId,
  type NotebookWorkspaceTarget,
} from '../../../../lib/notebook';
import {
  notebookDocumentFromTiptap,
  notebookDocumentToTiptap,
} from '../../../../lib/notebook/document/tiptap-adapter';
import { createNotebookExtensions } from './extensions';
import {
  NotebookCanvasWarnings,
  NotebookEmptyWritingPrompt,
  NotebookMathSuggestion,
  NotebookTemplateStart,
} from './NotebookCanvasOverlays';
import { NotebookRichToolbar } from './NotebookRichToolbar';
import {
  NotebookImageDetailsDialog,
  type NotebookImageDetails,
} from './NotebookImageDetailsDialog';
import {
  captureNotebookToolbarSelection,
  restoreNotebookToolbarSelection,
} from './notebookToolbarSelection';
import type { NotebookRibbonTab } from './ribbon-types';
import {
  insertNotebookDisplayMath,
  insertNotebookInlineMath,
  insertNotebookPageBreak,
  notebookEditorSelection,
  notebookEditorNodeById,
  notebookInspectorSelection,
  type NotebookEditorSelection,
} from './selection';
import {
  useNotebookPointerCoordinator,
  type NotebookMediaStatus,
} from './NotebookDirectMediaCanvasCoordinator';
import {
  useNotebookPagination,
  type NotebookPaginationMetrics,
  type NotebookViewMode,
} from './useNotebookPagination';
import {
  NotebookPageSheets,
  type NotebookRunningMatterTarget,
} from './NotebookPageSheets';
import { useNotebookMathFieldController } from '../math-field';
import { useNotebookTransientLayer } from '../transient-ui';
import {
  NotebookSelectionToolbar,
  type NotebookPaletteMode,
  type NotebookPaletteRequest,
  type NotebookProseSelection,
} from './NotebookSelectionToolbar';
import {
  isPristineNotebook,
  selectedParagraphSuggestion,
  selectedProseRange,
} from './notebook-canvas-state';
type NotebookRichCanvasProps = {
  activeRibbonTab: NotebookRibbonTab;
  assetPort: NotebookAssetPort;
  document: NotebookRichDocument;
  fileControl: ReactNode;
  onChange: (document: NotebookRichDocument) => void;
  onEditorChange: (editor: Editor | null) => void;
  onOpenMathInTool: (target: NotebookWorkspaceTarget, latex: string) => void;
  initialProseSelection: NotebookProseSelection | null;
  onProseSelectionChange: (selection: NotebookProseSelection | null) => void;
  onSelectRibbonTab: (tab: NotebookRibbonTab) => void;
  onContextualSelectionChange: (selection: NotebookEditorSelection | null) => void;
  onSelectionChange: (selection: NotebookEditorSelection | null) => void;
  onPaginationChange: (metrics: NotebookPaginationMetrics) => void;
  onMediaStatusChange: (status: NotebookMediaStatus | null) => void;
  onViewModeChange: (mode: NotebookViewMode) => void;
  viewMode: NotebookViewMode;
};
export type { NotebookMediaStatus } from './NotebookDirectMediaCanvasCoordinator';
type PendingImageEdit = {
  mode: 'edit';
  nodeId: string;
  initial: NotebookImageDetails;
};
type PendingImageDialog = PendingImageEdit;
const NOTEBOOK_IMMEDIATE_SYNC_NODE_SIZE_MAX = 150_000;
const NOTEBOOK_LARGE_DOCUMENT_SYNC_DELAY_MS = 350;
const NOTEBOOK_IMAGE_FILE_ACCEPT = '.png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml';
const CSS_PX_PER_PT = 96 / 72;

function isNotebookImageFile(file: File) {
  return file.type.startsWith('image/')
    || /\.(png|jpe?g|webp|svg)$/i.test(file.name);
}

function initialImageDisplaySize(
  inspection: NotebookImageInspection,
  pageSetup: NotebookPageSetup,
) {
  const geometry = notebookPageGeometry(pageSetup);
  const fallbackWidthPt = Math.min(geometry.usableWidth, 360);
  const widthPt = inspection.width && inspection.width > 0
    ? Math.min(geometry.usableWidth, Math.max(36, inspection.width / CSS_PX_PER_PT))
    : fallbackWidthPt;
  const ratio = inspection.width && inspection.height
    ? Math.max(0.1, Math.min(10, inspection.width / inspection.height))
    : 16 / 9;
  const heightPt = Math.max(36, widthPt / ratio);
  return {
    displayAspectRatio: Math.round(ratio * 1000) / 1000,
    displayHeightPt: Math.round(heightPt * 1000) / 1000,
    displayWidthPt: Math.round(widthPt * 1000) / 1000,
  };
}

export function NotebookRichCanvas({
  activeRibbonTab,
  assetPort,
  document,
  fileControl,
  onChange,
  onEditorChange,
  onOpenMathInTool,
  initialProseSelection,
  onProseSelectionChange,
  onSelectRibbonTab,
  onContextualSelectionChange,
  onSelectionChange,
  onPaginationChange,
  onMediaStatusChange,
  onViewModeChange,
  viewMode,
}: NotebookRichCanvasProps) {
  const documentRef = useRef(document);
  const editorRef = useRef<Editor | null>(null);
  const loadedDocumentIdRef = useRef(document.id);
  const changeRef = useRef(onChange);
  const proseSelectionChangeRef = useRef(onProseSelectionChange);
  const selectionRef = useRef(onSelectionChange);
  const contextualSelectionRef = useRef(onContextualSelectionChange);
  const restoredProseSelectionRef = useRef(false);
  const scrollRegionRef = useRef<HTMLDivElement | null>(null);
  const pageStageRef = useRef<HTMLDivElement | null>(null);
  const pendingDocumentSyncRef = useRef<Editor | null>(null);
  const documentSyncHandleRef = useRef<number | null>(null);
  const { activate: activateMathField } = useNotebookMathFieldController();
  const [revision, setRevision] = useState(0);
  const [paletteRequest, setPaletteRequest] = useState<NotebookPaletteRequest | null>(null);
  const [proseSelection, setProseSelection] = useState<NotebookProseSelection | null>(null);
  const [pendingMathFocusId, setPendingMathFocusId] = useState<string | null>(null);
  const [runningMatterTarget, setRunningMatterTarget] = useState<NotebookRunningMatterTarget | null>(null);
  const [runningMatterDraft, setRunningMatterDraft] = useState(document.headerFooter);
  const [runningMatterEditor, setRunningMatterEditor] = useState<Editor | null>(null);
  const [runningMatterOverflow, setRunningMatterOverflow] = useState(false);
  const [layoutWarning, setLayoutWarning] = useState<string | null>(null);
  const [pendingImageDialog, setPendingImageDialog] = useState<PendingImageDialog | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const imageDialog = useNotebookTransientLayer({ id: 'notebook-image-details' });
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const imageDialogWasOpenRef = useRef(false);
  const runningMatterOriginalRef = useRef(document.headerFooter);
  const runningMatterSessionRef = useRef({
    target: runningMatterTarget,
    draft: runningMatterDraft,
    original: runningMatterOriginalRef.current,
  });
  runningMatterSessionRef.current = {
    target: runningMatterTarget,
    draft: runningMatterDraft,
    original: runningMatterOriginalRef.current,
  };
  const templateMenu = useNotebookTransientLayer({ id: 'notebook-starter-templates' });
  const {
    handleMediaDragGrip,
    handleMediaInteraction,
    refreshSelectedMediaStatus,
    setPaginationMetrics,
  } = useNotebookPointerCoordinator({
    documentRef,
    editorRef,
    onMediaStatusChange,
    pageStageRef,
    scrollRegionRef,
    viewMode,
  });
  const extensions = useMemo(
    () => createNotebookExtensions(onOpenMathInTool, assetPort, {
      minimumSizePx: 48,
      onMediaDragGrip: handleMediaDragGrip,
      onMediaInteraction: handleMediaInteraction,
    }),
    [
      assetPort,
      handleMediaDragGrip,
      handleMediaInteraction,
      onOpenMathInTool,
    ],
  );
  const cancelDocumentSync = useCallback(() => {
    const scheduled = documentSyncHandleRef.current;
    if (scheduled === null) {
      return;
    }
    window.clearTimeout(scheduled);
    documentSyncHandleRef.current = null;
  }, []);
  const flushDocumentSync = useCallback((currentEditor?: Editor | null) => {
    const editorToSync = currentEditor ?? pendingDocumentSyncRef.current;
    pendingDocumentSyncRef.current = null;
    if (!editorToSync) {
      return;
    }
    const selection = notebookEditorSelection(editorToSync);
    const nextDocument = notebookDocumentFromTiptap(
      editorToSync.getJSON(),
      documentRef.current,
      { selectedNodeId: selection?.id ?? null },
    );
    documentRef.current = nextDocument;
    changeRef.current(nextDocument);
  }, []);
  const scheduleDocumentSync = useCallback((currentEditor: Editor) => {
    pendingDocumentSyncRef.current = currentEditor;
    if (documentSyncHandleRef.current !== null) {
      window.clearTimeout(documentSyncHandleRef.current);
    }
    documentSyncHandleRef.current = window.setTimeout(() => {
      documentSyncHandleRef.current = null;
      flushDocumentSync();
    }, NOTEBOOK_LARGE_DOCUMENT_SYNC_DELAY_MS);
  }, [flushDocumentSync]);
  const editor = useEditor({
    extensions,
    content: notebookDocumentToTiptap(document),
    editorProps: {
      attributes: {
        class: 'notebook-rich-editor',
        'aria-label': 'Notebook rich document',
        'data-app-keyboard-input': 'true',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (currentEditor.state.doc.nodeSize <= NOTEBOOK_IMMEDIATE_SYNC_NODE_SIZE_MAX) {
        cancelDocumentSync();
        flushDocumentSync(currentEditor);
      } else {
        scheduleDocumentSync(currentEditor);
      }
      selectionRef.current(notebookInspectorSelection(currentEditor));
      contextualSelectionRef.current(notebookEditorSelection(currentEditor));
      const nextProseSelection = selectedProseRange(currentEditor);
      setProseSelection(nextProseSelection);
      proseSelectionChangeRef.current(nextProseSelection);
      setRevision((current) => current + 1);
      requestAnimationFrame(refreshSelectedMediaStatus);
    },
    onDestroy: () => {
      cancelDocumentSync();
      flushDocumentSync();
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      selectionRef.current(notebookInspectorSelection(currentEditor));
      contextualSelectionRef.current(notebookEditorSelection(currentEditor));
      const nextProseSelection = selectedProseRange(currentEditor);
      setProseSelection(nextProseSelection);
      proseSelectionChangeRef.current(nextProseSelection);
      setRevision((current) => current + 1);
      requestAnimationFrame(refreshSelectedMediaStatus);
    },
  });
  const returnFloatingObjectsToFlow = useCallback((nodeIds: readonly string[]) => {
    if (!editor || editor.isDestroyed || !nodeIds.length) return;
    const ids = new Set(nodeIds);
    const transaction = editor.state.tr;
    editor.state.doc.descendants((node, position) => {
      if (!ids.has(String(node.attrs.id ?? ''))
        || node.attrs.notebookObjectPlacement?.mode !== 'floating') {
        return;
      }
      transaction.setNodeMarkup(position, undefined, {
        ...node.attrs,
        notebookObjectPlacement: { mode: 'flow' },
      });
    });
    if (!transaction.docChanged) return;
    editor.view.dispatch(transaction);
    setLayoutWarning(
      nodeIds.length === 1
        ? 'A floating structured object returned to document flow because it is taller than the usable page.'
        : `${nodeIds.length} floating structured objects returned to document flow because they are taller than the usable page.`,
    );
  }, [editor]);
  const paginationMetrics = useNotebookPagination({
    editor,
    pageSetup: document.pageSetup,
    revision,
    scrollRegionRef,
    stageRef: pageStageRef,
    viewMode,
    onChange: onPaginationChange,
    onReturnFloatingObjectsToFlow: returnFloatingObjectsToFlow,
  });
  const commitRunningMatter = useCallback(() => {
    if (!runningMatterTarget) return;
    const draft = runningMatterSessionRef.current.draft;
    if (JSON.stringify(draft) !== JSON.stringify(runningMatterOriginalRef.current)) {
      editor.view.dispatch(
        editor.state.tr.setDocAttribute('notebookHeaderFooter', draft),
      );
    }
    setRunningMatterTarget(null);
    setRunningMatterEditor(null);
    setRunningMatterOverflow(false);
  }, [editor, runningMatterTarget]);
  useEffect(() => {
    editorRef.current = editor;
    return () => {
      const session = runningMatterSessionRef.current;
      if (session.target && !editor.isDestroyed
        && JSON.stringify(session.draft) !== JSON.stringify(session.original)) {
        editor.view.dispatch(editor.state.tr.setDocAttribute('notebookHeaderFooter', session.draft));
      }
      if (editorRef.current === editor) {
        editorRef.current = null;
      }
    };
  }, [editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setEditable(!runningMatterTarget);
  }, [editor, runningMatterTarget]);

  useEffect(() => {
    if (!pendingImageDialog) {
      imageDialogWasOpenRef.current = false;
      return;
    }
    if (imageDialog.isOpen) {
      imageDialogWasOpenRef.current = true;
      return;
    }
    if (imageDialogWasOpenRef.current) {
      imageDialogWasOpenRef.current = false;
      setPendingImageDialog(null);
      setImageBusy(false);
      return;
    }
    imageDialog.open();
  }, [imageDialog, pendingImageDialog]);

  useEffect(() => {
    if (!runningMatterTarget || activeRibbonTab === 'header-footer' || activeRibbonTab === 'home') return;
    commitRunningMatter();
  }, [activeRibbonTab, commitRunningMatter, runningMatterTarget]);

  useEffect(() => {
    if (runningMatterTarget) return;
    setRunningMatterDraft(document.headerFooter);
  }, [document.headerFooter, runningMatterTarget]);

  useEffect(() => {
    if (!runningMatterTarget) return undefined;
    const commitBeforeSave = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        commitRunningMatter();
      }
    };
    window.addEventListener('keydown', commitBeforeSave, true);
    return () => window.removeEventListener('keydown', commitBeforeSave, true);
  }, [commitRunningMatter, runningMatterTarget]);

  useEffect(() => {
    setPaginationMetrics(paginationMetrics);
    const frame = requestAnimationFrame(refreshSelectedMediaStatus);
    return () => cancelAnimationFrame(frame);
  }, [paginationMetrics, refreshSelectedMediaStatus, setPaginationMetrics, viewMode]);

  useEffect(() => {
    documentRef.current = document;
    changeRef.current = onChange;
    proseSelectionChangeRef.current = onProseSelectionChange;
    selectionRef.current = onSelectionChange;
    contextualSelectionRef.current = onContextualSelectionChange;
  }, [
    document,
    onChange,
    onContextualSelectionChange,
    onOpenMathInTool,
    onProseSelectionChange,
    onSelectionChange,
  ]);

  useEffect(() => {
    onEditorChange(editor);
    if (editor) {
      onSelectionChange(notebookInspectorSelection(editor));
      onContextualSelectionChange(notebookEditorSelection(editor));
    }
    return () => {
      onContextualSelectionChange(null);
      onEditorChange(null);
    };
  }, [editor, onContextualSelectionChange, onEditorChange, onSelectionChange]);

  useEffect(() => () => {
    cancelDocumentSync();
    flushDocumentSync();
  }, [cancelDocumentSync, flushDocumentSync]);

  useEffect(() => {
    if (!editor || !isPristineNotebook(editor)) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      if (!editor.isDestroyed) {
        editor.chain().focus('start').run();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      return;
    }
    if (loadedDocumentIdRef.current === document.id) {
      return;
    }
    loadedDocumentIdRef.current = document.id;
    editor.commands.setContent(notebookDocumentToTiptap(document), { emitUpdate: false });
    setRevision((current) => current + 1);
  }, [document, editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed || restoredProseSelectionRef.current) {
      return;
    }
    restoredProseSelectionRef.current = true;
    if (
      !initialProseSelection
      || initialProseSelection.from >= initialProseSelection.to
      || initialProseSelection.from < 0
      || initialProseSelection.to > editor.state.doc.content.size
    ) {
      return;
    }
    if (
      initialProseSelection.from === 0
      && initialProseSelection.to === editor.state.doc.content.size
    ) {
      editor.commands.selectAll();
    } else {
      editor.commands.setTextSelection(initialProseSelection);
    }
  }, [editor, initialProseSelection]);

  useEffect(() => {
    if (!pendingMathFocusId) {
      return;
    }
    let frame = 0;
    let attempts = 0;
    const activateInsertedField = () => {
      const field = globalThis.document.querySelector<MathfieldElement>(
        `math-field[data-notebook-node-id="${pendingMathFocusId}"]`,
      );
      if (field?.isConnected) {
        activateMathField(
          field,
          pendingMathFocusId,
          field.dataset.notebookFieldRole === 'display' ? 'display' : 'inline',
        );
        field.focus();
        setPendingMathFocusId(null);
        return;
      }
      attempts += 1;
      if (attempts < 60) {
        frame = requestAnimationFrame(activateInsertedField);
      }
    };
    frame = requestAnimationFrame(activateInsertedField);
    return () => cancelAnimationFrame(frame);
  }, [activateMathField, pendingMathFocusId]);

  useEffect(() => {
    const scrollRegion = scrollRegionRef.current;
    if (!editor || !scrollRegion) {
      return;
    }
    let selecting = false;
    let pageScrollY = 0;
    const startSelection = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !editor.view.dom.contains(event.target)) {
        return;
      }
      selecting = true;
      pageScrollY = window.scrollY;
    };
    const moveSelection = (event: PointerEvent) => {
      if (!selecting || event.buttons !== 1) {
        return;
      }
      const bounds = scrollRegion.getBoundingClientRect();
      const edge = 42;
      const upperDistance = Math.max(0, bounds.top + edge - event.clientY);
      const lowerDistance = Math.max(0, event.clientY - (bounds.bottom - edge));
      if (upperDistance || lowerDistance) {
        const direction = lowerDistance ? 1 : -1;
        const distance = Math.max(upperDistance, lowerDistance);
        scrollRegion.scrollTop += direction * Math.min(24, Math.max(4, distance / 4));
      }
      if (window.scrollY !== pageScrollY) {
        window.scrollTo(window.scrollX, pageScrollY);
      }
    };
    const endSelection = () => {
      selecting = false;
    };
    scrollRegion.addEventListener('pointerdown', startSelection);
    window.addEventListener('pointermove', moveSelection, { passive: true });
    window.addEventListener('pointerup', endSelection);
    window.addEventListener('pointercancel', endSelection);
    return () => {
      scrollRegion.removeEventListener('pointerdown', startSelection);
      window.removeEventListener('pointermove', moveSelection);
      window.removeEventListener('pointerup', endSelection);
      window.removeEventListener('pointercancel', endSelection);
    };
  }, [editor]);

  if (!editor) {
    return <div className="notebook-rich-canvas-loading">Preparing document…</div>;
  }

  const suggestion = selectedParagraphSuggestion(editor);
  const isBlank = isPristineNotebook(editor);

  async function stageImageFile(file: File, insertionPosition?: number) {
    if (!editor || editor.isDestroyed) return;
    if (!isNotebookImageFile(file)) {
      setImageError('Choose a PNG, JPEG, WebP, or safe SVG image.');
      return;
    }
    const selection = captureNotebookToolbarSelection(editor);
    setImageError(null);
    let storedAssetId: string | null = null;
    let assetAlreadyExisted = false;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const inspection = await validateNotebookImage(
        bytes,
        file.type.startsWith('image/') ? file.type : undefined,
      );
      const expectedAssetId = `sha256:${await notebookSha256Hex(bytes)}`;
      assetAlreadyExisted = Boolean(await assetPort.load(expectedAssetId));
      const imageDimensions = inspection.width && inspection.height
        ? { imageHeightPx: inspection.height, imageWidthPx: inspection.width }
        : undefined;
      const metadata = await assetPort.put(
        bytes,
        inspection.mimeType,
        undefined,
        imageDimensions,
      );
      storedAssetId = metadata.id;
      const nodeId = `notebook.imageFigure.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
      const displaySize = initialImageDisplaySize({
        ...inspection,
        height: metadata.imageHeightPx ?? inspection.height,
        width: metadata.imageWidthPx ?? inspection.width,
      }, documentRef.current.pageSetup);
      const imageContent = {
        type: 'imageFigure',
        attrs: {
          id: nodeId,
          assetId: metadata.id,
          altText: null,
          decorative: null,
          caption: null,
          numbered: null,
          widthPercent: null,
          displayWidthPt: displaySize.displayWidthPt,
          displayHeightPt: displaySize.displayHeightPt,
          displayAspectRatio: displaySize.displayAspectRatio,
          alignment: 'center',
          placement: 'normal',
          rotation: 0,
          cropX: null,
          cropY: null,
          cropWidth: null,
          cropHeight: null,
        },
      };
      const inserted = insertionPosition === undefined
        ? restoreNotebookToolbarSelection(editor, selection).insertContent(imageContent).run()
        : editor.chain().focus().insertContentAt(
            Math.max(0, Math.min(editor.state.doc.content.size, insertionPosition)),
            imageContent,
          ).run();
      const insertedImage = notebookEditorNodeById(editor, nodeId);
      if (!inserted || !insertedImage) {
        throw new Error('The editor could not place this image.');
      }
      editor.commands.setNodeSelection(insertedImage.from);
      onSelectRibbonTab('picture-format');
      requestAnimationFrame(refreshSelectedMediaStatus);
    } catch (error) {
      if (storedAssetId && !assetAlreadyExisted) {
        await assetPort.delete(storedAssetId).catch(() => {});
      }
      setImageError(error instanceof Error ? error.message : 'This image could not be inserted.');
    } finally {
      if (imageFileInputRef.current) {
        imageFileInputRef.current.value = '';
      }
    }
  }

  function openImageDetails() {
    if (!editor || editor.isDestroyed) return;
    const selected = notebookEditorSelection(editor);
    if (selected?.type !== 'imageFigure' || !selected.id) return;
    setPendingImageDialog({
      mode: 'edit',
      nodeId: selected.id,
      initial: {
        altText: String(selected.attrs.altText ?? ''),
        decorative: selected.attrs.decorative === true,
        caption: String(selected.attrs.caption ?? ''),
        numbered: selected.attrs.numbered === true,
      },
    });
  }

  async function confirmImageDetails(details: NotebookImageDetails) {
    if (!pendingImageDialog || !editor || editor.isDestroyed) return;
    setImageBusy(true);
    setImageError(null);
    const located = notebookEditorNodeById(editor, pendingImageDialog.nodeId);
    const node = located?.type === 'imageFigure'
      ? editor.state.doc.nodeAt(located.from)
      : null;
    if (!located || !node) {
      setImageError('The selected image is no longer available.');
      setImageBusy(false);
      return;
    }
    try {
      editor.view.dispatch(editor.state.tr.setNodeMarkup(located.from, undefined, {
        ...node.attrs,
        altText: details.altText || null,
        decorative: details.decorative || null,
        caption: details.caption || null,
        numbered: details.numbered || null,
      }));
      editor.commands.setNodeSelection(located.from);
      setPendingImageDialog(null);
      imageDialog.close(false);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Image details could not be saved.');
    } finally {
      setImageBusy(false);
    }
  }

  function applyTemplate(templateId: NotebookStarterTemplateId) {
    cancelDocumentSync();
    pendingDocumentSyncRef.current = null;
    const nextDocument: NotebookRichDocument = {
      ...documentRef.current,
      content: createNotebookStarterContent(templateId, {
        idPrefix: documentRef.current.id,
      }),
      selectedNodeId: null,
      updatedAt: new Date().toISOString(),
    };
    documentRef.current = nextDocument;
    editor?.commands.setContent(notebookDocumentToTiptap(nextDocument), { emitUpdate: false });
    changeRef.current(nextDocument);
    templateMenu.close(false);
    requestAnimationFrame(() => {
      if (editor && !editor.isDestroyed) {
        editor.chain().focus('start').run();
      }
    });
  }

  function requestPalette(mode: NotebookPaletteMode) {
    setPaletteRequest((current) => ({ mode, nonce: (current?.nonce ?? 0) + 1 }));
  }

  function changePageSetup(pageSetup: NotebookPageSetup) {
    const transaction = editor.state.tr.setDocAttribute('notebookPageSetup', pageSetup);
    const oldGeometry = notebookPageGeometry(document.pageSetup);
    const pageScale = paginationMetrics.pageHeightPx > 1
      ? paginationMetrics.pageHeightPx / oldGeometry.height
      : 1;
    const elements = new Map<string, HTMLElement>();
    (editor.view.dom as HTMLElement)
      .querySelectorAll<HTMLElement>('[data-notebook-node-id]')
      .forEach((element) => {
        const id = element.dataset.notebookNodeId;
        if (id && !elements.has(id)) elements.set(id, element);
      });
    let clampedCount = 0;
    editor.state.doc.descendants((node, position) => {
      const placement = node.attrs.notebookObjectPlacement;
      if (placement?.mode !== 'floating') return;
      const id = String(node.attrs.id ?? '');
      const measuredHeightPt = elements.get(id)?.getBoundingClientRect().height;
      const nextPlacement = clampNotebookFloatingPlacementToPageSetup(
        placement,
        pageSetup,
        measuredHeightPt ? measuredHeightPt / pageScale : 36,
        typeof node.attrs.rotation === 'number' ? node.attrs.rotation : 0,
      );
      if (JSON.stringify(nextPlacement) === JSON.stringify(placement)) return;
      transaction.setNodeMarkup(position, undefined, {
        ...node.attrs,
        notebookObjectPlacement: nextPlacement,
      });
      clampedCount += 1;
    });
    editor.view.dispatch(transaction);
    if (clampedCount) {
      setLayoutWarning(
        `${clampedCount} floating ${clampedCount === 1 ? 'object was' : 'objects were'} kept inside the new page geometry.`,
      );
    }
  }

  function changeHeaderFooter(headerFooter: NotebookHeaderFooterSettings) {
    if (runningMatterTarget) {
      runningMatterSessionRef.current = { ...runningMatterSessionRef.current, draft: headerFooter };
      setRunningMatterDraft(headerFooter);
      return;
    }
    editor.view.dispatch(
      editor.state.tr.setDocAttribute('notebookHeaderFooter', headerFooter),
    );
  }

  function beginRunningMatter(target?: NotebookRunningMatterTarget) {
    const pageIndex = target?.pageIndex ?? Math.max(0, paginationMetrics.currentPage - 1);
    const scope = pageIndex === 0 && documentRef.current.headerFooter.differentFirstPage
      ? 'first'
      : 'default';
    runningMatterOriginalRef.current = documentRef.current.headerFooter;
    setRunningMatterDraft(structuredClone(documentRef.current.headerFooter));
    setRunningMatterTarget(target ?? { pageIndex, kind: 'header', region: 'center', scope });
    if (viewMode !== 'print') onViewModeChange('print');
    onSelectRibbonTab('header-footer');
  }

  function selectRibbonTab(tab: NotebookRibbonTab) {
    if (runningMatterTarget && tab !== 'header-footer' && tab !== 'home') commitRunningMatter();
    onSelectRibbonTab(tab);
  }

  function navigateRunningMatter(
    next: Partial<Pick<NotebookRunningMatterTarget, 'kind' | 'region'>>,
  ) {
    setRunningMatterEditor(null);
    setRunningMatterTarget((current) => current ? { ...current, ...next } : current);
  }

  const currentContextualSelection = notebookEditorSelection(editor);
  const contextualTab = runningMatterTarget
    ? 'header-footer'
    : currentContextualSelection?.type === 'imageFigure' ? 'picture-format' : null;

  return (
    <div className="notebook-rich-canvas" data-revision={revision}>
      <NotebookRichToolbar
        activeTab={activeRibbonTab}
        contextualTab={contextualTab}
        editor={editor}
        fileControl={fileControl}
        hasProseSelection={Boolean(runningMatterEditor || proseSelection)}
        headerFooter={runningMatterTarget ? runningMatterDraft : document.headerFooter}
        pageSetup={document.pageSetup}
        viewMode={viewMode}
        onChangeHeaderFooter={changeHeaderFooter}
        onChangePageSetup={changePageSetup}
        onSelectTab={selectRibbonTab}
        onInsertDisplayMath={() => insertNotebookDisplayMath(editor, {
          onInserted: setPendingMathFocusId,
        })}
        onInsertImage={() => {
          setImageError(null);
          imageFileInputRef.current?.click();
        }}
        onInsertInlineMath={() => insertNotebookInlineMath(editor, {
          onInserted: setPendingMathFocusId,
        })}
        onInsertPageBreak={() => insertNotebookPageBreak(editor)}
        onViewModeChange={onViewModeChange}
        onRequestPalette={requestPalette}
        runningMatterEditor={runningMatterEditor}
        runningMatterTarget={runningMatterTarget}
        onBeginHeaderFooter={() => beginRunningMatter()}
        onEditImageDetails={openImageDetails}
        onCloseHeaderFooter={() => {
          commitRunningMatter();
          onSelectRibbonTab('home');
        }}
        onNavigateRunningMatter={navigateRunningMatter}
      />
      <div
        ref={scrollRegionRef}
        className={`notebook-rich-scroll-region${runningMatterTarget ? ' is-running-matter-editing' : ''}`}
        data-empty={isBlank ? 'true' : 'false'}
        onDragOver={(event) => {
          const file = event.dataTransfer.files?.item?.(0) ?? event.dataTransfer.files?.[0] ?? null;
          if (file && isNotebookImageFile(file)) {
            event.preventDefault();
          }
        }}
        onDrop={(event) => {
          const file = event.dataTransfer.files?.item?.(0) ?? event.dataTransfer.files?.[0] ?? null;
          if (!file || !isNotebookImageFile(file)) return;
          event.preventDefault();
          const position = editor.view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
          void stageImageFile(file, position);
        }}
        onPaste={(event) => {
          const file = readClipboardEventFile(event.nativeEvent);
          if (!file || !isNotebookImageFile(file)) return;
          event.preventDefault();
          void stageImageFile(file);
        }}
        onDoubleClick={(event) => {
          if (runningMatterTarget && event.target instanceof Node && editor.view.dom.contains(event.target)) {
            commitRunningMatter();
            onSelectRibbonTab('home');
            return;
          }
          if (runningMatterTarget || viewMode !== 'print' || !pageStageRef.current) return;
          const stage = pageStageRef.current;
          const bounds = stage.getBoundingClientRect();
          const style = getComputedStyle(stage);
          const marginTop = Number.parseFloat(style.getPropertyValue('--notebook-page-margin-top-px')) || 72;
          const marginBottom = Number.parseFloat(style.getPropertyValue('--notebook-page-margin-bottom-px')) || 72;
          const relativeY = event.clientY - bounds.top;
          const stride = paginationMetrics.pageHeightPx + paginationMetrics.pageGapPx;
          const pageIndex = Math.max(0, Math.min(
            paginationMetrics.pageCount - 1,
            Math.floor(relativeY / stride),
          ));
          const pageY = relativeY - pageIndex * stride;
          const kind = pageY <= marginTop
            ? 'header'
            : pageY >= paginationMetrics.pageHeightPx - marginBottom ? 'footer' : null;
          if (!kind) return;
          const relativeX = Math.max(0, Math.min(bounds.width - 1, event.clientX - bounds.left));
          const region = relativeX < bounds.width / 3
            ? 'left'
            : relativeX < bounds.width * 2 / 3 ? 'center' : 'right';
          const scope = pageIndex === 0 && documentRef.current.headerFooter.differentFirstPage
            ? 'first'
            : 'default';
          beginRunningMatter({ pageIndex, kind, region, scope });
        }}
      >
        <div
          ref={pageStageRef}
          className={`notebook-page-stage is-${viewMode}`}
          data-page-count={paginationMetrics.pageCount}
        >
          {isBlank ? <NotebookEmptyWritingPrompt /> : null}
          {viewMode === 'print' ? (
            <NotebookPageSheets
              activeTarget={runningMatterTarget}
              headerFooter={runningMatterTarget ? runningMatterDraft : document.headerFooter}
              metrics={paginationMetrics}
              onChangeDraft={setRunningMatterDraft}
              onEditor={setRunningMatterEditor}
              onEnter={beginRunningMatter}
              onRequestClose={() => {
                commitRunningMatter();
                onSelectRibbonTab('home');
              }}
              onOverflowChange={setRunningMatterOverflow}
            />
          ) : null}
          <EditorContent className="notebook-rich-editor-host" editor={editor} />
          {isBlank ? <NotebookTemplateStart
            isOpen={templateMenu.isOpen}
            layerId={templateMenu.id}
            onApply={applyTemplate}
            onToggle={templateMenu.toggle}
          /> : null}
        </div>
        <NotebookCanvasWarnings
          layoutWarning={layoutWarning}
          runningMatterOverflow={runningMatterOverflow}
        />
      </div>
      {!runningMatterTarget ? <NotebookSelectionToolbar
        key={paletteRequest?.nonce ?? 0} editor={editor}
        paletteRequest={paletteRequest} selection={proseSelection}
      /> : null}
      {suggestion ? <NotebookMathSuggestion
        editor={editor}
        onInserted={setPendingMathFocusId}
        suggestion={suggestion}
      /> : null}
      <input
        ref={imageFileInputRef}
        aria-label="Choose image"
        className="sr-only"
        type="file"
        accept={NOTEBOOK_IMAGE_FILE_ACCEPT}
        onChange={(event) => {
          const files = event.currentTarget.files;
          const file = files?.item?.(0) ?? files?.[0] ?? null;
          event.currentTarget.value = '';
          if (file) void stageImageFile(file);
        }}
      />
      {imageError ? (
        <div className="notebook-image-error" role="alert">
          <span>{imageError}</span>
          <button type="button" aria-label="Dismiss image error" onClick={() => setImageError(null)}>×</button>
        </div>
      ) : null}
      {pendingImageDialog && imageDialog.isOpen ? (
        <NotebookImageDetailsDialog
          key={pendingImageDialog.nodeId}
          busy={imageBusy}
          initial={pendingImageDialog.initial}
          mode="edit"
          warnings={[]}
          onCancel={() => imageDialog.close()}
          onConfirm={(details) => void confirmImageDetails(details)}
        />
      ) : null}
    </div>
  );
}
