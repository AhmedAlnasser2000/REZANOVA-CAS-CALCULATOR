import { describe, expect, it } from 'vitest';

import { createNotebookRichDocument } from '../document/model';
import { createNotebookStoredRecordV1 } from './contracts';
import {
  createInMemoryNotebookLibraryPort,
  type NotebookLibraryPort,
} from './port';
import {
  NOTEBOOK_WARM_RECORD_MAX_BYTES,
  createNotebookLibraryService,
} from './service';

function createRecord(libraryId: string, text = '') {
  const document = createNotebookRichDocument({
    idPrefix: libraryId,
    now: () => new Date('2026-07-14T00:00:00.000Z'),
    title: libraryId,
  });
  if (text) {
    document.content[0] = {
      type: 'paragraph',
      id: `${libraryId}.paragraph`,
      content: [{ type: 'text', text }],
    };
  }
  return createNotebookStoredRecordV1(document, {
    libraryId,
    savedAt: '2026-07-14T00:00:00.000Z',
  });
}

describe('Notebook library hydration service', () => {
  it('keeps at most one small asset-free record warm', async () => {
    const first = createRecord('library.warm.1', 'First');
    const second = createRecord('library.warm.2', 'Second');
    const library = createInMemoryNotebookLibraryPort([first, second]);
    const service = createNotebookLibraryService({ library });

    service.rememberWarmRecord(first);
    await library.delete(first.libraryId);
    expect((await service.loadRecord(first.libraryId))?.document.title).toBe(first.libraryId);

    service.rememberWarmRecord(second);
    await library.delete(second.libraryId);
    expect(await service.loadRecord(first.libraryId)).toBeNull();
    expect((await service.loadRecord(second.libraryId))?.document.title).toBe(second.libraryId);
  });

  it('evicts media-bearing and oversized records instead of hydrating inactive tabs', async () => {
    const service = createNotebookLibraryService();
    const media = {
      ...createRecord('library.media'),
      assetIds: [`sha256:${'a'.repeat(64)}`],
    };
    service.rememberWarmRecord(media);
    expect(await service.loadRecord(media.libraryId)).toBeNull();

    const oversized = createRecord(
      'library.oversized',
      'x'.repeat(NOTEBOOK_WARM_RECORD_MAX_BYTES),
    );
    service.rememberWarmRecord(oversized);
    expect(await service.loadRecord(oversized.libraryId)).toBeNull();
  });

  it('keeps an unsaved warm revision recoverable across an in-flight save failure', async () => {
    const saved = createRecord('library.pending', 'Saved');
    const base = createInMemoryNotebookLibraryPort([saved]);
    let failWrites = true;
    const library: NotebookLibraryPort = {
      ...base,
      async save(record, options) {
        if (failWrites) throw new Error('Simulated save failure.');
        return base.save(record, options);
      },
    };
    const service = createNotebookLibraryService({ library });
    const unsaved = {
      ...saved,
      document: { ...saved.document, title: 'Unsaved warm revision' },
    };
    service.rememberWarmRecord(unsaved, true);
    const revisionTwo = {
      ...unsaved,
      revision: 2,
      savedAt: '2026-07-14T00:01:00.000Z',
    };

    await expect(service.saveRecord(revisionTwo, { expectedRevision: 1 }))
      .rejects.toThrow('Simulated save failure.');
    expect((await service.loadRecord(saved.libraryId))?.document.title)
      .toBe('Unsaved warm revision');
    expect(service.isWarmRecordDirty(saved.libraryId)).toBe(true);

    failWrites = false;
    await service.saveRecord(revisionTwo, { expectedRevision: 1 });
    expect((await service.loadRecord(saved.libraryId))?.revision).toBe(2);
    expect(service.isWarmRecordDirty(saved.libraryId)).toBe(false);
  });
});
