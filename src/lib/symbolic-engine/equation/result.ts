import type { SerializableMathJson } from '../../../types/calculator';
import type { CanonicalEquationCondition, CanonicalEquationEndpoint, CanonicalEquationRelation, CanonicalEquationInterval, CanonicalEquationOutcome, CanonicalEquationRootBinder, CanonicalEquationSet } from '../../../types/calculator/canonical-result-equation';
import type { CanonicalEquationDocument } from '../../../types/calculator/canonical-result-current';
import type { CanonicalMathValue } from '../../../types/calculator/canonical-result-common';
import { equationMathLatex } from '../../result-contract/equation-math-latex';
import { buildCanonicalResultDocument, requireCanonicalAnswer } from '../../result-contract/current';
import type { CanonicalResultValidationLimits } from '../../result-contract/validation';
import { validateCanonicalAnswer } from '../../result-contract/current';
import { verifyEquationOutcome } from './core/decide';
import { EquationAlgebraError } from './core/execution';
import type { Rational } from './core/algebra/rational';
import type { RootOf } from './core/algebraic/root-of';
import type { ExprId, ExpressionStore, FunctionName } from './core/representation/expression';
import type { Condition, Relation, RelationProblem } from './core/representation/relation';
import { verifyAssumedOutcome } from './core/parameters/assume';
import type { Endpoint, EquationOutcome, Interval, PointValue, RootValue, SolutionSet } from './core/representation/solution-set';
import { replayEquationDocument } from './result-read';

/**
 * The Equation adapter: projects a core outcome to the current canonical result.
 *
 * 1. The outcome is verified independently by the core first.
 * 2. Values become restricted standard MathJSON; algebraic numbers become root binders referenced by symbol.
 * 3. The document is validated; one over the shared bounds is reported as `stopped: result-size`.
 * 4. The document is replayed: read back into core values and compared with the outcome by value.
 * 5. It passes canonical-result authority.
 *
 * A typed resource stop during verification or replay becomes the matching `stopped` outcome; a failed
 * verification or replay is thrown, never projected.
 */
export type EquationResult = { kind: 'success' | 'error'; canonicalResult: CanonicalEquationDocument };

const OWNER = /^(EQUATION-[A-Z0-9]+(?:-[A-Z0-9]+)*): ([\s\S]+)$/;
const SIZE = new Set(['node-limit', 'depth-limit', 'byte-limit']);
const FUNCTIONS: Readonly<Record<FunctionName, string>> = {
  exp: 'Exp', log: 'Ln', sin: 'Sin', cos: 'Cos', tan: 'Tan', asin: 'Arcsin', acos: 'Arccos', atan: 'Arctan', abs: 'Abs', lambertw: 'LambertW', lambertwm1: 'LambertW',
};

const integer = (n: bigint): SerializableMathJson =>
  (n >= BigInt(Number.MIN_SAFE_INTEGER) && n <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(n) : { num: n.toString() });
const rationalJson = (q: Rational): SerializableMathJson =>
  (q.denominator === 1n ? integer(q.numerator) : ['Rational', integer(q.numerator), integer(q.denominator)]);
const math = (mathJson: SerializableMathJson): CanonicalMathValue => ({ mathJson, canonicalLatex: equationMathLatex(mathJson) });

class Projector {
  readonly binders: CanonicalEquationRootBinder[] = [];
  readonly #byKey = new Map<string, string>();
  readonly #taken: Set<string>;
  readonly store: ExpressionStore;
  readonly problem: RelationProblem;
  constructor(problem: RelationProblem) {
    this.problem = problem;
    this.store = problem.store;
    this.#taken = new Set([...problem.targets, ...problem.parameters]);
  }

  #fresh(): string {
    let i = this.binders.length + 1;
    while (this.#taken.has(`r_${i}`)) i++;
    this.#taken.add(`r_${i}`);
    return `r_${i}`;
  }

  /** Integer polynomial in `s`, ascending coefficients, as Add/Multiply/Power terms. */
  #polynomial(coefficients: readonly bigint[], s: string): SerializableMathJson {
    const terms: SerializableMathJson[] = [];
    coefficients.forEach((c, k) => {
      if (c === 0n) return;
      const power: SerializableMathJson = k === 0 ? integer(c) : k === 1 ? s : ['Power', s, k];
      terms.push(k === 0 || c === 1n ? power : ['Multiply', integer(c), power]);
    });
    return terms.length === 1 ? terms[0] : ['Add', ...terms];
  }

  algebraic(root: RootOf, form?: ExprId): string {
    const ctx = this.store.ctx, c = this.store.roots.canonical(ctx, root);
    const key = `a:${c.key}:${form === undefined ? '' : this.store.digest(form)}`;
    const known = this.#byKey.get(key);
    if (known) return known;
    const symbol = this.#fresh(), polynomial = math(this.#polynomial(c.poly.coefficients, symbol));
    const extra = form === undefined ? {} : { form: math(this.expr(form)) };
    const r = c.root;
    this.binders.push(r.kind === 'real'
      ? { kind: 'real-algebraic', symbol, polynomial, lo: math(rationalJson(r.lo)), hi: math(rationalJson(r.hi)), ...extra }
      : { kind: 'complex-algebraic', symbol, polynomial, re: math(rationalJson(r.re)), im: math(rationalJson(r.im)), radius: math(rationalJson(r.radius)), ...extra });
    this.#byKey.set(key, symbol);
    return symbol;
  }

  indexed(v: RootValue): string {
    const key = `i:${this.store.digest(v.poly)}:${v.variable}:${v.index}:${v.lo ? `${v.lo.numerator}/${v.lo.denominator}` : ''}:${v.hi ? `${v.hi.numerator}/${v.hi.denominator}` : ''}`;
    const known = this.#byKey.get(key);
    if (known) return known;
    const symbol = this.#fresh();
    const poly = this.store.substitute(v.poly, new Map([[v.variable, this.store.symbol(symbol)]]));
    this.binders.push({ kind: 'indexed-real-root', symbol, polynomial: math(this.expr(poly)), index: v.index,
      ...(v.lo && v.hi ? { lo: math(rationalJson(v.lo)), hi: math(rationalJson(v.hi)) } : {}) });
    this.#byKey.set(key, symbol);
    return symbol;
  }

  /** An isolated real zero (certified numerics) as a binder: its expression in the binder's own symbol. */
  isolated(id: ExprId): string {
    const key = `n:${this.store.digest(id)}`, known = this.#byKey.get(key);
    if (known) return known;
    const n = this.store.node(id) as Extract<ReturnType<ExpressionStore['node']>, { kind: 'isolated' }>;
    const symbol = this.#fresh();
    this.binders.push({ kind: 'isolated-real-root', symbol, expression: math(this.expr(this.store.isolatedIn(id, symbol))),
      lo: math(rationalJson(n.lo)), hi: math(rationalJson(n.hi)) });
    this.#byKey.set(key, symbol);
    return symbol;
  }

  /** An expression as restricted standard MathJSON (post-order over the shared graph). */
  expr(id: ExprId): SerializableMathJson {
    const out = new Map<ExprId, SerializableMathJson>();
    for (const n of this.store.postorder([id])) {
      const node = this.store.node(n), get = (c: ExprId) => out.get(c) as SerializableMathJson;
      let json: SerializableMathJson;
      switch (node.kind) {
        case 'number': json = rationalJson(node.value); break;
        case 'symbol': json = node.name; break;
        case 'constant': json = node.name === 'pi' ? 'Pi' : 'ImaginaryUnit'; break;
        case 'algebraic': json = this.algebraic(node.root); break;
        case 'isolated': json = this.isolated(n); break;
        case 'add': json = node.args.length === 1 ? get(node.args[0]) : ['Add', ...node.args.map(get)]; break;
        case 'mul': json = node.args.length === 1 ? get(node.args[0]) : ['Multiply', ...node.args.map(get)]; break;
        case 'pow': json = ['Power', get(node.base), get(node.exponent)]; break;
        case 'apply': json = node.fn === 'lambertwm1' ? ['LambertW', get(node.arg), -1] : [FUNCTIONS[node.fn], get(node.arg)]; break;
      }
      out.set(n, json);
    }
    return out.get(id) as SerializableMathJson;
  }

  value(v: PointValue): CanonicalMathValue {
    switch (v.kind) {
      case 'rational': return math(rationalJson(v.value));
      case 'algebraic': return math(this.algebraic(v.root, 'form' in v ? v.form : undefined));
      case 'root': return math(this.indexed(v));
      case 'expression': return math(this.expr(v.id));
    }
  }

  condition(c: Condition): CanonicalEquationCondition {
    return c.kind === 'equal' || c.kind === 'not-equal'
      ? { kind: c.kind, expr: math(this.expr(c.expr)), other: math(this.expr(c.other)) }
      : { kind: c.kind, expr: math(this.expr(c.expr)) };
  }

  relation(r: Relation): CanonicalEquationRelation {
    return { op: r.op, lhs: math(this.expr(r.lhs)), rhs: math(this.expr(r.rhs)) };
  }

  endpoint(e: Endpoint): CanonicalEquationEndpoint {
    return e.kind === 'infinity' ? { kind: 'infinity', sign: e.sign } : { kind: 'value', value: this.value(e) };
  }

  interval(i: Interval): CanonicalEquationInterval {
    return { lo: this.endpoint(i.lo), hi: this.endpoint(i.hi), loClosed: i.loClosed, hiClosed: i.hiClosed };
  }

  set(s: SolutionSet): CanonicalEquationSet {
    const vars = (v: readonly string[]) => [...v];
    switch (s.kind) {
      case 'finite': return { kind: 'finite', variables: vars(s.variables), points: s.points.map(p => p.map(v => this.value(v))) };
      case 'cofinite': return { kind: 'cofinite', variables: vars(s.variables), except: s.except.map(p => p.map(v => this.value(v))) };
      case 'intervals': return { kind: 'intervals', variables: vars(s.variables), intervals: s.intervals.map(i => this.interval(i)) };
      case 'union': return { kind: 'union', sets: s.sets.map(x => this.set(x)) };
      case 'case-tree': return { kind: 'case-tree', cases: s.cases.map(c => ({ conditions: c.conditions.map(k => this.condition(k)), set: this.set(c.set) })) };
      case 'periodic-set': return { kind: 'periodic-set', variables: vars(s.variables), period: this.value(s.period), components: s.components.map(i => this.interval(i)), range: this.interval(s.range) };
      case 'interval-family': return {
        kind: 'interval-family', variables: vars(s.variables), parameter: s.parameter,
        ...(s.from === undefined ? {} : { from: s.from.toString() }), ...(s.to === undefined ? {} : { to: s.to.toString() }),
        lo: math(this.expr(s.lo)), hi: math(this.expr(s.hi)), loClosed: s.loClosed, hiClosed: s.hiClosed,
      };
      case 'root-set': return { kind: 'root-set', variables: vars(s.variables), polynomial: math(this.expr(s.poly)) };
      case 'periodic': return { kind: 'periodic', variables: vars(s.variables), values: s.values.map(v => math(this.expr(v))), integerParameters: [...s.integerParameters], constraints: s.constraints.map(c => this.condition(c)) };
      case 'parametric': return { kind: 'parametric', variables: vars(s.variables), values: s.values.map(v => math(this.expr(v))), freeParameters: [...s.freeParameters], constraints: s.constraints.map(c => this.condition(c)) };
      case 'reduced-form': return {
        kind: 'reduced-form', targets: [...s.problem.targets],
        relations: s.problem.relations.map(r => ({ op: r.op, lhs: math(this.expr(r.lhs)), rhs: math(this.expr(r.rhs)) })),
        conditions: s.problem.conditions.map(c => this.condition(c)),
      };
      case 'unconfirmed': return { kind: 'unconfirmed', variables: vars(s.variables), candidates: s.candidates.map(c => ({ point: c.point.map(v => this.value(v)), derivations: [...c.derivations] })) };
    }
  }
}

function v6Outcome(p: Projector, outcome: EquationOutcome): CanonicalEquationOutcome {
  switch (outcome.kind) {
    case 'solved': return { kind: 'solved', set: p.set(outcome.set) };
    case 'empty': return { kind: 'empty' };
    case 'undecided': return { kind: 'undecided', reason: outcome.reason };
    case 'unsupported': return { kind: 'unsupported', reason: outcome.reason };
    case 'resource': return { kind: 'stopped', stop: outcome.stop };
    case 'incomplete-implementation': {
      const m = OWNER.exec(outcome.reason);
      return m ? { kind: 'incomplete', owner: m[1], reason: m[2] } : { kind: 'incomplete', owner: 'unassigned', reason: outcome.reason };
    }
  }
}

function document(problem: RelationProblem, p: Projector, outcome: CanonicalEquationOutcome, rules: string[], assumptions: readonly Relation[]): CanonicalEquationDocument {
  const answer = outcome.kind === 'solved' || outcome.kind === 'empty';
  const assumed = assumptions.length ? { assumptions: assumptions.map(r => p.relation(r)) } : {};
  return buildCanonicalResultDocument({
    outcomeKind: answer ? 'success' : 'error',
    title: 'Equation',
    ...(answer ? {} : { error: `No answer (${outcome.kind}).` }),
    warnings: [],
    primary: {
      kind: 'equation-outcome', domain: problem.domain, targets: [...problem.targets], parameters: [...problem.parameters],
      roots: p.binders, ...assumed, outcome, provenance: answer ? { verification: 'independent', rules } : { verification: 'not-applicable', rules: [] },
    },
  });
}

function finish(d: CanonicalEquationDocument): EquationResult {
  return { kind: d.outcomeKind, canonicalResult: requireCanonicalAnswer(d, 'equation-outcome') };
}

/** Conditions on the problem's own expressions (no algebraic numbers), in the Equation grammar, for display. */
export function projectConditions(problem: RelationProblem, conditions: readonly Condition[]): CanonicalEquationCondition[] {
  const p = new Projector(problem), out = conditions.map(c => p.condition(c));
  if (p.binders.length) throw new Error('Displayed conditions carry no algebraic numbers.');
  return out;
}

/**
 * Assumptions (relations on the parameters only) and the full outcome they were applied to: the full outcome is
 * verified independently, then the assumed outcome against it (core/parameters/assume.ts).
 */
export interface EquationAssumed { readonly assumptions: readonly Relation[]; readonly full: EquationOutcome }

/**
 * The decided outcome laid into the document shape before it is verified, for the page's "not checked yet" preview
 * only: the presentation reads documents, so the preview is laid out from this one. It never leaves the worker;
 * only its presentation rows do, marked unchecked. The real document comes from `projectEquationOutcome`.
 */
export function previewEquationDocument(problem: RelationProblem, outcome: EquationOutcome, assumptions: readonly Relation[] = []): CanonicalEquationDocument {
  const p = new Projector(problem);
  return requireCanonicalAnswer(document(problem, p, v6Outcome(p, outcome), [], assumptions), 'equation-outcome');
}

/** Project a core outcome for `problem` to a verified, replayed, authority-checked current document. */
export function projectEquationOutcome(problem: RelationProblem, outcome: EquationOutcome, limits: CanonicalResultValidationLimits = {}, assumed?: EquationAssumed): EquationResult {
  const assumptions = assumed?.assumptions ?? [];
  const stopped = (stop: 'work' | 'allocation' | 'cancelled' | 'result-size') =>
    finish(document(problem, new Projector(problem), { kind: 'stopped', stop }, [], assumptions));
  try {
    if (assumed && assumptions.length) {
      verifyEquationOutcome(problem, assumed.full);
      verifyAssumedOutcome(problem, assumptions, assumed.full, outcome);
    } else verifyEquationOutcome(problem, outcome);
    const p = new Projector(problem);
    const rules = 'proof' in outcome ? [...new Set(outcome.proof.records.map(r => r.rule))].sort() : [];
    const d = document(problem, p, v6Outcome(p, outcome), rules, assumptions);
    const checked = validateCanonicalAnswer(d, 'equation-outcome', limits);
    if (!checked.ok) {
      if (SIZE.has(checked.failure.reason)) return stopped('result-size');
      throw new Error(`Equation projection is invalid: ${checked.failure.message} at ${checked.failure.path ?? '$'}`);
    }
    replayEquationDocument(problem, outcome, checked.validated.value, assumptions);
    return finish(checked.validated.value);
  } catch (e) {
    if (e instanceof EquationAlgebraError && e.code === 'resource' && e.stop) return stopped(e.stop);
    throw e;
  }
}
