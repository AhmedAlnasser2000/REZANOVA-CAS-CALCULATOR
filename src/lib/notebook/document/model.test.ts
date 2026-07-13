import { describe, expect, it } from 'vitest';

import {
  countNotebookBlocks,
  createNotebookRichDocument,
  isNotebookRichDocument,
  summarizeNotebookDocument,
} from './model';
import {
  NOTEBOOK_FONT_SIZE_MAX,
  NOTEBOOK_FONT_SIZE_MIN,
  NOTEBOOK_RICH_DOCUMENT_VERSION,
} from './types';

const fixedNow = () => new Date('2026-07-11T12:00:00.000Z');

describe('Notebook rich document model', () => {
  it('creates an app-owned version 4 document with an empty starter paragraph', () => {
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

  it('validates prose strike and exact Word-like font-size marks', () => {
    const document = createNotebookRichDocument({ now: fixedNow });
    document.content = [{
      type: 'paragraph',
      id: 'paragraph.typography',
      content: [{
        type: 'text',
        text: 'Retain this authored correction.',
        marks: [
          { type: 'strike' },
          { type: 'textStyle', color: '#9dcdf0', fontSize: 149 },
        ],
      }],
    }];

    expect(isNotebookRichDocument(document)).toBe(true);

    const tooSmall = structuredClone(document);
    (tooSmall.content[0] as { content: Array<{ marks: Array<{ fontSize?: number }> }> })
      .content[0].marks[1].fontSize = NOTEBOOK_FONT_SIZE_MIN - 1;
    expect(isNotebookRichDocument(tooSmall)).toBe(false);

    const tooLarge = structuredClone(document);
    (tooLarge.content[0] as { content: Array<{ marks: Array<{ fontSize?: number }> }> })
      .content[0].marks[1].fontSize = NOTEBOOK_FONT_SIZE_MAX + 1;
    expect(isNotebookRichDocument(tooLarge)).toBe(false);
  });

  it('counts nested sections, semantic blocks, and list content for summaries', () => {
    const document = createNotebookRichDocument({ now: fixedNow });
    document.content = [{
      type: 'section',
      id: 'section.1',
      title: 'Limit Laws',
      collapsed: true,
      content: [{
        type: 'semanticBlock',
        id: 'theorem.1',
        variant: 'theorem',
        content: [{ type: 'paragraph', id: 'paragraph.1' }],
      }],
    }, {
      type: 'bulletList',
      id: 'list.1',
      content: [{
        type: 'listItem',
        id: 'item.1',
        content: [{ type: 'paragraph', id: 'paragraph.2' }],
      }],
    }];

    expect(countNotebookBlocks(document.content)).toBe(5);
    expect(summarizeNotebookDocument(document)).toMatchObject({
      id: document.id,
      blockCount: 5,
      title: 'Untitled Notebook',
    });
  });
});
