import {
  type NotebookRichDocument,
  type NotebookRichDocumentV6,
  type NotebookRichDocumentV7,
} from './types';
import { migrateNotebookDocumentV7 } from './migrate-v7';

/** V7 adds an optional image block; a V6 tree migrates losslessly by version alone. */
export function migrateNotebookDocumentV6(
  document: NotebookRichDocumentV6,
): NotebookRichDocument {
  const version7: NotebookRichDocumentV7 = {
    ...document,
    version: 7,
  };
  return migrateNotebookDocumentV7(version7);
}
