import type {
  CanonicalEquationConditionV6, CanonicalEquationEndpointV6, CanonicalEquationIntervalV6, CanonicalEquationSetV6,
  CanonicalMathValueV2, CanonicalResultDocumentV6,
} from '../../../types/calculator';
import { validateCanonicalResultDocumentV6 } from '../../result-contract/validation-v6';
import { demand } from './core/execution';
import type { Rational } from './core/algebra/rational';
import { compareReal, type RealRootOf, type RootOf } from './core/algebraic/root-of';
import { rationalForm } from './core/decision/rational-form';
import { sameSet } from './core/parameters/verify';
import { asRoot } from './core/representation/evaluate';
import type { ExprId, ExpressionStore } from './core/representation/expression';
import { readExpression } from './core/representation/mathjson';
import { relationProblem, type Condition, type RelationProblem } from './core/representation/relation';
import { minimalPolynomial } from './core/representation/root-identity';
import {
  normalizeSet, setKey, type Endpoint, type EquationOutcome, type Interval, type Point, type PointValue, type SolutionSet,
} from './core/representation/solution-set';

/**
 * The V6 read model for Equation outcomes: a validated document read back into core values in a given store.
 * Root binders are matched exactly: a real binder must isolate exactly one real root of its (minimal)
 * polynomial between its rational bounds; a complex binder must carry the canonical isolation disk of one root.
 */
export type ReadEquationOutcome =
  | { kind: 'solved'; set: SolutionSet }
  | { kind: 'empty' }
  | Exclude<EquationOutcome, { kind: 'solved' | 'empty' }>;

const fail = (reason: string): never => demand(false, 'verification-failed', reason) as never;

function rationalOf(store: ExpressionStore, v: CanonicalMathValueV2): Rational {
  const r = readExpression(store, v.mathJson);
  if (r.kind !== 'ok') return fail('a bound is not readable');
  const n = store.node(r.value);
  return n.kind === 'number' ? n.value : fail('a bound is not rational');
}

export function readEquationOutcomeV6(store: ExpressionStore, input: unknown): ReadEquationOutcome {
  const checked = validateCanonicalResultDocumentV6(input);
  if (!checked.ok) return fail(`not a valid V6 document: ${checked.failure.message}`);
  const doc: CanonicalResultDocumentV6 = checked.validated.value, p = doc.primary, ctx = store.ctx;
  const algebraic = new Map<string, Extract<PointValue, { kind: 'algebraic' }>>();
  const indexed = new Map<string, PointValue>();
  const read = (v: CanonicalMathValueV2): ExprId => {
    const r = readExpression(store, v.mathJson);
    if (r.kind !== 'ok') return fail('a math value is not readable by the core');
    const free = store.freeSymbols(r.value);
    if (free.some(s => indexed.has(s))) return fail('an indexed root occurs inside an expression');
    const env = new Map(free.filter(s => algebraic.has(s)).map(s => [s, store.algebraic((algebraic.get(s) as { root: RootOf }).root)] as const));
    return env.size ? store.substitute(r.value, env) : r.value;
  };
  for (const b of p.roots) {
    if (b.kind === 'indexed-real-root') {
      if (p.targets.length !== 1) fail('indexed roots need a single target');
      const x = p.targets[0], poly = store.substitute(read(b.polynomial), new Map([[b.symbol, store.symbol(x)]]));
      indexed.set(b.symbol, Object.freeze({ kind: 'root', poly, variable: x, index: b.index,
        ...(b.lo && b.hi ? { lo: rationalOf(store, b.lo), hi: rationalOf(store, b.hi) } : {}) }));
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
  const value = (v: CanonicalMathValueV2): PointValue => {
    const j = v.mathJson;
    if (typeof j === 'string' && algebraic.has(j)) return algebraic.get(j) as PointValue;
    if (typeof j === 'string' && indexed.has(j)) return indexed.get(j) as PointValue;
    const id = read(v), n = store.node(id);
    return n.kind === 'number' ? Object.freeze({ kind: 'rational', value: n.value }) : Object.freeze({ kind: 'expression', id });
  };
  const condition = (c: CanonicalEquationConditionV6): Condition =>
    (c.kind === 'equal' || c.kind === 'not-equal' ? { kind: c.kind, expr: read(c.expr), other: read(c.other) } : { kind: c.kind, expr: read(c.expr) });
  const endpoint = (e: CanonicalEquationEndpointV6): Endpoint => (e.kind === 'infinity' ? { kind: 'infinity', sign: e.sign } : value(e.value));
  const interval = (i: CanonicalEquationIntervalV6): Interval => ({ lo: endpoint(i.lo), hi: endpoint(i.hi), loClosed: i.loClosed, hiClosed: i.hiClosed });
  const point = (pt: CanonicalMathValueV2[]): Point => pt.map(value);
  const set = (s: CanonicalEquationSetV6): SolutionSet => {
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

/** The document must read back to the same outcome: the same kind and reason, or the same set by value. */
export function replayEquationDocument(problem: RelationProblem, outcome: EquationOutcome, doc: CanonicalResultDocumentV6): void {
  const store = problem.store, domain = problem.domain, back = readEquationOutcomeV6(store, doc);
  if (back.kind !== outcome.kind) fail('the document reads back to a different outcome');
  if (back.kind === 'solved' && outcome.kind === 'solved') {
    const a = normalizeSet(store, back.set, domain), b = normalizeSet(store, outcome.set, domain);
    if (setKey(store, a) !== setKey(store, b) && !sameSet(store, a, b)) fail('the document reads back to a different set');
  } else if ('reason' in back && 'reason' in outcome && back.reason !== outcome.reason) fail('the document reads back to a different reason');
  else if (back.kind === 'resource' && outcome.kind === 'resource' && back.stop !== outcome.stop) fail('the document reads back to a different stop');
}
