import { describe, expect, it } from 'vitest';
import { buildDisplayBlocks } from './display-blocks';

describe('system solution display blocks', () => {
  it('can hide exact answer readback in decimal display style when an approximation exists', () => {
    const blocks = buildDisplayBlocks({
      kind: 'success',
      title: 'Symbolic',
      exactLatex: 'x=\\frac{\\ln(7)}{\\ln(2)}',
      approxText: 'x ~= 2.807355',
      warnings: [],
    }, {
      answerReadbackStyle: 'decimal',
      showApproxReadback: true,
    });

    expect(blocks.map((block) => block.id)).toEqual(['approx']);
    expect(blocks[0]).toMatchObject({
      kind: 'approx',
      text: 'x ~= 2.807355',
    });
  });

  it('renders system solution readback as solution-pair rows', () => {
    const blocks = buildDisplayBlocks({
      kind: 'success',
      title: 'Polynomial 2x2',
      exactLatex: '\\left(x,y\\right)\\in\\left\\{\\left(-4,-6\\right),\\ \\left(3,1\\right)\\right\\}',
      systemReadback: {
        label: 'Solution pairs',
        variablesLatex: ['x', 'y'],
        rows: [
          { valuesLatex: ['-4', '-6'] },
          { valuesLatex: ['3', '1'] },
        ],
      },
      warnings: [],
    });

    const answer = blocks.find((block) => block.id === 'answer');
    expect(answer).toMatchObject({
      label: 'Solution pairs',
      renderKind: 'systemRows',
      countSummary: {
        text: '2 pairs',
      },
    });
    expect(answer?.lines?.map((line) => line.systemCells)).toEqual([
      [
        { variableLatex: 'x', valueLatex: '-4' },
        { variableLatex: 'y', valueLatex: '-6' },
      ],
      [
        { variableLatex: 'x', valueLatex: '3' },
        { variableLatex: 'y', valueLatex: '1' },
      ],
    ]);
  });
});
