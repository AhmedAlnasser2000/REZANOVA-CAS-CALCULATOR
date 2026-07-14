import {
  NOTEBOOK_SURFACE_STATE_KIND,
  type NotebookDocument,
  type NotebookLibrarySurfaceState,
  type NotebookRichSurfaceState,
} from '../types';
import { isNotebookLibraryId } from '../persistence/contracts';
import { migrateNotebookDocumentV1 } from './migrate-v1';
import { migrateNotebookDocumentV2 } from './migrate-v2';
import { migrateNotebookDocumentV3 } from './migrate-v3';
import { migrateNotebookDocumentV4 } from './migrate-v4';
import { migrateNotebookDocumentV5 } from './migrate-v5';
import {
  createNotebookRichDocument,
  isNotebookRichDocument,
  isNotebookRichDocumentV2,
  isNotebookRichDocumentV3,
  isNotebookRichDocumentV4,
  isNotebookRichDocumentV5,
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

export function createNotebookLibrarySurfaceState(options: {
  libraryId: string;
  revision: number;
  title: string;
}): NotebookLibrarySurfaceState {
  const state: NotebookLibrarySurfaceState = {
    kind: NOTEBOOK_SURFACE_STATE_KIND,
    ...options,
  };
  if (!isNotebookLibrarySurfaceState(state)) {
    throw new TypeError('Notebook library surface state is invalid.');
  }
  return state;
}

export function isNotebookLibrarySurfaceState(
  value: unknown,
): value is NotebookLibrarySurfaceState {
  return isRecord(value)
    && value.kind === NOTEBOOK_SURFACE_STATE_KIND
    && isNotebookLibraryId(value.libraryId)
    && Number.isSafeInteger(value.revision)
    && Number(value.revision) >= 1
    && typeof value.title === 'string'
    && value.document === undefined;
}

export function notebookLibrarySurfaceStateFromSlot(
  value: unknown,
): NotebookLibrarySurfaceState | null {
  return isNotebookLibrarySurfaceState(value) ? value : null;
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
    if (isNotebookRichDocumentV2(value.document)) {
      return {
        kind: NOTEBOOK_SURFACE_STATE_KIND,
        document: migrateNotebookDocumentV2(value.document),
      };
    }
    if (isNotebookRichDocumentV3(value.document)) {
      return {
        kind: NOTEBOOK_SURFACE_STATE_KIND,
        document: migrateNotebookDocumentV3(value.document),
      };
    }
    if (isNotebookRichDocumentV4(value.document)) {
      return {
        kind: NOTEBOOK_SURFACE_STATE_KIND,
        document: migrateNotebookDocumentV4(value.document),
      };
    }
    if (isNotebookRichDocumentV5(value.document)) {
      return {
        kind: NOTEBOOK_SURFACE_STATE_KIND,
        document: migrateNotebookDocumentV5(value.document),
      };
    }
  }
  return createNotebookRichSurfaceState(options);
}
