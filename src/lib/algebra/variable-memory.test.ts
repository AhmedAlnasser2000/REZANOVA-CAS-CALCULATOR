import { describe, expect, it } from 'vitest';
import {
  applyStoredVariableSubstitutions,
  buildStoredVariableValue,
  parseStoredVariableValue,
  storedValuesDetailSection,
  upsertStoredVariableValue,
  validateStoredVariableName,
} from './variable-memory';
import type { StoredVariableValue } from '../../types/calculator';

function expectValidName(name: string) {
  const result = validateStoredVariableName(name);
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.value;
}

function expectInvalidName(name: string) {
  const result = validateStoredVariableName(name);
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error(`Expected ${name} to be invalid`);
  }
  return result.error;
}

describe('variable-memory', () => {
  it('accepts case-sensitive single-letter stored variable names', () => {
    expect(expectValidName('x')).toBe('x');
    expect(expectValidName('z')).toBe('z');
    expect(expectValidName('K')).toBe('K');
    expect(expectValidName('k')).toBe('k');
  });

  it('rejects reserved and unsupported stored variable names', () => {
    expectInvalidName('Ans');
    expectInvalidName('hello');
    expectInvalidName('sin');
    expectInvalidName('pi');
    expectInvalidName('e');
    expectInvalidName('x_1');
  });

  it('accepts finite numeric values and simple exact rationals', () => {
    expect(parseStoredVariableValue('4')).toMatchObject({
      ok: true,
      value: { valueLatex: '4', numericValue: 4 },
    });
    expect(parseStoredVariableValue('-1.25')).toMatchObject({
      ok: true,
      value: { valueLatex: '-1.25', numericValue: -1.25 },
    });
    expect(parseStoredVariableValue('1e-3')).toMatchObject({
      ok: true,
      value: { valueLatex: '0.001', numericValue: 0.001 },
    });
    expect(parseStoredVariableValue('\\frac{3}{4}')).toMatchObject({
      ok: true,
      value: { valueLatex: '\\frac{3}{4}', numericValue: 0.75 },
    });
    expect(parseStoredVariableValue('3/4')).toMatchObject({
      ok: true,
      value: { valueLatex: '\\frac{3}{4}', numericValue: 0.75 },
    });
  });

  it('rejects symbolic, non-finite, constant, and radical values', () => {
    expect(parseStoredVariableValue('a+1').ok).toBe(false);
    expect(parseStoredVariableValue('\\sqrt{2}').ok).toBe(false);
    expect(parseStoredVariableValue('\\pi').ok).toBe(false);
    expect(parseStoredVariableValue('e').ok).toBe(false);
    expect(parseStoredVariableValue('Infinity').ok).toBe(false);
    expect(parseStoredVariableValue('NaN').ok).toBe(false);
    expect(parseStoredVariableValue('1/0').ok).toBe(false);
  });

  it('upserts stored values without merging case-distinct variables', () => {
    const first = buildStoredVariableValue('K', '4', '2026-05-24T00:00:00.000Z');
    const second = buildStoredVariableValue('k', '5', '2026-05-24T00:00:01.000Z');
    const replacement = buildStoredVariableValue('K', '6', '2026-05-24T00:00:02.000Z');
    if (!first.ok || !second.ok || !replacement.ok) {
      throw new Error('expected valid stored values');
    }

    const entries = upsertStoredVariableValue(
      upsertStoredVariableValue([first.value], second.value),
      replacement.value,
    );

    expect(entries).toMatchObject([
      { name: 'K', valueLatex: '6' },
      { name: 'k', valueLatex: '5' },
    ]);
  });

  it('substitutes structured symbol nodes without touching function names', () => {
    const entries: StoredVariableValue[] = [
      { name: 'a', valueLatex: '4', numericValue: 4 },
      { name: 'k', valueLatex: '-2', numericValue: -2 },
    ];

    const result = applyStoredVariableSubstitutions('\\sin(a)+k', entries);

    expect(result.substitutions).toEqual([
      { name: 'a', valueLatex: '4', numericValue: 4 },
      { name: 'k', valueLatex: '-2', numericValue: -2 },
    ]);
    expect(result.latex).toContain('\\sin(4)');
    expect(result.latex).toContain('-2');
  });

  it('skips protected variable names during structured substitution', () => {
    const entries: StoredVariableValue[] = [
      { name: 'a', valueLatex: '4', numericValue: 4 },
      { name: 'x', valueLatex: '9', numericValue: 9 },
    ];

    const result = applyStoredVariableSubstitutions('a x+x', entries, {
      protectedNames: ['x'],
    });

    expect(result.substitutions).toEqual([
      { name: 'a', valueLatex: '4', numericValue: 4 },
    ]);
    expect(result.latex).toContain('4');
    expect(result.latex).toContain('x');
  });

  it('builds a concise stored-values detail section', () => {
    expect(storedValuesDetailSection([
      { name: 'a', valueLatex: '4', numericValue: 4 },
      { name: 'k', valueLatex: '-2', numericValue: -2 },
    ])).toEqual({
      title: 'Stored Values',
      lines: ['Substituted a=4, k=-2 before evaluating this expression.'],
    });
  });

  it('can label stored-value details for adopted modes', () => {
    expect(storedValuesDetailSection([
      { name: 'a', valueLatex: '4', numericValue: 4 },
    ], 'Table expression')?.lines[0]).toBe(
      'Substituted a=4 before evaluating this Table expression.',
    );
  });
});
