/** Complete split-even torsion via certified reductions and balanced classes. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {verifyAlgebraicCurveWithin, type AlgebraicCurveView} from './algebraic-curve';
import {verifyAlgebraicDivisorWithin, scaleAlgebraicDivisorWithin, type AlgebraicDivisor} from './algebraic-divisor';
import {trySplitHyperellipticModelWithin} from './hyperelliptic-curve-model';
import {constructBalancedCurveModelWithin, verifyBalancedCurveModelWithin, type BalancedCurveModel} from './hyperelliptic-balanced-place';
import {decideBalancedPrincipalityWithin, verifyBalancedPrincipalityWithin, type BalancedPrincipality} from './hyperelliptic-balanced-divisor';
import {findDivisorGoodReductionWithin} from './algebraic-divisor-good-reduction';
import {verifyAlgebraicGoodReductionWithin, type AlgebraicGoodReduction} from './algebraic-good-reduction';
import {verifyAlgebraicDivisorSpecialization, type AlgebraicDivisorSpecialization} from './algebraic-divisor-specialization';
import {decideReducedBalancedOrderWithin, verifyReducedBalancedOrderWithin, type ReducedBalancedOrder} from './reduced-balanced-order';
import type {ReductionConstant} from './algebraic-number-reduction';
import {integerGcd} from './rational';
import {verifyGoodReductionClaim} from './algebraic-reduction-errors';
import {recordRationalGcdEvidence, replayRationalGcdEvidence, type RationalGcdEvidence} from './rational-gcd-evidence';
import {reuseAlgebraicVerification} from './algebraic-proof-reuse';

export interface BalancedReducedOrder<E> {readonly reduction: AlgebraicGoodReduction<E>; readonly specialization: AlgebraicDivisorSpecialization<E>; readonly order: ReducedBalancedOrder<ReductionConstant>}
export interface BalancedDivisorTorsion<E> {
  readonly rule: 'split-balanced-two-reduction-v1'; readonly source: BalancedCurveModel<E>; readonly divisor: AlgebraicDivisor<E>;
  readonly direct: BalancedPrincipality<E>; readonly reductions: readonly BalancedReducedOrder<E>[]; readonly third: BalancedReducedOrder<E> | null;
  readonly multiple: bigint; readonly principal: BalancedPrincipality<E> | null; readonly kind: 'torsion' | 'non-torsion';
  readonly reason: 'degree' | 'principal-divisor' | 'third-reduction' | 'native-principality'; readonly order: bigint | null;
  readonly arithmetic?: RationalGcdEvidence;
}
function verifyReduced<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, p: BalancedReducedOrder<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicGoodReductionWithin(ctx, curve, p.reduction, bounds); verifyAlgebraicDivisorSpecialization(ctx, p.reduction, divisor, p.specialization);
  verifyReducedBalancedOrderWithin(ctx, p.reduction.curve, p.reduction.model, p.specialization.divisor, p.order, bounds);
}
export function verifyBalancedDivisorTorsionWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, proof: BalancedDivisorTorsion<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicDivisorWithin(ctx, curve, divisor.input, divisor);
  demand(proof.source.model.curve === curve, 'domain-mismatch', 'balanced torsion native source');
  demand(proof.divisor === divisor, 'verification-failed', 'complete balanced torsion request');
  reuseAlgebraicVerification(ctx, 'balanced-torsion', curve, proof, bounds, () => verifyBalancedTorsionEvidence(ctx, curve, divisor, proof, bounds));
}
function verifyBalancedTorsionEvidence<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, proof: BalancedDivisorTorsion<E>, bounds: DifferentialBounds): void {
  verifyBalancedCurveModelWithin(ctx, proof.source.model, proof.source, bounds);
  demand(proof.rule === 'split-balanced-two-reduction-v1', 'verification-failed', 'complete balanced torsion rule'); ctx.integer(proof.multiple); if (proof.order !== null) ctx.integer(proof.order);
  verifyBalancedPrincipalityWithin(ctx, proof.source, divisor, proof.direct, bounds);
  if (proof.reason === 'degree' || proof.reason === 'principal-divisor') {
    demand(proof.reductions.length === 0 && proof.third === null && proof.multiple === 1n && proof.principal === null, 'verification-failed', 'balanced direct complete branch coverage');
    demand(proof.reason === 'degree' ? divisor.degree !== 0n && proof.direct.kind === 'not-principal' && proof.kind === 'non-torsion' && proof.order === null
      : divisor.degree === 0n && proof.direct.kind === 'principal' && proof.kind === 'torsion' && proof.order === 1n, 'verification-failed', 'balanced direct torsion conclusion'); return;
  }
  demand(divisor.degree === 0n && proof.direct.kind === 'not-principal' && proof.reductions.length === 2 && proof.third !== null, 'verification-failed', 'complete balanced reduction coverage');
  const [a, b] = proof.reductions, third = proof.third;
  for (const p of [a, b, third]) verifyReduced(ctx, curve, divisor, p, bounds);
  const pa = a.reduction.number.prime.characteristic, pb = b.reduction.number.prime.characteristic, pc = third.reduction.number.prime.characteristic;
  demand(pa !== pb && pc !== pa && pc !== pb, 'verification-failed', 'three distinct balanced good residue characteristics');
  const multiple = ctx.multiply(ctx.quotient(a.order.order, integerGcd(ctx, a.order.order, b.order.order)), b.order.order);
  demand(proof.multiple === multiple && multiple > 0n, 'verification-failed', 'complete balanced two-reduction order candidate');
  if (proof.reason === 'third-reduction') {
    demand(ctx.remainder(multiple, third.order.order) !== 0n && proof.kind === 'non-torsion' && proof.order === null && proof.principal === null, 'verification-failed', 'checked balanced finite non-torsion obstruction'); return;
  }
  demand(proof.reason === 'native-principality' && ctx.remainder(multiple, third.order.order) === 0n && proof.principal !== null, 'verification-failed', 'complete balanced native principal-multiple branch');
  verifyAlgebraicDivisorWithin(ctx, curve, divisor.entries.map(e => ({place: e.place, coefficient: ctx.multiply(e.coefficient, multiple)})), proof.principal.divisor);
  verifyBalancedPrincipalityWithin(ctx, proof.source, proof.principal.divisor, proof.principal, bounds);
  demand(proof.principal.kind === 'principal' ? proof.kind === 'torsion' && proof.order === multiple : proof.kind === 'non-torsion' && proof.order === null, 'verification-failed', 'balanced minimal-order and native conclusion');
}
function reduced<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, excluded: bigint | null, bounds: DifferentialBounds, additionalExcluded: readonly bigint[] = []): BalancedReducedOrder<E> {
  const {reduction, specialization} = findDivisorGoodReductionWithin(ctx, curve, divisor, excluded, bounds, additionalExcluded), order = decideReducedBalancedOrderWithin(ctx, reduction.curve, reduction.model, specialization.divisor, bounds);
  ctx.allocate(3); return Object.freeze({reduction, specialization, order});
}
export function tryDecideBalancedDivisorTorsionWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds): BalancedDivisorTorsion<E> | null {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicDivisorWithin(ctx, curve, divisor.input, divisor);
  const model = trySplitHyperellipticModelWithin(ctx, curve, bounds); if (model === null) return null;
  const source = constructBalancedCurveModelWithin(ctx, model, bounds), direct = decideBalancedPrincipalityWithin(ctx, source, divisor, bounds); let proof: BalancedDivisorTorsion<E>;
  const common = {rule: 'split-balanced-two-reduction-v1' as const, source, divisor, direct};
  if (divisor.degree !== 0n || direct.kind === 'principal') proof = Object.freeze({...common, reductions: Object.freeze([]), third: null, multiple: 1n, principal: null,
    reason: divisor.degree !== 0n ? 'degree' as const : 'principal-divisor' as const, kind: direct.kind === 'principal' ? 'torsion' as const : 'non-torsion' as const, order: direct.kind === 'principal' ? 1n : null});
  else {
    const a = reduced(ctx, curve, divisor, null, bounds), b = reduced(ctx, curve, divisor, a.reduction.number.prime.characteristic, bounds), multiple = ctx.multiply(ctx.quotient(a.order.order, integerGcd(ctx, a.order.order, b.order.order)), b.order.order);
    const third = reduced(ctx, curve, divisor, a.reduction.number.prime.characteristic, bounds, [b.reduction.number.prime.characteristic]);
    if (ctx.remainder(multiple, third.order.order) !== 0n) proof = Object.freeze({...common, reductions: Object.freeze([a, b]), third, multiple, principal: null, kind: 'non-torsion' as const, reason: 'third-reduction' as const, order: null});
    else {
      const target = scaleAlgebraicDivisorWithin(ctx, curve, divisor, multiple), principal = decideBalancedPrincipalityWithin(ctx, source, target, bounds);
      proof = Object.freeze({...common, reductions: Object.freeze([a, b]), third, multiple, principal, reason: 'native-principality' as const,
        kind: principal.kind === 'principal' ? 'torsion' as const : 'non-torsion' as const, order: principal.kind === 'principal' ? multiple : null});
    }
  }
  ctx.allocate(12); verifyBalancedDivisorTorsionWithin(ctx, curve, divisor, proof, bounds); return proof;
}
export function tryDecideBalancedDivisorTorsion<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => verifyGoodReductionClaim(() => {const recorded = recordRationalGcdEvidence(ctx, () => tryDecideBalancedDivisorTorsionWithin(ctx, curve, divisor, bounds));
    return recorded.value === null ? null : Object.freeze({...recorded.value, arithmetic: recorded.evidence});}));
}
export function verifyBalancedDivisorTorsion<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, proof: BalancedDivisorTorsion<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyGoodReductionClaim(() => {demand(proof.arithmetic !== undefined, 'verification-failed', 'balanced torsion arithmetic coverage');
    replayRationalGcdEvidence(ctx, proof.arithmetic, () => verifyBalancedDivisorTorsionWithin(ctx, curve, divisor, proof, bounds));}));
}
