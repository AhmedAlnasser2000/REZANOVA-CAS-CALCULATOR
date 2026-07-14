import {
  DEFAULT_NOTEBOOK_HEADER_FOOTER,
  DEFAULT_NOTEBOOK_PAGE_SETUP,
} from './page-layout';
import {
  NOTEBOOK_RICH_DOCUMENT_VERSION,
  type NotebookRichDocument,
  type NotebookRichDocumentV7,
} from './types';

/** V8 adds persisted page geometry, simple running matter, and explicit page breaks. */
export function migrateNotebookDocumentV7(
  document: NotebookRichDocumentV7,
): NotebookRichDocument {
  return {
    ...document,
    version: NOTEBOOK_RICH_DOCUMENT_VERSION,
    pageSetup: {
      ...DEFAULT_NOTEBOOK_PAGE_SETUP,
      marginsPt: { ...DEFAULT_NOTEBOOK_PAGE_SETUP.marginsPt },
    },
    headerFooter: {
      ...DEFAULT_NOTEBOOK_HEADER_FOOTER,
      pageNumbering: { ...DEFAULT_NOTEBOOK_HEADER_FOOTER.pageNumbering },
    },
  };
}
