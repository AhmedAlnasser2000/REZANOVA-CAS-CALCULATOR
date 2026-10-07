import { demand, type ExecutionContext } from './execution';
import { rationalField as Q } from './field';
import type { Rational } from './rational';
import { MultivariateRing, type MultivariatePolynomial as P } from './multivariate-polynomial';
import { multivariateGcd, verifyMultivariateGcd, multivariateContent, verifyMultivariateContent,
  type MultivariateGcd, type MultivariateContent } from './multivariate-gcd';
import { integralSparse, verifyIntegralSparse } from './factorization-conversion';
import { factorIndex } from './factorization-square-free';

export interface FactorSparseSquareFree {
  readonly scalar: Rational;
  readonly components: readonly {readonly polynomial: P<Rational>; readonly multiplicity: bigint;
    readonly derivative: MultivariateGcd<Rational>; readonly previous: readonly MultivariateGcd<Rational>[]}[];
}
export interface FactorSparsePrimitive {
  readonly content: MultivariateContent<Rational>;
  readonly scale: Rational;
  readonly working: P<Rational>;
}
export function sparseFactorDerivative(ctx: ExecutionContext, ring: MultivariateRing<Rational>, input: P<Rational>) {
  ring.assert(ctx, input); ctx.allocate(input.terms.length * (ring.arity + 2));
  return ring.make(ctx, input.terms.filter(t => t.powers[0] > 0).map(t => ({powers: [t.powers[0] - 1, ...t.powers.slice(1)],
    coefficient: Q.multiply(ctx, t.coefficient, Q.fromInteger(ctx, BigInt(t.powers[0])))})));
}
function power(ctx: ExecutionContext, ring: MultivariateRing<Rational>, p: P<Rational>, n: bigint) {
  let exponent = factorIndex(ctx, n), result = ring.one(ctx), base = p;
  while (exponent) { if (exponent % 2) result = ring.multiply(ctx, result, base); exponent = Math.floor(exponent / 2); if (exponent) base = ring.multiply(ctx, base, base); }
  return result;
}
export function sparseFactorSquareFree(ctx: ExecutionContext, ring: MultivariateRing<Rational>, input: P<Rational>): FactorSparseSquareFree {
  ring.assert(ctx, input); demand(input.terms.length > 0, 'invalid-input', 'zero sparse square-free input');
  const monic = ring.monic(ctx, input), one = ring.one(ctx), raw: {polynomial: P<Rational>; multiplicity: bigint}[] = [];
  let c = multivariateGcd(ctx, ring, monic, sparseFactorDerivative(ctx, ring, monic)).gcd, w = ring.exactDivide(ctx, monic, c), multiplicity = 1n;
  while (ring.outerDegree(ctx, w) > 0) {
    const y = multivariateGcd(ctx, ring, w, c).gcd, polynomial = ring.exactDivide(ctx, w, y);
    if (ring.outerDegree(ctx, polynomial) > 0) { ctx.allocate(2); raw.push({polynomial: ring.monic(ctx, polynomial), multiplicity}); }
    w = y; c = ring.exactDivide(ctx, c, y); multiplicity = ctx.add(multiplicity, 1n);
  }
  demand(ring.equal(ctx, w, one), 'verification-failed', 'square-free coefficient content');
  ctx.allocate(raw.length * 4);
  const components = Object.freeze(raw.map((v, i) => Object.freeze({...v,
    derivative: multivariateGcd(ctx, ring, v.polynomial, sparseFactorDerivative(ctx, ring, v.polynomial)),
    previous: Object.freeze(raw.slice(0, i).map(p => multivariateGcd(ctx, ring, v.polynomial, p.polynomial)))})));
  const result = Object.freeze({scalar: input.terms[0].coefficient, components}); verifySparseFactorSquareFree(ctx, ring, input, result); return result;
}
export function verifySparseFactorSquareFree(ctx: ExecutionContext, ring: MultivariateRing<Rational>, input: P<Rational>, proof: FactorSparseSquareFree): void {
  ring.assert(ctx, input); Q.assert(ctx, proof.scalar); demand(!Q.isZero(ctx, proof.scalar) && Array.isArray(proof.components), 'verification-failed', 'sparse square-free scalar');
  let product = ring.constant(ctx, proof.scalar), prior = 0n;
  for (let i = 0; i < proof.components.length; i++) {
    const c = proof.components[i]; ctx.integer(c.multiplicity);
    demand(c.multiplicity > prior && ring.outerDegree(ctx, c.polynomial) > 0 && ring.equal(ctx, c.polynomial, ring.monic(ctx, c.polynomial)), 'verification-failed', 'sparse square-free normalization');
    verifyMultivariateGcd(ctx, ring, c.polynomial, sparseFactorDerivative(ctx, ring, c.polynomial), c.derivative);
    demand(ring.outerDegree(ctx, c.derivative.gcd) === 0, 'verification-failed', 'sparse square-free gcd');
    demand(Array.isArray(c.previous) && c.previous.length === i, 'verification-failed', 'sparse square-free pairwise coverage');
    for (let j = 0; j < i; j++) { verifyMultivariateGcd(ctx, ring, c.polynomial, proof.components[j].polynomial, c.previous[j]);
      demand(ring.outerDegree(ctx, c.previous[j].gcd) === 0, 'verification-failed', 'sparse square-free pairwise gcd'); }
    product = ring.multiply(ctx, product, power(ctx, ring, c.polynomial, c.multiplicity)); prior = c.multiplicity;
  }
  demand(ring.equal(ctx, product, input), 'verification-failed', 'sparse square-free reconstruction');
}
export function sparseFactorPrimitive(ctx: ExecutionContext, ring: MultivariateRing<Rational>, input: P<Rational>): FactorSparsePrimitive {
  const content = multivariateContent(ctx, ring, input), integer = integralSparse(ctx, ring, content.primitive);
  return Object.freeze({content, scale: integer.scale, working: integer.polynomial});
}
export function verifySparseFactorPrimitive(ctx: ExecutionContext, ring: MultivariateRing<Rational>, input: P<Rational>, proof: FactorSparsePrimitive) {
  verifyMultivariateContent(ctx, ring, input, proof.content); Q.assert(ctx, proof.scale); demand(!Q.isZero(ctx, proof.scale), 'verification-failed', 'sparse primitive scale');
  demand(ring.equal(ctx, proof.working, ring.scale(ctx, proof.content.primitive, proof.scale)), 'verification-failed', 'sparse primitive scaling'); verifyIntegralSparse(ctx, proof.working);
}
