import { describe, expect, it } from 'vitest';
import type { DisplayBlock, DisplayBlockKind } from '../result/display-blocks';
import {
  DISPLAY_BLOCK_REVEAL_DELAY_MS,
  DISPLAY_CASE_ROW_REVEAL_BATCH_SIZE,
  displayBlockRevealRank,
  hasQueuedDisplayBlocks,
  initialVisibleDisplayBlockIds,
  nextCaseMathVisibleRowCount,
  nextQueuedDisplayBlock,
  orderDisplayBlocksForReveal,
  shouldLazyMountDisplayBlock,
  shouldProgressivelyRenderCaseMath,
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

  it('uses a nonzero reveal delay so later blocks mount one display turn later', () => {
    expect(DISPLAY_BLOCK_REVEAL_DELAY_MS).toBeGreaterThan(0);
  });

  it('progressively renders only compact case-math answers', () => {
    expect(shouldProgressivelyRenderCaseMath({
      kind: 'compact',
      signature: 'heavy',
      latexLength: 1200,
      rowCount: 8,
      groupCount: 2,
    })).toBe(true);
    expect(shouldProgressivelyRenderCaseMath({
      kind: 'normal',
      signature: 'small',
    })).toBe(false);
  });

  it('advances progressive case rows within the result bounds', () => {
    expect(DISPLAY_CASE_ROW_REVEAL_BATCH_SIZE).toBe(1);
    expect(nextCaseMathVisibleRowCount(0, 4)).toBe(1);
    expect(nextCaseMathVisibleRowCount(3, 4)).toBe(4);
    expect(nextCaseMathVisibleRowCount(4, 4)).toBe(4);
    expect(nextCaseMathVisibleRowCount(-3, 4, 2)).toBe(2);
    expect(nextCaseMathVisibleRowCount(1, 4, 0)).toBe(2);
  });

  it('lazy-mounts collapsed block bodies but keeps expanded bodies eager', () => {
    expect(shouldLazyMountDisplayBlock({
      ...block('valid', 'validWhen'),
      collapsible: true,
      defaultCollapsed: true,
    })).toBe(true);
    expect(shouldLazyMountDisplayBlock({
      ...block('detail', 'detail'),
      collapsible: true,
      defaultCollapsed: false,
    })).toBe(false);
    expect(shouldLazyMountDisplayBlock(block('answer', 'answer'))).toBe(false);
  });

  it('keeps collapsed prose-only mixed details mounted because they are cheap to inspect', () => {
    expect(shouldLazyMountDisplayBlock({
      ...block('detail', 'detail'),
      collapsible: true,
      defaultCollapsed: true,
      renderKind: 'mixed',
    })).toBe(false);
  });

  it('lazy-mounts collapsed mixed details when they contain math parts', () => {
    expect(shouldLazyMountDisplayBlock({
      ...block('detail', 'detail'),
      collapsible: true,
      defaultCollapsed: true,
      renderKind: 'mixed',
      lines: [
        {
          id: 'math-line',
          parts: [
            { kind: 'text', text: 'where ' },
            { kind: 'math', latex: 'x=1' },
          ],
        },
      ],
    })).toBe(true);

    expect(shouldLazyMountDisplayBlock({
      ...block('detail', 'detail'),
      collapsible: true,
      defaultCollapsed: true,
      renderKind: 'mixed',
      lines: [
        {
          id: 'math-line',
          latex: 'x=1',
          lineKind: 'math',
        },
      ],
    })).toBe(true);
  });
});
