import { describe, expect, it } from 'vitest';
import {
  buildLatexPreview,
  classifyCaseMathResultSize,
  classifyLatexCollectionResultSize,
  classifyLatexResultSize,
  RESULT_CASE_MATH_ROW_LIMIT,
  RESULT_CASE_MATH_ROW_LATEX_LENGTH,
  RESULT_SIZE_POLICY_LATEX_LENGTH,
  RESULT_SIZE_POLICY_LINE_COUNT,
} from './result-size-policy';

describe('result size policy', () => {
  it('keeps small latex blocks on the normal render path', () => {
    expect(classifyLatexResultSize('x=2')).toEqual({
      kind: 'normal',
      signature: expect.any(String),
    });
  });

  it('requires explicit full rendering for oversized latex blocks', () => {
    const large = `x=${'a'.repeat(RESULT_SIZE_POLICY_LATEX_LENGTH)}`;
    const policy = classifyLatexResultSize(large);

    expect(policy).toEqual({
      kind: 'compact',
      signature: expect.any(String),
      latexLength: large.length,
      lineCount: 1,
      previewText: expect.stringContaining('x=aaa'),
    });
  });

  it('uses line count as a conservative gate for validity collections', () => {
    const lines = Array.from({ length: RESULT_SIZE_POLICY_LINE_COUNT + 1 }, (_, index) => `x\\ne${index}`);
    const policy = classifyLatexCollectionResultSize(lines);

    expect(policy.kind).toBe('compact');
    expect(policy).toEqual(expect.objectContaining({
      lineCount: lines.length,
      latexLength: lines.join('\n').length,
    }));
  });

  it('builds a plain compact preview without requiring valid partial latex', () => {
    expect(buildLatexPreview('x+1')).toBe('x+1');
    expect(buildLatexPreview('x '.repeat(200), 12)).toBe('x x x x x x...');
  });

  it('keeps small case-math answers on the normal render path', () => {
    const policy = classifyCaseMathResultSize([
      { latex: 'x=1', conditionLatex: String.raw`\Delta>0` },
      { latex: 'x=2', conditionLatex: String.raw`\Delta=0` },
    ]);

    expect(policy).toEqual({
      kind: 'normal',
      signature: expect.any(String),
    });
  });

  it('keeps compact four-row Cardano cases on the normal render path', () => {
    const policy = classifyCaseMathResultSize([
      { latex: String.raw`\sqrt[3]{-1+\sqrt{1+\left(\frac{p}{3}\right)^3}}+\sqrt[3]{-1-\sqrt{1+\left(\frac{p}{3}\right)^3}}`, conditionLatex: String.raw`\Delta>0` },
      { latex: String.raw`0`, conditionLatex: String.raw`\Delta=0,\ p=0,\ q=0` },
      { latex: String.raw`\left\{\frac{6}{p},-\frac{3}{p}\right\}`, conditionLatex: String.raw`\Delta=0,\ p\ne0` },
      { latex: String.raw`2\sqrt{-\frac{p}{3}}\cos\left(\frac{1}{3}\arccos\left(\frac{3}{p}\sqrt{-\frac{3}{p}}\right)-\frac{2\pi k}{3}\right)`, conditionLatex: String.raw`\Delta<0,\ p<0` },
    ]);

    expect(policy).toEqual({
      kind: 'normal',
      signature: expect.any(String),
    });
  });

  it('compacts case-math answers with many guarded rows', () => {
    const rows = Array.from(
      { length: RESULT_CASE_MATH_ROW_LIMIT + 1 },
      (_, index) => ({
        latex: `x_${index}=a_${index}`,
        conditionLatex: String.raw`\Delta>${index}`,
      }),
    );
    const policy = classifyCaseMathResultSize(rows);

    expect(policy).toEqual(expect.objectContaining({
      kind: 'compact',
      rowCount: rows.length,
    }));
  });

  it('compacts grouped generated formula case answers before mounting rows', () => {
    const policy = classifyCaseMathResultSize([
      {
        groupLatex: String.raw`z^3+z+1=\sqrt{b}`,
        latex: 'z_1',
        conditionLatex: String.raw`\Delta>0`,
      },
      {
        groupLatex: String.raw`z^3+z+1=-\sqrt{b}`,
        latex: 'z_2',
        conditionLatex: String.raw`\Delta>0`,
      },
    ]);

    expect(policy).toEqual(expect.objectContaining({
      kind: 'compact',
      groupCount: 2,
      rowCount: 2,
    }));
  });

  it('compacts a case-math answer when any row is long', () => {
    const longFormula = `x=${'a'.repeat(RESULT_CASE_MATH_ROW_LATEX_LENGTH)}`;
    const policy = classifyCaseMathResultSize([
      {
        latex: longFormula,
        conditionLatex: String.raw`\Delta>0`,
      },
    ]);

    expect(policy).toEqual(expect.objectContaining({
      kind: 'compact',
      rowCount: 1,
      previewText: expect.stringContaining('x=aaa'),
    }));
  });

  it('compacts visually heavy four-row substituted Cardano cases', () => {
    const heavySubstitutedCardanoRow = String.raw`x\in\left\{\sqrt[3]{-\frac{\frac{2(pq)^3}{27}-\frac{pq}{3}-1}{2}+\sqrt{\left(\frac{\frac{2(pq)^3}{27}-\frac{pq}{3}-1}{2}\right)^2+\left(\frac{1-\frac{pq^2}{3}}{3}\right)^3}}+\sqrt[3]{-\frac{\frac{2(pq)^3}{27}-\frac{pq}{3}-1}{2}-\sqrt{\left(\frac{\frac{2(pq)^3}{27}-\frac{pq}{3}-1}{2}\right)^2+\left(\frac{1-\frac{pq^2}{3}}{3}\right)^3}}\right\}`;
    const policy = classifyCaseMathResultSize([
      { latex: heavySubstitutedCardanoRow, conditionLatex: String.raw`\Delta>0` },
      { latex: String.raw`\left\{-\frac{pq}{3}\right\}`, conditionLatex: String.raw`\Delta=0,\ p=0,\ q=0` },
      { latex: String.raw`\left\{-\frac{pq}{3}+\frac{3\left(\frac{2(pq)^3}{27}-\frac{pq}{3}-1\right)}{1-\frac{pq^2}{3}},-\frac{pq}{3}-\frac{3\left(\frac{2(pq)^3}{27}-\frac{pq}{3}-1\right)}{2\left(1-\frac{pq^2}{3}\right)}\right\}`, conditionLatex: String.raw`\Delta=0,\ p\ne0` },
      { latex: String.raw`\left\{-\frac{pq}{3}+2\sqrt{-\frac{1-\frac{pq^2}{3}}{3}}\cos\left(\frac{1}{3}\arccos\left(\frac{3\left(\frac{2(pq)^3}{27}-\frac{pq}{3}-1\right)}{2\left(1-\frac{pq^2}{3}\right)}\sqrt{-\frac{3}{1-\frac{pq^2}{3}}}\right)-\frac{2\pi k}{3}\right)\mid k=0,1,2\right\}`, conditionLatex: String.raw`\Delta<0,\ p<0` },
    ]);

    expect(policy).toEqual(expect.objectContaining({
      kind: 'compact',
      rowCount: 4,
    }));
  });
});
