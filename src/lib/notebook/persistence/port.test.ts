import { describe, expect, it } from 'vitest';

import { createNotebookRichDocument } from '../document/model';
import { createInMemoryNotebookPersistencePort } from './port';

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
    await expect(port.save({ version: 1 } as never)).rejects.toThrow(/version 2/);
  });
});
