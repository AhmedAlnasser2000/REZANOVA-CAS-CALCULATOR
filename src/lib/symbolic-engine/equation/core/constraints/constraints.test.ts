import { describe as group, expect, it } from 'vitest';
import { context } from '../test-support';
import { rational } from '../algebra/rational';
import { realDecimal, type RealRootOf } from '../algebraic/root-of';
import { decideEquation, verifyEquationOutcome } from '../decide';
import { describe, forms } from '../decision/test-helpers';
import { ExpressionStore } from '../representation/expression';
import { readRelations, writeExpression } from '../representation/mathjson';
import { relationProblem, type ProblemDomain } from '../representation/relation';
import { rewriteGenerators } from '../generators/solve';

/** Decide through the dispatcher, verify independently, and describe exactly. */
function run(json: unknown, domain: ProblemDomain = 'real') {
  const store = new ExpressionStore(context());
  const r = readRelations(store, json);
  if (r.kind !== 'ok') throw new Error(JSON.stringify(r));
  const problem = relationProblem(store, { domain, targets: ['x'], relations: r.value });
  const outcome = decideEquation(problem);
  verifyEquationOutcome(problem, outcome);
  return { store, problem, outcome, text: describe(store, outcome) };
}
const eq = (a: unknown, b: unknown = 0) => ['Equal', a, b];
const abs = (a: unknown) => ['Abs', a];
const sqrt = (a: unknown) => ['Sqrt', a];
const root = (a: unknown, n: number) => ['Root', a, n];
const add = (...a: unknown[]) => ['Add', ...a];
const exp = (a: unknown) => ['Exp', a];

group('baseline corpus A/S/M (exact; A2 and A3 were the old engine\'s false "no roots", S4 and M1 were refused)', () => {
  it.each([
    ['A1 |x − 1| = 3', eq(abs(add('x', -1)), 3), '{-2, 4}'],
    ['A2 ||x − 1| − 2| = 3', eq(abs(add(abs(add('x', -1)), -2)), 3), '{-4, 6}'],
    ['A3 ||||x| − 1| − 2| − 3| = 1', eq(abs(add(abs(add(abs(add(abs('x'), -1)), -2)), -3)), 1), '{-7, -5, -1, 1, 5, 7}'],
    ['A4 |x − 1| + |x + 2| = 5', eq(add(abs(add('x', -1)), abs(add('x', 2))), 5), '{-3, 2}'],
    ['S1 √(x + 1) = x − 2', eq(sqrt(add('x', 1)), add('x', -2)), '{≈4.302776}'],
    ['S2 √x + √(x + 1) = 3', eq(add(sqrt('x'), sqrt(add('x', 1))), 3), '{16/9}'],
    ['S3 ∛x + √x = 2', eq(add(root('x', 3), sqrt('x')), 2), '{1}'],
    ['S4 √x + √(x + 1) + √(x + 2) = 5', eq(add(sqrt('x'), sqrt(add('x', 1)), sqrt(add('x', 2))), 5), '{≈1.838601}'],
    ['M1 √x + ∛x + ∜x = 3', eq(add(sqrt('x'), root('x', 3), root('x', 4)), 3), '{1}'],
  ])('%s', (_, json, expected) => {
    expect(run(json).text).toBe(expected);
  }, 60_000);

  it('S1 carries the proven form (5 + √13)/2; S4 is one exact RootOf matching mpmath', () => {
    const s1 = run(eq(sqrt(add('x', 1)), add('x', -2)));
    expect(forms(s1.store, s1.outcome)).toEqual([['Multiply', ['Rational', 1, 2], ['Add', 5, ['Power', 13, ['Rational', 1, 2]]]]]);
    const s4 = run(eq(add(sqrt('x'), sqrt(add('x', 1)), sqrt(add('x', 2))), 5));
    if (s4.outcome.kind !== 'solved' || s4.outcome.set.kind !== 'finite') throw new Error(s4.text);
    const [v] = s4.outcome.set.points[0];
    if (v.kind !== 'algebraic') throw new Error(v.kind);
    // mpmath (40 digits): 1.838601166658565639682409230952010602680
    expect(realDecimal(s4.store.ctx, v.root as RealRootOf, 30)).toBe('1.838601166658565639682409230952');
  }, 60_000);
});

group('absolute values: lazy branching, zero intervals', () => {
  it.each([
    ['|x| = x', eq(abs('x'), 'x'), '[0, +inf)'],
    ['|x − 1| + |x + 1| = 2', eq(add(abs(add('x', -1)), abs(add('x', 1))), 2), '[-1, 1]'],
    ['|x² − 4| = 3x', eq(abs(add(['Power', 'x', 2], -4)), ['Multiply', 3, 'x']), '{1, 4}'],
    ['|x| = −1', eq(abs('x'), -1), 'empty'],
    ['√|x| = x', eq(sqrt(abs('x')), 'x'), '{0, 1}'],
    ['||x| − x| = 0 (an argument with a zero interval)', eq(abs(add(abs('x'), ['Multiply', -1, 'x']))), '[0, +inf)'],
    ['|x − 1| = |x + 1|', eq(abs(add('x', -1)), abs(add('x', 1))), '{0}'],
  ])('%s', (_, json, expected) => {
    expect(run(json).text).toBe(expected);
  });

  it('solves a depth-10 nested absolute value with the same code', () => {
    let inner: unknown = 'x';
    for (let i = 0; i < 10; i++) inner = add(abs(inner), -1);
    expect(run(eq(inner)).text).toBe('{-10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10}');
  }, 120_000);
});

group('radicals: inversion, same-base lattice, tower elimination', () => {
  it.each([
    ['√(x + √x) = 2', eq(sqrt(add('x', sqrt('x'))), 2), '{≈2.438447}'],
    ['√x = −1', eq(sqrt('x'), -1), 'empty'],
    ['x^{2/3} = 4', eq(['Power', 'x', ['Divide', 2, 3]], 4), '{-8, 8}'],
    ['∛x = −2', eq(root('x', 3), -2), '{-8}'],
    ['√(4x) − 2√x = 0', eq(add(sqrt(['Multiply', 4, 'x']), ['Multiply', -2, sqrt('x')])), '[0, +inf)'],
    ['x^{−1/2} = 2', eq(['Power', 'x', ['Rational', -1, 2]], 2), '{1/4}'],
    ['√(x² + 1) = x + 1 (target outside, non-affine base)', eq(sqrt(add(['Power', 'x', 2], 1)), add('x', 1)), '{0}'],
    ['√2·√x = 2 (number-only radicals)', eq(['Multiply', sqrt(2), sqrt('x')], 2), '{2}'],
  ])('%s', (_, json, expected) => {
    expect(run(json).text).toBe(expected);
  });

  it('√(x + √x) = 2 is (9 − √17)/2 with its proven form', () => {
    const r = run(eq(sqrt(add('x', sqrt('x'))), 2));
    expect(forms(r.store, r.outcome)).toEqual([['Multiply', ['Rational', 1, 2], ['Add', 9, ['Multiply', -1, ['Power', 17, ['Rational', 1, 2]]]]]]);
  });

  it('refuses dependent radicals honestly', () => {
    expect(run(eq(sqrt(add(['Power', 'x', 2], ['Multiply', 2, 'x'], 1)), add('x', 1))).text)
      .toBe('incomplete-implementation: EQUATION-CONSTRAINTS1: dependent radicals (the elimination norm vanishes identically)');
  });
});

group('inequalities and conjunctions', () => {
  it.each([
    ['|x − 1| < 2', ['Less', abs(add('x', -1)), 2], '(-1, 3)'],
    ['√x < x − 2', ['Less', sqrt('x'), add('x', -2)], '(4, +inf)'],
    ['√(x + 1) ≤ 2', ['LessEqual', sqrt(add('x', 1)), 2], '[-1, 3]'],
    ['|x| ≥ x', ['GreaterEqual', abs('x'), 'x'], '(-inf, +inf)'],
    ['|x − 1| + |x + 1| > 2', ['Greater', add(abs(add('x', -1)), abs(add('x', 1))), 2], '(-inf, -1) ∪ (1, +inf)'],
    ['|x| = x ∧ x ≤ 3', ['And', eq(abs('x'), 'x'), ['LessEqual', 'x', 3]], '[0, 3]'],
  ])('%s', (_, json, expected) => {
    expect(run(json).text).toBe(expected);
  });
});

group('mixing with exp and log (slice 2)', () => {
  it.each([
    ['e^{|x|} = 2', eq(exp(abs('x')), 2), '{["Multiply",-1,["Ln",2]], ["Ln",2]}'],
    ['√(ln x) = 1', eq(sqrt(['Ln', 'x']), 1), '{["Exp",1]}'],
    ['|eˣ − 2| = 1', eq(abs(add(exp('x'), -2)), 1), '{0, ["Ln",3]}'],
    ['e^{√x} = 2', eq(exp(sqrt('x')), 2), '{["Power",["Ln",2],2]}'],
    ['e^{|x|} ≤ 2', ['LessEqual', exp(abs('x')), 2], '[["Multiply",-1,["Ln",2]], ["Ln",2]]'],
  ])('%s', (_, json, expected) => {
    expect(run(json).text).toBe(expected);
  });
});

group('routing to the gates that own a problem', () => {
  it.each([
    [eq(add(sqrt('x'), exp('x')), 3), '{["IsolatedRoot",["Multiply",-1,["Add",-3,["Power","ξ",["Rational",1,2]],["Exp","ξ"]]],["Rational",3,4],["Rational",7,8]]}'],
    [eq(add(sqrt('x'), sqrt(add('x', 1))), ['Ln', 5]), '{["IsolatedRoot",["Multiply",-1,["Add",["Multiply",-1,["Ln",5]],["Power","ξ",["Rational",1,2]],["Power",["Add",1,"ξ"],["Rational",1,2]]]],["Rational",1,8],["Rational",1,4]]}'],
    [eq(add(['Sin', abs('x')], 'x'), 1), '{["IsolatedRoot",["Multiply",-1,["Add",1,["Multiply",-1,["Add","ξ",["Sin","ξ"]]]]],["Rational",1,2],["Rational",3,4]]}'],
    // √(x + a) = 1 is decided by the parameters gate; two radicals with a parameter stay refused.
    [eq(add(sqrt('x'), sqrt(add('x', 'a'))), 1), 'incomplete-implementation: EQUATION-PARAMETERS1: mixed or nested kernels of the target with parameters (follow-up ledger)'],
  ])('%j', (json, expected) => {
    expect(run(json).text).toBe(expected);
  });

  it('refuses complex absolute values and radicals as unsupported; slices 1 and 2 route unchanged', () => {
    expect(run(eq(abs('x'), 1), 'complex').text).toBe('unsupported: absolute values and radicals of the target are decided over the reals only');
    expect(run(eq(sqrt('x'), 1), 'complex').text).toBe('unsupported: absolute values and radicals of the target are decided over the reals only');
    expect(run(eq(['Power', 'x', 2], 4)).text).toBe('{-2, 2}');
    expect(run(eq(exp('x'), 2)).text).toBe('{["Ln",2]}');
  });
});

group('substrate: real radical normal forms and domains', () => {
  function leaf(json: unknown) {
    const store = new ExpressionStore(context());
    const r = readRelations(store, json);
    if (r.kind !== 'ok') throw new Error(JSON.stringify(r));
    const out = rewriteGenerators(relationProblem(store, { domain: 'real', targets: ['x'], relations: r.value })).leaf;
    return {
      relations: out.relations.map(rel => writeExpression(store, store.sub(rel.lhs, rel.rhs))),
      conditions: out.conditions.map(c => [c.kind, writeExpression(store, c.expr)]),
    };
  }

  it('folds (c·A)^r = c^r·A^r for a positive number c', () => {
    const s = new ExpressionStore(context()), x = s.symbol('x'), half = s.number(rational(s.ctx, 1n, 2n));
    expect(s.pow(s.mul(s.integer(4), x), half)).toBe(s.mul(s.integer(2), s.pow(x, half)));
    expect(s.pow(s.mul(s.integer(-4), x), half)).not.toBe(s.mul(s.integer(2), s.pow(s.neg(x), half)));
  });

  it('rewrites powers of powers by their real meaning and records radical domains', () => {
    // Each leaf is one relation H = 0, written −(c − H) by the canonical printer.
    const zeroForm = (h: unknown, c: number) => [['Multiply', -1, ['Add', c, ['Multiply', -1, h]]]];
    expect(leaf(eq(sqrt(['Power', 'x', 2]), 1))).toEqual({ relations: zeroForm(['Abs', 'x'], 1), conditions: [] });
    expect(leaf(eq(root(['Power', 'x', 3], 3), 2))).toEqual({ relations: zeroForm('x', 2), conditions: [] });
    expect(leaf(eq(['Power', abs('x'), 4], 1))).toEqual({ relations: [['Multiply', -1, ['Add', -1, ['Power', 'x', 4]]]], conditions: [] });
    expect(leaf(eq(['Power', exp('x'), ['Rational', 1, 2]], 2))).toEqual({ relations: zeroForm(['Exp', ['Multiply', ['Rational', 1, 2], 'x']], 2), conditions: [] });
    expect(leaf(eq(['Power', 'x', ['Rational', -3, 4]], 2)))
      .toEqual({ relations: zeroForm(['Power', 'x', ['Rational', -3, 4]], 2), conditions: [['nonnegative', 'x'], ['nonzero', 'x']] });
    expect(leaf(eq(root(add('x', -1), 3), 2))).toEqual({ relations: zeroForm(['Power', ['Add', -1, 'x'], ['Rational', 1, 3]], 2), conditions: [] });
  });
});
