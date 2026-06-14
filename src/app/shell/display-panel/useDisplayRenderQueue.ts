import { useEffect, useMemo, useState } from 'react';
import {
  buildDisplayBlocks,
  type DisplayBlock,
} from '../../../lib/display/result/display-blocks';
import {
  DISPLAY_BLOCK_REVEAL_DELAY_MS,
  hasQueuedDisplayBlocks,
  initialVisibleDisplayBlockIds,
  nextQueuedDisplayBlock,
  orderDisplayBlocksForReveal,
} from '../../../lib/display/scheduling/display-render-scheduler';
import type { DisplayOutcome } from '../../../types/calculator';

type UseDisplayRenderQueueOptions = {
  displayOutcome: DisplayOutcome | null | undefined;
  detailedFactsEnabled: boolean;
  getPeriodicStopReasonText: (reason: string) => string;
  showApproxReadback: boolean;
};

function displayBlockSignature(blocks: readonly DisplayBlock[]) {
  return blocks.map((block) => [
    block.id,
    block.kind,
    block.renderKind,
    block.rawContent.join('\u001f'),
  ].join('\u001e')).join('\u001d');
}

export function useDisplayRenderQueue({
  displayOutcome,
  detailedFactsEnabled,
  getPeriodicStopReasonText,
  showApproxReadback,
}: UseDisplayRenderQueueOptions) {
  const displayBlocks = buildDisplayBlocks(displayOutcome, {
    detailPolicy: {
      detailedFactsEnabled,
    },
    getPeriodicStopReasonText,
    showApproxReadback,
  });
  const signature = displayBlockSignature(displayBlocks);
  const scheduledDisplayBlocks = useMemo(
    () => orderDisplayBlocksForReveal(displayBlocks),
    // displayBlocks is intentionally rebuilt often; the content signature is the stable boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature],
  );
  const immediateVisibleDisplayBlockIds = useMemo(
    () => new Set(initialVisibleDisplayBlockIds(scheduledDisplayBlocks)),
    [scheduledDisplayBlocks],
  );
  const [scheduledVisibility, setScheduledVisibility] = useState<{
    ids: Set<string>;
    signature: string;
  }>(() => ({
    ids: new Set<string>(),
    signature: '',
  }));
  const visibleDisplayBlockIds = scheduledVisibility.signature === signature
    ? scheduledVisibility.ids
    : immediateVisibleDisplayBlockIds;
  const visibleDisplayBlockSignature = [...visibleDisplayBlockIds].join('|');
  const hasDisplayRenderQueue = hasQueuedDisplayBlocks(
    scheduledDisplayBlocks,
    visibleDisplayBlockIds,
  );

  useEffect(() => {
    setScheduledVisibility({
      ids: new Set(initialVisibleDisplayBlockIds(scheduledDisplayBlocks)),
      signature,
    });
  }, [signature, scheduledDisplayBlocks]);

  useEffect(() => {
    const nextBlock = nextQueuedDisplayBlock(scheduledDisplayBlocks, visibleDisplayBlockIds);
    if (!nextBlock) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setScheduledVisibility((current) => {
        const currentIds = current.signature === signature
          ? current.ids
          : new Set(initialVisibleDisplayBlockIds(scheduledDisplayBlocks));
        if (currentIds.has(nextBlock.id)) {
          return {
            ids: currentIds,
            signature,
          };
        }
        const nextIds = new Set(currentIds);
        nextIds.add(nextBlock.id);
        return {
          ids: nextIds,
          signature,
        };
      });
    }, DISPLAY_BLOCK_REVEAL_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [
    signature,
    scheduledDisplayBlocks,
    visibleDisplayBlockIds,
    visibleDisplayBlockSignature,
  ]);

  return {
    hasDisplayRenderQueue,
    scheduledDisplayBlocks,
    visibleDisplayBlockIds,
  };
}
