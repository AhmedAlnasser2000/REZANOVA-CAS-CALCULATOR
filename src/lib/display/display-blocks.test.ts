import { describe, expect, it } from 'vitest';
import type { DisplayOutcome } from '../../types/calculator';
import { buildDisplayBlocks } from './display-blocks';

describe('display block adapter', () => {
  it('builds answer, approx, valid-when, detail, and warning blocks', () => {
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Symbolic',
      exactLatex: 'x=2',
      approxText: 'x ~= 2',
      exactSupplementLatex: ['\\text{Conditions: } x\\ne0'],
      detailSections: [
        {
          title: 'Generated',
          lines: ['x+1=3', 'Selected target: x'],
          lineKinds: ['math', 'text'],
          lineParts: [
            [{ kind: 'math', latex: 'x+1=3' }],
            [{ kind: 'text', text: 'Selected target: ' }, { kind: 'math', latex: 'x' }],
          ],
        },
      ],
      warnings: ['Check domain.'],
    };

    const before = structuredClone(outcome);
    const blocks = buildDisplayBlocks(outcome, {
      showApproxReadback: true,
    });

    expect(blocks.map((block) => block.id)).toEqual([
      'answer',
      'valid-when',
      'approx',
      'detail-0',
      'warnings',
    ]);
    expect(blocks.find((block) => block.id === 'answer')).toMatchObject({
      kind: 'answer',
      label: 'Answer',
      renderKind: 'math',
      latex: 'x=2',
    });
    expect(blocks.find((block) => block.id === 'valid-when')).toMatchObject({
      kind: 'validWhen',
      label: 'Valid when',
      renderKind: 'mathList',
      rawContent: ['x\\ne0'],
    });
    expect(blocks.find((block) => block.id === 'approx')).toMatchObject({
      kind: 'approx',
      renderKind: 'text',
      text: 'x ~= 2',
    });
    expect(blocks.find((block) => block.id === 'detail-0')?.lines?.[0]).toMatchObject({
      lineKind: 'math',
      parts: [{ kind: 'math', latex: 'x+1=3' }],
      testId: 'display-outcome-detail-line-0-0',
      text: 'x+1=3',
    });
    expect(blocks.find((block) => block.id === 'detail-0')?.lines?.[1]).toMatchObject({
      lineKind: 'text',
      parts: [{ kind: 'text', text: 'Selected target: ' }, { kind: 'math', latex: 'x' }],
      testId: 'display-outcome-detail-line-0-1',
      text: 'Selected target: x',
    });
    expect(blocks.find((block) => block.id === 'warnings')).toMatchObject({
      kind: 'warning',
      renderKind: 'text',
      rawContent: ['Check domain.'],
    });
    expect(outcome).toEqual(before);
  });

  it('converts periodic family fields into stable render blocks', () => {
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Periodic',
      periodicFamily: {
        carrierLatex: '\\sin(x)',
        parameterLatex: 'k',
        branchesLatex: ['x=2k\\pi'],
        representatives: [
          { label: 'principal', exactLatex: 'x=0', approxText: 'x ~= 0' },
        ],
        principalRangeLatex: '-\\pi<x\\le\\pi',
        piecewiseBranches: [
          { conditionLatex: 'k\\in\\mathbb{Z}', resultLatex: 'x=2k\\pi' },
        ],
        discoveredFamilies: ['x=2k\\pi'],
        reducedCarrierLatex: 'x',
        structuredStopReason: 'periodic-depth-cap',
        suggestedIntervals: [
          { label: 'try', start: '-\\pi', end: '\\pi' },
        ],
      },
      warnings: [],
    };

    const blocks = buildDisplayBlocks(outcome, {
      getPeriodicStopReasonText: (reason) => `Reason: ${reason}`,
    });

    expect(blocks.map((block) => block.id)).toEqual([
      'periodic-representatives',
      'periodic-principal-range',
      'periodic-piecewise',
      'periodic-discovered-families',
      'periodic-reduced-carrier',
      'periodic-stop-reason',
      'periodic-intervals',
    ]);
    expect(blocks.find((block) => block.id === 'periodic-representatives')).toMatchObject({
      kind: 'periodicFamily',
      label: 'Representative Branches',
      renderKind: 'mixed',
    });
    expect(blocks.find((block) => block.id === 'periodic-piecewise')?.rawContent).toEqual([
      '\\text{if } k\\in\\mathbb{Z}',
      'x=2k\\pi',
    ]);
    expect(blocks.find((block) => block.id === 'periodic-stop-reason')).toMatchObject({
      label: 'Exact Closure Boundary',
      renderKind: 'text',
      text: 'Reason: periodic-depth-cap',
    });
  });

  it('builds error text blocks without requiring result schema migration', () => {
    const outcome: DisplayOutcome = {
      kind: 'error',
      title: 'Symbolic',
      error: 'Unsupported route.',
      exactLatex: 'x=1',
      warnings: [],
    };

    const blocks = buildDisplayBlocks(outcome);

    expect(blocks.map((block) => [block.kind, block.id])).toEqual([
      ['errorText', 'error-text'],
      ['answer', 'answer'],
    ]);
  });

  it('adapts safe finite answer sets into branch-list blocks', () => {
    const exactLatex = 's\\in\\left\\{\\frac{d}{4}+r+\\sqrt{x+j},\\ \\frac{d}{4}-r-\\sqrt{x+j}\\right\\}';
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Symbolic',
      exactLatex,
      warnings: [],
    };

    const answerBlock = buildDisplayBlocks(outcome).find((block) => block.id === 'answer');

    expect(answerBlock).toMatchObject({
      kind: 'answer',
      label: 'Answer',
      renderKind: 'branchList',
      branchCount: 2,
      latex: exactLatex,
      rawContent: [exactLatex],
    });
    expect(answerBlock?.lines?.map((line) => line.latex)).toEqual([
      's=\\frac{d}{4}+r+\\sqrt{x+j}',
      's=\\frac{d}{4}-r-\\sqrt{x+j}',
    ]);
  });

  it('fails closed to a normal answer block for ambiguous branch sets', () => {
    const exactLatex = '(x,y)\\in\\left\\{(1,2),(3,4)\\right\\}';
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Symbolic',
      exactLatex,
      warnings: [],
    };

    expect(buildDisplayBlocks(outcome).find((block) => block.id === 'answer')).toMatchObject({
      kind: 'answer',
      renderKind: 'math',
      latex: exactLatex,
      rawContent: [exactLatex],
    });
  });
});
