import { describe, expect, it } from 'vitest';

import {
  countNotebookBlocks,
  createNotebookRichDocument,
  isNotebookRichDocument,
  summarizeNotebookDocument,
} from './model';
import { NOTEBOOK_RICH_DOCUMENT_VERSION } from './types';

const fixedNow = () => new Date('2026-07-11T12:00:00.000Z');

describe('Notebook rich document model', () => {
  it('creates an app-owned version 2 document with an empty starter paragraph', () => {
    const document = createNotebookRichDocument({
      idPrefix: 'rich-test',
      now: fixedNow,
      title: 'Limits Lab',
    });

    expect(document.version).toBe(NOTEBOOK_RICH_DOCUMENT_VERSION);
    expect(document.title).toBe('Limits Lab');
    expect(document.content).toEqual([
      expect.objectContaining({ type: 'paragraph', id: document.selectedNodeId }),
    ]);
    expect(isNotebookRichDocument(JSON.parse(JSON.stringify(document)))).toBe(true);
  });

  it('counts nested semantic and list content for document summaries', () => {
    const document = createNotebookRichDocument({ now: fixedNow });
    document.content = [{
      type: 'semanticBlock',
      id: 'theorem.1',
      variant: 'theorem',
      content: [{ type: 'paragraph', id: 'paragraph.1' }],
    }, {
      type: 'bulletList',
      id: 'list.1',
      content: [{
        type: 'listItem',
        id: 'item.1',
        content: [{ type: 'paragraph', id: 'paragraph.2' }],
      }],
    }];

    expect(countNotebookBlocks(document.content)).toBe(4);
    expect(summarizeNotebookDocument(document)).toMatchObject({
      id: document.id,
      blockCount: 4,
      title: 'Untitled Notebook',
    });
  });
});
