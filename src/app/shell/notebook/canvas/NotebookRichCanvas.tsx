import type { Editor } from '@tiptap/core';
import type { MathfieldElement } from 'mathlive';
import { AllSelection, TextSelection } from '@tiptap/pm/state';
import { EditorContent, useEditor } from '@tiptap/react';
import { Check, Sparkles } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  NOTEBOOK_STARTER_TEMPLATES,
  createNotebookStarterContent,
  detectNotebookMathCandidates,
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
  insertNotebookDisplayMath,
  insertNotebookInlineMath,
  notebookEditorSelection,
  type NotebookEditorSelection,
} from './selection';
import { useNotebookMathFieldController } from '../math-field';
import { useNotebookTransientLayer } from '../transient-ui';
import {
  NotebookSelectionToolbar,
  type NotebookPaletteMode,
  type NotebookPaletteRequest,
  type NotebookProseSelection,
} from './NotebookSelectionToolbar';

type NotebookRichCanvasProps = {
  document: NotebookRichDocument;
  onChange: (document: NotebookRichDocument) => void;
  onEditorChange: (editor: Editor | null) => void;
  onOpenMathInTool: (target: NotebookWorkspaceTarget, latex: string) => void;
  initialProseSelection: NotebookProseSelection | null;
  onProseSelectionChange: (selection: NotebookProseSelection | null) => void;
  onSelectionChange: (selection: NotebookEditorSelection | null) => void;
};

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

export function NotebookRichCanvas({
  document,
  onChange,
  onEditorChange,
  onOpenMathInTool,
  initialProseSelection,
  onProseSelectionChange,
  onSelectionChange,
}: NotebookRichCanvasProps) {
  const documentRef = useRef(document);
  const loadedDocumentIdRef = useRef(document.id);
  const changeRef = useRef(onChange);
  const proseSelectionChangeRef = useRef(onProseSelectionChange);
  const selectionRef = useRef(onSelectionChange);
  const restoredProseSelectionRef = useRef(false);
  const scrollRegionRef = useRef<HTMLDivElement | null>(null);
  const { activate: activateMathField } = useNotebookMathFieldController();
  const [revision, setRevision] = useState(0);
  const [paletteRequest, setPaletteRequest] = useState<NotebookPaletteRequest | null>(null);
  const [proseSelection, setProseSelection] = useState<NotebookProseSelection | null>(null);
  const [pendingMathFocusId, setPendingMathFocusId] = useState<string | null>(null);
  const templateMenu = useNotebookTransientLayer({ id: 'notebook-starter-templates' });
  const extensions = useMemo(
    () => createNotebookExtensions(onOpenMathInTool),
    [onOpenMathInTool],
  );
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
      const selection = notebookEditorSelection(currentEditor);
      const nextDocument = notebookDocumentFromTiptap(
        currentEditor.getJSON(),
        documentRef.current,
        { selectedNodeId: selection?.id ?? null },
      );
      documentRef.current = nextDocument;
      changeRef.current(nextDocument);
      selectionRef.current(selection);
      const nextProseSelection = selectedProseRange(currentEditor);
      setProseSelection(nextProseSelection);
      proseSelectionChangeRef.current(nextProseSelection);
      setRevision((current) => current + 1);
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      selectionRef.current(notebookEditorSelection(currentEditor));
      const nextProseSelection = selectedProseRange(currentEditor);
      setProseSelection(nextProseSelection);
      proseSelectionChangeRef.current(nextProseSelection);
      setRevision((current) => current + 1);
    },
  });

  useEffect(() => {
    documentRef.current = document;
    changeRef.current = onChange;
    proseSelectionChangeRef.current = onProseSelectionChange;
    selectionRef.current = onSelectionChange;
  }, [document, onChange, onOpenMathInTool, onProseSelectionChange, onSelectionChange]);

  useEffect(() => {
    onEditorChange(editor);
    if (editor) {
      onSelectionChange(notebookEditorSelection(editor));
    }
    return () => onEditorChange(null);
  }, [editor, onEditorChange, onSelectionChange]);

  useEffect(() => {
    if (!editor || !editor.isEmpty) {
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

  if (!editor) {
    return <div className="notebook-rich-canvas-loading">Preparing document…</div>;
  }

  const suggestion = selectedParagraphSuggestion(editor);
  const isBlank = editor.isEmpty;

  function applyTemplate(templateId: NotebookStarterTemplateId) {
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

  return (
    <div className="notebook-rich-canvas" data-revision={revision}>
      <NotebookRichToolbar
        editor={editor}
        hasProseSelection={Boolean(proseSelection)}
        onInsertDisplayMath={() => insertNotebookDisplayMath(editor, {
          onInserted: setPendingMathFocusId,
        })}
        onInsertInlineMath={() => insertNotebookInlineMath(editor, {
          onInserted: setPendingMathFocusId,
        })}
        onRequestPalette={requestPalette}
      />
      <div
        ref={scrollRegionRef}
        className="notebook-rich-scroll-region"
        data-empty={isBlank ? 'true' : 'false'}
      >
        {isBlank ? (
          <span className="notebook-empty-writing-prompt" aria-hidden="true">
            Start writing your explanation...
          </span>
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
              <div data-notebook-transient-layer={templateMenu.id} className="notebook-template-menu">
                {NOTEBOOK_STARTER_TEMPLATES.map((template) => (
                  <button key={template.id} type="button" onClick={() => applyTemplate(template.id)}>
                    <strong>{template.label}</strong>
                    <span>{template.description}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <NotebookSelectionToolbar
        key={paletteRequest?.nonce ?? 0}
        editor={editor}
        paletteRequest={paletteRequest}
        selection={proseSelection}
      />
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
