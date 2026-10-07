import { readFileSync } from 'node:fs';
import { describe as group, expect, it } from 'vitest';
import type { OutputStyle } from '../../../../types/calculator';
import { context } from '../core/test-support';
import { decideEquation } from '../core/decide';
import { ExpressionStore } from '../core/representation/expression';
import { readRelations } from '../core/representation/mathjson';
import { relationProblem, type ProblemDomain } from '../core/representation/relation';
import { CORPUS } from '../core/bench/corpus';
import { projectEquationOutcome } from '../result';
import { presentEquation } from './layout';

function documentOf(json: unknown, targets = ['x'], domain: ProblemDomain = 'real') {
  const store = new ExpressionStore(context());
  const r = readRelations(store, json);
  if (r.kind !== 'ok') throw new Error(JSON.stringify(r));
  const problem = relationProblem(store, { domain, targets, relations: r.value });
  return projectEquationOutcome(problem, decideEquation(problem)).canonicalResult;
}
const text = (json: unknown, outputStyle: OutputStyle = 'both', approxDigits = 6, targets = ['x'], domain: ProblemDomain = 'real') =>
  presentEquation(documentOf(json, targets, domain), { outputStyle, approxDigits }, context()).plainText;
const eq = (a: unknown, b: unknown = 0) => ['Equal', a, b];
const add = (...a: unknown[]) => ['Add', ...a], mul = (...a: unknown[]) => ['Multiply', ...a], pow = (a: unknown, k: unknown) => ['Power', a, k];

group('presentation goldens', () => {
  it('a root with no closed form: certified decimal and its definition (P4, P9)', () => {
    expect(text(eq(add(pow('x', 5), mul(-1, 'x'), -1)))).toBe('x ≈ 1.167304\n  the real root of x^5 - x - 1 = 0');
    expect(text(eq(add(pow('x', 7), mul(-3, 'x'), 1)), 'exact', 4)).toBe([
      'x ≈ -1.2492', '  the smallest real root of x^7 - 3x + 1 = 0',
      'x ≈ 0.3335', '  the 2nd smallest real root of x^7 - 3x + 1 = 0',
      'x ≈ 1.1332', '  the largest real root of x^7 - 3x + 1 = 0'].join('\n'));
  });

  it('Exact, Decimal and Both follow the setting (R2)', () => {
    const r2 = eq(add(['Divide', 1, 'x'], ['Divide', 1, add('x', 1)]), 1);
    expect(text(r2, 'exact')).toBe('x = (1 - √5)/2\nx = (1 + √5)/2');
    expect(text(r2, 'decimal', 4)).toBe('x ≈ -0.6180\nx ≈ 1.6180');
    expect(text(r2, 'both', 3)).toBe('x = (1 - √5)/2 ≈ -0.618\nx = (1 + √5)/2 ≈ 1.618');
    // Integers never repeat as decimals.
    expect(text(eq(add(pow('x', 2), mul(-5, 'x'), 6)), 'both')).toBe('x = 2\nx = 3');
  });

  it('families as x = a + Pk, k ∈ ℤ (T1, T2)', () => {
    expect(text(eq(['Sin', 'x'], ['Rational', 1, 2]))).toBe('x = π/6 + 2πk, k ∈ ℤ\nx = 5π/6 + 2πk, k ∈ ℤ');
    expect(text(eq(add(mul(3, pow(['Sin', 'x'], 2)), mul(2, ['Sin', 'x']), -1)))).toBe(
      'x = -π/2 + 2πk, k ∈ ℤ\nx = arcsin(1/3) + 2πk, k ∈ ℤ\nx = π - arcsin(1/3) + 2πk, k ∈ ℤ');
  });

  it('case trees with readable conditions (Q1, a·x² + 2x + 1)', () => {
    expect(text(eq(add(mul('a', pow('x', 2)), mul('b', 'x'), 'c'))).split('\n').slice(0, 6)).toEqual([
      'If a = 0 and b = 0 and c = 0:', '  All real numbers', 'If a = 0 and b = 0 and c ≠ 0:', '  No solution', 'If a = 0 and b ≠ 0:', '  x = -c/b']);
    expect(text(eq(add(mul('a', pow('x', 2)), mul(2, 'x'), 1))).split('\n')).toEqual([
      'If a = 0:', '  x = -1/2 ≈ -0.500000', 'If a ≠ 0 and a ≤ 1:', '  x = (-2 - √(4 - 4a))/(2a)', '  x = (√(4 - 4a) - 2)/(2a)', 'If a > 1:', '  No solution']);
  });

  it('systems, intervals, cofinite sets and free targets', () => {
    expect(text(['And', eq(add('x', mul(2, 'y'), mul(2, 'z')), 1), eq(add(pow('x', 2), mul(2, pow('y', 2)), mul(2, pow('z', 2))), 'x'), eq(add(mul(2, 'x', 'y'), mul(2, 'y', 'z')), 'y')], 'exact', 6, ['x', 'y', 'z'])).toBe([
      '(x, y, z) = ((3 - √2)/7, (3 - √2)/14, (1 + 2√2)/14)', '(x, y, z) = (1/3, 0, 1/3)',
      '(x, y, z) = ((3 + √2)/7, (3 + √2)/14, (1 - 2√2)/14)', '(x, y, z) = (1, 0, 0)'].join('\n'));
    expect(text(['Less', add(pow('x', 2), -1), 0])).toBe('x ∈ (-1, 1)');
    expect(text(eq(['Divide', 'x', 'x'], 1), 'exact', 6, ['x'], 'complex')).toBe('All complex numbers except 0');
    expect(text(eq(add(pow('x', 2), pow('y', 2)), 1), 'exact', 6, ['x', 'y'])).toBe('x = -√(-4(y^2 - 1))/2, y ∈ ℝ, -1 ≤ y ≤ 1\nx = √(-4(y^2 - 1))/2, y ∈ ℝ, -1 ≤ y ≤ 1');
  });

  it('complex roots in numeric order with a + bi decimals', () => {
    expect(text(eq(pow('x', 3), 1), 'decimal', 4, ['x'], 'complex')).toBe('x = 1\nx ≈ -0.5000 + 0.8660i\nx ≈ -0.5000 - 0.8660i');
  });

  it('non-answers carry a message and the owner', () => {
    const p = presentEquation(documentOf(eq(['Add', ['Exp', 'x'], ['Sin', 'x']], 0)), { outputStyle: 'both', approxDigits: 6 }, context());
    expect(p.outcome).toBe('incomplete');
    expect(p.owner).toBe('EQUATION-CERTIFIED-NUMERICS1');
    expect(p.rows[0].role).toBe('message');
  });
});

group('copy, authority and fallback', () => {
  it.each(CORPUS.map(c => [c.id, c] as const))('%s presents; copy is exact with every root defined; the document is untouched', (_, c) => {
    const d = documentOf(c.json, [...(c.targets ?? ['x'])], c.domain ?? 'real');
    const before = JSON.stringify(d);
    const p = presentEquation(d, { outputStyle: 'both', approxDigits: 6 }, context());
    expect(JSON.stringify(d)).toBe(before);
    expect(p.rows.length).toBeGreaterThan(0);
    expect(p.copyLatex).not.toContain('\\approx');
    for (const m of p.copyLatex.matchAll(/r_\{(\d+)\}/g)) expect(p.copyLatex).toContain(`r_{${m[1]}}:`);
  }, 120_000);

  it('a stopped core falls back to the printer alone (no rewrites, no decimals)', () => {
    const d = documentOf(eq(add(pow('x', 2), -12)));
    const full = presentEquation(d, { outputStyle: 'both', approxDigits: 6 }, context());
    expect(full.plainText).toBe('x = -2√3 ≈ -3.464102\nx = 2√3 ≈ 3.464102');
    const fallback = presentEquation(d, { outputStyle: 'both', approxDigits: 6 }, context({ work: 1 }));
    expect(fallback.fallback).toBe(true);
    expect(fallback.plainText).not.toContain('≈');
  });

  it('rejects a document that is not valid current', () => {
    expect(() => presentEquation({ version: 7 }, { outputStyle: 'exact', approxDigits: 6 }, context())).toThrow(/valid typed Equation/);
  });
});

group('no layout decision reads rendered text', () => {
  // Rendering is output only: decisions come from MathJSON structure or engine facts, never from printed strings.
  const RENDERED = /\.(text|latex)\.(startsWith|endsWith|slice|includes|match|localeCompare|indexOf|charAt)\(|\.(text|latex)\s*[!=]==|\/[^/\n]*\/[a-z]*\.test\((latex|text|pl|pt|[a-z]*\.(latex|text))\)/;
  it.each(['src/lib/symbolic-engine/equation/presentation/layout.ts', 'src/lib/display/printer/equation-v6.ts'])('%s', file => {
    const offending = readFileSync(file, 'utf8').split('\n').filter(line => RENDERED.test(line));
    expect(offending).toEqual([]);
  });
});
