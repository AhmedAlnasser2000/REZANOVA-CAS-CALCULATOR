import {
  NOTEBOOK_RICH_DOCUMENT_VERSION,
  type NotebookRichDocument,
  type NotebookRichDocumentV3,
} from './types';

/** V3 already has the recursive structure; V4 only adds optional text marks. */
export function migrateNotebookDocumentV3(
  document: NotebookRichDocumentV3,
): NotebookRichDocument {
  return {
    ...document,
    version: NOTEBOOK_RICH_DOCUMENT_VERSION,
  };
}
