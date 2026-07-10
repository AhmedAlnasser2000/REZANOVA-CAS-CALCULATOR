import { describe, expect, it } from 'vitest';
import type { DisplayOutcome } from '../../../types/calculator';
import { buildDisplayBlocks } from './display-blocks';

describe('Linear Algebra display block defaults', () => {
  it('opens Vector span facts and relations while collapsing dense RREF evidence', () => {
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'independent(p,q,r)',
      exactLatex: '\\text{No}',
      detailSections: [
        { title: 'Span Facts', lines: ['\\dim\\operatorname{span}(p,q,r)=2'], lineKind: 'math' },
        { title: 'Dependence Relation', lines: ['p+q-r=0'], lineKind: 'math' },
        { title: 'RREF Evidence', lines: ['\\operatorname{rref}(M)=R'], lineKind: 'math' },
      ],
      warnings: [],
    };
    const blocks = buildDisplayBlocks(outcome);

    expect(blocks.find((block) => block.label === 'Span Facts')).toMatchObject({ defaultCollapsed: false });
    expect(blocks.find((block) => block.label === 'Dependence Relation')).toMatchObject({ defaultCollapsed: false });
    expect(blocks.find((block) => block.label === 'RREF Evidence')).toMatchObject({ defaultCollapsed: true });
  });
});
