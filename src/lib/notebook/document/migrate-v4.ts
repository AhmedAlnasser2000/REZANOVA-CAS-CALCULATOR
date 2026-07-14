import {
  NOTEBOOK_RICH_DOCUMENT_VERSION,
  type NotebookRichDocument,
  type NotebookRichDocumentV4,
} from './types';

/** V5 adds only optional formatting; an unformatted V4 tree migrates by version alone. */
export function migrateNotebookDocumentV4(
  document: NotebookRichDocumentV4,
): NotebookRichDocument {
  return {
    ...document,
    version: NOTEBOOK_RICH_DOCUMENT_VERSION,
  };
}
