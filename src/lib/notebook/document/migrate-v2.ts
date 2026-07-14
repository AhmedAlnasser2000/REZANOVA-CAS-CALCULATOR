import { migrateNotebookDocumentV3 } from './migrate-v3';
import type {
  NotebookRichDocument,
  NotebookRichDocumentV2,
  NotebookRichDocumentV3,
} from './types';

export function migrateNotebookDocumentV2(
  document: NotebookRichDocumentV2,
): NotebookRichDocument {
  const version3: NotebookRichDocumentV3 = {
    ...document,
    version: 3,
  };
  return migrateNotebookDocumentV3(version3);
}
