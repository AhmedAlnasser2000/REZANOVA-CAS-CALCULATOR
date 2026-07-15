import { describe, expect, it } from 'vitest';

import { createNotebookRichDocument } from '../document/model';
import {
  createNotebookStoredRecordV1,
  createNotebookVersionSnapshotV1,
  isNotebookAssetMetadataV1,
  isNotebookStoredRecordV1,
  isNotebookVersionSnapshotV1,
  migrateNotebookStoredRecordV1,
  migrateNotebookVersionSnapshotV1,
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
    expect(record.document.version).toBe(11);
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

  it('derives figure assets and rejects an incomplete stored record', () => {
    const assetId = `sha256:${'c'.repeat(64)}`;
    const document = createNotebookRichDocument({
      now: () => new Date('2026-07-14T00:00:00.000Z'),
    });
    document.content = [{
      type: 'imageFigure',
      id: 'image.contract.1',
      assetId,
      altText: 'A plotted curve',
    }];
    const record = createNotebookStoredRecordV1(document, {
      libraryId: 'library.image-contract',
      savedAt: '2026-07-14T00:00:00.000Z',
    });
    expect(record.assetIds).toEqual([assetId]);
    expect(isNotebookStoredRecordV1({ ...record, assetIds: [] })).toBe(false);
  });

  it('preserves V10 indentation and direct-media geometry in durable records', () => {
    const imageAssetId = `sha256:${'d'.repeat(64)}`;
    const videoAssetId = `sha256:${'e'.repeat(64)}`;
    const document = createNotebookRichDocument({
      now: () => new Date('2026-07-14T00:00:00.000Z'),
    });
    document.content = [{
      type: 'paragraph',
      id: 'paragraph.direct',
      format: { leftIndentPt: 108 },
    }, {
      type: 'imageFigure',
      id: 'image.direct',
      assetId: imageAssetId,
      displayAspectRatio: 1.25,
      rotation: 137,
    }, {
      type: 'videoFigure',
      id: 'video.direct',
      assetId: videoAssetId,
      title: 'Direct media',
      description: '',
      alignment: 'left',
      placement: 'square-left',
      displayAspectRatio: 16 / 9,
    }];
    const record = createNotebookStoredRecordV1(document, {
      libraryId: 'library.v10-geometry',
      savedAt: '2026-07-14T00:01:00.000Z',
    });

    expect(isNotebookStoredRecordV1(record)).toBe(true);
    expect(record.assetIds).toEqual([imageAssetId, videoAssetId]);
    expect(record.document.content).toEqual(document.content);
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

  it('migrates V6 through V9 records and snapshots losslessly into the V11 envelope', () => {
    const current = createNotebookStoredRecordV1(createNotebookRichDocument({
      now: () => new Date('2026-07-14T00:00:00.000Z'),
      title: 'Legacy document',
    }), {
      libraryId: 'library.legacy',
      revision: 2,
      savedAt: '2026-07-14T00:01:00.000Z',
    });
    const legacy = JSON.parse(JSON.stringify(current)) as Record<string, unknown>;
    const legacyDocument = legacy.document as Record<string, unknown>;
    legacyDocument.version = 6;
    delete legacyDocument.pageSetup;
    delete legacyDocument.headerFooter;
    const migrated = migrateNotebookStoredRecordV1(legacy);
    expect(migrated?.document.version).toBe(11);
    expect(migrated?.document.content).toEqual(
      (legacy.document as { content: unknown }).content,
    );

    const legacySnapshot = {
      version: 1,
      snapshotId: 'snapshot.legacy.2',
      libraryId: current.libraryId,
      revision: current.revision,
      createdAt: '2026-07-14T00:02:00.000Z',
      reason: 'periodic',
      record: legacy,
    };
    const migratedSnapshot = migrateNotebookVersionSnapshotV1(legacySnapshot);
    expect(migratedSnapshot?.record.document.version).toBe(11);
    expect(migratedSnapshot?.record.document.content).toEqual(
      (legacy.document as { content: unknown }).content,
    );

    const version7 = structuredClone(legacy);
    (version7.document as Record<string, unknown>).version = 7;
    const migratedV7 = migrateNotebookStoredRecordV1(version7);
    expect(migratedV7?.document.version).toBe(11);
    expect(migratedV7?.document.content).toEqual(
      (version7.document as { content: unknown }).content,
    );

    const version9 = structuredClone(current) as unknown as Record<string, unknown>;
    (version9.document as Record<string, unknown>).version = 9;
    (version9.document as Record<string, unknown>).headerFooter = {
      headerText: '', footerText: '', differentFirstPage: false,
      pageNumbering: { enabled: false, position: 'center', startAt: 1 },
    };
    const migratedV9 = migrateNotebookStoredRecordV1(version9);
    expect(migratedV9?.document.version).toBe(11);
    expect(migratedV9?.document.content).toEqual(
      (version9.document as { content: unknown }).content,
    );
  });
});
