import type {
  NotebookRichBlockNode,
  NotebookSemanticKind,
} from './types';
import {
  notebookSectionIsCollapsible,
  notebookSemanticIsCollapsible,
} from './structured-blocks';

export type NotebookSemanticDefinition = {
  kind: NotebookSemanticKind;
  label: string;
  tone: 'concept' | 'reasoning' | 'practice' | 'support';
  collapsible: boolean;
};

export const NOTEBOOK_SEMANTIC_DEFINITIONS: readonly NotebookSemanticDefinition[] = [
  { kind: 'theorem', label: 'Theorem', tone: 'concept', collapsible: false },
  { kind: 'definition', label: 'Definition', tone: 'concept', collapsible: false },
  { kind: 'lemma', label: 'Lemma', tone: 'concept', collapsible: false },
  { kind: 'corollary', label: 'Corollary', tone: 'concept', collapsible: false },
  { kind: 'proof', label: 'Proof', tone: 'reasoning', collapsible: false },
  { kind: 'example', label: 'Example', tone: 'reasoning', collapsible: false },
  { kind: 'solution', label: 'Solution', tone: 'reasoning', collapsible: false },
  { kind: 'exercise', label: 'Exercise', tone: 'practice', collapsible: false },
  { kind: 'hint', label: 'Hint', tone: 'support', collapsible: true },
  { kind: 'answer', label: 'Answer', tone: 'support', collapsible: true },
  { kind: 'note', label: 'Note', tone: 'support', collapsible: false },
  { kind: 'warning', label: 'Warning', tone: 'support', collapsible: false },
];

const SEMANTIC_BY_KIND = new Map(
  NOTEBOOK_SEMANTIC_DEFINITIONS.map((definition) => [definition.kind, definition]),
);

export function notebookSemanticDefinition(kind: NotebookSemanticKind) {
  return SEMANTIC_BY_KIND.get(kind) ?? SEMANTIC_BY_KIND.get('note')!;
}

export function notebookSemanticTitle(
  kind: NotebookSemanticKind,
  number?: string,
  label?: string,
) {
  return [notebookSemanticDefinition(kind).label, number, label]
    .filter((part) => Boolean(part?.trim()))
    .join(' ');
}

export type NotebookOutlineEntry = {
  id: string;
  label: string;
  nodeType: 'heading' | 'semanticBlock' | 'section';
  semanticKind?: NotebookSemanticKind;
  parentId: string | null;
  depth: number;
  path: string[];
  childCount: number;
  collapsed: boolean;
  topLevelIndex: number;
};

function inlineText(node: NotebookRichBlockNode) {
  if (node.type !== 'heading') {
    return '';
  }
  return node.content?.map((child) => child.type === 'text'
    ? child.text
    : child.sourceText || child.latex).join('') ?? '';
}

export function buildNotebookOutline(
  nodes: readonly NotebookRichBlockNode[],
): NotebookOutlineEntry[] {
  const entries: NotebookOutlineEntry[] = [];

  function visit(
    children: readonly NotebookRichBlockNode[],
    parentId: string | null,
    depth: number,
    path: string[],
    topLevelIndex: number,
  ) {
    children.forEach((node, index) => {
      const rootIndex = depth === 0 ? index : topLevelIndex;
      if (node.type === 'section') {
        const label = node.title.trim() || 'Untitled section';
        const entry: NotebookOutlineEntry = {
          id: node.id,
          label,
          nodeType: 'section',
          parentId,
          depth,
          path: [...path, label],
          childCount: node.content.length,
          collapsed: notebookSectionIsCollapsible(node.collapsible) && node.collapsed === true,
          topLevelIndex: rootIndex,
        };
        entries.push(entry);
        visit(node.content, node.id, depth + 1, entry.path, rootIndex);
        return;
      }
      if (node.type === 'heading') {
        const label = inlineText(node).trim() || 'Untitled heading';
        entries.push({
          id: node.id,
          label,
          nodeType: 'heading',
          parentId,
          depth,
          path: [...path, label],
          childCount: 0,
          collapsed: false,
          topLevelIndex: rootIndex,
        });
        return;
      }
      if (node.type === 'semanticBlock') {
        const label = notebookSemanticTitle(node.variant, node.number, node.label);
        const entry: NotebookOutlineEntry = {
          id: node.id,
          label,
          nodeType: 'semanticBlock',
          semanticKind: node.variant,
          parentId,
          depth,
          path: [...path, label],
          childCount: node.content.length,
          collapsed: notebookSemanticIsCollapsible(node.variant, node.collapsible)
            && node.collapsed === true,
          topLevelIndex: rootIndex,
        };
        entries.push(entry);
        visit(node.content, node.id, depth + 1, entry.path, rootIndex);
        return;
      }
      if (node.type === 'bulletList' || node.type === 'orderedList') {
        node.content.forEach((item) => visit(item.content, parentId, depth, path, rootIndex));
      }
    });
  }

  visit(nodes, null, 0, [], 0);
  return entries;
}
