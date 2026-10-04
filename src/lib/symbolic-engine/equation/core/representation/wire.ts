import { demand, EQUATION_STOPS, type EquationStop, type ExecutionContext } from '../execution';
import { decodeRational, encodeRational } from '../algebra/wire';
import {
  CONSTANT_NAMES, ExpressionStore, FUNCTION_NAMES, type ExprId, type ExpressionNode, type FunctionName,
} from './expression';
import {
  CONDITION_KINDS, RELATION_OPERATORS, relationProblem, type Condition, type ConditionKind, type RelationOperator, type RelationProblem,
} from './relation';
import { minimalPolynomial } from './root-identity';
import {
  OUTCOME_KINDS, SOLUTION_SET_KINDS, assertOutcome, type Endpoint, type EquationOutcome, type Interval, type Point, type PointValue, type SolutionSet,
} from './solution-set';
import { EQUIVALENCE_KINDS, OBLIGATIONS, type EquivalenceKind, type Obligation, type ProofLog, type TransformRecord } from './transform';

/**
 * Private versioned JSON codec for the representation: expression graphs as
 * node tables, relation problems, proof logs, solution sets and outcomes.
 * Decoding is strict: every node is rebuilt through the canonical builders
 * and must come out exactly as encoded, state hashes are recomputed and must
 * match, and shapes are checked key by key. Not a public result format.
 */
export const REPRESENTATION_WIRE_VERSION = 1;

type Json = unknown;
const fail = (reason: string): never => demand(false, 'invalid-input', reason) as never;

function record(value: Json, keys: readonly string[]): Record<string, Json> {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return fail('record expected');
  const own = Object.getOwnPropertyNames(value).sort();
  if (own.join(',') !== [...keys].sort().join(',')) fail(`record keys: expected ${keys.join(',')}`);
  for (const k of own) { const d = Object.getOwnPropertyDescriptor(value, k); if (!d || !('value' in d)) fail('accessor property'); }
  return value as Record<string, Json>;
}
function list(value: Json): readonly Json[] { return Array.isArray(value) ? value : fail('list expected'); }
function text(value: Json): string { return typeof value === 'string' ? value : fail('string expected'); }
function oneOf<T extends string>(value: Json, options: readonly T[]): T { return (options as readonly Json[]).includes(value) ? value as T : fail(`unexpected value ${String(value)}`); }
function integerText(value: Json): bigint {
  const t = text(value);
  if (!/^-?(0|[1-9][0-9]*)$/.test(t) || t === '-0') fail('canonical integer text');
  return BigInt(t);
}

// ---- expression graph ----

/** Collects nodes of one store into a table, children before parents. */
export class GraphEncoder {
  readonly store: ExpressionStore;
  readonly nodes: Json[] = [];
  readonly #index = new Map<ExprId, number>();
  constructor(store: ExpressionStore) { this.store = store; }

  ref(id: ExprId): number {
    const known = this.#index.get(id);
    if (known !== undefined) return known;
    for (const n of this.store.postorder([id])) {
      if (this.#index.has(n)) continue;
      this.#index.set(n, this.nodes.length);
      this.nodes.push(this.#encode(this.store.node(n)));
    }
    return this.#index.get(id) as number;
  }

  #encode(node: ExpressionNode): Json {
    const ctx = this.store.ctx, r = (c: ExprId) => this.#index.get(c) as number;
    switch (node.kind) {
      case 'number': return ['n', encodeRational(ctx, node.value)];
      case 'symbol': return ['s', node.name];
      case 'constant': return ['c', node.name];
      case 'algebraic': return ['r', node.poly.coefficients.map(c => c.toString()), node.index];
      case 'add': return ['+', node.args.map(r)];
      case 'mul': return ['*', node.args.map(r)];
      case 'pow': return ['^', r(node.base), r(node.exponent)];
      case 'apply': return ['f', node.fn, r(node.arg)];
    }
  }
}

/** Rebuilds a node table into a store; each entry must already be canonical. */
export class GraphDecoder {
  readonly store: ExpressionStore;
  readonly #ids: ExprId[] = [];
  readonly #back = new Map<ExprId, number>();
  constructor(store: ExpressionStore, nodes: Json) {
    this.store = store;
    const seen = new Set<ExprId>();
    for (const entry of list(nodes)) {
      store.ctx.tick();
      const id = this.#decode(list(entry));
      if (seen.has(id)) fail('duplicate node in table');
      seen.add(id);
      this.#ids.push(id);
    }
  }

  id(index: Json): ExprId {
    if (typeof index !== 'number' || !Number.isSafeInteger(index) || index < 0 || index >= this.#ids.length) fail('node reference');
    return this.#ids[index as number];
  }

  #decode(e: readonly Json[]): ExprId {
    const s = this.store, ctx = s.ctx, tag = e[0];
    const arity = (n: number) => { if (e.length !== n) fail(`node ${String(tag)} arity`); };
    let id: ExprId;
    switch (tag) {
      case 'n': arity(2); id = s.number(decodeRational(ctx, e[1])); break;
      case 's': arity(2); id = s.symbol(text(e[1])); break;
      case 'c': arity(2); id = s.constant(oneOf(e[1], CONSTANT_NAMES.filter(c => c !== 'e'))); break;
      case 'r': {
        arity(3);
        const roots = s.roots.roots(ctx, minimalPolynomial(ctx, list(e[1]).map(integerText)));
        const k = e[2];
        if (typeof k !== 'number' || !Number.isSafeInteger(k) || k < 0 || k >= roots.length) fail('algebraic index');
        id = s.algebraic(roots[k as number]);
        break;
      }
      case '+': arity(2); id = s.add(...list(e[1]).map(i => this.id(i))); break;
      case '*': arity(2); id = s.mul(...list(e[1]).map(i => this.id(i))); break;
      case '^': arity(3); id = s.pow(this.id(e[1]), this.id(e[2])); break;
      case 'f': arity(3); id = s.apply(oneOf<FunctionName>(e[1], FUNCTION_NAMES), this.id(e[2])); break;
      default: return fail('unknown node tag');
    }
    if (JSON.stringify(this.#canonical(id)) !== JSON.stringify(e)) fail('noncanonical node');
    this.#back.set(id, this.#ids.length);
    return id;
  }

  /** The built node in the table's own index space. */
  #canonical(id: ExprId): Json {
    const node = this.store.node(id), r = (c: ExprId) => this.#back.get(c) ?? -1;
    switch (node.kind) {
      case 'number': return ['n', encodeRational(this.store.ctx, node.value)];
      case 'symbol': return ['s', node.name];
      case 'constant': return ['c', node.name];
      case 'algebraic': return ['r', node.poly.coefficients.map(c => c.toString()), node.index];
      case 'add': return ['+', node.args.map(r)];
      case 'mul': return ['*', node.args.map(r)];
      case 'pow': return ['^', r(node.base), r(node.exponent)];
      case 'apply': return ['f', node.fn, r(node.arg)];
    }
  }
}

export function encodeExpression(store: ExpressionStore, id: ExprId): Json {
  const enc = new GraphEncoder(store);
  const root = enc.ref(id);
  return { version: REPRESENTATION_WIRE_VERSION, kind: 'expression', nodes: enc.nodes, root };
}

export function decodeExpression(ctx: ExecutionContext, value: Json, store = new ExpressionStore(ctx)): { store: ExpressionStore; id: ExprId } {
  const r = record(value, ['version', 'kind', 'nodes', 'root']);
  if (r.version !== REPRESENTATION_WIRE_VERSION || r.kind !== 'expression') fail('expression wire header');
  const dec = new GraphDecoder(store, r.nodes);
  return { store, id: dec.id(r.root) };
}

// ---- conditions and problems ----

function encodeCondition(enc: GraphEncoder, c: Condition): Json {
  return 'other' in c ? [c.kind, enc.ref(c.expr), enc.ref(c.other)] : [c.kind, enc.ref(c.expr)];
}
function decodeCondition(dec: GraphDecoder, value: Json): Condition {
  const e = list(value), kind = oneOf<ConditionKind>(e[0], CONDITION_KINDS);
  if (kind === 'equal' || kind === 'not-equal') {
    if (e.length !== 3) fail('condition arity');
    return { kind, expr: dec.id(e[1]), other: dec.id(e[2]) };
  }
  if (e.length !== 2) fail('condition arity');
  return { kind, expr: dec.id(e[1]) };
}

function encodeProblemBody(enc: GraphEncoder, p: RelationProblem): Json {
  if (p.store !== enc.store) fail('problem from another store');
  return {
    domain: p.domain, targets: [...p.targets],
    relations: p.relations.map(r => [r.op, enc.ref(r.lhs), enc.ref(r.rhs)]),
    conditions: p.conditions.map(c => encodeCondition(enc, c)),
    generators: p.generators.map(g => [g.symbol, enc.ref(g.definition)]),
    constraints: p.constraints.map(c => encodeCondition(enc, c)),
    hash: p.hash,
  };
}

function decodeProblemBody(dec: GraphDecoder, value: Json): RelationProblem {
  const r = record(value, ['domain', 'targets', 'relations', 'conditions', 'generators', 'constraints', 'hash']);
  const p = relationProblem(dec.store, {
    domain: oneOf(r.domain, ['real', 'complex'] as const),
    targets: list(r.targets).map(text),
    relations: list(r.relations).map(x => {
      const e = list(x);
      if (e.length !== 3) fail('relation arity');
      return { op: oneOf<RelationOperator>(e[0], RELATION_OPERATORS), lhs: dec.id(e[1]), rhs: dec.id(e[2]) };
    }),
    conditions: list(r.conditions).map(c => decodeCondition(dec, c)),
    generators: list(r.generators).map(x => { const e = list(x); if (e.length !== 2) fail('generator arity'); return { symbol: text(e[0]), definition: dec.id(e[1]) }; }),
    constraints: list(r.constraints).map(c => decodeCondition(dec, c)),
  });
  if (p.hash !== r.hash) fail('relation problem hash mismatch');
  return p;
}

export function encodeProblem(p: RelationProblem): Json {
  const enc = new GraphEncoder(p.store);
  const problem = encodeProblemBody(enc, p);
  return { version: REPRESENTATION_WIRE_VERSION, kind: 'relation-problem', nodes: enc.nodes, problem };
}

export function decodeProblem(ctx: ExecutionContext, value: Json, store = new ExpressionStore(ctx)): RelationProblem {
  const r = record(value, ['version', 'kind', 'nodes', 'problem']);
  if (r.version !== REPRESENTATION_WIRE_VERSION || r.kind !== 'relation-problem') fail('problem wire header');
  return decodeProblemBody(new GraphDecoder(store, r.nodes), r.problem);
}

// ---- proof logs ----

function encodeLogBody(enc: GraphEncoder, log: ProofLog): Json {
  return {
    root: log.root,
    states: [...log.states.values()].map(p => encodeProblemBody(enc, p)),
    records: log.records.map(rec => ({
      rule: rec.rule, from: rec.from, kind: rec.kind, progress: rec.progress, obligations: [...rec.obligations],
      measure: { name: rec.measure.name, before: rec.measure.before.map(String), after: rec.measure.after.map(String) },
      to: rec.to.map(t => ({ state: t.state, added: t.added.map(c => encodeCondition(enc, c)), removed: t.removed.map(c => encodeCondition(enc, c)) })),
    })),
  };
}

function decodeLogBody(dec: GraphDecoder, value: Json): ProofLog {
  const r = record(value, ['root', 'states', 'records']);
  const states = new Map<string, RelationProblem>();
  for (const s of list(r.states)) {
    const p = decodeProblemBody(dec, s);
    if (states.has(p.hash)) fail('duplicate state');
    states.set(p.hash, p);
  }
  const root = text(r.root);
  if (!states.has(root)) fail('root state missing');
  const records = list(r.records).map((x): TransformRecord => {
    const rec = record(x, ['rule', 'from', 'kind', 'progress', 'obligations', 'measure', 'to']);
    const m = record(rec.measure, ['name', 'before', 'after']);
    const nonnegative = (v: Json) => { const n = integerText(v); if (n < 0n) fail('negative measure'); return n; };
    return Object.freeze({
      rule: text(rec.rule), from: text(rec.from),
      kind: oneOf<EquivalenceKind>(rec.kind, EQUIVALENCE_KINDS),
      progress: oneOf(rec.progress, ['measure', 'fresh-state'] as const),
      obligations: Object.freeze(list(rec.obligations).map(o => oneOf<Obligation>(o, OBLIGATIONS))),
      measure: Object.freeze({ name: text(m.name), before: Object.freeze(list(m.before).map(nonnegative)), after: Object.freeze(list(m.after).map(nonnegative)) }),
      to: Object.freeze(list(rec.to).map(t => {
        const o = record(t, ['state', 'added', 'removed']);
        return Object.freeze({ state: text(o.state), added: Object.freeze(list(o.added).map(c => decodeCondition(dec, c))), removed: Object.freeze(list(o.removed).map(c => decodeCondition(dec, c))) });
      })),
    });
  });
  return Object.freeze({ root, states, records: Object.freeze(records) });
}

export function encodeProofLog(log: ProofLog): Json {
  const root = log.states.get(log.root) ?? fail('root state missing');
  const enc = new GraphEncoder(root.store);
  const body = encodeLogBody(enc, log);
  return { version: REPRESENTATION_WIRE_VERSION, kind: 'proof-log', nodes: enc.nodes, log: body };
}

/** Decode only; replay with `verifyProofLog` and the rule registry. */
export function decodeProofLog(ctx: ExecutionContext, value: Json, store = new ExpressionStore(ctx)): ProofLog {
  const r = record(value, ['version', 'kind', 'nodes', 'log']);
  if (r.version !== REPRESENTATION_WIRE_VERSION || r.kind !== 'proof-log') fail('proof log wire header');
  return decodeLogBody(new GraphDecoder(store, r.nodes), r.log);
}

// ---- solution sets and outcomes ----

function encodeValue(enc: GraphEncoder, v: PointValue): Json {
  if (v.kind === 'rational') return ['q', encodeRational(enc.store.ctx, v.value)];
  if (v.kind === 'algebraic') {
    const c = enc.store.roots.canonical(enc.store.ctx, v.root);
    const base = ['a', c.poly.coefficients.map(String), c.index];
    return 'form' in v && v.form !== undefined ? [...base, enc.ref(v.form)] : base;
  }
  if (v.kind === 'root') {
    const base = ['r', enc.ref(v.poly), v.variable, v.index];
    return v.lo && v.hi ? [...base, encodeRational(enc.store.ctx, v.lo), encodeRational(enc.store.ctx, v.hi)] : base;
  }
  return ['e', enc.ref(v.id)];
}

function decodeValue(dec: GraphDecoder, value: Json): PointValue {
  const e = list(value), ctx = dec.store.ctx;
  if (e[0] === 'q' && e.length === 2) return Object.freeze({ kind: 'rational', value: decodeRational(ctx, e[1]) });
  if (e[0] === 'e' && e.length === 2) return Object.freeze({ kind: 'expression', id: dec.id(e[1]) });
  if (e[0] === 'r' && (e.length === 4 || e.length === 6)) {
    const variable = text(e[2]), index = e[3];
    if (typeof index !== 'number' || !Number.isSafeInteger(index) || index < 1) fail('root index');
    const base = { kind: 'root' as const, poly: dec.id(e[1]), variable, index: index as number };
    if (e.length === 4) return Object.freeze(base);
    const lo = decodeRational(ctx, e[4]), hi = decodeRational(ctx, e[5]);
    if (lo.numerator * hi.denominator >= hi.numerator * lo.denominator) fail('root bounds');
    return Object.freeze({ ...base, lo, hi });
  }
  if (e[0] === 'a' && (e.length === 3 || e.length === 4)) {
    const roots = dec.store.roots.roots(ctx, minimalPolynomial(ctx, list(e[1]).map(integerText)));
    const k = e[2];
    if (typeof k !== 'number' || !Number.isSafeInteger(k) || k < 0 || k >= roots.length) fail('algebraic index');
    if (roots.length === 1 && roots[0].kind === 'real' && roots[0].poly.coefficients.length === 2) fail('rational value encoded as algebraic');
    if (e.length === 4) return Object.freeze({ kind: 'algebraic', root: roots[k as number], form: dec.id(e[3]) });
    return Object.freeze({ kind: 'algebraic', root: roots[k as number] });
  }
  return fail('value encoding');
}

function encodeEndpoint(enc: GraphEncoder, e: Endpoint): Json {
  return e.kind === 'infinity' ? ['inf', e.sign] : encodeValue(enc, e);
}

function decodeEndpoint(dec: GraphDecoder, value: Json): Endpoint {
  const e = list(value);
  if (e[0] === 'inf') {
    if (e.length !== 2 || (e[1] !== 1 && e[1] !== -1)) fail('infinite endpoint');
    return Object.freeze({ kind: 'infinity', sign: e[1] as 1 | -1 });
  }
  return decodeValue(dec, value);
}

function encodeSet(enc: GraphEncoder, set: SolutionSet): Json {
  const conds = (l: readonly Condition[]) => l.map(c => encodeCondition(enc, c));
  const point = (p: Point) => p.map(v => encodeValue(enc, v));
  switch (set.kind) {
    case 'finite': return { kind: 'finite', variables: [...set.variables], points: set.points.map(point) };
    case 'intervals': return {
      kind: 'intervals', variables: [...set.variables],
      intervals: set.intervals.map(i => [encodeEndpoint(enc, i.lo), encodeEndpoint(enc, i.hi), i.loClosed, i.hiClosed]),
    };
    case 'cofinite': return { kind: 'cofinite', variables: [...set.variables], except: set.except.map(point) };
    case 'union': return { kind: 'union', sets: set.sets.map(s => encodeSet(enc, s)) };
    case 'case-tree': return { kind: 'case-tree', cases: set.cases.map(c => ({ conditions: conds(c.conditions), set: encodeSet(enc, c.set) })) };
    case 'periodic-set': {
      const iv = (i: Interval) => [encodeEndpoint(enc, i.lo), encodeEndpoint(enc, i.hi), i.loClosed, i.hiClosed];
      return { kind: 'periodic-set', variables: [...set.variables], period: encodeValue(enc, set.period), components: set.components.map(iv), range: iv(set.range) };
    }
    case 'periodic': return { kind: 'periodic', variables: [...set.variables], values: set.values.map(v => enc.ref(v)), integerParameters: [...set.integerParameters], constraints: conds(set.constraints) };
    case 'interval-family': return {
      kind: 'interval-family', variables: [...set.variables], parameter: set.parameter, from: set.from === undefined ? null : set.from.toString(), to: set.to === undefined ? null : set.to.toString(),
      lo: enc.ref(set.lo), hi: enc.ref(set.hi), loClosed: set.loClosed, hiClosed: set.hiClosed,
    };
    case 'root-set': return { kind: 'root-set', variables: [...set.variables], poly: enc.ref(set.poly) };
    case 'parametric': return { kind: 'parametric', variables: [...set.variables], values: set.values.map(v => enc.ref(v)), freeParameters: [...set.freeParameters], constraints: conds(set.constraints) };
    case 'reduced-form': return { kind: 'reduced-form', problem: encodeProblemBody(enc, set.problem) };
    case 'unconfirmed': return { kind: 'unconfirmed', variables: [...set.variables], candidates: set.candidates.map(c => ({ point: point(c.point), derivations: [...c.derivations] })) };
  }
}

function decodeSet(dec: GraphDecoder, value: Json): SolutionSet {
  const kind = oneOf((value as Record<string, Json> | null)?.kind, SOLUTION_SET_KINDS);
  const conds = (l: Json) => Object.freeze(list(l).map(c => decodeCondition(dec, c)));
  const point = (p: Json) => Object.freeze(list(p).map(v => decodeValue(dec, v)));
  const names = (l: Json) => Object.freeze(list(l).map(text));
  const flag = (b: Json) => (typeof b === 'boolean' ? b : fail('interval closedness flag'));
  const interval = (x: Json): Interval => {
    const e = list(x);
    if (e.length !== 4) fail('interval arity');
    return Object.freeze({ lo: decodeEndpoint(dec, e[0]), hi: decodeEndpoint(dec, e[1]), loClosed: flag(e[2]), hiClosed: flag(e[3]) });
  };
  switch (kind) {
    case 'finite': { const r = record(value, ['kind', 'variables', 'points']); return Object.freeze({ kind, variables: names(r.variables), points: Object.freeze(list(r.points).map(point)) }); }
    case 'intervals': {
      const r = record(value, ['kind', 'variables', 'intervals']);
      return Object.freeze({ kind, variables: names(r.variables), intervals: Object.freeze(list(r.intervals).map(interval)) });
    }
    case 'periodic-set': {
      const r = record(value, ['kind', 'variables', 'period', 'components', 'range']);
      return Object.freeze({ kind, variables: names(r.variables), period: decodeValue(dec, r.period), components: Object.freeze(list(r.components).map(interval)), range: interval(r.range) });
    }
    case 'cofinite': { const r = record(value, ['kind', 'variables', 'except']); return Object.freeze({ kind, variables: names(r.variables), except: Object.freeze(list(r.except).map(point)) }); }
    case 'union': { const r = record(value, ['kind', 'sets']); return Object.freeze({ kind, sets: Object.freeze(list(r.sets).map(s => decodeSet(dec, s))) }); }
    case 'case-tree': {
      const r = record(value, ['kind', 'cases']);
      return Object.freeze({ kind, cases: Object.freeze(list(r.cases).map(c => { const o = record(c, ['conditions', 'set']); return Object.freeze({ conditions: conds(o.conditions), set: decodeSet(dec, o.set) }); })) });
    }
    case 'interval-family': {
      const r = record(value, ['kind', 'variables', 'parameter', 'from', 'to', 'lo', 'hi', 'loClosed', 'hiClosed']);
      const bound = (b: Json) => (b === null ? undefined : typeof b === 'string' && /^-?[0-9]+$/.test(b) ? BigInt(b) : fail('interval-family bound'));
      const from = bound(r.from), to = bound(r.to), [parameter] = names([r.parameter]);
      return Object.freeze({
        kind, variables: names(r.variables), parameter, ...(from === undefined ? {} : { from }), ...(to === undefined ? {} : { to }),
        lo: dec.id(r.lo), hi: dec.id(r.hi), loClosed: flag(r.loClosed), hiClosed: flag(r.hiClosed),
      });
    }
    case 'periodic': {
      const r = record(value, ['kind', 'variables', 'values', 'integerParameters', 'constraints']);
      return Object.freeze({ kind, variables: names(r.variables), values: Object.freeze(list(r.values).map(v => dec.id(v))), integerParameters: names(r.integerParameters), constraints: conds(r.constraints) });
    }
    case 'parametric': {
      const r = record(value, ['kind', 'variables', 'values', 'freeParameters', 'constraints']);
      return Object.freeze({ kind, variables: names(r.variables), values: Object.freeze(list(r.values).map(v => dec.id(v))), freeParameters: names(r.freeParameters), constraints: conds(r.constraints) });
    }
    case 'root-set': { const r = record(value, ['kind', 'variables', 'poly']); return Object.freeze({ kind, variables: names(r.variables), poly: dec.id(r.poly) }); }
    case 'reduced-form': { const r = record(value, ['kind', 'problem']); return Object.freeze({ kind, problem: decodeProblemBody(dec, r.problem) }); }
    case 'unconfirmed': {
      const r = record(value, ['kind', 'variables', 'candidates']);
      return Object.freeze({ kind, variables: names(r.variables), candidates: Object.freeze(list(r.candidates).map(c => { const o = record(c, ['point', 'derivations']); return Object.freeze({ point: point(o.point), derivations: names(o.derivations) }); })) });
    }
  }
}

export function encodeOutcome(store: ExpressionStore, outcome: EquationOutcome): Json {
  assertOutcome(outcome);
  const enc = new GraphEncoder(store);
  let body: Json;
  switch (outcome.kind) {
    case 'solved': body = { kind: 'solved', set: encodeSet(enc, outcome.set), proof: encodeLogBody(enc, outcome.proof) }; break;
    case 'empty': body = { kind: 'empty', proof: encodeLogBody(enc, outcome.proof) }; break;
    case 'resource': body = { kind: 'resource', stop: outcome.stop }; break;
    default: body = { kind: outcome.kind, reason: outcome.reason };
  }
  return { version: REPRESENTATION_WIRE_VERSION, kind: 'outcome', nodes: enc.nodes, outcome: body };
}

export function decodeOutcome(ctx: ExecutionContext, value: Json, store = new ExpressionStore(ctx)): { store: ExpressionStore; outcome: EquationOutcome } {
  const r = record(value, ['version', 'kind', 'nodes', 'outcome']);
  if (r.version !== REPRESENTATION_WIRE_VERSION || r.kind !== 'outcome') fail('outcome wire header');
  const dec = new GraphDecoder(store, r.nodes);
  const kind = oneOf((r.outcome as Record<string, Json> | null)?.kind, OUTCOME_KINDS);
  let outcome: EquationOutcome;
  switch (kind) {
    case 'solved': { const o = record(r.outcome, ['kind', 'set', 'proof']); outcome = Object.freeze({ kind, set: decodeSet(dec, o.set), proof: decodeLogBody(dec, o.proof) }); break; }
    case 'empty': { const o = record(r.outcome, ['kind', 'proof']); outcome = Object.freeze({ kind, proof: decodeLogBody(dec, o.proof) }); break; }
    case 'resource': { const o = record(r.outcome, ['kind', 'stop']); outcome = Object.freeze({ kind, stop: oneOf<EquationStop>(o.stop, EQUATION_STOPS) }); break; }
    default: { const o = record(r.outcome, ['kind', 'reason']); outcome = Object.freeze({ kind, reason: text(o.reason) }); }
  }
  assertOutcome(outcome);
  return { store, outcome };
}
