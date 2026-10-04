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

function setup(json: unknown, domain: ProblemDomain = 'real', target = 'x', store = new ExpressionStore(context())) {
  const r = readRelations(store, json);
  if (r.kind !== 'ok') throw new Error(JSON.stringify(r));
  const problem = relationProblem(store, { domain, targets: [target], relations: r.value });
  const outcome = decideEquation(problem);
  return { store, problem, outcome };
}
/** Decide, verify independently, and read the answer at parameter values. */
function run(json: unknown, domain: ProblemDomain = 'real', target = 'x') {
  const s = setup(json, domain, target);
  verifyEquationOutcome(s.problem, s.outcome);
  const at = (values: Record<string, number | [number, number]>) => {
    const set = solved(s.outcome).set;
    const map = new Map(Object.entries(values).map(([k, v]) => [k, s.store.number(Array.isArray(v) ? rational(s.store.ctx, BigInt(v[0]), BigInt(v[1])) : rational(s.store.ctx, BigInt(v)))]));
    const v = caseAt(s.problem, set, map);
    return v === undefined ? 'undefined' : describeSet(s.store, v);
  };
  return { ...s, at, cases: casesOf(s.outcome) };
}
function solved(o: EquationOutcome): { set: SolutionSet; proof: ProofLog } {
  if (o.kind !== 'solved') throw new Error(`${o.kind}: ${'reason' in o ? o.reason : ''}`);
  return o;
}
const casesOf = (o: EquationOutcome): readonly Case[] => (o.kind === 'solved' && o.set.kind === 'case-tree' ? o.set.cases : []);
function rejects(f: () => void, reason: RegExp) {
  let caught: unknown;
  try { f(); } catch (e) { caught = e; }
  expect(caught).toBeInstanceOf(EquationAlgebraError);
  expect((caught as EquationAlgebraError).code).toBe('verification-failed');
  expect((caught as EquationAlgebraError).reason).toMatch(reason);
}

const mul = (...a: unknown[]) => ['Multiply', ...a], add = (...a: unknown[]) => ['Add', ...a], pow = (a: unknown, k: unknown) => ['Power', a, k];
const quadratic = add(mul('a', pow('x', 2)), mul(2, 'x'), 1);
const quintic = add(pow('x', 5), mul('a', 'x'), 1);

group('one parameter over ℝ: exact cells', () => {
  it('a·x² + 2x + 1 = 0: a = 0 linear, a ≤ 1 (a ≠ 0) two radical roots, a > 1 empty', () => {
    const r = run(['Equal', quadratic, 0]);
    expect(r.cases.map(c => c.conditions.map(k => k.kind).sort().join('&'))).toEqual(expect.arrayContaining(['equal', 'nonnegative&not-equal', 'positive']));
    expect(r.cases).toHaveLength(3);
    expect(r.at({ a: 0 })).toBe('{-1/2}');
    expect(r.at({ a: 1 })).toBe('{-1}');
    expect(r.at({ a: [1, 2] })).toBe('{≈-3.414214, ≈-0.585786}');
    expect(r.at({ a: -1 })).toBe('{≈-0.414214, ≈2.414214}');
    expect(r.at({ a: 2 })).toBe('{}');
  });

  it('a·x > 1: the sign of a orients the half-line; a = 0 is empty', () => {
    const r = run(['Greater', mul('a', 'x'), 1]);
    expect(r.cases).toHaveLength(3);
    expect(r.at({ a: 2 })).toBe('(1/2, +inf)');
    expect(r.at({ a: -2 })).toBe('(-inf, -1/2)');
    expect(r.at({ a: 0 })).toBe('{}');
  });

  it('x² < a: (−√a, √a) for a > 0, empty for a ≤ 0 (the point a = 0 joins its cell)', () => {
    const r = run(['Less', pow('x', 2), 'a']);
    expect(r.cases).toHaveLength(2);
    expect(r.cases.map(c => c.conditions[0].kind).sort()).toEqual(['nonnegative', 'positive']);
    expect(r.at({ a: 4 })).toBe('(-2, 2)');
    expect(r.at({ a: 0 })).toBe('{}');
  });

  it('x⁵ + a·x + 1 = 0: cells cut at the real zero of 256a⁵ + 3125, parametric roots, the double root exact', () => {
    const r = run(['Equal', quintic, 0]);
    expect(r.cases).toHaveLength(3);
    const point = r.cases.find(c => c.conditions[0].kind === 'equal') as Case;
    expect(describeSet(r.store, point.set)).toBe('{≈-1.250943, ≈0.757858}');
    const names = r.cases.map(c => describeSet(r.store, c.set)).filter(t => t.includes('root'));
    expect(names.map(t => t.match(/root\d/g)?.join(','))).toEqual(expect.arrayContaining(['root1', 'root1,root2,root3']));
    // Reference: mpmath polyroots([1, 0, 0, 0, -5, 1]).
    expect(r.at({ a: -5 })).toBe('{≈-1.541652, ≈0.200064, ≈1.440500}');
    expect(r.at({ a: 0 })).toBe('{-1}');
  }, 60_000);

  it('a conjunction x² − a < 0 ∧ x > 0', () => {
    const r = run(['And', ['Less', ['Subtract', pow('x', 2), 'a'], 0], ['Greater', 'x', 0]]);
    expect(r.at({ a: 4 })).toBe('(0, 2)');
    expect(r.at({ a: 0 })).toBe('{}');
    expect(r.at({ a: -1 })).toBe('{}');
  });

  it('rational relations: denominators in the parameter and in the target', () => {
    const r = run(['Equal', ['Divide', 'x', 'a'], 1]);
    expect(r.at({ a: 3 })).toBe('{3}');
    expect(r.at({ a: 0 })).toBe('{}');
    const s = run(['Less', ['Divide', 1, ['Subtract', 'x', 'a']], 1]);
    expect(s.at({ a: 0 })).toBe('(-inf, 0) ∪ (1, +inf)');
  });

  it('solves for any target: a·x² + 2x + 1 = 0 for a, with x as the parameter', () => {
    const r = run(['Equal', quadratic, 0], 'real', 'a');
    expect(r.problem.parameters).toEqual(['x']);
    expect(r.at({ x: 0 })).toBe('{}');
    expect(r.at({ x: 1 })).toBe('{-3}');
    expect(r.at({ x: -1 })).toBe('{1}');
  });
});

group('several parameters: sign-condition trees', () => {
  it('a·x² + b·x + c = 0 over ℝ splits a, b, c and the discriminant', () => {
    const r = run(['Equal', add(mul('a', pow('x', 2)), mul('b', 'x'), 'c'), 0]);
    expect(r.cases).toHaveLength(6);
    expect(r.at({ a: 0, b: 0, c: 0 })).toBe('(-inf, +inf)');
    expect(r.at({ a: 0, b: 0, c: 1 })).toBe('{}');
    expect(r.at({ a: 0, b: 2, c: 1 })).toBe('{-1/2}');
    expect(r.at({ a: 1, b: 2, c: 1 })).toBe('{-1}');
    expect(r.at({ a: 1, b: 0, c: -1 })).toBe('{-1, 1}');
    expect(r.at({ a: 1, b: 0, c: 1 })).toBe('{}');
  });

  it('an inequality a·x² + b < 0 also splits the sign of a', () => {
    const r = run(['Less', add(mul('a', pow('x', 2)), 'b'), 0]);
    expect(r.at({ a: 1, b: -4 })).toBe('(-2, 2)');
    expect(r.at({ a: -1, b: 4 })).toBe('(-inf, -2) ∪ (2, +inf)');
    expect(r.at({ a: -1, b: -1 })).toBe('(-inf, +inf)');
    expect(r.at({ a: 0, b: 1 })).toBe('{}');
  });

  it('refuses what needs root order across polynomials or real roots of degree ≥ 3', () => {
    expect(describe(new ExpressionStore(context()), setup(['And', ['Less', pow('x', 2), 'a'], ['Greater', 'x', 'b']]).outcome)).toMatch(/incomplete-implementation: EQUATION-SEMIALGEBRAIC1/);
    expect(describe(new ExpressionStore(context()), setup(['Equal', add(pow('x', 3), mul('a', 'x'), 'b'), 0]).outcome)).toMatch(/incomplete-implementation: EQUATION-SEMIALGEBRAIC1/);
  });
});

group('over ℂ', () => {
  it('a·x² + 1 = 0: empty at a = 0, ±√(−4a)/(2a) (principal) otherwise', () => {
    const r = run(['Equal', add(mul('a', pow('x', 2)), 1), 0], 'complex');
    expect(r.cases).toHaveLength(2);
    expect(r.at({ a: 1 })).toBe('{≈0.000000+1.000000i, ≈0.000000-1.000000i}');
    expect(r.at({ a: 0 })).toBe('{}');
  });

  it('x³ + a·x + b = 0 is the root set of its polynomial; x² + a = 0 needs no case', () => {
    const r = run(['Equal', add(pow('x', 3), mul('a', 'x'), 'b'), 0], 'complex');
    expect(solved(r.outcome).set.kind).toBe('root-set');
    expect(r.at({ a: -3, b: 2 })).toBe('{-2, 1}');
    const s = run(['Equal', add(pow('x', 2), 'a'), 0], 'complex');
    expect(solved(s.outcome).set.kind).toBe('finite');
    expect(s.at({ a: 0 })).toBe('{0}');
  });
});

group('refusals', () => {
  it('constants with parameters stay with their owners', () => {
    const r = setup(['Equal', mul('Pi', 'x'), 'a']);
    expect(describe(r.store, r.outcome)).toMatch(/incomplete-implementation: EQUATION-PARAMETERS1/);
  });
});

group('verifier rejects tampering', () => {
  it('rejects a moved breakpoint, a wrong root index, a missing case, a wrong sign choice and a non-exhaustive split', () => {
    const q = setup(['Equal', quadratic, 0]), qs = solved(q.outcome), s = q.store;
    if (qs.set.kind !== 'case-tree') throw new Error(qs.set.kind);
    const tree = qs.set;
    const swap = (cases: readonly Case[]) => (): void => verifyEquationOutcome(q.problem, { kind: 'solved', proof: qs.proof, set: { kind: 'case-tree', cases } });
    // Moved breakpoint: the empty case from a > 2 instead of a > 1.
    rejects(swap(tree.cases.map(c => (c.conditions[0].kind === 'positive' ? { ...c, conditions: [{ kind: 'positive', expr: s.sub(s.symbol('a'), s.integer(2)) }] } : c))), /no case covers|differs from the decision/);
    // Missing a = 0 case.
    rejects(swap(tree.cases.filter(c => c.conditions[0].kind !== 'equal')), /no case covers a sample/);

    const p = setup(['Equal', quintic, 0]), ps = solved(p.outcome);
    if (ps.set.kind !== 'case-tree') throw new Error(ps.set.kind);
    const wrongIndex = ps.set.cases.map(c => (c.set.kind === 'finite' && c.set.points.length === 1 && c.set.points[0][0].kind === 'root'
      ? { ...c, set: { ...c.set, points: [[{ ...c.set.points[0][0], index: 2 }]] } } : c));
    rejects(() => verifyEquationOutcome(p.problem, { kind: 'solved', proof: ps.proof, set: { kind: 'case-tree', cases: wrongIndex as Case[] } }), /differs from the decision at a sample/);

    const w = setup(['Less', pow('x', 2), 'a']), ws = solved(w.outcome);
    if (ws.set.kind !== 'case-tree') throw new Error(ws.set.kind);
    // Wrong sign choice: the interval's ends swapped.
    const swapped = ws.set.cases.map(c => (c.set.kind === 'intervals' && c.set.intervals.length ? { ...c, set: { ...c.set, intervals: [{ ...c.set.intervals[0], lo: c.set.intervals[0].hi, hi: c.set.intervals[0].lo }] } } : c));
    rejects(() => verifyEquationOutcome(w.problem, { kind: 'solved', proof: ws.proof, set: { kind: 'case-tree', cases: swapped as Case[] } }), /differs from the decision at a sample/);

    const g = setup(['Equal', add(mul('a', pow('x', 2)), mul('b', 'x'), 'c'), 0]), gs = solved(g.outcome);
    const gt = gs.set;
    if (gt.kind !== 'case-tree') throw new Error(gt.kind);
    rejects(() => verifyEquationOutcome(g.problem, { kind: 'solved', proof: gs.proof, set: { kind: 'case-tree', cases: gt.cases.slice(1) } }), /no case covers a sample/);
  }, 120_000);
});

group('wire replay', () => {
  it('round-trips case trees, parametric roots and root sets, and verifies the replay', () => {
    const cases: [unknown, ProblemDomain][] = [[['Equal', quadratic, 0], 'real'], [['Less', pow('x', 2), 'a'], 'real'], [['Equal', add(pow('x', 3), mul('a', 'x'), 'b'), 0], 'complex'], [['Equal', add(pow('x', 3), mul('a', 'x'), 1), 0], 'real']];
    for (const [json, domain] of cases) {
      const { store, outcome } = setup(json, domain);
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
    const json = ['Equal', quintic, 0];
    expect(setup(json, 'real', 'x', new ExpressionStore(context({ work: 20_000 }))).outcome).toEqual({ kind: 'resource', stop: 'work' });
    let polls = 0;
    expect(setup(json, 'real', 'x', new ExpressionStore(context({}, () => ++polls > 20_000))).outcome).toEqual({ kind: 'resource', stop: 'cancelled' });
  });
});
