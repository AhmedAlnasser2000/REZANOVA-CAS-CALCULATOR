import { describe, expect, it } from 'vitest';
import { parseLinearAlgebraScalarWire } from './scalar-wire';
import {
  classifySymbolicRref,
  classifySymbolicSystem,
  solutionMatrixForCase,
  symbolicCasesMathJson,
} from './symbolic-elimination';

function scalar(latex: string) {
  const parsed = parseLinearAlgebraScalarWire(latex, 'real');
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

describe('bounded symbolic elimination', () => {
  it('branches [a]u=[1] into the nonzero solution and zero contradiction', () => {
    const result = classifySymbolicSystem([[scalar('a')]], [[scalar('1')]], 'real');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.cases).toHaveLength(2);
    const solved = result.cases.find((entry) => !entry.inconsistent);
    const stopped = result.cases.find((entry) => entry.inconsistent);
    expect(solved?.conditions[0]?.relation).toBe('nonzero');
    expect(solutionMatrixForCase(solved!, 'real')?.[0]?.[0]?.canonicalLatex).toContain('a');
    expect(stopped?.conditions[0]?.relation).toBe('zero');
  });

  it('keeps six symbolic coefficient parameters inside the classification ceiling', () => {
    const result = classifySymbolicSystem([
      [scalar('a'), scalar('b')],
      [scalar('c'), scalar('d')],
    ], [
      [scalar('g')],
      [scalar('h')],
    ], 'real');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.parameterCount).toBe(6);
      expect(result.cases.length).toBeLessThanOrEqual(16);
    }
  });

  it('returns standard Which MathJSON when rank depends on a predicate', () => {
    const result = classifySymbolicRref([[scalar('a')]], 'real');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const value = symbolicCasesMathJson(result.cases, (entry) => entry.pivotColumns.length);
    expect(Array.isArray(value) && value[0]).toBe('Which');
  });

  it('stops opaque function classification without attempting identities', () => {
    const result = classifySymbolicRref([[scalar('f(a)')]], 'real');
    expect(result).toMatchObject({
      ok: false,
      error: expect.stringContaining('function identities'),
    });
  });
});
