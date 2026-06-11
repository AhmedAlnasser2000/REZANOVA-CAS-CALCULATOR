import { describe, expect, it } from 'vitest';
import {
  buildLatexPreview,
  classifyLatexCollectionResultSize,
  classifyLatexResultSize,
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
});
