import { demand, type ExecutionContext } from './execution';
import { rationalField as Q } from './field';
import { rational, integerGcd, type Rational } from './rational';
import type { Polynomial, PolynomialRing } from './polynomial';
import type { FactorCoefficientDomain } from './factorization-domain';
import { MultivariateRing, type MultivariatePolynomial as P } from './multivariate-polynomial';
import { multivariateContent, verifyMultivariateContent, type MultivariateContent } from './multivariate-gcd';

export interface FactorFlatFraction { readonly numerator: P<Rational>; readonly denominator: P<Rational> }
export interface FactorConversion {
  readonly coefficients: readonly FactorFlatFraction[];
  readonly denominator: P<Rational>;
  readonly quotients: readonly P<Rational>[];
  readonly cleared: P<Rational>;
  readonly content: MultivariateContent<Rational>;
  readonly integerScale: Rational;
  readonly working: P<Rational>;
}
function flatPolynomial<E>(ctx: ExecutionContext, domain: FactorCoefficientDomain<E>, ring: MultivariateRing<Rational>, values: readonly E[]): FactorFlatFraction {
  const lower = ring.lower!; ctx.allocate(values.length);
  const cs = values.map(v => flattenFactorCoefficient(ctx, domain, lower, v));
  let denominator = lower.one(ctx); for (const c of cs) denominator = lower.multiply(ctx, denominator, c.denominator);
  let numerator = ring.zero(ctx);
  for (let i = 0; i < cs.length; i++) numerator = ring.add(ctx, numerator,
    ring.lift(ctx, lower.multiply(ctx, cs[i].numerator, lower.exactDivide(ctx, denominator, cs[i].denominator)), i));
  return Object.freeze({numerator, denominator: ring.lift(ctx, denominator)});
}
export function flattenFactorPolynomial<E>(ctx: ExecutionContext, domain: FactorCoefficientDomain<E>, ring: MultivariateRing<Rational>, input: Polynomial<E>): FactorFlatFraction {
  input.ring.assert(ctx, input); return flatPolynomial(ctx, domain, ring, input.coefficients);
}
export function flattenFactorCoefficient<E>(ctx: ExecutionContext, domain: FactorCoefficientDomain<E>, ring: MultivariateRing<Rational>, value: E): FactorFlatFraction {
  domain.field.assert(ctx, value); demand(ring.arity === domain.height, 'domain-mismatch', 'factor flatten coordinates');
  if (!domain.fraction) return Object.freeze({numerator: ring.constant(ctx, domain.rational(ctx, value)), denominator: ring.one(ctx)});
  const f = domain.fraction.read(ctx, value), n = flatPolynomial(ctx, domain.child!, ring, f.numerator.coefficients), d = flatPolynomial(ctx, domain.child!, ring, f.denominator.coefficients);
  return Object.freeze({numerator: ring.multiply(ctx, n.numerator, d.denominator), denominator: ring.multiply(ctx, n.denominator, d.numerator)});
}
export function unflattenFactorCoefficient<E>(ctx: ExecutionContext, domain: FactorCoefficientDomain<E>, ring: MultivariateRing<Rational>, value: P<Rational>): E {
  ring.assert(ctx, value); demand(ring.arity === domain.height, 'domain-mismatch', 'factor inverse coordinates');
  if (!domain.fraction) return domain.fromRational(ctx, value.terms.length ? value.terms[0].coefficient : rational(ctx, 0n));
  const cs = ring.coefficients(ctx, value); ctx.allocate(cs.length);
  const numerator = domain.fraction.ring.make(ctx, cs.map(c => unflattenFactorCoefficient(ctx, domain.child!, ring.lower!, c)));
  return domain.fraction.make(ctx, numerator, domain.fraction.ring.one(ctx));
}
export function nativeFactorPolynomial<E>(ctx: ExecutionContext, domain: FactorCoefficientDomain<E>, ring: PolynomialRing<E>, working: P<Rational>): Polynomial<E> {
  const cs = working.ring.coefficients(ctx, working); ctx.allocate(cs.length);
  return ring.make(ctx, cs.map(c => unflattenFactorCoefficient(ctx, domain, working.ring.lower!, c)));
}
export function integralSparse(ctx: ExecutionContext, ring: MultivariateRing<Rational>, p: P<Rational>): {scale: Rational; polynomial: P<Rational>} {
  ring.assert(ctx, p); demand(p.terms.length > 0, 'verification-failed', 'zero integer conversion');
  let denominator = 1n, content = 0n;
  for (const t of p.terms) denominator = ctx.multiply(ctx.quotient(denominator, integerGcd(ctx, denominator, t.coefficient.denominator)), t.coefficient.denominator);
  for (const t of p.terms) content = integerGcd(ctx, content, ctx.multiply(t.coefficient.numerator, ctx.quotient(denominator, t.coefficient.denominator)));
  if (p.terms[0].coefficient.numerator < 0n) content = -content;
  const scale = rational(ctx, denominator, content); return {scale, polynomial: ring.scale(ctx, p, scale)};
}
export function verifyIntegralSparse(ctx: ExecutionContext, p: P<Rational>): void {
  p.ring.assert(ctx, p); demand(p.terms.length > 0 && p.terms[0].coefficient.numerator > 0n, 'verification-failed', 'integer working orientation');
  let content = 0n;
  for (const t of p.terms) { demand(t.coefficient.denominator === 1n, 'verification-failed', 'noninteger working coefficient'); content = integerGcd(ctx, content, t.coefficient.numerator); }
  demand(content === 1n, 'verification-failed', 'integer working content');
}
export function convertFactorPolynomial<E>(ctx: ExecutionContext, domain: FactorCoefficientDomain<E>, native: PolynomialRing<E>, input: Polynomial<E>, ring: MultivariateRing<Rational>): FactorConversion {
  const lower = ring.lower!; ctx.allocate(input.coefficients.length * 2);
  const coefficients = Object.freeze(input.coefficients.map(c => flattenFactorCoefficient(ctx, domain, lower, c)));
  let denominator = lower.one(ctx); for (const c of coefficients) denominator = lower.multiply(ctx, denominator, c.denominator);
  const quotients = Object.freeze(coefficients.map(c => lower.exactDivide(ctx, denominator, c.denominator)));
  let cleared = ring.zero(ctx);
  for (let i = 0; i < coefficients.length; i++) cleared = ring.add(ctx, cleared, ring.lift(ctx, lower.multiply(ctx, coefficients[i].numerator, quotients[i]), i));
  const content = multivariateContent(ctx, ring, cleared), integer = integralSparse(ctx, ring, content.primitive);
  const result = Object.freeze({coefficients, denominator, quotients, cleared, content, integerScale: integer.scale, working: integer.polynomial});
  verifyFactorConversion(ctx, domain, native, input, ring, result); return result;
}
export function verifyFactorConversion<E>(ctx: ExecutionContext, domain: FactorCoefficientDomain<E>, native: PolynomialRing<E>, input: Polynomial<E>, ring: MultivariateRing<Rational>, proof: FactorConversion): void {
  native.assert(ctx, input); demand(ring.arity === domain.height + 1, 'domain-mismatch', 'factor conversion coordinates');
  const lower = ring.lower!;
  demand(Array.isArray(proof.coefficients) && proof.coefficients.length === input.coefficients.length
    && Array.isArray(proof.quotients) && proof.quotients.length === proof.coefficients.length, 'verification-failed', 'factor conversion coverage');
  demand(!lower.isZero(ctx, proof.denominator), 'verification-failed', 'factor clearing denominator');
  let cleared = ring.zero(ctx);
  for (let i = 0; i < proof.coefficients.length; i++) {
    const c = proof.coefficients[i]; demand(!lower.isZero(ctx, c.denominator), 'verification-failed', 'factor coefficient denominator');
    const expected = flattenFactorCoefficient(ctx, domain, lower, input.coefficients[i]);
    demand(lower.equal(ctx, lower.multiply(ctx, c.numerator, expected.denominator), lower.multiply(ctx, expected.numerator, c.denominator)), 'verification-failed', 'factor coefficient conversion');
    demand(lower.equal(ctx, lower.multiply(ctx, c.denominator, proof.quotients[i]), proof.denominator), 'verification-failed', 'factor common denominator quotient');
    cleared = ring.add(ctx, cleared, ring.lift(ctx, lower.multiply(ctx, c.numerator, proof.quotients[i]), i));
  }
  demand(ring.equal(ctx, cleared, proof.cleared), 'verification-failed', 'factor cleared reconstruction');
  verifyMultivariateContent(ctx, ring, cleared, proof.content); Q.assert(ctx, proof.integerScale);
  demand(!Q.isZero(ctx, proof.integerScale) && ring.equal(ctx, proof.working, ring.scale(ctx, proof.content.primitive, proof.integerScale)), 'verification-failed', 'factor integer scalar identity');
  verifyIntegralSparse(ctx, proof.working);
  // The coefficient identities and checked content/scalar reconstruction give
  // the exact inverse conversion, without rebuilding deep native arithmetic.
}
