import { demand, type ExecutionContext } from '../execution';
import { QQ } from '../algebra/domain';
import { factorQ } from '../algebra/factor';
import { imul, isqrt } from '../algebra/integer';
import { PolynomialRing } from '../algebra/polynomial';
import { integerToRational } from '../algebra/polynomial-division';
import { rAdd, rational, rCompare, rDivide, rMultiply, rSubtract, type Rational } from '../algebra/rational';
import { ALGEBRAIC_RING, refineComplex, refineReal, rootsOfIrreducible, type ComplexRootOf, type RealRootOf, type RootOf } from '../algebraic/root-of';

/**
 * W = e^{iθ} for θ = asin u, acos u or atan u with u real algebraic (minimal polynomial P of degree d), from an
 * annihilating polynomial built directly instead of by algebraic products (whose resultants multiply degrees):
 * with y = u, acos: y = (W² + 1)/(2W), so W^d·P(y) = Σ pₖ(W² + 1)ᵏ(2W)^{d−k} (rational, degree 2d);
 * asin: y = (W² − 1)/(2iW); atan: y = (W² − 1)/(i(W² + 1)): Gaussian polynomials G of degree 2d whose norm G·Ḡ
 * (degree 4d) is rational. One factorization over ℚ, then the root whose region meets a rational box of W
 * (from u's isolating interval: acos (u, √(1 − u²)), asin (√(1 − u²), u), atan (1, u)/√(1 + u²)), refined until
 * exactly one root remains.
 */
type G = { re: bigint[]; im: bigint[] };
const RING = new PolynomialRing(QQ, 'x');

function gAdd(a: G, b: G): G {
  const n = Math.max(a.re.length, b.re.length), at = (v: bigint[], i: number) => v[i] ?? 0n;
  return { re: Array.from({ length: n }, (_, i) => at(a.re, i) + at(b.re, i)), im: Array.from({ length: n }, (_, i) => at(a.im, i) + at(b.im, i)) };
}
function gMul(ctx: ExecutionContext, a: G, b: G): G {
  const n = a.re.length + b.re.length - 1, re = Array<bigint>(n).fill(0n), im = Array<bigint>(n).fill(0n);
  for (let i = 0; i < a.re.length; i++) for (let j = 0; j < b.re.length; j++) {
    ctx.tick();
    re[i + j] += imul(ctx, a.re[i], b.re[j]) - imul(ctx, a.im[i], b.im[j]);
    im[i + j] += imul(ctx, a.re[i], b.im[j]) + imul(ctx, a.im[i], b.re[j]);
  }
  return { re, im };
}
const real = (c: bigint[]): G => ({ re: c, im: c.map(() => 0n) });
const gPow = (ctx: ExecutionContext, a: G, k: number): G => { let r = real([1n]); for (let i = 0; i < k; i++) r = gMul(ctx, r, a); return r; };

function annihilator(ctx: ExecutionContext, fn: 'asin' | 'acos' | 'atan', P: readonly bigint[]): bigint[] {
  const d = P.length - 1, minus = real([-1n, 0n, 1n]), plus = real([1n, 0n, 1n]);
  const [num, den]: [G, G] = fn === 'acos' ? [plus, real([0n, 2n])]
    : fn === 'asin' ? [minus, { re: [0n, 0n], im: [0n, 2n] }]
      : [minus, { re: [0n, 0n, 0n], im: [1n, 0n, 1n] }];
  let g: G = real([0n]);
  P.forEach((p, k) => { g = gAdd(g, gMul(ctx, real([p]), gMul(ctx, gPow(ctx, num, k), gPow(ctx, den, d - k)))); });
  const norm = fn === 'acos' ? g : gMul(ctx, g, { re: g.re, im: g.im.map(v => -v) });
  const out = [...norm.re];
  while (out.length > 1 && out[out.length - 1] === 0n) out.pop();
  return out;
}

type Box = { re: [Rational, Rational]; im: [Rational, Rational] };

function sqrtBounds(ctx: ExecutionContext, lo: Rational, hi: Rational, bits: number): [Rational, Rational] {
  const S = 1n << BigInt(bits), S2 = S * S;
  const down = (q: Rational) => (q.numerator <= 0n ? 0n : isqrt(ctx, (q.numerator * S2) / q.denominator));
  const up = (q: Rational) => isqrt(ctx, (q.numerator * S2 + q.denominator - 1n) / q.denominator) + 1n;
  return [rational(ctx, down(lo), S), rational(ctx, up(hi), S)];
}

function box(ctx: ExecutionContext, fn: 'asin' | 'acos' | 'atan', lo: Rational, hi: Rational, bits: number): Box {
  const one = rational(ctx, 1n), sq = (v: Rational) => rMultiply(ctx, v, v);
  const sqLo = lo.numerator >= 0n ? sq(lo) : hi.numerator <= 0n ? sq(hi) : rational(ctx, 0n);
  const sqHi = rCompare(ctx, sq(lo), sq(hi)) > 0 ? sq(lo) : sq(hi);
  if (fn !== 'atan') {
    const restLo = rSubtract(ctx, one, sqHi), restHi = rSubtract(ctx, one, sqLo);
    const s = sqrtBounds(ctx, restLo.numerator < 0n ? rational(ctx, 0n) : restLo, restHi, bits);
    return fn === 'acos' ? { re: [lo, hi], im: s } : { re: s, im: [lo, hi] };
  }
  const [sl, sh] = sqrtBounds(ctx, rAdd(ctx, one, sqLo), rAdd(ctx, one, sqHi), bits);
  const imLo = lo.numerator >= 0n ? rDivide(ctx, lo, sh) : rDivide(ctx, lo, sl), imHi = hi.numerator <= 0n ? rDivide(ctx, hi, sh) : rDivide(ctx, hi, sl);
  return { re: [rDivide(ctx, one, sh), rDivide(ctx, one, sl)], im: [imLo, imHi] };
}

function meets(ctx: ExecutionContext, r: RootOf, b: Box): boolean {
  if (r.kind === 'real') return rCompare(ctx, r.lo, b.re[1]) <= 0 && rCompare(ctx, b.re[0], r.hi) <= 0 && b.im[0].numerator <= 0n && b.im[1].numerator >= 0n;
  const gap = (c: Rational, [l, h]: [Rational, Rational]) => (rCompare(ctx, c, l) < 0 ? rSubtract(ctx, l, c) : rCompare(ctx, h, c) < 0 ? rSubtract(ctx, c, h) : rational(ctx, 0n));
  const dx = gap(r.re, b.re), dy = gap(r.im, b.im);
  return rCompare(ctx, rAdd(ctx, rMultiply(ctx, dx, dx), rMultiply(ctx, dy, dy)), rMultiply(ctx, r.radius, r.radius)) <= 0;
}

/** e^{i·arc(u)} as a root, for u rational or real algebraic inside the arc's domain (checked by the caller). */
export function arcUnitRoot(ctx: ExecutionContext, fn: 'asin' | 'acos' | 'atan', u: { kind: 'rational'; value: Rational } | { kind: 'real'; root: RealRootOf }): RootOf {
  const P = u.kind === 'rational' ? [-u.value.numerator, u.value.denominator] : [...u.root.poly.coefficients];
  let candidates = factorQ(ctx, RING, integerToRational(ctx, RING, ALGEBRAIC_RING.make(ctx, annihilator(ctx, fn, P))), ALGEBRAIC_RING).factors
    .flatMap(({ factor }) => rootsOfIrreducible(ctx, factor));
  let current = u;
  for (let bits = 32; ; bits *= 2) {
    ctx.tick();
    const width = rational(ctx, 1n, 1n << BigInt(bits));
    if (current.kind === 'real') current = { kind: 'real', root: refineReal(ctx, current.root, width) };
    const [lo, hi] = current.kind === 'rational' ? [current.value, current.value] : [current.root.lo, current.root.hi];
    const b = box(ctx, fn, lo, hi, bits + 4);
    candidates = candidates.filter(c => meets(ctx, c, b));
    demand(candidates.length > 0, 'verification-failed', 'the unit point is among the annihilator roots');
    if (candidates.length === 1) return candidates[0];
    candidates = candidates.map(c => (c.kind === 'real' ? refineReal(ctx, c, width) : refineComplex(ctx, c as ComplexRootOf, width)));
  }
}
