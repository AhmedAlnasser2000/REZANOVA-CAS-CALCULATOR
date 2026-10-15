import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import type { RationalFunctionField } from './rational-function';
import type { ExactField } from './field';
import type { CurveConstant, CurveScalar } from './algebraic-curve-coordinates';
import { algebraicCoefficientCodec, algebraicDerivativeCodec, algebraicConditionsCodec } from './algebraic-wire';
import { polynomialModuleCodec, matrixInverseCodec } from './algebraic-module-wire';
import { normalizationInteger } from './exponential-normalization-wire-values';
import type { CurveDenominators, CurveLattice, CurveLatticePreimage } from './algebraic-curve-lattice';
import type { AlgebraicCurveOrder } from './algebraic-curve';
import * as w from './decision-wire-algebra';

/** Per external operation and exact codec owner only. Sharing avoids duplicate
 * reconstruction; every caller still runs its complete mathematical verifier.
 * Nothing in this state is serialized or retained by the returned proof. */
export class AlgebraicDivisorWireContext {
  readonly ctx: ExecutionContext;
  readonly bounds: DifferentialBounds;
  #tables = new Map<string, WeakMap<object, {encode: WeakMap<object, unknown>; decode: WeakMap<object, unknown>}>>();
  constructor(ctx: ExecutionContext, bounds: DifferentialBounds) { this.ctx = ctx; this.bounds = bounds; ctx.allocate(3); }
  memo<T>(name: string, owner: object, codec: w.EvidenceCodec<T>): w.EvidenceCodec<T> {
    let table = this.#tables.get(name);
    if (!table) { this.ctx.allocate(name.length + 2); table = new WeakMap(); this.#tables.set(name, table); }
    let state = table.get(owner);
    if (!state) { this.ctx.allocate(5); state = {encode: new WeakMap(), decode: new WeakMap()}; table.set(owner, state); }
    const ctx = this.ctx;
    return {
      encode(value) {
        ctx.tick(); const object = value !== null && typeof value === 'object' && Object.isFrozen(value) ? value : null;
        const old = object ? state.encode.get(object) : undefined; if (old !== undefined) return old;
        const result = codec.encode(value); if (object) { ctx.allocate(3); state.encode.set(object, result); } return result;
      },
      decode(value) {
        ctx.tick(); const object = value !== null && typeof value === 'object' && Object.isFrozen(value) ? value : null;
        const old = object ? state.decode.get(object) : undefined; if (old !== undefined) return old as T;
        const result = codec.decode(value); if (object) { ctx.allocate(3); state.decode.set(object, result); } return result;
      },
    };
  }
  coefficient(field: RationalFunctionField<CurveConstant>) { return algebraicCoefficientCodec(this.ctx, field.ring.domain, this.bounds); }
  scalar(field: RationalFunctionField<CurveConstant>) { return w.fraction(this.ctx, field, this.coefficient(field)); }
  native<E>(field: ExactField<E>) { return algebraicCoefficientCodec(this.ctx, field, this.bounds); }
  derivative<E>(field: ExactField<E>) { return algebraicDerivativeCodec(this.ctx, field, this.bounds, owner => this.native(owner)); }
  conditions<E>(field: ExactField<E>) { return algebraicConditionsCodec(this.ctx, field, this.bounds, this.native(field)); }
  denominators(field: RationalFunctionField<CurveConstant>): w.EvidenceCodec<CurveDenominators> {
    const ctx = this.ctx, p = w.polynomial(ctx, field.ring, this.coefficient(field));
    return this.memo('curve-denominators', field, w.structure(ctx, {input: w.list(ctx, p), steps: w.list(ctx, w.structure(ctx,
      {gcd: w.bezout(ctx, p), left: p, right: p, next: p})), common: p}));
  }
  lattice(field: RationalFunctionField<CurveConstant>): w.EvidenceCodec<CurveLattice> {
    const ctx = this.ctx, s = this.scalar(field), matrix = w.list(ctx, w.list(ctx, s));
    const parts = w.structure(ctx, {dimension: w.integer(ctx, 1), input: matrix, denominators: this.denominators(field),
      hermite: polynomialModuleCodec(ctx, field.ring, this.coefficient(field)), basis: matrix, inverse: matrixInverseCodec(ctx, s)});
    return this.memo('curve-lattice', field, {
      encode(v) { demand(v.scalar === field, 'domain-mismatch', 'lattice codec scalar'); return parts.encode(v); },
      decode(v) { return Object.freeze({...parts.decode(v), scalar: field}); },
    });
  }
  preimage(field: RationalFunctionField<CurveConstant>): w.EvidenceCodec<CurveLatticePreimage> {
    const lattice = this.lattice(field); return this.memo('curve-preimage', field, w.structure(this.ctx, {rows: lattice, result: lattice}));
  }
  order(field: RationalFunctionField<CurveConstant>, infinity: boolean): w.EvidenceCodec<AlgebraicCurveOrder> {
    const ctx = this.ctx, s = this.scalar(field), p = w.polynomial(ctx, field.ring, this.coefficient(field)), matrix = w.list(ctx, w.list(ctx, p));
    return this.memo('curve-order', field, w.structure(ctx, {infinity: w.literal(ctx, infinity), lattice: this.lattice(field), multiplication: w.list(ctx, matrix),
      traces: w.list(ctx, p), gram: w.list(ctx, w.list(ctx, s)), traceInverse: matrixInverseCodec(ctx, s), discriminant: p}));
  }
  integer() { return normalizationInteger(this.ctx); }
}
export type CurveScalarCodec = w.EvidenceCodec<CurveScalar>;
