import { describe, expect, it } from 'vitest';
import type { DisplayOutcome } from '../../../types/calculator';
import { buildCanonicalDisplayBlocksFixture as buildDisplayBlocks } from '../../../test-utils/canonical-display-outcome';

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

  it('opens linear-map facts while keeping RREF evidence collapsed', () => {
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'profile(A)',
      exactLatex: 'A:\\mathbb{R}^{2}\\to\\mathbb{R}^{2}',
      detailSections: [
        { title: 'Rank-Nullity Facts', lines: ['\\operatorname{rank}(A)=1'], lineKind: 'math' },
        { title: 'Kernel', lines: ['\\operatorname{nullity}(A)=1'], lineKind: 'math' },
        { title: 'Image', lines: ['\\dim\\operatorname{Im}(A)=1'], lineKind: 'math' },
        { title: 'Invertibility', lines: ['\\det(A)=0'], lineKind: 'math' },
        { title: 'RREF Evidence', lines: ['\\operatorname{rref}(A)=R'], lineKind: 'math' },
      ],
      warnings: [],
    };
    const blocks = buildDisplayBlocks(outcome);

    for (const title of ['Rank-Nullity Facts', 'Kernel', 'Image', 'Invertibility']) {
      expect(blocks.find((block) => block.label === title)).toMatchObject({ defaultCollapsed: false });
    }
    expect(blocks.find((block) => block.label === 'RREF Evidence')).toMatchObject({ defaultCollapsed: true });
  });
});
