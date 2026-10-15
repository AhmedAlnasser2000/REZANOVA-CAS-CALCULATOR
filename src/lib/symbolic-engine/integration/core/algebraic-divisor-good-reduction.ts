/** The identical good-prime/specialization ritual, shared by typed geometric
 * order methods. The caller retains its separate arithmetic and replay rule. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {AlgebraicCurveView} from './algebraic-curve';
import type {AlgebraicDivisor} from './algebraic-divisor';
import {findAlgebraicGoodReductionWithin, type AlgebraicGoodReduction} from './algebraic-good-reduction';
import {specializeAlgebraicDivisorWithin, type AlgebraicDivisorSpecialization} from './algebraic-divisor-specialization';

export function findDivisorGoodReductionWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, divisor: AlgebraicDivisor<E>, excluded: bigint | null, bounds: DifferentialBounds,
  additionalExcluded: readonly bigint[] = []): Readonly<{reduction: AlgebraicGoodReduction<E>; specialization: AlgebraicDivisorSpecialization<E>}> {
  let specialization: AlgebraicDivisorSpecialization<E> | null = null;
  const reduction = findAlgebraicGoodReductionWithin(ctx, curve, bounds, excluded, p => {specialization = specializeAlgebraicDivisorWithin(ctx, p, divisor);}, additionalExcluded);
  demand(specialization !== null, 'verification-failed', 'complete good divisor specialization'); const value = specialization as AlgebraicDivisorSpecialization<E>;
  demand(value.reduction === reduction && value.source === divisor, 'verification-failed', 'exact accepted divisor reduction binding'); ctx.allocate(2); return Object.freeze({reduction, specialization: value});
}
