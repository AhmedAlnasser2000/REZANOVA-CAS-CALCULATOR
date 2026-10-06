import type { CanonicalResultDocument } from '../../../types/calculator/canonical-result-current';
import type { CanonicalEquationPrimary } from '../../../types/calculator/canonical-result-equation';
import type { SerializableMathJson } from '../../../types/calculator/math-payload-types';
import { equationMathLatex } from '../equation-math-latex';
type EquationDocument = CanonicalResultDocument & { primary: CanonicalEquationPrimary };
const m = (mathJson: SerializableMathJson) => ({ mathJson, canonicalLatex: equationMathLatex(mathJson) });
const half: SerializableMathJson = ['Rational', 1, 2];
type Outcome = EquationDocument['primary']['outcome'];

function doc(outcome: Outcome, extra: Partial<EquationDocument['primary']> = {}): EquationDocument {
  const answer = outcome.kind === 'solved' || outcome.kind === 'empty';
  return {
    version: 7,
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
const sqrt2 = { kind: 'real-algebraic' as const, symbol: 'r_1', polynomial: m(['Add', ['Power', 'r_1', 2], -2]), lo: m(1), hi: m(['Rational', 3, 2]), form: m(['Sqrt', 2]) };
const iRoot = { kind: 'complex-algebraic' as const, symbol: 'r_2', polynomial: m(['Add', ['Power', 'r_2', 2], 1]), re: m(0), im: m(1), radius: m(['Rational', 1, 4]) };
const anyRoot = { kind: 'indexed-real-root' as const, symbol: 'r_3', polynomial: m(['Add', ['Power', 'r_3', 5], ['Multiply', 'a', 'r_3'], 1]), index: 1 };
const interval = (lo: SerializableMathJson | null, hi: SerializableMathJson | null, loClosed = true, hiClosed = true) => ({
  lo: lo === null ? { kind: 'infinity' as const, sign: -1 as const } : { kind: 'value' as const, value: m(lo) },
  hi: hi === null ? { kind: 'infinity' as const, sign: 1 as const } : { kind: 'value' as const, value: m(hi) },
  loClosed: lo === null ? false : loClosed, hiClosed: hi === null ? false : hiClosed,
});

export const equationFixtures: Record<string, EquationDocument> = {
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
