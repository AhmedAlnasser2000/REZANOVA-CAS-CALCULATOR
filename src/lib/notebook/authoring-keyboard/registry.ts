export type NotebookKeyboardTabId =
  | 'core'
  | 'algebra'
  | 'relations'
  | 'greek'
  | 'calculus'
  | 'discrete'
  | 'structures';

export type NotebookKeyboardSupport =
  | 'authoring-runnable'
  | 'document-only'
  | 'hidden';

export type NotebookKeyboardEntry = {
  id: string;
  label: string;
  latex: string;
  visualKeycap: string;
  tab: NotebookKeyboardTabId;
  support: NotebookKeyboardSupport;
  keywords: readonly string[];
};

type NotebookKeyboardRecipe = Omit<NotebookKeyboardEntry, 'visualKeycap'>;

export const NOTEBOOK_KEYBOARD_TABS: readonly {
  id: NotebookKeyboardTabId;
  label: string;
}[] = [
  { id: 'core', label: 'Core' },
  { id: 'algebra', label: 'Algebra' },
  { id: 'relations', label: 'Relations' },
  { id: 'greek', label: 'Greek' },
  { id: 'calculus', label: 'Calculus' },
  { id: 'discrete', label: 'Discrete' },
  { id: 'structures', label: 'Structures' },
];

const RUNNABLE = 'authoring-runnable' as const;
const DOCUMENT_ONLY = 'document-only' as const;
const HIDDEN = 'hidden' as const;

const NOTEBOOK_KEYBOARD_RECIPES: readonly NotebookKeyboardRecipe[] = [
  { id: 'fraction', label: 'Fraction', latex: '\\frac{#0}{#?}', tab: 'core', support: RUNNABLE, keywords: ['divide', 'ratio'] },
  { id: 'square-root', label: 'Square root', latex: '\\sqrt{#0}', tab: 'core', support: RUNNABLE, keywords: ['root', 'radical'] },
  { id: 'nth-root', label: 'nth root', latex: '\\sqrt[#0]{#?}', tab: 'core', support: RUNNABLE, keywords: ['root', 'radical'] },
  { id: 'power', label: 'Power', latex: '^{#0}', tab: 'core', support: RUNNABLE, keywords: ['exponent'] },
  { id: 'subscript', label: 'Subscript', latex: '_{#0}', tab: 'core', support: RUNNABLE, keywords: ['index'] },
  { id: 'parentheses', label: 'Parentheses', latex: '\\left(#0\\right)', tab: 'core', support: RUNNABLE, keywords: ['group'] },
  { id: 'absolute', label: 'Absolute value', latex: '\\left|#0\\right|', tab: 'core', support: RUNNABLE, keywords: ['modulus'] },
  { id: 'plus-minus', label: 'Plus or minus', latex: '\\pm', tab: 'core', support: RUNNABLE, keywords: ['plus', 'minus'] },

  { id: 'exponential', label: 'Exponential', latex: 'e^{#0}', tab: 'algebra', support: RUNNABLE, keywords: ['exp'] },
  { id: 'natural-log', label: 'Natural log', latex: '\\ln\\left(#0\\right)', tab: 'algebra', support: RUNNABLE, keywords: ['logarithm'] },
  { id: 'log-base', label: 'Log base', latex: '\\log_{#0}\\left(#?\\right)', tab: 'algebra', support: RUNNABLE, keywords: ['logarithm'] },
  { id: 'function', label: 'Function', latex: 'f\\left(#0\\right)', tab: 'algebra', support: RUNNABLE, keywords: ['mapping'] },
  { id: 'factorial', label: 'Factorial', latex: '#0!', tab: 'algebra', support: RUNNABLE, keywords: ['product'] },
  { id: 'binomial', label: 'Binomial', latex: '\\binom{#0}{#?}', tab: 'algebra', support: RUNNABLE, keywords: ['choose', 'combination'] },

  { id: 'equals', label: 'Equals', latex: '=', tab: 'relations', support: RUNNABLE, keywords: ['equal'] },
  { id: 'not-equals', label: 'Not equal', latex: '\\ne', tab: 'relations', support: RUNNABLE, keywords: ['inequality'] },
  { id: 'less-equal', label: 'Less or equal', latex: '\\le', tab: 'relations', support: RUNNABLE, keywords: ['inequality'] },
  { id: 'greater-equal', label: 'Greater or equal', latex: '\\ge', tab: 'relations', support: RUNNABLE, keywords: ['inequality'] },
  { id: 'approximately', label: 'Approximately', latex: '\\approx', tab: 'relations', support: DOCUMENT_ONLY, keywords: ['estimate'] },
  { id: 'implies', label: 'Implies', latex: '\\Longrightarrow', tab: 'relations', support: DOCUMENT_ONLY, keywords: ['therefore'] },
  { id: 'equivalent', label: 'Equivalent', latex: '\\Longleftrightarrow', tab: 'relations', support: DOCUMENT_ONLY, keywords: ['iff'] },

  { id: 'alpha', label: 'Alpha', latex: '\\alpha', tab: 'greek', support: RUNNABLE, keywords: ['greek'] },
  { id: 'beta', label: 'Beta', latex: '\\beta', tab: 'greek', support: RUNNABLE, keywords: ['greek'] },
  { id: 'theta', label: 'Theta', latex: '\\theta', tab: 'greek', support: RUNNABLE, keywords: ['angle'] },
  { id: 'lambda', label: 'Lambda', latex: '\\lambda', tab: 'greek', support: RUNNABLE, keywords: ['eigenvalue'] },
  { id: 'mu', label: 'Mu', latex: '\\mu', tab: 'greek', support: RUNNABLE, keywords: ['mean'] },
  { id: 'pi', label: 'Pi', latex: '\\pi', tab: 'greek', support: RUNNABLE, keywords: ['constant'] },
  { id: 'sigma', label: 'Sigma', latex: '\\sigma', tab: 'greek', support: RUNNABLE, keywords: ['standard deviation'] },
  { id: 'delta', label: 'Delta', latex: '\\Delta', tab: 'greek', support: RUNNABLE, keywords: ['change'] },

  { id: 'limit', label: 'Limit', latex: '\\lim_{#0\\to #?} #?', tab: 'calculus', support: RUNNABLE, keywords: ['approach'] },
  { id: 'derivative', label: 'Derivative', latex: '\\frac{\\mathrm{d}}{\\mathrm{d}#0}#?', tab: 'calculus', support: RUNNABLE, keywords: ['differentiate'] },
  { id: 'partial', label: 'Partial derivative', latex: '\\frac{\\partial}{\\partial #0}#?', tab: 'calculus', support: RUNNABLE, keywords: ['differentiate'] },
  { id: 'integral', label: 'Integral', latex: '\\int_{#0}^{#?}#?\\,\\mathrm{d}#?', tab: 'calculus', support: RUNNABLE, keywords: ['antiderivative'] },
  { id: 'sum', label: 'Sum', latex: '\\sum_{#0}^{#?}#?', tab: 'calculus', support: RUNNABLE, keywords: ['series'] },
  { id: 'product', label: 'Product', latex: '\\prod_{#0}^{#?}#?', tab: 'calculus', support: RUNNABLE, keywords: ['sequence'] },
  { id: 'infinity', label: 'Infinity', latex: '\\infty', tab: 'calculus', support: RUNNABLE, keywords: ['limit'] },

  { id: 'set-membership', label: 'In set', latex: '\\in', tab: 'discrete', support: DOCUMENT_ONLY, keywords: ['belongs'] },
  { id: 'not-in-set', label: 'Not in set', latex: '\\notin', tab: 'discrete', support: DOCUMENT_ONLY, keywords: ['membership'] },
  { id: 'union', label: 'Union', latex: '\\cup', tab: 'discrete', support: DOCUMENT_ONLY, keywords: ['set'] },
  { id: 'intersection', label: 'Intersection', latex: '\\cap', tab: 'discrete', support: DOCUMENT_ONLY, keywords: ['set'] },
  { id: 'for-all', label: 'For all', latex: '\\forall', tab: 'discrete', support: DOCUMENT_ONLY, keywords: ['quantifier'] },
  { id: 'exists', label: 'There exists', latex: '\\exists', tab: 'discrete', support: DOCUMENT_ONLY, keywords: ['quantifier'] },
  { id: 'floor', label: 'Floor', latex: '\\left\\lfloor#0\\right\\rfloor', tab: 'discrete', support: RUNNABLE, keywords: ['round'] },
  { id: 'ceiling', label: 'Ceiling', latex: '\\left\\lceil#0\\right\\rceil', tab: 'discrete', support: RUNNABLE, keywords: ['round'] },

  { id: 'equation-template', label: 'Equation', latex: '#0=#?', tab: 'structures', support: RUNNABLE, keywords: ['solve'] },
  { id: 'matrix', label: 'Matrix', latex: '', tab: 'structures', support: DOCUMENT_ONLY, keywords: ['matrix', 'grid', 'rows', 'columns'] },
  { id: 'column-vector', label: 'Column vector', latex: '\\begin{bmatrix}#0\\\\#?\\end{bmatrix}', tab: 'structures', support: DOCUMENT_ONLY, keywords: ['vector', 'matrix'] },
  { id: 'piecewise', label: 'Piecewise', latex: '\\begin{cases}#0&#?\\\\#?&#?\\end{cases}', tab: 'structures', support: DOCUMENT_ONLY, keywords: ['cases', 'conditional'] },
  { id: 'aligned-work', label: 'Aligned work', latex: '\\begin{aligned}#0&=#?\\\\&=#?\\end{aligned}', tab: 'structures', support: DOCUMENT_ONLY, keywords: ['steps', 'working'] },

  { id: 'unsafe-link', label: 'External link', latex: '\\href{#0}{#?}', tab: 'structures', support: HIDDEN, keywords: ['html', 'url'] },
  { id: 'unsafe-html', label: 'HTML data', latex: '\\htmlData{#0}{#?}', tab: 'structures', support: HIDDEN, keywords: ['html', 'attribute'] },
];

const NOTEBOOK_KEYCAPS: Readonly<Record<string, string>> = {
  fraction: 'a⁄b',
  'square-root': '√',
  'nth-root': 'ⁿ√',
  power: 'xⁿ',
  subscript: 'xᵢ',
  parentheses: '( )',
  absolute: '|x|',
  'plus-minus': '±',
  exponential: 'eˣ',
  'natural-log': 'ln',
  'log-base': 'logₐ',
  function: 'f(x)',
  factorial: 'n!',
  binomial: 'C',
  equals: '=',
  'not-equals': '≠',
  'less-equal': '≤',
  'greater-equal': '≥',
  approximately: '≈',
  implies: '⇒',
  equivalent: '⇔',
  alpha: 'α',
  beta: 'β',
  theta: 'θ',
  lambda: 'λ',
  mu: 'μ',
  pi: 'π',
  sigma: 'σ',
  delta: 'Δ',
  limit: 'lim',
  derivative: 'd⁄dx',
  partial: '∂⁄∂x',
  integral: '∫',
  sum: '∑',
  product: '∏',
  infinity: '∞',
  'set-membership': '∈',
  'not-in-set': '∉',
  union: '∪',
  intersection: '∩',
  'for-all': '∀',
  exists: '∃',
  floor: '⌊x⌋',
  ceiling: '⌈x⌉',
  'equation-template': 'x = y',
  matrix: 'matrix-grid',
  'column-vector': '⃗v',
  piecewise: '{⋯',
  'aligned-work': '= ⋯',
  'unsafe-link': '↗',
  'unsafe-html': '</>',
};

export const NOTEBOOK_KEYBOARD_ENTRIES: readonly NotebookKeyboardEntry[] =
  NOTEBOOK_KEYBOARD_RECIPES.map((entry) => ({
    ...entry,
    visualKeycap: NOTEBOOK_KEYCAPS[entry.id] ?? entry.label,
  }));

export function notebookMatrixLatex(rows: number, columns: number) {
  if (!Number.isInteger(rows) || !Number.isInteger(columns)
    || rows < 1 || rows > 8 || columns < 1 || columns > 8) {
    throw new Error('Notebook matrices support dimensions from 1 by 1 through 8 by 8');
  }
  let placeholder = 0;
  const body = Array.from({ length: rows }, () => (
    Array.from({ length: columns }, () => {
      const value = placeholder === 0 ? '#0' : '#?';
      placeholder += 1;
      return value;
    }).join('&')
  )).join('\\\\');
  return `\\begin{bmatrix}${body}\\end{bmatrix}`;
}

const DOCUMENT_ONLY_PATTERNS = [
  /\\begin\{(?:bmatrix|pmatrix|matrix|cases|aligned)\}/,
  /\\(?:Longrightarrow|Longleftrightarrow|approx|forall|exists|notin|cup|cap)\b/,
];
const HIDDEN_PATTERNS = [/\\(?:href|htmlData|class|cssId|includegraphics)\b/];

export function notebookKeyboardEntries(options: {
  query?: string;
  tab?: NotebookKeyboardTabId;
} = {}) {
  const query = options.query?.trim().toLowerCase() ?? '';
  return NOTEBOOK_KEYBOARD_ENTRIES.filter((entry) => {
    if (entry.support === HIDDEN || (!query && options.tab && entry.tab !== options.tab)) {
      return false;
    }
    return !query || [entry.label, entry.id, ...entry.keywords]
      .some((value) => value.toLowerCase().includes(query));
  });
}

export function notebookLatexSupport(latex: string): NotebookKeyboardSupport {
  if (HIDDEN_PATTERNS.some((pattern) => pattern.test(latex))) {
    return HIDDEN;
  }
  if (DOCUMENT_ONLY_PATTERNS.some((pattern) => pattern.test(latex))) {
    return DOCUMENT_ONLY;
  }
  return RUNNABLE;
}

export function isNotebookLatexRunnable(latex: string) {
  return notebookLatexSupport(latex) === RUNNABLE;
}
