import { demand, type ExecutionContext } from '../execution';
import type { Polynomial } from '../algebra/polynomial';
import { determinant } from '../algebra/linear';
import { iexact, igcd, imul } from '../algebra/integer';
import { rAbs, rAdd, rational, rDivide, rMultiply, rNegate, rSubtract, type Rational } from '../algebra/rational';
import { compareRational } from '../algebraic/real-roots';
import { refineComplex, refineReal } from '../algebraic/root-of';
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
 * so N ≢ 0 whenever f ≢ 0. Candidate roots of N are then tested on f itself
 * by certified disk evaluation, refined until the disk excludes zero or falls
 * below Liouville's lower bound for nonzero values (then the value is zero).
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

/** ⌈log₂ ‖P‖₂⌉ for an integer polynomial: an upper bound for log₂ of its Mahler measure (Landau). */
function log2Norm(ctx: ExecutionContext, poly: Polynomial<bigint>): bigint {
  let sum = 0n;
  for (const c of poly.coefficients) sum += imul(ctx, c, c);
  return BigInt((sum.toString(2).length + 1) >> 1);
}

const bits = (n: bigint) => BigInt((n < 0n ? -n : n).toString(2).length);

/**
 * A rational T > 0 such that f(point) ≠ 0 implies |f(point)| ≥ T, by Liouville's
 * inequality (Waldschmidt, Diophantine Approximation on Linear Algebraic Groups,
 * Prop. 3.14): for F ∈ ℤ[X₁…Xₖ] of degree Nᵢ in Xᵢ and algebraic αᵢ in a field of
 * degree D, F(α) ≠ 0 implies log|F(α)| ≥ −(D−1)·log L(F) − D·Σ Nᵢ·h(αᵢ), where L
 * is the sum of |coefficients| and h(α) = log M(min α)/deg α ≤ log ‖min α‖₂/deg α.
 * Here f = Σ cᵢ xⁱ is F(point, generators…)/Q with Q the common denominator of
 * the rational coefficients, each distinct non-rational coefficient a variable of
 * degree 1, D bounded by the product of the degrees (a larger D only weakens the
 * bound, as does D·log L in place of (D−1)·log L). RootOf polynomials are minimal.
 */
function liouvilleThreshold(ctx: ExecutionContext, coefficients: readonly ExactValue[], point: ExactValue): Rational {
  let Q = 1n;
  for (const c of coefficients) if (c.kind === 'rational') Q = iexact(ctx, imul(ctx, Q, c.value.denominator), igcd(ctx, Q, c.value.denominator));
  let L = 0n;
  const generators = new Map<string, Polynomial<bigint>>();
  for (const c of coefficients) {
    if (c.kind === 'rational') { L += imul(ctx, Q, c.value.numerator < 0n ? -c.value.numerator : c.value.numerator) / c.value.denominator; continue; }
    L += Q;
    generators.set(c.root.poly.coefficients.join(','), c.root.poly);
  }
  const pointPoly = asRoot(ctx, point).poly, n = BigInt(coefficients.length - 1);
  const degree = (p: Polynomial<bigint>) => BigInt(p.coefficients.length - 1);
  let D = degree(pointPoly);
  for (const g of generators.values()) D *= degree(g);
  // log₂(1/T) ≤ D·log₂ L + (D/deg x₀)·n·log₂ M(x₀) + Σ (D/deg g)·log₂ M(g) + log₂ Q.
  let total = D * bits(L) + (D / degree(pointPoly)) * n * log2Norm(ctx, pointPoly) + bits(Q);
  for (const g of generators.values()) total += (D / degree(g)) * log2Norm(ctx, g);
  return rational(ctx, 1n, 1n << total);
}

/**
 * f(point) as a certified disk that either excludes zero or is smaller than the
 * Liouville threshold (then f(point) = 0 exactly): refining doubles the precision.
 */
function decideValue(ctx: ExecutionContext, coefficients: readonly ExactValue[], point: ExactValue): Disk | 'zero' {
  let threshold: Rational | undefined;
  for (let w = 16n; ;) {
    ctx.tick();
    const d = diskValue(ctx, coefficients, point, rational(ctx, 1n, 1n << w));
    if (!mayContainZero(ctx, d)) return d;
    threshold ??= liouvilleThreshold(ctx, coefficients, point);
    if (compareRational(ctx, rAdd(ctx, rAdd(ctx, rAbs(ctx, d.re), rAbs(ctx, d.im)), d.r), threshold) < 0) return 'zero';
    // The radius scales with the width: aim directly below the threshold, at least doubling.
    const growth = bits(d.r.numerator) - bits(d.r.denominator) + w + 1n;
    w = [w * 2n, growth + bits(threshold.denominator) + 4n].reduce((a, b) => (a > b ? a : b));
  }
}

/** Whether f(point) = 0, exactly. */
export function vanishesAt(ctx: ExecutionContext, coefficients: readonly ExactValue[], point: ExactValue): boolean {
  if (coefficients.length === 0) return true;
  return decideValue(ctx, coefficients, point) === 'zero';
}

/** Sign of f(point) for real coefficients at a real point, exactly. */
export function signAt(ctx: ExecutionContext, coefficients: readonly ExactValue[], point: ExactValue): -1 | 0 | 1 {
  if (coefficients.length === 0) return 0;
  const d = decideValue(ctx, coefficients, point);
  if (d === 'zero') return 0;
  demand(d.im.numerator === 0n, 'verification-failed', 'real polynomial took a non-real value at a real point');
  return d.re.numerator < 0n ? -1 : 1;
}
