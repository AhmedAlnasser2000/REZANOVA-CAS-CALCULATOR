import type { ExecutionContext } from './execution';
import type { Polynomial, PolynomialRing } from './polynomial';
import { polynomialDivide } from './polynomial-division';
import {numberFieldRowUnit} from './number-field-row-content';
import { arithmeticModuleHermite, verifyArithmeticModuleHermite, arithmeticModuleCoordinates,
  type ArithmeticPolynomialMatrix, type ArithmeticModuleEvidence, type ArithmeticModuleOperation, type EuclideanPolynomialArithmetic } from './arithmetic-polynomial-module';
export { freezePolynomialMatrix } from './arithmetic-polynomial-module';
export type PolynomialMatrix<E> = ArithmeticPolynomialMatrix<Polynomial<E>>;
export type PolynomialModuleEvidence<E> = ArithmeticModuleEvidence<E, Polynomial<E>>;
export type PolynomialModuleOperation<E> = ArithmeticModuleOperation<E, Polynomial<E>>;
function mechanics<E>(r: PolynomialRing<E>): EuclideanPolynomialArithmetic<E, Polynomial<E>> {
  return {domain: r.domain, assert: (c,p) => r.assert(c,p), zero: c=>r.zero(c), one:c=>r.one(c),
    isZero:(c,p)=>r.isZero(c,p), degree:(c,p)=>r.degree(c,p), leading:(c,p)=>r.leading(c,p),
    add:(c,a,b)=>r.add(c,a,b), subtract:(c,a,b)=>r.subtract(c,a,b), multiply:(c,a,b)=>r.multiply(c,a,b),
    negate:(c,p)=>r.negate(c,p), scale:(c,p,v)=>r.scale(c,p,v), equal:(c,a,b)=>r.equal(c,a,b), divide:(c,a,b)=>polynomialDivide(c,r,a,b),rowUnit:(c,row)=>numberFieldRowUnit(c,r,row)};
}
export function polynomialModuleHermite<E>(ctx: ExecutionContext, r: PolynomialRing<E>, input: PolynomialMatrix<E>, columns: number): PolynomialModuleEvidence<E> {
  return arithmeticModuleHermite(ctx, mechanics(r), input, columns);
}
export function verifyPolynomialModuleHermite<E>(ctx: ExecutionContext, r: PolynomialRing<E>, input: PolynomialMatrix<E>, columns: number, proof: PolynomialModuleEvidence<E>): void {
  verifyArithmeticModuleHermite(ctx, mechanics(r), input, columns, proof);
}
export function polynomialModuleCoordinates<E>(ctx: ExecutionContext, r: PolynomialRing<E>, proof: PolynomialModuleEvidence<E>, value: readonly Polynomial<E>[]): readonly Polynomial<E>[] | null {
  return arithmeticModuleCoordinates(ctx, mechanics(r), proof, value);
}
