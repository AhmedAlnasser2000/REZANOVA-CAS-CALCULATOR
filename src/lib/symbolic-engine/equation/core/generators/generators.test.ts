import { describe as group, expect, it } from 'vitest';
import { context } from '../test-support';
import { decideEquation, verifyEquationOutcome } from '../decide';
import { describe } from '../decision/test-helpers';
import { ExpressionStore } from '../representation/expression';
import { readRelations } from '../representation/mathjson';
import { relationProblem, type ProblemDomain } from '../representation/relation';

/** Decide through the dispatcher, verify independently, and describe exactly. */
function run(json: unknown, domain: ProblemDomain = 'real') {
  const store = new ExpressionStore(context());
  const r = readRelations(store, json);
  if (r.kind !== 'ok') throw new Error(JSON.stringify(r));
  const problem = relationProblem(store, { domain, targets: ['x'], relations: r.value });
  const outcome = decideEquation(problem);
  verifyEquationOutcome(problem, outcome);
  return { store, problem, outcome, text: describe(store, outcome) };
}
const eq = (a: unknown, b: unknown = 0) => ['Equal', a, b];
const ln = (a: unknown) => ['Ln', a];
const exp = (a: unknown) => ['Exp', a];
const times = (...a: unknown[]) => ['Multiply', ...a];

group('baseline corpus E1–E9 (exact; the old engine refused E1 and gave decimals for E2–E8)', () => {
  it.each([
    ['E1 e^{2x} − 5eˣ + 6 = 0', eq(['Add', exp(times(2, 'x')), times(-5, exp('x')), 6]), '{["Ln",2], ["Ln",3]}'],
    ['E2 e^{4x} − 5e^{2x} + 4 = 0', eq(['Add', exp(times(4, 'x')), times(-5, exp(times(2, 'x'))), 4]), '{0, ["Ln",2]}'],
    ['E3 e^{x/2} + eˣ = 6', eq(['Add', exp(['Divide', 'x', 2]), exp('x')], 6), '{["Multiply",2,["Ln",2]]}'],
    ['E4 e^{3x} − 4e^{2x} + 5eˣ − 2 = 0', eq(['Add', exp(times(3, 'x')), times(-4, exp(times(2, 'x'))), times(5, exp('x')), -2]), '{0, ["Ln",2]}'],
    ['E5 2ˣ + 4ˣ = 6', eq(['Add', ['Power', 2, 'x'], ['Power', 4, 'x']], 6), '{1}'],
    ['E6 (ln x)³ − 6(ln x)² + 11 ln x − 6 = 0', eq(['Add', ['Power', ln('x'), 3], times(-6, ['Power', ln('x'), 2]), times(11, ln('x')), -6]), '{["Exp",1], ["Exp",2], ["Exp",3]}'],
    ['E7 (ln x)⁶ − 5(ln x)³ + 4 = 0', eq(['Add', ['Power', ln('x'), 6], times(-5, ['Power', ln('x'), 3]), 4]), '{["Exp",1], ["Exp",["RootOf",["List",-4,0,0,1],0]]}'],
    ['E8 x·eˣ = 1', eq(times('x', exp('x')), 1), '{["LambertW",1]}'],
    ['E9 eˣ = −3', eq(exp('x'), -3), 'empty'],
  ])('%s', (_, json, expected) => {
    expect(run(json).text).toBe(expected);
  });
});

group('nested chains (C6/C7 moved here from composition)', () => {
  it('C6 and C7 give the identical canonical answer e^{e^e}', () => {
    const c6 = run(eq(ln(ln(ln('x'))), 1)), c7 = run(eq(ln(ln(ln(ln('x')))), 0));
    expect(c6.text).toBe('{["Exp",["Exp",["Exp",1]]]}');
    expect(c7.text).toBe(c6.text);
  });

  it('solves a depth-25 chain with the same code', () => {
    let inner: unknown = 'x';
    for (let i = 0; i < 25; i++) inner = ln(['Add', 1, inner]);
    expect(run(eq(inner)).text).toBe('{0}');
    let mixed: unknown = 'x';
    for (let i = 0; i < 25; i++) mixed = i % 2 === 0 ? exp(mixed) : ln(mixed);
    expect(run(eq(mixed, ['Exp', 1])).text).toBe('{1}');
  }, 120_000);
});

group('equivalent forms converge', () => {
  it('lattice and logarithm canonical forms', () => {
    expect(run(eq(['Power', 4, 'x'], 8)).text).toBe('{3/2}');
    expect(run(eq(['Power', 2, times(2, 'x')], 8)).text).toBe('{3/2}');
    expect(run(eq(exp(times(2, 'x')), 4)).text).toBe('{["Ln",2]}');
    expect(run(eq(exp('x'), 2)).text).toBe(run(eq(['Power', ['Exp', 'x'], 2], 4)).text);
    expect(run(eq(['Log', 'x', 2], 3)).text).toBe('{8}');
    expect(run(eq(exp(['Add', 'x', ln(2)]), 6)).text).toBe('{["Ln",3]}');
  });
});

group('logarithms', () => {
  it.each([
    ['ln x + ln(x+1) = ln 6 (−3 excluded by the domain)', eq(['Add', ln('x'), ln(['Add', 'x', 1])], ln(6)), '{2}'],
    ['ln(x²) = 2', eq(ln(['Power', 'x', 2]), 2), '{["Multiply",-1,["Exp",1]], ["Exp",1]}'],
    ['ln(x²+1) = 1 → ±√(e−1)', eq(ln(['Add', ['Power', 'x', 2], 1]), 1), '{["Multiply",-1,["Power",["Multiply",-1,["Add",1,["Multiply",-1,["Exp",1]]]],["Rational",1,2]]], ["Power",["Multiply",-1,["Add",1,["Multiply",-1,["Exp",1]]]],["Rational",1,2]]}'],
    ['log₂ x = 3', eq(['Log', 'x', 2], 3), '{8}'],
    ['ln(x − 1) = 0', eq(ln(['Subtract', 'x', 1])), '{2}'],
    ['ln x = −ln x', eq(ln('x'), ['Negate', ln('x')]), '{1}'],
    ['ln(x) − ln(x²) = 1', eq(['Subtract', ln('x'), ln(['Power', 'x', 2])], 1), '{["Exp",-1]}'],
  ])('%s', (_, json, expected) => {
    expect(run(json).text).toBe(expected);
  });
});

group('transcendental coefficients (shifts absorbed; otherwise degree 1)', () => {
  it('solves the linear and shift-absorbable cases', () => {
    expect(run(eq(['Add', exp(['Add', 'x', 1]), exp('x')], 3)).text).toBe('{["Ln",["Multiply",3,["Power",["Add",1,["Exp",1]],-1]]]}');
    expect(run(eq(['Add', exp(['Add', times(2, 'x'), 2]), times(-3, exp(['Add', 'x', 1])), 2])).text).toBe('{-1, ["Add",-1,["Ln",2]]}');
  });
});

group('Lambert W (real branches, exact simplification)', () => {
  it.each([
    ['x·eˣ = −1/(2e): both branches', eq(times('x', exp('x')), ['Divide', -1, times(2, 'ExponentialE')]), '{["LambertW",["Multiply",["Rational",-1,2],["Exp",-1]],-1], ["LambertW",["Multiply",["Rational",-1,2],["Exp",-1]]]}'],
    ['x·eˣ = −1/e: the double root', eq(times('x', exp('x')), ['Negate', exp(-1)]), '{-1}'],
    ['x·eˣ = −1: none (below −1/e)', eq(times('x', exp('x')), -1), 'empty'],
    ['2ˣ = x + 1: exactly {0, 1}', eq(['Power', 2, 'x'], ['Add', 'x', 1]), '{0, 1}'],
    ['x·ln x = 2·ln 2', eq(times('x', ln('x')), times(2, ln(2))), '{2}'],
    ['x^x = 27', eq(['Power', 'x', 'x'], 27), '{3}'],
    ['ln x = x − 1 (tangency)', eq(ln('x'), ['Subtract', 'x', 1]), '{1}'],
    ['(x+1)·e^{x+1} = e', eq(times(['Add', 'x', 1], exp(['Add', 'x', 1])), 'ExponentialE'), '{0}'],
    ['x²·eˣ = 1: real square roots, then W', eq(times(['Power', 'x', 2], exp('x')), 1), '{["Multiply",2,["LambertW",["Rational",1,2]]]}'],
  ])('%s', (_, json, expected) => {
    expect(run(json).text).toBe(expected);
  });
});

group('inequalities and conjunctions', () => {
  it.each([
    ['eˣ > 2', ['Greater', exp('x'), 2], '(["Ln",2], +inf)'],
    ['ln x ≤ 1', ['LessEqual', ln('x'), 1], '(0, ["Exp",1]]'],
    ['2ˣ + 4ˣ < 6', ['Less', ['Add', ['Power', 2, 'x'], ['Power', 4, 'x']], 6], '(-inf, 1)'],
    ['x·eˣ < 1', ['Less', times('x', exp('x')), 1], '(-inf, ["LambertW",1])'],
    ['ln(ln x) > 0', ['Greater', ln(ln('x')), 0], '(["Exp",1], +inf)'],
    ['eˣ = 2 ∧ x > 0', ['And', eq(exp('x'), 2), ['Greater', 'x', 0]], '{["Ln",2]}'],
    ['eˣ ≥ x + 1 (everywhere)', ['GreaterEqual', exp('x'), ['Add', 'x', 1]], '(-inf, +inf)'],
    ['eˣ > x + 1', ['Greater', exp('x'), ['Add', 'x', 1]], '(-inf, 0) ∪ (0, +inf)'],
    ['ln x ≠ 0', ['NotEqual', ln('x'), 0], '(0, 1) ∪ (1, +inf)'],
  ])('%s', (_, json, expected) => {
    expect(run(json).text).toBe(expected);
  });
});

group('routing to the gates that own a problem', () => {
  it.each([
    [eq(['Add', ['Power', 2, 'x'], ['Power', 3, 'x']], 6), 'incomplete-implementation: EQUATION-CERTIFIED-NUMERICS1: independent exponential generators'],
    [eq(['Add', exp('x'), ln('x')], 1), 'incomplete-implementation: EQUATION-CERTIFIED-NUMERICS1: mixed transcendental kernels'],
    [eq(['Add', exp(times(2, 'x')), exp('x')], 'ExponentialE'), 'incomplete-implementation: EQUATION-PARAMETERS1: degree-2 equation with transcendental coefficients'],
    [eq(ln(['Add', ['Power', 'x', 3], 'x']), 1), 'incomplete-implementation: EQUATION-PARAMETERS1: degree-3 equation with transcendental coefficients'],
    [eq(['Add', ['Sqrt', 'x'], exp('x')], 3), 'incomplete-implementation: EQUATION-CERTIFIED-NUMERICS1: mixed transcendental kernels'],
    [eq(['Add', exp('x'), ['Sin', 'x']]), 'incomplete-implementation: EQUATION-CERTIFIED-NUMERICS1: mixed transcendental kernels'],
    [eq(times('a', exp('x')), 1), 'incomplete-implementation: EQUATION-PARAMETERS1: parameters a'],
  ])('%j', (json, expected) => {
    expect(run(json).text).toBe(expected);
  });

  it('sends complex exp/log to the complex families of the periodic slice and polynomial problems to slice 1', () => {
    expect(run(eq(exp('x'), 2), 'complex').text).toBe('{["Add",["Multiply",2,"Pi","k","ImaginaryUnit"],["Ln",2]] : k ∈ ℤ}');
    expect(run(eq(['Power', 'x', 2], 2)).text).toBe('{≈-1.414214, ≈1.414214}');
  });
});
