import { describe, expect, it } from 'vitest';

import {
  notebookRunningMatterFromTiptap,
  notebookRunningMatterToTiptap,
} from './notebook-running-matter';

describe('Notebook running matter conversion', () => {
  it('round-trips formatted text and live page fields without block content', () => {
    const content = [{
      type: 'paragraph' as const,
      content: [
        { type: 'text' as const, text: 'Page ', marks: [{ type: 'bold' as const }] },
        { type: 'pageNumber' as const, marks: [{ type: 'underline' as const }] },
      ],
    }];
    expect(notebookRunningMatterFromTiptap(notebookRunningMatterToTiptap(content)))
      .toEqual(content);
  });

  it('keeps temporary editor output inside the V11 content bounds', () => {
    const converted = notebookRunningMatterFromTiptap({
      type: 'doc',
      content: Array.from({ length: 20 }, () => ({
        type: 'paragraph',
        content: Array.from({ length: 20 }, () => ({ type: 'text', text: 'x'.repeat(100) })),
      })),
    });
    expect(converted).toHaveLength(16);
    expect(converted.flatMap((paragraph) => paragraph.content ?? [])).toHaveLength(41);
    expect(converted.flatMap((paragraph) => paragraph.content ?? [])
      .reduce((sum, inline) => sum + (inline.type === 'text' ? inline.text.length : 0), 0))
      .toBe(4096);
  });
});
