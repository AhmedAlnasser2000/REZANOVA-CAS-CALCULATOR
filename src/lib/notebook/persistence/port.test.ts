import { describe, expect, it } from 'vitest';

import { createNotebookRichDocument } from '../document/model';
import { createNotebookStoredRecordV1 } from './contracts';
import {
  createInMemoryNotebookAssetPort,
  createInMemoryNotebookLibraryPort,
  createInMemoryNotebookPersistencePort,
} from './port';

describe('Notebook persistence port contract', () => {
  it('lists, saves, loads, and deletes isolated document snapshots', async () => {
    const document = createNotebookRichDocument({
      idPrefix: 'persistence',
      now: () => new Date('2026-07-11T12:00:00.000Z'),
      title: 'Local Contract',
    });
    const port = createInMemoryNotebookPersistencePort();

    await port.save(document);
    const loaded = await port.load(document.id);
    expect(loaded).toEqual(document);
    expect(await port.list()).toEqual([expect.objectContaining({
      id: document.id,
      title: 'Local Contract',
      blockCount: 1,
    })]);

    if (!loaded) {
      throw new Error('missing persisted document');
    }
    loaded.title = 'Mutated copy';
    expect((await port.load(document.id))?.title).toBe('Local Contract');

    await port.delete(document.id);
    expect(await port.load(document.id)).toBeNull();
  });

  it('rejects non-versioned values at the adapter boundary', async () => {
    const port = createInMemoryNotebookPersistencePort();
    await expect(port.save({ version: 1 } as never)).rejects.toThrow(/valid rich documents/);
  });

  it('stores isolated versioned library records and rejects revision races', async () => {
    const document = createNotebookRichDocument({
      idPrefix: 'library',
      now: () => new Date('2026-07-14T00:00:00.000Z'),
      title: 'Durable record',
    });
    const first = createNotebookStoredRecordV1(document, {
      libraryId: 'library.record.1',
      savedAt: '2026-07-14T00:00:00.000Z',
    });
    const port = createInMemoryNotebookLibraryPort();
    await port.save(first, { expectedRevision: null });
    expect(await port.list()).toEqual([expect.objectContaining({
      libraryId: 'library.record.1',
      revision: 1,
      title: 'Durable record',
      wordCount: 0,
    })]);
    await expect(port.save({ ...first, revision: 2 }, { expectedRevision: 0 }))
      .rejects.toThrow(/conflict/);

    const second = await port.save({
      ...first,
      revision: 2,
      savedAt: '2026-07-14T00:00:01.000Z',
      document: { ...first.document, title: 'Revision 2' },
    }, { expectedRevision: 1 });
    second.document.title = 'Mutated copy';
    expect((await port.load(first.libraryId))?.document.title).toBe('Revision 2');
  });

  it('deduplicates assets by SHA-256 while returning isolated bytes', async () => {
    const port = createInMemoryNotebookAssetPort();
    const bytes = new TextEncoder().encode('<svg/>');
    const first = await port.put(bytes, 'image/svg+xml', '2026-07-14T00:00:00.000Z');
    const second = await port.put(bytes, 'image/svg+xml', '2026-07-14T00:00:01.000Z');
    expect(second.id).toBe(first.id);
    expect(second.id).toMatch(/^sha256:[0-9a-f]{64}$/);
    const loaded = await port.load(first.id);
    expect(loaded?.bytes).toEqual(bytes);
    loaded?.bytes.fill(0);
    expect((await port.load(first.id))?.bytes).toEqual(bytes);
  });
});
