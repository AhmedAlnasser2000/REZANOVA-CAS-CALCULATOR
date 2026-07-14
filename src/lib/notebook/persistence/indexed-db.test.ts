import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';

import { createNotebookRichDocument } from '../document/model';
import { createNotebookStoredRecordV1 } from './contracts';
import { createIndexedDbNotebookPorts } from './indexed-db';

function createPorts(name: string) {
  return createIndexedDbNotebookPorts({
    databaseName: `notebook-persistence-${name}`,
    indexedDb: new IDBFactory(),
  });
}

function createRecord() {
  const document = createNotebookRichDocument({
    idPrefix: 'indexed-db',
    now: () => new Date('2026-07-14T00:00:00.000Z'),
    title: 'Browser record',
  });
  return createNotebookStoredRecordV1(document, {
    libraryId: 'browser.record.1',
    savedAt: '2026-07-14T00:00:00.000Z',
  });
}

describe('IndexedDB Notebook persistence ports', () => {
  it('persists isolated records and enforces revision ownership', async () => {
    const ports = createPorts('records');
    const first = createRecord();

    await ports.library.save(first, { expectedRevision: null });
    expect(await ports.library.list()).toEqual([expect.objectContaining({
      libraryId: first.libraryId,
      revision: 1,
      title: 'Browser record',
    })]);

    const loaded = await ports.library.load(first.libraryId);
    expect(loaded).toEqual(first);
    loaded!.document.title = 'Mutated copy';
    expect((await ports.library.load(first.libraryId))?.document.title).toBe('Browser record');

    await expect(ports.library.save({ ...first, revision: 2 }, { expectedRevision: 0 }))
      .rejects.toThrow(/conflict/);
    await ports.library.save({
      ...first,
      revision: 2,
      savedAt: '2026-07-14T00:00:01.000Z',
    }, { expectedRevision: 1 });
    await expect(ports.library.save({ ...first, revision: 2 }))
      .rejects.toThrow(/advance/);

    await ports.library.delete(first.libraryId);
    expect(await ports.library.load(first.libraryId)).toBeNull();
  });

  it('deduplicates content-addressed assets and isolates loaded bytes', async () => {
    const ports = createPorts('assets');
    const bytes = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>');

    const first = await ports.asset.put(
      bytes,
      'image/svg+xml',
      '2026-07-14T00:00:00.000Z',
    );
    const second = await ports.asset.put(
      bytes,
      'image/svg+xml',
      '2026-07-14T00:00:01.000Z',
    );
    expect(second.id).toBe(first.id);
    const loaded = await ports.asset.load(first.id);
    expect(loaded?.bytes).toEqual(bytes);
    loaded!.bytes.fill(0);
    expect((await ports.asset.load(first.id))?.bytes).toEqual(bytes);

    await expect(ports.asset.put(bytes, 'video/mp4'))
      .rejects.toThrow(/different media type/);
    await ports.asset.delete(first.id);
    expect(await ports.asset.load(first.id)).toBeNull();
  });
});
