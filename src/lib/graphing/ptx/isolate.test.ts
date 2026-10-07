import { describe, expect, it } from 'vitest';
import type { GraphExpressionIR } from '../contracts';
import { ptxIsolateRealZeros } from './isolate';
import { currentPtxSolverPort as port } from './solver-port-current';

function symbols(node: unknown): string[] {
  if (typeof node === 'string') return /^[a-z]$/u.test(node) ? [node] : [];
  return Array.isArray(node) ? [...new Set(node.slice(1).flatMap(symbols))] : [];
}
const minus = (left: unknown, right: unknown) => ['Add', left, ['Negate', right]];
const isolate = (mathJson: unknown, lo: number, hi: number, budget?: number) => ptxIsolateRealZeros(
  port.realFunction({ mathJson, freeSymbols: symbols(mathJson) } as GraphExpressionIR, 'x', {})!, lo, hi, budget ? { budget } : {})!;

describe('PTX zero isolation', () => {
  it('proves both zeros of x² − 2 and nothing else', () => {
    const result = isolate(minus(['Power', 'x', 2], 2), -10, 10);
    expect(result.undecided).toBe(0);
    expect(result.zeros.map((zero) => zero.proved)).toEqual([true, true]);
    expect(result.zeros[0]!.x).toBeCloseTo(-Math.SQRT2, 13);
    expect(result.zeros[1]!.x).toBeCloseTo(Math.SQRT2, 13);
  });

  it('finds every crossing of sin x = 0.3 in a wide window', () => {
    const result = isolate(minus(['Sin', 'x'], 0.3), -10, 10);
    expect(result.undecided).toBe(0);
    expect(result.zeros).toHaveLength(7);
    expect(result.zeros.every((zero) => zero.proved && Math.abs(Math.sin(zero.x) - 0.3) < 1e-12)).toBe(true);
  });

  it('separates two zeros far closer than a sampling grid would', () => {
    const result = isolate(['Multiply', minus('x', 1), minus('x', 1.000001)], -10, 10);
    expect(result.zeros.map((zero) => Number(zero.x.toFixed(9)))).toEqual([1, 1.000001]);
  });

  it('locates a touching zero without calling it proved', () => {
    const result = isolate(['Power', minus('x', 1), 2], -10, 10);
    expect(result.zeros).toHaveLength(1);
    expect(result.zeros[0]!.proved).toBe(false);
    expect(result.zeros[0]!.x).toBeCloseTo(1, 6);
  });

  it('reports the steps of floor and the range where it is identically zero', () => {
    const result = isolate(minus(['Floor', 'x'], 1), -0.5, 3.5);
    expect(result.discontinuities).toEqual([0, 1, 2, 3]);
    expect(result.zeroRanges).toHaveLength(1);
    expect(result.zeroRanges[0]!.lo).toBeCloseTo(1, 9);
    expect(result.zeroRanges[0]!.hi).toBeCloseTo(2, 9);
  });

  it('marks the pole of 1/x as a discontinuity, not a zero', () => {
    const result = isolate(['Divide', 1, 'x'], -5, 5);
    expect(result.zeros).toEqual([]);
    expect(result.discontinuities).toEqual([0]);
  });

  it('counts what it could not decide when the budget runs out', () => {
    expect(isolate(['Sin', ['Divide', 1, 'x']], -1, 1, 60).undecided).toBeGreaterThan(0);
  });
});
