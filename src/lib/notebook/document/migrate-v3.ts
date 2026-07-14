import { migrateNotebookDocumentV4 } from './migrate-v4';
import type {
  NotebookRichDocument,
  NotebookRichDocumentV3,
  NotebookRichDocumentV4,
} from './types';

/** Later versions add only optional marks/formatting, so V3 content stays unchanged. */
export function migrateNotebookDocumentV3(
  document: NotebookRichDocumentV3,
): NotebookRichDocument {
  const version4: NotebookRichDocumentV4 = {
    ...document,
    version: 4,
  };
  return migrateNotebookDocumentV4(version4);
}
