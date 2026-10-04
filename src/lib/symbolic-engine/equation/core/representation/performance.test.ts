import { describe as group, expect, it } from 'vitest';
import { context, seeded } from '../test-support';
import { ZZ, QQ } from '../algebra/domain';
import { PolynomialRing } from '../algebra/polynomial';
import { factorQ } from '../algebra/factor';
import { bitLength, limbs } from '../algebra/integer';
import { rational, rDyadic, type Rational } from '../algebra/rational';
import { enclose, sinCosBounds } from './enclosure';
import { ExpressionStore } from './expression';
import { readExpression } from './mathjson';
import { realSign } from './real-order';
import { evaluateExact, type ExactValue } from './evaluate';
import { signAt, vanishesAt } from '../decision/algebraic-coefficients';

/** Gate-12 substrate: cheap cost accounting, dyadic rationals, fixed-point trig series, per-store caches. */
const ctx = context();
const big = (bits: number, seed: number) => { let v = 1n; for (let i = 0; i < bits; i++) v = (v << 1n) | BigInt((seed * (i + 7)) % 3 === 0 ? 1 : 0); return v; };

group('cost accounting', () => {
  it('limbs is a power of two within a factor 2 of the exact 64-bit limb count, for both signs', () => {
    for (const bits of [1, 63, 64, 65, 128, 129, 1000, 4096, 10_001]) {
      for (const v of [big(bits, bits), -big(bits, bits)]) {
        const exact = Math.max(1, Math.ceil(bitLength(v) / 64)), l = limbs(context(), v);
        expect(l >= exact && l < 2 * exact + (exact === 1 ? 1 : 0)).toBe(true);
        expect(Number.isInteger(Math.log2(l))).toBe(true);
      }
    }
  });

  it('rDyadic is the reduced n/2^k', () => {
    for (const [n, k] of [[0n, 5], [12n, 4], [-40n, 3], [1n << 100n, 70], [7n, 0], [3n << 64n, 200]] as const) {
      const d = rDyadic(ctx, n, k), r = rational(ctx, n, 1n << BigInt(k));
      expect([d.numerator, d.denominator]).toEqual([r.numerator, r.denominator]);
    }
  });
});

// Reference values: Python mpmath at 80 digits.
const REF: [string, string, string][] = [
  ['1/3', '0.327194696796152244173344085267620606064301406893759791590056', '0.944956946314737664388284007675880607845852699565140737677646'],
  ['-7/10', '-0.644217687237691053672614351398720183065813844573689644743963', '0.764842187284488426255859990191864909268210550373703356072932'],
  ['999/1000', '0.840930261856621404085550522647715566049312697033649709526033', '0.54114350656157203531066645059386135874063483591037681036562'],
];
const decimal = (s: string): Rational => {
  const neg = s.startsWith('-'), [i, f] = s.replace('-', '').split('.');
  const n = BigInt(i + f) * (neg ? -1n : 1n);
  return rational(ctx, n, 10n ** BigInt(f.length));
};
const inside = (lo: Rational, hi: Rational, v: Rational, slack: Rational) =>
  lo.numerator * v.denominator * slack.denominator <= (v.numerator * slack.denominator + slack.numerator * v.denominator) * lo.denominator
  && (v.numerator * slack.denominator - slack.numerator * v.denominator) * hi.denominator <= hi.numerator * v.denominator * slack.denominator;

group('fixed-point trig series', () => {
  it.each(REF)('sin and cos at %s contain mpmath values at 64, 128 and 180 bits', (q, s, c) => {
    const [n, d] = q.split('/').map(BigInt), x = rational(ctx, n, d);
    // The 60-digit references are themselves exact to 10^−60 (< 2^−199).
    const slack = rational(ctx, 1n, 10n ** 60n);
    for (const bits of [64, 128, 180]) {
      const sb = sinCosBounds(ctx, 'sin', x, bits), cb = sinCosBounds(ctx, 'cos', x, bits);
      expect(inside(sb.lo, sb.hi, decimal(s), slack)).toBe(true);
      expect(inside(cb.lo, cb.hi, decimal(c), slack)).toBe(true);
      // Width at most a few units of 2^−bits.
      const w = (b: { lo: Rational; hi: Rational }) => (b.hi.numerator * b.lo.denominator - b.lo.numerator * b.hi.denominator) * (1n << BigInt(bits)) <= 16n * b.lo.denominator * b.hi.denominator;
      expect(w(sb) && w(cb)).toBe(true);
    }
  });
});

group('per-store caches', () => {
  it('repeated enclosures and signs on one store return identical results', () => {
    const store = new ExpressionStore(context());
    const r = readExpression(store, ['Add', ['Sin', ['Sin', ['Sin', 1]]], ['Negate', ['Rational', 7, 10]]]);
    if (r.kind !== 'ok') throw new Error(JSON.stringify(r));
    const a = enclose(store, r.value, 96), b = enclose(store, r.value, 96);
    expect(b).toEqual(a);
    expect(realSign(store, r.value)).toBe(realSign(store, r.value));
    // A fresh store computes the same facts.
    const other = new ExpressionStore(context()), r2 = readExpression(other, ['Add', ['Sin', ['Sin', ['Sin', 1]]], ['Negate', ['Rational', 7, 10]]]);
    if (r2.kind !== 'ok') throw new Error('parse');
    expect(enclose(other, r2.value, 96)).toEqual(a);
  });

  it('caches are per store and context: the same question charges the same work in every fresh context', () => {
    const usage = () => {
      const store = new ExpressionStore(context()), r = readExpression(store, ['Add', ['Multiply', 'Pi', ['Sin', ['Rational', 1, 3]]], ['Negate', 1]]);
      if (r.kind !== 'ok') throw new Error('parse');
      realSign(store, r.value);
      return store.ctx.usage;
    };
    const first = usage();
    expect(usage()).toEqual(first);
  });
});

group('fixed-point disk evaluation', () => {
  it('decides zeros and signs of polynomials with algebraic coefficients at algebraic points', () => {
    const store = new ExpressionStore(context()), c = store.ctx;
    const value = (json: unknown): ExactValue => {
      const r = readExpression(store, json);
      if (r.kind !== 'ok') throw new Error('parse');
      const v = evaluateExact(store, r.value, 'real');
      if (v.kind !== 'exact') throw new Error(v.kind);
      return v.value;
    };
    const q = (n: bigint, d = 1n): ExactValue => ({ kind: 'rational', value: rational(c, n, d) });
    const s2 = value(['Sqrt', 2]), s3 = value(['Sqrt', 3]), m = value(['Negate', ['Sqrt', 2]]);
    expect(vanishesAt(c, [q(-2n), q(0n), q(1n)], s2)).toBe(true);
    expect(vanishesAt(c, [m, q(1n)], s2)).toBe(true);
    expect(signAt(c, [value(['Negate', ['Sqrt', 3]]), q(1n)], s2)).toBe(-1);
    // x² − 2 + 10⁻³⁰ at √2: positive, though tiny.
    expect(signAt(c, [q(-2n * 10n ** 30n + 1n, 10n ** 30n), q(0n), q(1n)], s2)).toBe(1);
    // (√2 + √3)² − 5 − 2√6 = 0 written as x² + 0·x + (−5 − 2√6) at √2 + √3.
    expect(vanishesAt(c, [value(['Add', -5, ['Multiply', -2, ['Sqrt', 6]]]), q(0n), q(1n)], value(['Add', ['Sqrt', 2], ['Sqrt', 3]]))).toBe(true);
    expect(signAt(c, [m, q(1n)], s3)).toBe(1);
  });
});

group('integer polynomial products and factorization reuse', () => {
  it('Kronecker products equal the schoolbook product on random signed inputs', () => {
    const rand = seeded(12), z = new PolynomialRing(ZZ, 'x');
    for (const [n, m, bits] of [[4, 4, 3], [5, 30, 64], [40, 41, 300], [100, 7, 1000], [60, 60, 1]] as const) {
      const a = Array.from({ length: n }, () => rand.big(bits)), b = Array.from({ length: m }, () => rand.big(bits));
      const naive = Array.from({ length: n + m - 1 }, () => 0n);
      a.forEach((x, i) => b.forEach((y, j) => { naive[i + j] += x * y; }));
      while (naive.length && naive[naive.length - 1] === 0n) naive.pop();
      expect(z.multiply(ctx, z.make(ctx, a), z.make(ctx, b)).coefficients).toEqual(naive);
      // Over ℚ, with denominators: the same product, divided by the two scales.
      const q = new PolynomialRing(QQ, 'x'), da = BigInt(n + 1), db = BigInt(m + 2);
      const qa = q.make(ctx, a.map(v => rational(ctx, v, da))), qb = q.make(ctx, b.map(v => rational(ctx, v, db)));
      expect(q.multiply(ctx, qa, qb).coefficients.map(r => `${r.numerator}/${r.denominator}`)).toEqual(naive.map(v => { const r = rational(ctx, v, da * db); return `${r.numerator}/${r.denominator}`; }));
    }
  });

  it('a reused factorization is rebuilt in the caller’s ring and equals a fresh one', () => {
    const c = context(), q = new PolynomialRing(QQ, 'x');
    const f = q.make(c, [-6n, 11n, -6n, 1n, 0n, 1n].map(v => rational(c, v, 3n)));
    const z1 = new PolynomialRing(ZZ, 'x'), z2 = new PolynomialRing(ZZ, 'x');
    const first = factorQ(c, q, f, z1), again = factorQ(c, q, f, z2), fresh = factorQ(context(), q, f, z1);
    expect(again.factors.every(g => g.factor.ring === z2)).toBe(true);
    const show = (r: typeof first) => [`${r.unit.numerator}/${r.unit.denominator}`, ...r.factors.map(g => `${g.factor.coefficients.join(',')}^${g.multiplicity}`)];
    expect(show(again)).toEqual(show(first));
    expect(show(fresh)).toEqual(show(first));
  });
});
