import { createEmptyNotebookRunningMatterRegions } from './page-layout';
import type {
  NotebookHeaderFooterSettings,
  NotebookRichDocument,
  NotebookRichDocumentV10,
  NotebookRunningMatterContent,
} from './types';

function textContent(text: string): NotebookRunningMatterContent {
  return [{
    type: 'paragraph',
    ...(text ? { content: [{ type: 'text', text }] } : {}),
  }];
}

function legacyRunningMatter(document: NotebookRichDocumentV10): NotebookHeaderFooterSettings {
  const legacy = document.headerFooter;
  const defaultHeader = createEmptyNotebookRunningMatterRegions();
  const defaultFooter = createEmptyNotebookRunningMatterRegions();
  defaultHeader.left = textContent(legacy.headerText);
  defaultFooter.left = textContent(legacy.footerText);
  if (legacy.pageNumbering.enabled) {
    const position = legacy.pageNumbering.position;
    const existing = defaultFooter[position][0]?.content ?? [];
    defaultFooter[position] = [{
      type: 'paragraph',
      content: [
        ...existing,
        ...(existing.length ? [{ type: 'text' as const, text: ' ' }] : []),
        { type: 'pageNumber' },
      ],
    }];
  }
  return {
    defaultHeader,
    defaultFooter,
    firstPageHeader: createEmptyNotebookRunningMatterRegions(),
    firstPageFooter: createEmptyNotebookRunningMatterRegions(),
    differentFirstPage: legacy.differentFirstPage,
    pageNumberStart: legacy.pageNumbering.startAt,
  };
}

/** V11 replaces legacy running-matter strings with formatted regions and live page fields. */
export function migrateNotebookDocumentV10(
  document: NotebookRichDocumentV10,
): NotebookRichDocument {
  return {
    ...document,
    version: 11,
    headerFooter: legacyRunningMatter(document),
  };
}
