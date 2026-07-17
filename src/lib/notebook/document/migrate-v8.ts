import { migrateNotebookDocumentV9 } from './migrate-v9';
import type { NotebookRichDocument } from './types';
import type { NotebookRichDocumentV8, NotebookRichDocumentV9 } from './compatibility';

/** V9 adds local video figures without changing existing V8 content or page settings. */
export function migrateNotebookDocumentV8(
  document: NotebookRichDocumentV8,
): NotebookRichDocument {
  const version9: NotebookRichDocumentV9 = {
    ...document,
    version: 9,
  };
  return migrateNotebookDocumentV9(version9);
}
