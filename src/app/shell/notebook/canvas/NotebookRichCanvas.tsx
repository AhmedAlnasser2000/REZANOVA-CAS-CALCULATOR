import type { Editor } from '@tiptap/core';
import type { MathfieldElement } from 'mathlive';
import { AllSelection, TextSelection } from '@tiptap/pm/state';
import { EditorContent, useEditor } from '@tiptap/react';
import { Check, Sparkles } from 'lucide-react';
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
  NOTEBOOK_STARTER_TEMPLATES,
  createNotebookStarterContent,
  detectNotebookMathCandidates,
  notebookSha256Hex,
  validateNotebookImage,
  type NotebookAssetPort,
  type NotebookImageInspection,
  type NotebookHeaderFooterSettings,
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
import { NotebookRichToolbar } from './NotebookRichToolbar';
import {
  NotebookImageDetailsDialog,
  type NotebookImageDetails,
} from './NotebookImageDetailsDialog';
import {
  captureNotebookToolbarSelection,
  restoreNotebookToolbarSelection,
  type NotebookToolbarSelection,
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
import { NotebookFloatingLayer, useNotebookTransientLayer } from '../transient-ui';
import {
  NotebookSelectionToolbar,
  type NotebookPaletteMode,
  type NotebookPaletteRequest,
  type NotebookProseSelection,
} from './NotebookSelectionToolbar';
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
type PendingImageInsert = {
  mode: 'insert';
  bytes: Uint8Array;
  fileName: string;
  inspection: NotebookImageInspection;
  selection: NotebookToolbarSelection;
  insertionPosition?: number;
};
type PendingImageEdit = {
  mode: 'edit';
  nodeId: string;
  initial: NotebookImageDetails;
};
type PendingImageDialog = PendingImageInsert | PendingImageEdit;
const NOTEBOOK_IMMEDIATE_SYNC_NODE_SIZE_MAX = 150_000;
const NOTEBOOK_LARGE_DOCUMENT_SYNC_DELAY_MS = 350;
function selectedParagraphSuggestion(editor: Editor | null) {
  if (!editor) {
    return null;
  }
  const { selection } = editor.state;
  if (selection.empty) {
    return null;
  }
  const selectedText = editor.state.doc.textBetween(selection.from, selection.to, ' ');
  const candidate = detectNotebookMathCandidates(selectedText)[0];
  return candidate ? {
    ...candidate,
    from: selection.from + candidate.start,
    to: selection.from + candidate.end,
  } : null;
}
function selectedProseRange(editor: Editor): NotebookProseSelection | null {
  const { selection } = editor.state;
  if (!(selection instanceof TextSelection || selection instanceof AllSelection) || selection.empty) {
    return null;
  }
  let containsText = false;
  editor.state.doc.nodesBetween(selection.from, selection.to, (node) => {
    if (node.isText && node.textContent.trim()) {
      containsText = true;
    }
  });
  return containsText ? { from: selection.from, to: selection.to } : null;
}
function isPristineNotebook(editor: Editor) {
  const paragraph = editor.state.doc.firstChild;
  if (editor.state.doc.childCount !== 1 || paragraph?.type.name !== 'paragraph') {
    return false;
  }
  return paragraph.content.size === 0
    && paragraph.attrs.notebookAlignment == null
    && paragraph.attrs.notebookLineSpacing == null
    && paragraph.attrs.notebookSpaceBeforePt == null
    && paragraph.attrs.notebookSpaceAfterPt == null
    && paragraph.attrs.notebookLeftIndentPt == null;
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
  const [pendingImageDialog, setPendingImageDialog] = useState<PendingImageDialog | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [runningMatterTarget, setRunningMatterTarget] = useState<NotebookRunningMatterTarget | null>(null);
  const [runningMatterDraft, setRunningMatterDraft] = useState(document.headerFooter);
  const [runningMatterEditor, setRunningMatterEditor] = useState<Editor | null>(null);
  const [runningMatterOverflow, setRunningMatterOverflow] = useState(false);
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
  const imageDialog = useNotebookTransientLayer({ id: 'notebook-image-details' });
  const imageDialogIsOpen = imageDialog.isOpen;
  const openImageDialog = imageDialog.open;
  const imageDialogWasOpenRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    handleMediaDragGrip,
    handleMediaInteraction,
    imageCropMode,
    publishImageCropMode,
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
      cropMode: imageCropMode,
      minimumSizePx: 48,
      onCropModeChange: ({ nodeId, active }) => publishImageCropMode(nodeId, active),
      onMediaDragGrip: handleMediaDragGrip,
      onMediaInteraction: handleMediaInteraction,
    }),
    [
      assetPort,
      handleMediaDragGrip,
      handleMediaInteraction,
      imageCropMode,
      onOpenMathInTool,
      publishImageCropMode,
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
  const paginationMetrics = useNotebookPagination({
    editor,
    pageSetup: document.pageSetup,
    revision,
    scrollRegionRef,
    stageRef: pageStageRef,
    viewMode,
    onChange: onPaginationChange,
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
    if (!editor || editor.isDestroyed) return;
    const editorElement = editor.view.dom as HTMLElement;
    const onCropModeRequest = (event: Event) => {
      const detail = (event as CustomEvent<{ active?: boolean; nodeId?: string | null }>).detail;
      if (!detail?.nodeId) return;
      const selected = notebookEditorSelection(editor);
      if (selected?.type !== 'imageFigure' || selected.id !== detail.nodeId) return;
      publishImageCropMode(detail.nodeId, detail.active === true);
    };
    editorElement.addEventListener('notebook-image-crop-mode-request', onCropModeRequest);
    return () => editorElement.removeEventListener('notebook-image-crop-mode-request', onCropModeRequest);
  }, [editor, publishImageCropMode]);

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

  useEffect(() => {
    if (!pendingImageDialog) {
      imageDialogWasOpenRef.current = false;
      return;
    }
    if (imageDialogIsOpen) {
      imageDialogWasOpenRef.current = true;
      return;
    }
    if (imageDialogWasOpenRef.current) {
      imageDialogWasOpenRef.current = false;
      setPendingImageDialog(null);
      setImageBusy(false);
      return;
    }
    openImageDialog();
  }, [imageDialogIsOpen, openImageDialog, pendingImageDialog]);

  if (!editor) {
    return <div className="notebook-rich-canvas-loading">Preparing document…</div>;
  }

  const suggestion = selectedParagraphSuggestion(editor);
  const isBlank = isPristineNotebook(editor);

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
    editor.view.dispatch(
      editor.state.tr.setDocAttribute('notebookPageSetup', pageSetup),
    );
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

  async function stageImage(file: File, insertionPosition?: number) {
    const selection = captureNotebookToolbarSelection(editor);
    setImageError(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const declaredType = file.type.startsWith('image/') ? file.type : undefined;
      const inspection = await validateNotebookImage(bytes, declaredType);
      setPendingImageDialog({
        mode: 'insert',
        bytes,
        fileName: file.name || 'Pasted image',
        inspection,
        selection,
        ...(insertionPosition !== undefined ? { insertionPosition } : {}),
      });
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'This image could not be inserted.');
    }
  }

  function openSelectedImageDetails() {
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

  function updateImageDetails(nodeId: string, details: NotebookImageDetails) {
    const selected = notebookEditorNodeById(editor, nodeId);
    if (!selected || selected.type !== 'imageFigure') return false;
    const node = editor.state.doc.nodeAt(selected.from);
    if (!node) return false;
    editor.view.dispatch(editor.state.tr.setNodeMarkup(selected.from, undefined, {
      ...node.attrs,
      altText: details.altText || null,
      decorative: details.decorative,
      caption: details.caption || null,
      numbered: details.numbered,
    }));
    return true;
  }

  async function confirmImageDetails(details: NotebookImageDetails) {
    if (!pendingImageDialog) return;
    setImageBusy(true);
    setImageError(null);
    if (pendingImageDialog.mode === 'edit') {
      if (!updateImageDetails(pendingImageDialog.nodeId, details)) {
        setImageError('The selected image is no longer available.');
        setImageBusy(false);
        return;
      }
      setPendingImageDialog(null);
      imageDialog.close(false);
      setImageBusy(false);
      return;
    }

    const pending = pendingImageDialog;
    let storedAssetId: string | null = null;
    let assetAlreadyExisted = false;
    try {
      const expectedAssetId = `sha256:${await notebookSha256Hex(pending.bytes)}`;
      assetAlreadyExisted = Boolean(await assetPort.load(expectedAssetId));
      const metadata = await assetPort.put(pending.bytes, pending.inspection.mimeType);
      storedAssetId = metadata.id;
      const nodeId = `notebook.imageFigure.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
      const imageContent = {
        type: 'imageFigure',
        attrs: {
          id: nodeId,
          assetId: metadata.id,
          altText: details.altText || null,
          decorative: details.decorative,
          caption: details.caption || null,
          numbered: details.numbered,
          widthPercent: null,
          alignment: null,
          placement: null,
          rotation: null,
          displayAspectRatio: null,
          cropX: null,
          cropY: null,
          cropWidth: null,
          cropHeight: null,
        },
      };
      const inserted = pending.insertionPosition === undefined
        ? restoreNotebookToolbarSelection(editor, pending.selection).insertContent(imageContent).run()
        : editor.chain().focus().insertContentAt(
            Math.max(0, Math.min(editor.state.doc.content.size, pending.insertionPosition)),
            imageContent,
          ).run();
      const image = notebookEditorNodeById(editor, nodeId);
      if (!inserted || !image) throw new Error('The editor could not place this image.');
      editor.commands.setNodeSelection(image.from);
      setPendingImageDialog(null);
      imageDialog.close(false);
    } catch (error) {
      if (storedAssetId && !assetAlreadyExisted) {
        await assetPort.delete(storedAssetId).catch(() => {});
      }
      setImageError(error instanceof Error ? error.message : 'This image could not be inserted.');
    } finally {
      setImageBusy(false);
    }
  }

  const contextualSelection = notebookEditorSelection(editor);
  const contextualTab = runningMatterTarget ? 'header-footer' : contextualSelection?.type === 'imageFigure'
    ? 'picture-format'
    : null;

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
        onInsertInlineMath={() => insertNotebookInlineMath(editor, {
          onInserted: setPendingMathFocusId,
        })}
        onInsertImage={() => fileInputRef.current?.click()}
        onEditImageDetails={openSelectedImageDetails}
        onInsertPageBreak={() => insertNotebookPageBreak(editor)}
        onViewModeChange={onViewModeChange}
        onRequestPalette={requestPalette}
        runningMatterEditor={runningMatterEditor}
        runningMatterTarget={runningMatterTarget}
        onBeginHeaderFooter={() => beginRunningMatter()}
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
        onDragOver={(event) => {
          if (event.dataTransfer.files.length > 0) event.preventDefault();
        }}
        onDrop={(event) => {
          const file = event.dataTransfer.files.item(0);
          if (!file) return;
          event.preventDefault();
          const position = editor.view.posAtCoords({ left: event.clientX, top: event.clientY });
          const insertionPosition = position?.pos ?? editor.state.doc.content.size;
          void stageImage(file, insertionPosition);
        }}
        onPaste={(event) => {
          const file = readClipboardEventFile(event);
          if (!file) return;
          event.preventDefault();
          void stageImage(file);
        }}
      >
        <div
          ref={pageStageRef}
          className={`notebook-page-stage is-${viewMode}`}
          data-page-count={paginationMetrics.pageCount}
        >
          {isBlank ? (
            <span className="notebook-empty-writing-prompt" aria-hidden="true">
              Start writing your explanation...
            </span>
          ) : null}
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
          {isBlank ? (
            <div className="notebook-template-start" data-testid="notebook-template-start">
              <div>
                <Sparkles aria-hidden="true" size={18} />
                <span>Prefer a structured starting point?</span>
              </div>
              <button data-notebook-transient-trigger={templateMenu.id} type="button" onClick={templateMenu.toggle}>
                Start from template
              </button>
              {templateMenu.isOpen ? (
                <NotebookFloatingLayer align="end" layerId={templateMenu.id} className="notebook-template-menu">
                  {NOTEBOOK_STARTER_TEMPLATES.map((template) => (
                    <button key={template.id} type="button" onClick={() => applyTemplate(template.id)}>
                      <strong>{template.label}</strong>
                      <span>{template.description}</span>
                    </button>
                  ))}
                </NotebookFloatingLayer>
              ) : null}
            </div>
          ) : null}
        </div>
        {runningMatterOverflow ? (
          <div className="notebook-running-matter-warning" role="status">
            Running matter exceeds the current margin band. Content is preserved.
          </div>
        ) : null}
      </div>
      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
        aria-label="Choose image"
        onChange={(event) => {
          const files = event.currentTarget.files;
          const file = files?.item?.(0) ?? files?.[0] ?? null;
          event.currentTarget.value = '';
          if (file) void stageImage(file);
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
          key={pendingImageDialog.mode === 'insert'
            ? pendingImageDialog.fileName
            : pendingImageDialog.nodeId}
          busy={imageBusy}
          fileName={pendingImageDialog.mode === 'insert' ? pendingImageDialog.fileName : undefined}
          initial={pendingImageDialog.mode === 'insert'
            ? { altText: '', decorative: false, caption: '', numbered: true }
            : pendingImageDialog.initial}
          mode={pendingImageDialog.mode}
          warnings={pendingImageDialog.mode === 'insert'
            ? pendingImageDialog.inspection.warnings
            : []}
          onCancel={() => imageDialog.close()}
          onConfirm={(details) => void confirmImageDetails(details)}
        />
      ) : null}
      {!runningMatterTarget ? <NotebookSelectionToolbar
        key={paletteRequest?.nonce ?? 0} editor={editor}
        paletteRequest={paletteRequest} selection={proseSelection}
      /> : null}
      {suggestion ? (
        <div className="notebook-math-suggestion" data-testid="notebook-math-suggestion">
          <div>
            <span>Possible math</span>
            <strong>{suggestion.sourceText}</strong>
          </div>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              editor.chain().setTextSelection({
                from: suggestion.from,
                to: suggestion.to,
              }).run();
              insertNotebookInlineMath(editor, {
                onInserted: setPendingMathFocusId,
                sourceText: suggestion.sourceText,
              });
            }}
          >
            <Check aria-hidden="true" size={14} />
            Convert selected text
          </button>
        </div>
      ) : null}
    </div>
  );
}
