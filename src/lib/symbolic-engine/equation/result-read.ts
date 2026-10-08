import type { CanonicalEquationCondition, CanonicalEquationEndpoint, CanonicalEquationInterval, CanonicalEquationRegionCell, CanonicalEquationSet } from '../../../types/calculator/canonical-result-equation';
import type { CanonicalEquationDocument } from '../../../types/calculator/canonical-result-current';
import type { CanonicalMathValue } from '../../../types/calculator/canonical-result-common';
import { validateCanonicalAnswer } from '../../result-contract/current';
import { demand } from './core/execution';
import type { Rational } from './core/algebra/rational';
import { compareReal, type RealRootOf, type RootOf } from './core/algebraic/root-of';
import { rationalForm } from './core/decision/rational-form';
import { certifyIsolated } from './core/numeric/isolated';
import { certifyPoint } from './core/numeric/krawczyk';
import { sameSet } from './core/parameters/verify';
import { asRoot } from './core/representation/evaluate';
import type { ExprId, ExpressionStore } from './core/representation/expression';
import { readExpression } from './core/representation/mathjson';
import { canonicalRelation, relationKey, relationProblem, type Condition, type Relation, type RelationProblem } from './core/representation/relation';
import { minimalPolynomial } from './core/representation/root-identity';
import {
  normalizeSet, setKey, type Endpoint, type EquationOutcome, type Interval, type Point, type PointValue, type RegionCell, type SolutionSet,
} from './core/representation/solution-set';

/**
 * The Equation read model for Equation outcomes: a validated document read back into core values in a given store.
 * Root binders are matched exactly: a real binder must isolate exactly one real root of its (minimal)
 * polynomial between its rational bounds; a complex binder must carry the canonical isolation disk of one root.
 */
export type ReadEquationOutcome =
  | { kind: 'solved'; set: SolutionSet }
  | { kind: 'empty' }
  | Exclude<EquationOutcome, { kind: 'solved' | 'empty' }>;

const fail = (reason: string): never => demand(false, 'verification-failed', reason) as never;

function rationalOf(store: ExpressionStore, v: CanonicalMathValue): Rational {
  const r = readExpression(store, v.mathJson);
  if (r.kind !== 'ok') return fail('a bound is not readable');
  const n = store.node(r.value);
  return n.kind === 'number' ? n.value : fail('a bound is not rational');
}

/** Root binders of a validated document, decoded in `store`, and a reader of math leaves that inlines them. */
export interface RootBinders {
  readonly algebraic: ReadonlyMap<string, Extract<PointValue, { kind: 'algebraic' }>>;
  /** Indexed real roots, by the variable they are a root in (the single target, or a cylindrical cell's variable). */
  readonly indexed: ReadonlyMap<string, (variable: string) => PointValue>;
  /** Isolated real zeros and coordinates of isolated points (certified numerics), as core nodes; their certificates are re-checked on reading. */
  readonly isolated: ReadonlyMap<string, ExprId>;
  /** A math leaf as a core expression, with algebraic binders inlined (indexed roots are refused inside expressions). */
  readonly read: (v: CanonicalMathValue) => ExprId;
}

export function readRootBinders(store: ExpressionStore, doc: CanonicalEquationDocument): RootBinders {
  const p = doc.primary, ctx = store.ctx;
  const algebraic = new Map<string, Extract<PointValue, { kind: 'algebraic' }>>();
  const indexed = new Map<string, (variable: string) => PointValue>();
  const isolated = new Map<string, ExprId>();
  const read = (v: CanonicalMathValue): ExprId => {
    const r = readExpression(store, v.mathJson);
    if (r.kind !== 'ok') return fail('a math value is not readable by the core');
    const free = store.freeSymbols(r.value);
    if (free.some(s => indexed.has(s))) return fail('an indexed root occurs inside an expression');
    const env = new Map([
      ...free.filter(s => algebraic.has(s)).map(s => [s, store.algebraic((algebraic.get(s) as { root: RootOf }).root)] as const),
      ...free.filter(s => isolated.has(s)).map(s => [s, isolated.get(s) as ExprId] as const),
    ]);
    return env.size ? store.substitute(r.value, env) : r.value;
  };
  for (const b of p.roots) {
    if (b.kind === 'isolated-real-point') {
      // Certified system solutions: the Krawczyk certificate is re-proven before the coordinates are trusted.
      const system = b.equations.map(read), box = b.box.map(iv => ({ lo: rationalOf(store, iv.lo), hi: rationalOf(store, iv.hi) }));
      certifyPoint(store, system, b.symbols, box);
      b.symbols.forEach((s, i) => isolated.set(s, store.isolatedPoint(system, b.symbols, box, i)));
      continue;
    }
    if (b.kind === 'isolated-real-root') {
      const f = read(b.expression), lo = rationalOf(store, b.lo), hi = rationalOf(store, b.hi);
      isolated.set(b.symbol, store.isolated(f, b.symbol, lo, hi, certifyIsolated(store, f, b.symbol, lo, hi)));
      continue;
    }
    if (b.kind === 'indexed-real-root') {
      const own = read(b.polynomial), bounds = b.lo && b.hi ? { lo: rationalOf(store, b.lo), hi: rationalOf(store, b.hi) } : {};
      indexed.set(b.symbol, (x: string) => Object.freeze({ kind: 'root', poly: store.substitute(own, new Map([[b.symbol, store.symbol(x)]])), variable: x, index: b.index, ...bounds }));
      continue;
    }
    const f = rationalForm(store, read(b.polynomial), b.symbol);
    if (!f.ok || f.form.num.kind !== 'q' || f.form.den.kind !== 'q' || f.form.den.c.length !== 1) return fail('a binder polynomial is not a polynomial');
    const coefficients = f.form.num.c.map(c => (c.denominator === 1n ? c.numerator : fail('a binder polynomial has a non-integer coefficient')));
    const roots = store.roots.roots(ctx, minimalPolynomial(ctx, coefficients));
    let matches: RootOf[];
    if (b.kind === 'real-algebraic') {
      const lo = asRoot(ctx, { kind: 'rational', value: rationalOf(store, b.lo) }) as RealRootOf;
      const hi = asRoot(ctx, { kind: 'rational', value: rationalOf(store, b.hi) }) as RealRootOf;
      matches = roots.filter(r => r.kind === 'real' && compareReal(ctx, lo, r) < 0 && compareReal(ctx, r, hi) < 0);
    } else {
      const [re, im, radius] = [b.re, b.im, b.radius].map(v => rationalOf(store, v));
      const same = (a: Rational, c: Rational) => a.numerator === c.numerator && a.denominator === c.denominator;
      matches = roots.filter(r => {
        const c = store.roots.canonical(ctx, r).root;
        return c.kind === 'complex' && same(c.re, re) && same(c.im, im) && same(c.radius, radius);
      });
    }
    if (matches.length !== 1) fail('a root binder does not isolate exactly one root');
    algebraic.set(b.symbol, Object.freeze(b.form === undefined ? { kind: 'algebraic', root: matches[0] } : { kind: 'algebraic', root: matches[0], form: read(b.form) }));
  }
  return { algebraic, indexed, isolated, read };
}

export function readEquationOutcome(store: ExpressionStore, input: unknown): ReadEquationOutcome {
  const checked = validateCanonicalAnswer(input, 'equation-outcome');
  if (!checked.ok) return fail(`not a valid current document: ${checked.failure.message}`);
  const doc: CanonicalEquationDocument = checked.validated.value, p = doc.primary;
  const { algebraic, indexed, read } = readRootBinders(store, doc);
  // An indexed root is a root in the single target, or in the variable of the cylindrical cell it bounds.
  const value = (v: CanonicalMathValue, variable = p.targets.length === 1 ? p.targets[0] : undefined): PointValue => {
    const j = v.mathJson;
    if (typeof j === 'string' && algebraic.has(j)) return algebraic.get(j) as PointValue;
    if (typeof j === 'string' && indexed.has(j)) return variable === undefined ? fail('an indexed root outside a cell needs a single target') : (indexed.get(j) as (x: string) => PointValue)(variable);
    const id = read(v), n = store.node(id);
    return n.kind === 'number' ? Object.freeze({ kind: 'rational', value: n.value }) : Object.freeze({ kind: 'expression', id });
  };
  const condition = (c: CanonicalEquationCondition): Condition =>
    (c.kind === 'equal' || c.kind === 'not-equal' ? { kind: c.kind, expr: read(c.expr), other: read(c.other) } : { kind: c.kind, expr: read(c.expr) });
  const endpoint = (e: CanonicalEquationEndpoint, variable?: string): Endpoint => (e.kind === 'infinity' ? { kind: 'infinity', sign: e.sign } : value(e.value, variable));
  const interval = (i: CanonicalEquationInterval): Interval => ({ lo: endpoint(i.lo), hi: endpoint(i.hi), loClosed: i.loClosed, hiClosed: i.hiClosed });
  const cell = (c: CanonicalEquationRegionCell, depth: number): RegionCell => {
    const x = p.targets[depth - 1], head = { lo: endpoint(c.lo, x), hi: endpoint(c.hi, x), loClosed: c.loClosed, hiClosed: c.hiClosed };
    return c.children ? { ...head, children: c.children.map(k => cell(k, depth + 1)) } : head;
  };
  const point = (pt: CanonicalMathValue[]): Point => pt.map(v => value(v));
  const set = (s: CanonicalEquationSet): SolutionSet => {
    switch (s.kind) {
      case 'finite': return { kind: 'finite', variables: s.variables, points: s.points.map(point) };
      case 'cofinite': return { kind: 'cofinite', variables: s.variables, except: s.except.map(point) };
      case 'intervals': return { kind: 'intervals', variables: s.variables, intervals: s.intervals.map(interval) };
      case 'union': return { kind: 'union', sets: s.sets.map(set) };
      case 'case-tree': return { kind: 'case-tree', cases: s.cases.map(c => ({ conditions: c.conditions.map(condition), set: set(c.set) })) };
      case 'periodic-set': return { kind: 'periodic-set', variables: s.variables, period: value(s.period), components: s.components.map(interval), range: interval(s.range) };
      case 'interval-family': return {
        kind: 'interval-family', variables: s.variables, parameter: s.parameter,
        ...(s.from === undefined ? {} : { from: BigInt(s.from) }), ...(s.to === undefined ? {} : { to: BigInt(s.to) }),
        lo: read(s.lo), hi: read(s.hi), loClosed: s.loClosed, hiClosed: s.hiClosed,
      };
      case 'root-set': return { kind: 'root-set', variables: s.variables, poly: read(s.polynomial) };
      case 'periodic': return { kind: 'periodic', variables: s.variables, values: s.values.map(read), integerParameters: s.integerParameters, constraints: s.constraints.map(condition) };
      case 'parametric': return { kind: 'parametric', variables: s.variables, values: s.values.map(read), freeParameters: s.freeParameters, constraints: s.constraints.map(condition) };
      case 'reduced-form': return {
        kind: 'reduced-form',
        problem: relationProblem(store, { domain: p.domain, targets: s.targets, relations: s.relations.map(r => ({ op: r.op, lhs: read(r.lhs), rhs: read(r.rhs) })), conditions: s.conditions.map(condition) }),
      };
      case 'unconfirmed': return { kind: 'unconfirmed', variables: s.variables, candidates: s.candidates.map(c => ({ point: point(c.point), derivations: c.derivations })) };
      case 'cylindrical': return { kind: 'cylindrical', variables: s.variables, cells: s.cells.map(c => cell(c, 1)) };
      case 'truth': return { kind: 'truth', value: s.value };
    }
  };
  const o = p.outcome;
  switch (o.kind) {
    case 'solved': return { kind: 'solved', set: set(o.set) };
    case 'empty': return { kind: 'empty' };
    case 'undecided': return { kind: 'undecided', reason: o.reason };
    case 'unsupported': return { kind: 'unsupported', reason: o.reason };
    case 'incomplete': return { kind: 'incomplete-implementation', reason: o.owner === 'unassigned' ? o.reason : `${o.owner}: ${o.reason}` };
    case 'stopped': return o.stop === 'result-size' ? fail('a result-size stop has no core outcome') : { kind: 'resource', stop: o.stop };
  }
}

/** The assumptions of a validated document, read in `store` (canonical relations). */
export function readAssumptions(store: ExpressionStore, doc: CanonicalEquationDocument): Relation[] {
  const { read } = readRootBinders(store, doc);
  return (doc.primary.assumptions ?? []).map(r => canonicalRelation(store, { op: r.op, lhs: read(r.lhs), rhs: read(r.rhs) }));
}

/**
 * The document must read back to the same outcome: the same kind and reason, or the same set by value; and to the
 * same assumptions.
 */
export function replayEquationDocument(problem: RelationProblem, outcome: EquationOutcome, doc: CanonicalEquationDocument, assumptions: readonly Relation[] = []): void {
  const store = problem.store, domain = problem.domain, back = readEquationOutcome(store, doc);
  const keys = (rs: readonly Relation[]) => rs.map(r => relationKey(store, canonicalRelation(store, r))).sort().join('\u0000');
  if (keys(readAssumptions(store, doc)) !== keys(assumptions)) fail('the document reads back to different assumptions');
  if (back.kind !== outcome.kind) fail('the document reads back to a different outcome');
  if (back.kind === 'solved' && outcome.kind === 'solved') {
    const a = normalizeSet(store, back.set, domain), b = normalizeSet(store, outcome.set, domain);
    if (setKey(store, a) !== setKey(store, b) && !sameSet(store, a, b)) fail('the document reads back to a different set');
  } else if ('reason' in back && 'reason' in outcome && back.reason !== outcome.reason) fail('the document reads back to a different reason');
  else if (back.kind === 'resource' && outcome.kind === 'resource' && back.stop !== outcome.stop) fail('the document reads back to a different stop');
}
