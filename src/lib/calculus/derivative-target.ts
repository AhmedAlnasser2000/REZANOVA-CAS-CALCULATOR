import type { DerivativeVariable } from '../../types/calculator';

export const DEFAULT_DERIVATIVE_VARIABLE: DerivativeVariable = 'x';

export const COMMON_DERIVATIVE_VARIABLES: readonly DerivativeVariable[] = [
  'x',
  'y',
  't',
  'theta',
];

const GREEK_VARIABLE_LATEX: Record<string, string> = {
  alpha: '\\alpha',
  beta: '\\beta',
  gamma: '\\gamma',
  delta: '\\delta',
  theta: '\\theta',
  lambda: '\\lambda',
  mu: '\\mu',
};

const SINGLE_LATIN_SYMBOL = /^[A-Za-z]$/u;
const GREEK_VARIABLES = new Set(Object.keys(GREEK_VARIABLE_LATEX));

export type DerivativeVariableParseResult =
  | { ok: true; variable: DerivativeVariable }
  | { ok: false; error: string };

function cleanDerivativeVariableInput(input: string) {
  const trimmed = input.trim();
  return trimmed.startsWith('\\') ? trimmed.slice(1) : trimmed;
}

export function parseDerivativeVariable(input: string | null | undefined): DerivativeVariableParseResult {
  const cleaned = cleanDerivativeVariableInput(input ?? '');
  if (!cleaned) {
    return {
      ok: false,
      error: 'Choose one variable.',
    };
  }

  if (SINGLE_LATIN_SYMBOL.test(cleaned)) {
    return {
      ok: true,
      variable: cleaned,
    };
  }

  const lower = cleaned.toLowerCase();
  if (GREEK_VARIABLES.has(lower)) {
    return {
      ok: true,
      variable: lower,
    };
  }

  return {
    ok: false,
    error: 'Use one symbol such as x, t, or theta.',
  };
}

export function derivativeVariableOrDefault(
  input: string | null | undefined,
): DerivativeVariable {
  const parsed = parseDerivativeVariable(input);
  return parsed.ok ? parsed.variable : DEFAULT_DERIVATIVE_VARIABLE;
}

export function derivativeVariableLatex(variable: string | null | undefined) {
  const parsed = parseDerivativeVariable(variable);
  if (!parsed.ok) {
    return '?';
  }

  return GREEK_VARIABLE_LATEX[parsed.variable] ?? parsed.variable;
}

export function derivativeVariableInputValue(variable: string | null | undefined) {
  const parsed = parseDerivativeVariable(variable);
  return parsed.ok ? parsed.variable : (variable ?? '');
}
