import { demand, type ExecutionContext } from './execution';
import { rationalField as Q } from './field';
import { PolynomialRing, assertPolynomialRingOwner, type Polynomial } from './polynomial';
import { checkDifferentialBounds, type DifferentialBounds } from './differential-field';
import type { Rational } from './rational';
import { factorCoefficientDomain } from './factorization-domain';
import { factorRationalPolynomial, verifyRationalFactorization, type RationalFactorization } from './factorization-rational';
import { factorIndex } from './factorization-square-free';
import { MultivariateRing, assertMultivariateRing } from './multivariate-polynomial';
import { convertFactorPolynomial, verifyFactorConversion, nativeFactorPolynomial, flattenFactorPolynomial, flattenFactorCoefficient, type FactorConversion } from './factorization-conversion';
import { factorMultivariatePolynomial, verifyMultivariateFactorTree, multivariateFactorLeaves, type FactorMultivariateTree } from './factorization-multivariate';
import { sparseFactorSquareFree, verifySparseFactorSquareFree, sparseFactorPrimitive, verifySparseFactorPrimitive,
  type FactorSparseSquareFree, type FactorSparsePrimitive } from './factorization-sparse-square-free';

export interface RecursivePolynomialFactor<E> { readonly polynomial: Polynomial<E>; readonly multiplicity: bigint }
export type RecursivePolynomialFactorization<E> = Readonly<
  | {kind: 'zero'; input: Polynomial<E>}
  | ({kind: 'factorization'; input: Polynomial<E>; unit: E; factors: readonly RecursivePolynomialFactor<E>[]} & (
    | {route: 'rational'; proof: RationalFactorization}
    | {route: 'recursive'; auxiliary: MultivariateRing<Rational>; conversion: FactorConversion; squareFree: FactorSparseSquareFree;
        components: readonly {readonly primitive: FactorSparsePrimitive; readonly tree: FactorMultivariateTree}[]}
  ))>;
function rationalInput<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, input: Polynomial<E>, bounds: DifferentialBounds) {
  const domain = factorCoefficientDomain(ctx, ring.domain, bounds.towerHeight), q = new PolynomialRing(Q, ring.variable);
  ctx.allocate(input.coefficients.length); return {domain, q, value: q.make(ctx, input.coefficients.map(c => domain.rational(ctx, c)))};
}
export function factorRecursivePolynomial<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, input: Polynomial<E>, bounds: DifferentialBounds): RecursivePolynomialFactorization<E> {
  return ctx.operation(() => {
    checkDifferentialBounds(ctx, bounds); assertPolynomialRingOwner(ctx, ring); ring.assert(ctx, input);
    const domain = factorCoefficientDomain(ctx, ring.domain, bounds.towerHeight);
    if (ring.isZero(ctx, input)) return Object.freeze({kind: 'zero', input});
    let result: RecursivePolynomialFactorization<E>;
    if (domain.height === 0) {
      const {q, value} = rationalInput(ctx, ring, input, bounds), proof = factorRationalPolynomial(ctx, q, value);
      demand(proof.kind === 'factorization', 'verification-failed', 'rational factorization zero mismatch'); ctx.allocate(proof.factors.length * 3);
      result = Object.freeze({kind: 'factorization', route: 'rational' as const, input, unit: domain.fromRational(ctx, proof.unit), proof,
        factors: Object.freeze(proof.factors.map(f => Object.freeze({multiplicity: f.multiplicity,
          polynomial: ring.make(ctx, f.polynomial.coefficients.map(c => domain.fromRational(ctx, c)))})))});
    } else {
      const auxiliary = MultivariateRing.create(ctx, Q, domain.height + 1), conversion = convertFactorPolynomial(ctx, domain, ring, input, auxiliary);
      const squareFree = sparseFactorSquareFree(ctx, auxiliary, conversion.working);
      ctx.allocate(squareFree.components.length * 3); const factors: RecursivePolynomialFactor<E>[] = [];
      const components = Object.freeze(squareFree.components.map(c => {
        const primitive = sparseFactorPrimitive(ctx, auxiliary, c.polynomial), tree = factorMultivariatePolynomial(ctx, auxiliary, primitive.working);
        for (const leaf of multivariateFactorLeaves(ctx, tree)) {
          const p = nativeFactorPolynomial(ctx, domain, ring, leaf); ctx.allocate(3);
          factors.push(Object.freeze({polynomial: ring.scale(ctx, p, ring.domain.inverse(ctx, ring.leading(ctx, p))), multiplicity: c.multiplicity}));
        }
        return Object.freeze({primitive, tree});
      }));
      result = Object.freeze({kind: 'factorization', route: 'recursive' as const, input, unit: ring.leading(ctx, input), auxiliary, conversion, squareFree, components, factors: Object.freeze(factors)});
    }
    verifyRecursiveFactorizationInternal(ctx, ring, input, result, bounds); return result;
  });
}
export function verifyRecursivePolynomialFactorization<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, input: Polynomial<E>, decision: RecursivePolynomialFactorization<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyRecursiveFactorizationInternal(ctx, ring, input, decision, bounds));
}
export function verifyRecursiveFactorizationInternal<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, input: Polynomial<E>, decision: RecursivePolynomialFactorization<E>, bounds: DifferentialBounds): void {
  checkDifferentialBounds(ctx, bounds); assertPolynomialRingOwner(ctx, ring); ring.assert(ctx, input);
  const domain = factorCoefficientDomain(ctx, ring.domain, bounds.towerHeight);
  demand(ring.equal(ctx, input, decision.input), 'verification-failed', 'recursive factorization target');
  if (decision.kind === 'zero') { demand(ring.isZero(ctx, input), 'verification-failed', 'recursive factorization zero'); return; }
  demand(decision.kind === 'factorization' && !ring.isZero(ctx, input), 'verification-failed', 'recursive factorization outcome');
  demand(Array.isArray(decision.factors), 'verification-failed', 'recursive factor coverage'); let index = 0;
  const checkFactor = (p: Polynomial<E>, multiplicity: bigint) => {
    demand(index < decision.factors.length, 'verification-failed', 'recursive output coverage'); const f = decision.factors[index++]; ctx.integer(f.multiplicity);
    demand(f.multiplicity === multiplicity && ring.equal(ctx, p, f.polynomial), 'verification-failed', 'recursive output correspondence');
  };
  if (domain.height === 0) {
    demand(decision.route === 'rational', 'verification-failed', 'rational factorization route');
    const q = decision.proof.input.ring; demand(q.domain === Q && q.variable === ring.variable, 'domain-mismatch', 'rational proof owner');
    const value = q.make(ctx, input.coefficients.map(c => domain.rational(ctx, c))); verifyRationalFactorization(ctx, q, value, decision.proof);
    demand(decision.proof.kind === 'factorization' && ring.domain.equal(ctx, decision.unit, domain.fromRational(ctx, decision.proof.unit)), 'verification-failed', 'rational factor unit mapping');
    for (const f of decision.proof.factors) checkFactor(ring.make(ctx, f.polynomial.coefficients.map(c => domain.fromRational(ctx, c))), f.multiplicity);
  } else {
    demand(decision.route === 'recursive', 'verification-failed', 'recursive factorization route'); assertMultivariateRing(ctx, decision.auxiliary);
    const auxiliary = decision.auxiliary; demand(auxiliary.field === Q && auxiliary.arity === domain.height + 1, 'domain-mismatch', 'recursive auxiliary owner');
    verifyFactorConversion(ctx, domain, ring, input, auxiliary, decision.conversion);
    verifySparseFactorSquareFree(ctx, auxiliary, decision.conversion.working, decision.squareFree);
    demand(ring.domain.equal(ctx, decision.unit, ring.leading(ctx, input)) && Array.isArray(decision.components)
      && decision.components.length === decision.squareFree.components.length, 'verification-failed', 'recursive component coverage');
    const lower = auxiliary.lower!;
    let unitNumerator = lower.scale(ctx, decision.conversion.content.content, decision.squareFree.scalar);
    let unitDenominator = lower.scale(ctx, decision.conversion.denominator, decision.conversion.integerScale);
    const power = (p: import('./multivariate-polynomial').MultivariatePolynomial<Rational>, n: bigint) => {
      let exponent = factorIndex(ctx, n), out = lower.one(ctx), base = p;
      while (exponent) { if (exponent % 2) out = lower.multiply(ctx, out, base); exponent = Math.floor(exponent / 2); if (exponent) base = lower.multiply(ctx, base, base); } return out;
    };
    for (let i = 0; i < decision.components.length; i++) {
      const c = decision.components[i], source = decision.squareFree.components[i];
      verifySparseFactorPrimitive(ctx, auxiliary, source.polynomial, c.primitive); verifyMultivariateFactorTree(ctx, auxiliary, c.primitive.working, c.tree);
      let leadingProduct = c.primitive.content.content;
      for (const leaf of multivariateFactorLeaves(ctx, c.tree)) {
        demand(index < decision.factors.length, 'verification-failed', 'recursive output coverage'); const f = decision.factors[index++]; ctx.integer(f.multiplicity);
        const actual = flattenFactorPolynomial(ctx, domain, auxiliary, f.polynomial), leading = auxiliary.outerLeading(ctx, leaf);
        demand(f.multiplicity === source.multiplicity && auxiliary.equal(ctx, auxiliary.multiply(ctx, actual.numerator, auxiliary.lift(ctx, leading)),
          auxiliary.multiply(ctx, leaf, actual.denominator)), 'verification-failed', 'recursive factor inverse conversion');
        leadingProduct = lower.multiply(ctx, leadingProduct, leading);
      }
      unitNumerator = lower.multiply(ctx, unitNumerator, power(leadingProduct, source.multiplicity));
      unitDenominator = lower.multiply(ctx, unitDenominator, power(lower.constant(ctx, c.primitive.scale), source.multiplicity));
    }
    const expectedUnit = flattenFactorCoefficient(ctx, domain, lower, decision.unit);
    demand(lower.equal(ctx, lower.multiply(ctx, expectedUnit.numerator, unitDenominator), lower.multiply(ctx, expectedUnit.denominator, unitNumerator)), 'verification-failed', 'recursive complete unit reconstruction');
  }
  demand(index === decision.factors.length, 'verification-failed', 'extra recursive factors'); let product = decision.route === 'rational' ? ring.constant(ctx, decision.unit) : null;
  for (let i = 0; i < decision.factors.length; i++) {
    const f = decision.factors[i]; demand(f.multiplicity > 0n && ring.degree(ctx, f.polynomial) > 0
      && ring.domain.equal(ctx, ring.leading(ctx, f.polynomial), ring.domain.fromInteger(ctx, 1n)), 'verification-failed', 'recursive monic factor');
    for (let j = 0; j < i; j++) demand(!ring.equal(ctx, f.polynomial, decision.factors[j].polynomial), 'verification-failed', 'duplicate recursive factor');
    if (product) product = ring.multiply(ctx, product, ring.power(ctx, f.polynomial, factorIndex(ctx, f.multiplicity)));
  }
  if (product) demand(ring.equal(ctx, input, product), 'verification-failed', 'recursive complete reconstruction');
}
