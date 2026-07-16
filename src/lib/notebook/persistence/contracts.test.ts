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
  requireDurableNotebookStoredRecordV1,
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
    expect(record.document.version).toBe(14);
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
    }];
    const record = createNotebookStoredRecordV1(document, {
      libraryId: 'library.v10-geometry',
      savedAt: '2026-07-14T00:01:00.000Z',
    });

    expect(isNotebookStoredRecordV1(record)).toBe(true);
    expect(record.assetIds).toEqual([imageAssetId]);
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

  it('migrates V6 through V12 records and snapshots losslessly into the current envelope', () => {
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
    expect(migrated?.document.version).toBe(14);
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
    expect(migratedSnapshot?.record.document.version).toBe(14);
    expect(migratedSnapshot?.record.document.content).toEqual(
      (legacy.document as { content: unknown }).content,
    );

    const version7 = structuredClone(legacy);
    (version7.document as Record<string, unknown>).version = 7;
    const migratedV7 = migrateNotebookStoredRecordV1(version7);
    expect(migratedV7?.document.version).toBe(14);
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
    expect(migratedV9?.document.version).toBe(14);
    expect(migratedV9?.document.content).toEqual(
      (version9.document as { content: unknown }).content,
    );

    const version10 = structuredClone(version9);
    (version10.document as Record<string, unknown>).version = 10;
    const migratedV10 = requireDurableNotebookStoredRecordV1(version10);
    expect(migratedV10.document.version).toBe(14);
    expect(migratedV10.document.headerFooter.pageNumberStart).toBe(1);

    const version11 = structuredClone(current) as unknown as Record<string, unknown>;
    (version11.document as Record<string, unknown>).version = 11;
    const migratedV11 = requireDurableNotebookStoredRecordV1(version11);
    expect(migratedV11.document.version).toBe(14);
    expect(migratedV11.document.content).toEqual(current.document.content);

    const version12 = structuredClone(current) as unknown as Record<string, unknown>;
    (version12.document as Record<string, unknown>).version = 12;
    const migratedV12 = requireDurableNotebookStoredRecordV1(version12);
    expect(migratedV12.document.version).toBe(14);
    expect(migratedV12.document.content).toEqual(current.document.content);

    const beforeUpgrade = createNotebookVersionSnapshotV1(migratedV10, {
      reason: 'before-schema-upgrade',
      snapshotId: 'snapshot.schema-upgrade.contract',
    });
    expect(isNotebookVersionSnapshotV1(beforeUpgrade)).toBe(true);
  });

  it('rejects durable pre-V6 and future schemas with specific errors', () => {
    const record = createNotebookStoredRecordV1(createNotebookRichDocument(), {
      libraryId: 'library.schema-errors',
    });
    const early = structuredClone(record) as unknown as Record<string, unknown>;
    (early.document as Record<string, unknown>).version = 5;
    expect(() => requireDurableNotebookStoredRecordV1(early)).toThrow(/SCHEMA_PRE_V6/);
    const future = structuredClone(record) as unknown as Record<string, unknown>;
    (future.document as Record<string, unknown>).version = 15;
    expect(() => requireDurableNotebookStoredRecordV1(future)).toThrow(/SCHEMA_NEWER/);
  });
});
