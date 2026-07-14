import { Editor } from '@tiptap/core';
import { describe, expect, it } from 'vitest';

import {
  createNotebookPerformanceFixture,
  createInMemoryNotebookAssetPort,
  isNotebookRichDocument,
} from '../../../../lib/notebook';
import {
  notebookDocumentFromTiptap,
  notebookDocumentToTiptap,
} from '../../../../lib/notebook/document/tiptap-adapter';
import { createNotebookExtensions } from './extensions';

function percentile(values: readonly number[], ratio: number) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * ratio) - 1)] ?? 0;
}

describe('Notebook large-document performance contract', () => {
  it('hydrates and edits the 5,000-block/2,000-math fixture within the committed target', () => {
    const startedAt = performance.now();
    const fixture = createNotebookPerformanceFixture('live');
    const editor = new Editor({
      content: notebookDocumentToTiptap(fixture),
      extensions: createNotebookExtensions(() => undefined, createInMemoryNotebookAssetPort()),
    });
    const readyDuration = performance.now() - startedAt;
    const editDurations: number[] = [];

    try {
      editor.commands.setTextSelection(editor.state.doc.content.size - 1);
      for (let index = 0; index < 100; index += 1) {
        const editStartedAt = performance.now();
        editor.commands.insertContent({ type: 'text', text: 'x' });
        editDurations.push(performance.now() - editStartedAt);
      }

      const roundTripped = notebookDocumentFromTiptap(editor.getJSON(), fixture);
      expect(isNotebookRichDocument(roundTripped)).toBe(true);
      expect(readyDuration).toBeLessThan(5_000);
      expect(percentile(editDurations, 0.95)).toBeLessThan(100);
      expect(Math.max(...editDurations)).toBeLessThan(250);
    } finally {
      editor.destroy();
    }
  }, 30_000);
});
