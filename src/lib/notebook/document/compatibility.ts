import type {
  NotebookHeaderFooterSettings,
  NotebookLegacyHeaderFooterSettings,
  NotebookPageSetup,
  NotebookRichBlockNode,
} from './types';
import { NOTEBOOK_RICH_DOCUMENT_VERSION } from './types';
import { isNotebookLegacyRichDocumentSchema } from './model';

export const NOTEBOOK_DOCUMENT_COMPATIBILITY_MANIFEST = {
  currentSchema: NOTEBOOK_RICH_DOCUMENT_VERSION,
  minimumDurableSchema: 6,
  supportedDurableSchemas: [6, 7, 8, 9, 10, 11, 12, 13, 14],
  bestEffortRecoverySchemas: [1, 2, 3, 4, 5],
} as const;

type NotebookHistoricalRichDocumentBase = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  selectedNodeId: string | null;
  content: NotebookRichBlockNode[];
};

export type NotebookRichDocumentV2 = NotebookHistoricalRichDocumentBase & {
  version: 2;
};

export type NotebookRichDocumentV3 = NotebookHistoricalRichDocumentBase & {
  version: 3;
};

export type NotebookRichDocumentV4 = NotebookHistoricalRichDocumentBase & {
  version: 4;
};

export type NotebookRichDocumentV5 = NotebookHistoricalRichDocumentBase & {
  version: 5;
};

export type NotebookRichDocumentV6 = NotebookHistoricalRichDocumentBase & {
  version: 6;
};

export type NotebookRichDocumentV7 = NotebookHistoricalRichDocumentBase & {
  version: 7;
};

export type NotebookRichDocumentV8 = NotebookHistoricalRichDocumentBase & {
  version: 8;
  pageSetup: NotebookPageSetup;
  headerFooter: NotebookLegacyHeaderFooterSettings;
};

export type NotebookRichDocumentV9 = NotebookHistoricalRichDocumentBase & {
  version: 9;
  pageSetup: NotebookPageSetup;
  headerFooter: NotebookLegacyHeaderFooterSettings;
};

export type NotebookRichDocumentV10 = NotebookHistoricalRichDocumentBase & {
  version: 10;
  pageSetup: NotebookPageSetup;
  headerFooter: NotebookLegacyHeaderFooterSettings;
};

export type NotebookRichDocumentV11 = NotebookHistoricalRichDocumentBase & {
  version: 11;
  pageSetup: NotebookPageSetup;
  headerFooter: NotebookHeaderFooterSettings;
};

export type NotebookRichDocumentV12 = NotebookHistoricalRichDocumentBase & {
  version: 12;
  pageSetup: NotebookPageSetup;
  headerFooter: NotebookHeaderFooterSettings;
};

export type NotebookRichDocumentV13 = NotebookHistoricalRichDocumentBase & {
  version: 13;
  pageSetup: NotebookPageSetup;
  headerFooter: NotebookHeaderFooterSettings;
};

export function isNotebookRichDocumentV2(value: unknown): value is NotebookRichDocumentV2 {
  return isNotebookLegacyRichDocumentSchema(value, 2);
}

export function isNotebookRichDocumentV3(value: unknown): value is NotebookRichDocumentV3 {
  return isNotebookLegacyRichDocumentSchema(value, 3);
}

export function isNotebookRichDocumentV4(value: unknown): value is NotebookRichDocumentV4 {
  return isNotebookLegacyRichDocumentSchema(value, 4);
}

export function isNotebookRichDocumentV5(value: unknown): value is NotebookRichDocumentV5 {
  return isNotebookLegacyRichDocumentSchema(value, 5);
}

export function isNotebookRichDocumentV6(value: unknown): value is NotebookRichDocumentV6 {
  return isNotebookLegacyRichDocumentSchema(value, 6);
}

export function isNotebookRichDocumentV7(value: unknown): value is NotebookRichDocumentV7 {
  return isNotebookLegacyRichDocumentSchema(value, 7);
}

export function isNotebookRichDocumentV8(value: unknown): value is NotebookRichDocumentV8 {
  return isNotebookLegacyRichDocumentSchema(value, 8);
}

export function isNotebookRichDocumentV9(value: unknown): value is NotebookRichDocumentV9 {
  return isNotebookLegacyRichDocumentSchema(value, 9);
}

export function isNotebookRichDocumentV10(value: unknown): value is NotebookRichDocumentV10 {
  return isNotebookLegacyRichDocumentSchema(value, 10);
}

export function isNotebookRichDocumentV11(value: unknown): value is NotebookRichDocumentV11 {
  return isNotebookLegacyRichDocumentSchema(value, 11);
}

export function isNotebookRichDocumentV12(value: unknown): value is NotebookRichDocumentV12 {
  return isNotebookLegacyRichDocumentSchema(value, 12);
}

export function isNotebookRichDocumentV13(value: unknown): value is NotebookRichDocumentV13 {
  return isNotebookLegacyRichDocumentSchema(value, 13);
}
