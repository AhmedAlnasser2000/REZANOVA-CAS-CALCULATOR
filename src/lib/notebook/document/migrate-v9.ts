import type { NotebookRichDocument, NotebookRichDocumentV9, NotebookRichDocumentV10 } from './types';
import { migrateNotebookDocumentV10 } from './migrate-v10';

/** V10 adds direct-media geometry and paragraph indentation without changing legacy values. */
export function migrateNotebookDocumentV9(
  document: NotebookRichDocumentV9,
): NotebookRichDocument {
  const version10: NotebookRichDocumentV10 = {
    ...document,
    version: 10,
  };
  return migrateNotebookDocumentV10(version10);
}
