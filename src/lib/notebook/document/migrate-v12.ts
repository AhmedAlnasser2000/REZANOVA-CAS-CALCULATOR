import type { NotebookRichDocument, NotebookRichDocumentV12 } from './types';

/** V13 adds optional floating-object placement; every V12 object remains in flow. */
export function migrateNotebookDocumentV12(
  document: NotebookRichDocumentV12,
): NotebookRichDocument {
  return {
    ...document,
    version: 13,
  };
}
