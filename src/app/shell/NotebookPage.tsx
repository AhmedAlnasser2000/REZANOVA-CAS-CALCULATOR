import type { Editor } from '@tiptap/core';
import {
  BookOpen,
  ChevronRight,
  Highlighter,
  Italic,
  ListTree,
  Palette,
  Plus,
  Send,
  Type,
} from 'lucide-react';
import {
  useCallback,
  useState,
} from 'react';

import {
  NOTEBOOK_PACKAGE_BOUNDARY,
  countNotebookBlocks,
  isNotebookLatexRunnable,
  notebookRichSurfaceStateFromSlot,
  type NotebookRichBlockNode,
  type NotebookRichDocument,
  type NotebookSurfaceState,
  type NotebookWorkspaceTarget,
} from '../../lib/notebook';
import type { WorkspaceInstanceStateSlot } from '../runtime/workspace-instances';
import { NotebookAuthoringKeyboard } from './notebook/authoring-keyboard';
import {
  convertSelectedNotebookMath,
  insertNotebookDisplayMath,
  NotebookRichCanvas,
  selectNotebookEditorNode,
  updateSelectedNotebookMathTarget,
  type NotebookEditorSelection,
} from './notebook/canvas';
import { NotebookMathFieldProvider } from './notebook/math-field';

type NotebookPageProps = {
  instanceId: string;
  onOpenMathInTool: (target: NotebookWorkspaceTarget, latex: string) => void;
  onUpdateSurfaceState: (instanceId: string, state: NotebookSurfaceState) => void;
  surfaceState: WorkspaceInstanceStateSlot;
};

type NotebookToolTarget = {
  id: NotebookWorkspaceTarget;
  label: string;
  live: boolean;
};

const NOTEBOOK_TOOL_TARGETS: readonly NotebookToolTarget[] = [
  { id: 'calculate', label: 'Calculate', live: true },
  { id: 'equation', label: 'Equation', live: true },
  { id: 'calculus', label: 'Calculus', live: false },
  { id: 'trigonometry', label: 'Trigonometry', live: false },
  { id: 'statistics', label: 'Statistics', live: false },
  { id: 'geometry', label: 'Geometry', live: false },
  { id: 'matrix', label: 'Matrix', live: false },
  { id: 'vector', label: 'Vector', live: false },
  { id: 'table', label: 'Table', live: false },
];

function canOpenTarget(target: NotebookWorkspaceTarget) {
  return NOTEBOOK_TOOL_TARGETS.some((item) => item.id === target && item.live);
}

function inlineText(node: NotebookRichBlockNode) {
  if (node.type === 'paragraph' || node.type === 'heading') {
    return node.content?.map((child) => child.type === 'text'
      ? child.text
      : child.sourceText || child.latex).join('') ?? '';
  }
  return '';
}

function outlineLabel(node: NotebookRichBlockNode) {
  if (node.type === 'heading' || node.type === 'paragraph') {
    return inlineText(node).trim().slice(0, 42)
      || (node.type === 'heading' ? 'Heading' : 'Text');
  }
  if (node.type === 'displayMath') {
    return node.label || node.sourceText || node.latex || 'Display math';
  }
  if (node.type === 'evidenceSnapshot') {
    return node.title;
  }
  if (node.type === 'semanticBlock') {
    return [node.variant, node.number, node.label]
      .filter(Boolean)
      .join(' ');
  }
  if (node.type === 'bulletList' || node.type === 'orderedList') {
    return node.type === 'bulletList' ? 'Bullet list' : 'Numbered list';
  }
  return 'Divider';
}

function selectionLabel(selection: NotebookEditorSelection | null) {
  if (!selection) {
    return 'Document';
  }
  const labels: Record<string, string> = {
    paragraph: 'Text',
    heading: 'Heading',
    inlineMath: 'Inline math',
    displayMath: 'Display math',
    semanticBlock: 'Academic container',
    evidenceSnapshot: 'Evidence snapshot',
    bulletList: 'Bullet list',
    orderedList: 'Numbered list',
  };
  return labels[selection.type] ?? 'Document block';
}

function NotebookInspector({
  editor,
  onOpenMathInTool,
  selection,
}: {
  editor: Editor | null;
  onOpenMathInTool: (target: NotebookWorkspaceTarget, latex: string) => void;
  selection: NotebookEditorSelection | null;
}) {
  const isMath = selection?.type === 'inlineMath' || selection?.type === 'displayMath';
  const target = String(selection?.attrs.workspaceTarget ?? 'calculate') as NotebookWorkspaceTarget;
  const latex = String(selection?.attrs.latex ?? '');
  const canOpen = Boolean(
    isMath
      && latex.trim()
      && canOpenTarget(target)
      && isNotebookLatexRunnable(latex),
  );

  return (
    <aside className="notebook-inspector" data-testid="notebook-inspector">
      <div className="notebook-inspector-heading">
        <span>Selected block</span>
        <strong>{selectionLabel(selection)}</strong>
      </div>
      {editor && !isMath ? (
        <div className="notebook-inspector-section">
          <span>Text treatment</span>
          <div className="notebook-inspector-actions">
            <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}><Type size={15} /> Bold</button>
            <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} /> Italic</button>
            <button type="button" onClick={() => editor.chain().focus().toggleHighlight({ color: '#48673f' }).run()}><Highlighter size={15} /> Highlight</button>
            <button type="button" onClick={() => editor.chain().focus().setColor('#b8d49c').run()}><Palette size={15} /> Color</button>
          </div>
        </div>
      ) : null}
      {editor && isMath ? (
        <>
          <div className="notebook-inspector-section">
            <span>Math placement</span>
            <div className="notebook-inspector-segmented">
              <button
                type="button"
                className={selection?.type === 'inlineMath' ? 'is-active' : undefined}
                onClick={() => convertSelectedNotebookMath(editor, 'inline')}
              >Inline</button>
              <button
                type="button"
                className={selection?.type === 'displayMath' ? 'is-active' : undefined}
                onClick={() => convertSelectedNotebookMath(editor, 'display')}
              >Display</button>
            </div>
          </div>
          <div className="notebook-inspector-section">
            <label htmlFor="notebook-workspace-target">Workspace</label>
            <select
              id="notebook-workspace-target"
              value={target}
              onChange={(event) => updateSelectedNotebookMathTarget(
                editor,
                event.target.value as NotebookWorkspaceTarget,
              )}
            >
              {NOTEBOOK_TOOL_TARGETS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}{item.live ? '' : ' (authoring only)'}
                </option>
              ))}
            </select>
          </div>
          <div className="notebook-inspector-section notebook-inspector-math-source">
            <span>Preserved source</span>
            <code>{String(selection?.attrs.sourceText ?? '') || 'Created directly in math mode'}</code>
            <button
              type="button"
              disabled={!canOpen}
              onClick={() => onOpenMathInTool(target, latex)}
            ><Send size={15} /> Open in Tool</button>
          </div>
        </>
      ) : null}
      <div className="notebook-inspector-section">
        <span>Session boundary</span>
        <p>Draft changes stay with this Notebook tab. Local persistence and packages remain deferred.</p>
        <div className="notebook-forbidden-fields">
          {NOTEBOOK_PACKAGE_BOUNDARY.forbiddenFields.slice(0, 4).map((field) => (
            <code key={field}>{field}</code>
          ))}
        </div>
      </div>
    </aside>
  );
}

export function NotebookPage({
  instanceId,
  onOpenMathInTool,
  onUpdateSurfaceState,
  surfaceState,
}: NotebookPageProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [selection, setSelection] = useState<NotebookEditorSelection | null>(null);
  const notebookState = notebookRichSurfaceStateFromSlot(surfaceState, {
    idPrefix: instanceId,
  });
  const { document } = notebookState;

  const commitDocument = useCallback((nextDocument: NotebookRichDocument) => {
    onUpdateSurfaceState(instanceId, {
      kind: 'notebook-surface-state',
      document: nextDocument,
    });
  }, [instanceId, onUpdateSurfaceState]);

  function addParagraph() {
    editor?.chain().focus('end').insertContent({
      type: 'paragraph',
      attrs: { id: null },
    }).run();
  }

  function addEvidence() {
    editor?.chain().focus('end').insertContent({
      type: 'evidenceSnapshot',
      attrs: {
        id: null,
        source: 'manual-placeholder',
        title: 'Evidence snapshot',
        facts: [],
        warnings: [],
      },
    }).run();
  }

  return (
    <NotebookMathFieldProvider>
      <section className="app-page app-page--notebook" data-testid="notebook-page">
        <header className="app-page-shell-header">REZANOVA CLASSWIZ CALCULATOR</header>
        <div className="notebook-page-workbench">
          <aside className="notebook-outline" aria-label="Notebook outline">
            <div className="notebook-title">
              <span>NOTEBOOK</span>
              <h1>{document.title}</h1>
              <p>Author explanations around live, verifiable math.</p>
            </div>
            <div className="notebook-outline-heading">
              <span><ListTree aria-hidden="true" size={15} /> Outline</span>
              <small>{countNotebookBlocks(document.content)} blocks</small>
            </div>
            <div className="notebook-outline-list">
              {document.content.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  className={node.id === selection?.id ? 'is-active' : undefined}
                  onClick={() => editor && selectNotebookEditorNode(editor, node.id)}
                >
                  <ChevronRight aria-hidden="true" size={15} />
                  <span>{outlineLabel(node)}</span>
                </button>
              ))}
            </div>
            <div className="notebook-add-actions">
              <button type="button" onClick={addParagraph}><Plus size={15} /> Text</button>
              <button type="button" onClick={() => editor && insertNotebookDisplayMath(editor)}><Plus size={15} /> Math</button>
              <button type="button" onClick={addEvidence}><Plus size={15} /> Evidence</button>
            </div>
            <div className="notebook-brand">
              <BookOpen aria-hidden="true" size={18} />
              <div>
                <strong>REZANOVA</strong>
                <span>CLASSWIZ NOTEBOOK</span>
              </div>
            </div>
          </aside>
          <main className="notebook-canvas" data-testid="notebook-canvas">
            <div className="notebook-canvas-header">
              <span>MATH-AWARE DOCUMENT</span>
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
                <span>{countNotebookBlocks(document.content)} blocks</span>
                <span>Session draft</span>
              </div>
            </div>
            <NotebookRichCanvas
              document={document}
              onChange={commitDocument}
              onEditorChange={setEditor}
              onOpenMathInTool={onOpenMathInTool}
              onSelectionChange={setSelection}
            />
          </main>
          <NotebookInspector
            editor={editor}
            selection={selection}
            onOpenMathInTool={onOpenMathInTool}
          />
        </div>
        <NotebookAuthoringKeyboard />
        <footer className="app-page-shell-footer">
          <span>Ready</span>
          <span>Workspace: Notebook</span>
          <span>Mode: N/A (Page Surface)</span>
        </footer>
      </section>
    </NotebookMathFieldProvider>
  );
}
