/** Complete two-reduction torsion with finite/characteristic-zero Pell evidence. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {verifyAlgebraicCurveWithin, type AlgebraicCurveView} from './algebraic-curve';
import {assertAlgebraicDivisor, verifyAlgebraicDivisorWithin, scaleAlgebraicDivisorWithin, type AlgebraicDivisor} from './algebraic-divisor';
import {verifyAlgebraicGoodReductionWithin, type AlgebraicGoodReduction} from './algebraic-good-reduction';
import {verifyAlgebraicDivisorSpecialization, type AlgebraicDivisorSpecialization} from './algebraic-divisor-specialization';
import {findDivisorGoodReductionWithin} from './algebraic-divisor-good-reduction';
import {decideReducedInfinityPellOrderWithin, verifyReducedInfinityPellOrderWithin, type ReducedInfinityPellOrder} from './reduced-infinity-pell-order';
import {tryDecideHyperellipticInfinityPrincipalityWithin, verifyHyperellipticInfinityPrincipalityWithin, type HyperellipticInfinityPrincipality} from './hyperelliptic-infinity-principality';
import {trySplitHyperellipticModelWithin} from './hyperelliptic-curve-model';
import type {ReductionConstant} from './algebraic-number-reduction';
import {integerGcd} from './rational';
import {recordRationalGcdEvidence, replayRationalGcdEvidence, type RationalGcdEvidence} from './rational-gcd-evidence';
import {verifyGoodReductionClaim} from './algebraic-reduction-errors';

export interface HyperellipticPellReducedOrder<E> {readonly reduction: AlgebraicGoodReduction<E>; readonly specialization: AlgebraicDivisorSpecialization<E>; readonly order: ReducedInfinityPellOrder<ReductionConstant>}
export interface HyperellipticInfinityTorsion<E> {
  readonly rule: 'hyperelliptic-infinity-two-reduction-pell-v1'; readonly divisor: AlgebraicDivisor<E>;
  readonly reductions: readonly [HyperellipticPellReducedOrder<E>, HyperellipticPellReducedOrder<E>];
  readonly gcd: bigint; readonly multiple: bigint; readonly principal: HyperellipticInfinityPrincipality<E> | null;
  readonly third: HyperellipticPellReducedOrder<E>;
  readonly reason: 'third-reduction' | 'native-principality';
  readonly kind: 'torsion' | 'non-torsion'; readonly order: bigint | null; readonly arithmetic?: RationalGcdEvidence;
}
export function verifyHyperellipticInfinityTorsionWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, proof: HyperellipticInfinityTorsion<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); assertAlgebraicDivisor(ctx, curve, divisor); verifyAlgebraicDivisorWithin(ctx, curve, divisor.input, divisor);
  demand(proof.rule === 'hyperelliptic-infinity-two-reduction-pell-v1' && proof.divisor === divisor && divisor.degree === 0n && divisor.entries.length === 2 && divisor.entries.every(e => e.place.order.infinity) && proof.reductions.length === 2, 'verification-failed', 'complete infinity torsion request/reduction coverage');
  const [a, b] = proof.reductions; demand(a.reduction.number.prime.characteristic !== b.reduction.number.prime.characteristic, 'verification-failed', 'different infinity torsion residue characteristics');
  for (const p of proof.reductions) {
    verifyAlgebraicGoodReductionWithin(ctx, curve, p.reduction, bounds); verifyAlgebraicDivisorSpecialization(ctx, p.reduction, divisor, p.specialization);
    verifyReducedInfinityPellOrderWithin(ctx, p.reduction.curve, p.reduction.model, p.specialization.divisor, p.order, bounds);
  }
  const gcd = integerGcd(ctx, a.order.order, b.order.order), multiple = ctx.multiply(ctx.quotient(a.order.order, gcd), b.order.order);
  demand(proof.gcd === gcd && proof.multiple === multiple && multiple > 0n, 'verification-failed', 'infinity exact two-reduction bound');
  const third = proof.third; demand(third.reduction.number.prime.characteristic !== a.reduction.number.prime.characteristic && third.reduction.number.prime.characteristic !== b.reduction.number.prime.characteristic, 'verification-failed', 'distinct third good-reduction characteristic');
  verifyAlgebraicGoodReductionWithin(ctx, curve, third.reduction, bounds); verifyAlgebraicDivisorSpecialization(ctx, third.reduction, divisor, third.specialization);
  verifyReducedInfinityPellOrderWithin(ctx, third.reduction.curve, third.reduction.model, third.specialization.divisor, third.order, bounds);
  if (proof.reason === 'third-reduction') {
    demand(proof.kind === 'non-torsion' && proof.order === null && proof.principal === null && ctx.remainder(multiple, third.order.order) !== 0n, 'verification-failed', 'candidate multiple remains nonzero in certified third reduction'); return;
  }
  demand(proof.reason === 'native-principality' && proof.principal !== null && ctx.remainder(multiple, third.order.order) === 0n, 'verification-failed', 'native infinity principality coverage after third reduction');
  verifyAlgebraicDivisorWithin(ctx, curve, divisor.entries.map(e => ({place: e.place, coefficient: ctx.multiply(e.coefficient, multiple)})), proof.principal.divisor);
  verifyHyperellipticInfinityPrincipalityWithin(ctx, curve, proof.principal.divisor, proof.principal, bounds);
  demand((proof.kind === 'torsion' && proof.order === multiple && proof.principal.kind === 'principal')
    || (proof.kind === 'non-torsion' && proof.order === null && proof.principal.kind === 'not-principal'), 'verification-failed', 'complete two-reduction/Pell torsion conclusion');
}
function reduced<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, excluded: bigint | null, bounds: DifferentialBounds, additionalExcluded: readonly bigint[] = []): HyperellipticPellReducedOrder<E> {
  const {reduction, specialization} = findDivisorGoodReductionWithin(ctx, curve, divisor, excluded, bounds, additionalExcluded);
  const order = decideReducedInfinityPellOrderWithin(ctx, reduction.curve, reduction.model, specialization.divisor, bounds); ctx.allocate(3); return Object.freeze({reduction, specialization, order});
}
export function tryDecideHyperellipticInfinityTorsionWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds): HyperellipticInfinityTorsion<E> | null {
  assertAlgebraicDivisor(ctx, curve, divisor); verifyAlgebraicDivisorWithin(ctx, curve, divisor.input, divisor);
  if (divisor.degree !== 0n || divisor.entries.length !== 2 || divisor.entries.some(e => !e.place.order.infinity)) return null;
  if (trySplitHyperellipticModelWithin(ctx, curve, bounds) === null) return null;
  const a = reduced(ctx, curve, divisor, null, bounds), b = reduced(ctx, curve, divisor, a.reduction.number.prime.characteristic, bounds), gcd = integerGcd(ctx, a.order.order, b.order.order), multiple = ctx.multiply(ctx.quotient(a.order.order, gcd), b.order.order);
  const third = reduced(ctx, curve, divisor, a.reduction.number.prime.characteristic, bounds, [b.reduction.number.prime.characteristic]);
  if (ctx.remainder(multiple, third.order.order) !== 0n) {
    ctx.allocate(11); const proof = Object.freeze({rule: 'hyperelliptic-infinity-two-reduction-pell-v1' as const, divisor, reductions: Object.freeze([a, b] as const), gcd, multiple,
      third, principal: null, reason: 'third-reduction' as const, kind: 'non-torsion' as const, order: null}); verifyHyperellipticInfinityTorsionWithin(ctx, curve, divisor, proof, bounds); return proof;
  }
  const target = scaleAlgebraicDivisorWithin(ctx, curve, divisor, multiple), principal = tryDecideHyperellipticInfinityPrincipalityWithin(ctx, curve, target, bounds);
  demand(principal !== null, 'verification-failed', 'certified infinity Pell principality applicability'); ctx.allocate(9);
  const proof = Object.freeze({rule: 'hyperelliptic-infinity-two-reduction-pell-v1' as const, divisor, reductions: Object.freeze([a, b] as const), gcd, multiple, principal, third, reason: 'native-principality' as const,
    kind: principal.kind === 'principal' ? 'torsion' as const : 'non-torsion' as const, order: principal.kind === 'principal' ? multiple : null});
  verifyHyperellipticInfinityTorsionWithin(ctx, curve, divisor, proof, bounds); return proof;
}
export function tryDecideHyperellipticInfinityTorsion<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => verifyGoodReductionClaim(() => {const recorded = recordRationalGcdEvidence(ctx, () => tryDecideHyperellipticInfinityTorsionWithin(ctx, curve, divisor, bounds));
    return recorded.value === null ? null : Object.freeze({...recorded.value, arithmetic: recorded.evidence});}));
}
export function verifyHyperellipticInfinityTorsion<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, proof: HyperellipticInfinityTorsion<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyGoodReductionClaim(() => {demand(proof.arithmetic !== undefined, 'verification-failed', 'infinity torsion arithmetic coverage');
    replayRationalGcdEvidence(ctx, proof.arithmetic, () => verifyHyperellipticInfinityTorsionWithin(ctx, curve, divisor, proof, bounds));}));
}
