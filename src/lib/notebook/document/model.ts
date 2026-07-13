import {
  isNotebookFontSize,
  NOTEBOOK_RICH_DOCUMENT_VERSION,
  type NotebookDocumentSummary,
  type NotebookInlineNode,
  type NotebookRichBlockNode,
  type NotebookRichDocument,
  type NotebookRichDocumentV2,
  type NotebookRichDocumentV3,
  type NotebookRichMark,
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

function isRichMark(value: unknown, validateTypography: boolean): value is NotebookRichMark {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return false;
  }
  if (value.type === 'bold' || value.type === 'italic' || value.type === 'strike') {
    return true;
  }
  if (value.type === 'highlight') {
    return value.color === undefined || typeof value.color === 'string';
  }
  if (value.type === 'textStyle') {
    return (value.color === undefined || typeof value.color === 'string')
      && (!validateTypography || value.fontSize === undefined || isNotebookFontSize(value.fontSize));
  }
  return false;
}

function isInlineNode(value: unknown, validateTypography: boolean): value is NotebookInlineNode {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return false;
  }
  if (value.type === 'text') {
    return typeof value.text === 'string'
      && (value.marks === undefined
        || (Array.isArray(value.marks) && value.marks.every((mark) => isRichMark(mark, validateTypography))));
  }
  return value.type === 'inlineMath'
    && typeof value.id === 'string'
    && typeof value.sourceText === 'string'
    && typeof value.latex === 'string'
    && typeof value.workspaceTarget === 'string';
}

function isRichBlockNode(
  value: unknown,
  allowSection = true,
  validateTypography = true,
): value is NotebookRichBlockNode {
  if (!isRecord(value) || typeof value.type !== 'string' || typeof value.id !== 'string') {
    return false;
  }
  if (value.type === 'section') {
    return allowSection
      && typeof value.title === 'string'
      && (value.collapsed === undefined || typeof value.collapsed === 'boolean')
      && Array.isArray(value.content)
      && value.content.every((child) => isRichBlockNode(child, allowSection, validateTypography));
  }
  if (value.type === 'semanticBlock') {
    return Array.isArray(value.content)
      && value.content.every((child) => isRichBlockNode(child, allowSection, validateTypography));
  }
  if (value.type === 'bulletList' || value.type === 'orderedList') {
    return Array.isArray(value.content) && value.content.every((item) =>
      isRecord(item)
        && item.type === 'listItem'
        && typeof item.id === 'string'
        && Array.isArray(item.content)
        && item.content.every((child) => isRichBlockNode(child, allowSection, validateTypography)));
  }
  if (value.type === 'paragraph') {
    return value.content === undefined
      || (Array.isArray(value.content) && value.content.every((node) => isInlineNode(node, validateTypography)));
  }
  if (value.type === 'heading') {
    return (value.level === 1 || value.level === 2 || value.level === 3)
      && (value.content === undefined
        || (Array.isArray(value.content) && value.content.every((node) => isInlineNode(node, validateTypography))));
  }
  return [
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
    && value.content.every((node) => isRichBlockNode(node));
}

export function isNotebookRichDocumentV2(value: unknown): value is NotebookRichDocumentV2 {
  return isRecord(value)
    && value.version === 2
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
    && (typeof value.selectedNodeId === 'string' || value.selectedNodeId === null)
    && Array.isArray(value.content)
    && value.content.every((node) => isRichBlockNode(node, false, false));
}

export function isNotebookRichDocumentV3(value: unknown): value is NotebookRichDocumentV3 {
  return isRecord(value)
    && value.version === 3
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
    && (typeof value.selectedNodeId === 'string' || value.selectedNodeId === null)
    && Array.isArray(value.content)
    && value.content.every((node) => isRichBlockNode(node, true, false));
}

export function countNotebookBlocks(nodes: readonly NotebookRichBlockNode[]): number {
  return nodes.reduce((count, node) => {
    if (node.type === 'semanticBlock' || node.type === 'section') {
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
