import * as I from './interval-math';
import type { GraphIntervalValue } from './interval-math';

// Complex interval arithmetic for meromorphic z-maps (PTX-ENGINE1, gate E8):
// a rectangle [re] + i[im] that encloses every value f takes over a box of z.
// Only operations that keep f meromorphic are supported (sums, products,
// quotients, integer powers, exp and the trigonometric and hyperbolic
// functions); logarithms, roots, non-integer powers, conjugates, |z|, Re, Im
// and arg are not, so the argument principle is only applied where it holds.

export type GraphComplexRectangle = { re: GraphIntervalValue; im: GraphIntervalValue };
export type GraphComplexBox = { reMin: number; reMax: number; imMin: number; imMax: number };
export type GraphComplexIntervalPlan = { evaluate(box: GraphComplexBox): GraphComplexRectangle | null };

type Node = (z: GraphComplexRectangle) => GraphComplexRectangle | null;

const real = (value: number): GraphComplexRectangle => ({ re: I.point(value), im: I.point(0) });
const CONSTANTS: Record<string, GraphComplexRectangle> = {
  Pi: real(Math.PI), ExponentialE: real(Math.E), GoldenRatio: real((1 + Math.sqrt(5)) / 2),
  ImaginaryUnit: { re: I.point(0), im: I.point(1) },
};

const add = (a: GraphComplexRectangle, b: GraphComplexRectangle) => ({ re: I.add(a.re, b.re), im: I.add(a.im, b.im) });
const negate = (a: GraphComplexRectangle) => ({ re: I.negate(a.re), im: I.negate(a.im) });
const multiply = (a: GraphComplexRectangle, b: GraphComplexRectangle) => ({
  re: I.subtract(I.multiply(a.re, b.re), I.multiply(a.im, b.im)),
  im: I.add(I.multiply(a.re, b.im), I.multiply(a.im, b.re)),
});
/** 1/(x + iy) = (x − iy)/(x² + y²); unbounded where the rectangle reaches 0. */
function reciprocal(a: GraphComplexRectangle): GraphComplexRectangle {
  const square = (v: GraphIntervalValue) => I.power(v, I.point(2));
  const norm = I.add(square(a.re), square(a.im));
  return { re: I.divide(a.re, norm), im: I.negate(I.divide(a.im, norm)) };
}
const divide = (a: GraphComplexRectangle, b: GraphComplexRectangle) => multiply(a, reciprocal(b));
function exp(a: GraphComplexRectangle) {
  const magnitude = I.exp(a.re);
  return { re: I.multiply(magnitude, I.cos(a.im)), im: I.multiply(magnitude, I.sin(a.im)) };
}
// sin(x + iy) = sin x cosh y + i cos x sinh y, and so on.
const sin = (a: GraphComplexRectangle) => ({ re: I.multiply(I.sin(a.re), I.cosh(a.im)), im: I.multiply(I.cos(a.re), I.sinh(a.im)) });
const cos = (a: GraphComplexRectangle) => ({ re: I.multiply(I.cos(a.re), I.cosh(a.im)), im: I.negate(I.multiply(I.sin(a.re), I.sinh(a.im))) });
const sinh = (a: GraphComplexRectangle) => ({ re: I.multiply(I.sinh(a.re), I.cos(a.im)), im: I.multiply(I.cosh(a.re), I.sin(a.im)) });
const cosh = (a: GraphComplexRectangle) => ({ re: I.multiply(I.cosh(a.re), I.cos(a.im)), im: I.multiply(I.sinh(a.re), I.sin(a.im)) });

function integerPower(a: GraphComplexRectangle, n: number): GraphComplexRectangle {
  if (n === 0) return real(1);
  if (n < 0) return reciprocal(integerPower(a, -n));
  let result = real(1); let base = a; let exponent = n;
  while (exponent > 0) {
    if (exponent & 1) result = multiply(result, base);
    exponent >>= 1;
    if (exponent) base = multiply(base, base);
  }
  return result;
}

const UNARY: Record<string, (a: GraphComplexRectangle) => GraphComplexRectangle> = {
  Negate: negate, Exp: exp, Sin: sin, Cos: cos, Sinh: sinh, Cosh: cosh,
  Tan: (a) => divide(sin(a), cos(a)), Sec: (a) => reciprocal(cos(a)), Csc: (a) => reciprocal(sin(a)),
  Cot: (a) => divide(cos(a), sin(a)), Tanh: (a) => divide(sinh(a), cosh(a)),
};

function numberOf(node: unknown): number | null {
  if (typeof node === 'number') return node;
  if (node && typeof node === 'object' && !Array.isArray(node) && 'num' in node) {
    const value = Number((node as { num: unknown }).num);
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

function compile(node: unknown, parameters: Readonly<Record<string, number>>, variable: string): Node | null {
  const number = numberOf(node);
  if (number !== null) { const value = real(number); return () => value; }
  if (typeof node === 'string') {
    if (node === variable) return (z) => z;
    const constant = CONSTANTS[node];
    if (constant) return () => constant;
    if (node in parameters) { const value = real(parameters[node]!); return () => value; }
    return null;
  }
  if (!Array.isArray(node) || typeof node[0] !== 'string') return null;
  const [head, ...rest] = node as [string, ...unknown[]];
  if (head === 'Power' && rest.length === 2) {
    const exponent = numberOf(rest[1]);
    const base = compile(rest[0], parameters, variable);
    return base && exponent !== null && Number.isInteger(exponent) ? (z) => { const value = base(z); return value ? integerPower(value, exponent) : null; } : null;
  }
  const operands = rest.map((operand) => compile(operand, parameters, variable));
  if (operands.some((operand) => operand === null)) return null;
  const ops = operands as Node[];
  const all = (z: GraphComplexRectangle) => { const values = ops.map((op) => op(z)); return values.every(Boolean) ? values as GraphComplexRectangle[] : null; };
  if (head === 'Add') return (z) => all(z)?.reduce(add) ?? null;
  if (head === 'Multiply') return (z) => all(z)?.reduce(multiply) ?? null;
  if (head === 'Subtract' && ops.length === 2) return (z) => { const v = all(z); return v ? add(v[0]!, negate(v[1]!)) : null; };
  if ((head === 'Divide' || head === 'Rational') && ops.length === 2) return (z) => { const v = all(z); return v ? divide(v[0]!, v[1]!) : null; };
  if (head === 'Complex' && ops.length === 2) return (z) => { const v = all(z); return v ? { re: v[0]!.re, im: v[1]!.re } : null; };
  const unary = UNARY[head];
  if (unary && ops.length === 1) return (z) => { const v = ops[0]!(z); return v ? unary(v) : null; };
  return null;
}

/** A complex interval plan for a meromorphic expression in z, or null when it uses an operation that is not meromorphic. */
export function compileGraphComplexIntervalPlan(mathJson: unknown, parameters: Readonly<Record<string, number>> = {}, variable = 'z'): GraphComplexIntervalPlan | null {
  const root = compile(mathJson, parameters, variable);
  if (!root) return null;
  return {
    evaluate(box) {
      const result = root({ re: I.interval(box.reMin, box.reMax), im: I.interval(box.imMin, box.imMax) });
      if (!result || result.re.defined === 0 || result.im.defined === 0) return null;
      return result;
    },
  };
}
