/** Composition only; the outer good-reduction artifact supplies its complete
 * field/model/specialization authority before processing this evidence. */
import {demand} from './execution';
import type {PositiveWireContext} from './positive-wire';
import type {ReducedCurveView} from './reduced-curve';
import type {ReducedCurveModel} from './reduced-model';
import type {ReducedDivisor} from './reduced-divisor';
import {reducedValueCodec} from './reduced-place-wire';
import {cantorArithmeticEvidenceCodecs} from './cantor-wire-algebra';
import {positiveCantorOrderCodec} from './positive-cantor-order-wire';
import {reconstructReducedCantorModelWithin, verifyReducedCantorOrderWithin, type ReducedCantorOrder} from './reduced-cantor-order';
import * as w from './decision-wire-algebra';

export function reducedCantorOrderCodec<E>(s: PositiveWireContext, curve: ReducedCurveView<E>, original: ReducedCurveModel<E>, expected: ReducedDivisor<E>): w.EvidenceCodec<ReducedCantorOrder<E>> {
  const ctx = s.ctx, f = curve.algebra.scalar, p = s.polynomial(f.ring, s.coefficient(curve.algebra.constants)), native = reducedValueCodec(s, curve), scalar = s.fraction(f, s.coefficient(curve.algebra.constants));
  const modelParts = w.structure(ctx, {b: scalar, c: scalar, polynomial: p, squareFree: s.bezout(p), y: native}), factors = w.list(ctx, w.structure(ctx, {value: native, exponent: s.integer()}));
  return {
    encode(value) {
      demand(value.divisor === expected && value.model.curve === curve && value.model.original === original, 'domain-mismatch', 'reduced Cantor codec original request');
      const {pair, reduction, addition, multiple} = cantorArithmeticEvidenceCodecs(ctx, p, s.integer(), (name, codec) => s.memo(name, value.model, codec));
      const evidence = w.structure(ctx, {rule: w.literal(ctx, 'finite-ramified-cantor-order-v1'), additions: w.list(ctx, addition), pair, functions: factors,
        orderEvidence: positiveCantorOrderCodec(s, value.model.domain), order: s.integer(), witness: factors});
      ctx.allocate(value.terms.length); const terms = Object.freeze(value.terms.map((term, i) => {
        demand(i < expected.entries.length && term.transport.place === expected.entries[i].place, 'verification-failed', 'reduced Cantor encoded indexed place');
        const parts = w.structure(ctx, {kind: w.literal(ctx, 'infinity', 'inert', 'split'), yResidue: w.optional(s.coefficient(term.transport.place.residue)), initial: pair,
          reductions: w.list(ctx, reduction), pair, multiple}); return parts.encode({...term.transport, multiple: term.multiple});
      }));
      return Object.freeze({model: modelParts.encode(value.model), terms, evidence: evidence.encode(value)});
    },
    decode(data) {
      const raw = w.record(ctx, data, ['model', 'terms', 'evidence']), model = reconstructReducedCantorModelWithin(ctx, curve, original, modelParts.decode(raw.model), s.bounds);
      const {pair, reduction, addition, multiple} = cantorArithmeticEvidenceCodecs(ctx, p, s.integer(), (name, codec) => s.memo(name, model, codec));
      const values = w.array(ctx, raw.terms); demand(values.length === expected.entries.length, 'verification-failed', 'complete reduced Cantor serialized place coverage'); ctx.allocate(values.length);
      const terms = Object.freeze(values.map((value, i) => {
        const place = expected.entries[i].place, parts = w.structure(ctx, {kind: w.literal(ctx, 'infinity', 'inert', 'split'), yResidue: w.optional(s.coefficient(place.residue)), initial: pair,
          reductions: w.list(ctx, reduction), pair, multiple}).decode(value), {multiple: coefficient, ...transport} = parts;
        ctx.allocate(2); return Object.freeze({transport: Object.freeze({place, ...transport}), multiple: coefficient});
      }));
      const evidence = w.structure(ctx, {rule: w.literal(ctx, 'finite-ramified-cantor-order-v1'), additions: w.list(ctx, addition), pair, functions: factors,
        orderEvidence: positiveCantorOrderCodec(s, model.domain), order: s.integer(), witness: factors}).decode(raw.evidence);
      ctx.allocate(4); const proof = Object.freeze({model, divisor: expected, terms, ...evidence}); verifyReducedCantorOrderWithin(ctx, curve, original, expected, proof, s.bounds); return proof;
    }
  };
}
