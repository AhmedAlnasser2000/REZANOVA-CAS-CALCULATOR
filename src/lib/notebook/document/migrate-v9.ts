import {
  NOTEBOOK_RICH_DOCUMENT_VERSION,
  type NotebookRichDocument,
  type NotebookRichDocumentV9,
} from './types';

/** V10 adds direct-media geometry and paragraph indentation without changing legacy values. */
export function migrateNotebookDocumentV9(
  document: NotebookRichDocumentV9,
): NotebookRichDocument {
  return {
    ...document,
    version: NOTEBOOK_RICH_DOCUMENT_VERSION,
  };
}
