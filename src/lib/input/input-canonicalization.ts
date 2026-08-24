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
  isIntegralFunctionContext,
  isReservedCanonicalFunction,
  isSpecialFunctionContext,
  normalizeSplitFunctionTokens,
  splitImplicitFunctionSuffix,
} from './function-canonicalization';
import { canonicalizeAsciiOperatorExpression } from './ascii-operator-canonicalization';
import {
  normalizeDerivativeDisplay,
  normalizeDerivativeShortcuts,
  normalizeDerivativeTokens,
} from './derivative-token-canonicalization';
import { canonicalizeCalculateTextualNthRoots } from './calculate-textual-nth-root';

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

function isFunctionPrefixBoundaryChar(char: string | undefined) {
  return isBoundaryChar(char) || (char !== undefined && /\d/.test(char));
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

function collectPowerArgument(source: string, start: number) {
  if (source[start] !== '^') {
    return null;
  }

  let index = start + 1;
  while (index < source.length && /\s/.test(source[index])) {
    index += 1;
  }

  const grouped = collectGroupedArgument(source, index);
  if (grouped) {
    return {
      before: source.slice(start, grouped.nextIndex),
      body: grouped.body,
      nextIndex: grouped.nextIndex,
    };
  }

  const bodyStart = index;
  while (index < source.length && !isBoundaryChar(source[index])) {
    index += 1;
  }

  if (index === bodyStart) {
    return null;
  }

  return {
    before: source.slice(start, index),
    body: source.slice(bodyStart, index),
    nextIndex: index,
  };
}

type CanonicalizeSegmentOptions = {
  normalizeImaginaryUnit?: boolean;
  enableSpecialFunctions?: boolean;
  canonicalizationScope?: 'all' | 'special-functions';
};

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

function normalizeGroupedPowers(source: string, changes: CanonicalizationChange[], options: CanonicalizeSegmentOptions = {}) {
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
    const after = `^{${canonicalizeSegment(grouped.body, changes, options)}}`;
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

/** Convert the textbook paste forms log_9(x) and \\log_9(x) before token parsing. */
export function normalizeNumericLogBaseSyntax(source: string, changes?: CanonicalizationChange[]) {
  return source.replace(
    /(^|[^A-Za-z\\])(?:\\log|log)_\{?(\d+)\}?(?=\s*(?:\\left\s*)?\()/gu,
    (match, prefix: string, base: string) => {
      const normalized = `${prefix}\\log_{${base}}`;
      if (normalized !== match) {
        changes?.push({ kind: 'function-token', before: match, after: normalized });
      }
      return normalized;
    },
  );
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
  const numericLogBaseNormalized = normalizeNumericLogBaseSyntax(latex, changes);
  const splitFunctionNormalized = normalizeSplitFunctionTokens(numericLogBaseNormalized, changes, {
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
      canonicalizationScope: isIntegralFunctionContext(context) ? 'all' : 'special-functions',
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
  options: CanonicalizeSegmentOptions,
) {
  const quotient = collectExplicitGroupedQuotient(body);
  const explicitQuotient = canonicalizeExplicitGroupedQuotient(quotient, changes, options);
  return explicitQuotient ?? canonicalizeSegment(body, changes, options);
}

function canonicalizeExplicitGroupedQuotient(
  quotient: ReturnType<typeof collectExplicitGroupedQuotient>,
  changes: CanonicalizationChange[],
  options: CanonicalizeSegmentOptions,
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
      ? `\\left|${canonicalBody}\\right|`
      : `${canonicalCommandFor(tokenLower)}(${canonicalBody})`;
}

function canonicalizeSegment(
  source: string,
  changes: CanonicalizationChange[],
  options: CanonicalizeSegmentOptions = {},
): string {
  const operatorCanonical = canonicalizeAsciiOperatorExpression(
    source,
    (part) => canonicalizeSegment(part, changes, options),
    (before, after) => {
      changes.push({
        kind: 'operator-token',
        before,
        after,
      });
    },
  );

  return operatorCanonical ?? canonicalizeAtomicSegment(source, changes, options);
}

function canonicalizeAtomicSegment(
  source: string,
  changes: CanonicalizationChange[],
  options: CanonicalizeSegmentOptions = {},
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
    const implicitFunction = splitImplicitFunctionSuffix(
      token,
      tokenLower,
      source.slice(nextIndex),
      previous,
      options,
    );
    const functionPrefix = implicitFunction?.prefix ?? '';
    const functionTokenLower = implicitFunction?.functionTokenLower ?? tokenLower;

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

    if (
      !isReservedCanonicalFunction(functionTokenLower, options)
      || (!implicitFunction && !isFunctionPrefixBoundaryChar(previous))
    ) {
      result += token;
      index = nextIndex;
      continue;
    }

    let scanIndex = nextIndex;
    while (scanIndex < source.length && /\s/.test(source[scanIndex])) {
      scanIndex += 1;
    }

    const powerArgument = collectPowerArgument(source, scanIndex);
    if (powerArgument && functionTokenLower !== 'sqrt' && functionTokenLower !== 'abs') {
      const argumentStart = skipWhitespace(source, powerArgument.nextIndex);
      if (source[argumentStart] === '(' || source.startsWith('\\left', argumentStart)) {
        const balanced = collectGroupedArgument(source, argumentStart);
        if (balanced) {
          const canonicalExponent = canonicalizeSegment(powerArgument.body, changes, options);
          const canonicalBody = canonicalizeFunctionArgumentBody(balanced.body, changes, options);
          const canonical = `${functionPrefix}${canonicalCommandFor(functionTokenLower)}^{${canonicalExponent}}(${canonicalBody})`;

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

    const nextChar = source[scanIndex];
    if (nextChar === '(' || source.startsWith('\\left', scanIndex)) {
      const balanced = collectGroupedArgument(source, scanIndex);
      if (!balanced) {
        const canonical =
          functionTokenLower === 'sqrt'
            ? '\\sqrt('
            : functionTokenLower === 'abs'
              ? `${canonicalCommandFor(functionTokenLower)}(`
              : `${canonicalCommandFor(functionTokenLower)}(`;

        changes.push({
          kind: 'function-token',
          before: source.slice(index, scanIndex + 1),
          after: `${functionPrefix}${canonical}`,
        });

        result += `${functionPrefix}${canonical}`;
        index = scanIndex + 1;
        continue;
      }

      const canonicalBody = canonicalizeFunctionArgumentBody(balanced.body, changes, options);
      const canonical = `${functionPrefix}${canonicalFunctionLatex(functionTokenLower, canonicalBody)}`;

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
        const canonical = `${functionPrefix}${canonicalFunctionLatex(functionTokenLower, canonicalArg)}`;

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
  const textualNthRootNormalized = context.mode === 'calculate'
    ? canonicalizeCalculateTextualNthRoots(trimmed)
    : { ok: true as const, latex: trimmed, changes: [] };
  if (!textualNthRootNormalized.ok) {
    return {
      ok: false,
      originalLatex,
      error: textualNthRootNormalized.error,
    };
  }
  changes.push(...textualNthRootNormalized.changes);
  const specialFunctionContext = isSpecialFunctionContext(context);
  const integralBoundsNormalized = normalizeEmptyIntegralBounds(textualNthRootNormalized.latex, changes);
  const integralSpacingNormalized = normalizeIntegralSpacing(integralBoundsNormalized);
  const numericLogBaseNormalized = normalizeNumericLogBaseSyntax(integralSpacingNormalized, changes);
  const splitFunctionsNormalized = normalizeSplitFunctionTokens(numericLogBaseNormalized, changes, {
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
  const groupedPowerNormalized = normalizeGroupedPowers(numericPowerNormalized, changes, { normalizeImaginaryUnit: context.mode === 'equation', enableSpecialFunctions: specialFunctionContext });
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
