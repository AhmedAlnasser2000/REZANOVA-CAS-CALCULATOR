import { convertLatexToMarkup } from 'mathlive';

export const MATH_STATIC_MARKUP_CACHE_MAX_ENTRIES = 500;

type MathStaticMarkupMode = 'inline-math' | 'math';

const markupCache = new Map<string, string>();

function markupCacheKey(displayLatex: string, mode: MathStaticMarkupMode) {
  return `${mode}\u0000${displayLatex}`;
}

function rememberMarkup(key: string, markup: string) {
  markupCache.set(key, markup);

  if (markupCache.size <= MATH_STATIC_MARKUP_CACHE_MAX_ENTRIES) {
    return;
  }

  const oldestKey = markupCache.keys().next().value;
  if (oldestKey !== undefined) {
    markupCache.delete(oldestKey);
  }
}

export function renderCachedMathStaticMarkup(displayLatex: string, block: boolean) {
  const defaultMode: MathStaticMarkupMode = block ? 'math' : 'inline-math';
  const key = markupCacheKey(displayLatex, defaultMode);
  const cachedMarkup = markupCache.get(key);

  if (cachedMarkup !== undefined) {
    markupCache.delete(key);
    markupCache.set(key, cachedMarkup);
    return cachedMarkup;
  }

  const markup = convertLatexToMarkup(displayLatex, { defaultMode });
  rememberMarkup(key, markup);
  return markup;
}

export function __resetMathStaticMarkupCacheForTests() {
  markupCache.clear();
}

export function __getMathStaticMarkupCacheStatsForTests() {
  return {
    maxEntries: MATH_STATIC_MARKUP_CACHE_MAX_ENTRIES,
    size: markupCache.size,
  };
}
