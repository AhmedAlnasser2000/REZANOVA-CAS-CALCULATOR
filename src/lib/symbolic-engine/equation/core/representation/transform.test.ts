import { describe, expect, it } from 'vitest';
import { EquationAlgebraError } from '../execution';
import { context } from '../test-support';
import { ExpressionStore } from './expression';
import { relationProblem, withChanges, type RelationProblem } from './relation';
import { iterativeDeepening } from './search';
import {
  DROP_IDENTICAL_SIDES, GATE_RULES, MOVE_TO_ZERO, ProofLogBuilder, verifyProofLog, type ProofLog, type TransformRecord, type TransformRule,
} from './transform';
import { decodeProofLog, encodeProofLog } from './wire';

function setup() {
  const s = new ExpressionStore(context()), x = s.symbol('x'), y = s.symbol('y');
  return { s, x, y };
}

function chain(): { log: ProofLog; start: RelationProblem } {
  const { s, x } = setup();
  const l = s.log(x);
  const start = relationProblem(s, {
    domain: 'real', targets: ['x'],
    relations: [{ op: 'eq', lhs: s.pow(x, s.integer(2)), rhs: s.integer(4) }, { op: 'eq', lhs: l, rhs: l }],
  });
  const b = new ProofLogBuilder(start);
  const first = DROP_IDENTICAL_SIDES.apply(start)!;
  b.append(first);
  const second = MOVE_TO_ZERO.apply(first.outputs[0])!;
  b.append(second);
  return { log: b.build(), start };
}

const reject = (f: () => unknown, reason: RegExp) => {
  let caught: unknown;
  try { f(); } catch (e) { caught = e; }
  expect(caught).toBeInstanceOf(EquationAlgebraError);
  expect((caught as EquationAlgebraError).code).toBe('verification-failed');
  expect((caught as EquationAlgebraError).reason).toMatch(reason);
};

/** Rebuild a log with one record replaced. */
function tampered(log: ProofLog, index: number, change: (r: TransformRecord) => TransformRecord): ProofLog {
  return { ...log, records: log.records.map((r, i) => (i === index ? change(r) : r)) };
}

describe('relation problems', () => {
  it('are canonical: orientation, order and duplicates do not change the hash', () => {
    const { s, x, y } = setup();
    const a = relationProblem(s, { domain: 'real', targets: ['x'], relations: [{ op: 'gt', lhs: x, rhs: y }, { op: 'eq', lhs: x, rhs: s.integer(1) }] });
    const b = relationProblem(s, { domain: 'real', targets: ['x', 'x'], relations: [{ op: 'eq', lhs: s.integer(1), rhs: x }, { op: 'lt', lhs: y, rhs: x }, { op: 'lt', lhs: y, rhs: x }] });
    expect(a.hash).toBe(b.hash);
    expect(a.parameters).toEqual(['y']);
    expect(a.relations.find(r => r.op === 'lt')).toMatchObject({ lhs: y, rhs: x });
    expect(withChanges(a, { domain: 'real' }).hash).toBe(a.hash);
    expect(relationProblem(s, { domain: 'real', targets: ['y'], relations: a.relations }).hash).not.toBe(a.hash);
  });

  it('hash independently of the store and its ids', () => {
    const one = setup(), two = setup();
    two.s.symbol('padding'); two.s.integer(77);
    const make = (s: ExpressionStore) => relationProblem(s, { domain: 'complex', targets: ['x'], relations: [{ op: 'eq', lhs: s.add(s.symbol('x'), s.integer(3)), rhs: s.integer(0) }], conditions: [{ kind: 'nonzero', expr: s.symbol('x') }] });
    expect(make(one.s).hash).toBe(make(two.s).hash);
  });

  it('rejects order relations over the complex numbers', () => {
    const { s, x } = setup();
    expect(() => relationProblem(s, { domain: 'complex', targets: ['x'], relations: [{ op: 'lt', lhs: x, rhs: s.integer(0) }] })).toThrow(/real domain/);
  });
});

describe('transforms and replay verification', () => {
  it('records and verifies a chain, and replays identically through the wire', () => {
    const { log } = chain();
    const report = verifyProofLog(log, GATE_RULES);
    expect(report.records).toBe(2);
    expect(log.records.map(r => r.kind)).toEqual(['EQUIVALENT_UNDER_CONDITIONS', 'EQUIVALENT']);
    const final = log.states.get(report.leaves[0])!;
    expect(final.relations).toHaveLength(1);
    expect(final.conditions).toEqual([{ kind: 'in-domain', expr: final.store.log(final.store.symbol('x')) }]);
    const wire = JSON.parse(JSON.stringify(encodeProofLog(log)));
    const replayed = decodeProofLog(context(), wire);
    expect(replayed.root).toBe(log.root);
    expect([...replayed.states.keys()].sort()).toEqual([...log.states.keys()].sort());
    expect(verifyProofLog(replayed, GATE_RULES).leaves).toEqual(report.leaves);
    expect(JSON.stringify(encodeProofLog(replayed))).toBe(JSON.stringify(wire));
  });

  it('rejects tampered hashes, measures, kinds, conditions and unknown rules', () => {
    const { log } = chain();
    reject(() => verifyProofLog(tampered(log, 1, r => ({ ...r, from: log.root })), GATE_RULES), /rejected its step|condition/);
    reject(() => verifyProofLog(tampered(log, 1, r => ({ ...r, measure: { ...r.measure, after: [5n] } })), GATE_RULES), /did not decrease/);
    reject(() => verifyProofLog(tampered(log, 1, r => ({ ...r, measure: { ...r.measure, before: [2n] } })), GATE_RULES), /rejected its step/);
    reject(() => verifyProofLog(tampered(log, 0, r => ({ ...r, kind: 'EQUIVALENT' })), GATE_RULES), /EQUIVALENT step changed conditions/);
    reject(() => verifyProofLog(tampered(log, 0, r => ({ ...r, to: [{ ...r.to[0], added: [] }] })), GATE_RULES), /condition bookkeeping/);
    reject(() => verifyProofLog(tampered(log, 0, r => ({ ...r, to: [{ ...r.to[0], state: '0'.repeat(64) }] })), GATE_RULES), /unknown state/);
    reject(() => verifyProofLog(tampered(log, 0, r => ({ ...r, rule: 'invented' })), GATE_RULES), /no checker for rule invented/);
    reject(() => verifyProofLog({ ...log, records: [...log.records].reverse() }, GATE_RULES), /discontinuity/);
    const forged = new Map(log.states);
    const [hash, state] = [...forged][1];
    forged.set(hash, { ...state, domain: 'complex' });
    reject(() => verifyProofLog({ ...log, states: forged }, GATE_RULES), /hash does not match/);
  });

  it('rejects tampering in the wire form', () => {
    const { log } = chain();
    const wire = JSON.parse(JSON.stringify(encodeProofLog(log)));
    const badHash = structuredClone(wire);
    badHash.log.states[0].hash = 'f'.repeat(64);
    expect(() => decodeProofLog(context(), badHash)).toThrow(/hash mismatch/);
    const badMeasure = structuredClone(wire);
    badMeasure.log.records[1].measure.after = ['1'];
    reject(() => verifyProofLog(decodeProofLog(context(), badMeasure), GATE_RULES), /did not decrease/);
    const badNode = structuredClone(wire);
    const addIndex = badNode.nodes.findIndex((n: unknown[]) => n[0] === '+');
    badNode.nodes[addIndex][1].reverse();
    expect(() => decodeProofLog(context(), badNode)).toThrow(/noncanonical node/);
  });

  it('requires a substitution obligation on FORWARD_ONLY steps', () => {
    const { s, x } = setup();
    const start = relationProblem(s, { domain: 'real', targets: ['x'], relations: [{ op: 'eq', lhs: s.sqrt(x), rhs: s.integer(-1) }] });
    const squared = relationProblem(s, { domain: 'real', targets: ['x'], relations: [{ op: 'eq', lhs: x, rhs: s.integer(1) }] });
    const square: TransformRule = { id: 'square-both-sides', apply: () => null, check: () => true };
    const rules = new Map([...GATE_RULES, [square.id, square]]);
    const record = (obligations: TransformRecord['obligations']): TransformRecord => ({
      rule: 'square-both-sides', from: start.hash, to: [{ state: squared.hash, added: [], removed: [] }], kind: 'FORWARD_ONLY',
      progress: 'fresh-state', measure: { name: 'none', before: [], after: [] }, obligations,
    });
    const logWith = (obligations: TransformRecord['obligations']) => {
      const b = new ProofLogBuilder(start);
      b.append({ record: record(obligations), outputs: [squared] });
      return b.build();
    };
    reject(() => verifyProofLog(logWith([]), rules), /substitution obligation/);
    expect(verifyProofLog(logWith(['substitution-check']), rules).substitutionChecks).toEqual([squared.hash]);
  });

  it('applies the gate rules only where they change something', () => {
    const { s, x } = setup();
    const zeroForm = relationProblem(s, { domain: 'real', targets: ['x'], relations: [{ op: 'eq', lhs: s.integer(0), rhs: s.sub(x, s.integer(1)) }] });
    expect(MOVE_TO_ZERO.apply(zeroForm)).toBeNull();
    expect(DROP_IDENTICAL_SIDES.apply(zeroForm)).toBeNull();
    const total = relationProblem(s, { domain: 'real', targets: ['x'], relations: [{ op: 'le', lhs: x, rhs: x }] });
    expect(DROP_IDENTICAL_SIDES.apply(total)!.record.kind).toBe('EQUIVALENT');
    const ineq = relationProblem(s, { domain: 'real', targets: ['x'], relations: [{ op: 'gt', lhs: x, rhs: s.integer(2) }] });
    const moved = MOVE_TO_ZERO.apply(ineq)!.outputs[0];
    expect(moved.relations[0]).toMatchObject({ op: 'lt', lhs: s.sub(s.integer(2), x), rhs: s.integer(0) });
  });
});

describe('search', () => {
  it('terminates on a cyclic rule pair through the visited set', () => {
    const ctx = context();
    const result = iterativeDeepening(ctx, 'A', { hash: v => v, successors: v => (v === 'A' ? ['B'] : ['A']), goal: () => false });
    expect(result).toEqual({ kind: 'exhausted', states: 2 });
  });

  it('finds a depth-3 target in an infinite space by iterative deepening', () => {
    const ctx = context();
    const result = iterativeDeepening<number>(ctx, 1, { hash: String, successors: n => [n + 1, n * 2], goal: n => n === 5 });
    expect(result).toMatchObject({ kind: 'found', depth: 3 });
    expect(result.kind === 'found' && result.path).toEqual([1, 2, 4, 5]);
  });

  it('stops with a typed resource stop on an unbounded fruitless search', () => {
    const ctx = context({ work: 50_000 });
    expect(() => iterativeDeepening<number>(ctx, 1, { hash: String, successors: n => [n + 1, n * 2], goal: () => false })).toThrowError(expect.objectContaining({ code: 'resource', stop: 'work' }));
    let polls = 0;
    const cancelled = context({}, () => ++polls > 100);
    expect(() => iterativeDeepening<number>(cancelled, 1, { hash: String, successors: n => [n + 1], goal: () => false })).toThrowError(expect.objectContaining({ stop: 'cancelled' }));
  });

  it('drives the gate rules on relation problems', () => {
    const { s, x } = setup();
    const l = s.log(x);
    const start = relationProblem(s, { domain: 'real', targets: ['x'], relations: [{ op: 'eq', lhs: x, rhs: s.integer(3) }, { op: 'eq', lhs: l, rhs: l }] });
    const steps = new Map<string, ReturnType<TransformRule['apply']>>();
    const result = iterativeDeepening(s.ctx, start, {
      hash: p => p.hash,
      successors: p => [MOVE_TO_ZERO, DROP_IDENTICAL_SIDES].flatMap(r => { const st = r.apply(p); if (st) steps.set(st.outputs[0].hash, st); return st ? st.outputs : []; }),
      goal: p => p.relations.length === 1 && MOVE_TO_ZERO.apply(p) === null,
    });
    expect(result.kind).toBe('found');
    const path = result.kind === 'found' ? result.path : [];
    const b = new ProofLogBuilder(start);
    for (const p of path.slice(1)) b.append(steps.get(p.hash)!);
    expect(verifyProofLog(b.build(), GATE_RULES).records).toBe(2);
  });
});
