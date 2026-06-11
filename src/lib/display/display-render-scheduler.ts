import type { DisplayBlock, DisplayBlockKind } from './display-blocks';

export function displayBlockRevealRank(blockOrKind: DisplayBlock | DisplayBlockKind) {
  const kind = typeof blockOrKind === 'string' ? blockOrKind : blockOrKind.kind;

  if (kind === 'answer' || kind === 'errorText') {
    return 0;
  }
  if (kind === 'validWhen') {
    return 1;
  }
  if (kind === 'approx' || kind === 'warning') {
    return 2;
  }
  if (kind === 'periodicFamily') {
    return 3;
  }
  return 4;
}

export function orderDisplayBlocksForReveal(blocks: readonly DisplayBlock[]) {
  return blocks
    .map((block, index) => ({ block, index }))
    .sort((left, right) => {
      const rankDelta = displayBlockRevealRank(left.block) - displayBlockRevealRank(right.block);
      return rankDelta === 0 ? left.index - right.index : rankDelta;
    })
    .map(({ block }) => block);
}

export function initialVisibleDisplayBlockIds(blocks: readonly DisplayBlock[]) {
  if (blocks.length === 0) {
    return [];
  }

  const firstRank = displayBlockRevealRank(blocks[0]);
  return blocks
    .filter((block) => displayBlockRevealRank(block) === firstRank)
    .map((block) => block.id);
}

export function nextQueuedDisplayBlock(
  blocks: readonly DisplayBlock[],
  visibleBlockIds: ReadonlySet<string>,
) {
  return blocks.find((block) => !visibleBlockIds.has(block.id)) ?? null;
}

export function hasQueuedDisplayBlocks(
  blocks: readonly DisplayBlock[],
  visibleBlockIds: ReadonlySet<string>,
) {
  return nextQueuedDisplayBlock(blocks, visibleBlockIds) !== null;
}
