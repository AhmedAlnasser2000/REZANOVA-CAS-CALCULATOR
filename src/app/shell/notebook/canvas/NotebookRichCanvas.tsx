import type { Editor } from '@tiptap/core';
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
  insertNotebookInlineMath,
  notebookEditorSelection,
  type NotebookEditorSelection,
} from './selection';

type NotebookRichCanvasProps = {
  document: NotebookRichDocument;
  onChange: (document: NotebookRichDocument) => void;
  onEditorChange: (editor: Editor | null) => void;
  onOpenMathInTool: (target: NotebookWorkspaceTarget, latex: string) => void;
  onSelectionChange: (selection: NotebookEditorSelection | null) => void;
};

function selectedParagraphSuggestion(editor: Editor | null) {
  if (!editor) {
    return null;
  }
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name !== 'paragraph' || !node.textContent.trim()) {
      continue;
    }
    const candidate = detectNotebookMathCandidates(node.textContent)[0];
    if (!candidate) {
      return null;
    }
    const start = $from.start(depth);
    return {
      ...candidate,
      from: start + candidate.start,
      to: start + candidate.end,
    };
  }
  return null;
}

export function NotebookRichCanvas({
  document,
  onChange,
  onEditorChange,
  onOpenMathInTool,
  onSelectionChange,
}: NotebookRichCanvasProps) {
  const documentRef = useRef(document);
  const loadedDocumentIdRef = useRef(document.id);
  const changeRef = useRef(onChange);
  const selectionRef = useRef(onSelectionChange);
  const [revision, setRevision] = useState(0);
  const [showTemplates, setShowTemplates] = useState(false);
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
      setRevision((current) => current + 1);
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      selectionRef.current(notebookEditorSelection(currentEditor));
      setRevision((current) => current + 1);
    },
  });

  useEffect(() => {
    documentRef.current = document;
    changeRef.current = onChange;
    selectionRef.current = onSelectionChange;
  }, [document, onChange, onOpenMathInTool, onSelectionChange]);

  useEffect(() => {
    onEditorChange(editor);
    if (editor) {
      onSelectionChange(notebookEditorSelection(editor));
    }
    return () => onEditorChange(null);
  }, [editor, onEditorChange, onSelectionChange]);

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
    setShowTemplates(false);
    requestAnimationFrame(() => {
      if (editor && !editor.isDestroyed) {
        editor.chain().focus('start').run();
      }
    });
  }

  return (
    <div className="notebook-rich-canvas" data-revision={revision}>
      <NotebookRichToolbar editor={editor} />
      {isBlank ? (
        <div className="notebook-template-start" data-testid="notebook-template-start">
          <div>
            <Sparkles aria-hidden="true" size={18} />
            <span>Begin with an empty page or a structured starting point.</span>
          </div>
          <button type="button" onClick={() => setShowTemplates((current) => !current)}>
            Start from template
          </button>
          {showTemplates ? (
            <div className="notebook-template-menu">
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
      <EditorContent className="notebook-rich-scroll-region" editor={editor} />
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
