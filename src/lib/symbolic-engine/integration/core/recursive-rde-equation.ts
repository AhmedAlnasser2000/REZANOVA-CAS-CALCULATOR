import { demand, type ExecutionContext } from './execution';
import type { DifferentialElement as E } from './differential-field';
import type { Polynomial as P } from './polynomial';
import { polynomialDivide, verifyDivision, type Division } from './polynomial-division';
import { differentiate, verifyDerivative, type DerivativeEvidence } from './differential-derivative';
import type { CertifiedTowerView } from './recursive-certified-tower';
import { recursiveFraction, recursivePolynomialValue, checkedDerivativePolynomial } from './recursive-rde-poles';

export interface RecursivePolynomialEquation {
  readonly common: P<E>;
  readonly quotients: readonly Division<E>[];
  readonly derivative: DerivativeEvidence;
  readonly A: P<E>;
  readonly B: P<E>;
  readonly C: readonly P<E>[];
}
export function recursivePolynomialEquation(ctx: ExecutionContext, view: CertifiedTowerView, a: E, forcing: readonly E[], U: P<E>): RecursivePolynomialEquation {
  const owner = view.owner, ring = owner.fractions!.ring, values = [a, ...forcing]; let common = ring.one(ctx);
  for (const value of values) common = ring.multiply(ctx, common, recursiveFraction(ctx, owner, value).denominator);
  ctx.allocate(values.length); const quotients = Object.freeze(values.map(v => polynomialDivide(ctx, ring, common, recursiveFraction(ctx, owner, v).denominator)));
  const ns = values.map((v, i) => ring.multiply(ctx, recursiveFraction(ctx, owner, v).numerator, quotients[i].quotient));
  const derivative = differentiate(ctx, owner, recursivePolynomialValue(ctx, owner, U)), du = checkedDerivativePolynomial(ctx, owner, derivative), U2 = ring.multiply(ctx, U, U);
  ctx.allocate(forcing.length + 6); const e = Object.freeze({common, quotients, derivative, A: ring.multiply(ctx, common, U),
    B: ring.subtract(ctx, ring.multiply(ctx, ns[0], U), ring.multiply(ctx, common, du)), C: Object.freeze(ns.slice(1).map(n => ring.multiply(ctx, n, U2)))});
  verifyRecursivePolynomialEquation(ctx, view, a, forcing, U, e); return e;
}
export function verifyRecursivePolynomialEquation(ctx: ExecutionContext, view: CertifiedTowerView, a: E, forcing: readonly E[], U: P<E>, e: RecursivePolynomialEquation): void {
  const owner = view.owner, ring = owner.fractions!.ring, values = [a, ...forcing]; let common = ring.one(ctx);
  for (const v of values) common = ring.multiply(ctx, common, recursiveFraction(ctx, owner, v).denominator);
  demand(e.quotients.length === values.length && e.C.length === forcing.length && ring.equal(ctx, common, e.common) && !ring.isZero(ctx, e.common), 'verification-failed', 'complete polynomial equation clearing');
  const ns: P<E>[] = []; ctx.allocate(values.length);
  for (let i = 0; i < values.length; i++) {
    const f = recursiveFraction(ctx, owner, values[i]); verifyDivision(ctx, ring, e.common, f.denominator, e.quotients[i]);
    demand(ring.isZero(ctx, e.quotients[i].remainder), 'verification-failed', 'exact equation clearing quotient');
    ns.push(ring.multiply(ctx, f.numerator, e.quotients[i].quotient));
  }
  verifyDerivative(ctx, owner, recursivePolynomialValue(ctx, owner, U), e.derivative);
  const du = checkedDerivativePolynomial(ctx, owner, e.derivative), U2 = ring.multiply(ctx, U, U);
  demand(ring.equal(ctx, e.A, ring.multiply(ctx, e.common, U)) && ring.equal(ctx, e.B,
    ring.subtract(ctx, ring.multiply(ctx, ns[0], U), ring.multiply(ctx, e.common, du))), 'verification-failed', 'invertible polynomial solution transformation');
  for (let i = 0; i < forcing.length; i++) demand(ring.equal(ctx, e.C[i], ring.multiply(ctx, ns[i + 1], U2)), 'verification-failed', 'polynomial forcing transformation');
}
