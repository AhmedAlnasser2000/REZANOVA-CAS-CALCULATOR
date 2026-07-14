import {
  NOTEBOOK_RICH_DOCUMENT_VERSION,
  type NotebookRichDocument,
  type NotebookRichDocumentV8,
} from './types';

/** V9 adds local video figures without changing existing V8 content or page settings. */
export function migrateNotebookDocumentV8(
  document: NotebookRichDocumentV8,
): NotebookRichDocument {
  return {
    ...document,
    version: NOTEBOOK_RICH_DOCUMENT_VERSION,
  };
}
