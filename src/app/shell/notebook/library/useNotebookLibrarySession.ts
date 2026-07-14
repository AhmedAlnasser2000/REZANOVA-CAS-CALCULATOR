import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  createNotebookLibrarySurfaceState,
  collectNotebookAssetIds,
  createNotebookRichDocument,
  createNotebookStarterContent,
  createNotebookStoredRecordV1,
  createNotebookVersionSnapshotV1,
  notebookLibrarySurfaceStateFromSlot,
  notebookRichSurfaceStateFromSlot,
  publishNotebookWorkspaceTitle,
  type NotebookLibraryService,
  type NotebookRichDocument,
  type NotebookStarterTemplateId,
  type NotebookStoredRecordSummaryV1,
  type NotebookStoredRecordV1,
  type NotebookSurfaceState,
  type NotebookVersionReason,
  type NotebookVersionSnapshotV1,
} from '../../../../lib/notebook';
import type { WorkspaceInstanceStateSlot } from '../../../runtime/workspace-instances';

const AUTOSAVE_DELAY_MS = 750;
const PERIODIC_SNAPSHOT_INTERVAL_MS = 5 * 60 * 1_000;

export type NotebookSaveStatus = 'saving' | 'saved' | 'unsaved' | 'failed';

type UseNotebookLibrarySessionOptions = {
  instanceId: string;
  onUpdateSurfaceState: (instanceId: string, state: NotebookSurfaceState) => void;
  service: NotebookLibraryService;
  surfaceState: WorkspaceInstanceStateSlot;
};

function uniqueIdentity(prefix: 'notebook' | 'snapshot') {
  const uuid = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}.${Math.random().toString(36).slice(2)}`;
  return `${prefix}.${uuid}`;
}

function recordWithDocument(
  record: NotebookStoredRecordV1,
  document: NotebookRichDocument,
): NotebookStoredRecordV1 {
  return {
    ...record,
    document,
    assetIds: collectNotebookAssetIds(document.content),
  };
}

export function useNotebookLibrarySession({
  instanceId,
  onUpdateSurfaceState,
  service,
  surfaceState,
}: UseNotebookLibrarySessionOptions) {
  const [document, setDocument] = useState<NotebookRichDocument | null>(null);
  const [record, setRecord] = useState<NotebookStoredRecordV1 | null>(null);
  const [saveStatus, setSaveStatus] = useState<NotebookSaveStatus>('saving');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [library, setLibrary] = useState<NotebookStoredRecordSummaryV1[]>([]);
  const [trash, setTrash] = useState<NotebookStoredRecordSummaryV1[]>([]);
  const [versions, setVersions] = useState<NotebookVersionSnapshotV1[]>([]);
  const documentRef = useRef<NotebookRichDocument | null>(null);
  const recordRef = useRef<NotebookStoredRecordV1 | null>(null);
  const dirtyRef = useRef(false);
  const editSequenceRef = useRef(0);
  const savingRef = useRef<Promise<boolean> | null>(null);
  const mountedRef = useRef(true);
  const lastSnapshotAtRef = useRef<number | null>(null);
  const initialSurfaceStateRef = useRef(surfaceState);
  const initialInstanceIdRef = useRef(instanceId);
  const updateSurfaceStateRef = useRef(onUpdateSurfaceState);
  updateSurfaceStateRef.current = onUpdateSurfaceState;
  if (initialInstanceIdRef.current !== instanceId) {
    initialInstanceIdRef.current = instanceId;
    initialSurfaceStateRef.current = surfaceState;
  }

  const updateSurfaceReference = useCallback((nextRecord: NotebookStoredRecordV1) => {
    updateSurfaceStateRef.current(instanceId, createNotebookLibrarySurfaceState({
      libraryId: nextRecord.libraryId,
      revision: nextRecord.revision,
      title: nextRecord.document.title,
    }));
    publishNotebookWorkspaceTitle(instanceId, nextRecord.document.title);
  }, [instanceId]);

  const activateRecord = useCallback((
    nextRecord: NotebookStoredRecordV1,
    dirty = false,
  ) => {
    if (!dirty) {
      service.forgetWarmRecord(nextRecord.libraryId);
    }
    recordRef.current = nextRecord;
    documentRef.current = nextRecord.document;
    dirtyRef.current = dirty;
    editSequenceRef.current += 1;
    setRecord(nextRecord);
    setDocument(nextRecord.document);
    setSaveError(null);
    setSaveStatus(dirty ? 'unsaved' : 'saved');
    updateSurfaceReference(nextRecord);
  }, [service, updateSurfaceReference]);

  const saveSnapshot = useCallback(async (
    snapshotRecord: NotebookStoredRecordV1,
    reason: NotebookVersionReason,
  ) => {
    const snapshot = createNotebookVersionSnapshotV1(snapshotRecord, {
      createdAt: new Date().toISOString(),
      reason,
      snapshotId: uniqueIdentity('snapshot'),
    });
    await service.library.saveVersion(snapshot);
    lastSnapshotAtRef.current = Date.parse(snapshot.createdAt);
  }, [service.library]);

  const createRecord = useCallback(async (
    templateId?: NotebookStarterTemplateId,
  ) => {
    const libraryId = uniqueIdentity('notebook');
    const nextDocument = createNotebookRichDocument({
      idPrefix: libraryId,
      title: 'Untitled Notebook',
    });
    if (templateId) {
      nextDocument.content = createNotebookStarterContent(templateId, {
        idPrefix: nextDocument.id,
      });
      nextDocument.selectedNodeId = null;
    }
    const nextRecord = createNotebookStoredRecordV1(nextDocument, { libraryId });
    const stored = await service.saveRecord(nextRecord, { expectedRevision: null });
    await saveSnapshot(stored, 'initial');
    return stored;
  }, [saveSnapshot, service]);

  const refreshCatalog = useCallback(async () => {
    const [nextLibrary, nextTrash] = await Promise.all([
      service.library.list(),
      service.library.listTrash(),
    ]);
    if (mountedRef.current) {
      setLibrary(nextLibrary);
      setTrash(nextTrash);
    }
    const current = recordRef.current;
    if (current) {
      const nextVersions = await service.library.listVersions(current.libraryId);
      if (mountedRef.current && recordRef.current?.libraryId === current.libraryId) {
        setVersions(nextVersions);
        lastSnapshotAtRef.current = nextVersions.length
          ? Date.parse(nextVersions[0].createdAt)
          : null;
      }
    }
  }, [service.library]);

  const saveNow = useCallback(async (): Promise<boolean> => {
    if (savingRef.current) {
      const priorSucceeded = await savingRef.current;
      return priorSucceeded && dirtyRef.current ? saveNow() : priorSucceeded;
    }
    const currentRecord = recordRef.current;
    const currentDocument = documentRef.current;
    if (!currentRecord || !currentDocument || !dirtyRef.current) {
      return true;
    }
    const startedAtSequence = editSequenceRef.current;
    const nextRecord: NotebookStoredRecordV1 = {
      ...recordWithDocument(currentRecord, currentDocument),
      revision: currentRecord.revision + 1,
      savedAt: new Date().toISOString(),
    };
    if (mountedRef.current) {
      setSaveStatus('saving');
      setSaveError(null);
    }
    const operation = service.saveRecord(nextRecord, {
      expectedRevision: currentRecord.revision,
    }).then(async (stored) => {
      recordRef.current = stored;
      if (mountedRef.current) {
        setRecord(stored);
      }
      updateSurfaceReference(stored);
      const unchanged = editSequenceRef.current === startedAtSequence;
      dirtyRef.current = !unchanged;
      if (mountedRef.current) {
        setSaveStatus(unchanged ? 'saved' : 'unsaved');
      }
      service.forgetWarmRecord(stored.libraryId);
      const lastSnapshot = lastSnapshotAtRef.current;
      if (lastSnapshot === null || Date.now() - lastSnapshot >= PERIODIC_SNAPSHOT_INTERVAL_MS) {
        try {
          await saveSnapshot(stored, 'periodic');
        } catch {
          // The current revision is already durable. A history failure must not
          // misreport that successful document save as failed.
        }
      }
      return true;
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Notebook could not be saved.';
      dirtyRef.current = true;
      if (mountedRef.current) {
        setSaveStatus('failed');
        setSaveError(message);
      }
      return false;
    }).finally(() => {
      savingRef.current = null;
    });
    savingRef.current = operation;
    return operation;
  }, [saveSnapshot, service, updateSurfaceReference]);

  const commitDocument = useCallback((nextDocument: NotebookRichDocument) => {
    const titleChanged = documentRef.current?.title !== nextDocument.title;
    documentRef.current = nextDocument;
    if (recordRef.current) {
      recordRef.current = recordWithDocument(recordRef.current, nextDocument);
      setRecord(recordRef.current);
    }
    dirtyRef.current = true;
    editSequenceRef.current += 1;
    setDocument(nextDocument);
    setSaveStatus('unsaved');
    setSaveError(null);
    if (titleChanged && recordRef.current) {
      updateSurfaceReference(recordWithDocument(recordRef.current, nextDocument));
    }
  }, [updateSurfaceReference]);

  const openRecord = useCallback(async (libraryId: string) => {
    if (!await saveNow()) {
      return false;
    }
    const nextRecord = await service.loadRecord(libraryId);
    if (!nextRecord) {
      setSaveError('Notebook could not be found in the local library.');
      setSaveStatus('failed');
      return false;
    }
    activateRecord(nextRecord);
    await refreshCatalog();
    return true;
  }, [activateRecord, refreshCatalog, saveNow, service]);

  const newRecord = useCallback(async (templateId?: NotebookStarterTemplateId) => {
    if (!await saveNow()) {
      return false;
    }
    try {
      activateRecord(await createRecord(templateId));
      await refreshCatalog();
      return true;
    } catch (error) {
      setSaveStatus('failed');
      setSaveError(error instanceof Error ? error.message : 'Notebook could not be created.');
      return false;
    }
  }, [activateRecord, createRecord, refreshCatalog, saveNow]);

  const exportPortable = useCallback(async () => {
    if (!service.package || !recordRef.current || !documentRef.current) {
      throw new Error('Portable Notebook export is available in the desktop app.');
    }
    const currentRecord = dirtyRef.current
      ? {
          ...recordWithDocument(recordRef.current, documentRef.current),
          revision: recordRef.current.revision + 1,
          savedAt: new Date().toISOString(),
        }
      : recordWithDocument(recordRef.current, documentRef.current);
    return {
      bytes: await service.package.exportPortable(currentRecord),
      fileName: `${currentRecord.document.title.trim() || 'Untitled Notebook'}.cwiznb`,
    };
  }, [service.package]);

  const importPortable = useCallback(async (bytes: Uint8Array) => {
    if (!service.package) {
      throw new Error('Portable Notebook import is available in the desktop app.');
    }
    if (!await saveNow()) {
      return false;
    }
    const imported = await service.package.importPortable(bytes);
    activateRecord(imported);
    await refreshCatalog();
    return true;
  }, [activateRecord, refreshCatalog, saveNow, service.package]);

  const restoreVersion = useCallback(async (snapshot: NotebookVersionSnapshotV1) => {
    if (!await saveNow() || !recordRef.current) {
      return false;
    }
    const current = recordRef.current;
    await saveSnapshot(current, 'before-restore');
    const restored: NotebookStoredRecordV1 = recordWithDocument({
      ...current,
      revision: current.revision + 1,
      savedAt: new Date().toISOString(),
    }, snapshot.record.document);
    const stored = await service.saveRecord(restored, { expectedRevision: current.revision });
    activateRecord(stored);
    await refreshCatalog();
    return true;
  }, [activateRecord, refreshCatalog, saveNow, saveSnapshot, service]);

  const moveCurrentToTrash = useCallback(async () => {
    if (!await saveNow() || !recordRef.current) {
      return false;
    }
    const current = recordRef.current;
    await saveSnapshot(current, 'before-trash');
    await service.library.moveToTrash(current.libraryId);
    service.forgetWarmRecord(current.libraryId);
    try {
      activateRecord(await createRecord());
    } catch (error) {
      await service.library.restoreFromTrash(current.libraryId);
      activateRecord(current);
      throw error;
    }
    await refreshCatalog();
    return true;
  }, [activateRecord, createRecord, refreshCatalog, saveNow, saveSnapshot, service]);

  const restoreTrashRecord = useCallback(async (libraryId: string) => {
    await service.library.restoreFromTrash(libraryId);
    await refreshCatalog();
  }, [refreshCatalog, service.library]);

  const deleteTrashRecord = useCallback(async (libraryId: string) => {
    await service.library.deletePermanently(libraryId);
    await refreshCatalog();
  }, [refreshCatalog, service.library]);

  useEffect(() => {
    mountedRef.current = true;
    documentRef.current = null;
    recordRef.current = null;
    dirtyRef.current = false;
    setDocument(null);
    setRecord(null);
    setSaveError(null);
    setSaveStatus('saving');
    const initialSurfaceState = initialSurfaceStateRef.current;
    let cancelled = false;
    void (async () => {
      try {
        const reference = notebookLibrarySurfaceStateFromSlot(initialSurfaceState);
        let initialRecord: NotebookStoredRecordV1 | null = null;
        let restoredDirtyRecord = false;
        if (reference) {
          initialRecord = await service.loadRecord(reference.libraryId);
          restoredDirtyRecord = service.isWarmRecordDirty(reference.libraryId);
        } else {
          const migrated = notebookRichSurfaceStateFromSlot(initialSurfaceState, {
            idPrefix: instanceId,
          }).document;
          const libraryId = uniqueIdentity('notebook');
          const candidate = createNotebookStoredRecordV1(migrated, { libraryId });
          initialRecord = await service.saveRecord(candidate, { expectedRevision: null });
          await saveSnapshot(initialRecord, 'initial');
        }
        if (!initialRecord) {
          throw new Error('Notebook local record is missing.');
        }
        if (!cancelled) {
          activateRecord(initialRecord, restoredDirtyRecord);
          await refreshCatalog();
        }
      } catch (error) {
        if (!cancelled) {
          setSaveStatus('failed');
          setSaveError(error instanceof Error ? error.message : 'Notebook could not be opened.');
        }
      }
    })();
    return () => {
      cancelled = true;
      mountedRef.current = false;
      const currentRecord = recordRef.current;
      const currentDocument = documentRef.current;
      if (currentRecord && currentDocument) {
        service.rememberWarmRecord(
          recordWithDocument(currentRecord, currentDocument),
          dirtyRef.current,
        );
        void saveNow();
      }
    };
  }, [activateRecord, instanceId, refreshCatalog, saveNow, saveSnapshot, service]);

  useEffect(() => {
    if (!document || !dirtyRef.current || saveStatus === 'failed') {
      return;
    }
    const handle = window.setTimeout(() => void saveNow(), AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(handle);
  }, [document, saveNow, saveStatus]);

  useEffect(() => {
    const saveShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveNow();
      }
    };
    window.addEventListener('keydown', saveShortcut);
    return () => window.removeEventListener('keydown', saveShortcut);
  }, [saveNow]);

  return {
    commitDocument,
    deleteTrashRecord,
    document,
    exportPortable,
    importPortable,
    library,
    moveCurrentToTrash,
    newRecord,
    openRecord,
    packageAvailable: service.package !== null,
    record,
    refreshCatalog,
    restoreTrashRecord,
    restoreVersion,
    saveError,
    saveNow,
    saveStatus,
    trash,
    versions,
  };
}
