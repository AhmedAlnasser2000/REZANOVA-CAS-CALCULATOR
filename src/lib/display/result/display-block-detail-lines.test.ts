import { describe, expect, it } from 'vitest';
import { buildDisplayBlocks } from './display-blocks';

describe('display block detail-line intent', () => {
  it('fails closed when a result has no canonical detail authority', () => {
    expect(() => buildDisplayBlocks({
      kind: 'success',
      title: 'Symbolic',
      exactLatex: 'x=1',
      detailSections: [{
        title: 'Undeclared detail',
        lines: ['Generated equation: x=1'],
      }],
      warnings: [],
    })).toThrow('Semantic result consumers require a native canonical result document');
  });
});
