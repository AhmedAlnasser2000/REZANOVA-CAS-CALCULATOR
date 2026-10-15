/** Explicit normalized native values for new formats. Legacy codecs are intact. */
import {demand, type ExecutionContext} from './execution';
import type {ExactField} from './field';
import type {DifferentialBounds, DifferentialElement} from './differential-field';
import {DifferentialField, assertDifferentialFieldOwner, checkDifferentialBounds} from './differential-field';
import {algebraicHeight, isAlgebraicField, type AlgebraicElement} from './algebraic-field';
import {RationalFunctionField, assertRationalFunctionFieldOwner, type RationalFunction} from './rational-function';
import {normalizedFractionCodec} from './normalized-fraction-wire';
import {factorCoefficientDomain} from './factorization-domain';
import {AlgebraicDivisorWireContext} from './algebraic-divisor-wire-context';
import type {CurveConstant} from './algebraic-curve-coordinates';
import * as w from './decision-wire-algebra';

export function algebraicNormalizedValueCodec<E>(ctx: ExecutionContext, field: ExactField<E>, bounds: DifferentialBounds): w.EvidenceCodec<E> {
  if (field instanceof RationalFunctionField) {
    checkDifferentialBounds(ctx, bounds);
    assertRationalFunctionFieldOwner(ctx, field);
    // Curve scalar fields over actual number-field constants are registered
    // arithmetic owners. They are not admitted through the Q-tower bridge.
    let height = 0, parent: ExactField<unknown> = field;
    while (parent instanceof RationalFunctionField) {assertRationalFunctionFieldOwner(ctx, parent); height++; if (height > bounds.towerHeight) ctx.exhaust('tower-height'); parent = parent.ring.domain;}
    height += algebraicHeight(ctx, parent, bounds); if (height > bounds.towerHeight) ctx.exhaust('tower-height');
    return normalizedFractionCodec(ctx, field, algebraicNormalizedValueCodec(ctx, field.ring.domain, bounds)) as unknown as w.EvidenceCodec<E>;
  }
  algebraicHeight(ctx, field, bounds);
  if (isAlgebraicField(field)) {
    const p = w.polynomial(ctx, field.ring, algebraicNormalizedValueCodec(ctx, field.parent, bounds));
    return {encode(value) {field.assert(ctx, value as AlgebraicElement<unknown>); return p.encode((value as AlgebraicElement<unknown>).representative);},
      decode(data) {const value = p.decode(data); demand(value.coefficients.length < field.modulus.coefficients.length, 'invalid-input', 'unreduced normalized algebraic value'); return field.make(ctx, value) as E;}};
  }
  if (field instanceof DifferentialField && field.kind === 'variable') {
    assertDifferentialFieldOwner(ctx, field);
    demand(field.parent !== undefined && field.fractions !== undefined, 'domain-mismatch', 'owned differential rational variable');
    const value = normalizedFractionCodec(ctx, field.fractions, algebraicNormalizedValueCodec(ctx, field.parent, bounds));
    return {encode(v) {field.assert(ctx, v as DifferentialElement); demand((v as DifferentialElement).kind === 'fraction', 'domain-mismatch', 'differential fraction value'); return value.encode((v as DifferentialElement).value as RationalFunction<DifferentialElement>);},
      decode(data) {return field.fraction(ctx, value.decode(data)) as E;}};
  }
  return factorCoefficientDomain(ctx, field, bounds.towerHeight).codec(ctx);
}
/** Only the new format opts into these explicit normalization records. The
 * context remains operation-local and exact-owner-bound; references are data. */
export class NormalizedAlgebraicWireContext extends AlgebraicDivisorWireContext {
  override native<E>(field: ExactField<E>) {return this.memo('normalized-native', field, algebraicNormalizedValueCodec(this.ctx, field, this.bounds));}
  override coefficient(field: RationalFunctionField<CurveConstant>) {return this.native(field.ring.domain);}
  override scalar(field: RationalFunctionField<CurveConstant>) {return this.native(field);}
}
