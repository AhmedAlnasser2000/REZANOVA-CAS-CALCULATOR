import {
  NOTEBOOK_SURFACE_STATE_KIND,
  type NotebookLibrarySurfaceState,
  type NotebookRichSurfaceState,
} from '../types';
import { isNotebookLibraryId } from '../persistence/contracts';
import { migrateNotebookRichDocument } from './migrate';
import {
  createNotebookRichDocument,
  type NotebookRichFactoryOptions,
} from './model';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
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
    const document = migrateNotebookRichDocument(value.document);
    if (document) {
      return {
        kind: NOTEBOOK_SURFACE_STATE_KIND,
        document,
      };
    }
  }
  return createNotebookRichSurfaceState(options);
}
