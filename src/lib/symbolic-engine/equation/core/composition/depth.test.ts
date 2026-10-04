import { describe as group, expect, it } from 'vitest';
import { context } from '../test-support';
import { decideEquation, verifyEquationOutcome } from '../decide';
import { describe } from '../decision/test-helpers';
import { ExpressionStore } from '../representation/expression';
import { readRelations } from '../representation/mathjson';
import { relationProblem } from '../representation/relation';

/**
 * Roadmap exit evidence for `EQUATION-COMPOSITION1`: depth 3 and depth 25 are
 * decided by the same code (inversion chains, periodic chains, injective
 * cancellation and the range engine), and each answer is verified.
 */
function run(json: unknown, store = new ExpressionStore(context())) {
  const r = readRelations(store, json);
  if (r.kind !== 'ok') throw new Error(JSON.stringify(r));
  const problem = relationProblem(store, { domain: 'real', targets: ['x'], relations: r.value });
  const outcome = decideEquation(problem);
  if (outcome.kind === 'solved' || outcome.kind === 'empty') verifyEquationOutcome(problem, outcome);
  return { store, outcome, text: describe(store, outcome) };
}
const eq = (a: unknown, b: unknown = 0) => ['Equal', a, b];
const nest = (fn: string, n: number, inner: unknown) => { let e = inner; for (let i = 0; i < n; i++) e = [fn, e]; return e; };
const lnChain = (n: number) => { let e: unknown = 'x'; for (let i = 0; i < n; i++) e = ['Ln', ['Add', 1, e]]; return e; };
const asinChain = (n: number) => { let e = '["Rational",1,10]'; for (let i = 0; i < n; i++) e = `["Arcsin",${e}]`; return e; };

group('depth 3 and depth 25 by the same code', () => {
  it.each([3, 25])('ln(1 + ln(1 + … ln(1 + x))) = 0 at depth %i (inversion chain)', n => {
    expect(run(eq(lnChain(n))).text).toBe('{0}');
  }, 300_000);

  it.each([3, 25])('atan∘…∘atan(x) = atan∘…∘atan(2x − 1) at depth %i (injective cancellation)', n => {
    expect(run(eq(nest('Arctan', n, 'x'), nest('Arctan', n, ['Add', ['Multiply', 2, 'x'], -1]))).text).toBe('{1}');
  }, 300_000);

  it.each([3, 25])('sin∘…∘sin(x) + x = 0 at depth %i (range engine)', n => {
    expect(run(eq(['Add', nest('Sin', n, 'x'), 'x'])).text).toBe('{0}');
  }, 300_000);

  it.each([3, 25])('sin∘…∘sin(x) = 1/10 at depth %i (periodic chain)', n => {
    const a = asinChain(n);
    expect(run(eq(nest('Sin', n, 'x'), ['Rational', 1, 10])).text).toBe(`{${a}, ["Add","Pi",["Multiply",-1,${a}]]} + ["Multiply",2,"Pi"]ℤ`);
  }, 600_000);
});

group('resources at depth 25', () => {
  it('reports typed work and cancellation stops, never partial answers', () => {
    const json = eq(nest('Arctan', 25, 'x'), nest('Arctan', 25, ['Add', ['Multiply', 2, 'x'], -1]));
    expect(run(json, new ExpressionStore(context({ work: 2_000 }))).outcome).toEqual({ kind: 'resource', stop: 'work' });
    let polls = 0;
    expect(run(json, new ExpressionStore(context({}, () => ++polls > 2_000))).outcome).toEqual({ kind: 'resource', stop: 'cancelled' });
  }, 60_000);
});
