import {
  NOTEBOOK_RICH_DOCUMENT_VERSION,
  type NotebookRichDocument,
  type NotebookRichDocumentV3,
} from './types';

/** Later versions add only optional marks/formatting, so V3 content stays unchanged. */
export function migrateNotebookDocumentV3(
  document: NotebookRichDocumentV3,
): NotebookRichDocument {
  return {
    ...document,
    version: NOTEBOOK_RICH_DOCUMENT_VERSION,
  };
}
