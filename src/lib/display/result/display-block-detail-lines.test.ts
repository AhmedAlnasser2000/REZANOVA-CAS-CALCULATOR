import { describe, expect, it } from 'vitest';
import type { CanonicalRuntimeOutcome } from '../../../types/calculator';
import { buildDisplayBlocks } from './display-blocks';

describe('display block detail-line intent', () => {
  it('fails closed when a result has no canonical detail authority', () => {
    const invalidLegacyShape = {
      kind: 'success',
      title: 'Symbolic',
      exactLatex: 'x=1',
      detailSections: [{
        title: 'Undeclared detail',
        lines: ['Generated equation: x=1'],
      }],
      warnings: [],
    } as unknown as CanonicalRuntimeOutcome;

    expect(() => buildDisplayBlocks(invalidLegacyShape))
      .toThrow('Semantic result consumers require a native canonical result document');
  });
});
