import { describe, expect, it } from 'vitest';
import { buildDisplayBlocks } from './display-blocks';

describe('display block detail-line intent', () => {
  it('preserves undeclared detail intent for the legacy inference boundary', () => {
    const blocks = buildDisplayBlocks({
      kind: 'success',
      title: 'Symbolic',
      exactLatex: 'x=1',
      detailSections: [{
        title: 'Legacy detail',
        lines: ['Generated equation: x=1'],
      }],
      warnings: [],
    });

    const line = blocks.find((block) => block.id === 'detail-0')?.lines?.[0];
    expect(line).toMatchObject({ text: 'Generated equation: x=1' });
    expect(line?.lineKind).toBeUndefined();
  });
});
