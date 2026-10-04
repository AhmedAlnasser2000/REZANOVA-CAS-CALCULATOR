import { demand } from '../execution';
import { rAbs, rAdd, rational, rCompare, rDivide, rMultiply, rSubtract, type Rational } from '../algebra/rational';
import { OWNERS } from '../decision/rational-form';
import { assemble } from '../decision/real-set';
import type { AtomOperator } from '../decision/univariate';
import { complexIsZero } from '../periodic/rectangular';
import { enclose } from '../representation/enclosure';
import { evaluateExact } from '../representation/evaluate';
import { isSymbolName, type ExprId, type ExpressionStore } from '../representation/expression';
import { realSign } from '../representation/real-order';
import { relationProblem, type Condition, type RelationProblem } from '../representation/relation';
import {
  assertOutcome, compareValues as compareValuesOf, finiteSet, normalizeSet, resourceOutcome, setKey as setKeyOf, type EquationOutcome, type Interval, type PointValue, type SolutionSet,
} from '../representation/solution-set';
import { ProofLogBuilder } from '../representation/transform';
import { add, coefficientsIn, constant, isZero, multiply, negate, scale, subtract, toExpression, type MPoly } from './mpoly';
import { parametricAtoms } from './specialize';

/**
 * Polynomial and rational problems whose coefficients involve transcendental
 * constants (π, e, ln 2, sin 1, …) and no parameters.
 *
 * Every maximal number-only subexpression that is not a rational number
 * combination becomes an indeterminate cₖ, so coefficients are polynomials
 * in the cₖ with exact cancellation. A coefficient is zero or signed by
 * `realSign` of its value (exact zero tests, otherwise certified refinement;
 * an algebraic relation among the constants that no test recognizes ends in
 * a typed work stop). Euclid with these zero tests gives gcds at the actual
 * values, hence a square-free coprime basis. Real roots are counted by Sturm
 * sequences and isolated by bisection to rational bounds; roots of different
 * basis polynomials are separated, and the cells between them are decided at
 * rational samples (the slice-1 assembly). Degree ≤ 2 roots get radical
 * closed forms, higher degrees the j-th real root of B(x; π, e, …) with its
 * isolating bounds. Over ℂ one equation is the set of roots of its polynomial.
 */
type U = readonly MPoly[];
export interface ConstantForm { readonly vars: readonly string[]; readonly back: ReadonlyMap<string, ExprId>; readonly problem: RelationProblem }

class Refused { readonly reason: string; constructor(reason: string) { this.reason = reason; } }

function isAtom(store: ExpressionStore, n: ExprId): boolean {
  const node = store.node(n);
  if (store.freeSymbols(n).length) return false;
  if (node.kind === 'constant' || node.kind === 'apply' || node.kind === 'algebraic') return true;
  if (node.kind !== 'pow') return false;
  const e = store.numberValue(node.exponent);
  return e === undefined || e.denominator !== 1n || store.freeSymbols(node.exponent).length > 0;
}

/** The problem with every transcendental atom replaced by a fresh symbol, and the way back. */
export function constantForm(problem: RelationProblem): ConstantForm {
  const s = problem.store, back = new Map<string, ExprId>(), names = new Map<ExprId, string>();
  const replace = (root: ExprId): ExprId => {
    const mapped = new Map<ExprId, ExprId>();
    for (const n of s.postorder([root])) {
      const node = s.node(n), m = (c: ExprId) => mapped.get(c) as ExprId;
      let out: ExprId = n;
      if (isAtom(s, n)) {
        let name = names.get(n);
        if (!name) {
          let k = names.size + 1;
          while (!isSymbolName(`c${k}`) || problem.targets.includes(`c${k}`)) k++;
          name = `c${k}`; names.set(n, name); back.set(name, n);
        }
        out = s.symbol(name);
      } else if (node.kind === 'add') out = s.add(...node.args.map(m));
      else if (node.kind === 'mul') out = s.mul(...node.args.map(m));
      else if (node.kind === 'pow') out = s.pow(m(node.base), m(node.exponent));
      mapped.set(n, out);
    }
    return mapped.get(root) as ExprId;
  };
  const replaced = relationProblem(s, {
    domain: problem.domain, targets: problem.targets,
    relations: problem.relations.map(r => ({ op: r.op, lhs: replace(r.lhs), rhs: replace(r.rhs) })),
    conditions: problem.conditions.map(c => ('other' in c ? { kind: c.kind, expr: replace(c.expr), other: replace(c.other) } : { kind: c.kind, expr: replace(c.expr) }) as Condition),
  });
  return { vars: [problem.targets[0], ...replaced.parameters], back, problem: replaced };
}

/** Whether a problem without parameters has a transcendental number among its coefficients. */
export function hasTranscendentalConstants(problem: RelationProblem): boolean {
  const s = problem.store;
  const roots = [...problem.relations.flatMap(r => [r.lhs, r.rhs]), ...problem.conditions.flatMap(c => ('other' in c ? [c.expr, c.other] : [c.expr]))];
  return s.postorder(roots).some(n => {
    if (!isAtom(s, n)) return false;
    const e = evaluateExact(s, n, problem.domain);
    return e.kind === 'not-exact' && e.reason === 'transcendental';
  });
}

/** Exact arithmetic on univariate polynomials with constant coefficients, decided at the constants' values. */
export class ConstantAlgebra {
  readonly store: ExpressionStore;
  readonly back: ReadonlyMap<string, ExprId>;
  readonly #signs = new Map<string, -1 | 0 | 1>();
  constructor(store: ExpressionStore, back: ReadonlyMap<string, ExprId>) { this.store = store; this.back = back; }

  value(g: MPoly): ExprId { return this.store.substitute(toExpression(this.store, g), this.back); }
  sign(g: MPoly): -1 | 0 | 1 {
    if (isZero(g)) return 0;
    const key = [...g.terms].map(([k, v]) => `${k}:${v.numerator}/${v.denominator}`).sort().join('|');
    let s = this.#signs.get(key);
    if (s === undefined) { s = realSign(this.store, this.value(g)); this.#signs.set(key, s); }
    return s;
  }
  trim(u: U): U {
    const out = [...u];
    while (out.length && this.sign(out[out.length - 1]) === 0) out.pop();
    return out;
  }
  derivative(u: U): U { return this.trim(u.slice(1).map((c, i) => scale(this.store.ctx, c, rational(this.store.ctx, BigInt(i + 1))))); }
  /** lc(b)^k·a mod b, with k (the number of steps). */
  prem(a: U, b: U): { r: U; steps: number } {
    const ctx = this.store.ctx, lb = b[b.length - 1];
    let r = this.trim(a), steps = 0;
    while (r.length >= b.length) {
      ctx.tick();
      const lr = r[r.length - 1], shift = r.length - b.length;
      const next = r.map((c, i) => subtract(ctx, multiply(ctx, c, lb), i >= shift ? multiply(ctx, lr, b[i - shift]) : constant(c.vars, rational(ctx, 0n))));
      r = this.trim(next);
      steps++;
    }
    return { r, steps };
  }
  gcd(a: U, b: U): U {
    let x = this.trim(a), y = this.trim(b);
    if (x.length < y.length) [x, y] = [y, x];
    while (y.length) { const { r } = this.prem(x, y); x = y; y = r; }
    return x;
  }
  /** a/b up to a nonzero constant factor, for b dividing a. */
  quotient(a: U, b: U): U {
    const ctx = this.store.ctx, lb = b[b.length - 1], q: MPoly[] = [];
    let r: U = this.trim(a);
    while (r.length >= b.length) {
      ctx.tick();
      const lr = r[r.length - 1], shift = r.length - b.length;
      for (let i = 0; i < q.length; i++) if (q[i]) q[i] = multiply(ctx, q[i], lb);
      q[shift] = add(ctx, q[shift] ?? constant(lr.vars, rational(ctx, 0n)), lr);
      // lb·r − lr·x^shift·b: the top coefficient cancels exactly.
      r = this.trim(r.map((c, i) => subtract(ctx, multiply(ctx, c, lb), i >= shift ? multiply(ctx, lr, b[i - shift]) : constant(c.vars, rational(ctx, 0n)))));
    }
    demand(r.length === 0, 'verification-failed', 'a basis polynomial does not divide');
    for (let i = 0; i < q.length; i++) q[i] ??= constant(lb.vars, rational(ctx, 0n));
    return this.trim(q);
  }
  divides(b: U, a: U): boolean { return this.prem(a, b).r.length === 0; }
  squareFree(u: U): U { const g = this.gcd(u, this.derivative(u)); return g.length <= 1 ? this.trim(u) : this.quotient(u, g); }

  coprimeBasis(inputs: readonly U[]): U[] {
    const basis: U[] = [];
    for (const input of inputs) {
      let f = this.squareFree(input);
      for (let i = 0; i < basis.length && f.length > 1; i++) {
        const g = this.gcd(f, basis[i]);
        if (g.length <= 1) continue;
        const rest = this.quotient(basis[i], g);
        basis.splice(i, 1, g, ...(rest.length > 1 ? [rest] : []));
        f = this.quotient(f, g);
        i += rest.length > 1 ? 1 : 0;
      }
      if (f.length > 1) basis.push(f);
    }
    return basis;
  }

  at(u: U, q: Rational): MPoly {
    const ctx = this.store.ctx;
    let acc = constant(u[0]?.vars ?? [], rational(ctx, 0n));
    for (let i = u.length - 1; i >= 0; i--) acc = add(ctx, scale(ctx, acc, q), u[i]);
    return acc;
  }
  signAt(u: U, q: Rational): -1 | 0 | 1 { return u.length ? this.sign(this.at(u, q)) : 0; }

  sturm(u: U): U[] {
    const seq: U[] = [this.trim(u), this.derivative(u)];
    while (seq[seq.length - 1].length > 1) {
      const a = seq[seq.length - 2], b = seq[seq.length - 1], { r, steps } = this.prem(a, b);
      if (r.length === 0) break;
      // −prem with a positive multiplier keeps the Sturm property.
      const positive = this.sign(b[b.length - 1]) > 0 || steps % 2 === 0;
      seq.push(positive ? r.map(c => negate(this.store.ctx, c)) : r);
    }
    return seq;
  }
  /** Sign variations of a Sturm sequence at q (or at ±∞). */
  variations(seq: readonly U[], q: Rational | 1 | -1): number {
    let count = 0, last = 0;
    for (const s of seq) {
      const v = typeof q === 'number' ? this.sign(s[s.length - 1]) * (q < 0 && (s.length - 1) % 2 === 1 ? -1 : 1) : this.signAt(s, q);
      if (v !== 0) { if (last !== 0 && v !== last) count++; last = v; }
    }
    return count;
  }

  /** A power of two above every real root (Cauchy, from certified enclosures of the coefficients). */
  rootBound(u: U): Rational {
    const ctx = this.store.ctx, store = this.store;
    const bounds = (g: MPoly): { lo: Rational; hi: Rational } => {
      for (let bits = 32; ; bits *= 2) {
        ctx.tick();
        const b = enclose(store, this.value(g), bits);
        if (b.kind === 'bounds') return b;
        demand(b.kind === 'unknown', 'invalid-input', 'a coefficient cannot be enclosed');
      }
    };
    let lead = bounds(u[u.length - 1]);
    for (let bits = 64; rCompare(ctx, lead.lo, rational(ctx, 0n)) <= 0 && rCompare(ctx, lead.hi, rational(ctx, 0n)) >= 0; bits *= 2) {
      const b = enclose(store, this.value(u[u.length - 1]), bits);
      if (b.kind === 'bounds') lead = b;
    }
    const low = rCompare(ctx, lead.lo, rational(ctx, 0n)) > 0 ? lead.lo : rAbs(ctx, lead.hi);
    let max = rational(ctx, 0n);
    for (const c of u.slice(0, -1)) {
      const b = bounds(c), m = rCompare(ctx, rAbs(ctx, b.lo), rAbs(ctx, b.hi)) > 0 ? rAbs(ctx, b.lo) : rAbs(ctx, b.hi);
      if (rCompare(ctx, m, max) > 0) max = m;
    }
    const cauchy = rAdd(ctx, rational(ctx, 1n), rDivide(ctx, max, low));
    let p = rational(ctx, 1n);
    while (rCompare(ctx, p, cauchy) <= 0) p = rMultiply(ctx, p, rational(ctx, 2n));
    return p;
  }

  /** Real roots of a square-free polynomial, ascending: exact rationals or rational bounds lo < root < hi. */
  isolate(u: U): Root[] {
    const ctx = this.store.ctx, seq = this.sturm(u), B = this.rootBound(u), out: Root[] = [];
    const half = rational(ctx, 1n, 2n);
    const stack: [Rational, Rational][] = [[rMultiply(ctx, B, rational(ctx, -1n)), B]];
    while (stack.length) {
      ctx.tick();
      const [a, b] = stack.pop() as [Rational, Rational];
      // Distinct roots in (a, b]: V(a) − V(b); the ends are never roots here (checked below).
      const n = this.variations(seq, a) - this.variations(seq, b);
      if (n === 0) continue;
      if (n === 1) { out.push({ poly: u, lo: a, hi: b }); continue; }
      const m = rMultiply(ctx, rAdd(ctx, a, b), half);
      if (this.signAt(u, m) === 0) {
        out.push({ poly: u, exact: m, lo: m, hi: m });
        // Shift the cut off the exact root: a rational strictly between it and the next root is found by halving.
        let d = rMultiply(ctx, rSubtract(ctx, b, a), rational(ctx, 1n, 4n));
        while (this.signAt(u, rSubtract(ctx, m, d)) === 0 || this.signAt(u, rAdd(ctx, m, d)) === 0
          || this.variations(seq, rSubtract(ctx, m, d)) - this.variations(seq, rAdd(ctx, m, d)) !== 1) { ctx.tick(); d = rMultiply(ctx, d, half); }
        stack.push([a, rSubtract(ctx, m, d)], [rAdd(ctx, m, d), b]);
        continue;
      }
      stack.push([a, m], [m, b]);
    }
    return out.sort((x, y) => rCompare(ctx, x.lo, y.lo));
  }

  /** Halve an isolating interval (no exact root). */
  refine(r: Root): Root {
    if (r.exact) return r;
    const ctx = this.store.ctx, m = rMultiply(ctx, rAdd(ctx, r.lo, r.hi), rational(ctx, 1n, 2n)), s = this.signAt(r.poly, m);
    if (s === 0) return { poly: r.poly, exact: m, lo: m, hi: m };
    return s === this.signAt(r.poly, r.lo) ? { ...r, lo: m } : { ...r, hi: m };
  }
}

export interface Root { readonly poly: U; readonly lo: Rational; readonly hi: Rational; readonly exact?: Rational }

const HOLDS: Readonly<Record<AtomOperator, (s: number) => boolean>> = { eq: s => s === 0, ne: s => s !== 0, lt: s => s < 0, le: s => s <= 0, gt: s => s > 0, ge: s => s >= 0 };

export function decideConstantProblem(problem: RelationProblem): EquationOutcome {
  try {
    const set = constantSet(problem);
    if (typeof set === 'string') return { kind: 'incomplete-implementation', reason: set };
    const proof = new ProofLogBuilder(problem).build();
    if (set.kind === 'finite' && set.points.length === 0) return { kind: 'empty', proof };
    return { kind: 'solved', set: normalizeSet(problem.store, set, problem.domain), proof };
  } catch (e) {
    if (e instanceof Refused) return { kind: 'incomplete-implementation', reason: e.reason };
    return resourceOutcome(e);
  }
}

function constantSet(problem: RelationProblem): SolutionSet | string {
  if (problem.targets.length !== 1) return `${OWNERS.systems}: several target variables`;
  const store = problem.store, ctx = store.ctx, x = problem.targets[0];
  const form = constantForm(problem);
  const atoms = parametricAtoms(form.problem);
  if ('owner' in atoms) return `${OWNERS.parameters}: transcendental constants beyond rational functions of the target`;
  const alg = new ConstantAlgebra(store, form.back);
  const polys = atoms.atoms.map(a => ({ u: coefficientsIn(a.poly, 0) as U, op: a.op }));
  if (problem.domain === 'complex') return complexSet(store, alg, polys, x);

  // Constant atoms (no target) decide everything at once.
  const inX = polys.map(p => ({ u: alg.trim(p.u), op: p.op }));
  for (const p of inX) if (p.u.length <= 1 && !HOLDS[p.op](p.u.length ? alg.sign(p.u[0]) : 0)) return finiteSet([x], []);
  const basis = alg.coprimeBasis(inX.filter(p => p.u.length > 1).map(p => p.u));
  let roots = basis.flatMap((B, k) => alg.isolate(B).map((r, j, all) => ({ ...r, k, j, count: all.length })));
  // Separate roots of different basis polynomials (closed intervals pairwise disjoint).
  const overlap = (a: Root, b: Root) => rCompare(ctx, a.lo, b.hi) <= 0 && rCompare(ctx, b.lo, a.hi) <= 0;
  for (let changed = true; changed;) {
    changed = false;
    roots.sort((a, b) => rCompare(ctx, a.lo, b.lo));
    for (let i = 0; i + 1 < roots.length; i++) {
      if (!overlap(roots[i], roots[i + 1])) continue;
      ctx.tick();
      demand(!(roots[i].exact && roots[i + 1].exact), 'verification-failed', 'two basis polynomials share a root');
      roots = roots.map((r, j) => (j === i || j === i + 1 ? { ...r, ...alg.refine(r) } : r));
      changed = true;
    }
  }
  const half = rational(ctx, 1n, 2n), one = rational(ctx, 1n);
  const samples = roots.length === 0 ? [rational(ctx, 0n)]
    : [rSubtract(ctx, roots[0].lo, one), ...roots.slice(0, -1).map((r, i) => rMultiply(ctx, rAdd(ctx, r.hi, roots[i + 1].lo), half)), rAdd(ctx, roots[roots.length - 1].hi, one)];
  const truth: boolean[] = [];
  samples.forEach((q, i) => {
    truth.push(inX.every(p => HOLDS[p.op](alg.signAt(p.u, q))));
    if (i < roots.length) {
      const r = roots[i], B = basis[r.k];
      // On r's isolating interval no other basis root lies, so an atom not divisible by B keeps its sign there.
      truth.push(inX.every(p => HOLDS[p.op](p.u.length > 1 && alg.divides(B, p.u) ? 0 : alg.signAt(p.u, r.exact ?? r.lo))));
    }
  });
  const values = roots.map(r => rootValue(store, alg, basis[r.k], r, x, form.back));
  const intervals = assemble(values, truth);
  if (intervals.length === 0) return finiteSet([x], []);
  if (intervals.every(i => i.loClosed && i.hiClosed && i.lo === i.hi)) return finiteSet([x], intervals.map(i => [i.lo as PointValue]));
  return { kind: 'intervals', variables: [x], intervals: intervals as Interval[] };
}

/** The value of an isolated root: a rational, a radical closed form (degree ≤ 2), or the j-th real root with bounds. */
function rootValue(store: ExpressionStore, alg: ConstantAlgebra, B: U, r: Root & { j: number; count: number }, x: string, back: ReadonlyMap<string, ExprId>): PointValue {
  if (r.exact) return { kind: 'rational', value: r.exact };
  const c = B.map(g => alg.value(g));
  if (B.length === 2) return { kind: 'expression', id: store.div(store.neg(c[0]), c[1]) };
  if (B.length === 3 && r.count === 2) {
    const D = store.sub(store.mul(c[1], c[1]), store.mul(store.integer(4), c[2], c[0]));
    const s = (r.j === 0 ? -1 : 1) * alg.sign(B[2]);
    return { kind: 'expression', id: store.div(store.add(store.neg(c[1]), store.mul(store.integer(s), store.sqrt(D))), store.mul(store.integer(2), c[2])) };
  }
  const poly = store.substitute(store.add(store.integer(0), ...B.map((g, i) => (i === 0 ? toExpression(store, g) : store.mul(toExpression(store, g), store.pow(store.symbol(x), store.integer(i)))))), back);
  return { kind: 'root', poly, variable: x, index: r.j + 1, lo: r.lo, hi: r.hi };
}

function complexSet(store: ExpressionStore, alg: ConstantAlgebra, polys: readonly { u: U; op: AtomOperator }[], x: string): SolutionSet | string {
  const zero = (g: MPoly) => {
    if (isZero(g)) return true;
    const z = complexIsZero(store, alg.value(g));
    if (z === 'unknown' || z === 'undefined') throw new Refused(`${OWNERS.parameters}: a complex constant coefficient without a zero test`);
    return z;
  };
  const trim = (u: U) => { const out = [...u]; while (out.length && zero(out[out.length - 1])) out.pop(); return out; };
  const atoms = polys.map(p => ({ u: trim(p.u), op: p.op }));
  for (const p of atoms) if (p.u.length <= 1 && (p.op === 'eq') !== (p.u.length === 0)) return finiteSet([x], []);
  const equations = atoms.filter(p => p.op === 'eq' && p.u.length > 1), others = atoms.filter(p => p.u.length > 1 && p.op !== 'eq');
  if (equations.length !== 1 || others.length) return `${OWNERS.parameters}: several relations in the target with transcendental constants over ℂ (follow-up ledger)`;
  const u = equations[0].u, c = u.map(g => alg.value(g));
  if (u.length === 2) return finiteSet([x], [[{ kind: 'expression', id: store.div(store.neg(c[0]), c[1]) }]]);
  if (u.length === 3) {
    const D = store.sub(store.mul(c[1], c[1]), store.mul(store.integer(4), c[2], c[0])), twoA = store.mul(store.integer(2), c[2]);
    const r = (s: number) => ({ kind: 'expression' as const, id: store.div(store.add(store.neg(c[1]), store.mul(store.integer(s), store.sqrt(D))), twoA) });
    return finiteSet([x], complexIsZero(store, D) === true ? [[{ kind: 'expression', id: store.div(store.neg(c[1]), twoA) }]] : [[r(-1)], [r(1)]]);
  }
  return { kind: 'root-set', variables: [x], poly: store.substitute(store.add(store.integer(0), ...u.map((g, i) => (i === 0 ? toExpression(store, g) : store.mul(toExpression(store, g), store.pow(store.symbol(x), store.integer(i)))))), alg.back) };
}

// ---- verification ----

const fail = (reason: string): never => demand(false, 'verification-failed', reason) as never;

/** Rational bounds of a real value (refined by `bits` for closed forms). */
function boundsOf(store: ExpressionStore, v: PointValue, bits: number): { lo: Rational; hi: Rational } {
  if (v.kind === 'rational') return { lo: v.value, hi: v.value };
  if (v.kind === 'root') return v.lo && v.hi ? { lo: v.lo, hi: v.hi } : fail('a root without isolating bounds');
  const id = v.kind === 'expression' ? v.id : store.algebraic(v.root);
  for (let b = bits; ; b *= 2) {
    store.ctx.tick();
    const e = enclose(store, id, b);
    if (e.kind === 'bounds') return e;
    if (e.kind !== 'unknown') return fail('a value cannot be enclosed');
  }
}

/**
 * Independent evidence for a constant-coefficient outcome:
 * - the proof is the problem itself;
 * - every root value's bounds isolate exactly its index-th real root
 *   (Sturm counts of its square-free polynomial at the bounds);
 * - at rational samples before, between and after the claimed ends, membership
 *   in the claimed set equals the truth of the problem there (certified signs);
 * - re-deriving gives the same set.
 */
export function verifyConstantOutcome(problem: RelationProblem, outcome: EquationOutcome): void {
  assertOutcome(outcome);
  if (outcome.kind !== 'solved' && outcome.kind !== 'empty') return;
  const store = problem.store, ctx = store.ctx, x = problem.targets[0];
  if (outcome.proof.root !== problem.hash || outcome.proof.records.length) fail('a constants proof is the problem itself');
  const set = outcome.kind === 'empty' ? finiteSet([x], []) : outcome.set;
  if (problem.domain === 'real') {
    const ends: PointValue[] = set.kind === 'finite' ? set.points.map(p => p[0]) : set.kind === 'intervals' ? set.intervals.flatMap(i => [i.lo, i.hi].filter(e => e.kind !== 'infinity') as PointValue[]) : fail(`unexpected ${set.kind} set`);
    for (const v of ends) if (v.kind === 'root') checkRoot(problem, v);
    // Distinct ends in order, with rational samples strictly between them.
    const distinct = ends.filter((v, i) => i === 0 || compareValuesOf(store, ends[i - 1], v) !== 0);
    const samples: Rational[] = [];
    let bits = 64;
    for (let i = 0; i <= distinct.length; i++) {
      ctx.tick();
      if (i === 0 || i === distinct.length) {
        const b = distinct.length ? boundsOf(store, distinct[i === 0 ? 0 : i - 1], bits) : { lo: rational(ctx, 0n), hi: rational(ctx, 0n) };
        samples.push(i === 0 ? rSubtract(ctx, b.lo, rational(ctx, 1n)) : rAdd(ctx, b.hi, rational(ctx, 1n)));
        if (distinct.length === 0 || i === distinct.length) break;
        continue;
      }
      let u = boundsOf(store, distinct[i - 1], bits), w = boundsOf(store, distinct[i], bits);
      while (rCompare(ctx, u.hi, w.lo) >= 0) {
        if (distinct[i - 1].kind !== 'expression' && distinct[i].kind !== 'expression' && distinct[i - 1].kind !== 'algebraic' && distinct[i].kind !== 'algebraic') fail('claimed bounds do not separate the ends');
        bits *= 2;
        u = boundsOf(store, distinct[i - 1], bits); w = boundsOf(store, distinct[i], bits);
      }
      samples.push(rMultiply(ctx, rAdd(ctx, u.hi, w.lo), rational(ctx, 1n, 2n)));
    }
    for (const q of samples) {
      const claimed = contains(store, set, { kind: 'rational', value: q });
      if (claimed !== holdsAt(problem, q)) fail('the claimed set differs from the problem at a sample');
    }
  }
  const again = decideConstantProblem(problem);
  if (again.kind !== outcome.kind) fail('re-derivation gives a different outcome');
  if (again.kind === 'solved' && outcome.kind === 'solved' && setKeyOf(store, normalizeSet(store, again.set, problem.domain)) !== setKeyOf(store, normalizeSet(store, outcome.set, problem.domain))) fail('the set differs from the re-derived set');
}

function contains(store: ExpressionStore, set: SolutionSet, v: PointValue): boolean {
  const cmp = (a: PointValue, b: PointValue) => compareValuesOf(store, a, b);
  if (set.kind === 'finite') return set.points.some(p => cmp(p[0], v) === 0);
  if (set.kind !== 'intervals') return false;
  return set.intervals.some(i => {
    const lo = i.lo.kind === 'infinity' ? -1 : cmp(i.lo, v), hi = i.hi.kind === 'infinity' ? 1 : cmp(i.hi, v);
    return (lo < 0 || (lo === 0 && i.loClosed)) && (hi > 0 || (hi === 0 && i.hiClosed));
  });
}

/** Whether every relation and condition holds at x = q (undefined counts as false). */
function holdsAt(problem: RelationProblem, q: Rational): boolean {
  const store = problem.store, values = new Map([[problem.targets[0], store.number(q)]]);
  const truth = (e: ExprId, op: AtomOperator): boolean => {
    const id = store.substitute(e, values), v = evaluateExact(store, id, 'real');
    if (v.kind === 'undefined') return false;
    return HOLDS[op](realSign(store, id));
  };
  const kinds: Readonly<Record<string, AtomOperator>> = { nonzero: 'ne', positive: 'gt', nonnegative: 'ge', equal: 'eq', 'not-equal': 'ne' };
  return problem.relations.every(r => truth(store.sub(r.lhs, r.rhs), r.op as AtomOperator))
    && problem.conditions.every(c => c.kind === 'in-domain' || truth('other' in c ? store.sub(c.expr, c.other) : c.expr, kinds[c.kind]));
}

/** The bounds of a root value isolate exactly its index-th distinct real root. */
function checkRoot(problem: RelationProblem, v: Extract<PointValue, { kind: 'root' }>): void {
  const store = problem.store, ctx = store.ctx;
  const own = relationProblem(store, { domain: 'real', targets: [v.variable], relations: [{ op: 'eq', lhs: v.poly, rhs: store.integer(0) }] });
  const form = constantForm(own), atoms = parametricAtoms(form.problem);
  if ('owner' in atoms || atoms.atoms.length === 0) return fail('a root polynomial is not polynomial');
  const alg = new ConstantAlgebra(store, form.back), u = alg.squareFree(coefficientsIn(atoms.atoms[0].poly, 0));
  if (!v.lo || !v.hi || rCompare(ctx, v.lo, v.hi) >= 0) fail('root bounds are not an interval');
  if (alg.signAt(u, v.lo as Rational) === 0 || alg.signAt(u, v.hi as Rational) === 0) fail('a root bound is itself a root');
  const seq = alg.sturm(u);
  const below = alg.variations(seq, -1) - alg.variations(seq, v.lo as Rational), inside = alg.variations(seq, v.lo as Rational) - alg.variations(seq, v.hi as Rational);
  if (below !== v.index - 1 || inside !== 1) fail('root bounds do not isolate the indexed root');
}
