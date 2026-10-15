import { demand } from './execution';
import type { AlgebraicCurveView } from './algebraic-curve';
import { reconstructConstantBaseChangedCurveWithin } from './algebraic-curve';
import type { AlgebraicDifferentialResidues } from './algebraic-differential-residues';
import { AlgebraicDivisorWireContext } from './algebraic-divisor-wire-context';
import { algebraicCoefficientCodec } from './algebraic-wire';
import { numberFieldSplittingCodec } from './number-field-wire';
import { algebraicConstantQuotientCodec } from './algebraic-primitive-wire';
import { algebraicDifferentialResiduesCodec } from './algebraic-reduction-wire';
import { algebraicDivisorCodec } from './algebraic-divisor-wire';
import { linearSystemCodec, linearEvidenceCodec } from './linear-wire';
import { verifyAlgebraicResidueSplittingWithin, type AlgebraicResidueSplitting, type AlgebraicResidueSplittingData } from './algebraic-residue-splitting';
import { verifyAlgebraicResidueRelationsWithin, type AlgebraicResidueRelations, type AlgebraicResidueRelationsData } from './algebraic-residue-relations';
import * as w from './decision-wire-algebra';
import type {AlgebraicResidueData} from './algebraic-residue-data';

export function algebraicResidueSplittingDataCodec<E, R extends AlgebraicResidueData<E>, T extends AlgebraicResidueData<unknown>>(s: AlgebraicDivisorWireContext, source: AlgebraicCurveView<E>, original: R, activeCodec: (curve: AlgebraicCurveView<unknown>) => w.EvidenceCodec<T>, verify: (proof: AlgebraicResidueSplittingData<E, R, T>) => void): w.EvidenceCodec<AlgebraicResidueSplittingData<E, R, T>> {
  const {ctx, bounds} = s, native = algebraicCoefficientCodec(ctx, source.owner, bounds), split = numberFieldSplittingCodec(ctx, original.lcm.common.ring, original.lcm.common, bounds);
  return s.memo('algebraic-residue-splitting', original, {encode(p) {
    demand(p.source === source && p.original === original, 'domain-mismatch', 'residue splitting codec exact request');
    return Object.freeze({input: native.encode(p.input), splitting: split.encode(p.splitting), quotient: p.quotient === null ? null : algebraicConstantQuotientCodec(s, source, p.splitting.target).encode(p.quotient),
      residues: p.quotient === null ? null : activeCodec(p.curve).encode(p.residues), indices: w.list(ctx, w.integer(ctx, -1)).encode(p.indices), values: w.list(ctx, algebraicCoefficientCodec(ctx, p.splitting.target, bounds)).encode(p.values)});
  }, decode(v) {
    const raw = w.record(ctx, v, ['input', 'splitting', 'quotient', 'residues', 'indices', 'values']), input = native.decode(raw.input), splitting = split.decode(raw.splitting), quotient = raw.quotient === null ? null : algebraicConstantQuotientCodec(s, source, splitting.target).decode(raw.quotient);
    const curve = quotient === null ? source as unknown as AlgebraicCurveView<unknown> : reconstructConstantBaseChangedCurveWithin(ctx, quotient.change, bounds) as unknown as AlgebraicCurveView<unknown>;
    if (quotient === null) demand(raw.residues === null, 'invalid-input', 'identity residue coverage uses the complete original evidence');
    const residues = quotient === null ? original as unknown as T : activeCodec(curve).decode(raw.residues), indices = w.list(ctx, w.integer(ctx, -1)).decode(raw.indices), values = w.list(ctx, algebraicCoefficientCodec(ctx, splitting.target, bounds)).decode(raw.values);
    const proof = Object.freeze({source, input, original, splitting, quotient, curve, residues, indices, values}); verify(proof); return proof;
  }});
}
export function algebraicResidueRelationsDataCodec<E, S extends AlgebraicResidueSplittingData<E>>(s: AlgebraicDivisorWireContext, original: object, splitting: w.EvidenceCodec<S>, verify: (proof: AlgebraicResidueRelationsData<E, S>) => void): w.EvidenceCodec<AlgebraicResidueRelationsData<E, S>> {
  const {ctx, bounds} = s;
  const parts = (p: S) => w.structure(ctx, {system: linearSystemCodec(ctx, w.scalar(ctx)), elimination: linearEvidenceCodec(ctx, w.scalar(ctx)), basisIndices: w.list(ctx, w.integer(ctx)),
    basis: w.list(ctx, algebraicCoefficientCodec(ctx, p.splitting.target, bounds)), coordinateEliminations: w.list(ctx, linearEvidenceCodec(ctx, w.scalar(ctx))), coordinates: w.list(ctx, w.list(ctx, w.scalar(ctx))), denominator: s.integer(), divisors: w.list(ctx, algebraicDivisorCodec(s, p.curve))});
  return s.memo('algebraic-residue-relations', original, {encode(p) { return Object.freeze({splitting: splitting.encode(p.splitting), evidence: parts(p.splitting).encode(p)}); }, decode(v) {
    const raw = w.record(ctx, v, ['splitting', 'evidence']), split = splitting.decode(raw.splitting), proof = Object.freeze({splitting: split, ...parts(split).decode(raw.evidence)}); verify(proof); return proof;
  }});
}

export function algebraicResidueSplittingCodec<E>(s: AlgebraicDivisorWireContext, source: AlgebraicCurveView<E>, original: AlgebraicDifferentialResidues<E>): w.EvidenceCodec<AlgebraicResidueSplitting<E>> {
  return algebraicResidueSplittingDataCodec(s, source, original, curve => algebraicDifferentialResiduesCodec(s, curve), proof => verifyAlgebraicResidueSplittingWithin(s.ctx, source, original.input, original, proof, s.bounds));
}
export function algebraicResidueRelationsCodec<E>(s: AlgebraicDivisorWireContext, source: AlgebraicCurveView<E>, original: AlgebraicDifferentialResidues<E>): w.EvidenceCodec<AlgebraicResidueRelations<E>> {
  return algebraicResidueRelationsDataCodec(s, original, algebraicResidueSplittingCodec(s, source, original), proof => verifyAlgebraicResidueRelationsWithin(s.ctx, proof.splitting, proof, s.bounds));
}
