import { demand, type ExecutionContext } from '../execution';
import { QQ } from '../algebra/domain';
import { factorQ } from '../algebra/factor';
import { imul } from '../algebra/integer';
import { PolynomialRing } from '../algebra/polynomial';
import { integerToRational } from '../algebra/polynomial-division';
import { rAdd, rational, rCompare, rDivide, rMultiply, rNegate, rSubtract, type Rational } from '../algebra/rational';
import { ALGEBRAIC_RING, refineComplex, refineReal, rootsOfIrreducible, type ComplexRootOf, type RealRootOf, type RootOf } from '../algebraic/root-of';

/**
 * Re W = cos θ and Im W = sin θ of a non-real algebraic W on the unit circle, without resultants. W's minimal
 * polynomial P (degree d = 2m) is then self-reciprocal, so W^{−m}·P(W) = c_m + Σₖ c_{m+k}·(Wᵏ + W⁻ᵏ) = Q(W + W⁻¹)
 * with Wᵏ + W⁻ᵏ = Dₖ(s) (Dickson: D₀ = 2, D₁ = s, Dₖ = s·Dₖ₋₁ − Dₖ₋₂): cos θ is a root of C(x) = Q(2x), of degree
 * m. With C(x) = E(x²) + x·O(x²), sin θ is a root of E(1 − y²)² − (1 − y²)·O(1 − y²)², of degree d. Each is
 * factored once and the root chosen by W's certified disk. |W| = 1 is certified exactly: W̄ and 1/W are both roots
 * of P, equal exactly when they select the same root of P's deterministic isolation. Undefined off the circle.
 */
const RING = new PolynomialRing(QQ, 'x');
const cache = new WeakMap<ComplexRootOf, { re: RootOf; im: RootOf } | null>();

export function unitCircleParts(ctx: ExecutionContext, w: ComplexRootOf): { re: RootOf; im: RootOf } | undefined {
  if (cache.has(w)) return cache.get(w) ?? undefined;
  const parts = compute(ctx, w);
  cache.set(w, parts ?? null);
  return parts;
}

function compute(ctx: ExecutionContext, w: ComplexRootOf): { re: RootOf; im: RootOf } | undefined {
  const c = w.poly.coefficients, d = c.length - 1;
  if (d % 2 !== 0 || !c.every((v, i) => v === c[d - i]) || !onCircle(ctx, w)) return undefined;
  const m = d / 2;
  // Q(s) = c_m + Σ c_{m+k}·D_k(s) with integer polynomial coefficients (ascending).
  const add = (a: bigint[], b: bigint[]) => Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? 0n) + (b[i] ?? 0n));
  const scale = (a: bigint[], k: bigint) => a.map(v => imul(ctx, v, k));
  let prev = [2n], cur = [0n, 1n], Q = [c[m]];
  for (let k = 1; k <= m; k++) {
    ctx.tick();
    if (k > 1) { const next = add([0n, ...cur], scale(prev, -1n)); prev = cur; cur = next; }
    Q = add(Q, scale(cur, c[m + k]));
  }
  const C = Q.map((v, i) => v * (1n << BigInt(i)));
  // E and O from C(x) = E(x²) + x·O(x²); S(y) = E(1 − y²)² − (1 − y²)·O(1 − y²)².
  const E = C.filter((_, i) => i % 2 === 0), O = C.filter((_, i) => i % 2 === 1);
  const at = (p: bigint[]) => p.reduceRight((acc, v) => add(mul(ctx, acc, [1n, 0n, -1n]), [v]), [0n] as bigint[]);
  const e = at(E), o = at(O);
  const S = add(mul(ctx, e, e), scale(mul(ctx, [1n, 0n, -1n], mul(ctx, o, o)), -1n));
  const re = pick(ctx, C, w, 're'), im = pick(ctx, S, w, 'im');
  return { re, im };
}

function mul(ctx: ExecutionContext, a: bigint[], b: bigint[]): bigint[] {
  const out = Array<bigint>(a.length + b.length - 1).fill(0n);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) out[i + j] += imul(ctx, a[i], b[j]);
  return out;
}

/** The real root of p in the coordinate's interval of W's disk, refined until unique. */
function pick(ctx: ExecutionContext, p: bigint[], w: ComplexRootOf, part: 're' | 'im'): RootOf {
  const trimmed = [...p];
  while (trimmed.length > 1 && trimmed[trimmed.length - 1] === 0n) trimmed.pop();
  let candidates = factorQ(ctx, RING, integerToRational(ctx, RING, ALGEBRAIC_RING.make(ctx, trimmed)), ALGEBRAIC_RING).factors
    .flatMap(({ factor }) => rootsOfIrreducible(ctx, factor)).filter((r): r is RealRootOf => r.kind === 'real');
  let disk = w;
  for (let bits = 16; ; bits *= 2) {
    ctx.tick();
    const centre = part === 're' ? disk.re : disk.im, lo = rSubtract(ctx, centre, disk.radius), hi = rAdd(ctx, centre, disk.radius);
    candidates = candidates.filter(r => rCompare(ctx, r.lo, hi) <= 0 && rCompare(ctx, lo, r.hi) <= 0);
    demand(candidates.length > 0, 'verification-failed', 'the part is among the candidate roots');
    if (candidates.length === 1) return candidates[0];
    const width = rational(ctx, 1n, 1n << BigInt(bits));
    disk = refineComplex(ctx, disk, width);
    candidates = candidates.map(r => refineReal(ctx, r, width));
  }
}

/** |W| = 1 exactly: the roots of P selected by the disks of W̄ and of 1/W are the same root. */
function onCircle(ctx: ExecutionContext, w: ComplexRootOf): boolean {
  const roots = rootsOfIrreducible(ctx, w.poly).filter((r): r is ComplexRootOf => r.kind === 'complex');
  const meets = (r: ComplexRootOf, re: Rational, im: Rational, radius: Rational) => {
    const dx = rSubtract(ctx, r.re, re), dy = rSubtract(ctx, r.im, im), s = rAdd(ctx, r.radius, radius);
    return rCompare(ctx, rAdd(ctx, rMultiply(ctx, dx, dx), rMultiply(ctx, dy, dy)), rMultiply(ctx, s, s)) <= 0;
  };
  let disk = w, pool = roots;
  for (let bits = 16; ; bits *= 2) {
    ctx.tick();
    // W ∈ disk(c, ρ) gives 1/W ∈ disk(c̄/|c|², ρ/(|c|² − ρ·B)) with B = |Re c| + |Im c| ≥ |c|, when |c|² > ρ·B.
    const n2 = rAdd(ctx, rMultiply(ctx, disk.re, disk.re), rMultiply(ctx, disk.im, disk.im));
    const B = rAdd(ctx, disk.re.numerator < 0n ? rNegate(ctx, disk.re) : disk.re, disk.im.numerator < 0n ? rNegate(ctx, disk.im) : disk.im);
    const low = rSubtract(ctx, n2, rMultiply(ctx, disk.radius, B));
    if (low.numerator > 0n) {
      const conjugate = pool.filter(r => meets(r, disk.re, rNegate(ctx, disk.im), disk.radius));
      const inverse = pool.filter(r => meets(r, rDivide(ctx, disk.re, n2), rDivide(ctx, rNegate(ctx, disk.im), n2), rDivide(ctx, disk.radius, low)));
      // P is self-reciprocal, so 1/W is a root of P as W̄ is: each disk ends up selecting exactly one root.
      if (conjugate.length === 1 && inverse.length === 1) return conjugate[0] === inverse[0];
    }
    const width = rational(ctx, 1n, 1n << BigInt(bits));
    disk = refineComplex(ctx, disk, width);
    pool = pool.map(r => refineComplex(ctx, r, width));
  }
}
