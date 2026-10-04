import { demand } from '../execution';
import { rational, type Rational } from '../algebra/rational';
import { complexIsZero } from '../periodic/rectangular';
import { evaluateExact } from '../representation/evaluate';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { realSign } from '../representation/real-order';
import { relationProblem, type Condition, type ProblemDomain, type RelationProblem } from '../representation/relation';
import {
  finiteSet, normalizeSet, valueExpression, type EquationOutcome, type Point, type PointValue, type SolutionSet,
} from '../representation/solution-set';
import { canonical } from '../parameters/specialize';
import { conditionHolds, sameSet } from '../parameters/verify';
import type { ParamAtom } from '../parameters/specialize';
import { checkCofactors, groebner, isGroebner, reduce } from './groebner';
import { systemPolys } from './polynomial';
import { hermite, multiplication, quotient, rankSignature } from './zero-dim';

/**
 * Evidence for nonlinear systems and systems with kernels.
 *
 * - Finite polynomial answers: the Gröbner basis of the (Rabinowitsch-extended)
 *   system is recomputed with cofactors; every basis element must equal its
 *   cofactor combination of the inputs, every input must reduce to zero, and
 *   Buchberger's criterion must hold. Together these prove the basis generates
 *   the input ideal. Then the claimed points must number exactly the rank of
 *   the Hermite form (over ℝ, its signature), which counts the distinct
 *   solutions; each claimed point is already checked by exact substitution.
 * - Infinite polynomial answers: the free targets common to every piece are
 *   sampled (the zeros of the pieces' constraints and small rationals); at
 *   each sample the claimed pieces, restricted there, must equal the system
 *   with those targets fixed, decided independently.
 * - Systems with kernels: points are substituted exactly (or signed by
 *   certified enclosure); family members at k ∈ {−1, 0, 1, 2} and free
 *   targets at small rationals likewise.
 */
const fail = (reason: string): never => demand(false, 'verification-failed', reason) as never;

export function verifyPolynomialCertificate(problem: RelationProblem, atoms: readonly ParamAtom[], set: SolutionSet): void {
  const store = problem.store, ctx = store.ctx, n = problem.targets.length;
  const { extended, width } = systemPolys(store, n, atoms, 'grevlex');
  const G = groebner(ctx, 'grevlex', extended, true);
  for (const g of G) checkCofactors(ctx, 'grevlex', extended, g);
  for (const f of extended) if (reduce(ctx, 'grevlex', { p: f }, G).p.length) fail('an equation does not reduce to zero by the basis');
  if (!isGroebner(ctx, 'grevlex', G.map(g => g.p))) fail('the basis fails Buchberger’s criterion');
  const claimed = set.kind === 'finite' ? set.points.length : fail(`expected a finite set, got ${set.kind}`);
  if (G.length === 1 && G[0].p.length === 1 && G[0].p[0].e.every(v => v === 0)) {
    if (claimed) fail('points claimed for an inconsistent system');
    return;
  }
  const q = quotient(ctx, 'grevlex', G, width);
  if (!q) return fail('a finite answer for an infinite system');
  const vars = Array.from({ length: width }, (_, v) => multiplication(ctx, q, Array.from({ length: width }, (_, i) => (i === v ? 1 : 0))));
  const { rank, positive, negative } = rankSignature(ctx, hermite(ctx, q, vars));
  if (claimed !== (problem.domain === 'real' ? positive - negative : rank)) fail('the number of points differs from the number of solutions');
}

/** Whether the system's relations and conditions all hold at a point (exactly, or by certified sign). */
export function holdsAt(problem: RelationProblem, point: readonly ExprId[]): boolean {
  const store = problem.store, env = new Map(problem.targets.map((t, i) => [t, point[i]] as const));
  const zero = (e: ExprId): boolean | undefined => {
    const id = store.substitute(e, env), v = evaluateExact(store, id, problem.domain);
    if (v.kind === 'exact') return v.value.kind === 'rational' && v.value.value.numerator === 0n;
    if (v.kind === 'undefined') return undefined;
    if (problem.domain === 'real') return realSign(store, id) === 0;
    const z = complexIsZero(store, id);
    return z === true ? true : z === false ? false : fail('a value has no zero test');
  };
  return problem.relations.every(r => (r.op === 'eq' ? zero(store.sub(r.lhs, r.rhs)) === true : zero(store.sub(r.lhs, r.rhs)) === false))
    && problem.conditions.every(c => c.kind === 'in-domain' || ('other' in c ? zero(store.sub(c.expr, c.other)) === false : zero(c.expr) === false));
}

const GRID: readonly [bigint, bigint][] = [[0n, 1n], [1n, 1n], [-1n, 1n], [2n, 1n], [-2n, 1n], [1n, 2n], [-1n, 2n], [3n, 1n]];

export function verifyEliminationSamples(problem: RelationProblem, set: SolutionSet): void {
  const store = problem.store, ctx = store.ctx;
  const check = (ids: readonly ExprId[]) => { if (!holdsAt(problem, ids)) fail('a claimed solution does not satisfy the system'); };
  const walk = (s: SolutionSet): void => {
    switch (s.kind) {
      case 'finite': for (const p of s.points) check(p.map(v => valueExpression(store, v))); return;
      case 'periodic': for (const k of [-1n, 0n, 1n, 2n]) check(s.values.map(v => store.substitute(v, new Map(s.integerParameters.map(name => [name, store.integer(k)] as const))))); return;
      case 'parametric': for (const [a, b] of GRID) check(s.values.map(v => store.substitute(v, new Map(s.freeParameters.map(name => [name, store.number(rational(ctx, a, b))] as const))))); return;
      case 'union': s.sets.forEach(walk); return;
      default: fail(`unexpected ${s.kind} set for a system with kernels`);
    }
  };
  walk(set);
}

/** Infinite polynomial answers: compare with the system decided at samples of the common free targets. */
export function verifyInfiniteSamples(problem: RelationProblem, set: SolutionSet, decide: (p: RelationProblem) => EquationOutcome): void {
  const store = problem.store, ctx = store.ctx, targets = problem.targets;
  const pieces = (set.kind === 'union' ? set.sets : [set]).map(s => (s.kind === 'parametric' ? s : fail(`unexpected ${s.kind} piece`)));
  const free = targets.filter(t => pieces.every(p => p.freeParameters.includes(t)));
  if (free.length === 0) fail('pieces share no free target');
  const dependents = targets.filter(t => !free.includes(t));
  // Samples: small rationals, plus the rational zeros of single-variable constraints (enough for the tests' evidence).
  const values: Rational[] = GRID.map(([a, b]) => rational(ctx, a, b));
  for (const sample of tuples(values, free.length)) {
    ctx.tick();
    const env = new Map(free.map((t, i) => [t, store.number(sample[i])] as const));
    const fixed = relationProblem(store, {
      domain: problem.domain, targets: dependents,
      relations: problem.relations.map(r => ({ op: r.op, lhs: store.substitute(r.lhs, env), rhs: store.substitute(r.rhs, env) })),
      conditions: problem.conditions.map(c => ('other' in c ? { ...c, expr: store.substitute(c.expr, env), other: store.substitute(c.other, env) } : { ...c, expr: store.substitute(c.expr, env) }) as Condition),
    });
    const o = decide(fixed);
    if (o.kind !== 'solved' && o.kind !== 'empty') return fail(`a sample is not decidable: ${'reason' in o ? o.reason : o.kind}`);
    const decided = o.kind === 'empty' ? finiteSet(dependents, []) : canonical(store, o.set, problem.domain);
    const claimed = restrict(store, pieces, free, env, dependents, problem.domain);
    if (claimed === undefined || !sameSet(store, claimed, decided)) fail('the claimed pieces differ from the system at a sample');
  }
}

function tuples(values: readonly Rational[], k: number): Rational[][] {
  let out: Rational[][] = [[]];
  for (let i = 0; i < k; i++) out = out.flatMap(t => values.map(v => [...t, v]));
  return out.slice(0, 64);
}

function restrict(store: ExpressionStore, pieces: readonly Extract<SolutionSet, { kind: 'parametric' }>[], free: readonly string[], env: ReadonlyMap<string, ExprId>, dependents: readonly string[], domain: ProblemDomain): SolutionSet | undefined {
  const points: Point[] = [];
  let whole: { except: PointValue[] } | undefined;
  for (const p of pieces) {
    const own = p.constraints.filter(c => store.freeSymbols(c.expr, ...('other' in c ? [c.other] : [])).every(s => free.includes(s)));
    if (!own.every(c => conditionHolds(store, c, env, domain))) continue;
    const loose = p.freeParameters.filter(t => !free.includes(t));
    if (loose.length) {
      // A dependent left free here: the whole line (or plane) of it, minus excluded values.
      if (dependents.length !== 1) return undefined;
      whole ??= { except: [] };
      for (const c of p.constraints.filter(c => !own.includes(c))) {
        if (c.kind !== 'not-equal') return undefined;
        const e = evaluateExact(store, store.substitute(c.other, env), domain);
        if (e.kind !== 'exact') return undefined;
        whole.except.push(e.value);
      }
      continue;
    }
    const point: PointValue[] = [];
    for (const t of dependents) {
      const id = store.substitute(p.values[p.variables.indexOf(t)], env), e = evaluateExact(store, id, domain);
      if (e.kind === 'undefined') return undefined;
      point.push(e.kind === 'exact' ? e.value : { kind: 'expression', id });
    }
    points.push(point);
  }
  if (whole) return canonical(store, { kind: 'cofinite', variables: dependents, except: whole.except.map(v => [v]) }, domain);
  return canonical(store, normalizeSet(store, finiteSet(dependents, points), domain), domain);
}
