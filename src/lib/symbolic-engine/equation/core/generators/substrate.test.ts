import { describe, expect, it } from 'vitest';
import { iroot, perfectPower } from '../algebra/integer';
import { rational, type Rational } from '../algebra/rational';
import { context, seeded } from '../test-support';
import { enclose, expBounds, lambertBounds, logBounds } from '../representation/enclosure';
import { ExpressionStore, type ExprId } from '../representation/expression';
import { readExpression, writeExpression } from '../representation/mathjson';
import { realCompare, realSign } from '../representation/real-order';
import { compareValues } from '../representation/solution-set';
import { decodeExpression, encodeExpression } from '../representation/wire';
import { coprimeBase, isZero, parseLogLinear, ratio, singleLogTerm } from './constants';
import { lambertIntegerSolutions } from './lambert';

const store = () => new ExpressionStore(context());
const mj = (s: ExpressionStore, id: ExprId) => JSON.stringify(writeExpression(s, id));

/** The enclosure at 100 bits lies within one last-digit unit of a reference decimal (Python mpmath). */
function near(s: ExpressionStore, id: ExprId, reference: string) {
  const [int, frac = ''] = reference.replace('-', '').split('.');
  const sign = reference.startsWith('-') ? -1n : 1n;
  const scale = 10n ** BigInt(frac.length);
  // Tolerance: one unit in the reference's last printed digit.
  const r = rational(s.ctx, sign * BigInt(int + frac), scale), eps = rational(s.ctx, 1n, scale);
  const b = enclose(s, id, 100);
  expect(b.kind).toBe('bounds');
  if (b.kind !== 'bounds') return;
  const le = (a: Rational, c: Rational) => a.numerator * c.denominator <= c.numerator * a.denominator;
  const plus = rational(s.ctx, r.numerator * eps.denominator + eps.numerator * r.denominator, r.denominator * eps.denominator);
  const minus = rational(s.ctx, r.numerator * eps.denominator - eps.numerator * r.denominator, r.denominator * eps.denominator);
  expect(le(b.lo, plus) && le(minus, b.hi)).toBe(true);
}

describe('integer roots and perfect powers', () => {
  it('are exact and bounded by bit length', () => {
    const ctx = context(), rand = seeded(7);
    for (let i = 0; i < 40; i++) {
      const n = rand.big(200) * rand.big(200), k = rand.int(1, 9), m = n < 0n ? -n : n;
      const r = iroot(ctx, m, k);
      expect(r ** BigInt(k) <= m && (r + 1n) ** BigInt(k) > m).toBe(true);
    }
    expect(perfectPower(ctx, 2n ** 60n)).toEqual({ root: 2n, exponent: 60 });
    expect(perfectPower(ctx, 6n ** 4n)).toEqual({ root: 6n, exponent: 4 });
    expect(perfectPower(ctx, 12n)).toEqual({ root: 12n, exponent: 1 });
  });
});

describe('canonical logarithms and exponentials', () => {
  it('fold number-only logs and exps exactly', () => {
    const s = store(), x = s.symbol('x'), log = (q: number, d = 1) => s.log(s.fraction(q, d));
    expect(mj(s, log(8))).toBe('["Multiply",3,["Ln",2]]');
    expect(mj(s, log(1, 4))).toBe('["Multiply",-2,["Ln",2]]');
    expect(mj(s, log(36, 49))).toBe('["Multiply",-2,["Ln",["Rational",7,6]]]'); // q < 1: −log(1/q)
    expect(s.div(log(8), log(2))).toBe(s.integer(3));
    expect(mj(s, s.log(s.sqrt(s.integer(2))))).toBe('["Multiply",["Rational",1,2],["Ln",2]]');
    expect(s.exp(log(3))).toBe(s.integer(3));
    expect(s.exp(s.mul(s.integer(-2), log(3)))).toBe(s.fraction(1, 9));
    expect(s.log(s.exp(log(5)))).toBe(log(5));
    expect(s.exp(s.add(x, log(2)))).toBe(s.mul(s.integer(2), s.exp(x)));
    expect(s.mul(s.exp(x), s.exp(s.neg(x)))).toBe(s.integer(1));
    expect(s.mul(s.exp(x), s.exp(x))).toBe(s.exp(s.mul(s.integer(2), x)));
    expect(s.pow(s.mul(s.integer(-2), x), s.integer(-1))).toBe(s.mul(s.fraction(-1, 2), s.pow(x, s.integer(-1))));
    // Domains are still kept: x/x is not cancelled, nor 0·log x.
    expect(s.node(s.div(x, x)).kind).toBe('mul');
    expect(s.node(s.mul(s.integer(0), s.log(x))).kind).toBe('mul');
  });

  it('fold W(s·eˢ) = s on the matching branch', () => {
    const s = store(), e = (q: number) => s.exp(s.integer(q));
    expect(s.lambertW(e(1))).toBe(s.integer(1));
    expect(s.lambertW(s.mul(s.integer(-1), e(-1)))).toBe(s.integer(-1));
    expect(s.lambertW(s.mul(s.integer(-1), e(-1)), -1)).toBe(s.integer(-1));
    expect(s.lambertW(s.mul(s.integer(-2), e(-2)), -1)).toBe(s.integer(-2));
    expect(s.node(s.lambertW(s.mul(s.integer(-2), e(-2)))).kind).toBe('apply'); // W₀(−2e⁻²) ≠ −2
    expect(s.lambertW(s.integer(0))).toBe(s.integer(0));
  });

  it('round-trip LambertW through MathJSON and the wire', () => {
    const s = store();
    for (const json of [['LambertW', 1], ['LambertW', ['Multiply', ['Rational', -1, 4], ['Exp', -1]], -1]]) {
      const r = readExpression(s, json);
      expect(r.kind).toBe('ok');
      if (r.kind !== 'ok') continue;
      expect(writeExpression(s, r.value)).toEqual(json);
      const back = decodeExpression(context(), JSON.parse(JSON.stringify(encodeExpression(s, r.value))));
      expect(writeExpression(back.store, back.id)).toEqual(json);
    }
    expect(readExpression(s, ['LambertW', 1, 2])).toMatchObject({ kind: 'unsupported', head: 'LambertW' });
  });
});

describe('certified enclosures', () => {
  it('match independent references', () => {
    const s = store(), e = s.constant('e');
    near(s, e, '2.718281828459045235360287');
    near(s, s.constant('pi'), '3.141592653589793238462643');
    near(s, s.log(s.integer(2)), '0.6931471805599453094172321');
    near(s, s.exp(s.exp(e)), '3814279.10476022059220922');
    near(s, s.lambertW(s.integer(1)), '0.5671432904097838729999687');
    const k = s.mul(s.fraction(-1, 2), s.exp(s.integer(-1)));
    near(s, s.lambertW(k, -1), '-2.678346990016660653412885');
    near(s, s.lambertW(k), '-0.2319609529865344347443165');
    near(s, s.exp(s.root(s.integer(4), 3)), '4.891020886624697146343337');
  });

  it('are sound on seeded identities: log(exp q) ∋ q, exp(log q) ∋ q, W(q·e^q) ∋ q', () => {
    const ctx = context(), rand = seeded(11);
    const contains = (b: { lo: Rational; hi: Rational }, q: Rational) =>
      b.lo.numerator * q.denominator <= q.numerator * b.lo.denominator && q.numerator * b.hi.denominator <= b.hi.numerator * q.denominator;
    for (let i = 0; i < 25; i++) {
      const q = rational(ctx, BigInt(rand.int(-4000, 4000)), BigInt(rand.int(1, 997)));
      const e = expBounds(ctx, q, 80), l = logBounds(ctx, e.lo, 80), h = logBounds(ctx, e.hi, 80);
      expect(contains({ lo: l.lo, hi: h.hi }, q)).toBe(true);
      if (q.numerator > 0n) {
        const lg = logBounds(ctx, q, 80);
        expect(contains({ lo: expBounds(ctx, lg.lo, 80).lo, hi: expBounds(ctx, lg.hi, 80).hi }, q)).toBe(true);
      }
      if (q.numerator * 1n >= -q.denominator && q.numerator < 3n * q.denominator) {
        const f = expBounds(ctx, q, 120);
        const K1 = rational(ctx, q.numerator * f.lo.numerator, q.denominator * f.lo.denominator), K2 = rational(ctx, q.numerator * f.hi.numerator, q.denominator * f.hi.denominator);
        const [Klo, Khi] = K1.numerator * K2.denominator <= K2.numerator * K1.denominator ? [K1, K2] : [K2, K1];
        expect(contains({ lo: lambertBounds(ctx, Klo, 0, 60).lo, hi: lambertBounds(ctx, Khi, 0, 60).hi }, q)).toBe(true);
      }
    }
  });

  it('order and sign closed forms exactly', () => {
    const s = store(), e = s.constant('e'), pi = s.constant('pi');
    expect(realSign(s, s.sub(s.exp(pi), s.pow(pi, e)))).toBe(1);
    expect(realCompare(s, s.log(s.integer(3)), s.integer(1))).toBe(1);
    expect(realSign(s, s.sub(s.log(s.integer(4)), s.mul(s.integer(2), s.log(s.integer(2)))))).toBe(0);
    const pts = [s.integer(1), s.log(s.integer(2)), e].map(id => ({ kind: 'expression' as const, id }));
    expect(compareValues(s, pts[1], pts[0])).toBeLessThan(0);
    expect(compareValues(s, pts[2], pts[0])).toBeGreaterThan(0);
  });
});

describe('log-linear constants', () => {
  it('decide dependence through a coprime base', () => {
    const s = store(), ctx = s.ctx, L = (id: ExprId) => parseLogLinear(s, id)!;
    expect(coprimeBase(ctx, [6n, 4n, 9n, 35n])).toEqual([2n, 3n, 35n]); // 35 is already coprime: nothing is factored
    const ln = (q: number) => s.log(s.integer(q));
    expect(ratio(ctx, L(s.mul(s.integer(3), ln(8))), L(ln(2)))).toEqual(rational(ctx, 9n));
    expect(isZero(ctx, L(s.sub(ln(6), s.add(ln(2), ln(3)))))).toBe(true);
    expect(isZero(ctx, L(s.sub(ln(6), ln(5))))).toBe(false);
    expect(ratio(ctx, L(ln(3)), L(ln(2)))).toBeUndefined();
    expect(singleLogTerm(ctx, L(s.add(ln(2), ln(3))))).toBeUndefined();
    expect(singleLogTerm(ctx, L(s.mul(s.fraction(-1, 2), ln(2))))).toEqual({ coefficient: rational(ctx, -1n, 2n), base: rational(ctx, 2n) });
  });

  it('find every integer m with m·bᵐ = R (exact W simplification)', () => {
    const ctx = context();
    expect(lambertIntegerSolutions(ctx, rational(ctx, -1n, 2n), 2n)).toEqual([-1n, -2n]);
    expect(lambertIntegerSolutions(ctx, rational(ctx, 3n), 3n)).toEqual([1n]);
    expect(lambertIntegerSolutions(ctx, rational(ctx, 2n), 2n)).toEqual([1n]);
    expect(lambertIntegerSolutions(ctx, rational(ctx, 5n), 2n)).toEqual([]);
    expect(lambertIntegerSolutions(ctx, rational(ctx, -1n, 3n), 3n)).toEqual([-1n]);
  });
});
