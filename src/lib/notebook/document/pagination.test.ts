import { describe, expect, it } from 'vitest';

import { notebookPageGeometry } from './page-layout';
import {
  clampNotebookFloatingPlacementToPageSetup,
  paginateNotebookBlocks,
} from './pagination';

const PAGE_SETUP = {
  paperSize: 'a4' as const,
  orientation: 'portrait' as const,
  marginsPt: { top: 72, right: 72, bottom: 72, left: 72 },
};

function floatingPlacement(
  overrides: Partial<Extract<NonNullable<Parameters<typeof paginateNotebookBlocks>[0][number]['objectPlacement']>, { mode: 'floating' }>> = {},
) {
  return {
    mode: 'floating' as const,
    anchor: { kind: 'page' as const, pageNumber: 1 },
    horizontalReference: 'margins' as const,
    verticalReference: 'margins' as const,
    xPt: 0,
    yPt: 0,
    widthPt: 120,
    wrap: 'in-front' as const,
    textDistancePt: { top: 0, right: 0, bottom: 0, left: 0 },
    zOrder: 0,
    ...overrides,
  };
}

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
    expect(result.fragments.find((item) => item.id === 'break.1'))
      .toMatchObject({ page: 3, heightPt: 0 });
    expect(result.fragments.find((item) => item.id === 'prose.3')?.page).toBe(3);
    expect(result.pageCount).toBe(3);
  });

  it('retains deterministic markers for consecutive explicit breaks', () => {
    const result = paginateNotebookBlocks([
      { id: 'break.1', kind: 'pageBreak', heightPt: 0 },
      { id: 'break.2', kind: 'pageBreak', heightPt: 0 },
      { id: 'prose.after', kind: 'prose', heightPt: 20 },
    ], 600);
    expect(result.fragments.map(({ id, page }) => ({ id, page }))).toEqual([
      { id: 'break.1', page: 2 },
      { id: 'break.2', page: 3 },
      { id: 'prose.after', page: 3 },
    ]);
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
    expect(result.fragments.find((item) => item.id === 'break.first'))
      .toMatchObject({ page: 2, heightPt: 0 });
    expect(result.fragments.find((item) => item.id === 'prose.after'))
      .toMatchObject({ page: 2 });
    expect(result.pageCount).toBe(2);
  });

  it('preserves fixed pages and clamps rotated bounds outside running-matter bands', () => {
    const geometry = notebookPageGeometry(PAGE_SETUP);
    const result = paginateNotebookBlocks([{
      id: 'prose.1', kind: 'prose', heightPt: 20,
    }, {
      id: 'image.fixed',
      kind: 'media',
      heightPt: 100,
      aspectRatio: 2,
      rotationDeg: 90,
      objectPlacement: floatingPlacement({
        anchor: { kind: 'page', pageNumber: 4 },
        horizontalReference: 'page',
        verticalReference: 'page',
        xPt: 1000,
        yPt: -300,
        widthPt: 200,
      }),
    }], geometry.usableHeight, { pageSetup: PAGE_SETUP });
    const fixed = result.floating[0]!;
    expect(result.pageCount).toBe(4);
    expect(fixed.page).toBe(4);
    expect(fixed.boundsYPt).toBe(PAGE_SETUP.marginsPt.top);
    expect(fixed.boundsXPt + fixed.boundsWidthPt).toBeLessThanOrEqual(geometry.width);
    expect(fixed.boundsYPt + fixed.boundsHeightPt)
      .toBeLessThanOrEqual(geometry.height - PAGE_SETUP.marginsPt.bottom);
  });

  it('moves paragraph-anchored objects with their durable top-level block', () => {
    const geometry = notebookPageGeometry(PAGE_SETUP);
    const result = paginateNotebookBlocks([{
      id: 'prose.full', kind: 'prose', heightPt: geometry.usableHeight,
    }, {
      id: 'section.anchor', kind: 'section', heightPt: 80,
    }, {
      id: 'equation.float',
      kind: 'math',
      heightPt: 50,
      objectPlacement: floatingPlacement({
        anchor: { kind: 'paragraph', nodeId: 'paragraph.anchor' },
      }),
    }], geometry.usableHeight, {
      pageSetup: PAGE_SETUP,
      paragraphAnchorBlockIds: { 'paragraph.anchor': 'section.anchor' },
    });
    expect(result.fragments.find((fragment) => fragment.id === 'section.anchor')?.page).toBe(2);
    expect(result.floating[0]?.page).toBe(2);
  });

  it('reserves top-and-bottom bands and applies square-wrap text insets', () => {
    const geometry = notebookPageGeometry(PAGE_SETUP);
    const result = paginateNotebookBlocks([{
      id: 'prose.top', kind: 'prose', heightPt: 24,
    }, {
      id: 'media.top-bottom',
      kind: 'media',
      heightPt: 50,
      aspectRatio: 2,
      objectPlacement: floatingPlacement({
        widthPt: 100,
        wrap: 'top-and-bottom',
        textDistancePt: { top: 0, right: 0, bottom: 10, left: 0 },
        zOrder: 0,
      }),
    }, {
      id: 'media.square',
      kind: 'media',
      heightPt: 50,
      aspectRatio: 2,
      objectPlacement: floatingPlacement({
        xPt: 0,
        yPt: 80,
        widthPt: 100,
        wrap: 'square',
        textDistancePt: { top: 0, right: 12, bottom: 0, left: 0 },
        zOrder: 1,
      }),
    }, {
      id: 'prose.square', kind: 'prose', heightPt: 100,
    }], geometry.usableHeight, { pageSetup: PAGE_SETUP });
    expect(result.fragments.find((fragment) => fragment.id === 'prose.top')?.offsetPt).toBe(60);
    expect(result.fragments.find((fragment) => fragment.id === 'prose.square')?.insetLeftPt)
      .toBe(112);
  });

  it('keeps structured-frame height automatic when its floating width changes', () => {
    const geometry = notebookPageGeometry(PAGE_SETUP);
    const result = paginateNotebookBlocks([{
      id: 'container.auto-height',
      kind: 'container',
      heightPt: 120,
      measuredWidthPt: 500,
      objectPlacement: floatingPlacement({ widthPt: 100 }),
    }], geometry.usableHeight, { pageSetup: PAGE_SETUP });
    expect(result.floating[0]).toMatchObject({ widthPt: 100, heightPt: 120 });
  });

  it('falls back oversized structured floats to editable flow', () => {
    const geometry = notebookPageGeometry(PAGE_SETUP);
    const result = paginateNotebookBlocks([{
      id: 'section.large',
      kind: 'section',
      heightPt: geometry.usableHeight + 1,
      objectPlacement: floatingPlacement(),
    }], geometry.usableHeight, { pageSetup: PAGE_SETUP });
    expect(result.returnedToFlowIds).toEqual(['section.large']);
    expect(result.floating).toHaveLength(0);
    expect(result.fragments.some((fragment) => fragment.id === 'section.large')).toBe(true);
  });

  it('keeps authored floating objects in ordered flow when page geometry is unavailable', () => {
    const result = paginateNotebookBlocks([{
      id: 'image.draft-placeholder',
      kind: 'media',
      heightPt: 80,
      objectPlacement: floatingPlacement({
        anchor: { kind: 'page', pageNumber: 5 },
      }),
    }], 600);
    expect(result.fragments).toEqual([expect.objectContaining({
      id: 'image.draft-placeholder',
      page: 1,
    })]);
    expect(result.pageCount).toBe(1);
    expect(result.floating).toEqual([]);
  });

  it('clamps authored geometry after a page setup change without changing references', () => {
    const placement = floatingPlacement({
      horizontalReference: 'margins',
      verticalReference: 'page',
      xPt: 900,
      yPt: -20,
      widthPt: 900,
    });
    const clamped = clampNotebookFloatingPlacementToPageSetup(
      placement,
      PAGE_SETUP,
      120,
      15,
    );
    expect(clamped).toMatchObject({
      horizontalReference: 'margins',
      verticalReference: 'page',
      widthPt: notebookPageGeometry(PAGE_SETUP).width,
    });
    const layout = paginateNotebookBlocks([{
      id: 'image.clamped',
      kind: 'media',
      heightPt: 120,
      objectPlacement: clamped,
    }], notebookPageGeometry(PAGE_SETUP).usableHeight, { pageSetup: PAGE_SETUP });
    expect(layout.floating[0]?.boundsYPt).toBeGreaterThanOrEqual(PAGE_SETUP.marginsPt.top);
    expect((layout.floating[0]?.boundsXPt ?? 0) + (layout.floating[0]?.boundsWidthPt ?? 0))
      .toBeLessThanOrEqual(notebookPageGeometry(PAGE_SETUP).width);
  });
});
