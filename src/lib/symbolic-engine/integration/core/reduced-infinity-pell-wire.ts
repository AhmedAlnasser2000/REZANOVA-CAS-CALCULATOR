/** Composition codec; the enclosing good-reduction codec supplies authority. */
import {demand} from './execution';
import {PositiveWireContext} from './positive-wire';
import type {ReducedCurveView} from './reduced-curve';
import type {ReducedCurveModel} from './reduced-model';
import type {ReducedDivisor} from './reduced-divisor';
import {equalReducedPlaces} from './reduced-place';
import {reducedValueCodec} from './reduced-place-wire';
import {positivePellEvidenceCodec} from './positive-pell-wire';
import {verifyReducedInfinityPellOrderWithin, type ReducedInfinityPellOrder} from './reduced-infinity-pell-order';
import * as w from './decision-wire-algebra';

export function reducedInfinityPellOrderCodec<E>(s: PositiveWireContext, curve: ReducedCurveView<E>, model: ReducedCurveModel<E>, divisor: ReducedDivisor<E>): w.EvidenceCodec<ReducedInfinityPellOrder<E>> {
  const ctx = s.ctx, field = curve.algebra.constants, c = s.coefficient(field), f = curve.algebra.scalar, r = f.ring, scalar = s.fraction(f, c), p = s.polynomial(r, c), native = reducedValueCodec(s, curve), index = w.integer(ctx);
  const common = w.structure(ctx, {rule: w.literal(ctx, 'finite-infinity-pell-order-v1'), b: scalar, c: scalar, polynomial: p, halfDegree: w.integer(ctx, 1), coefficient: s.integer(),
    bound: w.structure(ctx, {size: s.integer(), genus: s.integer(), root: s.integer(), upper: s.integer(), step: s.integer()}), pell: positivePellEvidenceCodec(s, field, r), argument: native, order: s.integer(),
    factors: w.list(ctx, w.structure(ctx, {prime: s.integer(), multiplicity: s.integer()})), exclusions: w.list(ctx, w.structure(ctx, {prime: s.integer(), quotient: s.integer(), remainder: s.integer()})), exponent: s.integer()});
  return {encode(proof) {
    const positive = divisor.entries.findIndex(e => equalReducedPlaces(ctx, curve, e.place, proof.positive)), negative = divisor.entries.findIndex(e => equalReducedPlaces(ctx, curve, e.place, proof.negative));
    demand(positive >= 0 && negative >= 0 && positive !== negative, 'verification-failed', 'finite Pell codec complete place binding');
    const pair = w.structure(ctx, {positive: index, negative: index, scaledY: native, positiveResidue: s.coefficient(proof.positive.residue), negativeResidue: s.coefficient(proof.negative.residue)});
    return Object.freeze({infinity: pair.encode({...proof, positive, negative}), evidence: common.encode(proof)});
  }, decode(data) {
    const raw = w.record(ctx, data, ['infinity', 'evidence']), pairRaw = w.record(ctx, raw.infinity, ['positive', 'negative', 'scaledY', 'positiveResidue', 'negativeResidue']);
    const i = index.decode(pairRaw.positive), j = index.decode(pairRaw.negative); demand(divisor.entries.length === 2 && i < 2 && j < 2 && i !== j, 'verification-failed', 'finite Pell serialized place coverage');
    const positive = divisor.entries[i].place, negative = divisor.entries[j].place, pair = w.structure(ctx, {positive: index, negative: index, scaledY: native, positiveResidue: s.coefficient(positive.residue), negativeResidue: s.coefficient(negative.residue)}).decode(raw.infinity);
    const proof = Object.freeze({...common.decode(raw.evidence), ...pair, positive, negative, model, divisor});
    verifyReducedInfinityPellOrderWithin(ctx, curve, model, divisor, proof, s.bounds); return proof;
  }};
}
