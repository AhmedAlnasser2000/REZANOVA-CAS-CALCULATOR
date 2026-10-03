import { describe as group, expect, it } from 'vitest';
import { EquationAlgebraError } from '../execution';
import { context } from '../test-support';
import { decideEquation, verifyEquationOutcome } from '../decide';
import { describe } from '../decision/test-helpers';
import { ExpressionStore, type ExprId } from '../representation/expression';
import { readRelations } from '../representation/mathjson';
import { relationProblem } from '../representation/relation';
import type { EquationOutcome, Interval, SolutionSet } from '../representation/solution-set';
import type { ProofLog } from '../representation/transform';
import { decodeOutcome, encodeOutcome } from '../representation/wire';
import { rational } from '../algebra/rational';

function setup(json: unknown, store = new ExpressionStore(context())) {
  const r = readRelations(store, json);
  if (r.kind !== 'ok') throw new Error(JSON.stringify(r));
  const problem = relationProblem(store, { domain: 'real', targets: ['x'], relations: r.value });
  return { store, problem, outcome: decideEquation(problem) };
}
const eq = (a: unknown, b: unknown = 0) => ['Equal', a, b];
const sin = (a: unknown) => ['Sin', a];
const T1 = eq(sin('x'), ['Rational', 1, 2]);

function solved(o: EquationOutcome): { set: SolutionSet; proof: ProofLog } {
  if (o.kind !== 'solved') throw new Error(o.kind);
  return o;
}

function rejects(f: () => void, reason: RegExp) {
  let caught: unknown;
  try { f(); } catch (e) { caught = e; }
  expect(caught).toBeInstanceOf(EquationAlgebraError);
  expect((caught as EquationAlgebraError).code).toBe('verification-failed');
  expect((caught as EquationAlgebraError).reason).toMatch(reason);
}

const ev = (id: ExprId) => ({ kind: 'expression', id }) as const;
const pt = (id: ExprId): Interval => ({ lo: ev(id), hi: ev(id), loClosed: true, hiClosed: true });

group('verifier rejects tampering with periodic answers', () => {
  it('rejects a wrong residue and a wrong period by exact members', () => {
    const { store: s, problem, outcome } = setup(T1);
    const { set: tset, proof } = solved(outcome), set = tset;
    if (set.kind !== 'periodic-set') throw new Error(set.kind);
    const pi = s.constant('pi'), qp = (n: bigint, d: bigint) => s.mul(s.number(rational(s.ctx, n, d)), pi);
    rejects(() => verifyEquationOutcome(problem, { kind: 'solved', proof, set: { ...set, components: [pt(qp(1n, 6n)), pt(qp(2n, 3n))] } }), /periodic member does not satisfy a relation exactly/);
    rejects(() => verifyEquationOutcome(problem, { kind: 'solved', proof, set: { ...set, period: ev(pi) } }), /periodic member does not satisfy a relation exactly/);
    rejects(() => verifyEquationOutcome(problem, { kind: 'empty', proof }), /claimed empty/);
  });

  it('rejects a moved component end, a wrong range and a dropped enumerated point', () => {
    const a = setup(['Greater', sin('x'), ['Rational', 1, 2]]);
    const as = solved(a.outcome), aset = as.set;
    if (aset.kind !== 'periodic-set') throw new Error(aset.kind);
    const moved: Interval = { ...aset.components[0], hi: ev(a.store.constant('pi')) };
    rejects(() => verifyEquationOutcome(a.problem, { kind: 'solved', proof: as.proof, set: { ...aset, components: [moved] } }), /differs/);

    const b = setup(['And', eq(sin('x')), ['Greater', 'x', 0]]);
    const bs = solved(b.outcome), bset = bs.set;
    if (bset.kind !== 'periodic-set') throw new Error(bset.kind);
    const fromZero: Interval = { ...bset.range, lo: { kind: 'rational', value: rational(b.store.ctx, 0n) } };
    rejects(() => verifyEquationOutcome(b.problem, { kind: 'solved', proof: bs.proof, set: { ...bset, range: fromZero } }), /does not satisfy a relation exactly/);

    const c = setup(['And', eq(sin('x')), ['LessEqual', 0, 'x'], ['LessEqual', 'x', 100]]);
    const cs = solved(c.outcome), cset = cs.set;
    if (cset.kind !== 'finite') throw new Error(cset.kind);
    rejects(() => verifyEquationOutcome(c.problem, { kind: 'solved', proof: cs.proof, set: { ...cset, points: cset.points.slice(1) } }), /differs/);
  }, 60_000);

  it('rejects an interval pattern claimed on the whole line for a non-periodic sign', () => {
    const { problem, outcome } = setup(['Greater', ['Multiply', 'x', sin('x')], 0]);
    const { set, proof } = solved(outcome);
    if (set.kind !== 'union') throw new Error(set.kind);
    const right = set.sets.find(p => p.kind === 'periodic-set' && p.range.hi.kind === 'infinity' && p.range.lo.kind !== 'infinity');
    if (!right || right.kind !== 'periodic-set') throw new Error('no right tail');
    const whole = { ...right, range: { lo: { kind: 'infinity', sign: -1 }, hi: { kind: 'infinity', sign: 1 }, loClosed: false, hiClosed: false } } as SolutionSet;
    rejects(() => verifyEquationOutcome(problem, { kind: 'solved', proof, set: whole }), /periodic interval sample does not satisfy/);
  });

  it('rejects a proof without its trig-domain step', () => {
    const { problem, outcome } = setup(['GreaterEqual', ['Tan', 'x'], 1]);
    const { set, proof } = solved(outcome);
    const k = proof.records.findIndex(r => r.rule === 'trig-domain');
    expect(k).toBeGreaterThanOrEqual(0);
    rejects(() => verifyEquationOutcome(problem, { kind: 'solved', set, proof: { ...proof, records: proof.records.filter((_, i) => i !== k) } }), /discontinuity/);
  });
});

group('wire replay', () => {
  it('round-trips periodic sets, half-lines, families and enumerated points, and verifies the replay', () => {
    const cases = [T1, ['And', eq(sin('x')), ['Greater', 'x', 0]], eq(sin(['Exp', 'x']), ['Rational', 1, 2]), ['LessEqual', ['Cos', 'x'], 0], eq(sin(['Multiply', 2, 'x']), ['Cos', 'x'])];
    for (const json of cases) {
      const { store, outcome } = setup(json);
      const wire = JSON.parse(JSON.stringify(encodeOutcome(store, outcome)));
      const back = decodeOutcome(context(), wire);
      const replayed = back.outcome as Extract<EquationOutcome, { kind: 'solved' }>;
      verifyEquationOutcome(replayed.proof.states.get(replayed.proof.root)!, replayed);
      expect(describe(back.store, replayed)).toBe(describe(store, outcome));
    }
  }, 120_000);
});

group('resources', () => {
  it('reports typed work and cancellation stops, never partial answers', () => {
    const T5 = eq(sin(['Multiply', 2, 'x']), ['Cos', 'x']);
    const tiny = new ExpressionStore(context({ work: 40_000 }));
    expect(setup(T5, tiny).outcome).toEqual({ kind: 'resource', stop: 'work' });
    let polls = 0;
    const cancelled = new ExpressionStore(context({}, () => ++polls > 30_000));
    expect(setup(T5, cancelled).outcome).toEqual({ kind: 'resource', stop: 'cancelled' });
    expect(setup(T5).outcome.kind).toBe('solved');
  }, 60_000);
});
