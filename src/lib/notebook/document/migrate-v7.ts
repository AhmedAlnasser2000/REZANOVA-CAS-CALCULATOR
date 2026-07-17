import {
  DEFAULT_NOTEBOOK_HEADER_FOOTER_V10,
  DEFAULT_NOTEBOOK_PAGE_SETUP,
} from './page-layout';
import { migrateNotebookDocumentV8 } from './migrate-v8';
import type { NotebookRichDocument } from './types';
import type { NotebookRichDocumentV7, NotebookRichDocumentV8 } from './compatibility';

/** V8 adds persisted page geometry, simple running matter, and explicit page breaks. */
export function migrateNotebookDocumentV7(
  document: NotebookRichDocumentV7,
): NotebookRichDocument {
  const version8: NotebookRichDocumentV8 = {
    ...document,
    version: 8,
    pageSetup: {
      ...DEFAULT_NOTEBOOK_PAGE_SETUP,
      marginsPt: { ...DEFAULT_NOTEBOOK_PAGE_SETUP.marginsPt },
    },
    headerFooter: {
      ...DEFAULT_NOTEBOOK_HEADER_FOOTER_V10,
      pageNumbering: { ...DEFAULT_NOTEBOOK_HEADER_FOOTER_V10.pageNumbering },
    },
  };
  return migrateNotebookDocumentV8(version8);
}
