export type NotebookPaginationBlockKind =
  | 'prose'
  | 'heading'
  | 'section'
  | 'container'
  | 'math'
  | 'media'
  | 'pageBreak';

export type NotebookPaginationBlock = {
  id: string;
  kind: NotebookPaginationBlockKind;
  heightPt: number;
};

export type NotebookPaginationFragment = {
  id: string;
  page: number;
  offsetPt: number;
  heightPt: number;
  scale: number;
  fragment: number;
};

export type NotebookPaginationResult = {
  pageCount: number;
  fragments: NotebookPaginationFragment[];
};

const EPSILON = 0.01;

function isSplittable(kind: NotebookPaginationBlockKind) {
  return kind === 'section' || kind === 'container';
}

function isAtomic(kind: NotebookPaginationBlockKind) {
  return kind === 'math' || kind === 'media';
}

/** Deterministic page placement over measured block heights; derived fragments are never persisted. */
export function paginateNotebookBlocks(
  blocks: readonly NotebookPaginationBlock[],
  usableHeightPt: number,
): NotebookPaginationResult {
  if (!Number.isFinite(usableHeightPt) || usableHeightPt <= 0) {
    throw new TypeError('Notebook usable page height must be positive.');
  }
  const fragments: NotebookPaginationFragment[] = [];
  let page = 1;
  let offset = 0;

  function nextPage() {
    page += 1;
    offset = 0;
  }

  blocks.forEach((block, index) => {
    if (!Number.isFinite(block.heightPt) || block.heightPt < 0) {
      throw new TypeError('Notebook block height must be finite and non-negative.');
    }
    if (block.kind === 'pageBreak') {
      nextPage();
      return;
    }

    const next = blocks[index + 1];
    const keepWithNextHeight = block.kind === 'heading'
      && next
      && next.kind !== 'pageBreak'
      ? block.heightPt + Math.min(next.heightPt, usableHeightPt)
      : block.heightPt;
    if (offset > 0 && keepWithNextHeight > usableHeightPt - offset) nextPage();

    if (isAtomic(block.kind) && block.heightPt > usableHeightPt) {
      const scale = usableHeightPt / block.heightPt;
      fragments.push({
        id: block.id,
        page,
        offsetPt: offset,
        heightPt: usableHeightPt,
        scale,
        fragment: 0,
      });
      nextPage();
      return;
    }

    if (isSplittable(block.kind) && block.heightPt > usableHeightPt - offset) {
      let remaining = block.heightPt;
      let fragment = 0;
      while (remaining > EPSILON) {
        const available = usableHeightPt - offset;
        if (available <= EPSILON) {
          nextPage();
          continue;
        }
        const height = Math.min(remaining, available);
        fragments.push({
          id: block.id,
          page,
          offsetPt: offset,
          heightPt: height,
          scale: 1,
          fragment,
        });
        remaining -= height;
        offset += height;
        fragment += 1;
        if (remaining > EPSILON) nextPage();
      }
      return;
    }

    if (offset > 0 && block.heightPt > usableHeightPt - offset) nextPage();
    fragments.push({
      id: block.id,
      page,
      offsetPt: offset,
      heightPt: block.heightPt,
      scale: 1,
      fragment: 0,
    });
    offset += block.heightPt;
    if (offset >= usableHeightPt - EPSILON && index < blocks.length - 1) nextPage();
  });

  const lastUsedPage = fragments.at(-1)?.page ?? 1;
  return { pageCount: Math.max(1, page, lastUsedPage), fragments };
}
