import type { CanonicalMathValue } from '../../../types/calculator/canonical-result-common';
import { validateSerializableMathJson } from '../../display/printer/math-json';
import { findCustomMathJsonOperator } from '../standard-mathjson-operators';
import type { CanonicalResultValidationFailure } from '../limits';

export const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
export const keys = (v: Record<string, unknown>, required: string[], optional: string[] = []) =>
  required.every(k => Object.hasOwn(v, k)) && Object.keys(v).every(k => required.includes(k) || optional.includes(k));
export const symbol = (v: unknown): v is string => typeof v === 'string'
  && /^[A-Za-z][A-Za-z0-9_]*$/.test(v) && v.length <= 64
  && !['Pi', 'ExponentialE', 'ImaginaryUnit', 'Infinity', 'NaN'].includes(v);

export class InvalidResult {
  readonly failure: CanonicalResultValidationFailure;
  constructor(message: string, path: string, reason: CanonicalResultValidationFailure['reason'] = 'invalid-shape') {
    this.failure = { message, path, reason };
  }
}

/** Schema-level validation only: exact projection is the owning solver adapter's obligation. */
export function checkMath(value: unknown, path: string): asserts value is CanonicalMathValue {
  if (!record(value) || !keys(value, ['canonicalLatex', 'mathJson'])
    || typeof value.canonicalLatex !== 'string' || !value.canonicalLatex.trim()) {
    throw new InvalidResult('A mathematical leaf requires standard MathJSON and derived presentation.', path);
  }
  const checked = validateSerializableMathJson(value.mathJson);
  if (!checked.ok) throw new InvalidResult(checked.failure.message, `${path}.mathJson`, 'invalid-math-json');
  const custom = findCustomMathJsonOperator(checked.validated.value);
  if (custom) throw new InvalidResult(`Non-standard MathJSON operator ${custom}.`, `${path}.mathJson`, 'custom-math-json-operator');
}

/** Called only after bounded structured inspection and semantic shape validation. */
export function collectMathValues(value: unknown, rootPath = '$') {
  const output: Array<{ path: string; value: CanonicalMathValue }> = [];
  const visit = (v: unknown, path: string) => {
    if (v === null || typeof v !== 'object') return;
    if (record(v) && Object.hasOwn(v, 'canonicalLatex')) {
      checkMath(v, path);
      output.push({ path, value: v });
    } else if (Array.isArray(v)) {
      v.forEach((item, i) => visit(item, `${path}[${i}]`));
    } else {
      Object.entries(v).forEach(([key, item]) => visit(item, `${path}.${key}`));
    }
  };
  visit(value, rootPath);
  return output;
}
