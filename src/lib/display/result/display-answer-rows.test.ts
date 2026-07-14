import { describe, expect, it } from 'vitest';
import { canonicalMathValue } from '../../result-contract';
import { buildCanonicalDisplayBlocksFixture as buildDisplayBlocks } from '../../../test-utils/canonical-result-fixture';

describe('display answer rows adapter', () => {
  it('renders structured answer rows while preserving exact latex as raw content', () => {
    const outcome = {
      outcomeKind: 'success' as const,
      title: '\\operatorname{eigen}(A)',
      primaryMath: canonicalMathValue('\\operatorname{eigen}(A)=\\left\\{\\lambda=3:E_{3}=\\operatorname{span}\\left\\{\\begin{bmatrix}1\\\\1\\end{bmatrix}\\right\\},\\lambda=1:E_{1}=\\operatorname{span}\\left\\{\\begin{bmatrix}-1\\\\1\\end{bmatrix}\\right\\}\\right\\}'),
      answerRows: {
        rows: [
          { latex: '\\lambda=3:E_{3}=\\operatorname{span}\\left\\{\\begin{bmatrix}1\\\\1\\end{bmatrix}\\right\\}' },
          { latex: '\\lambda=1:E_{1}=\\operatorname{span}\\left\\{\\begin{bmatrix}-1\\\\1\\end{bmatrix}\\right\\}' },
        ],
      },
      warnings: [],
    };

    const answer = buildDisplayBlocks(outcome).find((block) => block.id === 'answer');

    expect(answer).toMatchObject({
      kind: 'answer',
      renderKind: 'mathList',
      rawContent: [outcome.primaryMath.canonicalLatex],
      lines: [
        expect.objectContaining({ latex: outcome.answerRows.rows[0]?.latex }),
        expect.objectContaining({ latex: outcome.answerRows.rows[1]?.latex }),
      ],
    });
  });
});
