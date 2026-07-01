import type {
  DerivativeVariable,
  MathNotationDisplay,
} from '../../types/calculator';
import {
  DEFAULT_DERIVATIVE_VARIABLE,
  derivativeVariableLatex,
  parseDerivativeVariable,
} from './derivative-target';

export const MAX_DERIVATIVE_OPERATOR_ORDER = 10;

export type DerivativeOperatorKind = 'derivative' | 'partial';

export type DerivativeOperatorFactor = {
  variable: DerivativeVariable;
  exponent: number;
};

export type DerivativeOperatorSpec = {
  kind: DerivativeOperatorKind;
  order: number;
  writtenFactors: DerivativeOperatorFactor[];
  appliedPath: DerivativeVariable[];
  canonicalLatex: string;
};

export type DerivativeOperatorParseResult =
  | { ok: true; operator: DerivativeOperatorSpec }
  | { ok: false; error: string };

const GREEK_DISPLAY: Record<string, string> = {
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  lambda: 'λ',
  mu: 'μ',
  theta: 'θ',
};

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
};

const DIGIT_SUPERSCRIPT: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
};
const GREEK_INPUT_NAMES = ['lambda', 'alpha', 'gamma', 'delta', 'theta', 'beta', 'mu'];

function normalizeSuperscripts(input: string) {
  return input.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/gu, (digits) =>
    `^${[...digits].map((digit) => SUPERSCRIPT_DIGITS[digit] ?? digit).join('')}`);
}

function compactOperatorInput(input: string) {
  return normalizeSuperscripts(input)
    .replace(/\\left|\\right/g, '')
    .replace(/\s+/g, '')
    .replace(/∂/g, '\\partial')
    .replace(/δ/g, '\\delta')
    .replace(/θ/g, '\\theta')
    .replace(/λ/g, '\\lambda')
    .replace(/μ/g, '\\mu')
    .replace(/α/g, '\\alpha')
    .replace(/β/g, '\\beta')
    .replace(/γ/g, '\\gamma');
}

function parsePositiveOrder(input: string | undefined) {
  if (!input) {
    return 1;
  }
  const normalized = input.replace(/[{}]/g, '');
  if (!/^\d+$/.test(normalized)) {
    return null;
  }
  const value = Number(normalized);
  return Number.isInteger(value) && value >= 1 ? value : null;
}

function readExponent(source: string, index: number) {
  if (source[index] !== '^') {
    return { exponent: 1, nextIndex: index };
  }
  if (source[index + 1] === '{') {
    const endIndex = source.indexOf('}', index + 2);
    if (endIndex < 0) {
      return null;
    }
    const exponent = parsePositiveOrder(source.slice(index + 2, endIndex));
    return exponent === null ? null : { exponent, nextIndex: endIndex + 1 };
  }

  let endIndex = index + 1;
  while (endIndex < source.length && /\d/.test(source[endIndex])) {
    endIndex += 1;
  }
  const exponent = parsePositiveOrder(source.slice(index + 1, endIndex));
  return exponent === null ? null : { exponent, nextIndex: endIndex };
}

function readVariableToken(source: string, index: number) {
  if (source[index] === '\\') {
    let endIndex = index + 1;
    while (endIndex < source.length && /[A-Za-z]/.test(source[endIndex])) {
      endIndex += 1;
    }
    return { token: source.slice(index, endIndex), nextIndex: endIndex };
  }

  const greekName = GREEK_INPUT_NAMES.find((name) => source.startsWith(name, index));
  if (greekName) {
    return { token: greekName, nextIndex: index + greekName.length };
  }

  return { token: source[index] ?? '', nextIndex: index + 1 };
}

function buildAppliedPath(factors: readonly DerivativeOperatorFactor[]) {
  const path: DerivativeVariable[] = [];
  for (const factor of [...factors].reverse()) {
    for (let index = 0; index < factor.exponent; index += 1) {
      path.push(factor.variable);
    }
  }
  return path;
}

function factorLatex(factor: DerivativeOperatorFactor, prefix: 'd' | '\\partial') {
  const variableLatex = derivativeVariableLatex(factor.variable);
  const exponent = factor.exponent === 1 ? '' : `^{${factor.exponent}}`;
  return prefix === '\\partial'
    ? `${prefix} ${variableLatex}${exponent}`
    : `${prefix}${variableLatex}${exponent}`;
}

function canonicalLatex(
  kind: DerivativeOperatorKind,
  order: number,
  factors: readonly DerivativeOperatorFactor[],
) {
  if (kind === 'derivative') {
    const variableLatex = derivativeVariableLatex(factors[0]?.variable ?? DEFAULT_DERIVATIVE_VARIABLE);
    return order === 1
      ? `\\frac{d}{d${variableLatex}}`
      : `\\frac{d^{${order}}}{d${variableLatex}^{${order}}}`;
  }

  const numerator = order === 1 ? '\\partial' : `\\partial^{${order}}`;
  const denominator = factors.map((factor) => factorLatex(factor, '\\partial')).join('');
  return `\\frac{${numerator}}{${denominator}}`;
}

function makeOperator(
  kind: DerivativeOperatorKind,
  factors: readonly DerivativeOperatorFactor[],
  declaredOrder?: number,
): DerivativeOperatorParseResult {
  if (factors.length === 0) {
    return { ok: false, error: 'Enter a derivative operator.' };
  }

  const order = factors.reduce((sum, factor) => sum + factor.exponent, 0);
  if (declaredOrder !== undefined && declaredOrder !== order) {
    return { ok: false, error: 'The derivative order does not match the variables below it.' };
  }

  if (order < 1 || order > MAX_DERIVATIVE_OPERATOR_ORDER) {
    return { ok: false, error: `Derivative order must be between 1 and ${MAX_DERIVATIVE_OPERATOR_ORDER}.` };
  }

  if (kind === 'derivative' && (factors.length !== 1 || factors[0].exponent !== order)) {
    return { ok: false, error: 'Ordinary derivatives use one variable, such as d^3/dx^3.' };
  }

  return {
    ok: true,
    operator: {
      kind,
      order,
      writtenFactors: [...factors],
      appliedPath: buildAppliedPath(factors),
      canonicalLatex: canonicalLatex(kind, order, factors),
    },
  };
}

function parseOrdinaryDenominator(denominator: string): DerivativeOperatorFactor[] | null {
  if (!denominator.startsWith('d')) {
    return null;
  }
  const variableToken = readVariableToken(denominator, 1);
  const variable = parseDerivativeVariable(variableToken.token);
  if (!variable.ok) {
    return null;
  }
  const exponent = readExponent(denominator, variableToken.nextIndex);
  if (!exponent || exponent.nextIndex !== denominator.length) {
    return null;
  }
  return [{ variable: variable.variable, exponent: exponent.exponent }];
}

function parsePartialDenominator(denominator: string): DerivativeOperatorFactor[] | null {
  const factors: DerivativeOperatorFactor[] = [];
  let index = 0;
  while (index < denominator.length) {
    if (!denominator.startsWith('\\partial', index)) {
      return null;
    }
    index += '\\partial'.length;
    const variableToken = readVariableToken(denominator, index);
    const variable = parseDerivativeVariable(variableToken.token);
    if (!variable.ok) {
      return null;
    }
    const exponent = readExponent(denominator, variableToken.nextIndex);
    if (!exponent) {
      return null;
    }
    factors.push({ variable: variable.variable, exponent: exponent.exponent });
    index = exponent.nextIndex;
  }
  return factors;
}

function readFrac(input: string) {
  if (!input.startsWith('\\frac{')) {
    return null;
  }
  let index = '\\frac'.length;
  const numerator = readBraceGroup(input, index);
  if (!numerator) {
    return null;
  }
  index = numerator.nextIndex;
  const denominator = readBraceGroup(input, index);
  if (!denominator || denominator.nextIndex !== input.length) {
    return null;
  }
  return { numerator: numerator.content, denominator: denominator.content };
}

function readBraceGroup(source: string, startIndex: number) {
  if (source[startIndex] !== '{') {
    return null;
  }
  let depth = 0;
  for (let index = startIndex; index < source.length; index += 1) {
    if (source[index] === '{') {
      depth += 1;
    } else if (source[index] === '}') {
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

function parseNumerator(numerator: string, kind: DerivativeOperatorKind) {
  const marker = kind === 'derivative' ? 'd' : '\\partial';
  if (numerator === marker) {
    return 1;
  }
  if (!numerator.startsWith(`${marker}^`)) {
    return null;
  }
  const exponent = readExponent(numerator, marker.length);
  return exponent && exponent.nextIndex === numerator.length ? exponent.exponent : null;
}

function parseFractionOperator(input: string): DerivativeOperatorParseResult | null {
  const fraction = readFrac(input);
  if (!fraction) {
    return null;
  }

  const derivativeOrder = parseNumerator(fraction.numerator, 'derivative');
  if (derivativeOrder !== null) {
    const factors = parseOrdinaryDenominator(fraction.denominator);
    return factors ? makeOperator('derivative', factors, derivativeOrder) : null;
  }

  const partialOrder = parseNumerator(fraction.numerator, 'partial');
  if (partialOrder !== null) {
    const factors = parsePartialDenominator(fraction.denominator);
    return factors ? makeOperator('partial', factors, partialOrder) : null;
  }

  return null;
}

function parseSlashOperator(input: string): DerivativeOperatorParseResult | null {
  const [numerator, denominator, extra] = input.split('/');
  if (!numerator || !denominator || extra !== undefined) {
    return null;
  }

  const derivativeOrder = parseNumerator(numerator, 'derivative');
  if (derivativeOrder !== null) {
    const factors = parseOrdinaryDenominator(denominator);
    return factors ? makeOperator('derivative', factors, derivativeOrder) : null;
  }

  const partialOrder = parseNumerator(numerator.replace(/^partial/, '\\partial'), 'partial');
  if (partialOrder !== null) {
    const normalizedDenominator = denominator.startsWith('\\partial')
      ? denominator
      : denominator
        .replace(/partial/g, '\\partial')
        .replace(/\\partial\\partial/g, '\\partial');
    const factors = parsePartialDenominator(normalizedDenominator);
    return factors ? makeOperator('partial', factors, partialOrder) : null;
  }

  return null;
}

export function parseDerivativeOperator(
  input: string | null | undefined,
  expectedKind?: DerivativeOperatorKind,
): DerivativeOperatorParseResult {
  const compact = compactOperatorInput(input ?? '');
  if (!compact) {
    return { ok: false, error: 'Enter a derivative operator.' };
  }

  const parsed = parseFractionOperator(compact) ?? parseSlashOperator(compact);
  if (!parsed) {
    return { ok: false, error: 'Use an operator such as d/dx, d^3/dx^3, or partial/partial x.' };
  }

  if (parsed.ok && expectedKind && parsed.operator.kind !== expectedKind) {
    return {
      ok: false,
      error: expectedKind === 'partial'
        ? 'Use a partial derivative operator on this screen.'
        : 'Use an ordinary derivative operator on this screen.',
    };
  }

  return parsed;
}

export function defaultDerivativeOperatorInput(
  kind: DerivativeOperatorKind,
  variable: string | null | undefined,
) {
  const parsed = parseDerivativeVariable(variable ?? DEFAULT_DERIVATIVE_VARIABLE);
  const variableLatex = derivativeVariableLatex(parsed.ok ? parsed.variable : DEFAULT_DERIVATIVE_VARIABLE);
  return kind === 'partial' ? `partial/partial ${variableLatex}` : `d/d${variableLatex}`;
}

export function firstOrderDerivativeOperator(
  kind: DerivativeOperatorKind,
  variable: string | null | undefined,
) {
  const parsedVariable = parseDerivativeVariable(variable ?? DEFAULT_DERIVATIVE_VARIABLE);
  if (!parsedVariable.ok) {
    return { ok: false, error: parsedVariable.error } satisfies DerivativeOperatorParseResult;
  }
  return parseDerivativeOperator(defaultDerivativeOperatorInput(kind, parsedVariable.variable), kind);
}

function variableDisplay(variable: DerivativeVariable) {
  return GREEK_DISPLAY[variable] ?? variable;
}

function superscriptNumber(value: number) {
  return String(value).split('').map((digit) => DIGIT_SUPERSCRIPT[digit] ?? digit).join('');
}

function factorDisplay(factor: DerivativeOperatorFactor, mode: 'plain' | 'rendered') {
  const variable = variableDisplay(factor.variable);
  if (factor.exponent === 1) {
    return variable;
  }
  return mode === 'rendered' ? `${variable}${superscriptNumber(factor.exponent)}` : `${variable}^${factor.exponent}`;
}

export function formatDerivativeOperator(
  operator: DerivativeOperatorSpec,
  notationMode: MathNotationDisplay,
) {
  if (notationMode === 'latex') {
    return operator.canonicalLatex;
  }

  if (operator.kind === 'derivative') {
    const variable = variableDisplay(operator.writtenFactors[0]?.variable ?? DEFAULT_DERIVATIVE_VARIABLE);
    if (operator.order === 1) {
      return `d/d${variable}`;
    }
    return notationMode === 'rendered'
      ? `d${superscriptNumber(operator.order)}/d${variable}${superscriptNumber(operator.order)}`
      : `d^${operator.order}/d${variable}^${operator.order}`;
  }

  const factors = operator.writtenFactors.map((factor) =>
    factorDisplay(factor, notationMode === 'rendered' ? 'rendered' : 'plain'));
  if (notationMode === 'rendered') {
    const numerator = operator.order === 1 ? '∂' : `∂${superscriptNumber(operator.order)}`;
    return `${numerator}/∂${factors.join('∂')}`;
  }
  const numerator = operator.order === 1 ? 'partial' : `partial^${operator.order}`;
  return `${numerator}/${factors.map((factor) => `partial ${factor}`).join(' ')}`;
}

export function formatDerivativeAppliedPath(operator: DerivativeOperatorSpec) {
  return operator.appliedPath.map(variableDisplay).join(' → ');
}

export function formatDerivativeWrittenFactors(operator: DerivativeOperatorSpec) {
  return operator.writtenFactors.map((factor) => factorDisplay(factor, 'plain')).join(', ');
}

export function buildDerivativeRequestLatex(bodyLatex: string, operator: DerivativeOperatorSpec) {
  const body = bodyLatex.trim();
  return body ? `${operator.canonicalLatex}\\left(${body}\\right)` : '';
}

export function buildDerivativeAtPointRequestLatex(
  bodyLatex: string,
  pointLatex: string,
  operator: DerivativeOperatorSpec,
) {
  const body = bodyLatex.trim();
  const point = pointLatex.trim();
  if (!body || !point || operator.kind !== 'derivative') {
    return '';
  }
  const variable = derivativeVariableLatex(operator.writtenFactors[0]?.variable ?? DEFAULT_DERIVATIVE_VARIABLE);
  return `\\left.${operator.canonicalLatex}\\left(${body}\\right)\\right|_{${variable}=${point}}`;
}
