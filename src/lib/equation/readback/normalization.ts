import type { VariableAnalysis } from '../../algebra/variable-core/types';

export type EquationReadbackDomainIntent = 'real' | 'complex' | 'unknown';

export type ExactReadbackNormalizationContext = {
  target?: string;
  variableAnalysis?: VariableAnalysis;
  domainIntent?: EquationReadbackDomainIntent;
  validatedRootExpression?: boolean;
  allowPlainImaginaryUnit?: boolean;
};

export type ExactReadbackNormalizationResult = {
  latex: string;
  changed: boolean;
  notes: string[];
};

const MAX_NORMALIZATION_PASSES = 6;
const MAX_RADICAND_NORMALIZATION_DEPTH = 4;

export function normalizeExactReadbackExpression(
  latex: string,
  context: ExactReadbackNormalizationContext = {},
): ExactReadbackNormalizationResult {
  let current = normalizeSpacing(latex);
  const notes: string[] = [];

  for (let pass = 0; pass < MAX_NORMALIZATION_PASSES; pass += 1) {
    const before = current;
    current = normalizeExactScalarFragments(current, notes);
    current = normalizeImaginaryUnitProducts(current, context, notes);
    current = normalizeSignNoise(current, notes);
    current = normalizeAdditiveIdentity(current, notes);
    current = normalizeMultiplicativeIdentity(current, notes);
    current = normalizeValidatedZeroProduct(current, context, notes);
    current = normalizeExternalCoefficientBeforeRadical(current, notes);
    current = unwrapOuterParens(current);

    if (current === before) {
      break;
    }
  }

  return {
    latex: current,
    changed: current !== latex,
    notes: [...new Set(notes)],
  };
}

function normalizeSpacing(latex: string) {
  const commandProductSpace = '\u0000';
  return latex
    .trim()
    .replace(/\\left\s*/gu, '\\left')
    .replace(/\\right\s*/gu, '\\right')
    .replace(/\\([A-Za-z]+)\s+([A-Za-z])/gu, (_match, command: string, next: string) =>
      `\\${command}${commandProductSpace}${next}`)
    .replace(/\s+/gu, '')
    .replaceAll(commandProductSpace, ' ');
}

function normalizeExactScalarFragments(latex: string, notes: string[]) {
  let result = latex;
  result = result.replace(/\\frac\{(?:\\left\()?1\+1(?:\\right\))?\}\{2\}/gu, () => {
    notes.push('exact-unit-scalar');
    return '1';
  });
  result = result.replace(/\\frac\{(?:\\left\()?(-1\+1|1-1)(?:\\right\))?\}\{[1-9]\d*\}/gu, () => {
    notes.push('exact-zero-scalar');
    return '0';
  });
  result = result.replace(/\\frac\{(-?\d+)\}\{(-?\d+)\}/gu, (match, rawNumerator: string, rawDenominator: string) => {
    const numerator = Number(rawNumerator);
    const denominator = Number(rawDenominator);
    if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator === 0) {
      return match;
    }
    if (numerator === 0) {
      notes.push('exact-zero-scalar');
      return '0';
    }
    if (numerator === denominator) {
      notes.push('exact-unit-scalar');
      return '1';
    }
    if (numerator === -denominator) {
      notes.push('exact-negative-unit-scalar');
      return '-1';
    }
    return match;
  });
  return result;
}

function normalizeImaginaryUnitProducts(
  latex: string,
  context: ExactReadbackNormalizationContext,
  notes: string[],
) {
  let result = latex.replace(
    /(?:\\left\()?\\imaginaryI(?:\\right\))?(?:\\cdot)?(?:\\left\()?\\imaginaryI(?:\\right\))?/gu,
    () => {
      notes.push('imaginary-unit-square');
      return '-1';
    },
  );

  if (!plainIIsImaginaryUnit(context)) {
    return result;
  }

  result = result.replace(/(^|[+\-*/{(])(\d+(?:\.\d+)?)ii(?=$|[+\-*/})])/gu, (_match, prefix: string, scalar: string) => {
    notes.push('imaginary-unit-square');
    return `${prefix}-${scalar}`;
  });

  result = result.replace(/(^|[+\-*/{(])ii(?=$|[+\-*/})])/gu, (_match, prefix: string) => {
    notes.push('imaginary-unit-square');
    return `${prefix}-1`;
  });

  result = result.replace(/(^|[^A-Za-z\\])i(?:\\cdot\s*)?i(?=$|[^A-Za-z])/gu, (_match, prefix: string) => {
    notes.push('imaginary-unit-square');
    return `${prefix}-1`;
  });

  return result;
}

function normalizeSignNoise(latex: string, notes: string[], depth = 0) {
  let result = latex;
  result = normalizeNumericScalarTimesNegativeGroup(result, notes);
  result = unwrapParenthesizedSqrtTerms(result, notes);
  result = normalizeTrailingNumericFractionAfterSingleRootTerm(result, notes);
  result = result.replace(/^\\frac\{-(\d+)\}\{([1-9]\d*)\}/u, (_match, numerator: string, denominator: string) => {
    notes.push('sign-cleanup');
    return `-\\frac{${numerator}}{${denominator}}`;
  });
  result = result.replace(/\+\\frac\{-(\d+)\}\{([1-9]\d*)\}/gu, (_match, numerator: string, denominator: string) => {
    notes.push('sign-cleanup');
    return `-\\frac{${numerator}}{${denominator}}`;
  });
  result = result.replace(/-\\frac\{-(\d+)\}\{([1-9]\d*)\}/gu, (_match, numerator: string, denominator: string) => {
    notes.push('sign-cleanup');
    return `+\\frac{${numerator}}{${denominator}}`;
  });
  result = result.replace(/\+\\left\(-\\frac\{(\d+)\}\{([1-9]\d*)\}\\right\)/gu, (_match, numerator: string, denominator: string) => {
    notes.push('sign-cleanup');
    return `-\\frac{${numerator}}{${denominator}}`;
  });
  result = result.replace(/-\\left\(-\\frac\{(\d+)\}\{([1-9]\d*)\}\\right\)/gu, (_match, numerator: string, denominator: string) => {
    notes.push('sign-cleanup');
    return `+\\frac{${numerator}}{${denominator}}`;
  });
  result = result.replace(/\+\(-\\frac\{(\d+)\}\{([1-9]\d*)\}\)/gu, (_match, numerator: string, denominator: string) => {
    notes.push('sign-cleanup');
    return `-\\frac{${numerator}}{${denominator}}`;
  });
  result = result.replace(/-\(-\\frac\{(\d+)\}\{([1-9]\d*)\}\)/gu, (_match, numerator: string, denominator: string) => {
    notes.push('sign-cleanup');
    return `+\\frac{${numerator}}{${denominator}}`;
  });
  result = normalizeNegativeFractionNumerators(result, notes);
  result = result.replace(/\+\\left\(-([1-9]\d*(?:\\cdot)?[A-Za-z](?:_\{[^{}]+\})?)\\right\)/gu, (_match, term: string) => {
    notes.push('sign-cleanup');
    return `-${term}`;
  });
  result = result.replace(/\+\(-([1-9]\d*(?:\\cdot)?[A-Za-z](?:_\{[^{}]+\})?)\)/gu, (_match, term: string) => {
    notes.push('sign-cleanup');
    return `-${term}`;
  });
  result = normalizeIntegerScalarGroupSignNoise(result, notes);
  result = result.replace(/[+][-]/gu, () => {
    notes.push('sign-cleanup');
    return '-';
  });
  result = result.replace(/[-][-]/gu, () => {
    notes.push('sign-cleanup');
    return '+';
  });
  result = result.replace(/^\+/u, () => {
    notes.push('sign-cleanup');
    return '';
  });
  result = result.replace(/^-\\left\(-(.+)\\right\)$/u, (_match, inner: string) => {
    notes.push('sign-cleanup');
    return inner;
  });
  result = result.replace(/^-\(-(.+)\)$/u, (_match, inner: string) => {
    notes.push('sign-cleanup');
    return inner;
  });
  result = normalizeSqrtRadicandSignNoise(result, notes, depth);
  return result;
}

function normalizeNegativeFractionNumerators(latex: string, notes: string[]) {
  let result = '';
  let index = 0;
  let changed = false;

  while (index < latex.length) {
    if (!latex.startsWith('\\frac{', index)) {
      result += latex[index];
      index += 1;
      continue;
    }

    const numeratorOpen = index + '\\frac'.length;
    const numeratorClose = findMatchingBrace(latex, numeratorOpen);
    const denominatorOpen = numeratorClose + 1;
    const denominatorClose = denominatorOpen >= 0
      ? findMatchingBrace(latex, denominatorOpen)
      : -1;
    if (numeratorClose < 0 || denominatorClose < 0) {
      result += latex[index];
      index += 1;
      continue;
    }

    const numerator = latex.slice(numeratorOpen + 1, numeratorClose);
    const denominator = latex.slice(denominatorOpen + 1, denominatorClose);
    const unsignedNumerator = movableNegativeNumerator(numerator);
    const sign = unsignedNumerator === null
      ? null
      : additiveSignForNegativeFraction(result);
    if (unsignedNumerator === null || sign === null) {
      result += latex.slice(index, denominatorClose + 1);
      index = denominatorClose + 1;
      continue;
    }

    const prefix = sign.removePrevious ? result.slice(0, -1) : result;
    result = `${prefix}${sign.sign}\\frac{${unsignedNumerator}}{${denominator}}`;
    index = denominatorClose + 1;
    changed = true;
  }

  if (changed) {
    notes.push('sign-cleanup');
  }
  return result;
}

function movableNegativeNumerator(numerator: string) {
  if (!numerator.startsWith('-') || numerator.startsWith('--')) {
    const leftRightNegative = numerator.match(/^\\left\(-(.+)\\right\)$/u);
    const plainNegative = numerator.match(/^\(-(.+)\)$/u);
    const wrappedUnsigned = leftRightNegative?.[1] ?? plainNegative?.[1] ?? null;
    if (wrappedUnsigned === null || hasTopLevelAdditiveOperator(wrappedUnsigned)) {
      return null;
    }
    return wrappedUnsigned;
  }
  const unsigned = numerator.slice(1);
  if (unsigned.length === 0 || hasTopLevelAdditiveOperator(unsigned)) {
    return null;
  }
  return unsigned;
}

function additiveSignForNegativeFraction(prefix: string) {
  if (prefix.endsWith('+')) {
    return { sign: '-', removePrevious: true };
  }
  if (prefix.endsWith('-')) {
    return { sign: '+', removePrevious: true };
  }
  if (prefix.length === 0) {
    return { sign: '-', removePrevious: false };
  }

  const previous = prefix[prefix.length - 1];
  return previous === '=' || previous === '{' || previous === '(' || previous === ','
    ? { sign: '-', removePrevious: false }
    : null;
}

function normalizeIntegerScalarGroupSignNoise(latex: string, notes: string[]) {
  let changed = false;
  const result = latex
    .replace(/\+\\left\((-?[1-9]\d*)\\right\)(?=(?:\\left)?\()/gu, (_match, scalar: string) => {
      changed = true;
      return scalar.startsWith('-') ? scalar : `+${scalar}`;
    })
    .replace(/\+\((-?[1-9]\d*)\)(?=(?:\\left)?\()/gu, (_match, scalar: string) => {
      changed = true;
      return scalar.startsWith('-') ? scalar : `+${scalar}`;
    });

  if (changed) {
    notes.push('sign-cleanup');
  }
  return result;
}

function normalizeSqrtRadicandSignNoise(latex: string, notes: string[], depth: number) {
  if (depth >= MAX_RADICAND_NORMALIZATION_DEPTH) {
    return latex;
  }

  let result = '';
  let index = 0;
  let changed = false;

  while (index < latex.length) {
    if (!latex.startsWith('\\sqrt{', index)) {
      result += latex[index];
      index += 1;
      continue;
    }

    const openIndex = index + '\\sqrt'.length;
    const closeIndex = findMatchingBrace(latex, openIndex);
    if (closeIndex < 0) {
      result += latex[index];
      index += 1;
      continue;
    }

    const radicand = latex.slice(openIndex + 1, closeIndex);
    const normalizedRadicand = normalizeSignNoise(radicand, notes, depth + 1);
    if (normalizedRadicand !== radicand) {
      notes.push('sqrt-radicand-sign-cleanup');
      changed = true;
    }

    result += `\\sqrt{${normalizedRadicand}}`;
    index = closeIndex + 1;
  }

  return changed ? result : latex;
}

function unwrapParenthesizedSqrtTerms(latex: string, notes: string[]) {
  let result = '';
  let index = 0;
  let changed = false;

  while (index < latex.length) {
    if (!latex.startsWith('(\\sqrt{', index)) {
      result += latex[index];
      index += 1;
      continue;
    }

    const sqrtBrace = index + '(\\sqrt'.length;
    const sqrtEnd = findMatchingBrace(latex, sqrtBrace);
    if (sqrtEnd < 0 || latex[sqrtEnd + 1] !== ')') {
      result += latex[index];
      index += 1;
      continue;
    }

    notes.push('sign-cleanup');
    changed = true;
    result += latex.slice(index + 1, sqrtEnd + 1);
    index = sqrtEnd + 2;
  }

  return changed ? result : latex;
}

function normalizeTrailingNumericFractionAfterSingleRootTerm(latex: string, notes: string[]) {
  const trailingFraction = findTrailingNumericFraction(latex);
  if (!trailingFraction) {
    return latex;
  }

  const { denominator, numerator, signIndex, trailingSign } = trailingFraction;
  const rootTerm = latex.slice(0, signIndex);
  if (!rootTerm.includes('\\sqrt{') || hasTopLevelAdditiveOperator(rootTerm)) {
    return latex;
  }

  notes.push('sign-cleanup');
  const fractionSign = trailingSign === '-' ? '-' : '';
  const rootJoin = rootTerm.startsWith('-') ? '' : '+';
  return `${fractionSign}\\frac{${numerator}}{${denominator}}${rootJoin}${rootTerm}`;
}

function findTrailingNumericFraction(latex: string) {
  let braces = 0;
  let parens = 0;
  for (let index = latex.length - 1; index > 0; index -= 1) {
    const character = latex[index];
    if (character === '}') {
      braces += 1;
    } else if (character === '{') {
      braces -= 1;
    } else if (braces === 0 && character === ')') {
      parens += 1;
    } else if (braces === 0 && character === '(') {
      parens -= 1;
    } else if (
      braces === 0
      && parens === 0
      && (character === '+' || character === '-')
    ) {
      const fraction = latex.slice(index + 1).match(/^\\frac\{([1-9]\d*)\}\{([1-9]\d*)\}$/u);
      if (!fraction) {
        return null;
      }
      return {
        denominator: fraction[2],
        numerator: fraction[1],
        signIndex: index,
        trailingSign: character,
      };
    }
  }
  return null;
}

function normalizeNumericScalarTimesNegativeGroup(latex: string, notes: string[]) {
  let result = '';
  let index = 0;
  let changed = false;

  while (index < latex.length) {
    const fraction = latex.slice(index).match(/^(-?)\\frac\{([1-9]\d*)\}\{([1-9]\d*)\}\(-/u);
    if (!fraction) {
      result += latex[index];
      index += 1;
      continue;
    }

    const start = index + fraction[0].length - 2;
    const end = findMatchingPlainParen(latex, start);
    if (end < 0) {
      result += latex[index];
      index += 1;
      continue;
    }

    const [, sign, numerator, denominator] = fraction;
    const inner = latex.slice(start + 2, end);
    if (inner.length === 0 || hasTopLevelAdditiveOperator(inner)) {
      result += latex[index];
      index += 1;
      continue;
    }

    notes.push('sign-cleanup');
    changed = true;
    result += sign === '-'
      ? `\\frac{${numerator}}{${denominator}}${inner}`
      : `-\\frac{${numerator}}{${denominator}}${inner}`;
    index = end + 1;
  }

  return changed ? result : latex;
}

function findMatchingBrace(source: string, openIndex: number) {
  if (source[openIndex] !== '{') {
    return -1;
  }

  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    const character = source[index];
    if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return -1;
}

function findMatchingPlainParen(source: string, openIndex: number) {
  let parens = 0;
  let braces = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    const character = source[index];
    if (character === '{') {
      braces += 1;
    } else if (character === '}') {
      braces -= 1;
    } else if (braces === 0 && character === '(') {
      parens += 1;
    } else if (braces === 0 && character === ')') {
      parens -= 1;
      if (parens === 0) {
        return index;
      }
    }
    if (braces < 0 || parens < 0) {
      return -1;
    }
  }
  return -1;
}

function hasTopLevelAdditiveOperator(latex: string) {
  let braces = 0;
  let parens = 0;
  for (let index = 0; index < latex.length; index += 1) {
    const character = latex[index];
    if (character === '{') {
      braces += 1;
    } else if (character === '}') {
      braces -= 1;
    } else if (braces === 0 && character === '(') {
      parens += 1;
    } else if (braces === 0 && character === ')') {
      parens -= 1;
    } else if (
      braces === 0
      && parens === 0
      && index > 0
      && (character === '+' || character === '-')
    ) {
      return true;
    }
  }
  return false;
}

function normalizeAdditiveIdentity(latex: string, notes: string[]) {
  let result = latex;
  result = result.replace(/^0\+(.+)$/u, (_match, inner: string) => {
    notes.push('additive-identity');
    return inner;
  });
  result = result.replace(/^(.+)\+0$/u, (_match, inner: string) => {
    notes.push('additive-identity');
    return inner;
  });
  result = result.replace(/^(.+)-0$/u, (_match, inner: string) => {
    notes.push('additive-identity');
    return inner;
  });
  result = result.replace(/^0-(.+)$/u, (_match, inner: string) => {
    notes.push('additive-identity');
    return `-${inner}`;
  });
  return result;
}

function normalizeMultiplicativeIdentity(latex: string, notes: string[]) {
  let result = latex;
  result = result.replace(/^1\\cdot\s*(.+)$/u, (_match, inner: string) => {
    notes.push('multiplicative-identity');
    return inner;
  });
  result = result.replace(/^(.+)\\cdot\s*1$/u, (_match, inner: string) => {
    notes.push('multiplicative-identity');
    return inner;
  });
  result = result.replace(/^1(?:\\,)?(\\sqrt\{.+\})$/u, (_match, radical: string) => {
    notes.push('multiplicative-identity');
    return radical;
  });
  return result;
}

function normalizeValidatedZeroProduct(
  latex: string,
  context: ExactReadbackNormalizationContext,
  notes: string[],
) {
  if (!context.validatedRootExpression) {
    return latex;
  }

  if (
    /^0(?:\\cdot\s*|\\,|\\sqrt|\\left|[A-Za-z\\]).+/u.test(latex)
    || /^.+(?:\\cdot\s*|\\,)0$/u.test(latex)
  ) {
    notes.push('validated-zero-product');
    return '0';
  }

  return latex;
}

function normalizeExternalCoefficientBeforeRadical(latex: string, notes: string[]) {
  const radicalFirst = latex.match(/^(\\sqrt\{.+\})([A-Za-z](?:_\{[^{}]+\})?)$/u);
  if (radicalFirst) {
    notes.push('coefficient-order');
    return `${radicalFirst[2]}${radicalFirst[1]}`;
  }

  const radicalFirstWithCdot = latex.match(/^(\\sqrt\{.+\})\\cdot([A-Za-z](?:_\{[^{}]+\})?)$/u);
  if (radicalFirstWithCdot) {
    notes.push('coefficient-order');
    return `${radicalFirstWithCdot[2]}${radicalFirstWithCdot[1]}`;
  }

  return latex;
}

function unwrapOuterParens(latex: string) {
  const leftRight = latex.match(/^\\left\((.+)\\right\)$/u);
  if (leftRight && hasBalancedLatexBraces(leftRight[1])) {
    return leftRight[1];
  }
  const plain = latex.match(/^\((.+)\)$/u);
  if (plain && hasBalancedLatexBraces(plain[1])) {
    return plain[1];
  }
  return latex;
}

function plainIIsImaginaryUnit(context: ExactReadbackNormalizationContext) {
  if (context.allowPlainImaginaryUnit === false) {
    return false;
  }
  if (context.variableAnalysis?.symbols.some((symbol) => symbol.name === 'i')) {
    return false;
  }
  return context.allowPlainImaginaryUnit === true
    || context.variableAnalysis?.reservedIdentifiers.some((entry) => entry.name === 'ImaginaryUnit')
    || context.domainIntent === 'complex'
    || context.validatedRootExpression === true;
}

function hasBalancedLatexBraces(latex: string) {
  let depth = 0;
  for (const character of latex) {
    if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
    }
    if (depth < 0) {
      return false;
    }
  }
  return depth === 0;
}
