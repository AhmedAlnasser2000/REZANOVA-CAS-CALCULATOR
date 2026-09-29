import { complex, type ComplexValue } from '../../numeric/complex';

// Exact polynomials in z with Gaussian-rational coefficients (a/b + (c/d)i,
// BigInt), so root points can be exact whenever the polynomial splits exactly.
// Coefficients are stored lowest degree first.

export type GraphRational = { n: bigint; d: bigint };
export type GraphGaussian = { re: GraphRational; im: GraphRational };
export type GraphExactPolynomial = GraphGaussian[];

const MAXIMUM_DEGREE = 64;

const abs = (value: bigint) => (value < 0n ? -value : value);
function gcd(a: bigint, b: bigint): bigint { a = abs(a); b = abs(b); while (b) [a, b] = [b, a % b]; return a || 1n; }

export function rational(n: bigint, d = 1n): GraphRational {
  if (d === 0n) throw new RangeError('zero denominator');
  const sign = d < 0n ? -1n : 1n;
  const divisor = gcd(n, d);
  return { n: (sign * n) / divisor, d: (sign * d) / divisor };
}
export const Q0 = rational(0n);
export const Q1 = rational(1n);
export const qAdd = (a: GraphRational, b: GraphRational) => rational(a.n * b.d + b.n * a.d, a.d * b.d);
export const qSub = (a: GraphRational, b: GraphRational) => rational(a.n * b.d - b.n * a.d, a.d * b.d);
export const qMul = (a: GraphRational, b: GraphRational) => rational(a.n * b.n, a.d * b.d);
export const qDiv = (a: GraphRational, b: GraphRational) => rational(a.n * b.d, a.d * b.n);
export const qIsZero = (a: GraphRational) => a.n === 0n;
export const qToNumber = (a: GraphRational) => Number(a.n) / Number(a.d);

export const G0: GraphGaussian = { re: Q0, im: Q0 };
export const G1: GraphGaussian = { re: Q1, im: Q0 };
export const gAdd = (a: GraphGaussian, b: GraphGaussian): GraphGaussian => ({ re: qAdd(a.re, b.re), im: qAdd(a.im, b.im) });
export const gNeg = (a: GraphGaussian): GraphGaussian => ({ re: qSub(Q0, a.re), im: qSub(Q0, a.im) });
export const gMul = (a: GraphGaussian, b: GraphGaussian): GraphGaussian => ({
  re: qSub(qMul(a.re, b.re), qMul(a.im, b.im)), im: qAdd(qMul(a.re, b.im), qMul(a.im, b.re)),
});
export function gDiv(a: GraphGaussian, b: GraphGaussian): GraphGaussian {
  const norm = qAdd(qMul(b.re, b.re), qMul(b.im, b.im));
  const conjugate = { re: b.re, im: qSub(Q0, b.im) };
  const product = gMul(a, conjugate);
  return { re: qDiv(product.re, norm), im: qDiv(product.im, norm) };
}
export const gIsZero = (a: GraphGaussian) => qIsZero(a.re) && qIsZero(a.im);
export const gToComplex = (a: GraphGaussian): ComplexValue => complex(qToNumber(a.re), qToNumber(a.im));

/** A decimal literal as an exact rational ("0.25" becomes 1/4); null for NaN or infinities. */
function rationalFromNumberText(text: string): GraphRational | null {
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/iu.exec(text.trim());
  if (!match) return null;
  const [, sign, whole, fraction = '', exponentText = '0'] = match;
  const exponent = Number(exponentText) - fraction.length;
  if (Math.abs(exponent) > 60) return null;
  let numerator = BigInt(`${whole}${fraction}`) * (sign === '-' ? -1n : 1n);
  let denominator = 1n;
  if (exponent >= 0) numerator *= 10n ** BigInt(exponent); else denominator = 10n ** BigInt(-exponent);
  return rational(numerator, denominator);
}

function trim(poly: GraphExactPolynomial) {
  while (poly.length > 1 && gIsZero(poly[poly.length - 1]!)) poly.pop();
  return poly;
}
function polyAdd(a: GraphExactPolynomial, b: GraphExactPolynomial) {
  return trim(Array.from({ length: Math.max(a.length, b.length) }, (_, index) => gAdd(a[index] ?? G0, b[index] ?? G0)));
}
function polyMul(a: GraphExactPolynomial, b: GraphExactPolynomial): GraphExactPolynomial | null {
  if (a.length + b.length - 2 > MAXIMUM_DEGREE) return null;
  const out: GraphExactPolynomial = Array.from({ length: a.length + b.length - 1 }, () => G0);
  a.forEach((left, i) => b.forEach((right, j) => { out[i + j] = gAdd(out[i + j]!, gMul(left, right)); }));
  return trim(out);
}
const constant = (value: GraphGaussian): GraphExactPolynomial => [value];

/**
 * The exact polynomial a MathJSON expression in `variable` is, or null when it
 * is not a polynomial with Gaussian-rational coefficients (a slider value, a
 * function of z, a division by z, or degree above 64).
 */
export function exactGraphPolynomial(node: unknown, variable = 'z'): GraphExactPolynomial | null {
  if (typeof node === 'number') {
    const value = Number.isFinite(node) ? rationalFromNumberText(String(node)) : null;
    return value ? constant({ re: value, im: Q0 }) : null;
  }
  if (node && typeof node === 'object' && !Array.isArray(node) && 'num' in node) {
    const value = rationalFromNumberText(String((node as { num: unknown }).num));
    return value ? constant({ re: value, im: Q0 }) : null;
  }
  if (node === variable) return [G0, G1];
  if (node === 'ImaginaryUnit') return constant({ re: Q0, im: Q1 });
  if (!Array.isArray(node) || typeof node[0] !== 'string') return null;
  const [head, ...operands] = node as [string, ...unknown[]];
  const parts: GraphExactPolynomial[] = [];
  if (head !== 'Power') {
    for (const operand of operands) { const part = exactGraphPolynomial(operand, variable); if (!part) return null; parts.push(part); }
  }
  switch (head) {
    case 'Add': return parts.reduce(polyAdd, [G0]);
    case 'Subtract': return parts.length === 2 ? polyAdd(parts[0]!, parts[1]!.map(gNeg)) : null;
    case 'Negate': return parts.length === 1 ? parts[0]!.map(gNeg) : null;
    case 'Multiply': {
      let product: GraphExactPolynomial | null = [G1];
      for (const part of parts) { product = product && polyMul(product, part); if (!product) return null; }
      return product;
    }
    case 'Rational':
    case 'Divide': {
      if (parts.length !== 2 || parts[1]!.length !== 1 || gIsZero(parts[1]![0]!)) return null;
      const divisor = parts[1]![0]!;
      return parts[0]!.map((coefficient) => gDiv(coefficient, divisor));
    }
    case 'Complex': {
      if (parts.length !== 2 || parts.some((part) => part.length !== 1 || !qIsZero(part[0]!.im))) return null;
      return constant({ re: parts[0]![0]!.re, im: parts[1]![0]!.re });
    }
    case 'Power': {
      const exponent = operands[1];
      if (typeof exponent !== 'number' || !Number.isInteger(exponent) || exponent < 0 || exponent > MAXIMUM_DEGREE) return null;
      const base = exactGraphPolynomial(operands[0], variable);
      if (!base) return null;
      let result: GraphExactPolynomial | null = [G1];
      for (let power = 0; power < exponent; power += 1) { result = result && polyMul(result, base); if (!result) return null; }
      return result;
    }
    default: return null;
  }
}

/** Dividing by (z - root) exactly; null unless the remainder is exactly zero. */
export function deflateExact(poly: GraphExactPolynomial, root: GraphGaussian): GraphExactPolynomial | null {
  const degree = poly.length - 1;
  const quotient: GraphExactPolynomial = Array.from({ length: degree }, () => G0);
  let carry = G0;
  for (let index = degree; index >= 1; index -= 1) {
    carry = gAdd(poly[index]!, gMul(carry, root));
    quotient[index - 1] = carry;
  }
  return gIsZero(gAdd(poly[0]!, gMul(carry, root))) ? quotient : null;
}
