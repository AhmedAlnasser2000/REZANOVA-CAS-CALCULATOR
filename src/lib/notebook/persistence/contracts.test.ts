import { describe, expect, it } from 'vitest';

import { createNotebookRichDocument } from '../document/model';
import {
  createNotebookStoredRecordV1,
  createNotebookVersionSnapshotV1,
  isNotebookAssetMetadataV1,
  isNotebookStoredRecordV1,
  isNotebookVersionSnapshotV1,
  summarizeNotebookStoredRecordV1,
} from './contracts';

describe('Notebook durable persistence contracts', () => {
  it('keeps the versioned storage envelope distinct from the app document', () => {
    const document = createNotebookRichDocument({
      idPrefix: 'stored-contract',
      now: () => new Date('2026-07-14T00:00:00.000Z'),
      title: 'Contract document',
    });
    const record = createNotebookStoredRecordV1(document, {
      assetIds: [],
      libraryId: 'library.contract.1',
      revision: 4,
      savedAt: '2026-07-14T00:01:00.000Z',
    });
    expect(record.version).toBe(1);
    expect(record.document.version).toBe(6);
    expect(record.libraryId).not.toBe(record.document.id);
    expect(isNotebookStoredRecordV1(record)).toBe(true);
    expect(summarizeNotebookStoredRecordV1(record)).toMatchObject({
      assetCount: 0,
      documentId: document.id,
      libraryId: 'library.contract.1',
      revision: 4,
      title: 'Contract document',
    });
  });

  it('rejects malformed record identities, duplicate assets, and hash metadata', () => {
    const document = createNotebookRichDocument({
      now: () => new Date('2026-07-14T00:00:00.000Z'),
    });
    const record = createNotebookStoredRecordV1(document, {
      libraryId: 'library.valid',
      savedAt: '2026-07-14T00:00:00.000Z',
    });
    expect(isNotebookStoredRecordV1({ ...record, libraryId: '../escape' })).toBe(false);
    expect(isNotebookStoredRecordV1({
      ...record,
      assetIds: [`sha256:${'a'.repeat(64)}`, `sha256:${'a'.repeat(64)}`],
    })).toBe(false);
    expect(isNotebookAssetMetadataV1({
      version: 1,
      id: `sha256:${'a'.repeat(64)}`,
      sha256: 'b'.repeat(64),
      byteLength: 1,
      mimeType: 'image/png',
      createdAt: '2026-07-14T00:00:00.000Z',
    })).toBe(false);
  });

  it('validates version snapshots against their owning library revision', () => {
    const document = createNotebookRichDocument({
      now: () => new Date('2026-07-14T00:00:00.000Z'),
    });
    const record = createNotebookStoredRecordV1(document, {
      libraryId: 'library.history',
      revision: 3,
      savedAt: '2026-07-14T00:00:00.000Z',
    });
    const snapshot = createNotebookVersionSnapshotV1(record, {
      createdAt: '2026-07-14T00:01:00.000Z',
      reason: 'before-restore',
      snapshotId: 'snapshot.history.3',
    });
    expect(isNotebookVersionSnapshotV1(snapshot)).toBe(true);
    expect(isNotebookVersionSnapshotV1({ ...snapshot, revision: 2 })).toBe(false);
    expect(isNotebookVersionSnapshotV1({ ...snapshot, libraryId: '../escape' })).toBe(false);
  });
});
