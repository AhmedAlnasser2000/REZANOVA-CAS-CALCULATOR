export const DEFAULT_INTEGRAL_VARIABLE = 'x';

const RESERVED_VARIABLES = new Set([
  'e',
  'i',
  'pi',
  '\\pi',
  'π',
  'infty',
  '\\infty',
  'infinity',
]);

export type NormalizedIntegralVariable = {
  id: string;
  latex: string;
};

export function normalizeIntegralVariableDraft(
  draft: string | undefined,
): NormalizedIntegralVariable | null {
  const trimmed = (draft ?? DEFAULT_INTEGRAL_VARIABLE).trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed === 'theta' || trimmed === '\\theta') {
    return { id: 'theta', latex: '\\theta' };
  }

  if (RESERVED_VARIABLES.has(trimmed.toLowerCase())) {
    return null;
  }

  if (/^[A-Za-z]$/.test(trimmed)) {
    return { id: trimmed, latex: trimmed };
  }

  return null;
}

export function integralVariableOrDefault(
  draft: string | undefined,
): NormalizedIntegralVariable {
  return normalizeIntegralVariableDraft(draft)
    ?? { id: DEFAULT_INTEGRAL_VARIABLE, latex: DEFAULT_INTEGRAL_VARIABLE };
}

export function integralVariableErrorMessage() {
  return 'Integration variable must be a single symbol such as x, y, t, or theta.';
}
