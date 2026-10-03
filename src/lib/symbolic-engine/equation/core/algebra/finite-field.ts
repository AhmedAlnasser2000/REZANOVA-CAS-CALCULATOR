import { demand, type ExecutionContext } from '../execution';
import { invMod, mulMod } from './modular';

/**
 * Dense polynomials over F_p for a word prime p (< 2^26): ascending residue
 * arrays without trailing zeros. Products of residues stay exact in numbers.
 */
export type Fp = readonly number[];

export function fpTrim(a: number[]): number[] { while (a.length && a[a.length - 1] === 0) a.pop(); return a; }

export function fpFromBig(ctx: ExecutionContext, coefficients: readonly bigint[], p: number): number[] {
  const P = BigInt(p);
  ctx.allocate(coefficients.length);
  return fpTrim(coefficients.map(c => { ctx.tick(); const r = c % P; return Number(r < 0n ? r + P : r); }));
}

export function fpAdd(ctx: ExecutionContext, a: Fp, b: Fp, p: number): number[] {
  const n = Math.max(a.length, b.length); ctx.allocate(n); ctx.tick(n);
  const out: number[] = [];
  for (let i = 0; i < n; i++) { const s = (a[i] ?? 0) + (b[i] ?? 0); out.push(s >= p ? s - p : s); }
  return fpTrim(out);
}

export function fpSub(ctx: ExecutionContext, a: Fp, b: Fp, p: number): number[] {
  const n = Math.max(a.length, b.length); ctx.allocate(n); ctx.tick(n);
  const out: number[] = [];
  for (let i = 0; i < n; i++) { const s = (a[i] ?? 0) - (b[i] ?? 0); out.push(s < 0 ? s + p : s); }
  return fpTrim(out);
}

export function fpScale(ctx: ExecutionContext, a: Fp, c: number, p: number): number[] {
  ctx.allocate(a.length); ctx.tick(a.length);
  return fpTrim(a.map(v => mulMod(v, c, p)));
}

export function fpMul(ctx: ExecutionContext, a: Fp, b: Fp, p: number): number[] {
  if (!a.length || !b.length) return [];
  const out = new Array<number>(a.length + b.length - 1).fill(0);
  ctx.allocate(out.length); ctx.tick(a.length * b.length);
  for (let i = 0; i < a.length; i++) {
    if (a[i] === 0) continue;
    for (let j = 0; j < b.length; j++) out[i + j] = (out[i + j] + mulMod(a[i], b[j], p)) % p;
  }
  return fpTrim(out);
}

export function fpDivRem(ctx: ExecutionContext, a: Fp, b: Fp, p: number): { q: number[]; r: number[] } {
  demand(b.length > 0, 'division-by-zero', 'F_p polynomial division');
  const r = [...a], db = b.length - 1, inv = invMod(b[db], p);
  const q = new Array<number>(Math.max(0, r.length - db)).fill(0);
  ctx.allocate(q.length + r.length);
  for (let k = r.length - 1; k >= db; k--) {
    ctx.tick(db + 1);
    if (r[k] === 0) continue;
    const c = mulMod(r[k], inv, p);
    q[k - db] = c;
    for (let j = 0; j <= db; j++) { const s = r[k - db + j] - mulMod(c, b[j], p); r[k - db + j] = s < 0 ? s + p : s; }
  }
  return { q: fpTrim(q), r: fpTrim(r.slice(0, db)) };
}

export function fpRem(ctx: ExecutionContext, a: Fp, b: Fp, p: number): number[] { return fpDivRem(ctx, a, b, p).r; }

export function fpMonic(ctx: ExecutionContext, a: Fp, p: number): number[] {
  if (!a.length) return [];
  return fpScale(ctx, a, invMod(a[a.length - 1], p), p);
}

export function fpGcd(ctx: ExecutionContext, a: Fp, b: Fp, p: number): number[] {
  let r0 = fpTrim([...a]), r1 = fpTrim([...b]);
  while (r1.length) { ctx.tick(); [r0, r1] = [r1, fpRem(ctx, r0, r1, p)]; }
  return fpMonic(ctx, r0, p);
}

/** Extended gcd over F_p: s·a + t·b = g (monic), checked. */
export function fpExtGcd(ctx: ExecutionContext, a: Fp, b: Fp, p: number): { g: number[]; s: number[]; t: number[] } {
  let [r0, r1] = [fpTrim([...a]), fpTrim([...b])];
  let [s0, s1, t0, t1]: number[][] = [[1], [], [], [1]];
  while (r1.length) {
    const { q, r } = fpDivRem(ctx, r0, r1, p);
    [r0, r1] = [r1, r];
    [s0, s1] = [s1, fpSub(ctx, s0, fpMul(ctx, q, s1, p), p)];
    [t0, t1] = [t1, fpSub(ctx, t0, fpMul(ctx, q, t1, p), p)];
  }
  demand(r0.length > 0, 'invalid-input', 'extended gcd of zeros');
  const inv = invMod(r0[r0.length - 1], p);
  const g = fpScale(ctx, r0, inv, p), s = fpScale(ctx, s0, inv, p), t = fpScale(ctx, t0, inv, p);
  const check = fpAdd(ctx, fpMul(ctx, s, a, p), fpMul(ctx, t, b, p), p);
  demand(check.length === g.length && check.every((c, i) => c === g[i]), 'verification-failed', 'F_p Bezout identity');
  return { g, s, t };
}

export function fpDerivative(ctx: ExecutionContext, a: Fp, p: number): number[] {
  ctx.allocate(a.length);
  return fpTrim(a.slice(1).map((c, i) => mulMod(c, (i + 1) % p, p)));
}

/** base^e mod m over F_p (e a non-negative bigint). */
export function fpPowMod(ctx: ExecutionContext, base: Fp, e: bigint, m: Fp, p: number): number[] {
  let result: number[] = [1], b = fpRem(ctx, base, m, p);
  while (e > 0n) {
    ctx.tick();
    if (e & 1n) result = fpRem(ctx, fpMul(ctx, result, b, p), m, p);
    e >>= 1n;
    if (e > 0n) b = fpRem(ctx, fpMul(ctx, b, b, p), m, p);
  }
  return fpRem(ctx, result, m, p);
}

export function fpIsSquareFree(ctx: ExecutionContext, a: Fp, p: number): boolean {
  return fpGcd(ctx, a, fpDerivative(ctx, a, p), p).length === 1;
}

/** Distinct-degree factorization of a monic square-free f: pairs (product of all irreducible factors of degree d, d). */
export function fpDistinctDegree(ctx: ExecutionContext, f: Fp, p: number): { poly: number[]; degree: number }[] {
  const out: { poly: number[]; degree: number }[] = [];
  let rest = [...f], h: number[] = [0, 1];
  const x = [0, 1];
  for (let d = 1; 2 * d <= rest.length - 1; d++) {
    h = fpPowMod(ctx, h, BigInt(p), rest, p);
    const g = fpGcd(ctx, rest, fpSub(ctx, h, x, p), p);
    if (g.length > 1) {
      out.push({ poly: g, degree: d });
      rest = fpDivRem(ctx, rest, g, p).q;
      h = fpRem(ctx, h, rest, p);
    }
  }
  if (rest.length > 1) out.push({ poly: rest, degree: rest.length - 1 });
  return out;
}

/** Deterministic seeded generator for random splitting polynomials. */
function generator(seed: number) {
  let state = seed >>> 0;
  return (bound: number) => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * bound);
  };
}

/** Cantor–Zassenhaus equal-degree splitting of g (monic, product of irreducibles of degree d), p odd. */
export function fpEqualDegree(ctx: ExecutionContext, g: Fp, d: number, p: number): number[][] {
  const n = g.length - 1;
  if (n === d) return [[...g]];
  demand(p % 2 === 1, 'invalid-input', 'equal-degree splitting needs an odd prime');
  const random = generator(n * 7919 + d * 104729 + p);
  const exponent = (BigInt(p) ** BigInt(d) - 1n) / 2n;
  for (;;) {
    ctx.tick();
    const a = fpTrim(Array.from({ length: n }, () => random(p)));
    if (a.length < 2) continue;
    const b = fpPowMod(ctx, a, exponent, g, p);
    const candidate = fpGcd(ctx, g, fpSub(ctx, b, [1], p), p);
    if (candidate.length > 1 && candidate.length < g.length) {
      const other = fpDivRem(ctx, g, candidate, p).q;
      return [...fpEqualDegree(ctx, candidate, d, p), ...fpEqualDegree(ctx, fpMonic(ctx, other, p), d, p)];
    }
  }
}

/** Complete factorization of a monic square-free f over F_p into monic irreducibles. */
export function fpFactorSquareFree(ctx: ExecutionContext, f: Fp, p: number): number[][] {
  return fpDistinctDegree(ctx, f, p).flatMap(({ poly, degree }) => fpEqualDegree(ctx, poly, degree, p));
}

export { invMod };
