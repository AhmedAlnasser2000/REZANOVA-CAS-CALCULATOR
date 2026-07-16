import {
  NOTEBOOK_FLOATING_OBJECT_MIN_WIDTH_PT,
  type NotebookObjectPlacement,
  type NotebookPageMarginsPt,
  type NotebookPageSetup,
} from './types';
import {
  NOTEBOOK_MIN_WRAPPED_TEXT_COLUMN_PT,
  notebookPageGeometry,
} from './page-layout';

export type NotebookPaginationBlockKind =
  | 'prose'
  | 'heading'
  | 'section'
  | 'container'
  | 'math'
  | 'media'
  | 'evidence'
  | 'divider'
  | 'pageBreak';

export type NotebookPaginationBlock = {
  id: string;
  kind: NotebookPaginationBlockKind;
  heightPt: number;
  measuredWidthPt?: number;
  aspectRatio?: number;
  rotationDeg?: number;
  objectPlacement?: NotebookObjectPlacement;
};

export type NotebookPaginationFragment = {
  id: string;
  page: number;
  offsetPt: number;
  heightPt: number;
  scale: number;
  fragment: number;
  insetLeftPt?: number;
  insetRightPt?: number;
};

export type NotebookFloatingPaginationFragment = {
  id: string;
  page: number;
  xPt: number;
  yPt: number;
  widthPt: number;
  heightPt: number;
  boundsXPt: number;
  boundsYPt: number;
  boundsWidthPt: number;
  boundsHeightPt: number;
  scale: number;
  wrap: Extract<NotebookObjectPlacement, { mode: 'floating' }>['wrap'];
  zOrder: number;
  anchorKind: 'paragraph' | 'page';
};

export type NotebookFloatingPaginationOptions = {
  pageSetup: NotebookPageSetup;
  paragraphAnchorBlockIds?: Readonly<Record<string, string>>;
  floatingBlocks?: readonly NotebookPaginationBlock[];
};

export type NotebookPaginationResult = {
  pageCount: number;
  fragments: NotebookPaginationFragment[];
  floating: NotebookFloatingPaginationFragment[];
  returnedToFlowIds: string[];
};

type FlowExclusion = {
  page: number;
  topPt: number;
  bottomPt: number;
  leftInsetPt: number;
  rightInsetPt: number;
  fullWidth: boolean;
};

const EPSILON = 0.01;
const MAX_FLOATING_LAYOUT_PASSES = 4;

function isSplittable(kind: NotebookPaginationBlockKind) {
  return kind === 'section' || kind === 'container';
}

function isAtomic(kind: NotebookPaginationBlockKind) {
  return kind === 'math' || kind === 'media' || kind === 'evidence' || kind === 'divider';
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function validAspectRatio(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

function transformedSize(widthPt: number, heightPt: number, rotationDeg = 0) {
  const radians = ((rotationDeg % 360) * Math.PI) / 180;
  const cosine = Math.abs(Math.cos(radians));
  const sine = Math.abs(Math.sin(radians));
  return {
    widthPt: widthPt * cosine + heightPt * sine,
    heightPt: widthPt * sine + heightPt * cosine,
  };
}

export function clampNotebookFloatingPlacementToPageSetup(
  placement: NotebookObjectPlacement,
  pageSetup: NotebookPageSetup,
  measuredHeightPt = NOTEBOOK_FLOATING_OBJECT_MIN_WIDTH_PT,
  rotationDeg = 0,
) {
  if (placement.mode !== 'floating') return placement;
  const geometry = notebookPageGeometry(pageSetup);
  const widthPt = clamp(
    placement.widthPt,
    NOTEBOOK_FLOATING_OBJECT_MIN_WIDTH_PT,
    geometry.width,
  );
  const heightPt = Number.isFinite(measuredHeightPt) && measuredHeightPt > 0
    ? measuredHeightPt * (widthPt / placement.widthPt)
    : NOTEBOOK_FLOATING_OBJECT_MIN_WIDTH_PT;
  const bounds = transformedSize(widthPt, heightPt, rotationDeg);
  const boundsOffsetX = (bounds.widthPt - widthPt) / 2;
  const boundsOffsetY = (bounds.heightPt - heightPt) / 2;
  const horizontalOrigin = placement.horizontalReference === 'margins'
    ? pageSetup.marginsPt.left
    : 0;
  const verticalOrigin = placement.verticalReference === 'margins'
    ? pageSetup.marginsPt.top
    : 0;
  const desiredBoundsX = horizontalOrigin + placement.xPt - boundsOffsetX;
  const desiredBoundsY = verticalOrigin + placement.yPt - boundsOffsetY;
  const boundsXPt = clamp(desiredBoundsX, 0, Math.max(0, geometry.width - bounds.widthPt));
  const boundsYPt = clamp(
    desiredBoundsY,
    pageSetup.marginsPt.top,
    Math.max(
      pageSetup.marginsPt.top,
      geometry.height - pageSetup.marginsPt.bottom - bounds.heightPt,
    ),
  );
  return {
    ...placement,
    widthPt,
    xPt: boundsXPt + boundsOffsetX - horizontalOrigin,
    yPt: boundsYPt + boundsOffsetY - verticalOrigin,
  };
}

function firstFragmentPage(fragments: readonly NotebookPaginationFragment[], id: string) {
  return fragments.find((fragment) => fragment.id === id)?.page ?? 1;
}

function floatingCandidates(
  blocks: readonly NotebookPaginationBlock[],
  options: NotebookFloatingPaginationOptions | undefined,
) {
  const candidates = new Map<string, NotebookPaginationBlock>();
  blocks.forEach((block) => {
    if (block.objectPlacement?.mode === 'floating') candidates.set(block.id, block);
  });
  options?.floatingBlocks?.forEach((block) => {
    if (block.objectPlacement?.mode === 'floating') candidates.set(block.id, block);
  });
  return [...candidates.values()];
}

function resolveFloatingFragments(
  candidates: readonly NotebookPaginationBlock[],
  flowFragments: readonly NotebookPaginationFragment[],
  options: NotebookFloatingPaginationOptions,
) {
  const geometry = notebookPageGeometry(options.pageSetup);
  const margins = options.pageSetup.marginsPt;
  const floating: NotebookFloatingPaginationFragment[] = [];
  const returnedToFlowIds: string[] = [];

  candidates.forEach((block) => {
    const placement = block.objectPlacement;
    if (placement?.mode !== 'floating') return;
    if (isSplittable(block.kind) && block.heightPt > geometry.usableHeight + EPSILON) {
      returnedToFlowIds.push(block.id);
      return;
    }
    const anchorBlockId = placement.anchor.kind === 'paragraph'
      ? options.paragraphAnchorBlockIds?.[placement.anchor.nodeId]
      : undefined;
    const page = placement.anchor.kind === 'page'
      ? placement.anchor.pageNumber
      : firstFragmentPage(flowFragments, anchorBlockId ?? placement.anchor.nodeId);
    let widthPt = clamp(
      placement.widthPt,
      NOTEBOOK_FLOATING_OBJECT_MIN_WIDTH_PT,
      geometry.width,
    );
    const aspectRatio = validAspectRatio(block.aspectRatio);
    const measuredScale = block.measuredWidthPt && block.measuredWidthPt > 0
      ? widthPt / block.measuredWidthPt
      : 1;
    let heightPt = aspectRatio
      ? widthPt / aspectRatio
      : Math.max(0, block.heightPt * (block.kind === 'media' ? measuredScale : 1));
    let bounds = transformedSize(widthPt, heightPt, block.rotationDeg);
    let scale = 1;
    if (bounds.heightPt > geometry.usableHeight || bounds.widthPt > geometry.width) {
      scale = Math.min(
        geometry.usableHeight / Math.max(EPSILON, bounds.heightPt),
        geometry.width / Math.max(EPSILON, bounds.widthPt),
      );
      widthPt *= scale;
      heightPt *= scale;
      bounds = transformedSize(widthPt, heightPt, block.rotationDeg);
    }
    const horizontalOrigin = placement.horizontalReference === 'margins' ? margins.left : 0;
    const verticalOrigin = placement.verticalReference === 'margins' ? margins.top : 0;
    const boundsOffsetX = (bounds.widthPt - widthPt) / 2;
    const boundsOffsetY = (bounds.heightPt - heightPt) / 2;
    const desiredBoundsX = horizontalOrigin + placement.xPt - boundsOffsetX;
    const desiredBoundsY = verticalOrigin + placement.yPt - boundsOffsetY;
    const boundsXPt = clamp(desiredBoundsX, 0, Math.max(0, geometry.width - bounds.widthPt));
    const boundsYPt = clamp(
      desiredBoundsY,
      margins.top,
      Math.max(margins.top, geometry.height - margins.bottom - bounds.heightPt),
    );
    floating.push({
      id: block.id,
      page,
      xPt: boundsXPt + boundsOffsetX,
      yPt: boundsYPt + boundsOffsetY,
      widthPt,
      heightPt,
      boundsXPt,
      boundsYPt,
      boundsWidthPt: bounds.widthPt,
      boundsHeightPt: bounds.heightPt,
      scale,
      wrap: placement.wrap,
      zOrder: placement.zOrder,
      anchorKind: placement.anchor.kind,
    });
  });
  return { floating, returnedToFlowIds };
}

function floatingExclusions(
  floating: readonly NotebookFloatingPaginationFragment[],
  candidates: readonly NotebookPaginationBlock[],
  margins: NotebookPageMarginsPt,
  usableWidthPt: number,
) {
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  return floating.flatMap((fragment): FlowExclusion[] => {
    if (fragment.wrap === 'in-front' || fragment.wrap === 'behind') return [];
    const placement = candidateById.get(fragment.id)?.objectPlacement;
    if (placement?.mode !== 'floating') return [];
    const distance = placement.textDistancePt;
    const topPt = Math.max(0, fragment.boundsYPt - margins.top - distance.top);
    const bottomPt = Math.max(topPt, fragment.boundsYPt - margins.top
      + fragment.boundsHeightPt + distance.bottom);
    if (fragment.wrap === 'top-and-bottom') {
      return [{
        page: fragment.page,
        topPt,
        bottomPt,
        leftInsetPt: 0,
        rightInsetPt: 0,
        fullWidth: true,
      }];
    }
    const centerPt = fragment.boundsXPt + fragment.boundsWidthPt / 2;
    const leftSide = centerPt <= margins.left + usableWidthPt / 2;
    const leftInsetPt = leftSide
      ? Math.max(0, fragment.boundsXPt + fragment.boundsWidthPt + distance.right - margins.left)
      : 0;
    const rightInsetPt = leftSide
      ? 0
      : Math.max(0, margins.left + usableWidthPt - fragment.boundsXPt + distance.left);
    const remainingWidth = usableWidthPt - leftInsetPt - rightInsetPt;
    return [{
      page: fragment.page,
      topPt,
      bottomPt,
      leftInsetPt,
      rightInsetPt,
      fullWidth: remainingWidth < NOTEBOOK_MIN_WRAPPED_TEXT_COLUMN_PT,
    }];
  });
}

function intersectingExclusions(
  exclusions: readonly FlowExclusion[],
  page: number,
  offsetPt: number,
  heightPt: number,
) {
  return exclusions.filter((exclusion) => exclusion.page === page
    && offsetPt < exclusion.bottomPt - EPSILON
    && offsetPt + heightPt > exclusion.topPt + EPSILON);
}

function avoidFullWidthExclusions(
  exclusions: readonly FlowExclusion[],
  usableHeightPt: number,
  initialPage: number,
  initialOffsetPt: number,
  heightPt: number,
) {
  let page = initialPage;
  let offsetPt = initialOffsetPt;
  for (let pass = 0; pass < exclusions.length + 2; pass += 1) {
    const blocker = intersectingExclusions(exclusions, page, offsetPt, heightPt)
      .filter((exclusion) => exclusion.fullWidth)
      .sort((left, right) => left.topPt - right.topPt)[0];
    if (!blocker) break;
    offsetPt = blocker.bottomPt;
    if (offsetPt + Math.min(heightPt, usableHeightPt) > usableHeightPt + EPSILON) {
      page += 1;
      offsetPt = 0;
    }
  }
  return { page, offsetPt };
}

function fragmentInsets(
  exclusions: readonly FlowExclusion[],
  page: number,
  offsetPt: number,
  heightPt: number,
) {
  return intersectingExclusions(exclusions, page, offsetPt, heightPt)
    .filter((exclusion) => !exclusion.fullWidth)
    .reduce((insets, exclusion) => ({
      left: Math.max(insets.left, exclusion.leftInsetPt),
      right: Math.max(insets.right, exclusion.rightInsetPt),
    }), { left: 0, right: 0 });
}

function paginateFlowBlocks(
  blocks: readonly NotebookPaginationBlock[],
  usableHeightPt: number,
  exclusions: readonly FlowExclusion[],
): Omit<NotebookPaginationResult, 'floating' | 'returnedToFlowIds'> {
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
      fragments.push({
        id: block.id,
        page,
        offsetPt: 0,
        heightPt: 0,
        scale: 1,
        fragment: 0,
      });
      return;
    }

    const next = blocks[index + 1];
    const keepWithNextHeight = block.kind === 'heading'
      && next
      && next.kind !== 'pageBreak'
      ? block.heightPt + Math.min(next.heightPt, usableHeightPt)
      : block.heightPt;
    const avoided = avoidFullWidthExclusions(
      exclusions,
      usableHeightPt,
      page,
      offset,
      keepWithNextHeight,
    );
    page = avoided.page;
    offset = avoided.offsetPt;
    if (offset > 0 && keepWithNextHeight > usableHeightPt - offset) nextPage();

    if (isAtomic(block.kind) && block.heightPt > usableHeightPt) {
      const scale = usableHeightPt / block.heightPt;
      const insets = fragmentInsets(exclusions, page, offset, usableHeightPt);
      fragments.push({
        id: block.id,
        page,
        offsetPt: offset,
        heightPt: usableHeightPt,
        scale,
        fragment: 0,
        ...(insets.left ? { insetLeftPt: insets.left } : {}),
        ...(insets.right ? { insetRightPt: insets.right } : {}),
      });
      nextPage();
      return;
    }

    if (isSplittable(block.kind) && block.heightPt > usableHeightPt - offset) {
      let remaining = block.heightPt;
      let fragment = 0;
      while (remaining > EPSILON) {
        const fullBlocker = exclusions
          .filter((exclusion) => exclusion.page === page
            && exclusion.fullWidth
            && exclusion.bottomPt > offset + EPSILON)
          .sort((left, right) => left.topPt - right.topPt)[0];
        if (fullBlocker && fullBlocker.topPt <= offset + EPSILON) {
          offset = fullBlocker.bottomPt;
          if (offset >= usableHeightPt - EPSILON) nextPage();
          continue;
        }
        const availableUntilBlocker = fullBlocker
          ? Math.max(0, fullBlocker.topPt - offset)
          : usableHeightPt - offset;
        const available = Math.min(usableHeightPt - offset, availableUntilBlocker);
        if (available <= EPSILON) {
          nextPage();
          continue;
        }
        const height = Math.min(remaining, available);
        const insets = fragmentInsets(exclusions, page, offset, height);
        fragments.push({
          id: block.id,
          page,
          offsetPt: offset,
          heightPt: height,
          scale: 1,
          fragment,
          ...(insets.left ? { insetLeftPt: insets.left } : {}),
          ...(insets.right ? { insetRightPt: insets.right } : {}),
        });
        remaining -= height;
        offset += height;
        fragment += 1;
        if (remaining > EPSILON && offset >= usableHeightPt - EPSILON) nextPage();
      }
      return;
    }

    if (offset > 0 && block.heightPt > usableHeightPt - offset) nextPage();
    const finalAvoided = avoidFullWidthExclusions(
      exclusions,
      usableHeightPt,
      page,
      offset,
      block.heightPt,
    );
    page = finalAvoided.page;
    offset = finalAvoided.offsetPt;
    const insets = fragmentInsets(exclusions, page, offset, block.heightPt);
    fragments.push({
      id: block.id,
      page,
      offsetPt: offset,
      heightPt: block.heightPt,
      scale: 1,
      fragment: 0,
      ...(insets.left ? { insetLeftPt: insets.left } : {}),
      ...(insets.right ? { insetRightPt: insets.right } : {}),
    });
    offset += block.heightPt;
    if (offset >= usableHeightPt - EPSILON && index < blocks.length - 1) nextPage();
  });

  const lastUsedPage = fragments.at(-1)?.page ?? 1;
  return { pageCount: Math.max(1, page, lastUsedPage), fragments };
}

function floatingLayoutsMatch(
  left: readonly NotebookFloatingPaginationFragment[],
  right: readonly NotebookFloatingPaginationFragment[],
) {
  return left.length === right.length && left.every((fragment, index) => {
    const candidate = right[index];
    return candidate
      && fragment.id === candidate.id
      && fragment.page === candidate.page
      && Math.abs(fragment.xPt - candidate.xPt) < EPSILON
      && Math.abs(fragment.yPt - candidate.yPt) < EPSILON
      && Math.abs(fragment.widthPt - candidate.widthPt) < EPSILON
      && Math.abs(fragment.heightPt - candidate.heightPt) < EPSILON;
  });
}

/** Deterministic page placement over measured block heights; derived fragments are never persisted. */
export function paginateNotebookBlocks(
  blocks: readonly NotebookPaginationBlock[],
  usableHeightPt: number,
  options?: NotebookFloatingPaginationOptions,
): NotebookPaginationResult {
  if (!Number.isFinite(usableHeightPt) || usableHeightPt <= 0) {
    throw new TypeError('Notebook usable page height must be positive.');
  }
  const candidates = options ? floatingCandidates(blocks, options) : [];
  const candidateIds = new Set(candidates.map((candidate) => candidate.id));
  let returnedToFlowIds: string[] = [];
  if (options) {
    const geometry = notebookPageGeometry(options.pageSetup);
    returnedToFlowIds = candidates
      .filter((block) => isSplittable(block.kind)
        && block.heightPt > geometry.usableHeight + EPSILON)
      .map((block) => block.id);
  }
  const returnedIds = new Set(returnedToFlowIds);
  const flowBlocks = blocks.filter((block) => !candidateIds.has(block.id) || returnedIds.has(block.id));
  let exclusions: FlowExclusion[] = [];
  let flow = paginateFlowBlocks(flowBlocks, usableHeightPt, exclusions);
  let floating: NotebookFloatingPaginationFragment[] = [];

  if (options) {
    for (let pass = 0; pass < MAX_FLOATING_LAYOUT_PASSES; pass += 1) {
      const resolved = resolveFloatingFragments(candidates, flow.fragments, options);
      returnedToFlowIds = resolved.returnedToFlowIds;
      const nextExclusions = floatingExclusions(
        resolved.floating,
        candidates,
        options.pageSetup.marginsPt,
        notebookPageGeometry(options.pageSetup).usableWidth,
      );
      const nextFlow = paginateFlowBlocks(flowBlocks, usableHeightPt, nextExclusions);
      const stable = floatingLayoutsMatch(floating, resolved.floating)
        && JSON.stringify(flow.fragments) === JSON.stringify(nextFlow.fragments);
      floating = resolved.floating;
      exclusions = nextExclusions;
      flow = nextFlow;
      if (stable) break;
    }
  }

  const fixedPageCount = floating.reduce((maximum, fragment) => Math.max(maximum, fragment.page), 1);
  return {
    pageCount: Math.max(flow.pageCount, fixedPageCount),
    fragments: flow.fragments,
    floating: [...floating].sort((left, right) => left.zOrder - right.zOrder),
    returnedToFlowIds,
  };
}
