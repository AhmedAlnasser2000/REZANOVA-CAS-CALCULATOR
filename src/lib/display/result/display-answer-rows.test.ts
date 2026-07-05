import { describe, expect, it } from 'vitest';
import type { DisplayOutcome } from '../../../types/calculator/display-types';
import { buildDisplayBlocks } from './display-blocks';

describe('display answer rows adapter', () => {
  it('renders structured answer rows while preserving exact latex as raw content', () => {
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: '\\operatorname{eigen}(A)',
      exactLatex: '\\operatorname{eigen}(A)=\\left\\{\\lambda=3:E_{3}=\\operatorname{span}\\left\\{\\begin{bmatrix}1\\\\1\\end{bmatrix}\\right\\},\\lambda=1:E_{1}=\\operatorname{span}\\left\\{\\begin{bmatrix}-1\\\\1\\end{bmatrix}\\right\\}\\right\\}',
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
      rawContent: [outcome.exactLatex],
      lines: [
        expect.objectContaining({ latex: outcome.answerRows?.rows[0]?.latex }),
        expect.objectContaining({ latex: outcome.answerRows?.rows[1]?.latex }),
      ],
    });
  });
});
