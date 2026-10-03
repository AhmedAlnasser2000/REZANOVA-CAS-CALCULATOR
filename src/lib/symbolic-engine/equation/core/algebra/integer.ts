import { demand, type ExecutionContext } from '../execution';

/** Exact bit length of |v|; zero has length 0. Pure helper, never through `Number` for large values. */
export function bitLength(v: bigint): number {
  if (v < 0n) v = -v;
  if (v === 0n) return 0;
  if (v <= 0xffffffffn) return 32 - Math.clz32(Number(v));
  const hex = v.toString(16);
  return (hex.length - 1) * 4 + (32 - Math.clz32(parseInt(hex[0], 16)));
}

/** 64-bit limb count used for cost accounting (at least one). */
export function limbs(ctx: ExecutionContext, v: bigint): number {
  const bits = bitLength(v);
  if (bits > 32) ctx.tick(Math.ceil(bits / 256));
  return Math.max(1, Math.ceil(bits / 64));
}

export function iabs(v: bigint): bigint { return v < 0n ? -v : v; }

export function iadd(ctx: ExecutionContext, a: bigint, b: bigint): bigint {
  const n = Math.max(limbs(ctx, a), limbs(ctx, b));
  ctx.charge(n, n + 1);
  return a + b;
}

export function isub(ctx: ExecutionContext, a: bigint, b: bigint): bigint {
  const n = Math.max(limbs(ctx, a), limbs(ctx, b));
  ctx.charge(n, n + 1);
  return a - b;
}

export function imul(ctx: ExecutionContext, a: bigint, b: bigint): bigint {
  if (a === 0n || b === 0n) { ctx.tick(); return 0n; }
  const la = limbs(ctx, a), lb = limbs(ctx, b);
  ctx.charge(la * lb, la + lb);
  return a * b;
}

/** Truncated quotient and remainder (sign of remainder follows the dividend). */
export function idivmod(ctx: ExecutionContext, a: bigint, b: bigint): { q: bigint; r: bigint } {
  demand(b !== 0n, 'division-by-zero', 'integer division');
  const la = limbs(ctx, a), lb = limbs(ctx, b);
  ctx.charge(Math.max(1, la - lb + 1) * lb, la + lb);
  return { q: a / b, r: a % b };
}

export function iquot(ctx: ExecutionContext, a: bigint, b: bigint): bigint { return idivmod(ctx, a, b).q; }
export function irem(ctx: ExecutionContext, a: bigint, b: bigint): bigint { return idivmod(ctx, a, b).r; }

/** Exact quotient; a nonzero remainder is a `nonexact-division` failure. */
export function iexact(ctx: ExecutionContext, a: bigint, b: bigint): bigint {
  const { q, r } = idivmod(ctx, a, b);
  demand(r === 0n, 'nonexact-division', 'integer exact division');
  return q;
}

/** Non-negative GCD; gcd(0, 0) = 0. */
export function igcd(ctx: ExecutionContext, a: bigint, b: bigint): bigint {
  a = iabs(a); b = iabs(b);
  while (b !== 0n) { const r = irem(ctx, a, b); a = b; b = r; }
  return a;
}

/** Extended GCD: s*a + t*b = g with g >= 0, checked before return. */
export function iextgcd(ctx: ExecutionContext, a: bigint, b: bigint): { g: bigint; s: bigint; t: bigint } {
  let [r0, r1, s0, s1, t0, t1] = [a, b, 1n, 0n, 0n, 1n];
  while (r1 !== 0n) {
    const { q, r } = idivmod(ctx, r0, r1);
    [r0, r1] = [r1, r];
    [s0, s1] = [s1, isub(ctx, s0, imul(ctx, q, s1))];
    [t0, t1] = [t1, isub(ctx, t0, imul(ctx, q, t1))];
  }
  if (r0 < 0n) { r0 = -r0; s0 = -s0; t0 = -t0; }
  demand(iadd(ctx, imul(ctx, s0, a), imul(ctx, t0, b)) === r0, 'verification-failed', 'integer Bezout identity');
  return { g: r0, s: s0, t: t0 };
}

export function ipow(ctx: ExecutionContext, base: bigint, exponent: number): bigint {
  demand(Number.isSafeInteger(exponent) && exponent >= 0, 'invalid-input', 'integer exponent');
  let result = 1n, b = base, e = exponent;
  while (e > 0) {
    ctx.tick();
    if (e % 2 === 1) result = imul(ctx, result, b);
    e = Math.floor(e / 2);
    if (e > 0) b = imul(ctx, b, b);
  }
  return result;
}

/** Floor square root of a non-negative integer (Newton iteration). */
export function isqrt(ctx: ExecutionContext, n: bigint): bigint {
  demand(n >= 0n, 'invalid-input', 'square root of a negative integer');
  if (n < 2n) return n;
  let x = 1n << BigInt(Math.ceil(bitLength(n) / 2));
  for (;;) {
    const y = iquot(ctx, iadd(ctx, x, iquot(ctx, n, x)), 2n);
    if (y >= x) break;
    x = y;
  }
  demand(imul(ctx, x, x) <= n && imul(ctx, x + 1n, x + 1n) > n, 'verification-failed', 'integer square root');
  return x;
}
