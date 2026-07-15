import type { NotebookRichDocument, NotebookRichDocumentV11 } from './types';

/** V12 permits media widths normalized to one-thousandth of a percent. */
export function migrateNotebookDocumentV11(
  document: NotebookRichDocumentV11,
): NotebookRichDocument {
  return {
    ...document,
    version: 12,
  };
}
