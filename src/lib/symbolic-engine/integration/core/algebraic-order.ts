import { demand, type ExecutionContext } from './execution';
import type { Rational } from './rational';
import type { Polynomial } from './polynomial';
import { RationalFunctionField } from './rational-function';
import type { AlgebraicElement } from './algebraic-field';
import type { AlgebraicIntegralModel } from './algebraic-integral-model';
import type { FunctionScalar } from './algebraic-presentation';
import { equalExactMatrices, freezeExactMatrix, invertExactMatrix, verifyExactMatrixInverse,
  determinantFromInverse, type ExactMatrix, type MatrixInverse } from './algebraic-matrix';
import type { PolynomialMatrix } from './polynomial-module';

export interface AlgebraicOrder {
  readonly basis: ExactMatrix<FunctionScalar>;
  readonly inverse: MatrixInverse<FunctionScalar>;
  readonly multiplication: readonly PolynomialMatrix<Rational>[];
  readonly traces: readonly Polynomial<Rational>[];
  readonly traceMatrix: PolynomialMatrix<Rational>;
  readonly traceInverse: MatrixInverse<FunctionScalar>;
  readonly discriminant: Polynomial<Rational>;
}
export function modelBase(model: AlgebraicIntegralModel): RationalFunctionField<Rational> {
  return model.field.parent as RationalFunctionField<Rational>;
}
export function orderColumn(ctx: ExecutionContext, model: AlgebraicIntegralModel, basis: ExactMatrix<FunctionScalar>, column: number): AlgebraicElement<FunctionScalar> {
  ctx.allocate(basis.length); return model.field.make(ctx, model.field.ring.make(ctx, basis.map(row => row[column])));
}
export function orderCoordinates(ctx: ExecutionContext, model: AlgebraicIntegralModel, inverse: ExactMatrix<FunctionScalar>, value: AlgebraicElement<FunctionScalar>): readonly FunctionScalar[] {
  model.field.assert(ctx, value); const f = modelBase(model), n = inverse.length; ctx.allocate(n);
  return Object.freeze(inverse.map(row => {
    demand(row.length === n, 'verification-failed', 'order inverse dimensions'); let sum = f.fromInteger(ctx, 0n);
    for (let i = 0; i < n; i++) sum = f.add(ctx, sum, f.multiply(ctx, row[i], value.representative.coefficients[i] ?? f.fromInteger(ctx, 0n))); return sum;
  }));
}
export function polynomialScalar(ctx: ExecutionContext, base: RationalFunctionField<Rational>, value: FunctionScalar): Polynomial<Rational> {
  base.assert(ctx, value); demand(base.ring.degree(ctx, value.denominator) === 0, 'verification-failed', 'order requires polynomial coordinates'); return value.numerator;
}
function newtonTrace(ctx: ExecutionContext, model: AlgebraicIntegralModel, value: AlgebraicElement<FunctionScalar>): FunctionScalar {
  const f = modelBase(model), n = model.field.ring.degree(ctx, model.field.modulus); ctx.allocate(n);
  const sums = [f.fromInteger(ctx, BigInt(n))];
  for (let k = 1; k < n; k++) {
    let sum = f.multiply(ctx, f.fromInteger(ctx, BigInt(k)), model.field.modulus.coefficients[n - k]);
    for (let j = 1; j < k; j++) sum = f.add(ctx, sum, f.multiply(ctx, model.field.modulus.coefficients[n - j], sums[k - j])); sums.push(f.negate(ctx, sum));
  }
  let out = f.fromInteger(ctx, 0n);
  for (let i = 0; i < value.representative.coefficients.length; i++) out = f.add(ctx, out, f.multiply(ctx, value.representative.coefficients[i], sums[i])); return out;
}
function orderTables(ctx: ExecutionContext, model: AlgebraicIntegralModel, basis: ExactMatrix<FunctionScalar>, inverse: ExactMatrix<FunctionScalar>) {
  const f = modelBase(model), n = basis.length; ctx.allocate(n * n * n + n * n + n * 2);
  const elements = Array.from({length: n}, (_, i) => orderColumn(ctx, model, basis, i));
  const multiplication = Object.freeze(elements.map(b => {
    const columns = elements.map(a => orderCoordinates(ctx, model, inverse, model.field.multiply(ctx, a, b)));
    return freezeExactMatrix(ctx, Array.from({length: n}, (_, i) => columns.map(c => polynomialScalar(ctx, f, c[i]))));
  }));
  const traces = Object.freeze(elements.map((e, j) => {
    let trace = f.ring.zero(ctx); for (let i = 0; i < n; i++) trace = f.ring.add(ctx, trace, multiplication[j][i][i]);
    demand(f.equal(ctx, f.make(ctx, trace, f.ring.one(ctx)), newtonTrace(ctx, model, e)), 'verification-failed', 'order independent Newton trace'); return trace;
  }));
  const traceMatrix = freezeExactMatrix(ctx, elements.map((_, i) => elements.map((_, j) => {
    let sum = f.ring.zero(ctx); for (let k = 0; k < n; k++) sum = f.ring.add(ctx, sum, f.ring.multiply(ctx, multiplication[j][k][i], traces[k])); return sum;
  })));
  return {multiplication, traces, traceMatrix};
}
export function constructAlgebraicOrderWithin(ctx: ExecutionContext, model: AlgebraicIntegralModel, basis: ExactMatrix<FunctionScalar>): AlgebraicOrder {
  const f = modelBase(model), n = model.field.ring.degree(ctx, model.field.modulus);
  demand(basis.length === n && basis.every(row => row.length === n), 'invalid-input', 'full order basis');
  const inverse = invertExactMatrix(ctx, f, basis); demand(inverse !== null, 'verification-failed', 'order basis independence');
  const tables = orderTables(ctx, model, basis, inverse.inverse);
  const gram = freezeExactMatrix(ctx, tables.traceMatrix.map(row => row.map(p => f.make(ctx, p, f.ring.one(ctx))))), traceInverse = invertExactMatrix(ctx, f, gram);
  demand(traceInverse !== null, 'verification-failed', 'nondegenerate trace form');
  const discriminant = polynomialScalar(ctx, f, determinantFromInverse(ctx, f, traceInverse));
  const proof = Object.freeze({basis, inverse, ...tables, traceInverse, discriminant}); verifyAlgebraicOrderWithin(ctx, model, proof); return proof;
}
export function verifyAlgebraicOrderWithin(ctx: ExecutionContext, model: AlgebraicIntegralModel, proof: AlgebraicOrder): void {
  const f = modelBase(model), r = f.ring, n = model.field.ring.degree(ctx, model.field.modulus);
  demand(proof.basis.length === n && proof.basis.every(row => row.length === n), 'verification-failed', 'order basis coverage');
  verifyExactMatrixInverse(ctx, f, proof.basis, proof.inverse);
  const one = orderCoordinates(ctx, model, proof.inverse.inverse, model.field.fromInteger(ctx, 1n));
  for (const v of one) polynomialScalar(ctx, f, v);
  const tables = orderTables(ctx, model, proof.basis, proof.inverse.inverse);
  demand(proof.multiplication.length === n && proof.traces.length === n, 'verification-failed', 'order multiplication coverage');
  for (let i = 0; i < n; i++) demand(equalExactMatrices(ctx, QPolynomialField(r), tables.multiplication[i], proof.multiplication[i])
    && r.equal(ctx, tables.traces[i], proof.traces[i]), 'verification-failed', 'order multiplication/trace identities');
  demand(equalExactMatrices(ctx, QPolynomialField(r), tables.traceMatrix, proof.traceMatrix), 'verification-failed', 'order trace matrix');
  const gram = freezeExactMatrix(ctx, tables.traceMatrix.map(row => row.map(p => f.make(ctx, p, r.one(ctx)))));
  verifyExactMatrixInverse(ctx, f, gram, proof.traceInverse);
  demand(r.equal(ctx, proof.discriminant, polynomialScalar(ctx, f, determinantFromInverse(ctx, f, proof.traceInverse))), 'verification-failed', 'order trace discriminant');
}
// Only equality is needed. Keep Q[x] a ring; this helper grants no capability.
function QPolynomialField(r: RationalFunctionField<Rational>['ring']) {
  return {equal: (ctx: ExecutionContext, a: Polynomial<Rational>, b: Polynomial<Rational>) => r.equal(ctx, a, b)};
}
