import type { MathNotationDisplay } from '../types/calculator';
import type { SymbolicDisplayPrefs } from './symbolic-display';
import { normalizeSymbolicDisplayLatex } from './symbolic-display';

type DelimiterPair = {
  open: string;
  close: string;
};

const COMMAND_MAP: Record<string, string> = {
  alpha: 'α',
  approx: '≈',
  arcsin: 'arcsin',
  arccos: 'arccos',
  arctan: 'arctan',
  asin: 'arcsin',
  acos: 'arccos',
  atan: 'arctan',
  beta: 'β',
  cdot: '·',
  cos: 'cos',
  cot: 'cot',
  csc: 'csc',
  delta: 'δ',
  epsilon: 'ε',
  eta: 'η',
  exp: 'exp',
  frac: '',
  gamma: 'γ',
  ge: '≥',
  in: '∈',
  infty: '∞',
  lambda: 'λ',
  le: '≤',
  ln: 'ln',
  log: 'log',
  mu: 'μ',
  ne: '≠',
  omega: 'ω',
  phi: 'φ',
  pi: 'π',
  psi: 'ψ',
  rho: 'ρ',
  sec: 'sec',
  sigma: 'σ',
  sin: 'sin',
  sqrt: '',
  tan: 'tan',
  tau: 'τ',
  text: '',
  theta: 'θ',
  times: '×',
  to: '→',
  vartheta: 'ϑ',
  zeta: 'ζ',
};

const MATHBB_MAP: Record<string, string> = {
  N: 'ℕ',
  Q: 'ℚ',
  R: 'ℝ',
  Z: 'ℤ',
};

function readGrouped(
  source: string,
  startIndex: number,
  delimiters: DelimiterPair,
): { content: string; nextIndex: number } | null {
  if (source[startIndex] !== delimiters.open) {
    return null;
  }

  let depth = 0;
  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];
    if (char === delimiters.open) {
      depth += 1;
    } else if (char === delimiters.close) {
      depth -= 1;
      if (depth === 0) {
        return {
          content: source.slice(startIndex + 1, index),
          nextIndex: index + 1,
        };
      }
    }
  }

  return null;
}

function readCommand(source: string, startIndex: number): { command: string; nextIndex: number } {
  const first = source[startIndex + 1] ?? '';
  if (!/[A-Za-z]/.test(first)) {
    return {
      command: first,
      nextIndex: Math.min(source.length, startIndex + 2),
    };
  }

  let endIndex = startIndex + 1;
  while (endIndex < source.length && /[A-Za-z]/.test(source[endIndex])) {
    endIndex += 1;
  }

  return {
    command: source.slice(startIndex + 1, endIndex),
    nextIndex: endIndex,
  };
}

function readAtom(source: string, startIndex: number): { content: string; nextIndex: number } {
  if (source[startIndex] === '{') {
    return readGrouped(source, startIndex, { open: '{', close: '}' })
      ?? { content: '', nextIndex: startIndex + 1 };
  }

  if (source[startIndex] === '\\') {
    const { command, nextIndex } = readCommand(source, startIndex);
    return {
      content: `\\${command}`,
      nextIndex,
    };
  }

  return {
    content: source[startIndex] ?? '',
    nextIndex: startIndex + 1,
  };
}

function wrapIfNeeded(text: string) {
  const trimmed = text.trim();
  return /^[A-Za-z0-9πℤℝℚℕ∞]+$/.test(trimmed) ? trimmed : `(${trimmed})`;
}

function formatFraction(numerator: string, denominator: string) {
  return `${wrapIfNeeded(numerator)}/${wrapIfNeeded(denominator)}`;
}

function formatExponent(content: string) {
  const trimmed = content.trim();
  if (!trimmed) {
    return '';
  }

  return /^[A-Za-z0-9π]+$/.test(trimmed) ? `^${trimmed}` : `^(${trimmed})`;
}

function formatSubscript(content: string) {
  const trimmed = content.trim();
  if (!trimmed) {
    return '';
  }

  return /^[A-Za-z0-9π]+$/.test(trimmed) ? `_${trimmed}` : `_(${trimmed})`;
}

function convertLatexFragment(input: string): string {
  let output = '';

  for (let index = 0; index < input.length;) {
    const char = input[index];

    if (char === '\\') {
      if (
        input.startsWith('\\left', index)
        || input.startsWith('\\right', index)
      ) {
        index += input.startsWith('\\left', index) ? 5 : 6;
        continue;
      }

      if (input.startsWith('\\,', index) || input.startsWith('\\;', index) || input.startsWith('\\:', index)) {
        output += ' ';
        index += 2;
        continue;
      }

      if (input.startsWith('\\!', index)) {
        index += 2;
        continue;
      }

      const { command, nextIndex } = readCommand(input, index);
      index = nextIndex;

      if (command === 'frac') {
        const numeratorGroup = readGrouped(input, index, { open: '{', close: '}' });
        if (!numeratorGroup) {
          output += 'frac';
          continue;
        }
        const denominatorGroup = readGrouped(input, numeratorGroup.nextIndex, { open: '{', close: '}' });
        if (!denominatorGroup) {
          output += formatFraction(convertLatexFragment(numeratorGroup.content), '');
          index = numeratorGroup.nextIndex;
          continue;
        }

        output += formatFraction(
          convertLatexFragment(numeratorGroup.content),
          convertLatexFragment(denominatorGroup.content),
        );
        index = denominatorGroup.nextIndex;
        continue;
      }

      if (command === 'sqrt') {
        const indexGroup = readGrouped(input, index, { open: '[', close: ']' });
        const radicandStart = indexGroup ? indexGroup.nextIndex : index;
        const radicandGroup = readGrouped(input, radicandStart, { open: '{', close: '}' });
        if (!radicandGroup) {
          output += '√';
          continue;
        }

        const radicandText = convertLatexFragment(radicandGroup.content);
        if (indexGroup) {
          output += `root(${convertLatexFragment(indexGroup.content)}, ${radicandText})`;
        } else {
          output += `√(${radicandText})`;
        }
        index = radicandGroup.nextIndex;
        continue;
      }

      if (command === 'mathbb') {
        const group = readGrouped(input, index, { open: '{', close: '}' });
        if (!group) {
          output += 'mathbb';
          continue;
        }

        output += MATHBB_MAP[group.content] ?? convertLatexFragment(group.content);
        index = group.nextIndex;
        continue;
      }

      if (command === 'text' || command === 'operatorname') {
        const group = readGrouped(input, index, { open: '{', close: '}' });
        if (!group) {
          continue;
        }

        output += convertLatexFragment(group.content);
        index = group.nextIndex;
        continue;
      }

      output += COMMAND_MAP[command] ?? command;
      continue;
    }

    if (char === '^' || char === '_') {
      const atom = readAtom(input, index + 1);
      const atomText = convertLatexFragment(atom.content);
      output += char === '^' ? formatExponent(atomText) : formatSubscript(atomText);
      index = atom.nextIndex;
      continue;
    }

    if (char === '{' || char === '}') {
      index += 1;
      continue;
    }

    output += char;
    index += 1;
  }

  return output;
}

function normalizeReadableText(text: string) {
  return text
    .replace(/~=+/g, '≈')
    .replace(/\s*([=≈≤≥≠∈→])\s*/g, ' $1 ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\[\s+/g, '[')
    .replace(/\s+\]/g, ']')
    .replace(/\s+,/g, ',')
    .replace(/\s+:/g, ':')
    .trim();
}

export function latexToPlainText(latex: string) {
  return normalizeReadableText(convertLatexFragment(latex));
}

export function getDisplayLatex(
  latex: string,
  displayPrefs?: SymbolicDisplayPrefs,
) {
  return normalizeSymbolicDisplayLatex(latex, displayPrefs) ?? latex;
}

export function latexToVisibleText(
  latex: string,
  notationMode: MathNotationDisplay,
  displayPrefs?: SymbolicDisplayPrefs,
) {
  const displayLatex = getDisplayLatex(latex, displayPrefs);
  return notationMode === 'latex' ? latex : latexToPlainText(displayLatex);
}

export function formatMathTextForDisplay(
  text: string,
  notationMode: MathNotationDisplay,
) {
  if (notationMode === 'latex') {
    return text;
  }

  return latexToPlainText(text);
}
