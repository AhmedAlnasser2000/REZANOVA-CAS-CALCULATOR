import { describe, expect, it } from 'vitest';

import { createNotebookRichDocument } from '../document/model';
import type { NotebookRichDocument } from '../document/types';
import {
  createNotebookStoredRecordV1,
  type NotebookStoredRecordV1,
} from '../persistence/contracts';
import {
  createInMemoryNotebookAssetPort,
  type NotebookAssetPort,
} from '../persistence/port';
import { createNotebookPublicationJob } from './job';
import { buildNotebookPublicationProjection } from './projection';
import type { NotebookPublicationLayoutV1 } from './types';

const NOW = '2026-07-14T10:00:00.000Z';

type Fixture = {
  assets: NotebookAssetPort;
  ids: { image: string };
  layout: NotebookPublicationLayoutV1;
  record: NotebookStoredRecordV1;
};

async function fixture(): Promise<Fixture> {
  const assets = createInMemoryNotebookAssetPort();
  const image = await assets.put(new Uint8Array([1, 2, 3]), 'image/png', NOW);
  const base = createNotebookRichDocument({
    idPrefix: 'publication',
    now: () => new Date(NOW),
    title: 'Frozen limits',
  });
  const document: NotebookRichDocument = {
    ...base,
    selectedNodeId: null,
    content: [
      {
        type: 'paragraph',
        id: 'intro',
        format: { leftIndentPt: 72 },
        content: [{ type: 'text', text: 'Introduction' }],
      },
      {
        type: 'section',
        id: 'section-a',
        title: 'Limits',
        content: [{
          type: 'imageFigure',
          id: 'figure-a',
          assetId: image.id,
          altText: 'Limit graph',
          caption: 'A finite limit',
          placement: 'square-left',
          displayAspectRatio: 1.25,
          rotation: 137,
        }],
      },
      {
        type: 'section',
        id: 'section-b',
        title: 'Worked lesson',
        content: [{ type: 'paragraph', id: 'lesson-prose', content: [{ type: 'text', text: 'A short explanation.' }] }],
      },
    ],
  };
  const record = createNotebookStoredRecordV1(document, {
    libraryId: 'library.publication',
    revision: 7,
    savedAt: NOW,
  });
  const layout: NotebookPublicationLayoutV1 = {
    pageCount: 2,
    fragments: [
      { id: 'intro', page: 1, offsetPt: 0, heightPt: 30, scale: 1, fragment: 0 },
      { id: 'section-a', page: 1, offsetPt: 30, heightPt: 300, scale: 1, fragment: 0 },
      { id: 'section-b', page: 2, offsetPt: 0, heightPt: 280, scale: 1, fragment: 0 },
    ],
  };
  return {
    assets,
    ids: { image: image.id },
    layout,
    record,
  };
}

describe('Notebook publication projection', () => {
  it('builds an immutable PDF projection with image assets and compatibility evidence', async () => {
    const source = await fixture();
    const projection = await buildNotebookPublicationProjection({
      assetPort: source.assets,
      compatibilityFindings: [
        { kind: 'equation-fallback', message: 'Use a visual fallback.' },
        { kind: 'font-substitution', message: 'Use the target serif font.' },
      ],
      createdAt: NOW,
      layout: source.layout,
      record: source.record,
      request: { format: 'pdf', scope: { kind: 'document' } },
    });

    expect(projection.source).toMatchObject({ revision: 7, libraryId: 'library.publication' });
    expect(projection.assets.map((asset) => asset.metadata.id)).toEqual([
      source.ids.image,
    ].sort());
    expect(projection.compatibility.summary).toEqual({
      equationFallbacks: 1,
      fontSubstitutions: 1,
      layoutApproximations: 0,
    });
    expect(Object.isFrozen(projection)).toBe(true);
    expect(Object.isFrozen(projection.content[1])).toBe(true);
    const intro = projection.content.find((node) => node.id === 'intro');
    const figure = projection.content.find((node) => node.id === 'section-a');
    const lesson = projection.content.find((node) => node.id === 'section-b');
    expect(intro).toMatchObject({ type: 'paragraph', format: { leftIndentPt: 72 } });
    expect(figure).toMatchObject({
      type: 'section',
      content: [{ displayAspectRatio: 1.25, rotation: 137, type: 'imageFigure' }],
    });
    expect(lesson).toMatchObject({
      type: 'section',
      content: [{ type: 'paragraph' }],
    });
    expect((await projection.assets[0].blob.arrayBuffer()).byteLength).toBe(
      projection.assets[0].metadata.byteLength,
    );
  });

  it('selects top-level Section subtrees in document order', async () => {
    const source = await fixture();
    const projection = await buildNotebookPublicationProjection({
      assetPort: source.assets,
      compatibilityFindings: [
        { kind: 'layout-approximation', nodeId: 'figure-a', message: 'Selected image approximation.' },
        { kind: 'layout-approximation', nodeId: 'intro', message: 'Unselected introduction approximation.' },
      ],
      layout: source.layout,
      record: source.record,
      request: {
        format: 'docx',
        scope: { kind: 'sections', sectionIds: ['section-b', 'section-a'] },
      },
    });

    expect(projection.content.map((node) => node.id)).toEqual(['section-a', 'section-b']);
    expect(projection.content.every((node) => node.type === 'section')).toBe(true);
    expect(projection.compatibility.findings).toContainEqual(expect.objectContaining({
      message: 'Selected image approximation.',
    }));
    expect(projection.compatibility.findings).not.toContainEqual(expect.objectContaining({
      message: 'Unselected introduction approximation.',
    }));
  });

  it('keeps the frozen source layout for an exact PDF page range', async () => {
    const source = await fixture();
    const projection = await buildNotebookPublicationProjection({
      assetPort: source.assets,
      layout: source.layout,
      record: source.record,
      request: { format: 'pdf', scope: { kind: 'page-range', fromPage: 2, toPage: 2 } },
    });

    expect(projection.content).toHaveLength(3);
    expect(projection.sourceLayout).toEqual(source.layout);
    expect(projection.request.scope).toEqual({ kind: 'page-range', fromPage: 2, toPage: 2 });
  });

  it('rejects invalid ranges, non-PDF page scopes, and non-top-level Sections', async () => {
    const source = await fixture();
    await expect(buildNotebookPublicationProjection({
      assetPort: source.assets,
      layout: source.layout,
      record: source.record,
      request: { format: 'docx', scope: { kind: 'page-range', fromPage: 1, toPage: 1 } },
    })).rejects.toThrow('Physical page ranges');
    await expect(buildNotebookPublicationProjection({
      assetPort: source.assets,
      layout: source.layout,
      record: source.record,
      request: { format: 'pdf', scope: { kind: 'page-range', fromPage: 1, toPage: 3 } },
    })).rejects.toThrow('page range');
    await expect(buildNotebookPublicationProjection({
      assetPort: source.assets,
      layout: source.layout,
      record: source.record,
      request: { format: 'web', scope: { kind: 'sections', sectionIds: ['figure-a'] } },
    })).rejects.toThrow('top-level Sections');
  });

  it('freezes the current revision before a low-priority job runs', async () => {
    const source = await fixture();
    let schedules = 0;
    const job = createNotebookPublicationJob({
      assetPort: source.assets,
      createdAt: NOW,
      jobId: 'notebook.export.test',
      layout: source.layout,
      record: source.record,
      request: { format: 'pdf', scope: { kind: 'document' } },
      scheduleLowPriority: async () => { schedules += 1; },
    });
    source.record.document.title = 'Mutated after queueing';
    source.record.revision = 99;

    expect(job.status).toBe('queued');
    const projection = await job.run();
    expect(job.status).toBe('succeeded');
    expect(job.sourceRevision).toBe(7);
    expect(projection.title).toBe('Frozen limits');
    expect(projection.source.revision).toBe(7);
    expect(schedules).toBeGreaterThanOrEqual(2);
  });

  it('cancels independently of the Notebook page lifecycle', async () => {
    const source = await fixture();
    const job = createNotebookPublicationJob({
      assetPort: source.assets,
      layout: source.layout,
      record: source.record,
      request: { format: 'web', scope: { kind: 'document' } },
    });
    job.cancel();
    await expect(job.run()).rejects.toMatchObject({ name: 'AbortError' });
    expect(job.status).toBe('cancelled');
  });

  it('fails without mutating the source when a declared asset is unavailable', async () => {
    const source = await fixture();
    const missingPort: NotebookAssetPort = {
      ...source.assets,
      async load() { return null; },
    };
    const before = JSON.stringify(source.record);
    const job = createNotebookPublicationJob({
      assetPort: missingPort,
      layout: source.layout,
      record: source.record,
      request: { format: 'pdf', scope: { kind: 'document' } },
    });

    await expect(job.run()).rejects.toThrow('unavailable or invalid');
    expect(job.status).toBe('failed');
    expect(JSON.stringify(source.record)).toBe(before);
  });
});
