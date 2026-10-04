import { describe as group, expect, it } from 'vitest';
import { EquationAlgebraError } from '../execution';
import { rational, rCompare, rSubtract, type Rational } from '../algebra/rational';
import { context } from '../test-support';
import { decideEquation, verifyEquationOutcome } from '../decide';
import { describe } from '../decision/test-helpers';
import { ExpressionStore } from '../representation/expression';
import { readRelations } from '../representation/mathjson';
import { relationProblem, type ProblemDomain } from '../representation/relation';
import type { EquationOutcome, PointValue, SolutionSet } from '../representation/solution-set';
import type { ProofLog } from '../representation/transform';
import { decodeOutcome, encodeOutcome } from '../representation/wire';
import { ConstantAlgebra, constantForm, type Root } from './constants';
import { parametricAtoms } from './specialize';
import { coefficientsIn } from './mpoly';

function setup(json: unknown, domain: ProblemDomain = 'real', store = new ExpressionStore(context())) {
  const r = readRelations(store, json);
  if (r.kind !== 'ok') throw new Error(JSON.stringify(r));
  const problem = relationProblem(store, { domain, targets: ['x'], relations: r.value });
  return { store, problem, outcome: decideEquation(problem) };
}
function run(json: unknown, domain: ProblemDomain = 'real') {
  const s = setup(json, domain);
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

/** A root value refined to width 10⁻⁸ and printed to 7 decimals (exact, by the same Sturm algebra). */
function digits(store: ExpressionStore, v: PointValue): string {
  if (v.kind !== 'root' || !v.lo || !v.hi) throw new Error(v.kind);
  const own = relationProblem(store, { domain: 'real', targets: ['x'], relations: [{ op: 'eq', lhs: v.poly, rhs: store.integer(0) }] });
  const form = constantForm(own), atoms = parametricAtoms(form.problem);
  if ('owner' in atoms) throw new Error('not polynomial');
  const alg = new ConstantAlgebra(store, form.back), ctx = store.ctx;
  let r: Root = { poly: alg.squareFree(coefficientsIn(atoms.atoms[0].poly, 0)), lo: v.lo, hi: v.hi };
  const width: Rational = rational(ctx, 1n, 100_000_000n);
  while (!r.exact && rCompare(ctx, rSubtract(ctx, r.hi, r.lo), width) > 0) r = alg.refine(r);
  const mid = r.exact ?? r.lo;
  return (Number(mid.numerator * 10n ** 9n / mid.denominator) / 1e9).toFixed(7);
}
const mul = (...a: unknown[]) => ['Multiply', ...a], pow = (a: unknown, k: number) => ['Power', a, k];
const cubic = ['Add', mul('Pi', pow('x', 3)), 'x', ['Negate', 'ExponentialE']];

// Reference digits: Python mpmath polyroots at 30 digits.
group('transcendental constant coefficients over ℝ', () => {
  it('π·x³ + x − e = 0 has one real root 0.8421191…', () => {
    const r = run(['Equal', cubic, 0]);
    const set = solved(r.outcome).set;
    if (set.kind !== 'finite') throw new Error(set.kind);
    expect(set.points).toHaveLength(1);
    expect(r.text).toMatch(/^\{root1\(/);
    expect(digits(r.store, set.points[0][0])).toBe('0.8421191');
  });

  it('x⁵ − π·x + 1 = 0 has three real roots', () => {
    const r = run(['Equal', ['Add', pow('x', 5), mul(-1, 'Pi', 'x'), 1], 0]);
    const set = solved(r.outcome).set;
    if (set.kind !== 'finite') throw new Error(set.kind);
    expect(set.points.map(p => digits(r.store, p[0]))).toEqual(['-1.4012416', '0.3193674', '1.2358080']);
  });

  it('x³ − π·x < 0 keeps the exact root 0 between two isolated roots', () => {
    const r = run(['Less', ['Subtract', pow('x', 3), mul('Pi', 'x')], 0]);
    expect(r.text).toMatch(/^\(-inf, root1\(.*\)\) ∪ \(0, root3\(.*\)\)$/);
  });

  it('degree ≤ 2 gives radical closed forms, also in conjunctions', () => {
    expect(run(['Equal', pow('x', 2), 'Pi']).text).toBe('{["Multiply",-1,["Power","Pi",["Rational",1,2]]], ["Power","Pi",["Rational",1,2]]}');
    expect(run(['Equal', mul('Pi', 'x'), 1]).text).toBe('{["Power","Pi",-1]}');
    expect(run(['And', ['Less', pow('x', 2), 'Pi'], ['Greater', 'x', 1]]).text).toBe('(1, ["Power","Pi",["Rational",1,2]])');
    expect(run(['Less', pow('x', 2), mul(-1, 'Pi')]).text).toBe('empty');
  });
});

group('over ℂ and refusals', () => {
  it('π·x³ + x − e = 0 over ℂ is the root set of its polynomial', () => {
    expect(solved(run(['Equal', cubic, 0], 'complex').outcome).set.kind).toBe('root-set');
  });

  it('keeps kernel levels of degree ≥ 3 and complex conjunctions refused (follow-up ledger)', () => {
    const k = setup(['Equal', ['Add', ['Exp', mul(3, 'x')], mul('Pi', ['Exp', 'x'])], 'ExponentialE']);
    expect(describe(k.store, k.outcome)).toMatch(/incomplete-implementation: EQUATION-PARAMETERS1: degree-3 equation with transcendental coefficients/);
    const c = setup(['And', ['Equal', cubic, 0], ['NotEqual', 'x', 1]], 'complex');
    expect(describe(c.store, c.outcome)).toMatch(/incomplete-implementation: EQUATION-PARAMETERS1: .*follow-up ledger/);
  });
});

group('verifier rejects tampering with constant-coefficient roots', () => {
  it('rejects shifted bounds, a wrong index and a widened interval', () => {
    const p = setup(['Equal', ['Add', pow('x', 5), mul(-1, 'Pi', 'x'), 1], 0]), ps = solved(p.outcome), ctx = p.store.ctx;
    if (ps.set.kind !== 'finite') throw new Error(ps.set.kind);
    const pts = ps.set.points;
    const swap = (i: number, v: PointValue) => () => verifyEquationOutcome(p.problem, { kind: 'solved', proof: ps.proof, set: { kind: 'finite', variables: ['x'], points: pts.map((q, j) => (j === i ? [v] : q)) } });
    const first = pts[0][0] as Extract<PointValue, { kind: 'root' }>;
    rejects(swap(0, { ...first, lo: rational(ctx, -1n), hi: rational(ctx, 0n) }), /isolate|differs/);
    rejects(swap(0, { ...first, index: 2 }), /isolate|differs/);
    const q = setup(['Less', ['Subtract', pow('x', 3), mul('Pi', 'x')], 0]), qs = solved(q.outcome), qset = qs.set;
    if (qset.kind !== 'intervals') throw new Error(qset.kind);
    const [, second] = qset.intervals;
    rejects(() => verifyEquationOutcome(q.problem, { kind: 'solved', proof: qs.proof, set: { ...qset, intervals: [{ ...second, lo: { kind: 'infinity', sign: -1 } }] } }), /differs/);
  });
});

group('wire replay and resources', () => {
  it('round-trips root bounds and verifies the replay', () => {
    for (const json of [['Equal', cubic, 0], ['Less', ['Subtract', pow('x', 3), mul('Pi', 'x')], 0]]) {
      const { store, outcome } = setup(json);
      const back = decodeOutcome(context(), JSON.parse(JSON.stringify(encodeOutcome(store, outcome))));
      const replayed = back.outcome as Extract<EquationOutcome, { kind: 'solved' }>;
      verifyEquationOutcome(replayed.proof.states.get(replayed.proof.root)!, replayed);
      expect(describe(back.store, replayed)).toBe(describe(store, outcome));
    }
  });

  it('reports typed work and cancellation stops', () => {
    const json = ['Equal', ['Add', pow('x', 5), mul(-1, 'Pi', 'x'), 1], 0];
    expect(setup(json, 'real', new ExpressionStore(context({ work: 5_000 }))).outcome).toEqual({ kind: 'resource', stop: 'work' });
    let polls = 0;
    expect(setup(json, 'real', new ExpressionStore(context({}, () => ++polls > 5_000))).outcome).toEqual({ kind: 'resource', stop: 'cancelled' });
  });
});
