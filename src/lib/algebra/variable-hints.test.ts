import { describe, expect, it } from 'vitest';
import { buildVariableHints } from './variable-hints';
import type { StoredVariableValue } from '../../types/calculator';

const stored: StoredVariableValue[] = [
  { name: 'a', valueLatex: '4', numericValue: 4, updatedAt: '2026-05-25T00:00:00.000Z' },
  { name: 'mass', valueLatex: '5', numericValue: 5, updatedAt: '2026-05-25T00:00:00.000Z' },
  { name: 'x', valueLatex: '9', numericValue: 9, updatedAt: '2026-05-25T00:00:00.000Z' },
  { name: 'z', valueLatex: '8', numericValue: 8, updatedAt: '2026-05-25T00:00:00.000Z' },
];

function hintKinds(latex: string, context: Parameters<typeof buildVariableHints>[1]) {
  return buildVariableHints(latex, context).map((hint) => `${hint.label}:${hint.kind}`);
}

describe('variable hints', () => {
  it('marks stored values and protected active variables', () => {
    expect(hintKinds('a x^2', {
      mode: 'table',
      activeVariable: 'x',
      storedVariables: stored,
    })).toEqual(['a:stored-value', 'x:active-variable']);
  });

  it('keeps stored equation parameters symbolic during symbolic solving', () => {
    const hints = buildVariableHints('x+z=5', {
      mode: 'equation',
      screenHint: 'symbolic',
      solveTarget: 'x',
      storedVariables: stored,
    });

    expect(hints.map((hint) => `${hint.label}:${hint.kind}`)).toEqual([
      'x:solve-target',
      'z:stored-ignored',
    ]);
    expect(hints.find((hint) => hint.label === 'z')?.detail).toContain('keeps it as a symbolic parameter');
  });

  it('marks reserved functions/constants and adjacent-letter ambiguity', () => {
    expect(hintKinds('sin(x)+pi+az', {
      mode: 'calculate',
      storedVariables: stored,
    })).toEqual([
      'pi:reserved-constant',
      'sin:reserved-function',
      'az:ambiguous-adjacent',
      'a:stored-value',
      'x:stored-value',
      'z:stored-value',
    ]);
  });

  it('distinguishes explicit named variables from raw adjacent text', () => {
    const explicit = buildVariableHints('@mass+var(rate)+hello', {
      mode: 'calculate',
      storedVariables: stored,
    });

    expect(explicit.map((hint) => `${hint.label}:${hint.kind}`)).toContain('mass:stored-value');
    expect(explicit.map((hint) => `${hint.label}:${hint.kind}`)).toContain('rate:symbolic-parameter');
    expect(explicit.map((hint) => `${hint.label}:${hint.kind}`)).toContain('hello:ambiguous-adjacent');
    expect(explicit.find((hint) => hint.label === 'mass')?.detail).toContain('one explicit named variable');
    expect(explicit.find((hint) => hint.label === 'rate')?.detail).toContain('one explicit named variable');
    expect(explicit.find((hint) => hint.label === 'hello')?.detail).toContain('@hello');
  });
});
