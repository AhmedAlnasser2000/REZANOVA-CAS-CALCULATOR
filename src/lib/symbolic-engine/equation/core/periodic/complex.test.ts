import { describe as group, expect, it } from 'vitest';
import { context } from '../test-support';
import { decideEquation, verifyEquationOutcome } from '../decide';
import { describe } from '../decision/test-helpers';
import { evaluateExact } from '../representation/evaluate';
import { ExpressionStore } from '../representation/expression';
import { readExpression, readRelations, writeExpression } from '../representation/mathjson';
import { relationProblem } from '../representation/relation';
import { complexBounds, principalLog } from './rectangular';
import { rational } from '../algebra/rational';
import { algebraicLogIsZero } from '../representation/log-zero';
import { realSign } from '../representation/real-order';

/** Decide over ℂ through the dispatcher, verify independently, and describe exactly. */
function run(json: unknown) {
  const store = new ExpressionStore(context());
  const r = readRelations(store, json);
  if (r.kind !== 'ok') throw new Error(JSON.stringify(r));
  const problem = relationProblem(store, { domain: 'complex', targets: ['z'], relations: r.value });
  const outcome = decideEquation(problem);
  verifyEquationOutcome(problem, outcome);
  return { store, problem, outcome, text: describe(store, outcome) };
}
const eq = (a: unknown, b: unknown = 0) => ['Equal', a, b];
const exp = (a: unknown) => ['Exp', a], I = 'ImaginaryUnit';
const twoPiIk = '["Multiply",2,"Pi","k","ImaginaryUnit"]';
const E1 = eq(['Add', exp(['Multiply', 2, 'z']), ['Multiply', -5, exp('z')], 6]);

group('complex exponential and logarithmic families (moved here from slice 2)', () => {
  it.each([
    ['E1 over ℂ', E1, `{["Add",${twoPiIk},["Ln",2]] : k ∈ ℤ} ∪ {["Add",${twoPiIk},["Ln",3]] : k ∈ ℤ}`],
    ['eᶻ = 1 ∧ z ≠ 0', ['And', eq(exp('z'), 1), ['NotEqual', 'z', 0]], `{${twoPiIk} : k ∈ ℤ, not-equal 0 "k"}`],
    ['e^{2z} = 1 (minimal period πi)', eq(exp(['Multiply', 2, 'z']), 1), '{["Multiply","Pi","k","ImaginaryUnit"] : k ∈ ℤ}'],
    ['e^{3z} = 1', eq(exp(['Multiply', 3, 'z']), 1), '{["Multiply",["Rational",2,3],"Pi","k","ImaginaryUnit"] : k ∈ ℤ}'],
    ['(eᶻ)³ = 1', eq(['Power', exp('z'), 3], 1), '{["Multiply",["Rational",2,3],"Pi","k","ImaginaryUnit"] : k ∈ ℤ}'],
    ['eᶻ = −1', eq(exp('z'), -1), `{["Add",["Multiply","Pi","ImaginaryUnit"],${twoPiIk}] : k ∈ ℤ}`],
    ['eᶻ = 1 + i (canonical Log)', eq(exp('z'), ['Add', 1, I]), `{["Add",["Multiply",["Rational",1,2],["Ln",2]],["Multiply",["Rational",1,4],"Pi","ImaginaryUnit"],${twoPiIk}] : k ∈ ℤ}`],
    ['e^{iz} = 1', eq(exp(['Multiply', I, 'z']), 1), '{["Multiply",2,"Pi","k"] : k ∈ ℤ}'],
    ['e^{2z} = π·eᶻ', eq(exp(['Multiply', 2, 'z']), ['Multiply', 'Pi', exp('z')]), `{["Add",["Ln","Pi"],${twoPiIk}] : k ∈ ℤ}`],
    ['eᶻ = 0', eq(exp('z'), 0), 'empty'],
    ['log z = 1', eq(['Ln', 'z'], 1), '{["Exp",1]}'],
    ['log z = 2πi (outside the principal strip)', eq(['Ln', 'z'], ['Multiply', 2, 'Pi', I]), 'empty'],
    ['log z = iπ (on the strip boundary)', eq(['Ln', 'z'], ['Multiply', 'Pi', I]), '{-1}'],
    ['log z = 1 + i', eq(['Ln', 'z'], ['Add', 1, I]), '{["Exp",["Add",1,"ImaginaryUnit"]]}'],
    ['log(z + 1) = 1', eq(['Ln', ['Add', 'z', 1]], 1), '{["Add",-1,["Exp",1]]}'],
    ['log² z − 3 log z + 2 = 0', eq(['Add', ['Power', ['Ln', 'z'], 2], ['Multiply', -3, ['Ln', 'z']], 2]), '{["Exp",1], ["Exp",2]}'],
  ])('%s', (_, json, expected) => {
    expect(run(json).text).toBe(expected);
  }, 60_000);
});

group('principal powers b^z = exp(z·Log b) (user decision)', () => {
  it.each([
    ['2ᶻ = 3', eq(['Power', 2, 'z'], 3), '{["Add",["Multiply",["Power",["Ln",2],-1],["Ln",3]],["Multiply",2,["Power",["Ln",2],-1],"Pi","k","ImaginaryUnit"]] : k ∈ ℤ}'],
    ['(−1)ᶻ = 1', eq(['Power', -1, 'z'], 1), '{["Multiply",2,"k"] : k ∈ ℤ}'],
  ])('%s', (_, json, expected) => {
    expect(run(json).text).toBe(expected);
  }, 60_000);
});

group('complex trig through w = e^{iz}', () => {
  const lnRoot = (sign: string) => `["Multiply",-1,["Ln",["Multiply",["Rational",1,2],["Add",4,${sign}]]],"ImaginaryUnit"]`;
  it.each([
    ['sin z = 2: π/2 − i·ln(2 ± √3) + 2πk', eq(['Sin', 'z'], 2),
      `{["Add",["Multiply",2,"Pi","k"],["Multiply",["Rational",1,2],"Pi"],${lnRoot('["Power",12,["Rational",1,2]]')}] : k ∈ ℤ} ∪ {["Add",["Multiply",2,"Pi","k"],["Multiply",["Rational",1,2],"Pi"],${lnRoot('["Multiply",-1,["Power",12,["Rational",1,2]]]')}] : k ∈ ℤ}`],
    ['cos z = 0', eq(['Cos', 'z'], 0), '{["Add",["Multiply","Pi","k"],["Multiply",["Rational",1,2],"Pi"]] : k ∈ ℤ}'],
    ['tan z = 2', eq(['Tan', 'z'], 2), '{["Add",["Multiply","Pi","k"],["Arctan",2]] : k ∈ ℤ}'],
    ['tan z = i (the pole of w² + 1 is excluded)', eq(['Tan', 'z'], I), 'empty'],
    ['sin 2z = cos z (T5 over ℂ: only the real families)', eq(['Sin', ['Multiply', 2, 'z']], ['Cos', 'z']),
      '{["Add",["Multiply",["Rational",2,3],"Pi","k"],["Multiply",["Rational",1,6],"Pi"]] : k ∈ ℤ} ∪ {["Add",["Multiply",2,"Pi","k"],["Multiply",["Rational",1,2],"Pi"]] : k ∈ ℤ}'],
    ['sin(z + 1) = 1/2', eq(['Sin', ['Add', 'z', 1]], ['Rational', 1, 2]),
      '{["Add",-1,["Multiply",2,"Pi","k"],["Multiply",["Rational",1,6],"Pi"]] : k ∈ ℤ} ∪ {["Add",-1,["Multiply",2,"Pi","k"],["Multiply",["Rational",5,6],"Pi"]] : k ∈ ℤ}'],
  ])('%s', (_, json, expected) => {
    expect(run(json).text).toBe(expected);
  }, 60_000);
});

group('chains, conjunctions and exclusions', () => {
  it.each([
    ['e^{eᶻ} = 1: Log(2πik₁) + 2πik₂, k₁ ≠ 0', eq(exp(exp('z')), 1),
      '{["Add",["Multiply",2,"Pi","k2","ImaginaryUnit"],["Ln",["Multiply",2,"k1","Pi","ImaginaryUnit"]]] : k1, k2 ∈ ℤ, not-equal 0 "k1"}'],
    ['e^{1/z} = 1: 1/(2πik), k ≠ 0', eq(exp(['Divide', 1, 'z']), 1), '{["Multiply",["Rational",1,2],["Power",["Multiply","Pi","k","ImaginaryUnit"],-1]] : k ∈ ℤ, not-equal 0 "k"}'],
    ['e^{z²} = 2', eq(exp(['Power', 'z', 2]), 2),
      `{["Multiply",-1,["Power",["Add",${twoPiIk},["Ln",2]],["Rational",1,2]]] : k ∈ ℤ} ∪ {["Power",["Add",${twoPiIk},["Ln",2]],["Rational",1,2]] : k ∈ ℤ}`],
    ['eᶻ = 1 ∧ sin z = 0 (non-parallel lattices)', ['And', eq(exp('z'), 1), eq(['Sin', 'z'], 0)], '{0}'],
    ['eᶻ = 1 ∧ z² = −4π²', ['And', eq(exp('z'), 1), eq(['Power', 'z', 2], ['Multiply', -4, ['Power', 'Pi', 2]])],
      '{["Multiply",2,"Pi","ImaginaryUnit"], ["Multiply",-2,"Pi","ImaginaryUnit"]}'],
    ['eᶻ = 1 ∧ e^{z/2} = −1 (a congruence)', ['And', eq(exp('z'), 1), eq(exp(['Multiply', ['Rational', 1, 2], 'z']), -1)],
      '{["Add",["Multiply",4,"Pi","k","ImaginaryUnit"],["Multiply",2,"Pi","ImaginaryUnit"]] : k ∈ ℤ}'],
    ['eᶻ = 1 ∧ e^{z/2} ≠ 1 (a sublattice removed)', ['And', eq(exp('z'), 1), ['NotEqual', exp(['Multiply', ['Rational', 1, 2], 'z']), 1]],
      '{["Add",["Multiply",4,"Pi","k","ImaginaryUnit"],["Multiply",2,"Pi","ImaginaryUnit"]] : k ∈ ℤ}'],
    ['E1 ∧ z ≠ ln 2 (one member removed)', ['And', E1, ['NotEqual', 'z', ['Ln', 2]]],
      `{["Add",${twoPiIk},["Ln",2]] : k ∈ ℤ, not-equal 0 "k"} ∪ {["Add",${twoPiIk},["Ln",3]] : k ∈ ℤ}`],
    ['(eᶻ − 1)(z − 2) = 0', eq(['Multiply', ['Add', exp('z'), -1], ['Add', 'z', -2]]), `{2} ∪ {${twoPiIk} : k ∈ ℤ}`],
  ])('%s', (_, json, expected) => {
    expect(run(json).text).toBe(expected);
  }, 60_000);
});

group('several principal logarithms (slice 5): exponentiate, then the exact Arg sum', () => {
  it.each([
    ['log z + log(z + 1) = 0: (√5 − 1)/2 (the other root fails the Arg sum)', eq(['Add', ['Ln', 'z'], ['Ln', ['Add', 'z', 1]]]), '{≈0.618034}', [-1n, 1n, 1n]],
    ['2·log z = log 4: {2} (−2 fails)', eq(['Multiply', 2, ['Ln', 'z']], ['Ln', 4]), '{2}', undefined],
    ['log z − log(z − 1) = iπ/2: (1 − i)/2', eq(['Subtract', ['Ln', 'z'], ['Ln', ['Add', 'z', -1]]], ['Multiply', ['Rational', 1, 2], 'Pi', I]), '{≈0.500000-0.500000i}', [1n, -2n, 2n]],
    ['log z + log(z + 1) = iπ: only (−1 + i√3)/2', eq(['Add', ['Ln', 'z'], ['Ln', ['Add', 'z', 1]]], ['Multiply', 'Pi', I]), '{≈-0.500000+0.866025i}', [1n, 1n, 1n]],
    ['log z + log(z + 1) + log(z + 2) = log 6: {1}', eq(['Add', ['Ln', 'z'], ['Ln', ['Add', 'z', 1]], ['Ln', ['Add', 'z', 2]]], ['Ln', 6]), '{1}', undefined],
  ])('%s', (_, json, expected, minimal) => {
    const r = run(json);
    expect(r.text).toBe(expected);
    if (minimal && r.outcome.kind === 'solved' && r.outcome.set.kind === 'finite') {
      const v = r.outcome.set.points[0][0];
      // Exact identity: the root of its minimal polynomial.
      expect(v.kind === 'algebraic' ? v.root.poly.coefficients : undefined).toEqual(minimal);
    }
  }, 60_000);
});

group('routing over ℂ', () => {
  it.each([
    ['z·eᶻ = 1 (complex Lambert)', eq(['Multiply', 'z', exp('z')], 1), 'incomplete-implementation: EQUATION-CERTIFIED-NUMERICS1: the variable outside exponential or logarithmic kernels over ℂ (Lambert class)'],
    ['√2·log z + log(z + 1) = 0 (an irrational coefficient)', eq(['Add', ['Multiply', ['Sqrt', 2], ['Ln', 'z']], ['Ln', ['Add', 'z', 1]]]), 'incomplete-implementation: EQUATION-PARAMETERS1: a non-rational multiple of a logarithm over ℂ'],
    ['log z + z = 1 (the variable outside the logarithm)', eq(['Add', ['Ln', 'z'], 'z'], 1), 'incomplete-implementation: EQUATION-CERTIFIED-NUMERICS1: the variable outside exponential or logarithmic kernels over ℂ (Lambert class)'],
    ['eᶻ + sin z = 0 (frequencies 1 and i)', eq(['Add', exp('z'), ['Sin', 'z']]), 'incomplete-implementation: EQUATION-CERTIFIED-NUMERICS1: independent exponential generators'],
    ['eᶻ ≠ 1 (complement of a family)', ['NotEqual', exp('z'), 1], 'incomplete-implementation: EQUATION-RESULT-CONTRACT1: the complement of an infinite family over ℂ'],
    ['|z| = 1', eq(['Abs', 'z'], 1), 'unsupported: absolute values and radicals of the target are decided over the reals only'],
    ['√z = 1', eq(['Sqrt', 'z'], 1), 'unsupported: absolute values and radicals of the target are decided over the reals only'],
    ['z² = −1 stays in slice 1', eq(['Power', 'z', 2], -1), '{≈0.000000+1.000000i, ≈0.000000-1.000000i}'],
  ])('%s', (_, json, expected) => {
    expect(run(json).text).toBe(expected);
  }, 60_000);
});

group('exact zero test for logs of algebraic numbers', () => {
  const store = new ExpressionStore(context());
  const read = (json: unknown) => { const r = readExpression(store, json); if (r.kind !== 'ok') throw new Error('read'); return r.value; };
  it('decides Σ cⱼ·ln αⱼ (+ a) exactly', () => {
    const golden = ['Multiply', ['Rational', 1, 2], ['Add', ['Sqrt', 5], -1]], conjugate = ['Multiply', ['Rational', 1, 2], ['Add', ['Sqrt', 5], 1]];
    expect(algebraicLogIsZero(store, read(['Add', ['Ln', golden], ['Ln', conjugate]]))).toBe(true);
    expect(algebraicLogIsZero(store, read(['Add', ['Ln', ['Add', 1, ['Sqrt', 2]]], ['Ln', ['Add', -1, ['Sqrt', 2]]]]))).toBe(true);
    expect(algebraicLogIsZero(store, read(['Add', ['Ln', 2], ['Ln', ['Sqrt', 2]]]))).toBe(false);
    expect(algebraicLogIsZero(store, read(['Add', ['Ln', golden], ['Ln', conjugate], 1]))).toBe(false);
    expect(realSign(store, read(['Add', ['Ln', golden], ['Ln', conjugate]]))).toBe(0);
  });
});

group('complex substrate', () => {
  const store = new ExpressionStore(context());
  const read = (json: unknown) => { const r = readExpression(store, json); if (r.kind !== 'ok') throw new Error('read'); return r.value; };
  const show = (json: unknown) => JSON.stringify(writeExpression(store, read(json)));

  it('folds exp(qπi), exp(c·log A) and (A·B)ⁿ for never-zero constants', () => {
    expect(show(exp(['Multiply', 'Pi', I]))).toBe('-1');
    expect(show(exp(['Multiply', ['Rational', 1, 2], 'Pi', I]))).toBe('"ImaginaryUnit"');
    expect(show(exp(['Multiply', ['Rational', 1, 3], 'Pi', I]))).toBe(JSON.stringify(writeExpression(store, read(['Add', ['Rational', 1, 2], ['Multiply', ['Rational', 1, 2], I, ['Sqrt', 3]]]))));
    expect(show(exp(['Add', 'z', ['Multiply', 4, 'Pi', I]]))).toBe('["Exp","z"]');
    expect(show(exp(['Multiply', 2, ['Ln', 'Pi']]))).toBe('["Power","Pi",2]');
    expect(show(['Divide', ['Multiply', 2, 'Pi', I], ['Multiply', 2, 'Pi', I]])).toBe('1');
  });

  it('evaluates exponentials of complex linear forms exactly', () => {
    const exact = (json: unknown) => { const e = evaluateExact(store, read(json), 'complex'); return e.kind === 'exact' ? e.value : undefined; };
    expect(exact(exp(['Add', ['Ln', 2], ['Multiply', 2, 'Pi', I, 3]]))).toEqual({ kind: 'rational', value: rational(store.ctx, 2n) });
    expect(exact(['Sin', ['Multiply', I, ['Ln', 2]]])).toBeDefined(); // i·sinh(ln 2) = 3i/4
    expect(exact(['Add', ['Sin', ['Multiply', I, ['Ln', 2]]], ['Multiply', ['Rational', -3, 4], I]])).toEqual({ kind: 'rational', value: rational(store.ctx, 0n) });
    expect(exact(exp(1))).toBeUndefined();
  });

  it('gives the canonical principal logarithm', () => {
    const log = (json: unknown) => JSON.stringify(writeExpression(store, principalLog(store, read(json)) as never));
    expect(log(-1)).toBe('["Multiply","Pi","ImaginaryUnit"]');
    expect(log(['Multiply', -2, I])).toBe('["Add",["Multiply",["Rational",-1,2],"Pi","ImaginaryUnit"],["Ln",2]]');
    expect(log(['Add', -1, I])).toBe('["Add",["Multiply",["Rational",1,2],["Ln",2]],["Multiply",["Rational",3,4],"Pi","ImaginaryUnit"]]');
  });

  it('encloses complex closed forms (mpmath, 40 digits)', () => {
    const cases: [unknown, string, string][] = [
      [exp(['Add', 1, I]), '1.468693939915885157138967597326604261327', '2.287355287178842391208171906700501808956'],
      [['Ln', ['Add', 1, I]], '0.3465735902799726547086160607290882840378', '0.7853981633974483096156608458198757210493'],
      [['Sin', ['Add', 1, ['Multiply', 2, I]]], '3.165778513216168146740734617191905538379', '1.959601041421605897070352049989358278436'],
      [['Cos', ['Add', 2, ['Multiply', -1, I]]], '-0.6421481247155199648448006869622787894704', '1.068607421382778339597440033783951588665'],
      [['Ln', ['Add', -3, ['Multiply', 4, I]]], '1.609437912434100374600759333226187639526', '2.21429743558818100603413092035707408014'],
      [['Sqrt', ['Add', ['Ln', 2], ['Multiply', 2, 'Pi', I]]], '1.872758673921874827938784793219918126283', '1.677521347163628132444662947221465633944'],
    ];
    const inside = (b: { lo: { numerator: bigint; denominator: bigint }; hi: { numerator: bigint; denominator: bigint } }, digits: string) => {
      const [int, frac = ''] = digits.replace('-', '').split('.'), sign = digits.startsWith('-') ? -1n : 1n;
      const scale = 10n ** BigInt(frac.length), v = sign * BigInt(int + frac);
      const err = 10n; // the reference is rounded in its last digit
      return b.lo.numerator * scale <= (v + err) * b.lo.denominator && (v - err) * b.hi.denominator <= b.hi.numerator * scale
        && (b.hi.numerator * b.lo.denominator - b.lo.numerator * b.hi.denominator) * scale < 1000n * b.lo.denominator * b.hi.denominator;
    };
    for (const [json, re, im] of cases) {
      const box = complexBounds(store, read(json), 192);
      expect(box).toBeDefined();
      expect(inside(box!.re, re)).toBe(true);
      expect(inside(box!.im, im)).toBe(true);
    }
  });
});
