import type { SerializableMathJson } from '../../../types/calculator';
import { exactArithmeticLatex } from '../../result-contract/exact-arithmetic-latex';
import { requireProvenCanonicalMathValueV2 } from '../../result-contract/proven-answer-mathjson';
import { demand, type ExecutionContext } from '../../symbolic-engine/integration/core/execution';
import { rational, type Rational } from '../../symbolic-engine/integration/core/rational';
import type { FormalPrimitiveDomain, QPolynomial, QRationalFunction } from '../../symbolic-engine/integration/core/formal-primitive';

export function rationalTree(c: Rational): SerializableMathJson {
  const n = {num: c.numerator.toString()}, d = {num: c.denominator.toString()};
  return c.denominator === 1n ? n : ['Divide', n, d];
}
export function polynomialTree(ctx: ExecutionContext, p: QPolynomial, variable: string): SerializableMathJson {
  ctx.allocate(p.coefficients.length * 8);
  const terms: SerializableMathJson[] = [];
  p.coefficients.forEach((c, i) => {
    ctx.tick(); if (c.numerator === 0n) return;
    const scalar = rationalTree(c);
    const power: SerializableMathJson = i === 1 ? variable : ['Power', variable, i];
    terms.push(i === 0 ? scalar : c.numerator === c.denominator ? power : ['Multiply', scalar, power]);
  });
  return terms.length === 0 ? {num: '0'} : terms.length === 1 ? terms[0] : ['Add', ...terms];
}
export function fractionTree(ctx: ExecutionContext, f: QRationalFunction, variable: string): SerializableMathJson {
  const n = polynomialTree(ctx, f.numerator, variable);
  return f.denominator.coefficients.length === 1 && f.denominator.coefficients[0].numerator === 1n
    ? n : ['Divide', n, polynomialTree(ctx, f.denominator, variable)];
}
/** Exact inverse conversion for checking the native-to-MathJSON projection. */
export function treeFraction(ctx: ExecutionContext, o: FormalPrimitiveDomain, v: SerializableMathJson): QRationalFunction {
  ctx.tick(); const f = o.fractions;
  if (v === o.x.variable) return f.make(ctx, o.x.make(ctx, [rational(ctx, 0n), rational(ctx, 1n)]), o.x.one(ctx));
  if (typeof v === 'number') return f.fromCoefficient(ctx, rational(ctx, v));
  if (v && typeof v === 'object' && !Array.isArray(v) && 'num' in v) return f.fromCoefficient(ctx, rational(ctx, String(v.num)));
  demand(Array.isArray(v), 'verification-failed', 'invalid projected arithmetic');
  const [h, ...a] = v;
  const r = (i: number) => treeFraction(ctx, o, a[i]);
  if (h === 'Add' || h === 'Multiply') return a.reduce<QRationalFunction>((acc, t) => h === 'Add' ? f.add(ctx, acc, treeFraction(ctx, o, t)) : f.multiply(ctx, acc, treeFraction(ctx, o, t)), f.fromInteger(ctx, h === 'Add' ? 0n : 1n));
  if (h === 'Divide') return f.exactDivide(ctx, r(0), r(1));
  if (h === 'Negate') return f.negate(ctx, r(0));
  if (h === 'Power') {
    demand(typeof a[1] === 'number' && Number.isSafeInteger(a[1]) && a[1] >= 0, 'verification-failed', 'projected exponent');
    let base = r(0), n = a[1], out = f.fromInteger(ctx, 1n);
    while (n > 0) {ctx.tick(); if (n % 2) out = f.multiply(ctx, out, base); n = Math.floor(n / 2); if (n) base = f.multiply(ctx, base, base);}
    return out;
  }
  throw new Error('Invalid projected expression');
}
export function provenMath(ctx: ExecutionContext, tree: SerializableMathJson) {
  const serialized = JSON.stringify(tree); ctx.allocate(serialized.length * 4); ctx.tick(serialized.length);
  return requireProvenCanonicalMathValueV2({mathJson: tree, canonicalLatex: exactArithmeticLatex(tree), owner: 'calculus', routeId: 'calculus.integrals', source: 'New Integration verified native exact projection'});
}
