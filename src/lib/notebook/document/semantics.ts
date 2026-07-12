import type {
  NotebookRichBlockNode,
  NotebookSemanticKind,
} from './types';

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
  nodeType: 'heading' | 'semanticBlock';
  semanticKind?: NotebookSemanticKind;
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
  return nodes.flatMap((node, topLevelIndex): NotebookOutlineEntry[] => {
    if (node.type === 'heading') {
      return [{
        id: node.id,
        label: inlineText(node).trim() || 'Untitled section',
        nodeType: 'heading',
        topLevelIndex,
      }];
    }
    if (node.type === 'semanticBlock') {
      return [{
        id: node.id,
        label: notebookSemanticTitle(node.variant, node.number, node.label),
        nodeType: 'semanticBlock',
        semanticKind: node.variant,
        topLevelIndex,
      }];
    }
    return [];
  });
}
