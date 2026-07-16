import type {
  NotebookRichBlockNode,
  NotebookRichDocument,
  NotebookRichDocumentV13,
  NotebookRichTextNode,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function removedVideoParagraph(node: Record<string, unknown>): NotebookRichBlockNode {
  const title = typeof node.title === 'string' && node.title.trim()
    ? node.title.trim()
    : 'Untitled video';
  const text: NotebookRichTextNode = {
    type: 'text',
    text: `Video removed: ${title}`,
  };
  return {
    type: 'paragraph',
    id: typeof node.id === 'string' ? node.id : `notebook.removed-video.${Date.now()}`,
    content: [text],
  };
}

function stripVideosFromBlocks(nodes: readonly unknown[]): NotebookRichBlockNode[] {
  return nodes.flatMap((node): NotebookRichBlockNode[] => {
    if (!isRecord(node)) return [];
    if (node.type === 'videoFigure') {
      return [removedVideoParagraph(node)];
    }
    if (node.type === 'section' || node.type === 'semanticBlock') {
      const content = Array.isArray(node.content) ? stripVideosFromBlocks(node.content) : [];
      return [{ ...(node as Record<string, unknown>), content } as NotebookRichBlockNode];
    }
    if (node.type === 'bulletList' || node.type === 'orderedList') {
      const content = Array.isArray(node.content)
        ? node.content
          .filter(isRecord)
          .map((item) => ({
            ...item,
            content: Array.isArray(item.content) ? stripVideosFromBlocks(item.content) : [],
          }))
        : [];
      return [{ ...(node as NotebookRichBlockNode), content } as NotebookRichBlockNode];
    }
    return [node as NotebookRichBlockNode];
  });
}

/** V14 removes Notebook video blocks; legacy V13 videos become plain text notes. */
export function migrateNotebookDocumentV13(
  document: NotebookRichDocumentV13,
): NotebookRichDocument {
  return {
    ...document,
    version: 14,
    content: stripVideosFromBlocks(document.content as readonly unknown[]),
  };
}
