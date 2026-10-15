/** Certified structure dispatch. A null applicability result is the only
 * reason to try another method; errors and mathematical negatives propagate. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {verifyAlgebraicCurveWithin, type AlgebraicCurveView} from './algebraic-curve';
import {verifyAlgebraicDivisorWithin, type AlgebraicDivisor} from './algebraic-divisor';
import type {AlgebraicFunctionFactor} from './algebraic-factored-function';
import {tryDecideEllipticDivisorTorsionWithin, verifyEllipticDivisorTorsionWithin, type EllipticDivisorTorsion} from './elliptic-divisor-torsion';
import {tryDecideHyperellipticInfinityTorsionWithin, verifyHyperellipticInfinityTorsionWithin, type HyperellipticInfinityTorsion} from './hyperelliptic-infinity-torsion';
import {tryDecideRamifiedDivisorTorsionWithin, verifyRamifiedDivisorTorsionWithin, type RamifiedDivisorTorsion} from './ramified-divisor-torsion';
import {tryDecideBalancedDivisorTorsionWithin, verifyBalancedDivisorTorsionWithin, type BalancedDivisorTorsion} from './balanced-divisor-torsion';
import {decideAlgebraicRrPrincipalityWithin, verifyAlgebraicRrPrincipalityWithin, type AlgebraicRrPrincipality} from './algebraic-rr-principality';
import {decideAlgebraicDivisorTorsionWithin, verifyAlgebraicDivisorTorsionWithin, type AlgebraicDivisorTorsion} from './algebraic-divisor-torsion';
import {tryDecideGeneralGenusOneTorsionWithin} from './genus-one-dispatch';
import {verifyGenusOneRationalTorsionWithin, type GenusOneRationalTorsion} from './genus-one-torsion';

export type AlgebraicPrincipalMultiple<E> = Readonly<
  {method: 'elliptic-miller'; evidence: EllipticDivisorTorsion<E>} |
  {method: 'genus-one-rr-miller'; evidence: GenusOneRationalTorsion<E>} |
  {method: 'infinity-pell'; evidence: HyperellipticInfinityTorsion<E>} |
  {method: 'ramified-cantor'; evidence: RamifiedDivisorTorsion<E>} |
  {method: 'balanced-cantor'; evidence: BalancedDivisorTorsion<E>} |
  {method: 'general-principal'; evidence: AlgebraicRrPrincipality<E>} |
  {method: 'general-torsion'; evidence: AlgebraicDivisorTorsion<E>}
>;
export function principalMultipleOrder<E>(ctx: ExecutionContext, proof: AlgebraicPrincipalMultiple<E>): bigint | null {
  ctx.tick(); if (proof.method === 'general-principal') {demand(proof.evidence.kind === 'principal', 'verification-failed', 'direct principal dispatch evidence'); return 1n;}
  if (proof.method === 'general-torsion') {
    const evidence = proof.evidence; if (evidence.kind === 'non-torsion') return null;
    demand(evidence.order !== null, 'verification-failed', 'general positive order coverage');
    ctx.integer(evidence.order); demand(evidence.order > 0n, 'verification-failed', 'general least positive order'); return evidence.order;
  }
  const order = proof.evidence.order;
  demand(proof.evidence.kind === 'torsion' ? order !== null && order > 0n : proof.evidence.kind === 'non-torsion' && order === null, 'verification-failed', 'principal-multiple outcome/order');
  if (order !== null) ctx.integer(order); return order;
}
export function principalMultipleFactors<E>(ctx: ExecutionContext, proof: AlgebraicPrincipalMultiple<E>): readonly AlgebraicFunctionFactor<E>[] {
  demand(principalMultipleOrder(ctx, proof) !== null, 'verification-failed', 'principal-multiple positive factors');
  if (proof.method === 'elliptic-miller' || proof.method === 'genus-one-rr-miller') return proof.evidence.factors;
  if (proof.method === 'infinity-pell') {demand(proof.evidence.principal?.kind === 'principal', 'verification-failed', 'Pell principal witness'); return proof.evidence.principal.factors;}
  if (proof.method === 'ramified-cantor') {
    const p = proof.evidence.reason === 'principal-divisor' ? proof.evidence.direct : proof.evidence.principal;
    demand(p?.kind === 'principal' && p.reduction !== null, 'verification-failed', 'Cantor principal witness'); return p.reduction.factors;
  }
  if (proof.method === 'balanced-cantor') {
    const p = proof.evidence.reason === 'principal-divisor' ? proof.evidence.direct : proof.evidence.principal;
    demand(p?.kind === 'principal' && p.reduction !== null, 'verification-failed', 'balanced principal witness'); return p.reduction.factors;
  }
  let p: AlgebraicRrPrincipality<E>;
  if (proof.method === 'general-principal') p = proof.evidence;
  else {const evidence = proof.evidence; demand(evidence.kind === 'torsion', 'verification-failed', 'general positive torsion evidence'); p = evidence.principal;}
  demand(p.kind === 'principal', 'verification-failed', 'general principal witness'); ctx.allocate(4);
  return Object.freeze([Object.freeze({value: p.witness, exponent: 1n})]);
}
/** The Pell certificate already supplies the checked conjugate/norm inverse.
 * Other factors retain ordinary exact inversion; failures never cause retry. */
export function principalMultipleFactorInverse<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, proof: AlgebraicPrincipalMultiple<E>, value: E): E {
  if (proof.method === 'infinity-pell') {
    const unit = proof.evidence.principal?.unit;
    demand(proof.evidence.kind === 'torsion' && unit !== null && unit !== undefined && curve.owner.equal(ctx, unit.argument, value), 'verification-failed', 'Pell factor exact checked unit binding');
    return unit.inverse;
  }
  return curve.owner.inverse(ctx, value);
}
export function verifyAlgebraicPrincipalMultipleWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, proof: AlgebraicPrincipalMultiple<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicDivisorWithin(ctx, curve, divisor.input, divisor);
  switch (proof.method) {
    case 'elliptic-miller': verifyEllipticDivisorTorsionWithin(ctx, curve, divisor, proof.evidence, bounds); break;
    case 'genus-one-rr-miller':
      demand(proof.evidence.model.curve === curve, 'domain-mismatch', 'general genus-one supplied native curve');
      verifyGenusOneRationalTorsionWithin(ctx, proof.evidence.model, divisor, proof.evidence, bounds); break;
    case 'infinity-pell': verifyHyperellipticInfinityTorsionWithin(ctx, curve, divisor, proof.evidence, bounds); break;
    case 'ramified-cantor': verifyRamifiedDivisorTorsionWithin(ctx, curve, divisor, proof.evidence, bounds); break;
    case 'balanced-cantor': verifyBalancedDivisorTorsionWithin(ctx, curve, divisor, proof.evidence, bounds); break;
    case 'general-principal': verifyAlgebraicRrPrincipalityWithin(ctx, curve, divisor, proof.evidence, bounds); demand(proof.evidence.kind === 'principal', 'verification-failed', 'general direct principal coverage'); break;
    case 'general-torsion': verifyAlgebraicDivisorTorsionWithin(ctx, curve, divisor, proof.evidence, bounds); break;
    default: demand(false, 'invalid-input', 'principal-multiple method');
  }
  principalMultipleOrder(ctx, proof);
}
export function decideAlgebraicPrincipalMultipleWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds): AlgebraicPrincipalMultiple<E> {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicDivisorWithin(ctx, curve, divisor.input, divisor);
  // The native rational-point classification is suited to P-O itself.
  // Combined/signed/closed-place classes use complete Cantor and certified
  // reductions, avoiding large rational coordinates for n(P-Q). This chooses
  // a complete method by the divisor representation; it restricts no inputs.
  const pointMinusInfinity = divisor.degree === 0n && divisor.entries.length === 2
    && divisor.entries.some(e => !e.place.order.infinity && e.place.degree === 1n && (e.coefficient === 1n || e.coefficient === -1n))
    && divisor.entries.some(e => e.place.order.infinity && e.place.degree === 1n && (e.coefficient === 1n || e.coefficient === -1n));
  const elliptic = pointMinusInfinity ? tryDecideEllipticDivisorTorsionWithin(ctx, curve, divisor, bounds) : null; let proof: AlgebraicPrincipalMultiple<E>;
  if (elliptic !== null) proof = Object.freeze({method: 'elliptic-miller', evidence: elliptic});
  else {
    const infinity = tryDecideHyperellipticInfinityTorsionWithin(ctx, curve, divisor, bounds);
    if (infinity !== null) proof = Object.freeze({method: 'infinity-pell', evidence: infinity});
    else {
      const ramified = tryDecideRamifiedDivisorTorsionWithin(ctx, curve, divisor, bounds);
      if (ramified !== null) proof = Object.freeze({method: 'ramified-cantor', evidence: ramified});
      else {
        const balanced = tryDecideBalancedDivisorTorsionWithin(ctx, curve, divisor, bounds);
        if (balanced !== null) proof = Object.freeze({method: 'balanced-cantor', evidence: balanced});
        else {
          const genusOne = tryDecideGeneralGenusOneTorsionWithin(ctx, curve, divisor, bounds);
          if (genusOne !== null) proof = Object.freeze({method: 'genus-one-rr-miller', evidence: genusOne});
          else {
            const principal = decideAlgebraicRrPrincipalityWithin(ctx, curve, divisor, bounds);
            proof = principal.kind === 'principal' ? Object.freeze({method: 'general-principal', evidence: principal})
              : Object.freeze({method: 'general-torsion', evidence: decideAlgebraicDivisorTorsionWithin(ctx, curve, divisor, bounds)});
          }
        }
      }
    }
  }
  ctx.allocate(2); verifyAlgebraicPrincipalMultipleWithin(ctx, curve, divisor, proof, bounds); return proof;
}
