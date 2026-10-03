import { demand, type ExecutionContext } from '../execution';
import { idivmod, imul } from '../algebra/integer';
import type { Polynomial } from '../algebra/polynomial';
import { exactQuotient } from '../algebra/polynomial-division';
import { ALGEBRAIC_RING } from './root-of';

/**
 * Cyclotomic polynomials and Euler's totient, for exact roots of unity.
 *
 * Φₘ for squarefree m = p₁⋯pₖ is built by Φ_{mp}(x) = Φₘ(xᵖ)/Φₘ(x) (p ∤ m),
 * and Φₙ(x) = Φ_{rad n}(x^{n/rad n}). Every division is exact.
 */

/** Distinct primes dividing n ≥ 1, by trial division under the budget. */
export function primeDivisors(ctx: ExecutionContext, n: bigint): bigint[] {
  demand(n >= 1n, 'invalid-input', 'prime divisors need n ≥ 1');
  const out: bigint[] = [];
  let m = n;
  for (let p = 2n; p * p <= m; p += p === 2n ? 1n : 2n) {
    ctx.tick();
    if (idivmod(ctx, m, p).r !== 0n) continue;
    out.push(p);
    while (idivmod(ctx, m, p).r === 0n) m = idivmod(ctx, m, p).q;
  }
  if (m > 1n) out.push(m);
  return out;
}

export function eulerPhi(ctx: ExecutionContext, n: bigint): bigint {
  let phi = n;
  for (const p of primeDivisors(ctx, n)) phi = imul(ctx, idivmod(ctx, phi, p).q, p - 1n);
  return phi;
}

function substitutePower(ctx: ExecutionContext, f: Polynomial<bigint>, k: number): Polynomial<bigint> {
  const c = f.coefficients;
  ctx.allocate((c.length - 1) * k + 1);
  const out = Array<bigint>((c.length - 1) * k + 1).fill(0n);
  c.forEach((v, i) => { out[i * k] = v; });
  return ALGEBRAIC_RING.make(ctx, out);
}

function safe(ctx: ExecutionContext, n: bigint): number {
  ctx.allocate(n <= BigInt(Number.MAX_SAFE_INTEGER) ? 1 : Number.MAX_SAFE_INTEGER);
  return Number(n);
}

/** Φₙ over ℤ (n ≥ 1). */
export function cyclotomic(ctx: ExecutionContext, n: bigint): Polynomial<bigint> {
  const primes = primeDivisors(ctx, n);
  let f = ALGEBRAIC_RING.make(ctx, [-1n, 1n]), radical = 1n;
  for (const p of primes) {
    f = exactQuotient(ctx, ALGEBRAIC_RING, substitutePower(ctx, f, safe(ctx, p)), f);
    radical = imul(ctx, radical, p);
  }
  return substitutePower(ctx, f, safe(ctx, idivmod(ctx, n, radical).q));
}
