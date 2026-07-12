import type { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';

import {
  normalizeNotebookMathSource,
  type NotebookWorkspaceTarget,
} from '../../../../lib/notebook';

export type NotebookEditorSelection = {
  id: string | null;
  type: string;
  attrs: Record<string, unknown>;
  from: number;
  to: number;
};

function newNodeId(kind: string) {
  return `notebook.${kind}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
}

export function notebookEditorSelection(
  editor: Editor,
): NotebookEditorSelection | null {
  const { selection } = editor.state;
  if (selection instanceof NodeSelection) {
    return {
      id: typeof selection.node.attrs.id === 'string' ? selection.node.attrs.id : null,
      type: selection.node.type.name,
      attrs: { ...selection.node.attrs },
      from: selection.from,
      to: selection.to,
    };
  }

  for (let depth = selection.$from.depth; depth > 0; depth -= 1) {
    const node = selection.$from.node(depth);
    if (typeof node.attrs.id === 'string') {
      return {
        id: node.attrs.id,
        type: node.type.name,
        attrs: { ...node.attrs },
        from: selection.$from.before(depth),
        to: selection.$from.after(depth),
      };
    }
  }
  return null;
}

export function selectNotebookEditorNode(editor: Editor, id: string) {
  let position: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (node.attrs.id === id) {
      position = pos;
      return false;
    }
    return position == null;
  });
  if (position == null) {
    return false;
  }
  return editor.chain().focus().setNodeSelection(position).scrollIntoView().run();
}

function selectedSource(editor: Editor) {
  const { from, to, empty } = editor.state.selection;
  return empty ? '' : editor.state.doc.textBetween(from, to, ' ');
}

export function insertNotebookInlineMath(
  editor: Editor,
  options: { sourceText?: string; workspaceTarget?: NotebookWorkspaceTarget } = {},
) {
  const sourceText = options.sourceText ?? selectedSource(editor);
  const normalized = normalizeNotebookMathSource(sourceText, {
    mode: options.workspaceTarget ?? 'calculate',
  });
  const id = newNodeId('inlineMath');
  const inserted = editor.chain().focus().deleteSelection().insertContent({
    type: 'inlineMath',
    attrs: {
      id,
      sourceText: normalized.sourceText,
      latex: normalized.latex,
      workspaceTarget: normalized.workspaceTarget,
    },
  }).run();
  if (inserted) {
    requestAnimationFrame(() => {
      const field = document.querySelector<HTMLElement>(
        `math-field[data-notebook-node-id="${id}"]`,
      );
      field?.focus();
    });
  }
  return inserted;
}

export function insertNotebookDisplayMath(
  editor: Editor,
  options: { sourceText?: string; workspaceTarget?: NotebookWorkspaceTarget } = {},
) {
  const sourceText = options.sourceText ?? selectedSource(editor);
  const normalized = normalizeNotebookMathSource(sourceText, {
    mode: options.workspaceTarget ?? 'calculate',
  });
  const id = newNodeId('displayMath');
  const inserted = editor.chain().focus().deleteSelection().insertContent({
    type: 'displayMath',
    attrs: {
      id,
      label: '',
      sourceText: normalized.sourceText,
      latex: normalized.latex,
      workspaceTarget: normalized.workspaceTarget,
    },
  }).run();
  if (inserted) {
    requestAnimationFrame(() => {
      const field = document.querySelector<HTMLElement>(
        `math-field[data-notebook-node-id="${id}"]`,
      );
      field?.focus();
    });
  }
  return inserted;
}

export function convertSelectedNotebookMath(
  editor: Editor,
  role: 'inline' | 'display',
) {
  const selection = notebookEditorSelection(editor);
  if (!selection || !['inlineMath', 'displayMath'].includes(selection.type)) {
    return false;
  }
  if ((role === 'inline' && selection.type === 'inlineMath')
    || (role === 'display' && selection.type === 'displayMath')) {
    return true;
  }

  const attrs = {
    id: newNodeId(role === 'inline' ? 'inlineMath' : 'displayMath'),
    sourceText: String(selection.attrs.sourceText ?? ''),
    latex: String(selection.attrs.latex ?? ''),
    workspaceTarget: String(selection.attrs.workspaceTarget ?? 'calculate'),
  };
  const replacement = role === 'display'
    ? { type: 'displayMath', attrs: { ...attrs, label: '' } }
    : {
        type: 'paragraph',
        attrs: { id: newNodeId('paragraph') },
        content: [{ type: 'inlineMath', attrs }],
      };
  return editor.chain().focus().insertContentAt({
    from: selection.from,
    to: selection.to,
  }, replacement).run();
}

export function updateSelectedNotebookMathTarget(
  editor: Editor,
  workspaceTarget: NotebookWorkspaceTarget,
) {
  const selection = notebookEditorSelection(editor);
  if (!selection || !['inlineMath', 'displayMath'].includes(selection.type)) {
    return false;
  }
  return editor.chain().focus().updateAttributes(selection.type, { workspaceTarget }).run();
}
