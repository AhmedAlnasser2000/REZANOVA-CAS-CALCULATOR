import type { DisplayBlock, DisplayBlockKind } from '../result/display-blocks';
import type { CaseMathSizePolicy } from './result-size-policy';

export const DISPLAY_BLOCK_REVEAL_DELAY_MS = 16;
export const DISPLAY_CASE_ROW_REVEAL_DELAY_MS = 16;
export const DISPLAY_CASE_ROW_REVEAL_BATCH_SIZE = 1;

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

function hasMathHeavyMixedContent(block: DisplayBlock) {
  if (block.renderKind !== 'mixed') {
    return false;
  }

  return Boolean(block.lines?.some((line) => (
    line.lineKind === 'math'
    || Boolean(line.latex)
    || Boolean(line.conditionLatex)
    || Boolean(line.branchLatex)
    || Boolean(line.branchPrefixLatex)
    || Boolean(line.groupLatex)
    || Boolean(line.parts?.some((part) => part.kind === 'math'))
  )));
}

export function shouldLazyMountDisplayBlock(block: DisplayBlock) {
  return Boolean(
    block.collapsible
    && block.defaultCollapsed
    && (
      block.renderKind === 'mathList'
      || block.renderKind === 'branchList'
      || block.renderKind === 'math'
      || hasMathHeavyMixedContent(block)
    ),
  );
}

export function shouldProgressivelyRenderCaseMath(policy: CaseMathSizePolicy) {
  return policy.kind === 'compact';
}

export function nextCaseMathVisibleRowCount(
  visibleRowCount: number,
  totalRowCount: number,
  batchSize = DISPLAY_CASE_ROW_REVEAL_BATCH_SIZE,
) {
  return Math.min(totalRowCount, Math.max(0, visibleRowCount) + Math.max(1, batchSize));
}
