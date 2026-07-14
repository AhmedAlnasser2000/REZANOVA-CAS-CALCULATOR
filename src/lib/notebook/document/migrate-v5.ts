import { notebookSemanticIsCollapsible } from './structured-blocks';
import {
  NOTEBOOK_RICH_DOCUMENT_VERSION,
  type NotebookRichBlockNode,
  type NotebookRichDocument,
  type NotebookRichDocumentV5,
} from './types';

function migrateBlock(node: NotebookRichBlockNode): NotebookRichBlockNode {
  if (node.type === 'semanticBlock') {
    const content = node.content.map(migrateBlock);
    if (!notebookSemanticIsCollapsible(node.variant)) {
      const visibleNode = { ...node };
      delete visibleNode.collapsed;
      return { ...visibleNode, content };
    }
    return { ...node, content };
  }
  if (node.type === 'section') {
    return { ...node, content: node.content.map(migrateBlock) };
  }
  if (node.type === 'bulletList' || node.type === 'orderedList') {
    return {
      ...node,
      content: node.content.map((item) => ({
        ...item,
        content: item.content.map(migrateBlock),
      })),
    };
  }
  return node;
}

/** V6 adds structured-block appearance and explicit collapsibility overrides. */
export function migrateNotebookDocumentV5(
  document: NotebookRichDocumentV5,
): NotebookRichDocument {
  return {
    ...document,
    version: NOTEBOOK_RICH_DOCUMENT_VERSION,
    content: document.content.map(migrateBlock),
  };
}
