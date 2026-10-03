import { demand, type ExecutionContext } from '../execution';
import { iadd, imul, isub } from '../algebra/integer';

/** Gaussian integer a + b·i. */
export interface GaussianInteger { readonly re: bigint; readonly im: bigint }

export function gAdd(ctx: ExecutionContext, a: GaussianInteger, b: GaussianInteger): GaussianInteger {
  return { re: iadd(ctx, a.re, b.re), im: iadd(ctx, a.im, b.im) };
}
export function gSub(ctx: ExecutionContext, a: GaussianInteger, b: GaussianInteger): GaussianInteger {
  return { re: isub(ctx, a.re, b.re), im: isub(ctx, a.im, b.im) };
}
export function gMul(ctx: ExecutionContext, a: GaussianInteger, b: GaussianInteger): GaussianInteger {
  return { re: isub(ctx, imul(ctx, a.re, b.re), imul(ctx, a.im, b.im)), im: iadd(ctx, imul(ctx, a.re, b.im), imul(ctx, a.im, b.re)) };
}
export function gNorm(ctx: ExecutionContext, a: GaussianInteger): bigint { return iadd(ctx, imul(ctx, a.re, a.re), imul(ctx, a.im, a.im)); }

/**
 * Fixed-point complex numbers: value = (re + im·i) / 2^precision. Used only to
 * produce approximations; every claim about roots is certified exactly.
 */
export interface Fixed { readonly re: bigint; readonly im: bigint }

export function fxMul(ctx: ExecutionContext, a: Fixed, b: Fixed, precision: number): Fixed {
  const p = BigInt(precision);
  return { re: isub(ctx, imul(ctx, a.re, b.re), imul(ctx, a.im, b.im)) >> p, im: iadd(ctx, imul(ctx, a.re, b.im), imul(ctx, a.im, b.re)) >> p };
}

/** a / b in fixed point; null when b is zero at this precision. */
export function fxDiv(ctx: ExecutionContext, a: Fixed, b: Fixed, precision: number): Fixed | null {
  const den = iadd(ctx, imul(ctx, b.re, b.re), imul(ctx, b.im, b.im));
  if (den === 0n) return null;
  const p = BigInt(precision);
  ctx.tick();
  return {
    re: (iadd(ctx, imul(ctx, a.re, b.re), imul(ctx, a.im, b.im)) << p) / den,
    im: (isub(ctx, imul(ctx, a.im, b.re), imul(ctx, a.re, b.im)) << p) / den,
  };
}

export function fxAbsBound(a: Fixed): bigint { const r = a.re < 0n ? -a.re : a.re, i = a.im < 0n ? -a.im : a.im; return r > i ? r : i; }

/** Evaluate p and p' at z (fixed point) by Horner; coefficients are integers. */
export function fxEvaluate(ctx: ExecutionContext, coefficients: readonly bigint[], z: Fixed, precision: number): { value: Fixed; derivative: Fixed } {
  demand(coefficients.length > 0, 'invalid-input', 'evaluation of zero');
  const p = BigInt(precision);
  let value: Fixed = { re: 0n, im: 0n }, derivative: Fixed = { re: 0n, im: 0n };
  for (let i = coefficients.length - 1; i >= 0; i--) {
    derivative = fxMul(ctx, derivative, z, precision);
    derivative = { re: derivative.re + value.re, im: derivative.im + value.im };
    value = fxMul(ctx, value, z, precision);
    value = { re: value.re + (coefficients[i] << p), im: value.im };
  }
  return { value, derivative };
}

/** Taylor shift F(t) → F(Z + t) for a Gaussian integer Z (O(n²) Gaussian operations). */
export function gaussianTaylorShift(ctx: ExecutionContext, coefficients: readonly GaussianInteger[], shift: GaussianInteger): GaussianInteger[] {
  const a = [...coefficients], n = a.length;
  ctx.allocate(n);
  for (let i = 0; i < n - 1; i++) for (let j = n - 2; j >= i; j--) a[j] = gAdd(ctx, a[j], gMul(ctx, shift, a[j + 1]));
  return a;
}
