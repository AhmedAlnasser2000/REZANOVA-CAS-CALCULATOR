import { describe as group, expect, it } from 'vitest';
import { EquationAlgebraError } from '../execution';
import { rational } from '../algebra/rational';
import { context } from '../test-support';
import { decideEquation, verifyEquationOutcome } from '../decide';
import { describe, describeSet } from '../decision/test-helpers';
import { ExpressionStore } from '../representation/expression';
import { readRelations } from '../representation/mathjson';
import { relationProblem, type ProblemDomain } from '../representation/relation';
import type { Case, EquationOutcome, SolutionSet } from '../representation/solution-set';
import type { ProofLog } from '../representation/transform';
import { decodeOutcome, encodeOutcome } from '../representation/wire';
import { caseAt } from './verify';

function setup(json: unknown, domain: ProblemDomain = 'real', store = new ExpressionStore(context())) {
  const r = readRelations(store, json);
  if (r.kind !== 'ok') throw new Error(JSON.stringify(r));
  const problem = relationProblem(store, { domain, targets: ['x'], relations: r.value });
  return { store, problem, outcome: decideEquation(problem) };
}
function solved(o: EquationOutcome): { set: SolutionSet; proof: ProofLog } {
  if (o.kind !== 'solved') throw new Error(`${o.kind}: ${'reason' in o ? o.reason : ''}`);
  return o;
}
/** Decide, verify independently, and read the answer at parameter values. */
function run(json: unknown) {
  const s = setup(json);
  verifyEquationOutcome(s.problem, s.outcome);
  const at = (values: Record<string, number | [number, number]>) => {
    const map = new Map(Object.entries(values).map(([k, v]) => [k, s.store.number(Array.isArray(v) ? rational(s.store.ctx, BigInt(v[0]), BigInt(v[1])) : rational(s.store.ctx, BigInt(v)))]));
    const v = caseAt(s.problem, solved(s.outcome).set, map);
    return v === undefined ? 'undefined' : describeSet(s.store, v);
  };
  const set = solved(s.outcome).set;
  return { ...s, at, cases: set.kind === 'case-tree' ? set.cases : [] };
}
function rejects(f: () => void, reason: RegExp) {
  let caught: unknown;
  try { f(); } catch (e) { caught = e; }
  expect(caught).toBeInstanceOf(EquationAlgebraError);
  expect((caught as EquationAlgebraError).code).toBe('verification-failed');
  expect((caught as EquationAlgebraError).reason).toMatch(reason);
}
const mul = (...a: unknown[]) => ['Multiply', ...a];
const LN2 = '["Ln",2]';

group('single kernels with parameters: equations', () => {
  it('e^{ax} = b: b ≤ 0 empty; a = 0 gives ℝ at b = 1; otherwise ln b / a', () => {
    const r = run(['Equal', ['Exp', mul('a', 'x')], 'b']);
    expect(r.cases).toHaveLength(4);
    expect(r.at({ a: 1, b: 2 })).toBe(`{${LN2}}`);
    expect(r.at({ a: 0, b: 1 })).toBe('(-inf, +inf)');
    expect(r.at({ a: 0, b: 2 })).toBe('{}');
    expect(r.at({ a: 1, b: -1 })).toBe('{}');
  });

  it('ln x = a needs no case; √x = a and |x| = a split on the sign of a', () => {
    const l = run(['Equal', ['Ln', 'x'], 'a']);
    expect(l.cases).toHaveLength(0);
    expect(l.at({ a: 0 })).toBe('{1}');
    const s = run(['Equal', ['Sqrt', 'x'], 'a']);
    expect(s.cases).toHaveLength(2);
    expect([s.at({ a: 3 }), s.at({ a: 0 }), s.at({ a: -1 })]).toEqual(['{9}', '{0}', '{}']);
    const b = run(['Equal', ['Abs', 'x'], 'a']);
    expect(b.cases).toHaveLength(3);
    expect([b.at({ a: 2 }), b.at({ a: 0 }), b.at({ a: -1 })]).toEqual(['{-2, 2}', '{0}', '{}']);
  });

  it('sin x = a: two families for |a| < 1, one at a = ±1, none beyond', () => {
    const r = run(['Equal', ['Sin', 'x'], 'a']);
    expect(r.cases).toHaveLength(4);
    expect(r.at({ a: [1, 2] })).toBe('{["Multiply",["Rational",1,6],"Pi"], ["Multiply",["Rational",5,6],"Pi"]} + ["Multiply",2,"Pi"]ℤ');
    expect(r.at({ a: 1 })).toBe('{["Multiply",["Rational",1,2],"Pi"]} + ["Multiply",2,"Pi"]ℤ');
    expect(r.at({ a: 2 })).toBe('{}');
  });

  it('sin(a·x) = 1/2: the period 2π/|a| follows the sign of a; a = 0 is empty', () => {
    const r = run(['Equal', ['Sin', mul('a', 'x')], ['Rational', 1, 2]]);
    expect(r.cases).toHaveLength(3);
    expect(r.at({ a: 2 })).toBe('{["Multiply",["Rational",1,12],"Pi"], ["Multiply",["Rational",5,12],"Pi"]} + "Pi"ℤ');
    // sin(−2x) = 1/2 ⇔ sin 2x = −1/2: x = −π/12, −5π/12 (mod π).
    expect(r.at({ a: -2 })).toBe('{["Multiply",["Rational",-5,12],"Pi"], ["Multiply",["Rational",-1,12],"Pi"]} + "Pi"ℤ');
    expect(r.at({ a: 0 })).toBe('{}');
  });

  it('cos x ≠ a: arcs between the family points, ℝ for |a| > 1', () => {
    const r = run(['NotEqual', ['Cos', 'x'], 'a']);
    expect(r.at({ a: 2 })).toBe('(-inf, +inf)');
    expect(r.at({ a: 1 })).toBe('(0, ["Multiply",2,"Pi"]) + ["Multiply",2,"Pi"]ℤ');
  });
});

group('monotone kernels and |·| with parameters: inequalities', () => {
  it('e^{ax} > b orients by the sign of a; b ≤ 0 is ℝ', () => {
    const r = run(['Greater', ['Exp', mul('a', 'x')], 'b']);
    expect(r.at({ a: 1, b: 2 })).toBe(`(${LN2}, +inf)`);
    expect(r.at({ a: -1, b: 2 })).toBe(`(-inf, ["Multiply",-1,${LN2}])`);
    expect(r.at({ a: 1, b: -1 })).toBe('(-inf, +inf)');
    expect(r.at({ a: 0, b: [1, 2] })).toBe('(-inf, +inf)');
    expect(r.at({ a: 0, b: 1 })).toBe('{}');
  });

  it('ln x < a and |x − a| ≤ b', () => {
    expect(run(['Less', ['Ln', 'x'], 'a']).at({ a: 0 })).toBe('(0, 1)');
    const r = run(['LessEqual', ['Abs', ['Subtract', 'x', 'a']], 'b']);
    expect([r.at({ a: 1, b: 2 }), r.at({ a: 1, b: 0 }), r.at({ a: 1, b: -1 })]).toEqual(['[-1, 3]', '{1}', '{}']);
  });
});

group('refusals (follow-up ledger)', () => {
  it.each([
    ['mixed kernels', ['Equal', ['Add', ['Exp', 'x'], mul('a', ['Sin', 'x'])], 0], 'real'],
    ['a kernel and the target', ['Equal', ['Add', ['Exp', 'x'], mul('a', 'x')], 0], 'real'],
    ['sin/cos inequalities', ['Greater', ['Sin', 'x'], 'a'], 'real'],
    ['tan', ['Equal', ['Tan', 'x'], 'a'], 'real'],
    ['a non-affine argument', ['Equal', ['Exp', ['Power', 'x', 2]], 'a'], 'real'],
    ['ℂ', ['Equal', ['Exp', mul('a', 'x')], 'b'], 'complex'],
  ] as const)('%s', (_, json, domain) => {
    const r = setup(json, domain);
    expect(describe(r.store, r.outcome)).toMatch(/incomplete-implementation: EQUATION-PARAMETERS1: .*follow-up ledger/);
  });
});

group('verifier rejects tampering with kernel answers', () => {
  it('rejects a wrong range case and a negative period', () => {
    const e = setup(['Equal', ['Exp', mul('a', 'x')], 'b']), es = solved(e.outcome), s = e.store;
    if (es.set.kind !== 'case-tree') throw new Error(es.set.kind);
    const widened = es.set.cases.map(c => ({ ...c, conditions: c.conditions.map(k => (k.kind === 'positive' && k.expr === s.symbol('b') ? { kind: 'nonnegative' as const, expr: k.expr } : k)) }));
    rejects(() => verifyEquationOutcome(e.problem, { kind: 'solved', proof: es.proof, set: { kind: 'case-tree', cases: widened } }), /overlap|differs|undefined|no case/);
    const p = setup(['Equal', ['Sin', mul('a', 'x')], ['Rational', 1, 2]]), ps = solved(p.outcome);
    if (ps.set.kind !== 'case-tree') throw new Error(ps.set.kind);
    const flipped = ps.set.cases.map(c => (c.set.kind === 'periodic-set' ? { ...c, set: { ...c.set, period: { kind: 'expression' as const, id: p.store.neg((c.set.period as { id: number }).id as never) } } } : c));
    rejects(() => verifyEquationOutcome(p.problem, { kind: 'solved', proof: ps.proof, set: { kind: 'case-tree', cases: flipped as Case[] } }), /differs/);
  }, 60_000);
});

group('wire replay and resources', () => {
  it('round-trips parametric closed forms and families, and verifies the replay', () => {
    for (const json of [['Equal', ['Exp', mul('a', 'x')], 'b'], ['Equal', ['Sin', mul('a', 'x')], ['Rational', 1, 2]], ['LessEqual', ['Abs', ['Subtract', 'x', 'a']], 'b']]) {
      const { store, outcome } = setup(json);
      const back = decodeOutcome(context(), JSON.parse(JSON.stringify(encodeOutcome(store, outcome))));
      const replayed = back.outcome as Extract<EquationOutcome, { kind: 'solved' }>;
      verifyEquationOutcome(replayed.proof.states.get(replayed.proof.root)!, replayed);
      expect(describe(back.store, replayed)).toBe(describe(store, outcome));
    }
  }, 60_000);

  it('reports typed work and cancellation stops', () => {
    const json = ['Equal', ['Sin', mul('a', 'x')], ['Rational', 1, 2]];
    expect(setup(json, 'real', new ExpressionStore(context({ work: 2_000 }))).outcome).toEqual({ kind: 'resource', stop: 'work' });
    let polls = 0;
    expect(setup(json, 'real', new ExpressionStore(context({}, () => ++polls > 2_000))).outcome).toEqual({ kind: 'resource', stop: 'cancelled' });
  });
});
