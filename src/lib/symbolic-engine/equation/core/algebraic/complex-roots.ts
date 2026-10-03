import { demand, type ExecutionContext } from '../execution';
import { bitLength, imul } from '../algebra/integer';
import type { Polynomial } from '../algebra/polynomial';
import {
  fxAbsBound, fxDiv, fxEvaluate, fxMul, gNorm, gSub, gaussianTaylorShift, type Fixed, type GaussianInteger,
} from './complex';

/**
 * A certified disk: center (re + im·i)/2^scale, radius at most 2^radiusExponent
 * (null radius exponent: the center is an exact root). Contains at least one root
 * by Smale's α-theorem; pairwise disjointness of deg f disks then proves each
 * contains exactly one.
 */
export interface CertifiedDisk { readonly center: GaussianInteger; readonly scale: number; readonly radiusExponent: number | null }

/** Iterations per precision level before attempting certification; precision then doubles. */
const ABERTH_ROUNDS_PER_PRECISION_PER_DEGREE = 6;
const START_PRECISION = 64;
/** Newton steps tried on an uncertified root before falling back to Aberth; precision then doubles. */
const NEWTON_POLISH_STEPS = 6;

/**
 * Smale α-test, exact. With D = coefficients of F(A + t), F(t) = 2^(s·n)·f(t/2^s),
 * and N_k = |D_k|², the bound log2 α ≤ (L0−L1+1)/2 + max_k (L_k−L1+1)/(2(k−1))
 * (L = bit length) is rigorous. Accept when α < 1/8 < α₀ = (13−3√17)/4.
 */
export function certifyApproximation(ctx: ExecutionContext, f: readonly bigint[], center: GaussianInteger, scale: number): CertifiedDisk | null {
  const n = f.length - 1;
  const F: GaussianInteger[] = f.map((c, i) => ({ re: c << BigInt(scale * (n - i)), im: 0n }));
  const D = gaussianTaylorShift(ctx, F, center);
  const N = D.map(d => gNorm(ctx, d));
  if (N[0] === 0n) return Object.freeze({ center, scale, radiusExponent: null });
  if (N[1] === 0n) return null;
  const L = N.map(x => bitLength(x)), a = L[0] - L[1] + 1;
  for (let k = 2; k <= n; k++) {
    ctx.tick();
    if (N[k] === 0n) continue;
    if (a * (k - 1) + (L[k] - L[1] + 1) >= -6 * (k - 1)) return null;
  }
  return Object.freeze({ center, scale, radiusExponent: 1 + Math.ceil(a / 2) - scale });
}

/** Whether two disks at the same scale are disjoint (exact). */
export function disjoint(ctx: ExecutionContext, x: CertifiedDisk, y: CertifiedDisk): boolean {
  demand(x.scale === y.scale, 'invalid-input', 'disks at different scales');
  const d = gNorm(ctx, gSub(ctx, x.center, y.center));
  if (d === 0n) return false;
  const exps = [x.radiusExponent, y.radiusExponent].filter((e): e is number => e !== null).map(e => e + x.scale);
  if (!exps.length) return true;
  const shift = Math.max(0, -Math.min(...exps));
  const sum = exps.reduce((acc, e) => acc + (1n << BigInt(e + shift)), 0n);
  return imul(ctx, d, 1n << BigInt(2 * shift)) > imul(ctx, sum, sum);
}

/** Whether the disk certainly misses the real axis. */
export function certainlyNonReal(x: CertifiedDisk): boolean {
  if (x.radiusExponent === null) return x.center.im !== 0n;
  const e = x.radiusExponent + x.scale, shift = Math.max(0, -e);
  const im = x.center.im < 0n ? -x.center.im : x.center.im;
  return (im << BigInt(shift)) > (1n << BigInt(e + shift));
}

function initialPoints(f: readonly bigint[], precision: number): Fixed[] {
  const n = f.length - 1, Ln = bitLength(f[n]);
  let log2R = -Infinity;
  for (let i = 0; i < n; i++) if (f[i] !== 0n) log2R = Math.max(log2R, (bitLength(f[i]) - Ln + 1) / (n - i));
  log2R = (Number.isFinite(log2R) ? log2R : 0) + 1;
  const whole = Math.floor(log2R), frac = log2R - whole;
  return Array.from({ length: n }, (_, k) => {
    const theta = (2 * Math.PI * k) / n + 0.4;
    const toFixed = (v: number) => {
      const m = BigInt(Math.round(v * 2 ** frac * 2 ** 40)), shift = whole + precision - 40;
      return shift >= 0 ? m << BigInt(shift) : m >> BigInt(-shift);
    };
    return { re: toFixed(Math.cos(theta)), im: toFixed(Math.sin(theta)) };
  });
}

/** Aberth–Ehrlich rounds (Gauss–Seidel) at a fixed precision. */
function aberth(ctx: ExecutionContext, f: readonly bigint[], z: Fixed[], precision: number): boolean {
  const n = z.length, one: Fixed = { re: 1n << BigInt(precision), im: 0n };
  const target = 1n << BigInt(Math.floor(precision / 4));
  for (let round = 0; round < ABERTH_ROUNDS_PER_PRECISION_PER_DEGREE * n + 30; round++) {
    let largest = 0n;
    for (let k = 0; k < n; k++) {
      const { value, derivative } = fxEvaluate(ctx, f, z[k], precision);
      let newton = fxDiv(ctx, value, derivative, precision);
      if (newton === null) { z[k] = { re: z[k].re + target, im: z[k].im + target }; continue; }
      let sum: Fixed = { re: 0n, im: 0n };
      for (let j = 0; j < n; j++) {
        if (j === k) continue;
        const inv = fxDiv(ctx, one, { re: z[k].re - z[j].re, im: z[k].im - z[j].im }, precision);
        if (inv) sum = { re: sum.re + inv.re, im: sum.im + inv.im };
      }
      const ns = fxMul(ctx, newton, sum, precision);
      const w = fxDiv(ctx, newton, { re: one.re - ns.re, im: -ns.im }, precision);
      if (w) newton = w;
      z[k] = { re: z[k].re - newton.re, im: z[k].im - newton.im };
      const size = fxAbsBound(newton);
      if (size > largest) largest = size;
    }
    if (largest < target) return true;
  }
  return false;
}

/** log2 |v| for a nonzero bigint, accurate to double precision. */
function log2Abs(v: bigint): number {
  const a = v < 0n ? -v : v, drop = Math.max(0, bitLength(a) - 60);
  return Math.log2(Number(a >> BigInt(drop))) + drop;
}

/**
 * Bini's initial points: circles whose radii come from the upper convex hull
 * (Newton polygon) of (i, log2 |aᵢ|), one circle per hull edge.
 */
function newtonPolygonStart(f: readonly bigint[]): [number, number][] {
  const n = f.length - 1;
  const pts = f.map((c, i) => [i, c === 0n ? -Infinity : log2Abs(c)] as const).filter(([, y]) => Number.isFinite(y));
  const hull: (readonly [number, number])[] = [];
  for (const p of pts) {
    while (hull.length >= 2) {
      const [x1, y1] = hull[hull.length - 2], [x2, y2] = hull[hull.length - 1];
      if ((x2 - x1) * (p[1] - y1) - (y2 - y1) * (p[0] - x1) >= 0) hull.pop(); else break;
    }
    hull.push(p);
  }
  const z: [number, number][] = [];
  if (hull[0][0] > 0) for (let k = 0; k < hull[0][0]; k++) z.push([0, 0]);
  for (let e = 0; e + 1 < hull.length; e++) {
    const [i, yi] = hull[e], [j, yj] = hull[e + 1], m = j - i;
    const log2r = (yi - yj) / m;
    for (let k = 0; k < m; k++) {
      const theta = (2 * Math.PI * k) / m + (2 * Math.PI * e) / n + 0.4;
      z.push([2 ** log2r * Math.cos(theta), 2 ** log2r * Math.sin(theta)]);
    }
  }
  return z.length === n ? z.map(([a, b]) => (a === 0 && b === 0 ? [1e-3, 1e-3] : [a, b])) : [];
}

/**
 * Fast first approximations by Aberth iteration in double precision. Newton
 * quotients for |z| > 1 use the reversed polynomial so values never overflow:
 * with q(w) = wⁿ·p(1/w), w = 1/z, p(z)/p'(z) = z·q(w) / (n·q(w) − w·q'(w)).
 * Purely heuristic: returns null on non-finite values; certification decides.
 */
function aberthDouble(f: readonly bigint[], precision: number): Fixed[] | null {
  const n = f.length - 1;
  const top = Math.max(...f.map(c => (c === 0n ? 0 : bitLength(c))));
  const drop = Math.max(0, top - 900);
  const c = f.map(v => Number(v >> BigInt(drop)));
  if (c.some(v => !Number.isFinite(v)) || c[n] === 0) return null;
  const z = newtonPolygonStart(f);
  if (z.length !== n) return null;
  const horner = (coeffs: readonly number[], zr: number, zi: number) => {
    let [vr, vi, dr, di] = [0, 0, 0, 0];
    for (let i = coeffs.length - 1; i >= 0; i--) {
      [dr, di] = [dr * zr - di * zi + vr, dr * zi + di * zr + vi];
      [vr, vi] = [vr * zr - vi * zi + coeffs[i], vr * zi + vi * zr];
    }
    return [vr, vi, dr, di];
  };
  const reversed = [...c].reverse();
  const newton = (zr: number, zi: number): [number, number] | null => {
    if (zr * zr + zi * zi <= 1) {
      const [vr, vi, dr, di] = horner(c, zr, zi), dd = dr * dr + di * di;
      return dd > 0 && Number.isFinite(dd) ? [(vr * dr + vi * di) / dd, (vi * dr - vr * di) / dd] : null;
    }
    const zz = zr * zr + zi * zi, [wr, wi] = [zr / zz, -zi / zz];
    const [qr, qi, qdr, qdi] = horner(reversed, wr, wi);
    const [denr, deni] = [n * qr - (wr * qdr - wi * qdi), n * qi - (wr * qdi + wi * qdr)];
    const [numr, numi] = [zr * qr - zi * qi, zr * qi + zi * qr];
    const dd = denr * denr + deni * deni;
    return dd > 0 && Number.isFinite(dd) ? [(numr * denr + numi * deni) / dd, (numi * denr - numr * deni) / dd] : null;
  };
  for (let round = 0; round < 50 * n + 200; round++) {
    let largest = 0;
    for (let k = 0; k < n; k++) {
      const [zr, zi] = z[k];
      const step = newton(zr, zi);
      if (!step) return null;
      const [nr, ni] = step;
      let [sr, si] = [0, 0];
      for (let j = 0; j < n; j++) {
        if (j === k) continue;
        const [ar, ai] = [zr - z[j][0], zi - z[j][1]], aa = ar * ar + ai * ai;
        if (aa > 0) { sr += ar / aa; si -= ai / aa; }
      }
      const [pr, pi] = [1 - (nr * sr - ni * si), -(nr * si + ni * sr)], pp = pr * pr + pi * pi;
      const [wr, wi] = pp > 0 ? [(nr * pr + ni * pi) / pp, (ni * pr - nr * pi) / pp] : [nr, ni];
      z[k] = [zr - wr, zi - wi];
      const size = Math.abs(wr) + Math.abs(wi);
      largest = Math.max(largest, size / (1 + Math.abs(zr) + Math.abs(zi)));
    }
    if (!Number.isFinite(largest)) return null;
    if (largest < 1e-14) break;
  }
  if (z.some(([a, b]) => !Number.isFinite(a) || !Number.isFinite(b))) return null;
  const toFixed = (v: number) => {
    if (v === 0) return 0n;
    // v = μ·2^e with 1 ≤ |μ| < 2; dividing by the power of two is exact even for subnormal v.
    const e = Math.floor(Math.log2(Math.abs(v))), m = BigInt(Math.round((v / 2 ** e) * 2 ** 52)), shift = e - 52 + precision;
    return shift >= 0 ? m << BigInt(shift) : m >> BigInt(-shift);
  };
  return z.map(([a, b]) => ({ re: toFixed(a), im: toFixed(b) }));
}

/**
 * Certified isolation of all complex roots of a square-free integer polynomial
 * of degree ≥ 1 with exactly `realCount` real roots. Returns deg f pairwise
 * disjoint certified disks; exactly `realCount` of them meet the real axis.
 * Precision doubles until certification succeeds (resource-bounded only).
 */
export function isolateComplexRoots(ctx: ExecutionContext, poly: Polynomial<bigint>, realCount: number): CertifiedDisk[] {
  const f = poly.coefficients, n = f.length - 1;
  demand(n >= 1, 'invalid-input', 'complex isolation needs degree at least one');
  // Precision grows with the root-magnitude bound so large roots keep enough relative accuracy.
  const Ln = bitLength(f[n]);
  let log2R = 0;
  for (let i = 0; i < n; i++) if (f[i] !== 0n) log2R = Math.max(log2R, (bitLength(f[i]) - Ln + 1) / (n - i));
  let precision = START_PRECISION + Math.ceil(log2R), z = aberthDouble(f, precision) ?? initialPoints(f, precision);
  const certifyAll = (): CertifiedDisk[] | null => {
    const disks: (CertifiedDisk | null)[] = z.map(c => certifyApproximation(ctx, f, c, precision));
    // Polish only the roots that failed, by Newton steps from their (already good) approximations.
    for (let k = 0; k < n; k++) {
      for (let step = 0; disks[k] === null && step < NEWTON_POLISH_STEPS; step++) {
        z[k] = newtonStep(ctx, f, z[k], precision);
        disks[k] = certifyApproximation(ctx, f, z[k], precision);
      }
    }
    if (!disks.every((d): d is CertifiedDisk => d !== null)) return null;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (!disjoint(ctx, disks[i], disks[j])) return null;
    return disks.filter(d => !certainlyNonReal(d)).length === realCount ? disks : null;
  };
  for (;;) {
    ctx.tick();
    const direct = certifyAll();
    if (direct) return direct;
    // Fallback: a full Aberth pass separates roots that Newton steps could confuse.
    if (aberth(ctx, f, z, precision)) {
      const iterated = certifyAll();
      if (iterated) return iterated;
    }
    const grow = precision;
    precision *= 2;
    z = z.map(c => ({ re: c.re << BigInt(grow), im: c.im << BigInt(grow) }));
  }
}

/** One Newton step at the given precision. */
export function newtonStep(ctx: ExecutionContext, f: readonly bigint[], z: Fixed, precision: number): Fixed {
  const { value, derivative } = fxEvaluate(ctx, f, z, precision);
  const step = fxDiv(ctx, value, derivative, precision);
  return step ? { re: z.re - step.re, im: z.im - step.im } : z;
}
