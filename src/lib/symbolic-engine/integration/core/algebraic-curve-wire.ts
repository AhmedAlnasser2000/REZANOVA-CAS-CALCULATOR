import { demand, type ExecutionContext } from './execution';
import type { ExactField } from './field';
import type { DifferentialBounds } from './differential-field';
import type { RationalFunctionField } from './rational-function';
import type { Rational } from './rational';
import { inspectExactArtifact } from './artifact-bounds';
import { packRecursiveArtifactGraph, unpackRecursiveArtifactGraph } from './recursive-artifact-graph';
import { algebraicCoefficientCodec, algebraicConstructionCodec, encodeAlgebraicSnapshot, verifyAlgebraicSnapshot } from './algebraic-wire';
import { algebraicConstantFieldCodec } from './algebraic-constant-wire';
import { verifyAlgebraicConstantFieldWithin, type AlgebraicConstantField } from './algebraic-constant-field';
import { matrixInverseCodec } from './algebraic-module-wire';
import { AlgebraicDivisorWireContext } from './algebraic-divisor-wire-context';
import { reconstructAlgebraicCurveWithin, reconstructConstantBaseChangedCurveWithin, verifyAlgebraicCurveWithin, type AlgebraicCurveView } from './algebraic-curve';
import { reconstructAlgebraicConstantBaseChangeWithin } from './algebraic-curve-base-change';
import { verifyAlgebraicConstructionWithin } from './algebraic-field';
import * as w from './decision-wire-algebra';

function bindConstants<E>(ctx: ExecutionContext, owner: ExactField<E>, expected: AlgebraicConstantField<E>, decoded: AlgebraicConstantField<E>, bounds: DifferentialBounds): AlgebraicConstantField<E> {
  verifyAlgebraicConstantFieldWithin(ctx, owner, decoded, bounds);
  const c = expected.numberField, r = c.ring;
  demand(owner.equal(ctx, expected.primitive, decoded.primitive) && owner.equal(ctx, expected.presentation.primitive, decoded.presentation.primitive)
    && r.equal(ctx, r.make(ctx, decoded.numberField.modulus.coefficients), c.modulus), 'domain-mismatch', 'complete expected curve constants/presentation');
  const parentCoordinates = Object.freeze(decoded.parentCoordinates.map(value => c.make(ctx, r.make(ctx, value.representative.coefficients))));
  const result = Object.freeze({...decoded, numberField: c, parentCoordinates}); verifyAlgebraicConstantFieldWithin(ctx, owner, result, bounds); return result;
}

/** Expected native owners are supplied explicitly. All auxiliary evidence is
 * replayed fresh; a constant binding requires exact primitive and relation
 * correspondence, never names or equal derivatives. */
export function algebraicCurveEvidenceCodec<E>(state: AlgebraicDivisorWireContext, expected: AlgebraicCurveView<E>): w.EvidenceCodec<AlgebraicCurveView<E>> {
  const {ctx, bounds} = state;
  if (expected.authority.kind === 'native') {
    const target = expected.authority.evidence.coordinates.constants, native = algebraicCoefficientCodec(ctx, expected.owner, bounds);
    return state.memo('native-curve', expected, {
      encode(v) {
        demand(v.authority.kind === 'native' && v.owner === expected.owner, 'domain-mismatch', 'native curve codec');
        const proof = v.authority.evidence, base = proof.coordinates.constants.presentation.auxiliary.parent as RationalFunctionField<Rational>;
        const parts = w.structure(ctx, {basis: w.list(ctx, native), expanded: w.list(ctx, native), inverse: matrixInverseCodec(ctx, w.fraction(ctx, base, w.scalar(ctx))),
          relation: w.polynomial(ctx, v.coordinates.relationRing, state.scalar(v.coordinates.scalar)), finite: state.order(v.finite.lattice.scalar, false), infinity: state.order(v.infinity.lattice.scalar, true)});
        return Object.freeze({kind: 'native', construction: encodeAlgebraicSnapshot(ctx, expected.owner, bounds), constants: algebraicConstantFieldCodec(ctx, expected.owner, bounds).encode(proof.coordinates.constants), evidence: parts.encode({...proof.coordinates, finite: proof.finite, infinity: proof.infinity})});
      },
      decode(v) {
        const raw = w.record(ctx, v, ['kind', 'construction', 'constants', 'evidence']); demand(raw.kind === 'native', 'domain-mismatch', 'expected native curve authority');
        verifyAlgebraicSnapshot(ctx, expected.owner, raw.construction, bounds);
        const decoded = algebraicConstantFieldCodec(ctx, expected.owner, bounds).decode(raw.constants), constants = bindConstants(ctx, expected.owner, target, decoded, bounds);
        const base = constants.presentation.auxiliary.parent as RationalFunctionField<Rational>;
        const parts = w.structure(ctx, {basis: w.list(ctx, native), expanded: w.list(ctx, native), inverse: matrixInverseCodec(ctx, w.fraction(ctx, base, w.scalar(ctx))),
          relation: w.polynomial(ctx, expected.coordinates.relationRing, state.scalar(expected.coordinates.scalar)), finite: state.order(expected.finite.lattice.scalar, false), infinity: state.order(expected.infinity.lattice.scalar, true)}).decode(raw.evidence);
        const coordinates = Object.freeze({constants, basis: parts.basis, expanded: parts.expanded, inverse: parts.inverse, relation: parts.relation});
        return reconstructAlgebraicCurveWithin(ctx, expected.owner, {coordinates, finite: parts.finite, infinity: parts.infinity}, expected.coordinates.scalar, expected.coordinates.relationRing, bounds);
      },
    });
  }
  const target = expected.authority.evidence, constant = algebraicCoefficientCodec(ctx, target.constants, bounds), native = algebraicCoefficientCodec(ctx, target.field, bounds);
  const parts = w.structure(ctx, {originalImages: w.list(ctx, native), basisImages: w.list(ctx, native), finite: state.order(expected.finite.lattice.scalar, false), infinity: state.order(expected.infinity.lattice.scalar, true)});
  return state.memo('base-changed-curve', expected, {
    encode(v) {
      demand(v.authority.kind === 'constant-base-change', 'domain-mismatch', 'base-change curve codec'); const proof = v.authority.evidence;
      return Object.freeze({kind: 'constant-base-change', source: algebraicCurveEvidenceCodec(state, target.source).encode(proof.source), constants: encodeAlgebraicSnapshot(ctx, proof.constants, bounds),
        image: constant.encode(proof.embedding.map(ctx, proof.source.coordinates.constantOwner.generator(ctx))), lift: algebraicConstructionCodec(ctx, proof.lift.ring, bounds).encode(proof.lift.construction),
        construction: encodeAlgebraicSnapshot(ctx, proof.field, bounds), evidence: parts.encode(proof)});
    },
    decode(v) {
      const raw = w.record(ctx, v, ['kind', 'source', 'constants', 'image', 'lift', 'construction', 'evidence']);
      demand(raw.kind === 'constant-base-change', 'domain-mismatch', 'expected finite constant base change');
      algebraicCurveEvidenceCodec(state, target.source).decode(raw.source);
      verifyAlgebraicSnapshot(ctx, target.constants, raw.constants, bounds);
      demand(target.constants.equal(ctx, constant.decode(raw.image), target.embedding.map(ctx, target.source.coordinates.constantOwner.generator(ctx))),
        'domain-mismatch', 'complete expected constant embedding image');
      const lift = algebraicConstructionCodec(ctx, target.lift.ring, bounds).decode(raw.lift);
      verifyAlgebraicConstructionWithin(ctx, target.lift.ring, target.lift.construction.relation, lift, bounds);
      verifyAlgebraicSnapshot(ctx, target.field, raw.construction, bounds); const evidence = parts.decode(raw.evidence);
      const proof = reconstructAlgebraicConstantBaseChangeWithin(ctx, target.source, target.constants, target.embedding, target.lift, target.field, expected.coordinates.scalar,
        evidence.originalImages, evidence.basisImages, evidence.finite, evidence.infinity, bounds);
      return reconstructConstantBaseChangedCurveWithin(ctx, proof, bounds) as unknown as AlgebraicCurveView<E>;
    },
  });
}
export function encodeAlgebraicCurve<E>(ctx: ExecutionContext, view: AlgebraicCurveView<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    verifyAlgebraicCurveWithin(ctx, view.owner, view, bounds); const state = new AlgebraicDivisorWireContext(ctx, bounds);
    const payload = packRecursiveArtifactGraph(ctx, algebraicCurveEvidenceCodec(state, view).encode(view), bounds);
    const data = Object.freeze({tag: 'algebraic-curve', version: 1, payload}); inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeAlgebraicCurve<E>(ctx: ExecutionContext, expected: AlgebraicCurveView<E>, data: unknown, bounds: DifferentialBounds): AlgebraicCurveView<E> {
  return ctx.operation(() => {
    inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']);
    demand(raw.tag === 'algebraic-curve' && raw.version === 1, 'invalid-input', 'curve artifact tag/version');
    verifyAlgebraicCurveWithin(ctx, expected.owner, expected, bounds); const state = new AlgebraicDivisorWireContext(ctx, bounds);
    const view = algebraicCurveEvidenceCodec(state, expected).decode(unpackRecursiveArtifactGraph(ctx, raw.payload, bounds));
    verifyAlgebraicCurveWithin(ctx, expected.owner, view, bounds); return view;
  });
}
