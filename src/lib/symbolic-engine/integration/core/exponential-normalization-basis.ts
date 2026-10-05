import { demand, type ExecutionContext } from './execution';
import { assertDifferentialFieldOwner, type DifferentialField, type DifferentialElement as E } from './differential-field';
import { requireRationalVariable } from './differential-admission';
import { rationalField } from './field';
import { integerGcd, rational, type Rational } from './rational';
import { solveLinearSystem, verifyLinearSolution, type LinearSolution, type LinearSystem } from './linear-system';
import { exactDivide, polynomialGcd } from './polynomial-division';
import type { Polynomial } from './polynomial';

export interface ExponentialBasisEvidence {
  readonly denominator: Polynomial<E>;
  /** Quotients of the common denominator by [1, ...argument denominators]. */
  readonly quotients: readonly Polynomial<E>[];
  readonly elimination: LinearSolution<Rational>;
  readonly scales: readonly bigint[];
  /** First basis element is a positive rational constant. Others are independent modulo constants. */
  readonly basis: readonly E[];
  readonly coordinates: readonly (readonly bigint[])[];
}
function inputs(ctx: ExecutionContext, owner: DifferentialField, arguments_: readonly E[]) {
  assertDifferentialFieldOwner(ctx, owner); requireRationalVariable(ctx, owner);
  demand(Array.isArray(arguments_), 'invalid-input', 'exponential arguments'); ctx.allocate(arguments_.length + 1);
  for (const a of arguments_) owner.assert(ctx, a);
  return [owner.fromInteger(ctx, 1n), ...arguments_];
}
function matrix(ctx: ExecutionContext, owner: DifferentialField, values: readonly E[], denominator: Polynomial<E>, quotients: readonly Polynomial<E>[]): LinearSystem<Rational> {
  const ring = owner.fractions!.ring; ring.assert(ctx, denominator);
  demand(!ring.isZero(ctx, denominator) && quotients.length === values.length, 'verification-failed', 'basis denominator coverage');
  const columns: Polynomial<E>[] = []; ctx.allocate(values.length);
  let rows = 0;
  for (let i = 0; i < values.length; i++) {
    ctx.tick(); const a = values[i]; demand(a.kind === 'fraction', 'domain-mismatch', 'basis rational argument');
    demand(ring.equal(ctx, ring.multiply(ctx, quotients[i], a.value.denominator), denominator), 'verification-failed', 'basis denominator reconstruction');
    const p = ring.multiply(ctx, quotients[i], a.value.numerator); columns.push(p); rows = Math.max(rows, p.coefficients.length);
  }
  ctx.allocate(rows * (values.length + 2) + 4);
  const data: Rational[][] = [];
  for (let i = 0; i < rows; i++) {
    const row: Rational[] = [];
    for (const p of columns) {
      ctx.tick(); const a = p.coefficients[i];
      if (a) { demand(a.kind === 'scalar', 'domain-mismatch', 'basis scalar coefficient'); row.push(a.value); }
      else row.push(rational(ctx, 0n));
    }
    data.push(row);
  }
  return {rows, columns: values.length, matrix: data, rhs: Array.from({length: rows}, () => rational(ctx, 0n))};
}
function lcm(ctx: ExecutionContext, a: bigint, b: bigint) { return ctx.multiply(ctx.quotient(a, integerGcd(ctx, a, b)), b); }
function expected(ctx: ExecutionContext, owner: DifferentialField, values: readonly E[], elimination: LinearSolution<Rational>) {
  demand(elimination.kind === 'consistent' && elimination.rank >= 1 && elimination.pivots[0] === 0,
    'verification-failed', 'basis homogeneous elimination');
  const {rank, pivots, reduced} = elimination;
  ctx.allocate(rank * (values.length + 4) + values.length);
  const scales: bigint[] = [], basis: E[] = [], coordinates: bigint[][] = Array.from({length: values.length - 1}, () => []);
  for (let i = 0; i < rank; i++) {
    ctx.tick(); let scale = 1n;
    for (let j = 0; j < values.length; j++) scale = lcm(ctx, scale, reduced[i][j].denominator);
    scales.push(scale);
    basis.push(owner.multiply(ctx, values[pivots[i]], owner.embed(ctx, owner.parent!.scalar(ctx, rational(ctx, 1n, scale)))));
    for (let j = 1; j < values.length; j++) {
      const c = reduced[i][j]; coordinates[j - 1].push(ctx.multiply(c.numerator, ctx.quotient(scale, c.denominator)));
    }
  }
  return {scales: Object.freeze(scales), basis: Object.freeze(basis), coordinates: Object.freeze(coordinates.map(c => Object.freeze(c)))};
}
/** The leading constant column separates independence modulo Q from constant shifts. */
export function constructExponentialBasis(ctx: ExecutionContext, owner: DifferentialField, arguments_: readonly E[]): ExponentialBasisEvidence {
  const values = inputs(ctx, owner, arguments_), ring = owner.fractions!.ring;
  let denominator = ring.one(ctx);
  for (const a of values) {
    demand(a.kind === 'fraction', 'domain-mismatch', 'basis fraction');
    denominator = ring.multiply(ctx, exactDivide(ctx, ring, denominator, polynomialGcd(ctx, ring, denominator, a.value.denominator)), a.value.denominator);
  }
  ctx.allocate(values.length + 4);
  const quotients = Object.freeze(values.map(a => { demand(a.kind === 'fraction', 'domain-mismatch', 'basis fraction'); return exactDivide(ctx, ring, denominator, a.value.denominator); }));
  const elimination = solveLinearSystem(ctx, rationalField, matrix(ctx, owner, values, denominator, quotients));
  const out = Object.freeze({denominator, quotients, elimination, ...expected(ctx, owner, values, elimination)});
  verifyExponentialBasis(ctx, owner, arguments_, out); return out;
}
export function verifyExponentialBasis(ctx: ExecutionContext, owner: DifferentialField, arguments_: readonly E[], proof: ExponentialBasisEvidence): void {
  const values = inputs(ctx, owner, arguments_);
  verifyLinearSolution(ctx, rationalField, matrix(ctx, owner, values, proof.denominator, proof.quotients), proof.elimination);
  const e = expected(ctx, owner, values, proof.elimination);
  demand(proof.scales.length === e.scales.length && proof.basis.length === e.basis.length
    && proof.coordinates.length === arguments_.length, 'verification-failed', 'basis dimensions');
  for (let i = 0; i < e.basis.length; i++) {
    ctx.tick(); ctx.integer(proof.scales[i]);
    demand(proof.scales[i] === e.scales[i] && owner.equal(ctx, proof.basis[i], e.basis[i]), 'verification-failed', 'basis scaling');
  }
  for (let j = 0; j < arguments_.length; j++) {
    demand(proof.coordinates[j].length === e.basis.length, 'verification-failed', 'basis coordinate dimension');
    let sum = owner.fromInteger(ctx, 0n);
    for (let i = 0; i < e.basis.length; i++) {
      const n = proof.coordinates[j][i]; ctx.integer(n);
      demand(n === e.coordinates[j][i], 'verification-failed', 'basis coordinate');
      sum = owner.add(ctx, sum, owner.multiply(ctx, proof.basis[i], owner.fromInteger(ctx, n)));
    }
    demand(owner.equal(ctx, sum, arguments_[j]), 'verification-failed', 'argument reconstruction');
  }
}
