/** Composition codec; outer good-reduction evidence supplies curve authority. */
import {demand} from './execution';
import type {PositiveWireContext} from './positive-wire';
import type {ReducedCurveView} from './reduced-curve';
import type {ReducedCurveModel} from './reduced-model';
import type {ReducedDivisor} from './reduced-divisor';
import {reducedValueCodec} from './reduced-place-wire';
import {balancedArithmeticEvidenceCodecs} from './balanced-cantor-wire-algebra';
import {positiveBalancedOrderCodec} from './positive-balanced-order-wire';
import {reconstructReducedBalancedModelWithin} from './reduced-balanced-model';
import {verifyReducedBalancedOrderWithin, type ReducedBalancedOrder} from './reduced-balanced-order';
import * as w from './decision-wire-algebra';

export function reducedBalancedOrderCodec<E>(s: PositiveWireContext, curve: ReducedCurveView<E>, original: ReducedCurveModel<E>, expected: ReducedDivisor<E>): w.EvidenceCodec<ReducedBalancedOrder<E>> {
  const ctx = s.ctx, f = curve.algebra.scalar, p = s.polynomial(f.ring, s.coefficient(curve.algebra.constants)), native = reducedValueCodec(s, curve), scalar = s.fraction(f, s.coefficient(curve.algebra.constants));
  const modelParts = w.structure(ctx, {b: scalar, c: scalar, polynomial: p, squareFree: s.bezout(p), y: native, plus: p, minus: p, infinityRemainder: p}), factors = w.list(ctx, w.structure(ctx, {value: native, exponent: s.integer()}));
  return {encode(value) {
    demand(value.divisor === expected && value.model.curve === curve && value.model.original === original, 'domain-mismatch', 'reduced balanced codec original request');
    const {divisor, normalization, addition, multiple} = balancedArithmeticEvidenceCodecs(ctx, p, s.integer(), (name, codec) => s.memo(name, value.model, codec));
    const evidence = w.structure(ctx, {rule: w.literal(ctx, 'finite-split-balanced-order-v1'), additions: w.list(ctx, addition), result: divisor, functions: factors,
      orderEvidence: positiveBalancedOrderCodec(s, value.model.domain), order: s.integer(), witness: factors});
    ctx.allocate(value.terms.length); const terms = Object.freeze(value.terms.map((term, i) => {
      demand(i < expected.entries.length && term.transport.place === expected.entries[i].place, 'verification-failed', 'reduced balanced encoded indexed place');
      const parts = w.structure(ctx, {kind: w.literal(ctx, 'infinity-plus', 'infinity-minus', 'inert', 'split'), yResidue: w.optional(s.coefficient(term.transport.place.residue)), normalization, result: divisor, multiple});
      return parts.encode({...term.transport, multiple: term.multiple});
    }));
    return Object.freeze({model: modelParts.encode(value.model), terms, evidence: evidence.encode(value)});
  }, decode(data) {
    const raw = w.record(ctx, data, ['model', 'terms', 'evidence']), model = reconstructReducedBalancedModelWithin(ctx, curve, original, modelParts.decode(raw.model), s.bounds);
    const {divisor, normalization, addition, multiple} = balancedArithmeticEvidenceCodecs(ctx, p, s.integer(), (name, codec) => s.memo(name, model, codec));
    const values = w.array(ctx, raw.terms); demand(values.length === expected.entries.length, 'verification-failed', 'complete reduced balanced serialized place coverage'); ctx.allocate(values.length);
    const terms = Object.freeze(values.map((value, i) => {
      const place = expected.entries[i].place, parts = w.structure(ctx, {kind: w.literal(ctx, 'infinity-plus', 'infinity-minus', 'inert', 'split'), yResidue: w.optional(s.coefficient(place.residue)), normalization, result: divisor, multiple}).decode(value), {multiple: coefficient, ...transport} = parts;
      ctx.allocate(2); return Object.freeze({transport: Object.freeze({place, ...transport}), multiple: coefficient});
    }));
    const evidence = w.structure(ctx, {rule: w.literal(ctx, 'finite-split-balanced-order-v1'), additions: w.list(ctx, addition), result: divisor, functions: factors,
      orderEvidence: positiveBalancedOrderCodec(s, model.domain), order: s.integer(), witness: factors}).decode(raw.evidence);
    ctx.allocate(4); const proof = Object.freeze({model, divisor: expected, terms, ...evidence}); verifyReducedBalancedOrderWithin(ctx, curve, original, expected, proof, s.bounds); return proof;
  }};
}
