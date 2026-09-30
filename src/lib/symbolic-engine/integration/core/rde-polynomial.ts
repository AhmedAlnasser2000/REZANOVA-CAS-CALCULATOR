import { demand, type ExecutionContext } from './execution';
import type { DifferentialElement as E } from './differential-field';
import type { Polynomial as P } from './polynomial';
import type { LinearSystem } from './linear-system';
import { naturalDegree, primitiveTriple, verifyTriple, type PrimitiveTriple, type RdeDomain } from './rde-algebra';

export interface DegreeEvidence {
  readonly delta: number;
  readonly slope: E;
  readonly intercept: E;
  readonly forcing: bigint | null;
  readonly resonance: bigint | null;
  readonly bound: bigint;
}
export function polynomialEquation(ctx: ExecutionContext, d: RdeDomain, input: PrimitiveTriple, U: P<E>): PrimitiveTriple {
  const r = d.ring;
  return primitiveTriple(ctx, r, r.multiply(ctx, input.A, U),
    r.subtract(ctx, r.multiply(ctx, input.B, U), r.multiply(ctx, input.A, r.derivative(ctx, U))),
    r.multiply(ctx, input.C, r.multiply(ctx, U, U)));
}
export function verifyPolynomialEquation(ctx: ExecutionContext, d: RdeDomain, input: PrimitiveTriple, U: P<E>, proof: PrimitiveTriple): void {
  const r = d.ring;
  verifyTriple(ctx, r, r.multiply(ctx, input.A, U),
    r.subtract(ctx, r.multiply(ctx, input.B, U), r.multiply(ctx, input.A, r.derivative(ctx, U))),
    r.multiply(ctx, input.C, r.multiply(ctx, U, U)), proof);
}
function leadingData(ctx: ExecutionContext, d: RdeDomain, p: PrimitiveTriple) {
  const r = d.ring, zero = r.domain.fromInteger(ctx, 0n), fd = r.degree(ctx, p.A), gd = r.degree(ctx, p.B);
  const delta = Math.max(fd - 1, gd === -1 ? -Infinity : gd);
  ctx.allocate(3);
  return { delta, slope: fd - 1 === delta ? r.leading(ctx, p.A) : zero,
    intercept: gd !== -1 && gd === delta ? r.leading(ctx, p.B) : zero };
}
export function degreeBound(ctx: ExecutionContext, d: RdeDomain, p: PrimitiveTriple): DegreeEvidence {
  const { delta, slope, intercept } = leadingData(ctx, d, p), r = d.ring;
  let forcing: bigint | null = null, resonance: bigint | null = null;
  if (!r.isZero(ctx, p.C)) {
    const candidate = BigInt(r.degree(ctx, p.C) - delta); if (candidate >= 0n) forcing = candidate;
  }
  if (!r.domain.isZero(ctx, slope)) {
    const root = r.domain.exactDivide(ctx, r.domain.negate(ctx, intercept), slope);
    demand(root.kind === 'scalar', 'domain-mismatch', 'degree resonance scalar');
    if (root.value.denominator === 1n && root.value.numerator >= 0n) resonance = root.value.numerator;
  }
  const bound = forcing === null ? (resonance ?? -1n) : resonance === null ? forcing : forcing > resonance ? forcing : resonance;
  ctx.allocate(6); const proof = Object.freeze({ delta, slope, intercept, forcing, resonance, bound });
  verifyDegree(ctx, d, p, proof); return proof;
}
export function verifyDegree(ctx: ExecutionContext, d: RdeDomain, p: PrimitiveTriple, e: DegreeEvidence): void {
  const expected = leadingData(ctx, d, p), q = d.ring.domain;
  demand(e.delta === expected.delta && q.equal(ctx, e.slope, expected.slope) && q.equal(ctx, e.intercept, expected.intercept),
    'verification-failed', 'degree leading polynomial');
  demand(!q.isZero(ctx, e.slope) || !q.isZero(ctx, e.intercept), 'verification-failed', 'zero degree polynomial');
  const forcingDegree = d.ring.isZero(ctx, p.C) ? null : BigInt(d.ring.degree(ctx, p.C) - expected.delta);
  demand(e.forcing === (forcingDegree !== null && forcingDegree >= 0n ? forcingDegree : null), 'verification-failed', 'forcing degree');
  let root: bigint | null = null;
  if (!q.isZero(ctx, expected.slope)) {
    const candidate = q.exactDivide(ctx, q.negate(ctx, expected.intercept), expected.slope);
    demand(candidate.kind === 'scalar', 'domain-mismatch', 'degree scalar');
    if (candidate.value.denominator === 1n && candidate.value.numerator >= 0n) root = candidate.value.numerator;
  }
  demand(e.resonance === root, 'verification-failed', 'degree resonance');
  const upper = e.forcing === null ? (root ?? -1n) : root === null ? e.forcing : e.forcing > root ? e.forcing : root;
  demand(e.bound === upper, 'verification-failed', 'numerator degree bound'); ctx.integer(e.bound);
}
function column(ctx: ExecutionContext, d: RdeDomain, p: PrimitiveTriple, j: number): P<E> {
  ctx.degree(j); ctx.allocate(j + 1);
  const coefficients = Array<E>(j + 1).fill(d.ring.domain.fromInteger(ctx, 0n)); coefficients[j] = d.ring.domain.fromInteger(ctx, 1n);
  const monomial = d.ring.make(ctx, coefficients);
  return d.ring.add(ctx, d.ring.multiply(ctx, p.A, d.ring.derivative(ctx, monomial)), d.ring.multiply(ctx, p.B, monomial));
}
export function rdeMatrix(ctx: ExecutionContext, d: RdeDomain, p: PrimitiveTriple, n: bigint): LinearSystem<E> {
  const columns = naturalDegree(ctx, n) + 1, images: P<E>[] = []; ctx.allocate(columns);
  let rows = p.C.coefficients.length;
  for (let j = 0; j < columns; j++) { const image = column(ctx, d, p, j); images.push(image); rows = Math.max(rows, image.coefficients.length); }
  const size = ctx.multiply(BigInt(rows), ctx.add(BigInt(columns), 2n));
  if (size > BigInt(ctx.limits.allocation) || size > BigInt(Number.MAX_SAFE_INTEGER)) ctx.exhaust('RDE-matrix-allocation');
  ctx.allocate(Number(size) + 4);
  const zero = d.ring.domain.fromInteger(ctx, 0n), matrix: (readonly E[])[] = [], rhs: E[] = [];
  for (let i = 0; i < rows; i++) {
    ctx.tick(columns + 1); matrix.push(Object.freeze(images.map(image => image.coefficients[i] ?? zero))); rhs.push(p.C.coefficients[i] ?? zero);
  }
  return Object.freeze({ rows, columns, matrix: Object.freeze(matrix), rhs: Object.freeze(rhs) });
}
export function verifyRdeMatrix(ctx: ExecutionContext, d: RdeDomain, p: PrimitiveTriple, n: bigint, matrix: LinearSystem<E>): void {
  const columns = naturalDegree(ctx, n) + 1;
  demand(matrix.columns === columns && Number.isSafeInteger(matrix.rows) && matrix.rows >= 0
    && matrix.matrix.length === matrix.rows && matrix.rhs.length === matrix.rows, 'verification-failed', 'RDE matrix dimensions');
  ctx.degree(matrix.rows - 1);
  for (const row of matrix.matrix) { ctx.tick(); demand(row.length === columns, 'verification-failed', 'RDE matrix row'); }
  const r = d.ring;
  demand(r.equal(ctx, r.make(ctx, matrix.rhs), p.C), 'verification-failed', 'RDE matrix forcing');
  let rows = p.C.coefficients.length;
  for (let j = 0; j < columns; j++) {
    const expected = column(ctx, d, p, j); rows = Math.max(rows, expected.coefficients.length);
    ctx.allocate(matrix.rows); ctx.tick(matrix.rows);
    demand(r.equal(ctx, r.make(ctx, matrix.matrix.map(row => row[j])), expected), 'verification-failed', 'RDE matrix column');
  }
  demand(matrix.rows === rows, 'verification-failed', 'RDE matrix equation coverage');
}
