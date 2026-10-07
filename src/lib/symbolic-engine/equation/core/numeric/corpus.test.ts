import { describe as group, expect, it } from 'vitest';
import { DEFAULT_EQUATION_LIMITS } from '../../../../new-equation/types';
import { lowerEquation } from '../../service/input';
import { rational, rCompare, rSubtract, rAdd, type Rational } from '../algebra/rational';
import { decideEquation, verifyEquationOutcome } from '../decide';
import { EquationAlgebraError, ExecutionContext } from '../execution';
import { enclose } from '../representation/enclosure';
import { ExpressionStore } from '../representation/expression';
import { normalizeSet, valueExpression, type EquationOutcome, type SolutionSet } from '../representation/solution-set';

// EQUATION-CERTIFIED-NUMERICS1 corpus. References: mpmath findroot at 30 digits (truncated to 25 here).
const CASES: readonly [string, string[], string[]][] = [
  ['cos x = x', ['\\cos x=x'], ['0.7390851332151606416553121']],
  ['sin x = x/2 (0 is exact)', ['\\sin x=\\frac{x}{2}'], ['-1.895494267033980947144036', '1.895494267033980947144036']],
  ['eˣ + x³ = 5', ['e^x+x^3=5'], ['1.193674574545062598424842']],
  ['2ˣ + 3ˣ = 10', ['2^x+3^x=10'], ['1.729255558981859572473816']],
  ['2ˣ + 3ˣ = 6', ['2^x+3^x=6'], ['1.193911477211585957200358']],
  ['eˣ + ln x = 1', ['e^x+\\ln x=1'], ['0.5122224330332299481607867']],
  ['√x + √(x + 1) = ln 5', ['\\sqrt{x}+\\sqrt{x+1}=\\ln 5'], ['0.2440868737211080091090232']],
  ['eˣ + sin x = 0 with −10 ≤ x ≤ 0', ['e^x+\\sin x=0', '-10\\le x\\le0'],
    ['-9.424697254738521219115865', '-6.285049273382586533848301', '-3.096363932410646115625841', '-0.588532743981861077432452']],
];

function solve(rows: readonly string[]) {
  const ctx = new ExecutionContext({ ...DEFAULT_EQUATION_LIMITS });
  const store = new ExpressionStore(ctx);
  const { problem } = lowerEquation(store, { rows: [...rows], targets: ['x'], domain: 'real', limits: { ...DEFAULT_EQUATION_LIMITS }, digits: 6 });
  return { ctx, store, problem, outcome: decideEquation(problem) };
}
const decimal = (ctx: ExecutionContext, s: string): Rational => {
  const negative = s.startsWith('-'), [whole, frac = ''] = s.replace('-', '').split('.');
  const q = rational(ctx, BigInt(whole + frac), 10n ** BigInt(frac.length));
  return negative ? rational(ctx, -q.numerator, q.denominator) : q;
};
const isolatedValues = (store: ExpressionStore, set: SolutionSet) =>
  (set.kind === 'finite' ? set.points.flat() : []).map(v => valueExpression(store, v)).filter(id => store.node(id).kind === 'isolated');

group('certified numeric roots against 30-digit references', () => {
  it.each(CASES)('%s', (_label, rows, references) => {
    const { ctx, store, problem, outcome } = solve(rows);
    expect(outcome.kind).toBe('solved');
    verifyEquationOutcome(problem, outcome);
    const set = normalizeSet(store, (outcome as Extract<EquationOutcome, { kind: 'solved' }>).set, 'real');
    const roots = isolatedValues(store, set);
    expect(roots).toHaveLength(references.length);
    const slack = rational(ctx, 1n, 10n ** 24n);
    roots.forEach((id, i) => {
      const b = enclose(store, id, 90);
      if (b.kind !== 'bounds') throw new Error(b.kind);
      const ref = decimal(ctx, references[i]);
      expect(rCompare(ctx, rSubtract(ctx, b.lo, slack), ref)).toBeLessThanOrEqual(0);
      expect(rCompare(ctx, ref, rAdd(ctx, b.hi, slack))).toBeLessThanOrEqual(0);
    });
  }, 60_000);

  it('rejects a dropped root and a root moved outside its interval', () => {
    const { store, problem, outcome } = solve(['e^x+\\sin x=0', '-10\\le x\\le0']);
    if (outcome.kind !== 'solved' || outcome.set.kind !== 'finite') throw new Error(outcome.kind);
    const set = outcome.set;
    const reject = (s: SolutionSet, reason: RegExp) => {
      let caught: unknown;
      try { verifyEquationOutcome(problem, { ...outcome, set: s }); } catch (e) { caught = e; }
      expect(caught).toBeInstanceOf(EquationAlgebraError);
      expect((caught as EquationAlgebraError).reason).toMatch(reason);
    };
    reject({ ...set, points: set.points.slice(1) }, /unclaimed zero|differs/);
    // The first root's interval swapped for one without a sign change.
    const first = valueExpression(store, set.points[0][0]), node = store.node(first) as Extract<ReturnType<ExpressionStore['node']>, { kind: 'isolated' }>;
    const moved = store.isolated(node.expr, 'ξ', rational(store.ctx, -8n), rational(store.ctx, -7n), node.loSign);
    reject({ ...set, points: [[{ kind: 'expression', id: moved }], ...set.points.slice(1)] }, /sign change|monotone/);
  }, 60_000);

  it('refuses infinitely many roots without a range, naming the fix', () => {
    const { outcome } = solve(['e^x+\\sin x=0']);
    expect(outcome.kind).toBe('incomplete-implementation');
    expect('reason' in outcome && outcome.reason).toMatch(/infinitely many roots without a closed form as x → −∞; add a range row/);
  });
});
