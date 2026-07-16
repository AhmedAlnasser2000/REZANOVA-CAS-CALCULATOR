import { migrateNotebookDocumentV13 } from './migrate-v13';
import type { NotebookRichDocument, NotebookRichDocumentV12, NotebookRichDocumentV13 } from './types';

/** V13 adds optional floating-object placement; every V12 object remains in flow. */
export function migrateNotebookDocumentV12(
  document: NotebookRichDocumentV12,
): NotebookRichDocument {
  const version13: NotebookRichDocumentV13 = {
    ...document,
    version: 13,
  };
  return migrateNotebookDocumentV13(version13);
}
