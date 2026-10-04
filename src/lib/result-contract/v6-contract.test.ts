import { describe, expect, it } from 'vitest';
import type { CanonicalResultDocumentV6, CanonicalRuntimeOutcome, SerializableMathJson } from '../../types/calculator';
import { resolveCanonicalResultForConsumer } from './consumer';
import { equationMathLatex } from './equation-math-latex';
import { collectCanonicalMathLeaves } from './mathjson-coverage';
import { requireCanonicalResultAuthority } from './native-result';
import { normalizeCanonicalResultDocument } from './normalized-result';
import { validateCanonicalResultDocumentVersioned } from './validation-router';
import { validateCanonicalResultDocumentV6 } from './validation-v6';

const m = (mathJson: SerializableMathJson) => ({ mathJson, canonicalLatex: equationMathLatex(mathJson) });
const half: SerializableMathJson = ['Rational', 1, 2];
type Outcome = CanonicalResultDocumentV6['primary']['outcome'];

function doc(outcome: Outcome, extra: Partial<CanonicalResultDocumentV6['primary']> = {}): CanonicalResultDocumentV6 {
  const answer = outcome.kind === 'solved' || outcome.kind === 'empty';
  return {
    version: 6,
    outcomeKind: answer ? 'success' : 'error',
    title: 'Equation',
    ...(answer ? {} : { error: 'No answer.' }),
    warnings: [],
    primary: {
      kind: 'equation-outcome', domain: 'real', targets: ['x'], parameters: [], roots: [],
      outcome, provenance: answer ? { verification: 'independent', rules: ['move-to-zero'] } : { verification: 'not-applicable', rules: [] },
      ...extra,
    },
  };
}
const valid = (d: unknown) => {
  const r = validateCanonicalResultDocumentV6(d);
  if (!r.ok) throw new Error(`${r.failure.message} at ${r.failure.path}`);
  return r.validated;
};
const rejected = (d: unknown, message: RegExp) => {
  const r = validateCanonicalResultDocumentV6(d);
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.failure.message).toMatch(message);
};
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const sqrt2 = { kind: 'real-algebraic' as const, symbol: 'r_1', polynomial: m(['Add', ['Power', 'r_1', 2], -2]), lo: m(1), hi: m(['Rational', 3, 2]), form: m(['Sqrt', 2]) };
const iRoot = { kind: 'complex-algebraic' as const, symbol: 'r_2', polynomial: m(['Add', ['Power', 'r_2', 2], 1]), re: m(0), im: m(1), radius: m(['Rational', 1, 4]) };
const anyRoot = { kind: 'indexed-real-root' as const, symbol: 'r_3', polynomial: m(['Add', ['Power', 'r_3', 5], ['Multiply', 'a', 'r_3'], 1]), index: 1 };
const interval = (lo: SerializableMathJson | null, hi: SerializableMathJson | null, loClosed = true, hiClosed = true) => ({
  lo: lo === null ? { kind: 'infinity' as const, sign: -1 as const } : { kind: 'value' as const, value: m(lo) },
  hi: hi === null ? { kind: 'infinity' as const, sign: 1 as const } : { kind: 'value' as const, value: m(hi) },
  loClosed: lo === null ? false : loClosed, hiClosed: hi === null ? false : hiClosed,
});

const SOLVED: Record<string, CanonicalResultDocumentV6> = {
  finite: doc({ kind: 'solved', set: { kind: 'finite', variables: ['x'], points: [[m(2)], [m('r_1')], [m(['Ln', 2])]] } }, { roots: [sqrt2] }),
  intervals: doc({ kind: 'solved', set: { kind: 'intervals', variables: ['x'], intervals: [interval(null, 1, true, false), interval(2, 3)] } }),
  cofinite: doc({ kind: 'solved', set: { kind: 'cofinite', variables: ['x'], except: [[m(0)]] } }),
  union: doc({ kind: 'solved', set: { kind: 'union', sets: [
    { kind: 'finite', variables: ['x'], points: [[m(5)]] },
    { kind: 'intervals', variables: ['x'], intervals: [interval(0, 1)] },
  ] } }),
  'case-tree': doc({ kind: 'solved', set: { kind: 'case-tree', cases: [
    { conditions: [{ kind: 'nonzero', expr: m('a') }], set: { kind: 'finite', variables: ['x'], points: [[m(['Divide', -1, 'a'])]] } },
    { conditions: [{ kind: 'equal', expr: m('a'), other: m(0) }], set: { kind: 'finite', variables: ['x'], points: [] } },
  ] } }, { parameters: ['a'] }),
  'periodic-set': doc({ kind: 'solved', set: { kind: 'periodic-set', variables: ['x'], period: m(['Multiply', 2, 'Pi']), components: [interval(['Divide', 'Pi', 6], ['Divide', 'Pi', 6])], range: interval(null, null) } }),
  'interval-family': doc({ kind: 'solved', set: { kind: 'interval-family', variables: ['x'], parameter: 'k', from: '0', lo: m(['Multiply', 'k', 'Pi']), hi: m(['Add', ['Multiply', 'k', 'Pi'], half]), loClosed: true, hiClosed: false } }),
  'root-set': doc({ kind: 'solved', set: { kind: 'root-set', variables: ['x'], polynomial: m(['Add', ['Power', 'x', 5], ['Multiply', 'a', 'x'], 1]) } }, { domain: 'complex', parameters: ['a'] }),
  periodic: doc({ kind: 'solved', set: { kind: 'periodic', variables: ['x'], values: [m(['Add', ['Ln', 2], ['Multiply', 2, 'Pi', 'ImaginaryUnit', 'k']])], integerParameters: ['k'], constraints: [] } }, { domain: 'complex' }),
  parametric: doc({ kind: 'solved', set: { kind: 'parametric', variables: ['x', 'y'], values: [m(['Add', 1, ['Negate', 'y']]), m('y')], freeParameters: ['y'], constraints: [{ kind: 'not-equal', expr: m('y'), other: m(3) }] } }, { targets: ['x', 'y'] }),
  'reduced-form': doc({ kind: 'solved', set: { kind: 'reduced-form', targets: ['x'], relations: [{ op: 'eq', lhs: m(['Cos', 'x']), rhs: m('x') }], conditions: [] } }),
  unconfirmed: doc({ kind: 'solved', set: { kind: 'unconfirmed', variables: ['x'], candidates: [{ point: [m('r_3')], derivations: ['quintic root'] }] } }, { parameters: ['a'], roots: [anyRoot] }),
  'complex roots': doc({ kind: 'solved', set: { kind: 'finite', variables: ['x'], points: [[m('r_2')], [m(['Negate', 'r_2'])]] } }, { domain: 'complex', roots: [iRoot] }),
};

describe('canonical-result V6 (Equation outcomes)', () => {
  it.each(Object.entries(SOLVED))('accepts a %s set', (_, d) => {
    const v = valid(d);
    expect(v.mathValueCount).toBeGreaterThan(0);
    expect(validateCanonicalResultDocumentVersioned(d).ok).toBe(true);
  });

  it('accepts all six outcomes, with outcomeKind following the outcome', () => {
    for (const o of [
      { kind: 'empty' }, { kind: 'undecided', reason: 'sign not decided' },
      { kind: 'incomplete', owner: 'EQUATION-CERTIFIED-NUMERICS1', reason: 'cos x = x' }, { kind: 'incomplete', owner: 'unassigned', reason: 'nested families' },
      { kind: 'unsupported', reason: 'complex modulus' },
      ...(['work', 'allocation', 'cancelled', 'result-size'] as const).map(stop => ({ kind: 'stopped', stop })),
    ] as Outcome[]) valid(doc(o));
    rejected({ ...doc({ kind: 'empty' }), outcomeKind: 'error', error: 'x' }, /outcomeKind/);
    const { error: _error, ...noError } = doc({ kind: 'undecided', reason: 'r' }); void _error;
    rejected({ ...noError, outcomeKind: 'success' }, /outcomeKind/);
    rejected(doc({ kind: 'stopped', stop: 'timeout' } as unknown as Outcome), /stopped/);
    rejected(doc({ kind: 'incomplete', owner: 'someone', reason: 'r' }), /incomplete/);
    rejected({ ...doc({ kind: 'unsupported', reason: 'r' }), primary: { ...doc({ kind: 'unsupported', reason: 'r' }).primary, provenance: { verification: 'independent', rules: [] } } }, /provenance/);
  });

  it('rejects custom heads, stale LaTeX, unknown keys and out-of-scope symbols', () => {
    const base = SOLVED.finite;
    const custom = clone(base); custom.primary.outcome = { kind: 'solved', set: { kind: 'finite', variables: ['x'], points: [[{ mathJson: ['RootOf', ['List', -2, 0, 1], 1], canonicalLatex: 'r' }]] } };
    rejected(custom, /grammar/);
    const stale = clone(base); (stale.primary.outcome as { set: { points: { canonicalLatex: string }[][] } }).set.points[0][0].canonicalLatex = '2.0';
    rejected(stale, /Canonical LaTeX/);
    rejected({ ...base, primary: { ...base.primary, extra: 1 } }, /primary/);
    // A target inside a finite value, and an undeclared root symbol.
    rejected(doc({ kind: 'solved', set: { kind: 'finite', variables: ['x'], points: [[m(['Add', 'x', 1])]] } }), /scope/);
    rejected(doc({ kind: 'solved', set: { kind: 'finite', variables: ['x'], points: [[m('r_9')]] } }), /scope/);
  });

  it('enforces binding: fresh binders and parameters, case conditions on parameters, free targets', () => {
    rejected(doc({ kind: 'empty' }, { roots: [{ ...sqrt2, symbol: 'x' }] }), /fresh/);
    rejected(doc({ kind: 'empty' }, { roots: [sqrt2, { ...iRoot, symbol: 'r_1' }] }), /fresh/);
    rejected(doc({ kind: 'empty' }, { roots: [{ ...sqrt2, polynomial: m(['Add', ['Power', 'r_1', 2], ['Rational', -1, 2]]) }] }), /integer coefficients/);
    rejected(doc({ kind: 'empty' }, { roots: [{ ...sqrt2, lo: m(['Sqrt', 2]) }] }), /rational constants/);
    const periodic = clone(SOLVED.periodic); (periodic.primary.outcome as { set: { integerParameters: string[] } }).set.integerParameters = ['x'];
    rejected(periodic, /fresh/);
    const cases = clone(SOLVED['case-tree']); (cases.primary.outcome as { set: { cases: { conditions: unknown[] }[] } }).set.cases[0].conditions = [{ kind: 'nonzero', expr: m('x') }];
    rejected(cases, /scope/);
    const parametric = clone(SOLVED.parametric); (parametric.primary.outcome as { set: { freeParameters: string[] } }).set.freeParameters = ['t'];
    rejected(parametric, /free targets/);
    rejected(doc({ kind: 'solved', set: { kind: 'finite', variables: ['y'], points: [[m(1)]] } }), /targets/);
    rejected({ ...SOLVED.intervals, primary: { ...SOLVED.intervals.primary, domain: 'complex' } }, /real only/);
    rejected(doc({ kind: 'solved', set: { kind: 'intervals', variables: ['x'], intervals: [{ ...interval(null, 1), loClosed: true }] } }), /Infinite ends/);
  });

  it('reports oversize documents as bounds failures, never as accepted', () => {
    const big = doc({ kind: 'solved', set: { kind: 'finite', variables: ['x'], points: Array.from({ length: 50 }, (_, i) => [m(i)]) } });
    const r = validateCanonicalResultDocumentV6(big, { maxNodes: 100 });
    expect(r.ok).toBe(false);
  });

  it('routes through authority, refuses generic reuse and flattening, and exposes math leaves', () => {
    const d = SOLVED['case-tree'];
    expect(requireCanonicalResultAuthority({ kind: 'success', canonicalResult: d }, 'v6-test').canonicalResult).toEqual(d);
    expect(() => requireCanonicalResultAuthority({ kind: 'error', canonicalResult: d }, 'v6-test')).toThrow(/kind does not match/);
    const consumer = resolveCanonicalResultForConsumer({ kind: 'success', canonicalResult: d } as unknown as CanonicalRuntimeOutcome);
    expect(consumer.ok === false && consumer.failure.reason).toBe('unsupported-semantics');
    expect(() => normalizeCanonicalResultDocument(d)).toThrow(/V6/);
    const leaves = collectCanonicalMathLeaves(d);
    expect(leaves.filter(l => l.leafPath === 'primary.equationOutcome[*]').length).toBe(4);
  });

  it('projects canonical LaTeX deterministically', () => {
    expect(equationMathLatex(['Add', ['Multiply', 2, 'Pi', 'k'], ['Arcsin', half]])).toBe('\\left(2\\right)\\left(\\pi\\right)\\left(k\\right)+\\arcsin\\left(\\frac{1}{2}\\right)');
    expect(equationMathLatex(['LambertW', 1, -1])).toBe('W_{-1}\\left(1\\right)');
    expect(equationMathLatex(['Root', 'x', 3])).toBe('\\sqrt[3]{x}');
  });
});
