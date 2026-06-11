import { describe, expect, it } from 'vitest';
import type { DisplayBlock, DisplayBlockKind } from './display-blocks';
import {
  displayBlockRevealRank,
  hasQueuedDisplayBlocks,
  initialVisibleDisplayBlockIds,
  nextQueuedDisplayBlock,
  orderDisplayBlocksForReveal,
} from './display-render-scheduler';

function block(id: string, kind: DisplayBlockKind): DisplayBlock {
  return {
    id,
    kind,
    label: id,
    rawContent: [id],
    renderKind: kind === 'validWhen' ? 'mathList' : 'text',
  };
}

describe('display render scheduler', () => {
  it('orders answer, validity, approximate/warnings, periodic, then details', () => {
    const blocks = [
      block('detail', 'detail'),
      block('warning', 'warning'),
      block('valid', 'validWhen'),
      block('periodic', 'periodicFamily'),
      block('answer', 'answer'),
      block('approx', 'approx'),
    ];

    expect(orderDisplayBlocksForReveal(blocks).map((entry) => entry.id)).toEqual([
      'answer',
      'valid',
      'warning',
      'approx',
      'periodic',
      'detail',
    ]);
    expect(displayBlockRevealRank('answer')).toBe(0);
    expect(displayBlockRevealRank('validWhen')).toBe(1);
    expect(displayBlockRevealRank('detail')).toBe(4);
  });

  it('reveals only the first rank immediately and queues later blocks', () => {
    const blocks = [
      block('answer', 'answer'),
      block('error', 'errorText'),
      block('valid', 'validWhen'),
      block('detail', 'detail'),
    ];
    const visible = new Set(initialVisibleDisplayBlockIds(blocks));

    expect([...visible]).toEqual(['answer', 'error']);
    expect(hasQueuedDisplayBlocks(blocks, visible)).toBe(true);
    expect(nextQueuedDisplayBlock(blocks, visible)?.id).toBe('valid');

    visible.add('valid');
    visible.add('detail');
    expect(hasQueuedDisplayBlocks(blocks, visible)).toBe(false);
  });
});
