/** Complete odd-degree torsion over the actual certified number-field constants. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {verifyAlgebraicCurveWithin, type AlgebraicCurveView} from './algebraic-curve';
import {verifyAlgebraicDivisorWithin, scaleAlgebraicDivisorWithin, type AlgebraicDivisor} from './algebraic-divisor';
import {tryRamifiedHyperellipticModelWithin, verifyRamifiedHyperellipticModelWithin, type RamifiedHyperellipticModel} from './ramified-hyperelliptic-model';
import {decideCantorPrincipalityWithin, verifyCantorPrincipalityWithin, type CantorPrincipality} from './hyperelliptic-cantor-principality';
import {findDivisorGoodReductionWithin} from './algebraic-divisor-good-reduction';
import {verifyAlgebraicGoodReductionWithin, type AlgebraicGoodReduction} from './algebraic-good-reduction';
import {verifyAlgebraicDivisorSpecialization, type AlgebraicDivisorSpecialization} from './algebraic-divisor-specialization';
import {decideReducedCantorOrderWithin, verifyReducedCantorOrderWithin, type ReducedCantorOrder} from './reduced-cantor-order';
import type {ReductionConstant} from './algebraic-number-reduction';
import {integerGcd} from './rational';
import {verifyGoodReductionClaim} from './algebraic-reduction-errors';
import {recordRationalGcdEvidence, replayRationalGcdEvidence, type RationalGcdEvidence} from './rational-gcd-evidence';

export interface CantorReducedOrder<E> {readonly reduction: AlgebraicGoodReduction<E>; readonly specialization: AlgebraicDivisorSpecialization<E>; readonly order: ReducedCantorOrder<ReductionConstant>}
export interface RamifiedDivisorTorsion<E> {
  readonly rule: 'ramified-cantor-two-reduction-v1';
  readonly model: RamifiedHyperellipticModel<E>;
  readonly divisor: AlgebraicDivisor<E>;
  readonly direct: CantorPrincipality<E>;
  readonly reductions: readonly CantorReducedOrder<E>[];
  readonly third: CantorReducedOrder<E> | null;
  readonly multiple: bigint;
  readonly principal: CantorPrincipality<E> | null;
  readonly kind: 'torsion' | 'non-torsion';
  readonly reason: 'degree' | 'principal-divisor' | 'third-reduction' | 'native-principality';
  readonly order: bigint | null;
  readonly arithmetic?: RationalGcdEvidence;
}
function verifyReduced<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, p: CantorReducedOrder<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicGoodReductionWithin(ctx, curve, p.reduction, bounds); verifyAlgebraicDivisorSpecialization(ctx, p.reduction, divisor, p.specialization);
  verifyReducedCantorOrderWithin(ctx, p.reduction.curve, p.reduction.model, p.specialization.divisor, p.order, bounds);
}
export function verifyRamifiedDivisorTorsionWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, proof: RamifiedDivisorTorsion<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicDivisorWithin(ctx, curve, divisor.input, divisor); verifyRamifiedHyperellipticModelWithin(ctx, curve, proof.model, bounds);
  demand(proof.rule === 'ramified-cantor-two-reduction-v1' && proof.divisor === divisor, 'verification-failed', 'complete ramified torsion request/rule'); ctx.integer(proof.multiple);
  if (proof.order !== null) ctx.integer(proof.order);
  verifyCantorPrincipalityWithin(ctx, proof.model, divisor, proof.direct, bounds);
  if (proof.reason === 'degree' || proof.reason === 'principal-divisor') {
    demand(proof.reductions.length === 0 && proof.third === null && proof.multiple === 1n && proof.principal === null, 'verification-failed', 'direct degree/principality complete branch coverage');
    demand(proof.reason === 'degree' ? divisor.degree !== 0n && proof.direct.kind === 'not-principal' && proof.kind === 'non-torsion' && proof.order === null
      : divisor.degree === 0n && proof.direct.kind === 'principal' && proof.kind === 'torsion' && proof.order === 1n, 'verification-failed', 'exact direct torsion decision'); return;
  }
  demand(divisor.degree === 0n && proof.direct.kind === 'not-principal' && proof.reductions.length === 2 && proof.third !== null, 'verification-failed', 'complete nonprincipal torsion reduction coverage');
  const [a, b] = proof.reductions, third = proof.third;
  for (const p of [a, b, third]) verifyReduced(ctx, curve, divisor, p, bounds);
  const pa = a.reduction.number.prime.characteristic, pb = b.reduction.number.prime.characteristic, pc = third.reduction.number.prime.characteristic;
  demand(pa !== pb && pc !== pa && pc !== pb, 'verification-failed', 'three distinct good residue characteristics');
  const multiple = ctx.multiply(ctx.quotient(a.order.order, integerGcd(ctx, a.order.order, b.order.order)), b.order.order);
  demand(proof.multiple === multiple && multiple > 0n, 'verification-failed', 'exact two-reduction torsion candidate');
  if (proof.reason === 'third-reduction') {
    demand(ctx.remainder(multiple, third.order.order) !== 0n && proof.kind === 'non-torsion' && proof.order === null && proof.principal === null, 'verification-failed', 'complete finite non-torsion obstruction'); return;
  }
  demand(proof.reason === 'native-principality' && ctx.remainder(multiple, third.order.order) === 0n && proof.principal !== null, 'verification-failed', 'complete native principal-multiple branch');
  verifyAlgebraicDivisorWithin(ctx, curve, divisor.entries.map(e => ({place: e.place, coefficient: ctx.multiply(e.coefficient, multiple)})), proof.principal.divisor);
  verifyCantorPrincipalityWithin(ctx, proof.model, proof.principal.divisor, proof.principal, bounds);
  demand(proof.principal.kind === 'principal' ? proof.kind === 'torsion' && proof.order === multiple : proof.kind === 'non-torsion' && proof.order === null, 'verification-failed', 'complete minimal-order/native class conclusion');
}
function reduced<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, excluded: bigint | null, bounds: DifferentialBounds, additionalExcluded: readonly bigint[] = []): CantorReducedOrder<E> {
  const {reduction, specialization} = findDivisorGoodReductionWithin(ctx, curve, divisor, excluded, bounds, additionalExcluded), order = decideReducedCantorOrderWithin(ctx, reduction.curve, reduction.model, specialization.divisor, bounds);
  ctx.allocate(3); return Object.freeze({reduction, specialization, order});
}
export function tryDecideRamifiedDivisorTorsionWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds): RamifiedDivisorTorsion<E> | null {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicDivisorWithin(ctx, curve, divisor.input, divisor);
  const model = tryRamifiedHyperellipticModelWithin(ctx, curve, bounds); if (model === null) return null;
  const direct = decideCantorPrincipalityWithin(ctx, model, divisor, bounds); let proof: RamifiedDivisorTorsion<E>;
  const common = {rule: 'ramified-cantor-two-reduction-v1' as const, model, divisor, direct};
  if (divisor.degree !== 0n || direct.kind === 'principal') proof = Object.freeze({...common, reductions: Object.freeze([]), third: null, multiple: 1n, principal: null,
    reason: divisor.degree !== 0n ? 'degree' as const : 'principal-divisor' as const, kind: direct.kind === 'principal' ? 'torsion' as const : 'non-torsion' as const, order: direct.kind === 'principal' ? 1n : null});
  else {
    const a = reduced(ctx, curve, divisor, null, bounds), b = reduced(ctx, curve, divisor, a.reduction.number.prime.characteristic, bounds), multiple = ctx.multiply(ctx.quotient(a.order.order, integerGcd(ctx, a.order.order, b.order.order)), b.order.order);
    const third = reduced(ctx, curve, divisor, a.reduction.number.prime.characteristic, bounds, [b.reduction.number.prime.characteristic]);
    if (ctx.remainder(multiple, third.order.order) !== 0n) proof = Object.freeze({...common, reductions: Object.freeze([a, b]), third, multiple, principal: null, kind: 'non-torsion' as const, reason: 'third-reduction' as const, order: null});
    else {
      const target = scaleAlgebraicDivisorWithin(ctx, curve, divisor, multiple), principal = decideCantorPrincipalityWithin(ctx, model, target, bounds);
      proof = Object.freeze({...common, reductions: Object.freeze([a, b]), third, multiple, principal, reason: 'native-principality' as const,
        kind: principal.kind === 'principal' ? 'torsion' as const : 'non-torsion' as const, order: principal.kind === 'principal' ? multiple : null});
    }
  }
  ctx.allocate(12); verifyRamifiedDivisorTorsionWithin(ctx, curve, divisor, proof, bounds); return proof;
}
export function tryDecideRamifiedDivisorTorsion<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => verifyGoodReductionClaim(() => {const recorded = recordRationalGcdEvidence(ctx, () => tryDecideRamifiedDivisorTorsionWithin(ctx, curve, divisor, bounds));
    return recorded.value === null ? null : Object.freeze({...recorded.value, arithmetic: recorded.evidence});}));
}
export function verifyRamifiedDivisorTorsion<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, proof: RamifiedDivisorTorsion<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyGoodReductionClaim(() => {demand(proof.arithmetic !== undefined, 'verification-failed', 'ramified torsion arithmetic coverage'); replayRationalGcdEvidence(ctx, proof.arithmetic, () => verifyRamifiedDivisorTorsionWithin(ctx, curve, divisor, proof, bounds));}));
}
