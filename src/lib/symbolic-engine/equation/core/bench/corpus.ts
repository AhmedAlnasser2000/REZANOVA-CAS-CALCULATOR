// Benchmark corpus of the private Equation core (test fixture data; no production caller).
// The 50 baseline cases of equation-reconstruction-inventory.md, then the depth, parameters and systems evidence.

export interface CorpusCase {
  readonly id: string;
  readonly json: unknown;
  readonly targets?: readonly string[];
  readonly domain?: 'real' | 'complex';
  /** Outcome kind expected from decide (verified answers are 'solved' or 'empty'). */
  readonly expect: 'solved' | 'empty' | 'incomplete-implementation';
  /** Part of the old-engine baseline (target: decide + verify under 1 s). */
  readonly baseline?: boolean;
}

const eq = (a: unknown, b: unknown = 0) => ['Equal', a, b];
const add = (...a: unknown[]) => ['Add', ...a], mul = (...a: unknown[]) => ['Multiply', ...a], pow = (a: unknown, k: unknown) => ['Power', a, k];
const poly = (cs: [number, number][]) => add(...cs.map(([c, k]) => (k === 0 ? c : mul(c, pow('x', k)))));
const exp = (a: unknown) => ['Exp', a], ln = (a: unknown) => ['Ln', a], sin = (a: unknown) => ['Sin', a], cos = (a: unknown) => ['Cos', a], abs = (a: unknown) => ['Abs', a];
const nest = (fn: string, n: number, inner: unknown) => { let e = inner; for (let i = 0; i < n; i++) e = [fn, e]; return e; };
const lnChain = (n: number) => { let e: unknown = 'x'; for (let i = 0; i < n; i++) e = ln(add(1, e)); return e; };
const half = ['Rational', 1, 2];

const baseline: CorpusCase[] = ([
  ['P1', eq(poly([[1, 2], [-5, 1], [6, 0]])), 'solved'],
  ['P2', eq(poly([[1, 3], [-6, 2], [11, 1], [-6, 0]])), 'solved'],
  ['P3', eq(poly([[1, 4], [-10, 2], [9, 0]])), 'solved'],
  ['P4', eq(poly([[1, 5], [-1, 1], [-1, 0]])), 'solved'],
  ['P5', eq(poly([[1, 5], [-2, 0]])), 'solved'],
  ['P6', eq(poly([[1, 6], [-1, 0]])), 'solved'],
  ['P7', eq(poly([[1, 8], [-17, 4], [16, 0]])), 'solved'],
  ['P8', eq(poly([[1, 5], [1, 4], [-5, 3], [-1, 2], [8, 1], [-4, 0]])), 'solved'],
  ['P9', eq(poly([[1, 7], [-3, 1], [1, 0]])), 'solved'],
  ['P10', eq(poly([[1, 20], [-1, 0]])), 'solved'],
  ['P11', eq(poly([[1, 9], [-9, 0]])), 'solved'],
  ['R1', eq(['Divide', add(pow('x', 2), -1), add('x', -1)], 2), 'empty'],
  ['R2', eq(add(['Divide', 1, 'x'], ['Divide', 1, add('x', 1)]), 1), 'solved'],
  ['R3', eq(['Divide', add(pow('x', 3), 1), add(pow('x', 2), -1)]), 'empty'],
  ['Q1', eq(add(mul('a', pow('x', 2)), mul('b', 'x'), 'c')), 'solved'],
  ['Q2', eq(add(pow('x', 5), mul('a', 'x'), 1)), 'solved'],
  ['S1', eq(['Sqrt', add('x', 1)], add('x', -2)), 'solved'],
  ['S2', eq(add(['Sqrt', 'x'], ['Sqrt', add('x', 1)]), 3), 'solved'],
  ['S3', eq(add(['Root', 'x', 3], ['Sqrt', 'x']), 2), 'solved'],
  ['S4', eq(add(['Sqrt', 'x'], ['Sqrt', add('x', 1)], ['Sqrt', add('x', 2)]), 5), 'solved'],
  ['A1', eq(abs(add('x', -1)), 3), 'solved'],
  ['A2', eq(abs(add(abs(add('x', -1)), -2)), 3), 'solved'],
  ['A3', eq(abs(add(abs(add(abs(add(abs('x'), -1)), -2)), -3)), 1), 'solved'],
  ['A4', eq(add(abs(add('x', -1)), abs(add('x', 2))), 5), 'solved'],
  ['E1', eq(add(exp(mul(2, 'x')), mul(-5, exp('x')), 6)), 'solved'],
  ['E2', eq(add(exp(mul(4, 'x')), mul(-5, exp(mul(2, 'x'))), 4)), 'solved'],
  ['E3', eq(add(exp(mul(half, 'x')), exp('x')), 6), 'solved'],
  ['E4', eq(add(exp(mul(3, 'x')), mul(-4, exp(mul(2, 'x'))), mul(5, exp('x')), -2)), 'solved'],
  ['E5', eq(add(pow(2, 'x'), pow(4, 'x')), 6), 'solved'],
  ['E6', eq(add(pow(ln('x'), 3), mul(-6, pow(ln('x'), 2)), mul(11, ln('x')), -6)), 'solved'],
  ['E7', eq(add(pow(ln('x'), 6), mul(-5, pow(ln('x'), 3)), 4)), 'solved'],
  ['E8', eq(mul('x', exp('x')), 1), 'solved'],
  ['E9', eq(exp('x'), -3), 'empty'],
  ['T1', eq(sin('x'), half), 'solved'],
  ['T2', eq(add(mul(3, pow(sin('x'), 2)), mul(2, sin('x')), -1)), 'solved'],
  ['T3', eq(add(pow(sin('x'), 4), mul(-5, pow(sin('x'), 2)), 4)), 'solved'],
  ['T4', eq(add(sin('x'), cos('x')), 1), 'solved'],
  ['T5', eq(sin(mul(2, 'x')), cos('x')), 'solved'],
  ['T6', ['And', eq(sin('x')), ['LessEqual', 0, 'x'], ['LessEqual', 'x', 100]], 'solved'],
  ['T7', eq(sin('x'), 2), 'empty'],
  ['C1', eq(sin(cos('x')), half), 'solved'],
  ['C2', eq(sin(cos(exp('x'))), half), 'solved'],
  ['C3', eq(nest('Sin', 4, 'x'), ['Rational', 1, 10]), 'solved'],
  ['C4', eq(nest('Cos', 7, 'x'), half), 'empty'],
  ['C5', eq(exp(sin('x')), 2), 'solved'],
  ['C6', eq(nest('Ln', 3, 'x'), 1), 'solved'],
  ['C7', eq(nest('Ln', 4, 'x')), 'solved'],
  ['M1', eq(add(['Sqrt', 'x'], ['Root', 'x', 3], ['Root', 'x', 4]), 3), 'solved'],
  ['N1', eq(cos('x'), 'x'), 'incomplete-implementation'],
  ['N2', eq(sin('x'), pow('x', 2)), 'incomplete-implementation'],
] as const).map(([id, json, expect]) => ({ id, json, expect, baseline: true }));

const evidence: CorpusCase[] = [
  { id: 'depth3-ln', json: eq(lnChain(3)), expect: 'solved' },
  { id: 'depth25-ln', json: eq(lnChain(25)), expect: 'solved' },
  { id: 'depth3-sin', json: eq(nest('Sin', 3, 'x'), ['Rational', 1, 10]), expect: 'solved' },
  { id: 'depth25-sin', json: eq(nest('Sin', 25, 'x'), ['Rational', 1, 10]), expect: 'solved' },
  { id: 'depth25-atan', json: eq(nest('Arctan', 25, 'x'), nest('Arctan', 25, add(mul(2, 'x'), -1))), expect: 'solved' },
  { id: 'depth25-range', json: eq(add(nest('Sin', 25, 'x'), 'x')), expect: 'solved' },
  { id: 'gen-depth25-mixed', json: eq((() => { let e: unknown = 'x'; for (let i = 0; i < 25; i++) e = i % 2 === 0 ? exp(e) : ln(e); return e; })(), exp(1)), expect: 'solved' },
  { id: 'atan-sum', json: eq(add(['Arctan', 'x'], ['Arctan', mul(2, 'x')]), mul(['Rational', 1, 4], 'Pi')), expect: 'solved' },
  { id: 'param-quadratic', json: eq(add(mul('a', pow('x', 2)), mul(2, 'x'), 1)), expect: 'solved' },
  { id: 'param-exp', json: eq(exp(mul('a', 'x')), 'b'), expect: 'solved' },
  { id: 'param-sin', json: eq(sin(mul('a', 'x')), half), expect: 'solved' },
  { id: 'const-cubic', json: eq(add(mul('Pi', pow('x', 3)), 'x', ['Negate', 'ExponentialE'])), expect: 'solved' },
  { id: 'sys-points', json: ['And', eq(add(pow('x', 2), pow('y', 2)), 5), eq(mul('x', 'y'), 2)], targets: ['x', 'y'], expect: 'solved' },
  { id: 'sys-katsura3', json: ['And', eq(add('x', mul(2, 'y'), mul(2, 'z')), 1), eq(add(pow('x', 2), mul(2, pow('y', 2)), mul(2, pow('z', 2))), 'x'), eq(add(mul(2, 'x', 'y'), mul(2, 'y', 'z')), 'y')], targets: ['x', 'y', 'z'], expect: 'solved' },
  { id: 'sys-circle', json: eq(add(pow('x', 2), pow('y', 2)), 1), targets: ['x', 'y'], expect: 'solved' },
  { id: 'sys-linear-params', json: ['And', eq(add(mul('a', 'x'), 'y'), 1), eq(add('x', ['Negate', 'y']), 'b')], targets: ['x', 'y'], expect: 'solved' },
  { id: 'sys-kernel', json: ['And', eq(add(exp('x'), 'y'), 3), eq('y', 1)], targets: ['x', 'y'], expect: 'solved' },
];

export const CORPUS: readonly CorpusCase[] = [...baseline, ...evidence];
