import { describe, expect, it } from 'vitest';
import { buildDisplayBlocks } from '../../display/result/display-blocks';
import type { DisplayOutcome } from '../../../types/calculator';
import {
  buildLimitConditionalCases,
  limitConditionLatex,
  type LimitConditionalCaseRow,
} from './conditional-cases';
import type { LimitAsymptoticBranchDriver } from './asymptotic-terms';

function driver(latex: string): LimitAsymptoticBranchDriver {
  return {
    latex,
    source: 'leading-coefficient',
  };
}

function signRows(symbol = 'a'): LimitConditionalCaseRow[] {
  const coefficient = driver(symbol);
  return [
    {
      valueLatex: '\\infty',
      conditions: [{ kind: 'positive', driver: coefficient }],
    },
    {
      valueLatex: '0',
      conditions: [{ kind: 'zero', driver: coefficient }],
    },
    {
      valueLatex: '-\\infty',
      conditions: [{ kind: 'negative', driver: coefficient }],
    },
  ];
}

describe('limits conditional case surface', () => {
  it('formats asymptotic sign conditions as compact latex', () => {
    const coefficient = driver('a');

    expect(limitConditionLatex({ kind: 'positive', driver: coefficient })).toBe('a>0');
    expect(limitConditionLatex({ kind: 'zero', driver: coefficient })).toBe('a=0');
    expect(limitConditionLatex({ kind: 'negative', driver: coefficient })).toBe('a<0');
    expect(limitConditionLatex({ kind: 'nonzero', driver: coefficient })).toBe('a\\ne0');
  });

  it('builds capped conditional answer latex and proof details', () => {
    const result = buildLimitConditionalCases({ rows: signRows('a') });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.error);
    }

    expect(result.exactLatex).toBe(
      'L=\\begin{cases}\\infty,&a>0\\\\0,&a=0\\\\-\\infty,&a<0\\end{cases}',
    );
    expect(result.branchDrivers.map((entry) => entry.latex)).toEqual(['a']);
    expect(result.rowCount).toBe(3);
    expect(result.detailSections.map((section) => section.title)).toEqual([
      'Limit Cases',
      'Limit Case Proof',
    ]);
    expect(result.detailSections[0]?.lineParts?.[0]).toContainEqual({
      kind: 'math',
      latex: '\\infty',
    });
  });

  it('renders small limit cases directly instead of as guarded formula cases', () => {
    const result = buildLimitConditionalCases({ rows: signRows('a') });
    if (!result.ok) {
      throw new Error(result.error);
    }

    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Limit',
      exactLatex: result.exactLatex,
      detailSections: result.detailSections,
      warnings: [],
    };
    const answer = buildDisplayBlocks(outcome).find((block) => block.id === 'answer');

    expect(answer?.renderKind).toBe('math');
    expect(answer?.latex).toBe(
      'L=\\begin{cases}\\infty,&a>0\\\\0,&a=0\\\\-\\infty,&a<0\\end{cases}',
    );
    expect(answer?.countSummary).toBeUndefined();
  });

  it('hands larger limit case answers to the compact case viewer from equality latex', () => {
    const coefficient = driver('a');
    const rows = Array.from({ length: 7 }, (_, index) => ({
      valueLatex: `${index}`,
      conditions: [{ kind: 'positive' as const, driver: coefficient }],
    }));
    const result = buildLimitConditionalCases({ rows });
    if (!result.ok) {
      throw new Error(result.error);
    }

    const outcome = {
      kind: 'success' as const,
      title: 'Limit',
      value: 0,
      exactLatex: result.exactLatex,
      detailSections: result.detailSections,
      solutionKind: 'exact-symbolic' as const,
      tags: [],
      warnings: [],
    };
    const answer = buildDisplayBlocks(outcome).find((block) => block.id === 'answer');

    expect(answer?.renderKind).toBe('caseMath');
    expect(answer?.text).toBe('L=');
    expect(answer?.countSummary?.guardedRowCount).toBe(7);
  });

  it('deduplicates compact proof rows', () => {
    const coefficient = driver('a');
    const repeatedProof = [
      { kind: 'text' as const, text: 'Leading term ' },
      { kind: 'math' as const, latex: 'ax' },
      { kind: 'text' as const, text: ' controls this branch.' },
    ];
    const result = buildLimitConditionalCases({
      rows: [
        {
          valueLatex: '\\infty',
          conditions: [{ kind: 'positive', driver: coefficient }],
          proofRows: [repeatedProof],
        },
        {
          valueLatex: '-\\infty',
          conditions: [{ kind: 'negative', driver: coefficient }],
          proofRows: [repeatedProof],
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.error);
    }
    const proofSection = result.detailSections.find((section) => section.title === 'Limit Case Proof');
    expect(proofSection?.lineParts).toHaveLength(1);
  });

  it('allows at most two symbolic branch drivers', () => {
    const b = driver('b');
    const a = driver('a');
    const result = buildLimitConditionalCases({
      rows: [
        { valueLatex: '\\infty', conditions: [{ kind: 'positive', driver: b }] },
        { valueLatex: '\\infty', conditions: [{ kind: 'zero', driver: b }, { kind: 'positive', driver: a }] },
        { valueLatex: '0', conditions: [{ kind: 'zero', driver: b }, { kind: 'zero', driver: a }] },
        { valueLatex: '-\\infty', conditions: [{ kind: 'zero', driver: b }, { kind: 'negative', driver: a }] },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.branchDrivers.map((entry) => entry.latex)).toEqual(['b', 'a']);
  });

  it('stops case explosion above the row or branch-driver caps', () => {
    const tooManyRows = buildLimitConditionalCases({
      rows: Array.from({ length: 13 }, (_, index) => ({
        valueLatex: `${index}`,
        conditions: [{ kind: 'positive', driver: driver('a') }],
      })),
    });
    const tooManyDrivers = buildLimitConditionalCases({
      rows: [
        { valueLatex: '1', conditions: [{ kind: 'positive', driver: driver('a') }] },
        { valueLatex: '2', conditions: [{ kind: 'positive', driver: driver('b') }] },
        { valueLatex: '3', conditions: [{ kind: 'positive', driver: driver('c') }] },
      ],
    });

    expect(tooManyRows.ok).toBe(false);
    expect(tooManyRows.rowCount).toBe(13);
    expect(tooManyRows.detailSections[0]?.title).toBe('Limit Case Explosion');
    expect(tooManyDrivers.ok).toBe(false);
    expect(tooManyDrivers.branchDrivers.map((entry) => entry.latex)).toEqual(['a', 'b', 'c']);
  });
});
