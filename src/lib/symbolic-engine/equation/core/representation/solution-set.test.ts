import { describe, expect, expectTypeOf, it } from 'vitest';
import { EquationAlgebraError } from '../execution';
import { rational } from '../algebra/rational';
import { ALGEBRAIC_RING, refineReal, rootsOfIrreducible, type RealRootOf } from '../algebraic/root-of';
import { context } from '../test-support';
import { ExpressionStore } from './expression';
import { relationProblem } from './relation';
import {
  OUTCOME_KINDS, assertOutcome, finiteContains, finiteSet, normalizeSet, resourceOutcome, setKey, unionSet,
  type EquationOutcome, type PointValue, type SolutionSet,
} from './solution-set';
import { ProofLogBuilder } from './transform';
import { decodeOutcome, encodeOutcome } from './wire';

function sqrt2(s: ExpressionStore) {
  const ctx = s.ctx;
  const roots = rootsOfIrreducible(ctx, ALGEBRAIC_RING.fromIntegers(ctx, [-2, 0, 1])) as RealRootOf[];
  const wide = roots[1];
  const narrow = refineReal(ctx, wide, rational(ctx, 1n, 10n ** 6n));
  return { wide, narrow, minus: roots[0] };
}
const q = (s: ExpressionStore, n: number, d = 1): PointValue => ({ kind: 'rational', value: rational(s.ctx, n, d) });

describe('finite sets', () => {
  it('deduplicates √2 given by two different isolating intervals, and orders canonically', () => {
    const s = new ExpressionStore(context());
    const { wide, narrow, minus } = sqrt2(s);
    expect(wide.lo).not.toEqual(narrow.lo);
    const set = normalizeSet(s, finiteSet(['x'], [[{ kind: 'algebraic', root: narrow }], [q(s, 3)], [{ kind: 'algebraic', root: wide }], [{ kind: 'algebraic', root: minus }], [q(s, 1)]]), 'real');
    expect(set.kind === 'finite' && set.points).toHaveLength(4);
    const keys = set.kind === 'finite' ? set.points.map(p => (p[0].kind === 'rational' ? p[0].value.numerator.toString() : p[0].kind === 'algebraic' && p[0].root.kind === 'real' ? `±√2:${p[0].root.lo.numerator < 0n ? '-' : '+'}` : '?')) : [];
    expect(keys).toEqual(['±√2:-', '1', '±√2:+', '3']);
    expect(finiteContains(s, set, [{ kind: 'algebraic', root: refineReal(s.ctx, wide, rational(s.ctx, 1n, 10n ** 9n)) }], 'real')).toBe(true);
    expect(finiteContains(s, set, [q(s, 2)], 'real')).toBe(false);
  });

  it('turns exactly evaluable expressions into numbers and keeps closed forms', () => {
    const s = new ExpressionStore(context());
    const set = normalizeSet(s, finiteSet(['x'], [[{ kind: 'expression', id: s.pow(s.sqrt(s.integer(2)), s.integer(2)) }], [q(s, 2)], [{ kind: 'expression', id: s.log(s.integer(2)) }]]), 'real');
    expect(set.kind === 'finite' && set.points.map(p => p[0].kind)).toEqual(['rational', 'expression']);
    expect(finiteContains(s, set, [{ kind: 'expression', id: s.log(s.integer(2)) }], 'real')).toBe(true);
    expect(finiteContains(s, set, [{ kind: 'expression', id: s.log(s.integer(3)) }], 'real')).toBe('unknown');
    expect(() => normalizeSet(s, finiteSet(['x'], [[{ kind: 'expression', id: s.log(s.integer(-1)) }]]), 'real')).toThrow(/undefined/);
  });

  it('normalizes unions canonically regardless of construction order', () => {
    const s = new ExpressionStore(context()), k = s.symbol('k');
    const periodic: SolutionSet = { kind: 'periodic', variables: ['x'], values: [s.mul(s.constant('pi'), k)], integerParameters: ['k'], constraints: [] };
    const a = normalizeSet(s, unionSet([finiteSet(['x'], [[q(s, 1)]]), unionSet([periodic, finiteSet(['x'], [[q(s, 2)], [q(s, 1)]])])]), 'real');
    const b = normalizeSet(s, unionSet([periodic, finiteSet(['x'], [[q(s, 2)]]), finiteSet(['x'], [[q(s, 1)]]), finiteSet(['x'], [])]), 'real');
    expect(setKey(s, a)).toBe(setKey(s, b));
    expect(a.kind === 'union' && a.sets.map(x => x.kind).sort()).toEqual(['finite', 'periodic']);
    expect(normalizeSet(s, unionSet([finiteSet(['x'], []), finiteSet(['x'], [])]), 'real')).toEqual(finiteSet(['x'], []));
    expect(() => normalizeSet(s, unionSet([finiteSet(['x'], []), finiteSet(['y'], [])]), 'real')).toThrow(/different variables/);
  });

  it('merges unconfirmed candidates and keeps every derivation', () => {
    const s = new ExpressionStore(context());
    const set = normalizeSet(s, { kind: 'unconfirmed', variables: ['x'], candidates: [{ point: [q(s, 1)], derivations: ['b'] }, { point: [{ kind: 'expression', id: s.integer(1) }], derivations: ['a'] }] }, 'real');
    expect(set).toMatchObject({ kind: 'unconfirmed', candidates: [{ derivations: ['a', 'b'] }] });
  });

  it('rejects non-real values in a real set and malformed points', () => {
    const s = new ExpressionStore(context());
    const i = rootsOfIrreducible(s.ctx, ALGEBRAIC_RING.fromIntegers(s.ctx, [1, 0, 1]))[0];
    expect(() => normalizeSet(s, finiteSet(['x'], [[{ kind: 'algebraic', root: i }]]), 'real')).toThrow(/non-real/);
    expect(normalizeSet(s, finiteSet(['x'], [[{ kind: 'algebraic', root: i }]]), 'complex').kind).toBe('finite');
    expect(() => finiteSet(['x', 'x'], [])).toThrow(/variables/);
    expect(() => finiteSet(['x'], [[q(s, 1), q(s, 2)]])).toThrow(/arity/);
  });
});

describe('outcomes', () => {
  it('has exactly six kinds and no partial kind', () => {
    expect([...OUTCOME_KINDS]).toEqual(['solved', 'empty', 'undecided', 'incomplete-implementation', 'unsupported', 'resource']);
    expectTypeOf<EquationOutcome['kind']>().toEqualTypeOf<(typeof OUTCOME_KINDS)[number]>();
    // @ts-expect-error a partial-result outcome does not exist
    const partial: EquationOutcome = { kind: 'partial', roots: [] };
    expect(() => assertOutcome(partial)).toThrow(/unknown outcome kind/);
    expect(() => assertOutcome({ kind: 'solved', set: finiteSet(['x'], []), proof: {}, partialRoots: [] })).toThrow(/malformed/);
    expect(() => assertOutcome({ kind: 'undecided', reason: '' })).toThrow(/reason/);
    expect(() => assertOutcome({ kind: 'resource', stop: 'depth' })).toThrow(/resource stop/);
  });

  it('maps typed resource stops and rethrows everything else', () => {
    expect(resourceOutcome(new EquationAlgebraError('resource', 'stopped: work', 'work'))).toEqual({ kind: 'resource', stop: 'work' });
    expect(() => resourceOutcome(new EquationAlgebraError('invalid-input', 'bad'))).toThrow(/bad/);
  });

  it('round-trips every outcome kind through the wire', () => {
    const s = new ExpressionStore(context()), x = s.symbol('x'), k = s.symbol('k');
    const problem = relationProblem(s, { domain: 'real', targets: ['x'], relations: [{ op: 'eq', lhs: s.pow(x, s.integer(2)), rhs: s.integer(2) }] });
    const proof = new ProofLogBuilder(problem).build();
    const { wide, minus } = sqrt2(s);
    const set: SolutionSet = normalizeSet(s, unionSet([
      finiteSet(['x'], [[{ kind: 'algebraic', root: wide }], [{ kind: 'algebraic', root: minus }], [{ kind: 'expression', id: s.log(s.integer(3)) }]]),
      { kind: 'case-tree', cases: [{ conditions: [{ kind: 'positive', expr: x }], set: { kind: 'reduced-form', problem } }] },
      { kind: 'periodic', variables: ['x'], values: [s.mul(s.constant('pi'), k)], integerParameters: ['k'], constraints: [{ kind: 'nonnegative', expr: k }] },
      { kind: 'parametric', variables: ['x'], values: [s.symbol('t')], freeParameters: ['t'], constraints: [] },
      { kind: 'unconfirmed', variables: ['x'], candidates: [{ point: [q(s, 7)], derivations: ['record-1'] }] },
    ]), 'real');
    const outcomes: EquationOutcome[] = [
      { kind: 'solved', set, proof }, { kind: 'empty', proof }, { kind: 'undecided', reason: 'search exhausted' },
      { kind: 'incomplete-implementation', reason: 'slice pending' }, { kind: 'unsupported', reason: 'head Zeta' }, { kind: 'resource', stop: 'allocation' },
    ];
    for (const o of outcomes) {
      const wire = JSON.parse(JSON.stringify(encodeOutcome(s, o)));
      const back = decodeOutcome(context(), wire);
      expect(back.outcome.kind).toBe(o.kind);
      expect(JSON.stringify(encodeOutcome(back.store, back.outcome))).toBe(JSON.stringify(wire));
      if (o.kind === 'solved' && back.outcome.kind === 'solved') expect(setKey(back.store, back.outcome.set)).toBe(setKey(s, set));
    }
    const wire = JSON.parse(JSON.stringify(encodeOutcome(s, outcomes[5])));
    wire.outcome.stop = 'depth';
    expect(() => decodeOutcome(context(), wire)).toThrow(/unexpected value/);
  });
});
