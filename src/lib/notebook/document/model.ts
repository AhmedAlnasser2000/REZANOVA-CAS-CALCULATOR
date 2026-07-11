import {
  NOTEBOOK_RICH_DOCUMENT_VERSION,
  type NotebookDocumentSummary,
  type NotebookRichBlockNode,
  type NotebookRichDocument,
} from './types';

export type NotebookRichFactoryOptions = {
  idPrefix?: string;
  now?: () => Date;
};

export function createNotebookNodeIdFactory(
  options: NotebookRichFactoryOptions = {},
) {
  let sequence = 0;
  const timestamp = (options.now ?? (() => new Date()))().getTime();
  return (kind: string) => {
    sequence += 1;
    return `${options.idPrefix ?? 'notebook'}.${kind}.${timestamp}.${sequence}`;
  };
}

export function createNotebookRichDocument(
  options: NotebookRichFactoryOptions & { title?: string } = {},
): NotebookRichDocument {
  const now = options.now ?? (() => new Date());
  const createdAt = now().toISOString();
  const nextId = createNotebookNodeIdFactory(options);
  const paragraphId = nextId('paragraph');

  return {
    version: NOTEBOOK_RICH_DOCUMENT_VERSION,
    id: nextId('document'),
    title: options.title ?? 'Untitled Notebook',
    createdAt,
    updatedAt: createdAt,
    selectedNodeId: paragraphId,
    content: [{ type: 'paragraph', id: paragraphId }],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isRichBlockNode(value: unknown): value is NotebookRichBlockNode {
  if (!isRecord(value) || typeof value.type !== 'string' || typeof value.id !== 'string') {
    return false;
  }
  if (value.type === 'semanticBlock') {
    return Array.isArray(value.content) && value.content.every(isRichBlockNode);
  }
  if (value.type === 'bulletList' || value.type === 'orderedList') {
    return Array.isArray(value.content) && value.content.every((item) =>
      isRecord(item)
        && item.type === 'listItem'
        && typeof item.id === 'string'
        && Array.isArray(item.content)
        && item.content.every(isRichBlockNode));
  }
  return [
    'paragraph',
    'heading',
    'displayMath',
    'evidenceSnapshot',
    'horizontalRule',
  ].includes(value.type);
}

export function isNotebookRichDocument(value: unknown): value is NotebookRichDocument {
  return isRecord(value)
    && value.version === NOTEBOOK_RICH_DOCUMENT_VERSION
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
    && (typeof value.selectedNodeId === 'string' || value.selectedNodeId === null)
    && Array.isArray(value.content)
    && value.content.every(isRichBlockNode);
}

export function countNotebookBlocks(nodes: readonly NotebookRichBlockNode[]): number {
  return nodes.reduce((count, node) => {
    if (node.type === 'semanticBlock') {
      return count + 1 + countNotebookBlocks(node.content);
    }
    if (node.type === 'bulletList' || node.type === 'orderedList') {
      return count + 1 + node.content.reduce(
        (itemCount, item) => itemCount + countNotebookBlocks(item.content),
        0,
      );
    }
    return count + 1;
  }, 0);
}

export function summarizeNotebookDocument(
  document: NotebookRichDocument,
): NotebookDocumentSummary {
  return {
    id: document.id,
    title: document.title,
    updatedAt: document.updatedAt,
    blockCount: countNotebookBlocks(document.content),
  };
}
