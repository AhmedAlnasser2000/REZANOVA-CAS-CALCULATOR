import { describe, expect, it } from 'vitest';
import type { GraphExpressionIR } from '../contracts';
import { graphAffineRange, graphTightRange } from './affine';
import { compileGraphExpression } from './compile';
import { createGraphExpressionEvaluator } from './evaluate';
import { createGraphIntervalEvaluator } from './interval';

const plan = (mathJson: unknown, freeSymbols = ['x', 'y']) => {
  const compiled = compileGraphExpression({ planId: 'p', sourceRevision: 0, expression: { mathJson, freeSymbols } as GraphExpressionIR });
  if (!compiled.ok) throw new Error('compile');
  return compiled.plan;
};

describe('tighter enclosures', () => {
  it('cancels a repeated variable and beats plain intervals on x(10 − x)', () => {
    const same = graphAffineRange(plan(['Add', 'x', ['Negate', 'x']], ['x']), { x: { lo: 0, hi: 1 } });
    expect(same.hi - same.lo).toBeLessThan(1e-12);
    const parabola = plan(['Multiply', 'x', ['Add', 10, ['Negate', 'x']]], ['x']);
    const plain = createGraphIntervalEvaluator(parabola).evaluate({ x: { lo: 0, hi: 10 } });
    const tight = graphTightRange(parabola, { x: { lo: 0, hi: 10 } });
    expect(plain.hi).toBeGreaterThanOrEqual(100);
    expect(tight.lo).toBeLessThanOrEqual(0); expect(tight.hi).toBeGreaterThanOrEqual(25);
    expect(tight.hi).toBeLessThanOrEqual(50.000001);
  });

  it('shrinks like the box squared near a smooth point (mean-value form)', () => {
    const circle = plan(['Add', ['Power', 'x', 2], ['Power', 'y', 2], -9]);
    const box = { x: { lo: 2.999, hi: 3.001 }, y: { lo: -0.001, hi: 0.001 } };
    const tight = graphTightRange(circle, box);
    expect(tight.lo).toBeLessThanOrEqual(0); expect(tight.hi).toBeGreaterThanOrEqual(0);
    expect(tight.hi - tight.lo).toBeLessThan(0.0121);
  });

  it('still encloses every value at random points of random two-variable expressions', () => {
    let seed = 99; const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const leaves = ['x', 'y'];
    const make = (depth: number): unknown => {
      if (depth === 0 || random() < 0.3) return random() < 0.7 ? leaves[Math.floor(random() * 2)] : Number((random() * 4 - 2).toFixed(1));
      const pick = random();
      if (pick < 0.3) return ['Add', make(depth - 1), make(depth - 1)];
      if (pick < 0.55) return ['Multiply', make(depth - 1), make(depth - 1)];
      if (pick < 0.7) return ['Power', make(depth - 1), Math.floor(random() * 4) + 1];
      if (pick < 0.8) return ['Negate', make(depth - 1)];
      return [['Sin', 'Exp', 'Sqrt', 'Abs'][Math.floor(random() * 4)], make(depth - 1)];
    };
    let checked = 0;
    for (let trial = 0; trial < 600; trial += 1) {
      const mathJson = make(4);
      let compiled: ReturnType<typeof plan>;
      try { compiled = plan(mathJson); } catch { continue; }
      const cx = random() * 4 - 2; const cy = random() * 4 - 2; const w = random() ** 2;
      const box = { x: { lo: cx - w, hi: cx + w }, y: { lo: cy - w, hi: cy + w } };
      const range = graphTightRange(compiled, box);
      if (range.defined === 0) continue;
      const scalar = createGraphExpressionEvaluator(compiled);
      for (let i = 0; i <= 4; i += 1) for (let j = 0; j <= 4; j += 1) {
        const x = Math.min(box.x.hi, box.x.lo + (box.x.hi - box.x.lo) * i / 4);
        const y = Math.min(box.y.hi, box.y.lo + (box.y.hi - box.y.lo) * j / 4);
        const value = scalar.evaluate({ x, y });
        if (value.status !== 'finite') continue;
        checked += 1;
        expect(value.value, JSON.stringify({ mathJson, x, y, range })).toBeGreaterThanOrEqual(range.lo);
        expect(value.value, JSON.stringify({ mathJson, x, y, range })).toBeLessThanOrEqual(range.hi);
      }
    }
    expect(checked).toBeGreaterThan(3000);
  });
});
