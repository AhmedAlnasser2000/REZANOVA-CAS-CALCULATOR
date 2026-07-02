import { beforeEach, describe, expect, it, vi } from 'vitest';
import { convertLatexToMarkup } from 'mathlive';
import {
  __getMathStaticMarkupCacheStatsForTests,
  __resetMathStaticMarkupCacheForTests,
  MATH_STATIC_MARKUP_CACHE_MAX_ENTRIES,
  renderCachedMathStaticMarkup,
} from './math-static-markup-cache';

vi.mock('mathlive', () => ({
  convertLatexToMarkup: vi.fn((latex: string, options: { defaultMode: string }) =>
    `<math data-mode="${options.defaultMode}">${latex}</math>`),
}));

const convertLatexToMarkupMock = vi.mocked(convertLatexToMarkup);

describe('math static markup cache', () => {
  beforeEach(() => {
    __resetMathStaticMarkupCacheForTests();
    convertLatexToMarkupMock.mockClear();
  });

  it('reuses rendered markup for repeated display latex and mode', () => {
    expect(renderCachedMathStaticMarkup('x+1', true)).toContain('x+1');
    expect(renderCachedMathStaticMarkup('x+1', true)).toContain('x+1');

    expect(convertLatexToMarkupMock).toHaveBeenCalledTimes(1);
    expect(__getMathStaticMarkupCacheStatsForTests()).toEqual({
      maxEntries: MATH_STATIC_MARKUP_CACHE_MAX_ENTRIES,
      size: 1,
    });
  });

  it('keeps block and inline markup as separate cache entries', () => {
    renderCachedMathStaticMarkup('x+1', true);
    renderCachedMathStaticMarkup('x+1', false);

    expect(convertLatexToMarkupMock).toHaveBeenCalledTimes(2);
    expect(convertLatexToMarkupMock).toHaveBeenNthCalledWith(1, 'x+1', { defaultMode: 'math' });
    expect(convertLatexToMarkupMock).toHaveBeenNthCalledWith(2, 'x+1', { defaultMode: 'inline-math' });
    expect(__getMathStaticMarkupCacheStatsForTests().size).toBe(2);
  });

  it('evicts old entries once the bounded cache is full', () => {
    for (let index = 0; index <= MATH_STATIC_MARKUP_CACHE_MAX_ENTRIES; index += 1) {
      renderCachedMathStaticMarkup(`x_${index}`, true);
    }

    expect(__getMathStaticMarkupCacheStatsForTests().size)
      .toBe(MATH_STATIC_MARKUP_CACHE_MAX_ENTRIES);
    expect(convertLatexToMarkupMock).toHaveBeenCalledTimes(
      MATH_STATIC_MARKUP_CACHE_MAX_ENTRIES + 1,
    );

    renderCachedMathStaticMarkup('x_0', true);

    expect(convertLatexToMarkupMock).toHaveBeenCalledTimes(
      MATH_STATIC_MARKUP_CACHE_MAX_ENTRIES + 2,
    );
  });
});
