import { describe as group, expect, it } from 'vitest';
import type { CanonicalEquationSet } from '../../../types/calculator/canonical-result-equation';
import type { CanonicalEquationDocument } from '../../../types/calculator/canonical-result-current';
import { equationMathLatex } from '../../result-contract/equation-math-latex';
import { validateCanonicalResultDocument } from '../../result-contract/current';
import { context } from './core/test-support';
import { decideEquation } from './core/decide';
import { EquationAlgebraError } from './core/execution';
import { ExpressionStore } from './core/representation/expression';
import { readRelations } from './core/representation/mathjson';
import { relationProblem, type ProblemDomain } from './core/representation/relation';
import type { EquationOutcome } from './core/representation/solution-set';
import { CORPUS } from './core/bench/corpus';
import { projectEquationOutcome } from './result';
import { readEquationOutcome, replayEquationDocument } from './result-read';

function setup(json: unknown, targets = ['x'], domain: ProblemDomain = 'real', store = new ExpressionStore(context())) {
  const r = readRelations(store, json);
  if (r.kind !== 'ok') throw new Error(JSON.stringify(r));
  const problem = relationProblem(store, { domain, targets, relations: r.value });
  return { problem, outcome: decideEquation(problem) };
}
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
function kinds(s: CanonicalEquationSet, out: Set<string>): Set<string> {
  out.add(s.kind);
  if (s.kind === 'union') s.sets.forEach(x => kinds(x, out));
  if (s.kind === 'case-tree') s.cases.forEach(c => kinds(c.set, out));
  return out;
}
function rejects(f: () => void, reason: RegExp) {
  let caught: unknown;
  try { f(); } catch (e) { caught = e; }
  expect(caught).toBeInstanceOf(EquationAlgebraError);
  expect((caught as EquationAlgebraError).reason).toMatch(reason);
}
const eq = (a: unknown, b: unknown = 0) => ['Equal', a, b];
const OUTCOME_NAMES: Record<EquationOutcome['kind'], string> = {
  solved: 'solved', empty: 'empty', undecided: 'undecided', 'incomplete-implementation': 'incomplete', unsupported: 'unsupported', resource: 'stopped',
};

const seen = new Set<string>();

group('Equation adapter: the corpus', () => {
  it.each(CORPUS.map(c => [c.id, c] as const))('%s projects, validates and replays', (_, c) => {
    const { problem, outcome } = setup(c.json, [...(c.targets ?? ['x'])], c.domain ?? 'real');
    const { kind, canonicalResult: d } = projectEquationOutcome(problem, outcome);
    expect(d.primary.outcome.kind).toBe(OUTCOME_NAMES[outcome.kind]);
    expect(kind).toBe(outcome.kind === 'solved' || outcome.kind === 'empty' ? 'success' : 'error');
    expect(validateCanonicalResultDocument(d).ok).toBe(true);
    // An independent read in a fresh store reaches the same outcome kind.
    expect(readEquationOutcome(new ExpressionStore(context()), clone(d)).kind).toBe(outcome.kind);
    if (d.primary.outcome.kind === 'solved') kinds(d.primary.outcome.set, seen);
  }, 600_000);
});

group('Equation adapter: kinds, outcomes and replay', () => {
  const cases: [string, unknown, string[], ProblemDomain, string][] = [
    ['cofinite', eq(['Divide', 'x', 'x'], 1), ['x'], 'complex', 'cofinite'],
    ['intervals', ['Less', ['Add', ['Power', 'x', 2], -1], 0], ['x'], 'real', 'intervals'],
    ['periodic-set', eq(['Sin', 'x'], ['Rational', 1, 2]), ['x'], 'real', 'periodic-set'],
    ['periodic', eq(['Exp', 'x'], 2), ['x'], 'complex', 'periodic'],
    ['case-tree', eq(['Add', ['Multiply', 'a', 'x'], 1]), ['x'], 'real', 'case-tree'],
    ['parametric', eq(['Add', 'x', 'y'], 1), ['x', 'y'], 'real', 'parametric'],
    ['complex algebraic', eq(['Add', ['Power', 'x', 3], 2]), ['x'], 'complex', 'finite'],
    ['interval-family', ['Greater', ['Sin', ['Exp', 'x']], ['Rational', 1, 2]], ['x'], 'real', 'interval-family'],
    ['root-set', eq(['Add', ['Power', 'x', 3], ['Multiply', 'a', 'x'], 'b']), ['x'], 'complex', 'root-set'],
  ];
  it.each(cases)('%s', (_, json, targets, domain, kind) => {
    const { problem, outcome } = setup(json, targets, domain);
    const d = projectEquationOutcome(problem, outcome).canonicalResult;
    expect(d.primary.outcome.kind).toBe('solved');
    if (d.primary.outcome.kind === 'solved') expect(kinds(d.primary.outcome.set, seen)).toContain(kind);
  }, 120_000);

  it('covers the set kinds the corpus and focused cases produce', () => {
    for (const k of ['finite', 'intervals', 'cofinite', 'union', 'case-tree', 'periodic-set', 'interval-family', 'root-set', 'periodic', 'parametric']) expect(seen).toContain(k);
  });

  it('types the non-answers: incomplete with its owner, and typed stops', () => {
    const n1 = setup(eq(['Add', ['Exp', 'x'], ['Sin', 'x']], 0));
    const d = projectEquationOutcome(n1.problem, n1.outcome).canonicalResult;
    expect(d.primary.outcome).toMatchObject({ kind: 'incomplete', owner: 'EQUATION-CERTIFIED-NUMERICS1' });
    expect(d.primary.provenance).toEqual({ verification: 'not-applicable', rules: [] });
    // Cancellation armed after the problem is built: the decision stops with the typed `cancelled` outcome.
    let armed = false;
    const store = new ExpressionStore(context({}, () => armed));
    const r = readRelations(store, eq(['Add', ['Power', 'x', 5], ['Negate', 'x'], -1]));
    if (r.kind !== 'ok') throw new Error('parse');
    const problem = relationProblem(store, { domain: 'real', targets: ['x'], relations: r.value });
    armed = true;
    const stopped = decideEquation(problem);
    expect(stopped).toEqual({ kind: 'resource', stop: 'cancelled' });
    expect(projectEquationOutcome(problem, stopped).canonicalResult.primary.outcome).toEqual({ kind: 'stopped', stop: 'cancelled' });
  });

  it('reports an answer over the shared bounds as stopped: result-size', () => {
    const p = setup(eq(['Add', ['Power', 'x', 5], ['Negate', 'x'], -1]));
    const d = projectEquationOutcome(p.problem, p.outcome, { maxNodes: 30 }).canonicalResult;
    expect(d.primary.outcome).toEqual({ kind: 'stopped', stop: 'result-size' });
    expect(d.outcomeKind).toBe('error');
  });

  it('rejects tampered documents on replay', () => {
    // A moved isolation interval: the binder no longer isolates the root of x⁵ − x − 1 (≈ 1.1673).
    const p = setup(eq(['Add', ['Power', 'x', 5], ['Negate', 'x'], -1]));
    const d = projectEquationOutcome(p.problem, p.outcome).canonicalResult;
    const moved = clone(d) as CanonicalEquationDocument;
    const b = moved.primary.roots[0];
    if (b.kind !== 'real-algebraic') throw new Error(b.kind);
    b.lo = { mathJson: 2, canonicalLatex: '2' }; b.hi = { mathJson: 3, canonicalLatex: '3' };
    rejects(() => replayEquationDocument(p.problem, p.outcome, moved), /isolate exactly one root/);
    // Swapped case sets: a·x + 1 = 0.
    const c = setup(eq(['Add', ['Multiply', 'a', 'x'], 1]));
    const dc = clone(projectEquationOutcome(c.problem, c.outcome).canonicalResult);
    if (dc.primary.outcome.kind !== 'solved' || dc.primary.outcome.set.kind !== 'case-tree') throw new Error('case tree expected');
    const cs = dc.primary.outcome.set.cases;
    [cs[0].set, cs[1].set] = [cs[1].set, cs[0].set];
    rejects(() => replayEquationDocument(c.problem, c.outcome, dc), /different set/);
    // A family value without its period term: eˣ = 2 over ℂ.
    const f = setup(eq(['Exp', 'x'], 2), ['x'], 'complex');
    const df = clone(projectEquationOutcome(f.problem, f.outcome).canonicalResult);
    if (df.primary.outcome.kind !== 'solved' || df.primary.outcome.set.kind !== 'periodic') throw new Error('periodic expected');
    df.primary.outcome.set.values = [{ mathJson: ['Ln', 2], canonicalLatex: '\\ln\\left(2\\right)' }];
    rejects(() => replayEquationDocument(f.problem, f.outcome, df), /not a valid current document|different set/);
    // A forged outcomeKind fails validation.
    rejects(() => replayEquationDocument(p.problem, p.outcome, { ...d, outcomeKind: 'error', error: 'x' }), /not a valid current document/);
  }, 120_000);

  it('reads the kinds no slice produces yet (reduced forms, unconfirmed candidates)', () => {
    const m = (mathJson: never) => ({ mathJson, canonicalLatex: equationMathLatex(mathJson) });
    const base = (outcome: CanonicalEquationDocument['primary']['outcome'], roots: CanonicalEquationDocument['primary']['roots'] = []): CanonicalEquationDocument => ({
      version: 7, outcomeKind: 'success', title: 'Equation', warnings: [],
      primary: { kind: 'equation-outcome', domain: 'real', targets: ['x'], parameters: [], roots, outcome, provenance: { verification: 'independent', rules: [] } },
    });
    const store = new ExpressionStore(context());
    const reduced = readEquationOutcome(store, base({ kind: 'solved', set: { kind: 'reduced-form', targets: ['x'], relations: [{ op: 'eq', lhs: m(['Cos', 'x'] as never), rhs: m('x' as never) }], conditions: [] } }));
    expect(reduced.kind === 'solved' && reduced.set.kind === 'reduced-form' && reduced.set.problem.relations.length).toBe(1);
    const sqrt2 = { kind: 'real-algebraic' as const, symbol: 'r_1', polynomial: m(['Add', ['Power', 'r_1', 2], -2] as never), lo: m(1 as never), hi: m(2 as never) };
    const unconfirmed = readEquationOutcome(store, base({ kind: 'solved', set: { kind: 'unconfirmed', variables: ['x'], candidates: [{ point: [m('r_1' as never)], derivations: ['squaring'] }] } }, [sqrt2]));
    expect(unconfirmed.kind === 'solved' && unconfirmed.set.kind === 'unconfirmed' && unconfirmed.set.candidates[0].point[0].kind).toBe('algebraic');
  });
});

group('Equation adapter: assumptions', () => {
  it('records assumptions, validates, replays and refuses a mismatch', async () => {
    const { canonicalRelation } = await import('./core/representation/relation');
    const { assumeOutcome } = await import('./core/parameters/assume');
    const store = new ExpressionStore(context());
    const { problem, outcome: full } = setup(eq(['Power', 'x', 2], 'a'), ['x'], 'real', store);
    const read = readRelations(store, ['Greater', 'a', 0]);
    if (read.kind !== 'ok') throw new Error('read');
    const assumptions = read.value.map(r => canonicalRelation(store, r));
    const { outcome } = assumeOutcome(problem, assumptions, full);
    const d = projectEquationOutcome(problem, outcome, {}, { assumptions, full }).canonicalResult;
    expect(d.primary.assumptions?.map(r => r.op)).toEqual(['lt']);
    expect(validateCanonicalResultDocument(d).ok).toBe(true);
    rejects(() => replayEquationDocument(problem, outcome, d), /different assumptions/);
    const bad = clone(d);
    bad.primary.assumptions = [{ op: 'lt', lhs: { mathJson: 'x', canonicalLatex: 'x' }, rhs: { mathJson: 0, canonicalLatex: '0' } }];
    expect(validateCanonicalResultDocument(bad).ok).toBe(false);
    // Without the assumptions the pruned outcome does not verify.
    expect(() => projectEquationOutcome(problem, outcome)).toThrow();
  });
});
