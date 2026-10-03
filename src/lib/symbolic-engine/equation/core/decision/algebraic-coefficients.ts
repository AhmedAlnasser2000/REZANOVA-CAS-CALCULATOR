import { demand, type ExecutionContext } from '../execution';
import type { Polynomial } from '../algebra/polynomial';
import { determinant } from '../algebra/linear';
import { rAbs, rAdd, rational, rDivide, rMultiply, rNegate, rSubtract, type Rational } from '../algebra/rational';
import { compareRational } from '../algebraic/real-roots';
import { compareReal, refineComplex, refineReal, type RealRootOf } from '../algebraic/root-of';
import { addValues, asRoot, multiplyValues, type ExactValue } from '../representation/evaluate';
import type { ExpressionStore } from '../representation/expression';
import { QX } from './rational-form';

/**
 * Polynomials with algebraic coefficients f = Σ cᵢ xⁱ.
 *
 * Norm: each distinct non-rational coefficient value is a generator with
 * minimal polynomial mₖ; on A = ⊗ ℚ[z]/(mₖ) multiplication by f(x₀) is
 * Σ x₀ⁱ·M(cᵢ) with Kronecker companion matrices, and N(x) = det(Σ xⁱ·M(cᵢ))
 * is a polynomial over ℚ vanishing at every root of f (the true embedding is
 * one of the conjugate tuples). Nonzero coefficients have nonzero conjugates,
 * so N ≢ 0 whenever f ≢ 0. Candidate roots of N are then tested on f itself:
 * cheaply rejected by certified disk evaluation, otherwise decided exactly.
 */
type Matrix = Rational[][];

function companion(ctx: ExecutionContext, poly: Polynomial<bigint>): Matrix {
  const m = poly.coefficients, d = m.length - 1, lead = rational(ctx, m[d]);
  const c: Matrix = Array.from({ length: d }, () => Array.from({ length: d }, () => rational(ctx, 0n)));
  for (let j = 0; j + 1 < d; j++) c[j + 1][j] = rational(ctx, 1n);
  for (let i = 0; i < d; i++) c[i][d - 1] = rNegate(ctx, rDivide(ctx, rational(ctx, m[i]), lead));
  return c;
}

/** Newton divided differences at x = 0..D, converted to monomial coefficients and checked. */
function interpolate(ctx: ExecutionContext, values: readonly Rational[]): Polynomial<Rational> {
  const D = values.length - 1, dd = [...values];
  for (let level = 1; level <= D; level++) {
    for (let i = D; i >= level; i--) dd[i] = rDivide(ctx, rSubtract(ctx, dd[i], dd[i - 1]), rational(ctx, BigInt(level)));
  }
  let poly = QX.constant(ctx, dd[D]);
  for (let i = D - 1; i >= 0; i--) {
    poly = QX.add(ctx, QX.multiply(ctx, poly, QX.make(ctx, [rational(ctx, BigInt(-i)), rational(ctx, 1n)])), QX.constant(ctx, dd[i]));
  }
  for (let x = 0; x <= D; x++) demand(QX.evaluate(ctx, poly, rational(ctx, BigInt(x))).numerator === values[x].numerator
    && QX.evaluate(ctx, poly, rational(ctx, BigInt(x))).denominator === values[x].denominator, 'verification-failed', 'norm interpolation');
  return poly;
}

/** The norm polynomial N ∈ ℚ[x] of f (leading coefficient nonzero, degree n·dim A). */
export function normPolynomial(store: ExpressionStore, coefficients: readonly ExactValue[]): Polynomial<Rational> {
  const ctx = store.ctx;
  demand(coefficients.length > 0, 'invalid-input', 'norm of the zero polynomial');
  const generators = new Map<string, Polynomial<bigint>>();
  const keys = coefficients.map(c => {
    if (c.kind === 'rational') return undefined;
    const canonical = store.roots.canonical(ctx, c.root);
    generators.set(canonical.key, canonical.poly);
    return canonical.key;
  });
  const order = [...generators.keys()].sort();
  const dims = order.map(k => (generators.get(k) as Polynomial<bigint>).coefficients.length - 1);
  const size = dims.reduce((a, b) => a * b, 1);
  ctx.allocate(size * size * (order.length + 1));
  // Mixed-radix digits of a basis index, one per generator.
  const digits = (index: number) => dims.map((_, k) => Math.floor(index / dims.slice(k + 1).reduce((a, b) => a * b, 1)) % dims[k]);
  const basis = Array.from({ length: size }, (_, i) => digits(i));
  const generatorMatrix = new Map<string, Matrix>();
  order.forEach((key, k) => {
    const c = companion(ctx, generators.get(key) as Polynomial<bigint>);
    generatorMatrix.set(key, basis.map(ti => basis.map(tj => (ti.every((v, h) => h === k || v === tj[h]) ? c[ti[k]][tj[k]] : rational(ctx, 0n)))));
  });
  const n = coefficients.length - 1, degree = n * size;
  const values: Rational[] = [];
  for (let x = 0; x <= degree; x++) {
    ctx.tick();
    const m: Matrix = Array.from({ length: size }, () => Array.from({ length: size }, () => rational(ctx, 0n)));
    let power = rational(ctx, 1n);
    coefficients.forEach((c, i) => {
      if (i > 0) power = rMultiply(ctx, power, rational(ctx, BigInt(x)));
      const key = keys[i];
      if (key === undefined) {
        const s = rMultiply(ctx, power, (c as { value: Rational }).value);
        for (let r = 0; r < size; r++) m[r][r] = rAdd(ctx, m[r][r], s);
      } else {
        const g = generatorMatrix.get(key) as Matrix;
        for (let r = 0; r < size; r++) for (let q = 0; q < size; q++) if (g[r][q].numerator !== 0n) m[r][q] = rAdd(ctx, m[r][q], rMultiply(ctx, power, g[r][q]));
      }
    });
    values.push(determinant(ctx, m));
  }
  const norm = interpolate(ctx, values);
  demand(QX.degree(ctx, norm) === degree, 'verification-failed', 'norm degree');
  return norm;
}

// ---- certified disk evaluation ----

interface Disk { readonly re: Rational; readonly im: Rational; readonly r: Rational }

function diskOf(ctx: ExecutionContext, v: ExactValue, width: Rational): Disk {
  const zero = rational(ctx, 0n), two = rational(ctx, 2n);
  if (v.kind === 'rational') return { re: v.value, im: zero, r: zero };
  const root = v.root;
  if (root.kind === 'real') {
    const t = root.poly.coefficients.length === 2 ? root : refineReal(ctx, root, width);
    return { re: rDivide(ctx, rAdd(ctx, t.lo, t.hi), two), im: zero, r: rDivide(ctx, rSubtract(ctx, t.hi, t.lo), two) };
  }
  const t = root.radius.numerator === 0n ? root : refineComplex(ctx, root, width);
  return { re: t.re, im: t.im, r: t.radius };
}

function diskAdd(ctx: ExecutionContext, a: Disk, b: Disk): Disk { return { re: rAdd(ctx, a.re, b.re), im: rAdd(ctx, a.im, b.im), r: rAdd(ctx, a.r, b.r) }; }

function diskMultiply(ctx: ExecutionContext, a: Disk, b: Disk): Disk {
  const re = rSubtract(ctx, rMultiply(ctx, a.re, b.re), rMultiply(ctx, a.im, b.im));
  const im = rAdd(ctx, rMultiply(ctx, a.re, b.im), rMultiply(ctx, a.im, b.re));
  const size = (d: Disk) => rAdd(ctx, rAbs(ctx, d.re), rAbs(ctx, d.im));
  const r = rAdd(ctx, rAdd(ctx, rMultiply(ctx, size(a), b.r), rMultiply(ctx, size(b), a.r)), rMultiply(ctx, a.r, b.r));
  return { re, im, r };
}

function mayContainZero(ctx: ExecutionContext, d: Disk): boolean {
  return compareRational(ctx, rAdd(ctx, rMultiply(ctx, d.re, d.re), rMultiply(ctx, d.im, d.im)), rMultiply(ctx, d.r, d.r)) <= 0;
}

/** Two refinement levels for the cheap disk test before exact arithmetic decides. */
const PREFILTER_WIDTHS = [16n, 64n] as const;

function diskValue(ctx: ExecutionContext, coefficients: readonly ExactValue[], point: ExactValue, width: Rational): Disk {
  const x = diskOf(ctx, point, width);
  let acc = diskOf(ctx, coefficients[coefficients.length - 1], width);
  for (let i = coefficients.length - 2; i >= 0; i--) acc = diskAdd(ctx, diskMultiply(ctx, acc, x), diskOf(ctx, coefficients[i], width));
  return acc;
}

export function exactValueAt(ctx: ExecutionContext, coefficients: readonly ExactValue[], point: ExactValue): ExactValue {
  let acc = coefficients[coefficients.length - 1];
  for (let i = coefficients.length - 2; i >= 0; i--) acc = addValues(ctx, multiplyValues(ctx, acc, point), coefficients[i]);
  return acc;
}

/** Whether f(point) = 0, exactly. */
export function vanishesAt(ctx: ExecutionContext, coefficients: readonly ExactValue[], point: ExactValue): boolean {
  if (coefficients.length === 0) return true;
  for (const w of PREFILTER_WIDTHS) {
    if (!mayContainZero(ctx, diskValue(ctx, coefficients, point, rational(ctx, 1n, 1n << w)))) return false;
  }
  const v = exactValueAt(ctx, coefficients, point);
  return v.kind === 'rational' && v.value.numerator === 0n;
}

/** Sign of f(point) for real coefficients at a real point, exactly. */
export function signAt(ctx: ExecutionContext, coefficients: readonly ExactValue[], point: ExactValue): -1 | 0 | 1 {
  if (coefficients.length === 0) return 0;
  for (const w of PREFILTER_WIDTHS) {
    const d = diskValue(ctx, coefficients, point, rational(ctx, 1n, 1n << w));
    if (!mayContainZero(ctx, d)) return d.re.numerator < 0n ? -1 : 1;
  }
  const v = exactValueAt(ctx, coefficients, point);
  if (v.kind === 'rational') return v.value.numerator === 0n ? 0 : v.value.numerator < 0n ? -1 : 1;
  demand(v.root.kind === 'real', 'verification-failed', 'real polynomial took a non-real value at a real point');
  return compareReal(ctx, v.root, asRoot(ctx, { kind: 'rational', value: rational(ctx, 0n) }) as RealRootOf) as -1 | 1;
}
