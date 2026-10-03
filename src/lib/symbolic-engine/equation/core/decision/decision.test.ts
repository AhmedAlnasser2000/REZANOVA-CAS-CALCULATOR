import { describe as group, expect, it } from 'vitest';
import { context } from '../test-support';
import { ExpressionStore } from '../representation/expression';
import { relationProblem } from '../representation/relation';
import { decidePolynomialProblem } from './solve';
import { describe, forms, solve } from './test-helpers';
import { verifyOutcome } from './verify';

const store = () => new ExpressionStore(context());
const run = (json: unknown, domain: 'real' | 'complex' = 'real') => {
  const r = solve(store(), json, domain);
  return { ...r, text: describe(r.store, r.outcome), forms: forms(r.store, r.outcome) };
};
const poly = (terms: [number, number][]) => ['Add', ...terms.map(([c, k]) => (k === 0 ? c : ['Multiply', c, ['Power', 'x', k]]))];
const eq = (lhs: unknown, rhs: unknown = 0) => ['Equal', lhs, rhs];

// Reference decimals: Python mpmath at 30 digits (independent of this code).
group('baseline corpus P1–P11 over ℝ', () => {
  it.each([
    ['P1 x²−5x+6', eq(poly([[1, 2], [-5, 1], [6, 0]])), '{2, 3}'],
    ['P2 x³−6x²+11x−6', eq(poly([[1, 3], [-6, 2], [11, 1], [-6, 0]])), '{1, 2, 3}'],
    ['P3 x⁴−10x²+9', eq(poly([[1, 4], [-10, 2], [9, 0]])), '{-3, -1, 1, 3}'],
    ['P4 x⁵−x−1', eq(poly([[1, 5], [-1, 1], [-1, 0]])), '{≈1.167304}'],
    ['P5 x⁵−2', eq(poly([[1, 5], [-2, 0]])), '{≈1.148698}'],
    ['P6 x⁶−1', eq(poly([[1, 6], [-1, 0]])), '{-1, 1}'],
    ['P7 x⁸−17x⁴+16', eq(poly([[1, 8], [-17, 4], [16, 0]])), '{-2, -1, 1, 2}'],
    ['P8 (x−1)³(x+2)²', eq(poly([[1, 5], [1, 4], [-5, 3], [-1, 2], [8, 1], [-4, 0]])), '{-2, 1}'],
    ['P9 x⁷−3x+1', eq(poly([[1, 7], [-3, 1], [1, 0]])), '{≈-1.249223, ≈0.333486, ≈1.133197}'],
    ['P10 x²⁰−1', eq(poly([[1, 20], [-1, 0]])), '{-1, 1}'],
    ['P11 x⁹−9', eq(poly([[1, 9], [-9, 0]])), '{≈1.276518}'],
  ])('%s', (_, json, expected) => {
    const r = run(json);
    expect(r.outcome.kind).toBe('solved');
    expect(r.text).toBe(expected);
  });

  it('presents pure roots and quadratic roots as proven radicals', () => {
    expect(run(eq(poly([[1, 5], [-2, 0]]))).forms).toEqual([['Power', 2, ['Rational', 1, 5]]]);
    expect(run(eq(poly([[1, 9], [-9, 0]]))).forms).toEqual([['Power', 9, ['Rational', 1, 9]]]);
    expect(run(eq(poly([[1, 4], [-2, 0]]))).forms).toEqual([['Multiply', -1, ['Power', 2, ['Rational', 1, 4]]], ['Power', 2, ['Rational', 1, 4]]]);
    expect(run(eq(poly([[1, 3], [2, 0]]))).forms).toEqual([['Multiply', -1, ['Power', 2, ['Rational', 1, 3]]]]);
    expect(run(eq(poly([[1, 4], [-10, 2], [9, 0]]))).forms).toEqual([null, null, null, null]);
    expect(run(eq(poly([[1, 5], [-1, 1], [-1, 0]]))).forms).toEqual([null]);
  });
});

group('rational equations R1–R3 and exclusions', () => {
  it('R1 (x²−1)/(x−1) = 2 is empty: its only candidate x = 1 is excluded', () => {
    expect(run(eq(['Divide', ['Subtract', ['Power', 'x', 2], 1], ['Subtract', 'x', 1]], 2)).text).toBe('empty');
  });

  it('R2 1/x + 1/(x+1) = 1 gives (1 ± √5)/2 with proven forms', () => {
    const r = run(eq(['Add', ['Divide', 1, 'x'], ['Divide', 1, ['Add', 'x', 1]]], 1));
    expect(r.text).toBe('{≈-0.618034, ≈1.618034}');
    expect(r.forms).toEqual([
      ['Multiply', ['Rational', 1, 2], ['Add', 1, ['Multiply', -1, ['Power', 5, ['Rational', 1, 2]]]]],
      ['Multiply', ['Rational', 1, 2], ['Add', 1, ['Power', 5, ['Rational', 1, 2]]]],
    ]);
  });

  it('R3 (x³+1)/(x²−1) = 0 is empty with a proof, not a failed search', () => {
    const r = run(eq(['Divide', ['Add', ['Power', 'x', 3], 1], ['Subtract', ['Power', 'x', 2], 1]]));
    expect(r.outcome.kind).toBe('empty');
    expect(r.outcome.kind === 'empty' && r.outcome.proof.records.map(x => x.rule)).toEqual(['natural-domain', 'to-polynomial']);
    expect(run(eq(['Divide', ['Add', ['Power', 'x', 3], 1], ['Subtract', ['Power', 'x', 2], 1]]), 'complex').text).toBe('{≈0.500000+0.866025i, ≈0.500000-0.866025i}');
  });

  it('keeps nested and zero-power domains', () => {
    expect(run(eq(['Divide', 1, ['Divide', 1, 'x']], 0)).text).toBe('empty');
    expect(run(eq(['Power', 'x', 0], 1)).text).toBe('(-inf, 0) ∪ (0, +inf)');
    expect(run(eq(['Divide', 'x', 'x'], 1)).text).toBe('(-inf, 0) ∪ (0, +inf)');
    expect(run(eq(['Add', 'x', ['Divide', 1, 0]], 1)).text).toBe('empty');
  });

  it('decides identities and contradictions', () => {
    const identity = eq(['Divide', ['Subtract', ['Power', 'x', 2], 1], ['Subtract', 'x', 1]], ['Add', 'x', 1]);
    expect(run(identity).text).toBe('(-inf, 1) ∪ (1, +inf)');
    expect(run(identity, 'complex').text).toBe('C\\{1}');
    expect(run(eq(['Multiply', 0, 'x'])).text).toBe('(-inf, +inf)');
    expect(run(eq(['Subtract', ['Power', ['Add', 'x', 1], 2], ['Add', ['Power', 'x', 2], ['Multiply', 2, 'x'], 1]])).text).toBe('(-inf, +inf)');
    expect(run(eq(2, 3)).text).toBe('empty');
    expect(run(eq(['Add', ['Power', 'x', 2], 1])).text).toBe('empty');
  });
});

group('complex domain', () => {
  it('returns complete root sets', () => {
    // Non-real values are ordered by canonical identity, so compare as sets of exact decimals.
    const members = (t: string) => t.slice(1, -1).split(', ').sort();
    expect(members(run(eq(poly([[1, 6], [-1, 0]])), 'complex').text)).toEqual(['-1', '1', '≈-0.500000+0.866025i', '≈-0.500000-0.866025i', '≈0.500000+0.866025i', '≈0.500000-0.866025i'].sort());
    expect(members(run(eq(poly([[1, 5], [-1, 0]])), 'complex').text)).toEqual(['1', '≈-0.809017+0.587785i', '≈-0.809017-0.587785i', '≈0.309017+0.951057i', '≈0.309017-0.951057i'].sort());
    const r = run(eq(['Add', ['Power', 'x', 2], 1]), 'complex');
    expect(members(r.text)).toEqual(['≈0.000000+1.000000i', '≈0.000000-1.000000i']);
    expect(r.forms.length).toBe(2);
    expect(r.forms.every(f => f !== null)).toBe(true);
    expect(members(run(eq(poly([[1, 5], [-1, 1], [-1, 0]])), 'complex').text)).toEqual(['≈1.167304', '≈-0.764884+0.352472i', '≈-0.764884-0.352472i', '≈0.181232+1.083954i', '≈0.181232-1.083954i'].sort());
  });

  it('decides ≠ as a cofinite set', () => {
    expect(run(['NotEqual', ['Power', 'x', 2], 4], 'complex').text).toBe('C\\{-2, 2}');
  });
});

group('inequalities and conjunctions over ℝ', () => {
  it.each([
    ['x² < 2', ['Less', ['Power', 'x', 2], 2], '(≈-1.414214, ≈1.414214)'],
    ['x² ≤ 2', ['LessEqual', ['Power', 'x', 2], 2], '[≈-1.414214, ≈1.414214]'],
    ['(x−1)/(x+2) ≥ 0', ['GreaterEqual', ['Divide', ['Subtract', 'x', 1], ['Add', 'x', 2]], 0], '(-inf, -2) ∪ [1, +inf)'],
    ['x⁵ − x − 1 > 0', ['Greater', poly([[1, 5], [-1, 1], [-1, 0]]), 0], '(≈1.167304, +inf)'],
    ['x² ≠ 4', ['NotEqual', ['Power', 'x', 2], 4], '(-inf, -2) ∪ (-2, 2) ∪ (2, +inf)'],
    ['(x−1)² ≤ 0', ['LessEqual', ['Power', ['Subtract', 'x', 1], 2], 0], '{1}'],
    ['x² + 1 < 0', ['Less', ['Add', ['Power', 'x', 2], 1], 0], 'empty'],
    ['1/x > 1', ['Greater', ['Divide', 1, 'x'], 1], '(0, 1)'],
    ['x² = 4 ∧ x > 0', ['And', eq(['Power', 'x', 2], 4), ['Greater', 'x', 0]], '{2}'],
    ['0 < x < 3 ∧ x ≠ 1', ['And', ['Less', 0, 'x', 3], ['NotEqual', 'x', 1]], '(0, 1) ∪ (1, 3)'],
    ['x ≥ 2 ∧ x ≤ 2', ['And', ['GreaterEqual', 'x', 2], ['LessEqual', 'x', 2]], '{2}'],
    ['x > 2 ∧ x < 1', ['And', ['Greater', 'x', 2], ['Less', 'x', 1]], 'empty'],
  ])('%s', (_, json, expected) => {
    expect(run(json).text).toBe(expected);
  });

  it('uses problem conditions as constraints', () => {
    const s = store(), x = s.symbol('x');
    const problem = relationProblem(s, {
      domain: 'real', targets: ['x'],
      relations: [{ op: 'eq', lhs: s.pow(x, s.integer(4)), rhs: s.integer(16) }],
      conditions: [{ kind: 'positive', expr: x }],
    });
    const outcome = decidePolynomialProblem(problem);
    verifyOutcome(problem, outcome);
    expect(describe(s, outcome)).toBe('{2}');
  });
});

group('algebraic coefficients', () => {
  it('solves through the norm and keeps only true roots', () => {
    const r = run(eq(['Multiply', ['Sqrt', 2], ['Power', 'x', 2]], 3));
    expect(r.text).toBe('{≈-1.456475, ≈1.456475}');
    const vieta = run(eq(['Add', ['Power', 'x', 2], ['Negate', ['Multiply', ['Add', ['Sqrt', 2], ['Sqrt', 3]], 'x']], ['Sqrt', 6]]));
    expect(vieta.text).toBe('{≈1.414214, ≈1.732051}');
    expect(vieta.forms).toEqual([['Power', 2, ['Rational', 1, 2]], ['Power', 3, ['Rational', 1, 2]]]);
    expect(run(eq(['Multiply', 'ImaginaryUnit', 'x'], 1), 'complex').text).toBe('{≈0.000000-1.000000i}');
    expect(run(eq(['Multiply', 'ImaginaryUnit', 'x'], 1)).text).toBe('empty');
    expect(run(eq(['Subtract', ['Power', 'x', 3], ['Root', 2, 3]])).text).toBe('{≈1.080060}');
  });

  it('recognizes coefficients that are exactly zero', () => {
    expect(run(eq(['Multiply', ['Subtract', ['Sqrt', 8], ['Multiply', 2, ['Sqrt', 2]]], 'x'], 1)).text).toBe('empty');
    expect(run(eq(['Multiply', ['Subtract', ['Sqrt', 8], ['Multiply', 2, ['Sqrt', 2]]], 'x'], 0)).text).toBe('(-inf, +inf)');
  });

  it('decides inequalities with real algebraic coefficients', () => {
    expect(run(['Less', ['Multiply', ['Sqrt', 2], 'x'], 1]).text).toBe('(-inf, ≈0.707107)');
  });
});

group('routing to the gates that own a problem', () => {
  it.each([
    [eq(['Sin', 'x'], ['Rational', 1, 2]), 'incomplete-implementation: EQUATION-PERIODIC1: sin of the variable'],
    [eq(['Exp', 'x'], 2), 'incomplete-implementation: EQUATION-GENERATORS1: exp of the variable'],
    [eq(['Power', 2, 'x'], 8), 'incomplete-implementation: EQUATION-GENERATORS1: the variable appears in an exponent'],
    [eq(['Sqrt', 'x'], 2), 'incomplete-implementation: EQUATION-CONSTRAINTS1: a non-integer power of the variable (radical)'],
    [eq(['Abs', 'x'], 2), 'incomplete-implementation: EQUATION-CONSTRAINTS1: abs of the variable'],
    [eq(['Multiply', 'a', 'x'], 1), 'incomplete-implementation: EQUATION-PARAMETERS1: parameters a'],
    [eq(['Multiply', 'Pi', 'x'], 1), 'incomplete-implementation: EQUATION-PARAMETERS1: transcendental coefficient (π)'],
  ])('%j', (json, expected) => {
    expect(run(json).text).toBe(expected);
  });
});
