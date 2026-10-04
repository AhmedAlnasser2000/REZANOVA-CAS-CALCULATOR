import { describe as group, expect, it } from 'vitest';
import { EquationAlgebraError } from '../execution';
import { rational } from '../algebra/rational';
import { context } from '../test-support';
import { decideEquation, verifyEquationOutcome } from '../decide';
import { describe, describeSet } from '../decision/test-helpers';
import { ExpressionStore } from '../representation/expression';
import { readRelations } from '../representation/mathjson';
import { relationProblem, type ProblemDomain } from '../representation/relation';
import type { EquationOutcome, SolutionSet } from '../representation/solution-set';
import type { ProofLog } from '../representation/transform';
import { decodeOutcome, encodeOutcome } from '../representation/wire';
import { caseAt } from '../parameters/verify';

function setup(json: unknown, targets = ['x', 'y'], domain: ProblemDomain = 'real', store = new ExpressionStore(context())) {
  const r = readRelations(store, json);
  if (r.kind !== 'ok') throw new Error(JSON.stringify(r));
  const problem = relationProblem(store, { domain, targets, relations: r.value });
  return { store, problem, outcome: decideEquation(problem) };
}
function run(json: unknown, targets = ['x', 'y'], domain: ProblemDomain = 'real') {
  const s = setup(json, targets, domain);
  verifyEquationOutcome(s.problem, s.outcome);
  const at = (values: Record<string, number>) => {
    const v = caseAt(s.problem, solved(s.outcome).set, new Map(Object.entries(values).map(([k, n]) => [k, s.store.number(rational(s.store.ctx, BigInt(n)))])));
    return v === undefined ? 'undefined' : describeSet(s.store, v);
  };
  return { ...s, text: describe(s.store, s.outcome), at };
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
const mul = (...a: unknown[]) => ['Multiply', ...a], eq = (l: unknown, r: unknown) => ['Equal', l, r];

group('linear systems over ℚ', () => {
  it('a unique point, a line, an inconsistent pair, and rank 2 in three unknowns', () => {
    expect(run(['And', eq(['Add', mul(2, 'x'), 'y'], 3), eq(['Subtract', 'x', 'y'], 0)]).text).toBe('{(1, 1)}');
    expect(run(eq(['Add', 'x', 'y'], 1)).text).toBe('{(["Add",1,["Multiply",-1,"y"]], "y") : y free}');
    expect(run(['And', eq(['Add', 'x', 'y'], 1), eq(['Add', 'x', 'y'], 2)]).text).toBe('empty');
    const r = run(['And', eq(['Add', 'x', 'y', 'z'], 1), eq(['Subtract', 'x', 'z'], 2)], ['x', 'y', 'z']);
    expect(r.text).toMatch(/: z free\}$/);
  });

  it('natural-domain exclusions are checked on the point and kept as constraints on a line', () => {
    expect(run(['And', eq(['Divide', 'x', 'y'], 2), eq(['Add', 'x', 'y'], 3)]).text).toBe('{(2, 1)}');
    // x/y = 2 alone: the line x = 2y without y = 0.
    expect(run(eq(['Divide', 'x', 'y'], 2)).text).toBe('{(["Multiply",2,"y"], "y") : y free, nonzero "y"}');
    // x/y = 2, y = 0 is empty (the point violates y ≠ 0).
    expect(run(['And', eq(['Divide', 'x', 'y'], 2), eq('y', 0)]).text).toBe('empty');
  });

  it('works over ℂ too (rational coefficients; complex coefficients are a ledger item)', () => {
    expect(run(['And', eq(['Add', 'x', mul(3, 'y')], 4), eq(['Subtract', 'x', 'y'], 0)], ['x', 'y'], 'complex').text).toBe('{(1, 1)}');
    expect(describe(new ExpressionStore(context()), setup(['And', eq(['Add', 'x', mul('ImaginaryUnit', 'y')], 1), eq('x', 'y')], ['x', 'y'], 'complex').outcome)).toMatch(/incomplete-implementation/);
  });
});

group('linear systems with parameters: case trees', () => {
  it('a·x + y = 1, x − y = b: a unique point for a ≠ −1; at a = −1 a line when b = −1, else ∅', () => {
    const r = run(['And', eq(['Add', mul('a', 'x'), 'y'], 1), eq(['Subtract', 'x', 'y'], 'b')]);
    expect(r.at({ a: 1, b: 1 })).toBe('{(1, 0)}');
    expect(r.at({ a: -1, b: -1 })).toBe('{(["Add",-1,"y"], "y") : y free}');
    expect(r.at({ a: -1, b: 2 })).toBe('{}');
  });

  it('a·x + y = 1, x + a·y = 1: a² ≠ 1 unique; a = 1 a line; a = −1 empty', () => {
    const r = run(['And', eq(['Add', mul('a', 'x'), 'y'], 1), eq(['Add', 'x', mul('a', 'y')], 1)]);
    expect(r.at({ a: 2 })).toBe('{(1/3, 1/3)}');
    expect(r.at({ a: 1 })).toBe('{(["Add",1,["Multiply",-1,"y"]], "y") : y free}');
    expect(r.at({ a: -1 })).toBe('{}');
  });

  it('several parameters: a·x + a·y = b', () => {
    const r = run(eq(['Add', mul('a', 'x'), mul('a', 'y')], 'b'));
    expect(r.at({ a: 0, b: 0 })).toBe('{("x", "y") : x, y free}');
    expect(r.at({ a: 0, b: 1 })).toBe('{}');
    // ½·(4 − 2y), the line x = 2 − y.
    expect(r.at({ a: 2, b: 4 })).toBe('{(["Multiply",["Rational",1,2],["Add",4,["Multiply",-2,"y"]]], "y") : y free}');
  });
});

group('routing', () => {
  it('names the owners of what this part does not decide', () => {
    const s = new ExpressionStore(context());
    expect(describe(s, setup(['And', eq(['Power', 'x', 2], 'y'), eq('x', 'y')]).outcome)).toMatch(/incomplete-implementation: EQUATION-SYSTEMS1: a nonlinear system/);
    expect(describe(s, setup(['And', ['Less', 'x', 'y'], eq('x', 1)]).outcome)).toMatch(/incomplete-implementation: EQUATION-SEMIALGEBRAIC1/);
    expect(describe(s, setup(['And', eq(['Exp', 'x'], 'y'), eq('y', 1)]).outcome)).toMatch(/incomplete-implementation: EQUATION-SYSTEMS1: kernels/);
  });
});

group('verifier rejects tampering', () => {
  it('rejects a wrong point, a lost free direction, a wrong direction and a dropped case', () => {
    const p = setup(['And', eq(['Add', mul(2, 'x'), 'y'], 3), eq(['Subtract', 'x', 'y'], 0)]), ps = solved(p.outcome), s = p.store;
    rejects(() => verifyEquationOutcome(p.problem, { kind: 'solved', proof: ps.proof, set: { kind: 'finite', variables: ['x', 'y'], points: [[{ kind: 'rational', value: rational(s.ctx, 2n) }, { kind: 'rational', value: rational(s.ctx, -1n) }]] } }), /does not satisfy|differs/);
    const l = setup(eq(['Add', 'x', 'y', 'z'], 1), ['x', 'y', 'z']), ls = solved(l.outcome), lset = ls.set;
    if (lset.kind !== 'parametric') throw new Error(lset.kind);
    // Only one free target (z = 0 fixed): every point satisfies, but the nullity is 2.
    rejects(() => verifyEquationOutcome(l.problem, { kind: 'solved', proof: ls.proof, set: { ...lset, values: [l.store.sub(l.store.integer(1), l.store.symbol('y')), l.store.symbol('y'), l.store.integer(0)], freeParameters: ['y'] } }), /nullity/);
    rejects(() => verifyEquationOutcome(l.problem, { kind: 'solved', proof: ls.proof, set: { ...lset, values: [l.store.symbol('y'), lset.values[1], lset.values[2]] } }), /identically/);
    const q = setup(['And', eq(['Add', mul('a', 'x'), 'y'], 1), eq(['Subtract', 'x', 'y'], 'b')]), qs = solved(q.outcome), qset = qs.set;
    if (qset.kind !== 'case-tree') throw new Error(qset.kind);
    rejects(() => verifyEquationOutcome(q.problem, { kind: 'solved', proof: qs.proof, set: { kind: 'case-tree', cases: qset.cases.filter(c => c.set.kind !== 'finite' || c.set.points.length) } }), /no case covers/);
  });
});

group('wire replay and resources', () => {
  it('round-trips points, parametric sets and case trees', () => {
    for (const [json, targets] of [[eq(['Add', 'x', 'y'], 1), ['x', 'y']], [['And', eq(['Add', mul('a', 'x'), 'y'], 1), eq(['Subtract', 'x', 'y'], 'b')], ['x', 'y']]] as const) {
      const { store, outcome } = setup(json, [...targets]);
      const back = decodeOutcome(context(), JSON.parse(JSON.stringify(encodeOutcome(store, outcome))));
      const replayed = back.outcome as Extract<EquationOutcome, { kind: 'solved' }>;
      verifyEquationOutcome(replayed.proof.states.get(replayed.proof.root)!, replayed);
      expect(describe(back.store, replayed)).toBe(describe(store, outcome));
    }
  });

  it('reports typed work and cancellation stops', () => {
    const json = ['And', eq(['Add', mul('a', 'x'), 'y'], 1), eq(['Add', 'x', mul('a', 'y')], 1)];
    expect(setup(json, ['x', 'y'], 'real', new ExpressionStore(context({ work: 300 }))).outcome).toEqual({ kind: 'resource', stop: 'work' });
    let polls = 0;
    expect(setup(json, ['x', 'y'], 'real', new ExpressionStore(context({}, () => ++polls > 300))).outcome).toEqual({ kind: 'resource', stop: 'cancelled' });
  });
});
