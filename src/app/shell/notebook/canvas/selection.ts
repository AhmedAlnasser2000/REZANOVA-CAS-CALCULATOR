import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { NodeSelection } from '@tiptap/pm/state';

import {
  normalizeNotebookMathSource,
  type NotebookSemanticKind,
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

export function insertNotebookSemanticBlock(
  editor: Editor,
  variant: NotebookSemanticKind,
) {
  return editor.chain().focus().insertContent({
    type: 'semanticBlock',
    attrs: {
      id: null,
      variant,
      label: '',
      number: '',
      collapsed: false,
    },
    content: [{
      type: 'paragraph',
      attrs: { id: null },
    }],
  }).run();
}

export function updateSelectedNotebookSemantic(
  editor: Editor,
  attributes: Partial<{
    variant: NotebookSemanticKind;
    label: string;
    number: string;
    collapsed: boolean;
  }>,
) {
  const selection = notebookEditorSelection(editor);
  if (selection?.type !== 'semanticBlock') {
    return false;
  }
  const node = editor.state.doc.nodeAt(selection.from);
  if (!node || node.type.name !== 'semanticBlock') {
    return false;
  }
  const transaction = editor.state.tr.setNodeMarkup(selection.from, undefined, {
    ...node.attrs,
    ...attributes,
  });
  transaction.setSelection(NodeSelection.create(transaction.doc, selection.from));
  editor.view.dispatch(transaction);
  return true;
}

type TopLevelNode = {
  id: string;
  index: number;
  node: ProseMirrorNode;
  position: number;
};

function notebookTopLevelNodes(editor: Editor) {
  const nodes: TopLevelNode[] = [];
  editor.state.doc.forEach((node, position, index) => {
    if (typeof node.attrs.id === 'string') {
      nodes.push({ id: node.attrs.id, index, node, position });
    }
  });
  return nodes;
}

export function notebookTopLevelMoveState(editor: Editor, id: string) {
  const nodes = notebookTopLevelNodes(editor);
  const index = nodes.findIndex((node) => node.id === id);
  return {
    canMoveUp: index > 0,
    canMoveDown: index >= 0 && index < nodes.length - 1,
  };
}

export function moveNotebookTopLevelNode(
  editor: Editor,
  sourceId: string,
  targetId: string,
  placement: 'before' | 'after',
) {
  if (sourceId === targetId) {
    return false;
  }
  const nodes = notebookTopLevelNodes(editor);
  const source = nodes.find((node) => node.id === sourceId);
  const target = nodes.find((node) => node.id === targetId);
  if (!source || !target) {
    return false;
  }

  const targetPosition = placement === 'before'
    ? target.position
    : target.position + target.node.nodeSize;
  const transaction = editor.state.tr.delete(
    source.position,
    source.position + source.node.nodeSize,
  );
  const insertionPosition = transaction.mapping.map(targetPosition);
  transaction.insert(insertionPosition, source.node);
  transaction.setSelection(NodeSelection.create(transaction.doc, insertionPosition));
  editor.view.dispatch(transaction.scrollIntoView());
  return true;
}

export function moveSelectedNotebookTopLevelNode(
  editor: Editor,
  direction: 'up' | 'down',
) {
  const selection = notebookEditorSelection(editor);
  if (!selection?.id) {
    return false;
  }
  const nodes = notebookTopLevelNodes(editor);
  const sourceIndex = nodes.findIndex((node) => node.id === selection.id);
  if (sourceIndex < 0) {
    return false;
  }
  const target = nodes[sourceIndex + (direction === 'up' ? -1 : 1)];
  if (!target) {
    return false;
  }
  return moveNotebookTopLevelNode(
    editor,
    selection.id,
    target.id,
    direction === 'up' ? 'before' : 'after',
  );
}
