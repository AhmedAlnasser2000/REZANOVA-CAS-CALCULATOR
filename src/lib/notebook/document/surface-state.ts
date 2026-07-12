import {
  NOTEBOOK_SURFACE_STATE_KIND,
  type NotebookDocument,
  type NotebookRichSurfaceState,
} from '../types';
import { migrateNotebookDocumentV1 } from './migrate-v1';
import {
  createNotebookRichDocument,
  isNotebookRichDocument,
  type NotebookRichFactoryOptions,
} from './model';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isNotebookDocumentV1(value: unknown): value is NotebookDocument {
  return isRecord(value)
    && value.version === 1
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && Array.isArray(value.blocks);
}

export function createNotebookRichSurfaceState(
  options: NotebookRichFactoryOptions & { title?: string } = {},
): NotebookRichSurfaceState {
  return {
    kind: NOTEBOOK_SURFACE_STATE_KIND,
    document: createNotebookRichDocument(options),
  };
}

export function notebookRichSurfaceStateFromSlot(
  value: unknown,
  options: NotebookRichFactoryOptions & { title?: string } = {},
): NotebookRichSurfaceState {
  if (isRecord(value) && value.kind === NOTEBOOK_SURFACE_STATE_KIND) {
    if (isNotebookRichDocument(value.document)) {
      return {
        kind: NOTEBOOK_SURFACE_STATE_KIND,
        document: value.document,
      };
    }
    if (isNotebookDocumentV1(value.document)) {
      return {
        kind: NOTEBOOK_SURFACE_STATE_KIND,
        document: migrateNotebookDocumentV1(value.document),
      };
    }
  }
  return createNotebookRichSurfaceState(options);
}
