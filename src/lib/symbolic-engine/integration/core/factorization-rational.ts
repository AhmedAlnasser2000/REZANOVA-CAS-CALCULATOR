import { demand, type ExecutionContext } from './execution';
import { rationalField as Q } from './field';
import { rational, integerGcd, type Rational } from './rational';
import type { Polynomial, PolynomialRing } from './polynomial';
import { checkedFactorSquareFree, verifyFactorSquareFree, factorIndex, type FactorSquareFree } from './factorization-square-free';
import { primitiveInteger, integerPolynomial, factorIntegerPolynomial, verifyIntegerFactorTree,
  integerFactorLeaves, type FactorIntegerTree } from './factorization-integer';

export type RationalFactorization = Readonly<
  | { kind: 'zero'; input: Polynomial<Rational> }
  | { kind: 'factorization'; input: Polynomial<Rational>; unit: Rational;
      factors: readonly { readonly polynomial: Polynomial<Rational>; readonly multiplicity: bigint }[];
      squareFree: FactorSquareFree<Rational>; trees: readonly FactorIntegerTree[] }
>;
function integral(ctx: ExecutionContext, p: Polynomial<Rational>): readonly bigint[] {
  let denominator = 1n;
  for (const c of p.coefficients) denominator = ctx.multiply(ctx.quotient(denominator, integerGcd(ctx, denominator, c.denominator)), c.denominator);
  ctx.allocate(p.coefficients.length);
  return primitiveInteger(ctx, p.coefficients.map(c => ctx.multiply(c.numerator, ctx.quotient(denominator, c.denominator))));
}
function monic(ctx: ExecutionContext, ring: PolynomialRing<Rational>, cs: readonly bigint[]) {
  return ring.scale(ctx, integerPolynomial(ctx, ring, cs), rational(ctx, 1n, cs[cs.length - 1]));
}
export function factorRationalPolynomial(ctx: ExecutionContext, ring: PolynomialRing<Rational>, input: Polynomial<Rational>): RationalFactorization {
  demand(ring.domain === Q, 'domain-mismatch', 'rational factorization coefficient owner'); ring.assert(ctx, input);
  if (ring.isZero(ctx, input)) return Object.freeze({kind: 'zero', input});
  const squareFree = checkedFactorSquareFree(ctx, ring, input); ctx.allocate(squareFree.components.length);
  const trees = Object.freeze(squareFree.components.map(c => factorIntegerPolynomial(ctx, integral(ctx, c.polynomial))));
  const factors: {polynomial: Polynomial<Rational>; multiplicity: bigint}[] = [];
  for (let i = 0; i < trees.length; i++) for (const leaf of integerFactorLeaves(ctx, trees[i])) {
    ctx.allocate(3); factors.push(Object.freeze({polynomial: monic(ctx, ring, leaf), multiplicity: squareFree.components[i].multiplicity}));
  }
  const result = Object.freeze({kind: 'factorization' as const, input, unit: squareFree.scalar, squareFree, trees, factors: Object.freeze(factors)});
  verifyRationalFactorization(ctx, ring, input, result); return result;
}
export function verifyRationalFactorization(ctx: ExecutionContext, ring: PolynomialRing<Rational>, input: Polynomial<Rational>, proof: RationalFactorization): void {
  demand(ring.domain === Q, 'domain-mismatch', 'rational factorization coefficient owner'); ring.assert(ctx, input);
  demand(ring.equal(ctx, input, proof.input), 'verification-failed', 'factorization target');
  if (proof.kind === 'zero') { demand(ring.isZero(ctx, input), 'verification-failed', 'factorization zero'); return; }
  demand(proof.kind === 'factorization' && !ring.isZero(ctx, input), 'verification-failed', 'factorization outcome');
  verifyFactorSquareFree(ctx, ring, input, proof.squareFree);
  demand(Q.equal(ctx, proof.unit, proof.squareFree.scalar), 'verification-failed', 'factorization unit');
  demand(Array.isArray(proof.trees) && proof.trees.length === proof.squareFree.components.length && Array.isArray(proof.factors),
    'verification-failed', 'factorization component coverage');
  let index = 0, reconstruction = ring.constant(ctx, proof.unit);
  for (let i = 0; i < proof.trees.length; i++) {
    const c = proof.squareFree.components[i], expected = integral(ctx, c.polynomial);
    verifyIntegerFactorTree(ctx, expected, proof.trees[i]);
    demand(ring.equal(ctx, c.polynomial, monic(ctx, ring, expected)), 'verification-failed', 'integer conversion identity');
    for (const leaf of integerFactorLeaves(ctx, proof.trees[i])) {
      demand(index < proof.factors.length, 'verification-failed', 'factor output coverage');
      const f = proof.factors[index++]; ctx.integer(f.multiplicity);
      demand(f.multiplicity === c.multiplicity && ring.equal(ctx, f.polynomial, monic(ctx, ring, leaf)), 'verification-failed', 'factor output mapping');
      for (let j = 0; j < index - 1; j++) demand(!ring.equal(ctx, f.polynomial, proof.factors[j].polynomial), 'verification-failed', 'duplicate factors');
      reconstruction = ring.multiply(ctx, reconstruction, ring.power(ctx, f.polynomial, factorIndex(ctx, f.multiplicity)));
    }
  }
  demand(index === proof.factors.length && ring.equal(ctx, input, reconstruction), 'verification-failed', 'complete factorization reconstruction');
}
