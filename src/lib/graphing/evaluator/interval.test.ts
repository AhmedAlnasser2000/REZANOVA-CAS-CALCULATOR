import { describe, expect, it } from 'vitest';
import type { GraphExpressionIR } from '../contracts';
import { compileGraphExpression } from './compile';
import { createGraphDualEvaluator } from './dual';
import { createGraphExpressionEvaluator } from './evaluate';
import { createGraphIntervalEvaluator } from './interval';
import { nextDown, nextUp } from './interval-math';

const plan = (mathJson: unknown, freeSymbols = ['x']) => {
  const compiled = compileGraphExpression({ planId: 'p', sourceRevision: 0, expression: { mathJson, freeSymbols } as GraphExpressionIR });
  if (!compiled.ok) throw new Error('compile');
  return compiled.plan;
};

let seed = 12345;
const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

const UNARY = ['Sin', 'Cos', 'Tan', 'Exp', 'Ln', 'Sqrt', 'Abs', 'Arctan', 'Arcsin', 'Arccos', 'Sinh', 'Cosh', 'Tanh', 'Arsinh', 'Floor', 'Sec', 'Csc', 'Cot', 'Negate'];
const BINARY = ['Add', 'Multiply', 'Divide', 'Power', 'Max', 'Min'];

function randomExpression(depth: number): unknown {
  if (depth === 0 || random() < 0.25) return random() < 0.6 ? 'x' : Number((random() * 6 - 3).toFixed(2));
  if (random() < 0.5) return [UNARY[Math.floor(random() * UNARY.length)], randomExpression(depth - 1)];
  const operator = BINARY[Math.floor(random() * BINARY.length)];
  return operator === 'Power' ? ['Power', randomExpression(depth - 1), Math.floor(random() * 7) - 3] : [operator, randomExpression(depth - 1), randomExpression(depth - 1)];
}

describe('interval enclosures', () => {
  it('steps exactly one double outward', () => {
    expect(nextUp(1)).toBe(1 + Number.EPSILON);
    expect(nextDown(1)).toBe(1 - Number.EPSILON / 2);
    expect(nextUp(-1)).toBe(-1 + Number.EPSILON / 2);
    expect(nextUp(0)).toBe(Number.MIN_VALUE);
  });

  it('encloses every value and every slope at random points of random expressions', () => {
    let checked = 0;
    for (let trial = 0; trial < 400; trial += 1) {
      const mathJson = randomExpression(4);
      let compiled: ReturnType<typeof plan>;
      try { compiled = plan(mathJson); } catch { continue; }
      const scalar = createGraphExpressionEvaluator(compiled);
      const dual = createGraphDualEvaluator(compiled, ['x']);
      const centre = random() * 8 - 4; const width = random() ** 3 * 3;
      const lo = centre - width; const hi = centre + width;
      const range = createGraphIntervalEvaluator(compiled, ['x']).evaluate({ x: { lo, hi } });
      if (range.defined === 0) continue;
      for (let sample = 0; sample <= 12; sample += 1) {
        const x = Math.min(hi, Math.max(lo, lo + ((hi - lo) * sample) / 12));
        const value = scalar.evaluate({ x });
        if (value.status !== 'finite') continue;
        checked += 1;
        expect(value.value, JSON.stringify({ mathJson, x, range })).toBeGreaterThanOrEqual(range.lo);
        expect(value.value, JSON.stringify({ mathJson, x, range })).toBeLessThanOrEqual(range.hi);
        const slope = dual.evaluate({ x });
        const d = range.gradient[0]!;
        if (slope.status === 'finite' && Number.isFinite(slope.gradient[0]) && range.smooth && d.defined === 2) {
          expect(slope.gradient[0]!, JSON.stringify({ mathJson, x, d })).toBeGreaterThanOrEqual(d.lo);
          expect(slope.gradient[0]!, JSON.stringify({ mathJson, x, d })).toBeLessThanOrEqual(d.hi);
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it('tracks where an expression is undefined or jumps', () => {
    const at = (mathJson: unknown, lo: number, hi: number) => createGraphIntervalEvaluator(plan(mathJson)).evaluate({ x: { lo, hi } });
    expect(at(['Sqrt', 'x'], -1, 4)).toMatchObject({ lo: 0, defined: 1 });
    expect(at(['Sqrt', 'x'], -4, -1).defined).toBe(0);
    expect(at(['Divide', 1, 'x'], -1, 1)).toMatchObject({ lo: -Infinity, hi: Infinity, defined: 1, continuous: false });
    expect(at(['Tan', 'x'], 1, 2)).toMatchObject({ continuous: false });
    expect(at(['Floor', 'x'], 0.2, 0.8)).toMatchObject({ lo: 0, hi: 0, continuous: true });
    expect(at(['Floor', 'x'], 0.2, 1.8).continuous).toBe(false);
    expect(at(['Abs', 'x'], -1, 1)).toMatchObject({ lo: 0, hi: 1, continuous: true, smooth: false });
    const sine = at(['Sin', 'x'], 1, 2);
    expect(sine.hi).toBe(1);
    expect(sine.lo).toBeLessThanOrEqual(Math.sin(1));
  });
});
