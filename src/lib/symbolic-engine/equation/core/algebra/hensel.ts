import { demand, type ExecutionContext } from '../execution';
import { ZZ } from './domain';
import { fpExtGcd, fpMul, fpScale, type Fp } from './finite-field';
import { imul, irem } from './integer';
import { multiplyArrays } from './polynomial';

/** Polynomials over ℤ/m as ascending arrays of residues in [0, m). */
type Zm = bigint[];

function trim(a: Zm): Zm { while (a.length && a[a.length - 1] === 0n) a.pop(); return a; }
function reduce(ctx: ExecutionContext, a: readonly bigint[], m: bigint): Zm {
  return trim(a.map(c => { const r = irem(ctx, c, m); return r < 0n ? r + m : r; }));
}
function add(ctx: ExecutionContext, a: Zm, b: Zm, m: bigint): Zm {
  const n = Math.max(a.length, b.length);
  return reduce(ctx, Array.from({ length: n }, (_, i) => (a[i] ?? 0n) + (b[i] ?? 0n)), m);
}
function sub(ctx: ExecutionContext, a: Zm, b: Zm, m: bigint): Zm {
  const n = Math.max(a.length, b.length);
  return reduce(ctx, Array.from({ length: n }, (_, i) => (a[i] ?? 0n) - (b[i] ?? 0n)), m);
}
function mul(ctx: ExecutionContext, a: Zm, b: Zm, m: bigint): Zm { return reduce(ctx, multiplyArrays(ZZ, ctx, a, b), m); }

/** Division by a monic divisor over ℤ/m. */
function divRemMonic(ctx: ExecutionContext, a: Zm, b: Zm, m: bigint): { q: Zm; r: Zm } {
  demand(b.length > 0 && b[b.length - 1] === 1n, 'invalid-input', 'monic divisor modulo m');
  const r = [...a], db = b.length - 1;
  const q = new Array<bigint>(Math.max(0, r.length - db)).fill(0n);
  ctx.allocate(q.length + r.length);
  for (let k = r.length - 1; k >= db; k--) {
    const c = r[k];
    if (c === 0n) continue;
    q[k - db] = c;
    for (let j = 0; j <= db; j++) r[k - db + j] = r[k - db + j] - imul(ctx, c, b[j]);
    r[k] = 0n;
    for (let j = 0; j < db; j++) { const v = irem(ctx, r[k - db + j], m); r[k - db + j] = v < 0n ? v + m : v; }
  }
  return { q: reduce(ctx, q, m), r: reduce(ctx, r.slice(0, db), m) };
}

/**
 * One quadratic Hensel step (von zur Gathen–Gerhard, Algorithm 15.10):
 * from f ≡ g·h, s·g + t·h ≡ 1 (mod m), h monic, to the same identities mod m².
 */
function henselStep(ctx: ExecutionContext, f: Zm, g: Zm, h: Zm, s: Zm, t: Zm, m: bigint) {
  const M = imul(ctx, m, m);
  const e = sub(ctx, reduce(ctx, f, M), mul(ctx, g, h, M), M);
  const { q, r } = divRemMonic(ctx, mul(ctx, s, e, M), h, M);
  const g2 = add(ctx, add(ctx, g, mul(ctx, t, e, M), M), mul(ctx, q, g, M), M);
  const h2 = add(ctx, h, r, M);
  const b = sub(ctx, add(ctx, mul(ctx, s, g2, M), mul(ctx, t, h2, M), M), [1n], M);
  const { q: c, r: d } = divRemMonic(ctx, mul(ctx, s, b, M), h2, M);
  const s2 = sub(ctx, s, d, M);
  const t2 = sub(ctx, sub(ctx, t, mul(ctx, t, b, M), M), mul(ctx, c, g2, M), M);
  return { g: g2, h: h2, s: s2, t: t2, m: M };
}

const toBig = (a: Fp): Zm => a.map(BigInt);

/**
 * Lift monic modular factors of f (lc(f)·∏ fᵢ ≡ f mod p, pairwise coprime)
 * to monic factors modulo M = p^(2^j), through a balanced factor tree.
 * Returns monic residue arrays with lc(f)·∏ Fᵢ ≡ f (mod M), checked.
 */
export function henselLift(ctx: ExecutionContext, f: readonly bigint[], factors: readonly Fp[], p: number, M: bigint): Zm[] {
  demand(factors.length > 0, 'invalid-input', 'no modular factors');
  const lifted = liftTree(ctx, reduce(ctx, f, M), factors, p, M);
  const lc = f[f.length - 1];
  const product = lifted.reduce((acc, x) => mul(ctx, acc, x, M), reduce(ctx, [lc], M));
  const target = reduce(ctx, f, M);
  demand(product.length === target.length && product.every((c, i) => c === target[i]), 'verification-failed', 'Hensel product identity');
  return lifted;
}

function liftTree(ctx: ExecutionContext, f: Zm, factors: readonly Fp[], p: number, M: bigint): Zm[] {
  ctx.tick();
  const lc = f[f.length - 1];
  if (factors.length === 1) {
    // f ≡ lc·F (mod M) with lc a unit: F = f·lc⁻¹.
    const inv = inverseModulo(ctx, lc, M);
    return [reduce(ctx, f.map(c => imul(ctx, c, inv)), M)];
  }
  const half = Math.floor(factors.length / 2);
  const left = factors.slice(0, half), right = factors.slice(half);
  const lcP = Number(irem(ctx, lc, BigInt(p)));
  const gP = fpScale(ctx, left.reduce<number[]>((acc, x) => fpMul(ctx, acc, x, p), [1]), lcP, p);
  const hP = right.reduce<number[]>((acc, x) => fpMul(ctx, acc, x, p), [1]);
  const { s: sP, t: tP } = fpExtGcd(ctx, gP, hP, p);
  let state = { g: toBig(gP), h: toBig(hP), s: toBig(sP), t: toBig(tP), m: BigInt(p) };
  while (state.m < M) state = henselStep(ctx, f, state.g, state.h, state.s, state.t, state.m);
  demand(state.m === M, 'invalid-input', 'lift modulus must be p^(2^j)');
  return [...liftTree(ctx, state.g, left, p, M), ...liftTree(ctx, state.h, right, p, M)];
}

function inverseModulo(ctx: ExecutionContext, a: bigint, m: bigint): bigint {
  let [r0, r1, s0, s1] = [m, ((a % m) + m) % m, 0n, 1n];
  while (r1 !== 0n) {
    const q = r0 / r1;
    [r0, r1] = [r1, r0 - imul(ctx, q, r1)];
    [s0, s1] = [s1, s0 - imul(ctx, q, s1)];
  }
  demand(r0 === 1n, 'division-by-zero', 'not a unit modulo m');
  return ((s0 % m) + m) % m;
}

/** Smallest modulus p^(2^j) exceeding `bound`. */
export function liftModulus(ctx: ExecutionContext, p: number, bound: bigint): bigint {
  let m = BigInt(p);
  while (m <= bound) m = imul(ctx, m, m);
  return m;
}
