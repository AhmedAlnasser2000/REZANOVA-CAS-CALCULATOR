/** Complete principality for two-infinity divisors by a derived Pell bound. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {AlgebraicCurveView} from './algebraic-curve';
import {assertAlgebraicDivisor, verifyAlgebraicDivisorWithin, type AlgebraicDivisor} from './algebraic-divisor';
import {equalAlgebraicPlaces, evaluateAlgebraicPlaceIntegral} from './algebraic-place';
import {algebraicFunctionPower} from './algebraic-function-power';
import {trySplitHyperellipticModelWithin, verifySplitHyperellipticModelWithin, type SplitHyperellipticModel} from './hyperelliptic-curve-model';
import {constructSplitHyperellipticInfinityWithin, verifySplitHyperellipticInfinityWithin, constructHyperellipticPellUnitWithin,
  verifyHyperellipticPellUnitWithin, type HyperellipticPellUnit, type SplitHyperellipticInfinity} from './hyperelliptic-pell-unit';
import {solvePolynomialPellWithin, verifyPolynomialPellWithin, type PolynomialPellDecision} from './polynomial-pell';
import type {CurveConstant} from './algebraic-curve-coordinates';

export const hyperellipticInfinityPrincipalityRule = 'hyperelliptic-infinity-pell-principality-v1' as const;
export interface HyperellipticInfinityPrincipality<E> {
  readonly rule: typeof hyperellipticInfinityPrincipalityRule;
  readonly model: SplitHyperellipticModel<E>;
  readonly divisor: AlgebraicDivisor<E>;
  readonly infinity: SplitHyperellipticInfinity<E>;
  readonly coefficient: bigint;
  readonly pell: PolynomialPellDecision<CurveConstant>;
  readonly unit: HyperellipticPellUnit<E> | null;
  readonly kind: 'principal' | 'not-principal';
  readonly reason: 'unit-multiple' | 'bounded-empty' | 'nondividing-unit';
  readonly factors: readonly Readonly<{value: E; exponent: bigint}>[];
}
export function verifyHyperellipticInfinityPrincipalityWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, proof: HyperellipticInfinityPrincipality<E>, bounds: DifferentialBounds): void {
  assertAlgebraicDivisor(ctx, curve, divisor); verifyAlgebraicDivisorWithin(ctx, curve, divisor.input, divisor);
  demand(proof.rule === hyperellipticInfinityPrincipalityRule && proof.divisor === divisor && divisor.degree === 0n && divisor.entries.length === 2, 'verification-failed', 'Pell principality explicit ordered request');
  verifySplitHyperellipticModelWithin(ctx, curve, proof.model, bounds); verifySplitHyperellipticInfinityWithin(ctx, proof.model, proof.infinity, bounds);
  ctx.integer(proof.coefficient); demand(proof.coefficient !== 0n, 'verification-failed', 'nonzero infinity divisor coefficient');
  for (const e of divisor.entries) {
    const positive = equalAlgebraicPlaces(ctx, curve, e.place, proof.infinity.positive), negative = equalAlgebraicPlaces(ctx, curve, e.place, proof.infinity.negative);
    demand(positive !== negative && e.coefficient === (positive ? proof.coefficient : -proof.coefficient), 'verification-failed', 'complete signed infinity divisor correspondence');
  }
  const bound = proof.coefficient < 0n ? ctx.multiply(-1n, proof.coefficient) : proof.coefficient;
  verifyPolynomialPellWithin(ctx, proof.model.polynomial.ring, proof.model.polynomial, bound, proof.pell, bounds);
  if (proof.pell.kind === 'bounded-empty') {
    demand(proof.kind === 'not-principal' && proof.reason === 'bounded-empty' && proof.unit === null && !proof.factors.length, 'verification-failed', 'complete infinity principality degree obstruction'); return;
  }
  demand(proof.unit !== null && proof.unit.pell === proof.pell && proof.pell.leastDegree !== null && proof.pell.leastDegree > 0n, 'verification-failed', 'fundamental infinity unit');
  verifyHyperellipticPellUnitWithin(ctx, proof.model, proof.unit, bounds);
  const degree = proof.pell.leastDegree;
  if (ctx.remainder(proof.coefficient, degree) !== 0n) {
    demand(proof.kind === 'not-principal' && proof.reason === 'nondividing-unit' && !proof.factors.length, 'verification-failed', 'complete nondividing fundamental unit'); return;
  }
  demand(proof.kind === 'principal' && proof.reason === 'unit-multiple' && proof.factors.length === 1
    && curve.owner.equal(ctx, proof.factors[0].value, proof.unit.argument) && proof.factors[0].exponent === ctx.multiply(-1n, ctx.quotient(proof.coefficient, degree)), 'verification-failed', 'exact factored principal witness sign and exponent');
}
export function tryDecideHyperellipticInfinityPrincipalityWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds): HyperellipticInfinityPrincipality<E> | null {
  assertAlgebraicDivisor(ctx, curve, divisor); verifyAlgebraicDivisorWithin(ctx, curve, divisor.input, divisor);
  if (divisor.degree !== 0n || divisor.entries.length !== 2 || divisor.entries.some(e => !e.place.order.infinity)) return null;
  const model = trySplitHyperellipticModelWithin(ctx, curve, bounds); if (model === null) return null;
  const owner = curve.owner, scaled = owner.exactDivide(ctx, model.y, algebraicFunctionPower(ctx, owner, model.x, BigInt(model.halfDegree)));
  let positive: typeof divisor.entries[number] | null = null, negative: typeof divisor.entries[number] | null = null;
  for (const e of divisor.entries) {
    const value = evaluateAlgebraicPlaceIntegral(ctx, curve, e.place, scaled);
    if (e.place.residue.equal(ctx, value, e.place.residue.fromInteger(ctx, 1n))) positive = e;
    else if (e.place.residue.equal(ctx, value, e.place.residue.fromInteger(ctx, -1n))) negative = e;
  }
  demand(positive !== null && negative !== null && positive.coefficient === -negative.coefficient, 'verification-failed', 'split infinity residue/degree coverage');
  const infinity = constructSplitHyperellipticInfinityWithin(ctx, model, positive.place, negative.place, bounds), coefficient = positive.coefficient, bound = coefficient < 0n ? ctx.multiply(-1n, coefficient) : coefficient;
  const pell = solvePolynomialPellWithin(ctx, model.polynomial.ring, model.polynomial, bound, bounds), unit = pell.kind === 'unit' ? constructHyperellipticPellUnitWithin(ctx, model, pell, bounds) : null;
  const principal = unit !== null && pell.leastDegree !== null && ctx.remainder(coefficient, pell.leastDegree) === 0n;
  ctx.allocate(principal ? 15 : 11); const proof = Object.freeze({rule: hyperellipticInfinityPrincipalityRule, model, divisor, infinity, coefficient, pell, unit,
    kind: principal ? 'principal' as const : 'not-principal' as const, reason: principal ? 'unit-multiple' as const : unit === null ? 'bounded-empty' as const : 'nondividing-unit' as const,
    factors: Object.freeze(principal ? [Object.freeze({value: unit!.argument, exponent: ctx.multiply(-1n, ctx.quotient(coefficient, pell.leastDegree!))})] : [])});
  verifyHyperellipticInfinityPrincipalityWithin(ctx, curve, divisor, proof, bounds); return proof;
}
export function tryDecideHyperellipticInfinityPrincipality<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => tryDecideHyperellipticInfinityPrincipalityWithin(ctx, curve, divisor, bounds));
}
export function verifyHyperellipticInfinityPrincipality<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, proof: HyperellipticInfinityPrincipality<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyHyperellipticInfinityPrincipalityWithin(ctx, curve, divisor, proof, bounds));
}
