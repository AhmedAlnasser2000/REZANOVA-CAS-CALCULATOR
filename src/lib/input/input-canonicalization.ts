import type {
  CanonicalizationChange,
  CanonicalizationContext,
  CanonicalizationResult,
} from '../../types/calculator';
import {
  EQUATION_IMAGINARY_UNIT_LATEX,
  EQUATION_IMAGINARY_UNIT_SYMBOL,
} from '../equation/complex-input-policy';
import { isDerivativeShortcutContext } from './derivative-shortcuts';
import {
  COMMAND_FUNCTION_NAMES,
  canonicalCommandFor,
  isReservedCanonicalFunction,
  isSpecialFunctionContext,
  normalizeSplitFunctionTokens,
} from './function-canonicalization';

const DERIVATIVE_PATTERN = /(^|[^\\A-Za-z])d\s*\/\s*d([xyz])\b/g;
const DISPLAY_DERIVATIVE_PATTERN = /\\frac\{\\mathrm\{d\}\}\{\\mathrm\{d\}([xyz])\}/g;
const DERIVATIVE_SHORTCUT_VARIABLE_SOURCE = '(?:theta|alpha|beta|gamma|delta|lambda|mu|[A-Za-z])';
const ORDINARY_DERIVATIVE_SHORTCUT_PATTERN = new RegExp(
  `(^|[^\\\\A-Za-z])dd(${DERIVATIVE_SHORTCUT_VARIABLE_SOURCE})\\b`,
  'g',
);
const PARTIAL_DERIVATIVE_SHORTCUT_PATTERN = new RegExp(
  `(^|[^\\\\A-Za-z])pd(${DERIVATIVE_SHORTCUT_VARIABLE_SOURCE})\\b`,
  'g',
);
const PARTIAL_SYMBOL_SHORTCUT_PATTERN = /(^|[^\\A-Za-z])pd\b/g;
const MATH_SPACING_PATTERN_SOURCE = '(?:\\\\[,;:! ]|\\\\thinspace|\\\\medspace|\\\\quad|\\\\qquad|~|\\s)+';
const TRAILING_MATH_SPACING_PATTERN = new RegExp(`${MATH_SPACING_PATTERN_SOURCE}$`);
const INFIX_OPERATOR_PATTERN_SOURCE = '([+\\-*/=,;:<>^_])';
const OPERATOR_SPACING_BEFORE_PATTERN = new RegExp(
  `${MATH_SPACING_PATTERN_SOURCE}${INFIX_OPERATOR_PATTERN_SOURCE}`,
  'g',
);
const OPERATOR_SPACING_AFTER_PATTERN = new RegExp(
  `${INFIX_OPERATOR_PATTERN_SOURCE}${MATH_SPACING_PATTERN_SOURCE}`,
  'g',
);
const COMMAND_OPERATOR_SPACING_BEFORE_PATTERN = new RegExp(
  `${MATH_SPACING_PATTERN_SOURCE}(\\\\(?:times|cdot|div|pm|mp|le|ge|ne|approx|equiv)(?![A-Za-z]))`,
  'g',
);
const COMMAND_OPERATOR_SPACING_AFTER_PATTERN = new RegExp(
  `(\\\\(?:times|cdot|div|pm|mp|le|ge|ne|approx|equiv)(?![A-Za-z]))${MATH_SPACING_PATTERN_SOURCE}`,
  'g',
);
const UNGROUPED_MULTI_DIGIT_POWER_PATTERN = /\^(?!\{)(-?\d{2,})(?![A-Za-z])/g;

function isIdentifierStart(char: string) {
  return /[A-Za-z]/.test(char);
}

function isIdentifierChar(char: string) {
  return /[A-Za-z]/.test(char);
}

function isBoundaryChar(char: string | undefined) {
  return char === undefined || /[\s,+\-*/^=()[\]{}]/.test(char);
}

function collectCommand(source: string, start: number) {
  let index = start + 1;
  while (index < source.length && /[A-Za-z]/.test(source[index])) {
    index += 1;
  }

  return {
    value: source.slice(start, index),
    nextIndex: index,
  };
}

function matchingCloseFor(open: string) {
  if (open === '(') {
    return ')';
  }
  if (open === '{') {
    return '}';
  }
  if (open === '[') {
    return ']';
  }
  return '';
}

function collectBalancedSegment(source: string, start: number) {
  const open = source[start];
  const close = matchingCloseFor(open);
  if (!close) {
    return null;
  }

  let depth = 0;
  let index = start;
  while (index < source.length) {
    const char = source[index];
    if (char === '\\') {
      const command = collectCommand(source, index);
      if (command.value === '\\left' || command.value === '\\right') {
        index = command.nextIndex;
        continue;
      }
      index = command.nextIndex;
      continue;
    }

    if (char === open) {
      depth += 1;
    } else if (char === close) {
      depth -= 1;
      if (depth === 0) {
        return {
          fullText: source.slice(start, index + 1),
          body: source.slice(start + 1, index),
          nextIndex: index + 1,
        };
      }
    }

    index += 1;
  }

  return null;
}

function stripLatexFenceCommands(source: string) {
  return source.replace(/\\left\s*/g, '').replace(/\\right\s*/g, '');
}

function collectGroupedArgument(source: string, start: number) {
  let groupStart = start;
  if (source.startsWith('\\left', start)) {
    const leftCommand = collectCommand(source, start);
    groupStart = leftCommand.nextIndex;
    while (groupStart < source.length && /\s/.test(source[groupStart])) {
      groupStart += 1;
    }
  }

  if (
    source[groupStart] !== '('
    && source[groupStart] !== '{'
    && source[groupStart] !== '['
  ) {
    return null;
  }

  const balanced = collectBalancedSegment(source, groupStart);
  if (!balanced) {
    return null;
  }

  return {
    fullText: source.slice(start, balanced.nextIndex),
    body: stripLatexFenceCommands(balanced.body).trim(),
    nextIndex: balanced.nextIndex,
  };
}

function skipWhitespace(source: string, start: number) {
  let index = start;
  while (index < source.length && /\s/.test(source[index])) {
    index += 1;
  }
  return index;
}

function collectExplicitGroupedQuotient(source: string) {
  const trimmed = source.trim();
  const numerator = collectGroupedArgument(trimmed, 0);
  if (!numerator) {
    return null;
  }

  let index = skipWhitespace(trimmed, numerator.nextIndex);
  if (trimmed[index] !== '/') {
    return null;
  }

  index = skipWhitespace(trimmed, index + 1);
  const denominator = collectGroupedArgument(trimmed, index);
  if (!denominator) {
    return null;
  }

  if (skipWhitespace(trimmed, denominator.nextIndex) !== trimmed.length) {
    return null;
  }

  return {
    source: trimmed,
    numerator: numerator.body,
    denominator: denominator.body,
  };
}

function collectSimpleArgument(source: string, start: number) {
  let index = start;
  while (index < source.length && /\s/.test(source[index])) {
    index += 1;
  }

  if (index >= source.length) {
    return null;
  }

  if (source[index] === '\\') {
    const command = collectCommand(source, index);
    if (
      command.value === '\\pi'
      || command.value === '\\infty'
      || command.value === '\\sqrt'
      || COMMAND_FUNCTION_NAMES.has(command.value)
      || command.value.startsWith('\\operatorname')
    ) {
      index = command.nextIndex;
      if (source[index] === '{' || source[index] === '(' || source[index] === '[') {
        const balanced = collectBalancedSegment(source, index);
        if (balanced) {
          return {
            value: source.slice(start, balanced.nextIndex),
            body: source.slice(start, balanced.nextIndex).trim(),
            nextIndex: balanced.nextIndex,
          };
        }
      }
      return {
        value: source.slice(start, index),
        body: source.slice(start, index).trim(),
        nextIndex: index,
      };
    }
  }

  if (
    source[index] === '('
    || source[index] === '{'
    || source[index] === '['
    || source.startsWith('\\left', index)
  ) {
    const balanced = collectGroupedArgument(source, index);
    if (!balanced) {
      return null;
    }
    return {
      value: source.slice(start, balanced.nextIndex),
      body: source.slice(start, balanced.nextIndex).trim(),
      nextIndex: balanced.nextIndex,
    };
  }

  while (index < source.length && !isBoundaryChar(source[index])) {
    index += 1;
  }

  if (index === start) {
    return null;
  }

  return {
    value: source.slice(start, index),
    body: source.slice(start, index).trim(),
    nextIndex: index,
  };
}

function normalizeDerivativeDisplay(source: string) {
  return source.replace(DISPLAY_DERIVATIVE_PATTERN, (_match, variable: string) => `\\frac{d}{d${variable}}`);
}

function normalizeDerivativeTokens(source: string, changes: CanonicalizationChange[]) {
  return source.replace(DERIVATIVE_PATTERN, (match, prefix: string, variable: string) => {
    const after = `${prefix}\\frac{d}{d${variable}}`;
    changes.push({
      kind: 'derivative-token',
      before: match,
      after,
    });
    return after;
  });
}

function derivativeShortcutVariableLatex(variable: string) {
  return variable.length === 1 ? variable : `\\${variable}`;
}

function normalizeDerivativeShortcuts(source: string, changes: CanonicalizationChange[]) {
  let next = source.replace(
    ORDINARY_DERIVATIVE_SHORTCUT_PATTERN,
    (match, prefix: string, variable: string) => {
      const variableLatex = derivativeShortcutVariableLatex(variable);
      const after = `${prefix}\\frac{d}{d${variableLatex}}`;
      changes.push({
        kind: 'derivative-token',
        before: match,
        after,
      });
      return after;
    },
  );

  next = next.replace(
    PARTIAL_DERIVATIVE_SHORTCUT_PATTERN,
    (match, prefix: string, variable: string) => {
      const variableLatex = derivativeShortcutVariableLatex(variable);
      const after = `${prefix}\\frac{\\partial}{\\partial ${variableLatex}}`;
      changes.push({
        kind: 'derivative-token',
        before: match,
        after,
      });
      return after;
    },
  );

  return next.replace(PARTIAL_SYMBOL_SHORTCUT_PATTERN, (match, prefix: string) => {
    const after = `${prefix}\\partial`;
    changes.push({
      kind: 'derivative-token',
      before: match,
      after,
    });
    return after;
  });
}

function normalizeUngroupedNumericPowers(source: string, changes: CanonicalizationChange[]) {
  return source.replace(UNGROUPED_MULTI_DIGIT_POWER_PATTERN, (match, exponent: string) => {
    const after = `^{${exponent}}`;
    changes.push({
      kind: 'operator-token',
      before: match,
      after,
    });
    return after;
  });
}

function normalizeGroupedPowers(source: string, changes: CanonicalizationChange[]) {
  let result = '';
  let index = 0;

  while (index < source.length) {
    if (source[index] !== '^') {
      result += source[index];
      index += 1;
      continue;
    }

    let scanIndex = index + 1;
    while (scanIndex < source.length && /\s/.test(source[scanIndex])) {
      scanIndex += 1;
    }

    const grouped = collectGroupedArgument(source, scanIndex);
    if (!grouped) {
      result += source[index];
      index += 1;
      continue;
    }

    const before = source.slice(index, grouped.nextIndex);
    const after = `^{${grouped.body}}`;
    changes.push({
      kind: 'operator-token',
      before,
      after,
    });
    result += after;
    index = grouped.nextIndex;
  }

  return result;
}

function normalizeExponentialEBase(source: string, changes: CanonicalizationChange[]) {
  let result = '';
  let index = 0;

  while (index < source.length) {
    const previous = index > 0 ? source[index - 1] : undefined;
    if (source[index] !== 'e' || !isBoundaryChar(previous)) {
      result += source[index];
      index += 1;
      continue;
    }

    let scanIndex = index + 1;
    while (scanIndex < source.length && /\s/.test(source[scanIndex])) {
      scanIndex += 1;
    }

    if (source[scanIndex] !== '^') {
      result += source[index];
      index += 1;
      continue;
    }

    scanIndex += 1;
    while (scanIndex < source.length && /\s/.test(source[scanIndex])) {
      scanIndex += 1;
    }

    let exponent: { body: string; nextIndex: number } | null = null;
    if (source[scanIndex] === '{') {
      exponent = collectBalancedSegment(source, scanIndex);
    } else {
      exponent = collectGroupedArgument(source, scanIndex);
    }

    if (!exponent) {
      result += source[index];
      index += 1;
      continue;
    }

    const before = source.slice(index, exponent.nextIndex);
    const after = `\\exponentialE^{${exponent.body}}`;
    changes.push({
      kind: 'constant-token',
      before,
      after,
    });
    result += after;
    index = exponent.nextIndex;
  }

  return result;
}

function isEmptyIntegralBound(content: string) {
  const normalized = content
    .replace(/\\placeholder\s*\{\s*\}/g, '')
    .replace(/\\Placeholder\s*\{\s*\}/g, '')
    .replace(/#\?/g, '')
    .replace(/\\Box|\\square|\\blacksquare/g, '')
    .replace(/\\,|\\:|\\;|\\!|\\thinspace|\\medspace|\\quad|\\qquad/g, '')
    .trim();

  return normalized.length === 0;
}

function collectIntegralScript(source: string, start: number) {
  const marker = source[start];
  if (marker !== '_' && marker !== '^') {
    return null;
  }

  let index = start + 1;
  while (index < source.length && /\s/.test(source[index])) {
    index += 1;
  }

  if (source[index] !== '{') {
    return null;
  }

  const balanced = collectBalancedSegment(source, index);
  if (!balanced) {
    return null;
  }

  return {
    marker,
    body: stripLatexFenceCommands(balanced.body),
    nextIndex: balanced.nextIndex,
  };
}

function normalizeEmptyIntegralBounds(source: string, changes: CanonicalizationChange[]) {
  let result = '';
  let index = 0;

  while (index < source.length) {
    if (source[index] !== '\\') {
      result += source[index];
      index += 1;
      continue;
    }

    const command = collectCommand(source, index);
    if (command.value !== '\\int') {
      result += command.value;
      index = command.nextIndex;
      continue;
    }

    let scanIndex = command.nextIndex;
    while (scanIndex < source.length && /\s/.test(source[scanIndex])) {
      scanIndex += 1;
    }

    if (source.startsWith('\\limits', scanIndex)) {
      scanIndex += '\\limits'.length;
      while (scanIndex < source.length && /\s/.test(source[scanIndex])) {
        scanIndex += 1;
      }
    }

    const scripts: Array<{ marker: string; body: string; nextIndex: number }> = [];
    for (let scriptCount = 0; scriptCount < 2; scriptCount += 1) {
      const script = collectIntegralScript(source, scanIndex);
      if (!script) {
        break;
      }
      scripts.push(script);
      scanIndex = script.nextIndex;
      while (scanIndex < source.length && /\s/.test(source[scanIndex])) {
        scanIndex += 1;
      }
    }

    const hasLower = scripts.some((script) => script.marker === '_');
    const hasUpper = scripts.some((script) => script.marker === '^');
    const hasOnlyEmptyBounds =
      scripts.length === 2
      && hasLower
      && hasUpper
      && scripts.every((script) => isEmptyIntegralBound(script.body));

    if (hasOnlyEmptyBounds) {
      const before = source.slice(index, scanIndex);
      const after = scanIndex < source.length ? '\\int ' : '';
      changes.push({
        kind: 'integral-bounds-token',
        before,
        after,
      });
      result += after;
      index = scanIndex;
      continue;
    }

    result += command.value;
    index = command.nextIndex;
  }

  return result;
}

function normalizeIntegralSpacing(source: string) {
  return source.replace(/\\int(?=[A-Za-z0-9\\(])/g, '\\int ');
}

export function normalizeRelationOperatorLatex(latex: string) {
  return latex
    .replace(/\\leq(?:slant)?(?![A-Za-z])/g, '\\le')
    .replace(/\\geq(?:slant)?(?![A-Za-z])/g, '\\ge')
    .replace(/\\neq(?![A-Za-z])/g, '\\ne')
    .replace(/[≤≦]/g, '\\le')
    .replace(/[≥≧]/g, '\\ge')
    .replace(/≠/g, '\\ne')
    .replace(/<\s*=/g, '\\le')
    .replace(/>\s*=/g, '\\ge')
    .replace(/=\s*</g, '\\le')
    .replace(/=\s*>/g, '\\ge')
    .replace(/!\s*=/g, '\\ne');
}

export function normalizeLiveInputOperatorLatex(
  latex: string,
  context?: Pick<CanonicalizationContext, 'mode' | 'screenHint'>,
) {
  const changes: CanonicalizationChange[] = [];
  const specialFunctionContext = isSpecialFunctionContext(context);
  const splitFunctionNormalized = normalizeSplitFunctionTokens(latex, changes, {
    enableSpecialFunctions: specialFunctionContext,
  });
  const derivativeShortcutNormalized = isDerivativeShortcutContext(context)
    ? normalizeDerivativeShortcuts(splitFunctionNormalized, changes)
    : splitFunctionNormalized;
  const operatorNormalized = normalizeUngroupedNumericPowers(
    normalizeRelationOperatorLatex(derivativeShortcutNormalized),
    changes,
  );
  return specialFunctionContext
    ? canonicalizeSegment(operatorNormalized, changes, {
      enableSpecialFunctions: true,
      canonicalizationScope: 'special-functions',
    })
    : operatorNormalized;
}

function normalizeRelationOperatorTokens(source: string, changes: CanonicalizationChange[]) {
  const normalized = normalizeRelationOperatorLatex(source);
  if (normalized !== source) {
    changes.push({
      kind: 'operator-token',
      before: source,
      after: normalized,
    });
  }
  return normalized;
}

export function normalizeHarmlessMathSpacing(latex: string) {
  let next = latex;
  let previous = '';

  while (next !== previous) {
    previous = next;
    next = next
      .replace(OPERATOR_SPACING_BEFORE_PATTERN, '$1')
      .replace(OPERATOR_SPACING_AFTER_PATTERN, '$1')
      .replace(COMMAND_OPERATOR_SPACING_BEFORE_PATTERN, '$1')
      .replace(COMMAND_OPERATOR_SPACING_AFTER_PATTERN, '$1 ')
      .replace(TRAILING_MATH_SPACING_PATTERN, '');
  }

  return next;
}

function canonicalizeFunctionArgumentBody(
  body: string,
  changes: CanonicalizationChange[],
  options: {
    normalizeImaginaryUnit?: boolean;
    enableSpecialFunctions?: boolean;
    canonicalizationScope?: 'all' | 'special-functions';
  },
) {
  const quotient = collectExplicitGroupedQuotient(body);
  const explicitQuotient = canonicalizeExplicitGroupedQuotient(quotient, changes, options);
  return explicitQuotient ?? canonicalizeSegment(body, changes, options);
}

function canonicalizeExplicitGroupedQuotient(
  quotient: ReturnType<typeof collectExplicitGroupedQuotient>,
  changes: CanonicalizationChange[],
  options: {
    normalizeImaginaryUnit?: boolean;
    enableSpecialFunctions?: boolean;
    canonicalizationScope?: 'all' | 'special-functions';
  },
) {
  if (!quotient) {
    return null;
  }
  const numerator = canonicalizeSegment(quotient.numerator, changes, options);
  const denominator = canonicalizeSegment(quotient.denominator, changes, options);
  const after = `\\frac{${numerator}}{${denominator}}`;
  changes.push({
    kind: 'operator-token',
    before: quotient.source,
    after,
  });
  return after;
}

function canonicalFunctionLatex(tokenLower: string, canonicalBody: string) {
  return tokenLower === 'sqrt'
    ? `\\sqrt{${canonicalBody}}`
    : tokenLower === 'abs'
      ? `${canonicalCommandFor(tokenLower)}(${canonicalBody})`
      : `${canonicalCommandFor(tokenLower)}(${canonicalBody})`;
}

function canonicalizeSegment(
  source: string,
  changes: CanonicalizationChange[],
  options: {
    normalizeImaginaryUnit?: boolean;
    enableSpecialFunctions?: boolean;
    canonicalizationScope?: 'all' | 'special-functions';
  } = {},
): string {
  let result = '';
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    if (char === '\\') {
      const command = collectCommand(source, index);
      const commandName = COMMAND_FUNCTION_NAMES.get(command.value);
      if (commandName) {
        const scanIndex = skipWhitespace(source, command.nextIndex);
        if (source[scanIndex] === '(' || source.startsWith('\\left', scanIndex)) {
          const balanced = collectGroupedArgument(source, scanIndex);
          if (balanced) {
            const canonicalBody = canonicalizeExplicitGroupedQuotient(
              collectExplicitGroupedQuotient(balanced.body),
              changes,
              options,
            );
            if (canonicalBody) {
              const canonical = `${command.value}(${canonicalBody})`;
              changes.push({
                kind: 'function-token',
                before: source.slice(index, balanced.nextIndex),
                after: canonical,
              });
              result += canonical;
              index = balanced.nextIndex;
              continue;
            }
          }
        }
      }
      result += command.value;
      index = command.nextIndex;
      continue;
    }

    if (!isIdentifierStart(char)) {
      result += char;
      index += 1;
      continue;
    }

    let nextIndex = index + 1;
    while (nextIndex < source.length && isIdentifierChar(source[nextIndex])) {
      nextIndex += 1;
    }
    const token = source.slice(index, nextIndex);
    const tokenLower = token.toLowerCase();
    const previous = index > 0 ? source[index - 1] : undefined;
    const next = source[nextIndex];

    if (
      options.canonicalizationScope !== 'special-functions'
      && tokenLower === 'pi'
      && isBoundaryChar(previous)
      && isBoundaryChar(next)
    ) {
      changes.push({
        kind: 'constant-token',
        before: token,
        after: '\\pi',
      });
      result += '\\pi';
      index = nextIndex;
      continue;
    }

    if (
      options.canonicalizationScope !== 'special-functions'
      && options.normalizeImaginaryUnit
      && token === EQUATION_IMAGINARY_UNIT_SYMBOL
      && isBoundaryChar(previous)
      && isBoundaryChar(next)
    ) {
      changes.push({
        kind: 'constant-token',
        before: token,
        after: EQUATION_IMAGINARY_UNIT_LATEX,
      });
      result += EQUATION_IMAGINARY_UNIT_LATEX;
      index = nextIndex;
      continue;
    }

    if (!isReservedCanonicalFunction(tokenLower, options) || !isBoundaryChar(previous)) {
      result += token;
      index = nextIndex;
      continue;
    }

    let scanIndex = nextIndex;
    while (scanIndex < source.length && /\s/.test(source[scanIndex])) {
      scanIndex += 1;
    }

    const nextChar = source[scanIndex];
    if (nextChar === '(' || source.startsWith('\\left', scanIndex)) {
      const balanced = collectGroupedArgument(source, scanIndex);
      if (!balanced) {
        const canonical =
          tokenLower === 'sqrt'
            ? '\\sqrt('
            : tokenLower === 'abs'
              ? `${canonicalCommandFor(tokenLower)}(`
              : `${canonicalCommandFor(tokenLower)}(`;

        changes.push({
          kind: 'function-token',
          before: source.slice(index, scanIndex + 1),
          after: canonical,
        });

        result += canonical;
        index = scanIndex + 1;
        continue;
      }

      const canonicalBody = canonicalizeFunctionArgumentBody(balanced.body, changes, options);
      const canonical = canonicalFunctionLatex(tokenLower, canonicalBody);

      changes.push({
        kind: 'function-token',
        before: source.slice(index, balanced.nextIndex),
        after: canonical,
      });

      result += canonical;
      index = balanced.nextIndex;
      continue;
    }

    if (scanIndex > nextIndex) {
      const simpleArgument = collectSimpleArgument(source, nextIndex);
      if (simpleArgument) {
        const canonicalArg = canonicalizeFunctionArgumentBody(simpleArgument.body, changes, options);
        const canonical = canonicalFunctionLatex(tokenLower, canonicalArg);

        changes.push({
          kind: 'function-token',
          before: source.slice(index, simpleArgument.nextIndex),
          after: canonical,
        });

        result += canonical;
        index = simpleArgument.nextIndex;
        continue;
      }
    }

    result += token;
    index = nextIndex;
  }

  return result;
}

export function canonicalizeMathInput(
  latex: string,
  context: CanonicalizationContext,
): CanonicalizationResult {
  const originalLatex = latex;
  const trimmed = latex.trim();
  if (!trimmed) {
    return {
      ok: true,
      originalLatex,
      canonicalLatex: trimmed,
      changes: [],
    };
  }

  const changes: CanonicalizationChange[] = [];
  const specialFunctionContext = isSpecialFunctionContext(context);
  const integralBoundsNormalized = normalizeEmptyIntegralBounds(trimmed, changes);
  const integralSpacingNormalized = normalizeIntegralSpacing(integralBoundsNormalized);
  const splitFunctionsNormalized = normalizeSplitFunctionTokens(integralSpacingNormalized, changes, {
    enableSpecialFunctions: specialFunctionContext,
  });
  const derivativeShortcutNormalized = isDerivativeShortcutContext(context)
    ? normalizeDerivativeShortcuts(splitFunctionsNormalized, changes)
    : splitFunctionsNormalized;
  const derivativeDisplayNormalized = normalizeDerivativeDisplay(derivativeShortcutNormalized);
  const derivativeNormalized = normalizeDerivativeTokens(derivativeDisplayNormalized, changes);
  const relationNormalized = normalizeRelationOperatorTokens(derivativeNormalized, changes);
  const exponentialNormalized = normalizeExponentialEBase(relationNormalized, changes);
  const numericPowerNormalized = normalizeUngroupedNumericPowers(exponentialNormalized, changes);
  const groupedPowerNormalized = normalizeGroupedPowers(numericPowerNormalized, changes);
  const spacingNormalized = normalizeHarmlessMathSpacing(groupedPowerNormalized);
  const canonicalLatex = canonicalizeSegment(spacingNormalized, changes, {
    normalizeImaginaryUnit: context.mode === 'equation',
    enableSpecialFunctions: specialFunctionContext,
  });

  return {
    ok: true,
    originalLatex,
    canonicalLatex,
    changes,
  };
}

export function trimHarmlessTrailingMathSpacing(latex: string) {
  return normalizeHarmlessMathSpacing(latex);
}
