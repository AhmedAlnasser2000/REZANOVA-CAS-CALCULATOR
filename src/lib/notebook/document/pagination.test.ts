import { describe, expect, it } from 'vitest';

import { paginateNotebookBlocks } from './pagination';

describe('Notebook derived pagination', () => {
  it('keeps headings with the next block and honors explicit breaks', () => {
    const result = paginateNotebookBlocks([
      { id: 'prose.1', kind: 'prose', heightPt: 70 },
      { id: 'heading.1', kind: 'heading', heightPt: 20 },
      { id: 'prose.2', kind: 'prose', heightPt: 40 },
      { id: 'break.1', kind: 'pageBreak', heightPt: 0 },
      { id: 'prose.3', kind: 'prose', heightPt: 20 },
    ], 100);
    expect(result.fragments.find((item) => item.id === 'heading.1')?.page).toBe(2);
    expect(result.fragments.find((item) => item.id === 'prose.2')?.page).toBe(2);
    expect(result.fragments.find((item) => item.id === 'prose.3')?.page).toBe(3);
    expect(result.pageCount).toBe(3);
  });

  it('splits structured blocks and proportionally fits oversized atomic objects', () => {
    const result = paginateNotebookBlocks([
      { id: 'section.1', kind: 'section', heightPt: 230 },
      { id: 'media.1', kind: 'media', heightPt: 200 },
    ], 100);
    expect(result.fragments.filter((item) => item.id === 'section.1')).toHaveLength(3);
    expect(result.fragments.filter((item) => item.id === 'section.1').map((item) => item.fragment))
      .toEqual([0, 1, 2]);
    expect(result.fragments.find((item) => item.id === 'media.1')).toMatchObject({
      heightPt: 100,
      scale: 0.5,
    });
  });

  it('preserves an intentional blank first page', () => {
    const result = paginateNotebookBlocks([
      { id: 'break.first', kind: 'pageBreak', heightPt: 0 },
      { id: 'prose.after', kind: 'prose', heightPt: 20 },
    ], 100);
    expect(result.fragments[0]).toMatchObject({ id: 'prose.after', page: 2 });
    expect(result.pageCount).toBe(2);
  });
});
