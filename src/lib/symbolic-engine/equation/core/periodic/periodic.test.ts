import { describe as group, expect, it } from 'vitest';
import { context } from '../test-support';
import { realDecimal, type RealRootOf } from '../algebraic/root-of';
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
const sin = (a: unknown) => ['Sin', a], cos = (a: unknown) => ['Cos', a];
const half = ['Rational', 1, 2];
const P2 = '["Multiply",2,"Pi"]';
const qpi = (n: number, d: number) => `["Multiply",["Rational",${n},${d}],"Pi"]`;

group('baseline corpus T1–T7 (exact families; the old engine refused T3 and gave decimals for T6)', () => {
  it.each([
    ['T1 sin x = 1/2', eq(sin('x'), half), `{${qpi(1, 6)}, ${qpi(5, 6)}} + ${P2}ℤ`],
    ['T2 3sin²x + 2sin x − 1 = 0', eq(['Add', ['Multiply', 3, ['Power', sin('x'), 2]], ['Multiply', 2, sin('x')], -1]),
      `{${qpi(-1, 2)}, ["Arcsin",["Rational",1,3]], ["Add","Pi",["Multiply",-1,["Arcsin",["Rational",1,3]]]]} + ${P2}ℤ`],
    ['T3 sin⁴x − 5sin²x + 4 = 0', eq(['Add', ['Power', sin('x'), 4], ['Multiply', -5, ['Power', sin('x'), 2]], 4]), `{${qpi(1, 2)}} + "Pi"ℤ`],
    ['T4 sin x + cos x = 1', eq(['Add', sin('x'), cos('x')], 1), `{0, ${qpi(1, 2)}} + ${P2}ℤ`],
    ['T5 sin 2x = cos x (π/2 + 2πk and π/6 + 2πk/3, as sin A = sin B)', eq(sin(['Multiply', 2, 'x']), cos('x')),
      `{${qpi(1, 2)}} + ${P2}ℤ ∪ {${qpi(1, 6)}} + ${qpi(2, 3)}ℤ`],
    ['T6 sin x = 0', eq(sin('x')), '{0} + "Pi"ℤ'],
    ['T7 sin x = 2', eq(sin('x'), 2), 'empty'],
  ])('%s', (_, json, expected) => {
    expect(run(json).text).toBe(expected);
  }, 60_000);

  it('T6 on [0, 100] is the 32 exact points kπ, k = 0…31', () => {
    const r = run(['And', eq(sin('x')), ['LessEqual', 0, 'x'], ['LessEqual', 'x', 100]]);
    if (r.outcome.kind !== 'solved' || r.outcome.set.kind !== 'finite') throw new Error(r.text);
    expect(r.outcome.set.points.length).toBe(32);
    const expected = ['0', '"Pi"', ...Array.from({ length: 30 }, (_, k) => `["Multiply",${k + 2},"Pi"]`)];
    expect(r.text).toBe(`{${expected.join(', ')}}`);
  }, 60_000);
});

group('composition chains through trig (C1–C5 moved here from composition)', () => {
  const acos = '["Arccos",["Multiply",["Rational",1,6],"Pi"]]';
  const asin4 = '["Arcsin",["Arcsin",["Arcsin",["Arcsin",["Rational",1,10]]]]]';
  it.each([
    ['C1 sin(cos x) = 1/2', eq(sin(cos('x')), half), `{["Multiply",-1,${acos}], ${acos}} + ${P2}ℤ`],
    ['C2 sin(cos eˣ) = 1/2', eq(sin(cos(['Exp', 'x'])), half),
      `{["Ln",["Add",["Multiply",-1,${acos}],["Multiply",2,"Pi","k"]]] : k ∈ ℤ, nonnegative ["Add",-1,"k"]} ∪ {["Ln",["Add",["Multiply",2,"Pi","k"],${acos}]] : k ∈ ℤ, nonnegative "k"}`],
    ['C3 sin(sin(sin(sin x))) = 1/10', eq(sin(sin(sin(sin('x')))), ['Rational', 1, 10]), `{${asin4}, ["Add","Pi",["Multiply",-1,${asin4}]]} + ${P2}ℤ`],
    ['C4 cos⁷ x = 1/2 (range argument)', eq(cos(cos(cos(cos(cos(cos(cos('x'))))))), half), 'empty'],
    ['C5 e^{sin x} = 2', eq(['Exp', sin('x')], 2), `{["Arcsin",["Ln",2]], ["Add","Pi",["Multiply",-1,["Arcsin",["Ln",2]]]]} + ${P2}ℤ`],
    ['sin eˣ = 1/2', eq(sin(['Exp', 'x']), half),
      `{["Ln",["Add",["Multiply",2,"Pi","k"],${qpi(5, 6)}]] : k ∈ ℤ, nonnegative "k"} ∪ {["Ln",["Add",["Multiply",2,"Pi","k"],${qpi(1, 6)}]] : k ∈ ℤ, nonnegative "k"}`],
    ['sin √x = 0', eq(sin(['Sqrt', 'x'])), '{0} ∪ {["Power",["Multiply","Pi","k"],2] : k ∈ ℤ, nonnegative ["Add",-1,"k"]}'],
    ['sin x² = 0', eq(sin(['Power', 'x', 2])),
      '{0} ∪ {["Power",["Multiply","Pi","k"],["Rational",1,2]] : k ∈ ℤ, nonnegative ["Add",-1,"k"]} ∪ {["Multiply",-1,["Power",["Multiply","Pi","k"],["Rational",1,2]]] : k ∈ ℤ, nonnegative ["Add",-1,"k"]}'],
    ['sin|x| = 0 (half families merge to πℤ)', eq(sin(['Abs', 'x'])), '{0} + "Pi"ℤ'],
  ])('%s', (_, json, expected) => {
    expect(run(json).text).toBe(expected);
  }, 120_000);
});

group('inequalities and conjunctions', () => {
  it.each([
    ['sin x > 1/2', ['Greater', sin('x'), half], `(${qpi(1, 6)}, ${qpi(5, 6)}) + ${P2}ℤ`],
    ['tan x ≥ 1', ['GreaterEqual', ['Tan', 'x'], 1], `[${qpi(1, 4)}, ${qpi(1, 2)}) + "Pi"ℤ`],
    ['cos x ≤ 0', ['LessEqual', cos('x'), 0], `[${qpi(1, 2)}, ${qpi(3, 2)}] + ${P2}ℤ`],
    ['|sin x| = sin x', eq(['Abs', sin('x')], sin('x')), `[0, "Pi"] + ${P2}ℤ`],
    ['|sin x| < 1/2', ['Less', ['Abs', sin('x')], half], `(${qpi(-1, 6)}, ${qpi(1, 6)}) + "Pi"ℤ`],
    ['sin x ≥ 0 ∧ x² ≤ 10', ['And', ['GreaterEqual', sin('x'), 0], ['LessEqual', ['Power', 'x', 2], 10]], '[≈-3.162278, ["Multiply",-1,"Pi"]] ∪ [0, "Pi"]'],
    ['sin x = 0 ∧ x > 0', ['And', eq(sin('x')), ['Greater', 'x', 0]], '{0} + "Pi"ℤ on ["Pi", +inf)'],
    ['sin x = 0 ∧ x ≠ 0', ['And', eq(sin('x')), ['NotEqual', 'x', 0]], '{0} + "Pi"ℤ on (-inf, ["Multiply",-1,"Pi"]] ∪ {0} + "Pi"ℤ on ["Pi", +inf)'],
    ['x·sin x > 0', ['Greater', ['Multiply', 'x', sin('x')], 0], `(["Multiply",-1,"Pi"], 0) + ${P2}ℤ on (-inf, 0) ∪ (0, "Pi") + ${P2}ℤ on (0, +inf)`],
    ['sin x = 1/2 ∧ cos x > 0', ['And', eq(sin('x'), half), ['Greater', cos('x'), 0]], `{${qpi(1, 6)}} + ${P2}ℤ`],
  ])('%s', (_, json, expected) => {
    expect(run(json).text).toBe(expected);
  }, 60_000);
});

group('inverse trig, factor splitting, shifts and frequencies', () => {
  it.each([
    ['asin x = π/6', eq(['Arcsin', 'x'], ['Divide', 'Pi', 6]), '{1/2}'],
    ['atan x = 2 (2 > π/2)', eq(['Arctan', 'x'], 2), 'empty'],
    ['x·sin x = 0', eq(['Multiply', 'x', sin('x')]), '{0} + "Pi"ℤ'],
    ['(eˣ − 2)·sin x = 0', eq(['Multiply', ['Add', ['Exp', 'x'], -2], sin('x')]), '{["Ln",2]} ∪ {0} + "Pi"ℤ'],
    ['sin(x + 1) = 1/2', eq(sin(['Add', 'x', 1]), half), `{["Add",-1,${qpi(1, 6)}], ["Add",-1,${qpi(5, 6)}]} + ${P2}ℤ`],
    ['sin 3x = 1/2', eq(sin(['Multiply', 3, 'x']), half), `{${qpi(1, 18)}, ${qpi(5, 18)}} + ${qpi(2, 3)}ℤ`],
    ['sin(x + 1) + cos x = 0 (harmonic form)', eq(['Add', sin(['Add', 'x', 1]), cos('x')]),
      '{["Multiply",-1,["Arctan",["Multiply",-1,["Add",-1,["Multiply",-1,["Sin",1]]],["Power",["Cos",1],-1]]]]} + "Pi"ℤ'],
  ])('%s', (_, json, expected) => {
    expect(run(json).text).toBe(expected);
  }, 60_000);

  it('atan x + atan 2x = π/4 is (−3 + √17)/4 (the other candidate is rejected exactly)', () => {
    const r = run(eq(['Add', ['Arctan', 'x'], ['Arctan', ['Multiply', 2, 'x']]], ['Divide', 'Pi', 4]));
    if (r.outcome.kind !== 'solved' || r.outcome.set.kind !== 'finite') throw new Error(r.text);
    const [v] = r.outcome.set.points[0];
    if (v.kind !== 'algebraic') throw new Error(v.kind);
    // mpmath: (sqrt(17) − 3)/4 = 0.28077640640441513745535246399351
    expect(realDecimal(r.store.ctx, v.root as RealRootOf, 30)).toBe('0.280776406404415137455352463994');
  }, 60_000);
});

group('routing to the gates that own a problem', () => {
  it.each([
    [eq(cos('x'), 'x'), '{["IsolatedRoot",["Multiply",-1,["Add",["Cos","ξ"],["Multiply",-1,"ξ"]]],["Rational",1,2],["Rational",3,4]]}'],
    [eq(['Multiply', 'x', sin('x')], 1), 'incomplete-implementation: EQUATION-CERTIFIED-NUMERICS1: infinitely many roots without a closed form as x → −∞; add a range row such as −10 ≤ x ≤ 0'],
    [eq(['Add', sin('x'), sin(['Multiply', ['Sqrt', 2], 'x'])]), 'incomplete-implementation: EQUATION-CERTIFIED-NUMERICS1: infinitely many roots without a closed form as x → −∞; add a range row such as −10 ≤ x ≤ 0'],
    [eq(['Add', sin('x'), ['Exp', 'x']]), 'incomplete-implementation: EQUATION-CERTIFIED-NUMERICS1: infinitely many roots without a closed form as x → −∞; add a range row such as −10 ≤ x ≤ 0'],
    // sin(a·x) = 1/2 is decided by the parameters gate; sin/cos inequalities with parameters stay refused.
    [['Greater', sin('x'), 'a'], 'incomplete-implementation: EQUATION-PARAMETERS1: sin/cos inequalities with parameters (follow-up ledger)'],
  ])('%j', (json, expected) => {
    expect(run(json).text).toBe(expected);
  });

  it('decides complex trig with the complex families (sin x = 1/2 has only real solutions) and keeps slices 1–3 unchanged', () => {
    expect(run(eq(sin('x'), half), 'complex').text).toBe('{["Add",["Multiply",2,"Pi","k"],["Multiply",["Rational",1,6],"Pi"]] : k ∈ ℤ} ∪ {["Add",["Multiply",2,"Pi","k"],["Multiply",["Rational",5,6],"Pi"]] : k ∈ ℤ}');
    expect(run(eq(['Power', 'x', 2], 4)).text).toBe('{-2, 2}');
    expect(run(eq(['Exp', 'x'], 2)).text).toBe('{["Ln",2]}');
    expect(run(eq(['Abs', 'x'], 1)).text).toBe('{-1, 1}');
  });
});
