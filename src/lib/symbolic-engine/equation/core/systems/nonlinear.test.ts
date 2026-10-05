import { describe as group, expect, it } from 'vitest';
import { EquationAlgebraError } from '../execution';
import { context } from '../test-support';
import { decideEquation, verifyEquationOutcome } from '../decide';
import { describe } from '../decision/test-helpers';
import { realDecimal, type RealRootOf } from '../algebraic/root-of';
import { ExpressionStore } from '../representation/expression';
import { readRelations } from '../representation/mathjson';
import { relationProblem, type ProblemDomain } from '../representation/relation';
import type { EquationOutcome, PointValue, SolutionSet } from '../representation/solution-set';
import type { ProofLog } from '../representation/transform';
import { decodeOutcome, encodeOutcome } from '../representation/wire';

function setup(json: unknown, targets = ['x', 'y'], domain: ProblemDomain = 'real', store = new ExpressionStore(context())) {
  const r = readRelations(store, json);
  if (r.kind !== 'ok') throw new Error(JSON.stringify(r));
  const problem = relationProblem(store, { domain, targets, relations: r.value });
  return { store, problem, outcome: decideEquation(problem) };
}
function run(json: unknown, targets = ['x', 'y'], domain: ProblemDomain = 'real') {
  const s = setup(json, targets, domain);
  verifyEquationOutcome(s.problem, s.outcome);
  return { ...s, text: describe(s.store, s.outcome) };
}
function solved(o: EquationOutcome): { set: SolutionSet; proof: ProofLog } {
  if (o.kind !== 'solved') throw new Error(`${o.kind}: ${'reason' in o ? o.reason : ''}`);
  return o;
}
function rejects(f: () => void, reason: RegExp) {
  let caught: unknown;
  try { f(); } catch (e) { caught = e; }
  expect(caught).toBeInstanceOf(EquationAlgebraError);
  expect((caught as EquationAlgebraError).code).toBe('verification-failed');
  expect((caught as EquationAlgebraError).reason).toMatch(reason);
}
const mul = (...a: unknown[]) => ['Multiply', ...a], pow = (a: unknown, k: number) => ['Power', a, k], add = (...a: unknown[]) => ['Add', ...a];
const eq = (l: unknown, r: unknown) => ['Equal', l, r];
const katsura = ['And', eq(add('x', mul(2, 'y'), mul(2, 'z')), 1), eq(add(pow('x', 2), mul(2, pow('y', 2)), mul(2, pow('z', 2))), 'x'), eq(add(mul(2, 'x', 'y'), mul(2, 'y', 'z')), 'y')];
const digits = (v: PointValue) => (v.kind === 'rational' ? `${v.value.numerator}/${v.value.denominator}` : v.kind === 'algebraic' && v.root.kind === 'real' ? realDecimal(new ExpressionStore(context()).ctx, v.root as RealRootOf, 9) : v.kind);

// Reference digits: Python mpmath (polyroots / findroot at 30 digits).
group('zero-dimensional systems: exact points', () => {
  it('x² + y² = 5, x·y = 2 has four rational points', () => {
    expect(run(['And', eq(add(pow('x', 2), pow('y', 2)), 5), eq(mul('x', 'y'), 2)]).text).toBe('{(-2, -1), (-1, -2), (1, 2), (2, 1)}');
  });

  it('x² + y² = 1, x = y gives ±√2/2 with radical forms', () => {
    const r = run(['And', eq(add(pow('x', 2), pow('y', 2)), 1), eq('x', 'y')]);
    const set = solved(r.outcome).set;
    if (set.kind !== 'finite') throw new Error(set.kind);
    expect(set.points.map(p => p.map(digits))).toEqual([['-0.707106781', '-0.707106781'], ['0.707106781', '0.707106781']]);
    expect(set.points.every(p => p.every(v => v.kind === 'algebraic' && 'form' in v && v.form !== undefined))).toBe(true);
  });

  it('a cubic eliminant gives RootOf coordinates (x³ − x − 1 = 0, y = x²)', () => {
    const set = solved(run(['And', eq(add(pow('x', 3), mul(-1, 'x'), -1), 0), eq('y', pow('x', 2))]).outcome).set;
    if (set.kind !== 'finite') throw new Error(set.kind);
    expect(set.points.map(p => p.map(digits))).toEqual([['1.324717957', '1.754877666']]);
  });

  it('complex-only solutions: empty over ℝ (Hermite signature 0), two points over ℂ', () => {
    const json = ['And', eq(add(pow('x', 2), pow('y', 2)), -1), eq('x', 'y')];
    expect(run(json).text).toBe('empty');
    expect(run(json, ['x', 'y'], 'complex').text).toBe('{(≈0.000000+0.707107i, ≈0.000000+0.707107i), (≈0.000000-0.707107i, ≈0.000000-0.707107i)}');
  });

  it('Katsura-3 in three unknowns: four real solutions', () => {
    const set = solved(run(katsura, ['x', 'y', 'z']).outcome).set;
    if (set.kind !== 'finite') throw new Error(set.kind);
    // Reference: SymPy solve and mpmath findroot (independent of this code).
    expect(set.points.map(p => p.map(digits))).toEqual([
      ['0.226540920', '0.113270460', '0.273459080'], ['1/3', '0/1', '1/3'], ['0.630601937', '0.315300969', '-0.130601937'], ['1/1', '0/1', '0/1'],
    ]);
  }, 60_000);

  it('exclusions are exact: 1/x = y, x² + y² = 2 keeps (±1, ±1); x·y = 1, x = 0 is empty', () => {
    expect(run(['And', eq(['Divide', 1, 'x'], 'y'), eq(add(pow('x', 2), pow('y', 2)), 2)]).text).toBe('{(-1, -1), (1, 1)}');
    expect(run(['And', eq(mul('x', 'y'), 1), eq('x', 0)]).text).toBe('empty');
  });
});

group('positive-dimensional systems: triangular parametric sets', () => {
  it('the circle x² + y² = 1: two branches over ℝ on −1 ≤ y ≤ 1, two over ℂ without conditions', () => {
    const r = solved(run(eq(add(pow('x', 2), pow('y', 2)), 1)).outcome).set;
    expect(r.kind).toBe('union');
    expect(run(eq(add(pow('x', 2), pow('y', 2)), 1)).text).toMatch(/: y free, nonnegative .* ∪ .*: y free, nonnegative/);
    expect(run(eq(add(pow('x', 2), pow('y', 2)), 1), ['x', 'y'], 'complex').text).not.toMatch(/nonnegative/);
  });

  it('x·y = 0 splits; x² = y, z = x is a curve in three unknowns', () => {
    expect(run(eq(mul('x', 'y'), 0)).text).toBe('{("x", "y") : x, y free, equal 0 "y"} ∪ {(0, "y") : y free, not-equal 0 "y"}');
    expect(run(['And', eq(add(pow('x', 2), mul(-1, 'y')), 0), eq(add('z', mul(-1, 'x')), 0)], ['x', 'y', 'z']).text).toBe('{("z", ["Power","z",2], "z") : z free}');
  });
});

group('systems with kernels: elimination', () => {
  it('eˣ + y = 3, y = 1 → (ln 2, 1); ln x + y = 0, y = −1 → (e, −1); y = eˣ is a curve', () => {
    expect(run(['And', eq(add(['Exp', 'x'], 'y'), 3), eq('y', 1)]).text).toBe('{(["Ln",2], 1)}');
    expect(run(['And', eq(add(['Ln', 'x'], 'y'), 0), eq('y', -1)]).text).toBe('{(["Exp",1], -1)}');
    expect(run(eq('y', ['Exp', 'x'])).text).toBe('{("x", ["Exp","x"]) : x free}');
  });

  it('sin x = y, 2y = 1 gives two families; sin x = y, x + y = 0 gives (0, 0)', () => {
    expect(run(['And', eq(['Sin', 'x'], 'y'), eq(mul(2, 'y'), 1)]).text).toBe('{["Add",["Multiply",2,"Pi","k"],["Multiply",["Rational",1,6],"Pi"]], ["Rational",1,2] : k ∈ ℤ} ∪ {["Add",["Multiply",2,"Pi","k"],["Multiply",["Rational",5,6],"Pi"]], ["Rational",1,2] : k ∈ ℤ}');
    expect(run(['And', eq(['Sin', 'x'], 'y'), eq(add('x', 'y'), 0)]).text).toBe('{(0, 0)}');
  });

  it('over ℂ: eˣ = y, y = 2 gives ln 2 + 2πik', () => {
    expect(run(['And', eq(['Exp', 'x'], 'y'), eq('y', 2)], ['x', 'y'], 'complex').text).toBe('{["Add",["Multiply",2,"Pi","k","ImaginaryUnit"],["Ln",2]], 2 : k ∈ ℤ}');
  });

  it('refuses what elimination cannot reach', () => {
    const r = setup(['And', eq(add(['Exp', 'x'], ['Sin', 'y']), 1), eq(add(['Exp', 'y'], ['Sin', 'x']), 1)]);
    expect(describe(r.store, r.outcome)).toMatch(/incomplete-implementation: EQUATION-CERTIFIED-NUMERICS1: no target can be isolated/);
  });
});

group('verifier rejects tampering', () => {
  it('rejects a missing point, a swapped coordinate, a wrong empty claim and a wrong branch', () => {
    const p = setup(['And', eq(add(pow('x', 2), pow('y', 2)), 5), eq(mul('x', 'y'), 2)]), ps = solved(p.outcome), set = ps.set;
    if (set.kind !== 'finite') throw new Error(set.kind);
    const swap = (s: SolutionSet) => () => verifyEquationOutcome(p.problem, { kind: 'solved', proof: ps.proof, set: s });
    rejects(swap({ ...set, points: set.points.slice(1) }), /number of points/);
    // Right count, but one solution claimed twice and another dropped (no re-derivation runs for finite answers).
    rejects(swap({ ...set, points: [set.points[0], ...set.points.slice(0, -1)] }), /claimed twice/);
    rejects(swap({ ...set, points: [[set.points[0][0], set.points[1][1]], ...set.points.slice(1)] }), /does not satisfy/);
    rejects(() => verifyEquationOutcome(p.problem, { kind: 'empty', proof: ps.proof }), /number of points|different outcome/);
    const c = setup(eq(add(pow('x', 2), pow('y', 2)), 1)), cs = solved(c.outcome), cset = cs.set;
    if (cset.kind !== 'union') throw new Error(cset.kind);
    rejects(() => verifyEquationOutcome(c.problem, { kind: 'solved', proof: cs.proof, set: cset.sets[0] }), /differ/);
  }, 60_000);
});

group('wire replay and resources', () => {
  it('round-trips algebraic points, parametric unions and families', () => {
    for (const [json, domain] of [[['And', eq(add(pow('x', 2), pow('y', 2)), 1), eq('x', 'y')], 'real'], [eq(add(pow('x', 2), pow('y', 2)), 1), 'real'], [['And', eq(['Sin', 'x'], 'y'), eq(mul(2, 'y'), 1)], 'real']] as const) {
      const { store, outcome } = setup(json, ['x', 'y'], domain);
      const back = decodeOutcome(context(), JSON.parse(JSON.stringify(encodeOutcome(store, outcome))));
      const replayed = back.outcome as Extract<EquationOutcome, { kind: 'solved' }>;
      verifyEquationOutcome(replayed.proof.states.get(replayed.proof.root)!, replayed);
      expect(describe(back.store, replayed)).toBe(describe(store, outcome));
    }
  }, 60_000);

  it('reports typed work and cancellation stops', () => {
    expect(setup(katsura, ['x', 'y', 'z'], 'real', new ExpressionStore(context({ work: 20_000 }))).outcome).toEqual({ kind: 'resource', stop: 'work' });
    let polls = 0;
    expect(setup(katsura, ['x', 'y', 'z'], 'real', new ExpressionStore(context({}, () => ++polls > 20_000))).outcome).toEqual({ kind: 'resource', stop: 'cancelled' });
  });
});
