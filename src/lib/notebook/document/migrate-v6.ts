import {
  NOTEBOOK_RICH_DOCUMENT_VERSION,
  type NotebookRichDocument,
  type NotebookRichDocumentV6,
} from './types';

/** V7 adds an optional image block; a V6 tree migrates losslessly by version alone. */
export function migrateNotebookDocumentV6(
  document: NotebookRichDocumentV6,
): NotebookRichDocument {
  return {
    ...document,
    version: NOTEBOOK_RICH_DOCUMENT_VERSION,
  };
}
