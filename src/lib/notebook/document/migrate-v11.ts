import { migrateNotebookDocumentV12 } from './migrate-v12';
import type {
  NotebookRichDocument,
  NotebookRichDocumentV11,
  NotebookRichDocumentV12,
} from './types';

/** V12 permits media widths normalized to one-thousandth of a percent. */
export function migrateNotebookDocumentV11(
  document: NotebookRichDocumentV11,
): NotebookRichDocument {
  const version12: NotebookRichDocumentV12 = {
    ...document,
    version: 12,
  };
  return migrateNotebookDocumentV12(version12);
}
