import { migrateNotebookDocumentV5 } from './migrate-v5';
import type { NotebookRichDocument } from './types';
import type { NotebookRichDocumentV4, NotebookRichDocumentV5 } from './compatibility';

/** V5 adds only optional formatting; an unformatted V4 tree migrates by version alone. */
export function migrateNotebookDocumentV4(
  document: NotebookRichDocumentV4,
): NotebookRichDocument {
  const version5: NotebookRichDocumentV5 = {
    ...document,
    version: 5,
  };
  return migrateNotebookDocumentV5(version5);
}
