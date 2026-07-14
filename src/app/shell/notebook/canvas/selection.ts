import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { NodeSelection } from '@tiptap/pm/state';

import {
  normalizeNotebookAccentColor,
  normalizeNotebookMathSource,
  notebookSectionIsCollapsible,
  notebookSemanticIsCollapsible,
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

const NOTEBOOK_INSPECTOR_NODE_TYPES = new Set([
  'inlineMath',
  'displayMath',
  'semanticBlock',
  'notebookSection',
]);

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

/**
 * Resolves the block whose settings should be shown without replacing a prose
 * caret inside a structured block with a node selection.
 */
export function notebookInspectorSelection(
  editor: Editor,
): NotebookEditorSelection | null {
  const direct = notebookEditorSelection(editor);
  if (direct && NOTEBOOK_INSPECTOR_NODE_TYPES.has(direct.type)) {
    return direct;
  }

  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (!NOTEBOOK_INSPECTOR_NODE_TYPES.has(node.type.name)) {
      continue;
    }
    return {
      id: typeof node.attrs.id === 'string' ? node.attrs.id : null,
      type: node.type.name,
      attrs: { ...node.attrs },
      from: $from.before(depth),
      to: $from.after(depth),
    };
  }
  return null;
}

export function notebookEditorNodeById(
  editor: Editor,
  id: string,
): NotebookEditorSelection | null {
  let match: NotebookEditorSelection | null = null;
  editor.state.doc.descendants((node, position) => {
    if (node.attrs.id !== id) {
      return match == null;
    }
    match = {
      id,
      type: node.type.name,
      attrs: { ...node.attrs },
      from: position,
      to: position + node.nodeSize,
    };
    return false;
  });
  return match;
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
  options: {
    onInserted?: (nodeId: string) => void;
    sourceText?: string;
    workspaceTarget?: NotebookWorkspaceTarget;
  } = {},
) {
  const sourceText = options.sourceText ?? selectedSource(editor);
  const normalized = normalizeNotebookMathSource(sourceText, {
    mode: options.workspaceTarget ?? 'calculate',
  });
  const id = newNodeId('inlineMath');
  editor.chain().focus().deleteSelection().insertContent({
    type: 'inlineMath',
    attrs: {
      id,
      sourceText: normalized.sourceText,
      latex: normalized.latex,
      workspaceTarget: normalized.workspaceTarget,
    },
  }).run();
  const inserted = Boolean(notebookEditorNodeById(editor, id));
  if (inserted) {
    options.onInserted?.(id);
  }
  return inserted;
}

export function insertNotebookDisplayMath(
  editor: Editor,
  options: {
    onInserted?: (nodeId: string) => void;
    sourceText?: string;
    workspaceTarget?: NotebookWorkspaceTarget;
  } = {},
) {
  const sourceText = options.sourceText ?? selectedSource(editor);
  const normalized = normalizeNotebookMathSource(sourceText, {
    mode: options.workspaceTarget ?? 'calculate',
  });
  const id = newNodeId('displayMath');
  editor.chain().focus().deleteSelection().insertContent({
    type: 'displayMath',
    attrs: {
      id,
      label: '',
      sourceText: normalized.sourceText,
      latex: normalized.latex,
      workspaceTarget: normalized.workspaceTarget,
    },
  }).run();
  const inserted = Boolean(notebookEditorNodeById(editor, id));
  if (inserted) {
    options.onInserted?.(id);
  }
  return inserted;
}

export function convertSelectedNotebookMath(
  editor: Editor,
  role: 'inline' | 'display',
  selectionOverride?: NotebookEditorSelection | null,
) {
  const selection = selectionOverride?.id
    ? notebookEditorNodeById(editor, selectionOverride.id)
    : notebookEditorSelection(editor);
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
  selectionOverride?: NotebookEditorSelection | null,
) {
  const selection = selectionOverride?.id
    ? notebookEditorNodeById(editor, selectionOverride.id)
    : notebookEditorSelection(editor);
  if (!selection || !['inlineMath', 'displayMath'].includes(selection.type)) {
    return false;
  }
  const node = editor.state.doc.nodeAt(selection.from);
  if (!node || node.type.name !== selection.type) {
    return false;
  }
  editor.view.dispatch(editor.state.tr.setNodeMarkup(selection.from, undefined, {
    ...node.attrs,
    workspaceTarget,
  }));
  return true;
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
      accentColor: null,
      collapsible: null,
      collapsed: false,
    },
    content: [{
      type: 'paragraph',
      attrs: { id: null },
    }],
  }).run();
}

export function insertNotebookSection(
  editor: Editor,
  options: { parentId?: string | null; title?: string } = {},
) {
  const sectionType = editor.schema.nodes.notebookSection;
  const paragraphType = editor.schema.nodes.paragraph;
  if (!sectionType || !paragraphType) {
    return false;
  }
  const section = sectionType.create({
    id: newNodeId('section'),
    title: options.title ?? 'Untitled section',
    accentColor: null,
    collapsible: null,
    collapsed: false,
  }, paragraphType.create({ id: newNodeId('paragraph') }));
  const parent = options.parentId ? locateNotebookNode(editor, options.parentId) : null;
  const position = parent?.node.type.name === 'notebookSection'
    ? parent.position + parent.node.nodeSize - 1
    : editor.state.doc.content.size;
  const transaction = editor.state.tr.insert(position, section);
  if (parent?.node.type.name === 'notebookSection' && parent.node.attrs.collapsed === true) {
    transaction.setNodeMarkup(parent.position, undefined, {
      ...parent.node.attrs,
      collapsed: false,
    });
  }
  transaction.setSelection(NodeSelection.create(transaction.doc, position));
  editor.view.dispatch(transaction.scrollIntoView());
  return true;
}

export function insertNotebookEvidence(editor: Editor) {
  return editor.chain().focus().insertContent({
    type: 'evidenceSnapshot',
    attrs: {
      id: newNodeId('evidence'),
      source: 'manual-placeholder',
      title: 'Evidence snapshot',
      inputLatex: '',
      resultLatex: '',
      facts: [],
      warnings: [],
    },
  }).run();
}

export function insertNotebookDivider(editor: Editor) {
  return editor.chain().focus().setHorizontalRule().run();
}

export function insertNotebookPageBreak(editor: Editor) {
  const pageBreak = editor.schema.nodes.pageBreak;
  if (!pageBreak) return false;
  const { $from } = editor.state.selection;
  const topLevelIndex = $from.index(0);
  const topLevelNode = topLevelIndex < editor.state.doc.childCount
    ? editor.state.doc.child(topLevelIndex)
    : null;
  const position = topLevelNode && $from.depth > 0
    ? $from.before(1) + topLevelNode.nodeSize
    : editor.state.selection.to;
  const node = pageBreak.create({ id: newNodeId('pageBreak') });
  const transaction = editor.state.tr.insert(
    Math.min(position, editor.state.doc.content.size),
    node,
  );
  editor.view.dispatch(transaction.scrollIntoView());
  return true;
}

export function updateSelectedNotebookSemantic(
  editor: Editor,
  attributes: Partial<{
    variant: NotebookSemanticKind;
    label: string;
    number: string;
    accentColor: string | null;
    collapsible: boolean | null;
    collapsed: boolean;
  }>,
  targetSelection?: NotebookEditorSelection | null,
) {
  const selection = targetSelection?.type === 'semanticBlock'
    ? targetSelection
    : notebookEditorSelection(editor);
  if (selection?.type !== 'semanticBlock' || !selection.id) {
    return false;
  }
  const located = locateNotebookNode(editor, selection.id);
  if (!located || located.node.type.name !== 'semanticBlock') {
    return false;
  }
  const accentColor = attributes.accentColor;
  const normalizedAccent = typeof accentColor === 'string'
    ? normalizeNotebookAccentColor(accentColor)
    : accentColor;
  if (typeof accentColor === 'string' && !normalizedAccent) {
    return false;
  }
  const nextAttributes = {
    ...located.node.attrs,
    ...attributes,
    ...(accentColor !== undefined ? { accentColor: normalizedAccent } : {}),
  };
  const nextVariant = String(nextAttributes.variant ?? 'note') as NotebookSemanticKind;
  const effectiveCollapsible = notebookSemanticIsCollapsible(
    nextVariant,
    typeof nextAttributes.collapsible === 'boolean' ? nextAttributes.collapsible : null,
  );
  if (!effectiveCollapsible) {
    nextAttributes.collapsed = false;
  }
  editor.view.dispatch(editor.state.tr.setNodeMarkup(
    located.position,
    undefined,
    nextAttributes,
  ));
  return true;
}

type LocatedNotebookNode = {
  id: string;
  index: number;
  node: ProseMirrorNode;
  parent: ProseMirrorNode;
  parentId: string | null;
  position: number;
  depth: number;
};

function notebookNodes(editor: Editor) {
  const nodes: LocatedNotebookNode[] = [];
  editor.state.doc.descendants((node, position, parent, index) => {
    if (parent && typeof node.attrs.id === 'string') {
      nodes.push({
        id: node.attrs.id,
        index,
        node,
        parent,
        parentId: typeof parent.attrs.id === 'string' ? parent.attrs.id : null,
        position,
        depth: editor.state.doc.resolve(position).depth,
      });
    }
  });
  return nodes;
}

function locateNotebookNode(editor: Editor, id: string) {
  return notebookNodes(editor).find((node) => node.id === id) ?? null;
}

function siblingNotebookNodes(editor: Editor, source: LocatedNotebookNode) {
  return notebookNodes(editor).filter((candidate) =>
    candidate.parentId === source.parentId && candidate.depth === source.depth);
}

function notebookTopLevelNodes(editor: Editor) {
  return notebookNodes(editor).filter((node) => node.parent.type.name === 'doc');
}

export type NotebookMovePlacement = 'before' | 'after' | 'inside';

export function moveNotebookNode(
  editor: Editor,
  sourceId: string,
  targetId: string,
  placement: NotebookMovePlacement,
) {
  if (sourceId === targetId) {
    return false;
  }
  const source = locateNotebookNode(editor, sourceId);
  const target = locateNotebookNode(editor, targetId);
  if (!source || !target || (placement === 'inside' && target.node.type.name !== 'notebookSection')) {
    return false;
  }
  if (target.position > source.position
    && target.position < source.position + source.node.nodeSize) {
    return false;
  }

  const transaction = editor.state.tr;
  if (source.parent.type.name !== 'doc' && source.parent.childCount === 1) {
    transaction.replaceWith(
      source.position,
      source.position + source.node.nodeSize,
      editor.schema.nodes.paragraph.create({ id: newNodeId('paragraph') }),
    );
  } else {
    transaction.delete(source.position, source.position + source.node.nodeSize);
  }

  const mappedTargetPosition = transaction.mapping.map(target.position, 1);
  const mappedTarget = transaction.doc.nodeAt(mappedTargetPosition);
  if (!mappedTarget) {
    return false;
  }
  const insertionPosition = placement === 'before'
    ? mappedTargetPosition
    : placement === 'after'
      ? mappedTargetPosition + mappedTarget.nodeSize
      : mappedTargetPosition + mappedTarget.nodeSize - 1;
  const resolvedInsertion = transaction.doc.resolve(insertionPosition);
  const insertionIndex = resolvedInsertion.index();
  if (!resolvedInsertion.parent.canReplaceWith(
    insertionIndex,
    insertionIndex,
    source.node.type,
  )) {
    return false;
  }
  transaction.insert(insertionPosition, source.node);
  if (placement === 'inside' && mappedTarget.attrs.collapsed === true) {
    transaction.setNodeMarkup(mappedTargetPosition, undefined, {
      ...mappedTarget.attrs,
      collapsed: false,
    });
  }
  transaction.setSelection(NodeSelection.create(transaction.doc, insertionPosition));
  editor.view.dispatch(transaction.scrollIntoView());
  return true;
}

export function updateNotebookSection(
  editor: Editor,
  id: string,
  attributes: Partial<{
    title: string;
    accentColor: string | null;
    collapsible: boolean | null;
    collapsed: boolean;
  }>,
) {
  const section = locateNotebookNode(editor, id);
  if (!section || section.node.type.name !== 'notebookSection') {
    return false;
  }
  const accentColor = attributes.accentColor;
  const normalizedAccent = typeof accentColor === 'string'
    ? normalizeNotebookAccentColor(accentColor)
    : accentColor;
  if (typeof accentColor === 'string' && !normalizedAccent) {
    return false;
  }
  const nextAttributes = {
    ...section.node.attrs,
    ...attributes,
    ...(accentColor !== undefined ? { accentColor: normalizedAccent } : {}),
  };
  const effectiveCollapsible = notebookSectionIsCollapsible(
    typeof nextAttributes.collapsible === 'boolean' ? nextAttributes.collapsible : null,
  );
  if (!effectiveCollapsible) {
    nextAttributes.collapsed = false;
  }
  editor.view.dispatch(editor.state.tr.setNodeMarkup(
    section.position,
    undefined,
    nextAttributes,
  ));
  return true;
}

export function removeNotebookSection(
  editor: Editor,
  id: string,
  options: { keepContents: boolean },
) {
  const section = locateNotebookNode(editor, id);
  if (!section || section.node.type.name !== 'notebookSection') {
    return false;
  }
  const transaction = editor.state.tr;
  if (options.keepContents) {
    transaction.replaceWith(
      section.position,
      section.position + section.node.nodeSize,
      section.node.content,
    );
  } else if (section.parent.type.name !== 'doc' && section.parent.childCount === 1) {
    transaction.replaceWith(
      section.position,
      section.position + section.node.nodeSize,
      editor.schema.nodes.paragraph.create({ id: newNodeId('paragraph') }),
    );
  } else {
    transaction.delete(section.position, section.position + section.node.nodeSize);
  }
  if (transaction.doc.childCount === 0) {
    transaction.insert(0, editor.schema.nodes.paragraph.create({ id: newNodeId('paragraph') }));
  }
  editor.view.dispatch(transaction.scrollIntoView());
  return true;
}

export function indentNotebookNode(editor: Editor, id: string) {
  const source = locateNotebookNode(editor, id);
  if (!source) {
    return false;
  }
  const siblings = siblingNotebookNodes(editor, source);
  const sourceIndex = siblings.findIndex((node) => node.id === id);
  const previous = siblings[sourceIndex - 1];
  return previous?.node.type.name === 'notebookSection'
    ? moveNotebookNode(editor, id, previous.id, 'inside')
    : false;
}

export function outdentNotebookNode(editor: Editor, id: string) {
  const source = locateNotebookNode(editor, id);
  if (!source?.parentId) {
    return false;
  }
  const parent = locateNotebookNode(editor, source.parentId);
  return parent?.node.type.name === 'notebookSection'
    ? moveNotebookNode(editor, id, parent.id, 'after')
    : false;
}

export function moveNotebookNodeInParent(
  editor: Editor,
  id: string,
  direction: 'up' | 'down',
) {
  const source = locateNotebookNode(editor, id);
  if (!source) {
    return false;
  }
  const siblings = siblingNotebookNodes(editor, source);
  const sourceIndex = siblings.findIndex((node) => node.id === id);
  const target = siblings[sourceIndex + (direction === 'up' ? -1 : 1)];
  return target
    ? moveNotebookNode(editor, id, target.id, direction === 'up' ? 'before' : 'after')
    : false;
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
  return moveNotebookNode(editor, sourceId, targetId, placement);
}

export function moveSelectedNotebookTopLevelNode(
  editor: Editor,
  direction: 'up' | 'down',
  selectedNodeId?: string | null,
) {
  const selectionId = selectedNodeId ?? notebookEditorSelection(editor)?.id;
  if (!selectionId) {
    return false;
  }
  const nodes = notebookTopLevelNodes(editor);
  const sourceIndex = nodes.findIndex((node) => node.id === selectionId);
  if (sourceIndex < 0) {
    return false;
  }
  const target = nodes[sourceIndex + (direction === 'up' ? -1 : 1)];
  if (!target) {
    return false;
  }
  return moveNotebookTopLevelNode(
    editor,
    selectionId,
    target.id,
    direction === 'up' ? 'before' : 'after',
  );
}
