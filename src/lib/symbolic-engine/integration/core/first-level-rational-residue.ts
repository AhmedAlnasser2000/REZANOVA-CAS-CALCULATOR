import { demand, type ExecutionContext } from './execution';
import type { DifferentialElement as E } from './differential-field';
import { differentiate, verifyDerivative, type DerivativeEvidence } from './differential-derivative';
import { type FirstLevelRationalDomain, type EP, totalPolynomialDerivative, verifyTotalPolynomialDerivative } from './first-level-rational-domain';
import { descendConstantPolynomial, residueInputs } from './first-level-rational-residue-algebra';
import { subresultants, verifySubresultants } from './subresultant';
import { squareFree, verifySquareFree, type SquareFreeDecomposition } from './polynomial-square-free';
import { extendedGcd, verifyBezout, type Bezout } from './polynomial-division';
import type { Rational } from './rational';
import { selectFirstLevelResidues, verifyFirstLevelSelection, type BivariatePRS, type LrtGroup } from './first-level-rational-selection';

export interface FirstLevelResidue<D extends FirstLevelRationalDomain = FirstLevelRationalDomain> {
  readonly denominatorDerivative: DerivativeEvidence;
  readonly normal: Bezout<E>;
  readonly prs: BivariatePRS;
  readonly scalar: E;
  readonly monic: EP;
  readonly coefficients: readonly DerivativeEvidence[];
  readonly nonconstant: number | null;
  readonly decomposition: SquareFreeDecomposition<Rational> | null;
  readonly groups: readonly LrtGroup<D>[];
}
export function firstLevelResidues<D extends FirstLevelRationalDomain>(ctx: ExecutionContext, d: D, residual: E): FirstLevelResidue<D> {
  demand(residual.kind === 'fraction' && !d.field.isZero(ctx, residual), 'invalid-input', 'nonzero residual required');
  const denominatorDerivative = totalPolynomialDerivative(ctx, d.field, residual.value.denominator);
  const dn = verifyTotalPolynomialDerivative(ctx, d.field, residual.value.denominator, denominatorDerivative);
  const normal = extendedGcd(ctx, d.t, residual.value.denominator, dn), inputs = residueInputs(ctx, d, residual, dn);
  const prs = subresultants(ctx, d.elimination, inputs.denominator, inputs.residue), scalar = d.kz.leading(ctx, prs.resultant);
  demand(!d.base.isZero(ctx, scalar), 'verification-failed', 'zero residue resultant');
  const monic = d.kz.scale(ctx, prs.resultant, d.base.inverse(ctx, scalar)); ctx.allocate(monic.coefficients.length + 8);
  const coefficients = Object.freeze(monic.coefficients.map(c => differentiate(ctx, d.base, c)));
  const found = coefficients.findIndex(c => !d.base.isZero(ctx, c.derivative)), nonconstant = found < 0 ? null : found;
  const decomposition = nonconstant === null ? squareFree(ctx, d.z, descendConstantPolynomial(ctx, d, monic)) : null;
  const groups = decomposition ? selectFirstLevelResidues(ctx, d, residual, dn, prs, decomposition) : Object.freeze([]);
  const out = Object.freeze({ denominatorDerivative, normal, prs, scalar, monic, coefficients, nonconstant, decomposition, groups });
  verifyFirstLevelResidues(ctx, d, residual, out); return out;
}
export function verifyFirstLevelResidues<D extends FirstLevelRationalDomain>(ctx: ExecutionContext, d: D, residual: E, proof: FirstLevelResidue<D>): void {
  d.field.assert(ctx, residual); demand(residual.kind === 'fraction' && !d.field.isZero(ctx, residual), 'verification-failed', 'nonzero normal residual');
  const n = residual.value.denominator;
  demand(d.t.degree(ctx, residual.value.numerator) < d.t.degree(ctx, n), 'verification-failed', 'proper residual');
  const dn = verifyTotalPolynomialDerivative(ctx, d.field, n, proof.denominatorDerivative);
  verifyBezout(ctx, d.t, n, dn, proof.normal); demand(d.t.equal(ctx, proof.normal.gcd, d.t.one(ctx)), 'verification-failed', 'residual normality');
  const inputs = residueInputs(ctx, d, residual, dn); verifySubresultants(ctx, d.elimination, inputs.denominator, inputs.residue, proof.prs);
  demand(d.kz.degree(ctx, proof.prs.resultant) === d.t.degree(ctx, n)
    && !d.base.isZero(ctx, proof.scalar) && d.base.equal(ctx, d.kz.leading(ctx, proof.monic), d.base.fromInteger(ctx, 1n))
    && d.kz.equal(ctx, proof.prs.resultant, d.kz.scale(ctx, proof.monic, proof.scalar)), 'verification-failed', 'normalized residue resultant');
  demand(proof.coefficients.length === proof.monic.coefficients.length, 'verification-failed', 'residue derivative coverage');
  let first: number | null = null;
  for (let i = 0; i < proof.coefficients.length; i++) {
    ctx.tick(); verifyDerivative(ctx, d.base, proof.monic.coefficients[i], proof.coefficients[i]);
    if (first === null && !d.base.isZero(ctx, proof.coefficients[i].derivative)) first = i;
  }
  demand(first === proof.nonconstant, 'verification-failed', 'nonconstant residue witness');
  if (first !== null) demand(proof.decomposition === null && proof.groups.length === 0, 'verification-failed', 'nonconstant residue stop');
  else {
    demand(proof.decomposition !== null, 'verification-failed', 'constant residue decomposition');
    verifySquareFree(ctx, d.z, descendConstantPolynomial(ctx, d, proof.monic), proof.decomposition);
    verifyFirstLevelSelection(ctx, d, residual, dn, proof.prs, proof.decomposition, proof.groups);
  }
}
