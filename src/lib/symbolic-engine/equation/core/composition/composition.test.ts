import { describe as group, expect, it } from 'vitest';
import { context } from '../test-support';
import { decideEquation, verifyEquationOutcome } from '../decide';
import { describe } from '../decision/test-helpers';
import { ExpressionStore } from '../representation/expression';
import { readExpression, readRelations, writeExpression } from '../representation/mathjson';
import { relationProblem } from '../representation/relation';
import { rational } from '../algebra/rational';
import { derivative } from './derivative';
import { excludesZero, rangeOf } from './range';

/** Decide through the dispatcher, verify independently, and describe exactly. */
function run(json: unknown) {
  const store = new ExpressionStore(context());
  const r = readRelations(store, json);
  if (r.kind !== 'ok') throw new Error(JSON.stringify(r));
  const problem = relationProblem(store, { domain: 'real', targets: ['x'], relations: r.value });
  const outcome = decideEquation(problem);
  verifyEquationOutcome(problem, outcome);
  return { store, problem, outcome, text: describe(store, outcome) };
}
const eq = (a: unknown, b: unknown = 0) => ['Equal', a, b];
const sin = (a: unknown) => ['Sin', a], cos = (a: unknown) => ['Cos', a], exp = (a: unknown) => ['Exp', a];
const half = ['Rational', 1, 2];

group('injective cancellation f(U) = f(V) → U = V', () => {
  it.each([
    ['e^{sin x} = e^{cos x}', eq(exp(sin('x')), exp(cos('x'))), '{["Multiply",["Rational",1,4],"Pi"]} + "Pi"ℤ'],
    ['atan(eˣ) = atan(x + 1) (then the Lambert class)', eq(['Arctan', exp('x')], ['Arctan', ['Add', 'x', 1]]), '{0}'],
    ['(x² − 1)³ = (2x + 2)³', eq(['Power', ['Add', ['Power', 'x', 2], -1], 3], ['Power', ['Add', ['Multiply', 2, 'x'], 2], 3]), '{-1, 3}'],
    ['log(x² + 1) = log(2x)', eq(['Ln', ['Add', ['Power', 'x', 2], 1]], ['Ln', ['Multiply', 2, 'x']]), '{1}'],
    ['√(x + 3) = √(2x)', eq(['Sqrt', ['Add', 'x', 3]], ['Sqrt', ['Multiply', 2, 'x']]), '{3}'],
    ['sin²x = cos²x (U = ±V)', eq(['Power', sin('x'), 2], ['Power', cos('x'), 2]), '{["Multiply",["Rational",1,4],"Pi"]} + ["Multiply",["Rational",1,2],"Pi"]ℤ'],
  ])('%s', (_, json, expected) => {
    expect(run(json).text).toBe(expected);
  }, 60_000);
});

group('certified ranges, split by exact sign', () => {
  it.each([
    ['eˣ + sin x = −2 (range (1, ∞))', eq(['Add', exp('x'), sin('x')], -2), 'empty'],
    ['eˣ + sin x > −1 (strict kernel bounds)', ['Greater', ['Add', exp('x'), sin('x')], -1], '(-inf, +inf)'],
    ['x² + cos x = −1', eq(['Add', ['Power', 'x', 2], cos('x')], -1), 'empty'],
    ['atan x + eˣ ≥ −π/2 (a monotone tail with an exact limit)', ['GreaterEqual', ['Add', ['Arctan', 'x'], exp('x')], ['Multiply', ['Rational', -1, 2], 'Pi']], '(-inf, +inf)'],
    ['x ≥ 1 ∧ e^{x−1} + sin x + 2 > 0', ['And', ['GreaterEqual', 'x', 1], ['Greater', ['Add', exp(['Add', 'x', -1]), sin('x'), 2], 0]], '[1, +inf)'],
    ['(x² − 4)·(eˣ + 2 + sin x) > 0', ['Greater', ['Multiply', ['Add', ['Power', 'x', 2], -4], ['Add', exp('x'), 2, sin('x')]], 0], '(-inf, -2) ∪ (2, +inf)'],
    ['|x|·(eˣ + 2) = 0', eq(['Multiply', ['Abs', 'x'], ['Add', exp('x'), 2]]), '{0}'],
    ['√x + √(x + 1) = ln 2', eq(['Add', ['Sqrt', 'x'], ['Sqrt', ['Add', 'x', 1]]], ['Ln', 2]), 'empty'],
  ])('%s', (_, json, expected) => {
    expect(run(json).text).toBe(expected);
  }, 60_000);
});

group('monotone targets with exact candidates', () => {
  it.each([
    ['x + sin x = 0', eq(['Add', 'x', sin('x')]), '{0}'],
    ['x + sin x > 0', ['Greater', ['Add', 'x', sin('x')], 0], '(0, +inf)'],
    ['x³ + atan x = 0', eq(['Add', ['Power', 'x', 3], ['Arctan', 'x']]), '{0}'],
    ['(x − 1)·(x + sin x) ≥ 0', ['GreaterEqual', ['Multiply', ['Add', 'x', -1], ['Add', 'x', sin('x')]], 0], '(-inf, 0] ∪ [1, +inf)'],
    ['sin|x| + x = 0', eq(['Add', sin(['Abs', 'x']), 'x']), '{0}'],
    ['2ˣ + 3ˣ = 5', eq(['Add', ['Power', 2, 'x'], ['Power', 3, 'x']], 5), '{1}'],
    ['eˣ + x = 1 (still the Lambert class)', eq(['Add', exp('x'), 'x'], 1), '{0}'],
  ])('%s', (_, json, expected) => {
    expect(run(json).text).toBe(expected);
  }, 60_000);
});

group('interval families through a monotone common argument', () => {
  const ln = (a: unknown) => `["Ln",${a}]`;
  it.each([
    ['sin(eˣ) > 1/2', ['Greater', sin(exp('x')), half],
      `⋃ (${ln('["Add",["Multiply",2,"Pi","k"],["Multiply",["Rational",1,6],"Pi"]]')}, ${ln('["Add",["Multiply",2,"Pi","k"],["Multiply",["Rational",5,6],"Pi"]]')}) : k ≥ 0`],
    ['sin √x ≥ 0', ['GreaterEqual', sin(['Sqrt', 'x']), 0], '⋃ [["Multiply",4,["Power",["Multiply","Pi","k"],2]], ["Power",["Add",["Multiply",2,"Pi","k"],"Pi"],2]] : k ≥ 0'],
    ['cos(ln x) < 0', ['Less', cos(['Ln', 'x']), 0],
      '⋃ (["Exp",["Add",["Multiply",2,"Pi","k"],["Multiply",["Rational",1,2],"Pi"]]], ["Exp",["Add",["Multiply",2,"Pi","k"],["Multiply",["Rational",3,2],"Pi"]]]) : k ∈ ℤ'],
    ['sin(e^{−x}) > 0 (the member at the limit 0 maps to +∞)', ['Greater', sin(exp(['Negate', 'x'])), 0],
      '⋃ (["Multiply",-1,["Ln",["Add",["Multiply",3,"Pi"],["Multiply",2,"Pi","k"]]]], ["Multiply",-1,["Ln",["Add",["Multiply",2,"Pi"],["Multiply",2,"Pi","k"]]]]) : k ≥ 0 ∪ (["Multiply",-1,["Ln","Pi"]], +inf)'],
  ])('%s', (_, json, expected) => {
    expect(run(json).text).toBe(expected);
  }, 60_000);

  it('sin x² > 0 is two families, and sin(x³) ≥ 1/2 one on each side of the turning point', () => {
    const a = run(['Greater', sin(['Power', 'x', 2]), 0]);
    expect(a.text.split(' ∪ ').length).toBe(2);
    expect(a.text).toContain(': k ≥ 0');
    const b = run(['GreaterEqual', sin(['Power', 'x', 3]), half]);
    expect(b.text).toContain(': k ≤ 0');
    expect(b.text).toContain(': k ≥ 0');
  }, 60_000);

  it('enumerates bounded regions as finite intervals', () => {
    const r = run(['And', ['Greater', sin(exp('x')), half], ['LessEqual', 'x', 3]]);
    if (r.outcome.kind !== 'solved' || r.outcome.set.kind !== 'intervals') throw new Error(r.text);
    expect(r.outcome.set.intervals.length).toBe(4);
    expect(r.text.endsWith(', 3]')).toBe(true);
  }, 60_000);
});

group('routing', () => {
  it.each([
    ['eˣ + sin x > 0 (infinitely many boundary roots toward −∞)', ['Greater', ['Add', exp('x'), sin('x')], 0], 'incomplete-implementation: EQUATION-CERTIFIED-NUMERICS1: infinitely many roots without a closed form as x → −∞; add a range row such as −10 ≤ x ≤ 0'],
    ['x + sin x = 1 (a certified numeric root)', eq(['Add', 'x', sin('x')], 1), '{["IsolatedRoot",["Multiply",-1,["Add",-1,"ξ",["Sin","ξ"]]],["Rational",1,2],["Rational",3,4]]}'],
    ['cos x = x (a certified numeric root)', eq(cos('x'), 'x'), '{["IsolatedRoot",["Multiply",-1,["Add",["Cos","ξ"],["Multiply",-1,"ξ"]]],["Rational",1,2],["Rational",3,4]]}'],
    ['x·sin x = 1', eq(['Multiply', 'x', sin('x')], 1), 'incomplete-implementation: EQUATION-CERTIFIED-NUMERICS1: infinitely many roots without a closed form as x → −∞; add a range row such as −10 ≤ x ≤ 0'],
    ['dependent radicals stay with slice 3', eq(['Sqrt', ['Add', ['Power', 'x', 2], ['Multiply', 2, 'x'], 1]], ['Add', 'x', 1]),
      'incomplete-implementation: EQUATION-CONSTRAINTS1: dependent radicals (the elimination norm vanishes identically)'],
  ])('%s', (_, json, expected) => {
    expect(run(json).text).toBe(expected);
  }, 60_000);
});

group('range and derivative substrate', () => {
  const store = new ExpressionStore(context());
  const read = (json: unknown) => { const r = readExpression(store, json); if (r.kind !== 'ok') throw new Error('read'); return r.value; };
  const point = (n: number) => ({ lo: rational(store.ctx, BigInt(n)), hi: rational(store.ctx, BigInt(n)), loOpen: false, hiOpen: false });
  const contains = (r: ReturnType<typeof rangeOf>, digits: string) => {
    const [int, frac] = digits.replace('-', '').split('.'), sign = digits.startsWith('-') ? -1n : 1n, scale = 10n ** BigInt(frac.length);
    const v = sign * BigInt(int + frac);
    return r.lo !== undefined && r.hi !== undefined && r.lo.numerator * scale <= (v + 1n) * r.lo.denominator && (v - 1n) * r.hi.denominator <= r.hi.numerator * scale
      && (r.hi.numerator * r.lo.denominator - r.lo.numerator * r.hi.denominator) * 10n ** 15n < r.lo.denominator * r.hi.denominator;
  };

  it('encloses point values against mpmath', () => {
    expect(contains(rangeOf(store, read(['Add', ['Arctan', 'x'], exp('x')]), 'x', point(1), 64), '3.5036799918564935449759483171725382')).toBe(true);
    expect(contains(rangeOf(store, read(['Add', sin(exp('x')), ['Sqrt', 2]]), 'x', point(1), 64), '1.8249948528760037442776982162280587')).toBe(true);
    expect(contains(rangeOf(store, read(['Multiply', ['Ln', 'x'], cos(['Add', 'x', -1])]), 'x', point(3), 64), '-0.45718402852104985218179874516352405')).toBe(true);
  });

  it('keeps strict kernel bounds on unbounded intervals', () => {
    const line = { loOpen: true, hiOpen: true };
    expect(excludesZero(rangeOf(store, read(['Add', exp('x'), sin('x'), 1]), 'x', line, 64))).toBe(true);
    expect(excludesZero(rangeOf(store, read(['Add', ['Power', 'x', 2], cos('x'), 1]), 'x', line, 64))).toBe(false);
    expect(excludesZero(rangeOf(store, read(['Add', ['Arctan', 'x'], 2]), 'x', line, 64))).toBe(true);
  });

  it('differentiates over the vocabulary', () => {
    const d = (json: unknown) => JSON.stringify(writeExpression(store, derivative(store, read(json), 'x') as never));
    expect(d(['Add', 'x', sin('x')])).toBe(JSON.stringify(writeExpression(store, read(['Add', 1, cos('x')]))));
    expect(d(exp(['Power', 'x', 2]))).toBe(JSON.stringify(writeExpression(store, read(['Multiply', 2, 'x', exp(['Power', 'x', 2])]))));
    expect(d(['Arctan', 'x'])).toBe(JSON.stringify(writeExpression(store, read(['Power', ['Add', 1, ['Power', 'x', 2]], -1]))));
  });
});
