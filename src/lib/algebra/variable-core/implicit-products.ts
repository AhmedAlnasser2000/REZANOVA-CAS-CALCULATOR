import { shouldCopyLiteralCommandArgument } from './identifiers';
import type { ImplicitCharacterProductFact } from './types';

export function scanImplicitCharacterProducts(latex: string): ImplicitCharacterProductFact[] {
  const products = new Map<string, ImplicitCharacterProductFact>();
  let index = 0;

  while (index < latex.length) {
    const char = latex[index];
    if (char === '@') {
      let nextIndex = index + 1;
      while (nextIndex < latex.length && /[A-Za-z0-9_]/.test(latex[nextIndex])) {
        nextIndex += 1;
      }
      index = nextIndex;
      continue;
    }

    if (char === '\\') {
      const commandStart = index;
      index += 1;
      while (index < latex.length && /[A-Za-z]/.test(latex[index])) {
        index += 1;
      }
      const command = latex.slice(commandStart, index);
      if (shouldCopyLiteralCommandArgument(command) && latex[index] === '{') {
        const grouped = collectBalancedGroup(latex, index, '{', '}');
        if (grouped) {
          index = grouped.nextIndex;
        }
      }
      continue;
    }

    if (!/[A-Za-z]/.test(char)) {
      index += 1;
      continue;
    }

    let nextIndex = index + 1;
    while (nextIndex < latex.length && /[A-Za-z]/.test(latex[nextIndex])) {
      nextIndex += 1;
    }

    const raw = latex.slice(index, nextIndex);
    if (raw.length > 1) {
      products.set(raw, {
        raw,
        characters: raw.split(''),
      });
    }
    index = nextIndex;
  }

  return [...products.values()].sort((left, right) => left.raw.localeCompare(right.raw));
}

function collectLatexParenthesizedGroup(source: string, start: number) {
  if (source[start] === '(') {
    const grouped = collectBalancedGroup(source, start, '(', ')');
    return grouped
      ? {
          content: source.slice(start + 1, grouped.nextIndex - 1),
          nextIndex: grouped.nextIndex,
        }
      : null;
  }

  if (source.startsWith('\\left(', start)) {
    let depth = 0;
    let index = start;
    while (index < source.length) {
      if (source.startsWith('\\left(', index)) {
        depth += 1;
        index += '\\left('.length;
        continue;
      }
      if (source.startsWith('\\right)', index)) {
        depth -= 1;
        if (depth === 0) {
          return {
            content: source.slice(start + '\\left('.length, index),
            nextIndex: index + '\\right)'.length,
          };
        }
        index += '\\right)'.length;
        continue;
      }
      index += 1;
    }
  }

  return null;
}

function nextNonWhitespaceIndex(source: string, start: number) {
  let index = start;
  while (index < source.length && /\s/.test(source[index])) {
    index += 1;
  }
  return index;
}

function isSafeParenthesizedProductBody(body: string) {
  const trimmed = body.trim();
  if (!trimmed || trimmed.includes('\\')) {
    return false;
  }

  let index = 0;
  let depth = 0;
  while (index < body.length) {
    const char = body[index];
    if (char === '\\') {
      index += 1;
      while (index < body.length && /[A-Za-z]/.test(body[index])) {
        index += 1;
      }
      continue;
    }
    if (char === '{' || char === '(') {
      depth += 1;
    } else if (char === '}' || char === ')') {
      depth = Math.max(0, depth - 1);
    } else if (depth === 0 && /[+\-=<>,]/.test(char)) {
      return false;
    }
    index += 1;
  }

  return /\^|[A-Za-z]\s*[A-Za-z]|\d\s*[A-Za-z]|[A-Za-z]\s*\d/.test(trimmed);
}

function spaceSafeMonomialProductBody(body: string, separator = ' ') {
  const trimmed = body.trim();
  let result = '';
  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    const next = trimmed[index + 1];
    result += char;
    if (
      next
      && /[A-Za-z]/.test(next)
      && (
        /[A-Za-z0-9}]/.test(char)
      )
    ) {
      result += separator;
    }
  }
  return result;
}

function normalizeSafeParenthesizedCharacterProducts(latex: string, separator = ' ') {
  let index = 0;
  let normalized = '';

  while (index < latex.length) {
    const char = latex[index];
    if (char === '\\') {
      const commandStart = index;
      index += 1;
      while (index < latex.length && /[A-Za-z]/.test(latex[index])) {
        index += 1;
      }
      const command = latex.slice(commandStart, index);
      normalized += command;
      if (shouldCopyLiteralCommandArgument(command) && latex[index] === '{') {
        const grouped = collectBalancedGroup(latex, index, '{', '}');
        if (grouped) {
          normalized += latex.slice(index, grouped.nextIndex);
          index = grouped.nextIndex;
        }
      }
      continue;
    }

    if (/[A-Za-z]/.test(char)) {
      const groupStart = nextNonWhitespaceIndex(latex, index + 1);
      const grouped = collectLatexParenthesizedGroup(latex, groupStart);
      if (grouped && isSafeParenthesizedProductBody(grouped.content)) {
        normalized += `${char}${separator}${spaceSafeMonomialProductBody(grouped.content, separator)}`;
        index = grouped.nextIndex;
        continue;
      }
    }

    const groupedLeft = collectLatexParenthesizedGroup(latex, index);
    if (groupedLeft && /^[A-Za-z]$/.test(groupedLeft.content.trim())) {
      const groupStart = nextNonWhitespaceIndex(latex, groupedLeft.nextIndex);
      const groupedRight = collectLatexParenthesizedGroup(latex, groupStart);
      if (groupedRight && isSafeParenthesizedProductBody(groupedRight.content)) {
        normalized += `${groupedLeft.content.trim()}${separator}${spaceSafeMonomialProductBody(groupedRight.content, separator)}`;
        index = groupedRight.nextIndex;
        continue;
      }
    }

    normalized += char;
    index += 1;
  }

  return normalized;
}

export function expandImplicitCharacterProductsInLatex(
  latex: string,
  options: { separator?: string } = {},
) {
  const separator = options.separator ?? ' ';
  const productNormalizedLatex = normalizeSafeParenthesizedCharacterProducts(latex, separator);
  let index = 0;
  let expanded = '';

  while (index < productNormalizedLatex.length) {
    const char = productNormalizedLatex[index];
    if (char === '@') {
      let nextIndex = index + 1;
      while (nextIndex < productNormalizedLatex.length && /[A-Za-z0-9_]/.test(productNormalizedLatex[nextIndex])) {
        nextIndex += 1;
      }
      expanded += productNormalizedLatex.slice(index, nextIndex);
      index = nextIndex;
      continue;
    }

    if (char === '\\') {
      const commandStart = index;
      index += 1;
      while (index < productNormalizedLatex.length && /[A-Za-z]/.test(productNormalizedLatex[index])) {
        index += 1;
      }
      const command = productNormalizedLatex.slice(commandStart, index);
      expanded += command;
      if (shouldCopyLiteralCommandArgument(command) && productNormalizedLatex[index] === '{') {
        const grouped = collectBalancedGroup(productNormalizedLatex, index, '{', '}');
        if (grouped) {
          expanded += productNormalizedLatex.slice(index, grouped.nextIndex);
          index = grouped.nextIndex;
        }
      }
      continue;
    }

    if (!/[A-Za-z]/.test(char)) {
      expanded += char;
      index += 1;
      continue;
    }

    let nextIndex = index + 1;
    while (nextIndex < productNormalizedLatex.length && /[A-Za-z]/.test(productNormalizedLatex[nextIndex])) {
      nextIndex += 1;
    }

    const raw = productNormalizedLatex.slice(index, nextIndex);
    expanded += raw.length > 1 ? raw.split('').join(separator) : raw;
    index = nextIndex;
  }

  return expanded;
}

function collectBalancedGroup(source: string, start: number, open: string, close: string) {
  let depth = 0;
  let index = start;
  while (index < source.length) {
    const char = source[index];
    if (char === open) {
      depth += 1;
    } else if (char === close) {
      depth -= 1;
      if (depth === 0) {
        return { nextIndex: index + 1 };
      }
    }
    index += 1;
  }
  return null;
}

