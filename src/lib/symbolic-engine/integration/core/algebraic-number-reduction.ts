import { demand, type ExecutionContext } from './execution';
import { rationalField as Q } from './field';
import { rational, integerGcd, type Rational } from './rational';
import type { AlgebraicField, AlgebraicElement } from './algebraic-field';
import { PositivePrimeField, type PrimeValue } from './positive-field';
import { PositivePolynomialRing } from './positive-polynomial';
import { PositiveFiniteExtension, type FiniteExtensionValue } from './positive-extension';
import { factorPositivePolynomial, verifyPositiveFactorization, type PositiveFactorization } from './positive-factorization';
import { requireGoodReduction } from './algebraic-reduction-errors';
export type ReductionConstant = FiniteExtensionValue<PrimeValue>;
export interface AlgebraicNumberReduction { readonly source: AlgebraicField<Rational>; readonly scale: bigint; readonly integral: readonly bigint[];
  readonly prime: PositivePrimeField; readonly factors: PositiveFactorization<PrimeValue>; readonly index: number; readonly residue: PositiveFiniteExtension<PrimeValue> }
export function integralConstantPresentation(ctx: ExecutionContext, owner: AlgebraicField<Rational>) {
  demand(owner.parent === Q, 'domain-mismatch', 'primitive number-field presentation'); let scale = 1n;
  for (const c of owner.modulus.coefficients) scale = ctx.multiply(ctx.quotient(scale, integerGcd(ctx, scale, c.denominator)), c.denominator);
  const degree = owner.ring.degree(ctx, owner.modulus), integral: bigint[] = []; ctx.allocate(degree + 1);
  for (let i = 0; i <= degree; i++) { let power = 1n; for (let j = 0; j < degree - i; j++) power = ctx.multiply(power, scale);
    const c = owner.modulus.coefficients[i] ?? rational(ctx, 0n); const numerator = ctx.multiply(c.numerator, power); demand(ctx.remainder(numerator, c.denominator) === 0n, 'verification-failed', 'scaled integral constant relation'); integral.push(ctx.quotient(numerator, c.denominator)); }
  return {scale, integral: Object.freeze(integral)};
}
export function reduceRationalConstant(ctx: ExecutionContext, field: PositivePrimeField, q: Rational): PrimeValue {
  Q.assert(ctx, q); const denominator = field.fromInteger(ctx, q.denominator); requireGoodReduction(!field.isZero(ctx, denominator), 'rational coefficient denominator at prime');
  return field.exactDivide(ctx, field.fromInteger(ctx, q.numerator), denominator);
}
export function reduceAlgebraicConstant(ctx: ExecutionContext, proof: AlgebraicNumberReduction, value: AlgebraicElement<Rational>): ReductionConstant {
  const c = proof.source, field = proof.residue; c.assert(ctx, value); const inverseScale = proof.prime.inverse(ctx, proof.prime.fromInteger(ctx, proof.scale));
  const alpha = field.multiply(ctx, field.generator(ctx), field.embed(ctx, inverseScale)); let result = field.fromInteger(ctx, 0n);
  for (let i = value.representative.coefficients.length - 1; i >= 0; i--) result = field.add(ctx, field.multiply(ctx, result, alpha), field.embed(ctx, reduceRationalConstant(ctx, proof.prime, value.representative.coefficients[i])));
  return result;
}
export function constructAlgebraicNumberReductions(ctx: ExecutionContext, source: AlgebraicField<Rational>, characteristic: bigint): readonly AlgebraicNumberReduction[] {
  const {scale, integral} = integralConstantPresentation(ctx, source), prime = new PositivePrimeField(ctx, characteristic), ring = new PositivePolynomialRing(prime, 'beta');
  requireGoodReduction(ctx.remainder(scale, characteristic) !== 0n, 'constant scaling denominator');
  const input = ring.make(ctx, integral.map(c => prime.fromInteger(ctx, c))), factors = factorPositivePolynomial(ctx, prime, ring, input);
  demand(factors.kind === 'factorization', 'verification-failed', 'nonzero integral constants'); requireGoodReduction(factors.factors.every(f => f.multiplicity === 1n), 'constant-field discriminant reduction');
  return Object.freeze(factors.factors.map((factor, index) => {
    const residue = new PositiveFiniteExtension(ctx, prime, ring, factor.polynomial, factor.irreducibility);
    const proof = Object.freeze({source, scale, integral, prime, factors, index, residue}); verifyAlgebraicNumberReduction(ctx, source, proof); return proof;
  }));
}
export function verifyAlgebraicNumberReduction(ctx: ExecutionContext, source: AlgebraicField<Rational>, proof: AlgebraicNumberReduction): void {
  demand(proof.source === source && proof.residue.parent === proof.prime && proof.index >= 0 && Number.isSafeInteger(proof.index), 'domain-mismatch', 'number reduction owners');
  const expected = integralConstantPresentation(ctx, source); demand(expected.scale === proof.scale && expected.integral.length === proof.integral.length && expected.integral.every((v, i) => v === proof.integral[i]) && ctx.remainder(proof.scale, proof.prime.characteristic) !== 0n, 'verification-failed', 'complete integral constant presentation');
  const r = proof.residue.ring, input = r.make(ctx, expected.integral.map(c => proof.prime.fromInteger(ctx, c)));
  verifyPositiveFactorization(ctx, proof.prime, r, input, proof.factors);
  demand(proof.factors.kind === 'factorization' && proof.index < proof.factors.factors.length && proof.factors.factors.every(f => f.multiplicity === 1n)
    && r.equal(ctx, proof.residue.modulus, proof.factors.factors[proof.index].polynomial), 'verification-failed', 'unramified complete number-field residue factor');
  const alpha = reduceAlgebraicConstant(ctx, proof, source.generator(ctx)); let value = proof.residue.fromInteger(ctx, 0n);
  for (let i = source.modulus.coefficients.length - 1; i >= 0; i--) value = proof.residue.add(ctx, proof.residue.multiply(ctx, value, alpha), proof.residue.embed(ctx, reduceRationalConstant(ctx, proof.prime, source.modulus.coefficients[i])));
  demand(proof.residue.isZero(ctx, value), 'verification-failed', 'exact number-field reduction relation');
}
