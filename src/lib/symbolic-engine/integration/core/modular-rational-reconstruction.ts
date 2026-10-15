import {demand, type ExecutionContext} from './execution';
import {integerGcd, rational, type Rational} from './rational';

/** Wang reconstruction with exact symmetric bounds: 2*B^2 < modulus. No
 * floating estimate controls acceptance or the amount of precision required. */
export function modularRationalReconstruction(ctx: ExecutionContext, residue: bigint, modulus: bigint): Rational | null {
  ctx.integer(residue); ctx.integer(modulus);
  demand(modulus > 1n && residue >= 0n && residue < modulus, 'invalid-input', 'canonical CRT residue');
  if (residue === 0n) return rational(ctx, 0n);
  const square = ctx.quotient(ctx.add(modulus, -1n), 2n);
  if (square === 0n) return null;
  let bound = square, next = ctx.quotient(ctx.add(bound, 1n), 2n);
  while (next < bound) {bound = next; next = ctx.quotient(ctx.add(bound, ctx.quotient(square, bound)), 2n);}
  let previous = modulus, current = residue, denominator = 0n, nextDenominator = 1n;
  while (current > bound) {
    const q = ctx.quotient(previous, current), remainder = ctx.add(previous, -ctx.multiply(q, current));
    const d = ctx.add(denominator, -ctx.multiply(q, nextDenominator));
    previous = current; current = remainder; denominator = nextDenominator; nextDenominator = d;
  }
  if (current === 0n || nextDenominator === 0n || (nextDenominator < 0n ? -nextDenominator : nextDenominator) > bound
    || integerGcd(ctx, current, nextDenominator) !== 1n || integerGcd(ctx, nextDenominator, modulus) !== 1n) return null;
  const value = rational(ctx, current, nextDenominator);
  demand(ctx.remainder(ctx.add(ctx.multiply(residue, value.denominator), -value.numerator), modulus) === 0n,
    'verification-failed', 'rational reconstruction congruence');
  return value;
}
