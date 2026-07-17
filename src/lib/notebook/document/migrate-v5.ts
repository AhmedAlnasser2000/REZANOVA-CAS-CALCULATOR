import { notebookSemanticIsCollapsible } from './structured-blocks';
import {
  type NotebookRichBlockNode,
  type NotebookRichDocument,
} from './types';
import type { NotebookRichDocumentV5, NotebookRichDocumentV6 } from './compatibility';
import { migrateNotebookDocumentV6 } from './migrate-v6';

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
  const version6: NotebookRichDocumentV6 = {
    ...document,
    version: 6,
    content: document.content.map(migrateBlock),
  };
  return migrateNotebookDocumentV6(version6);
}
