import type { ExecutionContext } from './execution';
import { arithmeticModuleHermite, verifyArithmeticModuleHermite, type EuclideanPolynomialArithmetic, type ArithmeticModuleEvidence } from './arithmetic-polynomial-module';
import type { PositivePolynomial, PositivePolynomialRing } from './positive-polynomial';
export type PositiveModule<E> = ArithmeticModuleEvidence<E, PositivePolynomial<E>>;
export function positiveModuleMechanics<E>(r: PositivePolynomialRing<E>): EuclideanPolynomialArithmetic<E, PositivePolynomial<E>> {
  return {domain: r.field, assert:(c,p)=>r.assert(c,p), zero:c=>r.zero(c), one:c=>r.one(c), isZero:(c,p)=>r.isZero(c,p), degree:(c,p)=>r.degree(c,p), leading:(c,p)=>r.leading(c,p),
    add:(c,a,b)=>r.add(c,a,b), subtract:(c,a,b)=>r.subtract(c,a,b), multiply:(c,a,b)=>r.multiply(c,a,b), negate:(c,p)=>r.negate(c,p), scale:(c,p,v)=>r.scale(c,p,v), equal:(c,a,b)=>r.equal(c,a,b), divide:(c,a,b)=>r.divide(c,a,b)};
}
export function positiveModuleHermite<E>(ctx: ExecutionContext, r: PositivePolynomialRing<E>, input: readonly (readonly PositivePolynomial<E>[])[], columns: number) { return arithmeticModuleHermite(ctx, positiveModuleMechanics(r), input, columns); }
export function verifyPositiveModule<E>(ctx: ExecutionContext, r: PositivePolynomialRing<E>, input: readonly (readonly PositivePolynomial<E>[])[], columns: number, proof: PositiveModule<E>) { verifyArithmeticModuleHermite(ctx, positiveModuleMechanics(r), input, columns, proof); }
