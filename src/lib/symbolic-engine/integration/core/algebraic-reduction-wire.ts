import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { PolynomialRing } from './polynomial';
import { verifyAlgebraicCurveWithin, type AlgebraicCurveView } from './algebraic-curve';
import { AlgebraicDivisorWireContext } from './algebraic-divisor-wire-context';
import { algebraicCoefficientCodec, algebraicConditionsCodec, algebraicDerivativeCodec } from './algebraic-wire';
import { algebraicDifferentialCodec } from './algebraic-differential-wire';
import { algebraicDivisorCodec, algebraicRiemannRochCodec } from './algebraic-divisor-wire';
import { algebraicPlaceCodec, algebraicValuationCodec } from './algebraic-place-wire';
import { algebraicLocalExpansionCodec } from './algebraic-geometry-wire';
import { linearSystemCodec, linearEvidenceCodec } from './linear-wire';
import { encodeAlgebraicArithmeticArtifact, decodeAlgebraicArithmeticArtifact } from './algebraic-arithmetic-wire';
import { verifyAlgebraicHermiteWithin, type AlgebraicHermite } from './algebraic-hermite';
import { verifyAlgebraicInfinityReductionWithin, type AlgebraicInfinityReduction } from './algebraic-infinity-reduction';
import { verifyAlgebraicDifferentialResiduesWithin, type AlgebraicDifferentialResidues } from './algebraic-differential-residues';
import { verifyAlgebraicDifferentialReductionWithin, type AlgebraicDifferentialReduction } from './algebraic-differential-reduction';
import type { ConstantMinimalPolynomial } from './constant-minimal-polynomial';
import type { ExactField } from './field';
import type { CurveConstant } from './algebraic-curve-coordinates';
import type { Polynomial } from './polynomial';
import * as w from './decision-wire-algebra';

function residuePolynomialCodec(s: AlgebraicDivisorWireContext, ring: PolynomialRing<CurveConstant>): w.EvidenceCodec<Polynomial<CurveConstant>> {
  const p = w.polynomial(s.ctx, ring, algebraicCoefficientCodec(s.ctx, ring.domain, s.bounds));
  return {encode(v) { v.ring.assert(s.ctx, v); demand(v.ring.domain === ring.domain && v.ring.variable === ring.variable, 'domain-mismatch', 'residue polynomial checked coefficient binding'); return p.encode(ring.make(s.ctx, v.coefficients)); }, decode: p.decode};
}
function denominatorCodec(s: AlgebraicDivisorWireContext, ring: PolynomialRing<CurveConstant>) {
  const p = residuePolynomialCodec(s, ring);
  return w.structure(s.ctx, {input: w.list(s.ctx, p), steps: w.list(s.ctx, w.structure(s.ctx, {gcd: w.bezout(s.ctx, p), left: p, right: p, next: p})), common: p});
}
export function algebraicHermiteCodec<E>(s: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<AlgebraicHermite<E>> {
  const {ctx, bounds} = s, native = algebraicCoefficientCodec(ctx, curve.owner, bounds), constant = algebraicCoefficientCodec(ctx, curve.coordinates.constantOwner, bounds), f = curve.finite.lattice.scalar;
  const p = w.polynomial(ctx, f.ring, constant), derivative = algebraicDerivativeCodec(ctx, curve.owner, bounds), b = w.bezout(ctx, p), matrix = w.list(ctx, w.list(ctx, p));
  const connection = w.structure(ctx, {basis: w.list(ctx, native), derivatives: w.list(ctx, derivative), coordinates: w.list(ctx, w.list(ctx, s.scalar(f))), denominators: s.denominators(f), squareFree: b, matrix});
  const squareFree = w.structure(ctx, {scalar: constant, components: w.list(ctx, w.structure(ctx, {polynomial: p, multiplicity: s.integer(), derivative: b, previous: w.list(ctx, b)}))});
  const step = w.structure(ctx, {squareFree, selected: w.integer(ctx), u: p, v: p, ell: s.integer(), coprime: b, system: linearSystemCodec(ctx, constant), elimination: linearEvidenceCodec(ctx, constant),
    coefficients: w.list(ctx, p), correction: native, derivative, nextNumerators: w.list(ctx, p), nextDenominator: p});
  const parts = w.structure(ctx, {input: native, connection, coordinates: w.list(ctx, s.scalar(f)), denominators: s.denominators(f), numerators: w.list(ctx, p), steps: w.list(ctx, step),
    finalSquareFree: b, fieldPart: native, derivative, remainder: native, conditions: algebraicConditionsCodec(ctx, curve.owner, bounds)});
  return s.memo('algebraic-hermite', curve, {encode: parts.encode, decode(v) { const result = parts.decode(v); verifyAlgebraicHermiteWithin(ctx, curve, result.input, result, bounds); return result; }});
}
export function algebraicInfinityReductionCodec<E>(s: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<AlgebraicInfinityReduction<E>> {
  const {ctx, bounds} = s, native = algebraicCoefficientCodec(ctx, curve.owner, bounds), constant = algebraicCoefficientCodec(ctx, curve.coordinates.constantOwner, bounds), derivative = algebraicDerivativeCodec(ctx, curve.owner, bounds);
  const parameter = w.structure(ctx, {index: w.integer(ctx), value: native, valuation: algebraicValuationCodec(s, curve)});
  const block = w.structure(ctx, {place: algebraicPlaceCodec(s, curve), poleOrder: s.integer(), parameter, parameterDerivative: derivative, expansions: w.list(ctx, algebraicLocalExpansionCodec(s, curve))});
  const common = {input: native, differential: algebraicDifferentialCodec(s, curve), bound: algebraicDivisorCodec(s, curve), space: algebraicRiemannRochCodec(s, curve), derivatives: w.list(ctx, derivative),
    blocks: w.list(ctx, block), system: linearSystemCodec(ctx, constant), elimination: linearEvidenceCodec(ctx, constant), conditions: algebraicConditionsCodec(ctx, curve.owner, bounds)};
  const no = w.structure(ctx, {...common, kind: w.literal(ctx, 'no-simple-pole-reduction')}), yes = w.structure(ctx, {...common, kind: w.literal(ctx, 'reduced'), primitive: native,
    coordinates: w.list(ctx, constant), constantCoordinates: w.list(ctx, constant), projectionIndex: w.integer(ctx), derivative, remainder: native, remainderDifferential: algebraicDifferentialCodec(s, curve)});
  return s.memo('algebraic-infinity-reduction', curve, {encode(v) { return v.kind === 'reduced' ? yes.encode(v) : no.encode(v); }, decode(v) {
    demand(v !== null && typeof v === 'object', 'invalid-input', 'infinity reduction discriminator'); const kind = Object.getOwnPropertyDescriptor(v, 'kind');
    demand(kind !== undefined && 'value' in kind && (kind.value === 'reduced' || kind.value === 'no-simple-pole-reduction'), 'invalid-input', 'infinity reduction outcome');
    const p = kind.value === 'reduced' ? yes.decode(v) : no.decode(v); verifyAlgebraicInfinityReductionWithin(ctx, curve, p.input, p, bounds); return p;
  }});
}
function minimalCodec<E>(s: AlgebraicDivisorWireContext, owner: ExactField<E>, ring: PolynomialRing<CurveConstant>): w.EvidenceCodec<ConstantMinimalPolynomial<E>> {
  const c = algebraicCoefficientCodec(s.ctx, owner, s.bounds);
  return w.structure(s.ctx, {input: c, powers: w.list(s.ctx, c), eliminations: w.list(s.ctx, linearEvidenceCodec(s.ctx, w.scalar(s.ctx))), polynomial: residuePolynomialCodec(s, ring)});
}
export function algebraicDifferentialResiduesCodec<E>(s: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<AlgebraicDifferentialResidues<E>> {
  const {ctx, bounds} = s, native = algebraicCoefficientCodec(ctx, curve.owner, bounds), constant = algebraicCoefficientCodec(ctx, curve.coordinates.constantOwner, bounds), ring = new PolynomialRing(curve.coordinates.constantOwner, 'residue'), p = residuePolynomialCodec(s, ring);
  const at = algebraicPlaceCodec(s, curve), entry = (place: ReturnType<typeof at.decode>) => w.structure(ctx, {order: w.optional(s.integer()), value: algebraicCoefficientCodec(ctx, place.residue, bounds),
    parameter: w.optional(w.structure(ctx, {index: w.integer(ctx), value: native, valuation: algebraicValuationCodec(s, curve)})), derivative: w.optional(algebraicDerivativeCodec(ctx, curve.owner, bounds)),
    expansion: w.optional(algebraicLocalExpansionCodec(s, curve)), minimal: w.optional(minimalCodec(s, place.residue, ring))});
  const residue = {encode(v: AlgebraicDifferentialResidues<E>['entries'][number]) { return Object.freeze({place: at.encode(v.place), evidence: entry(v.place).encode(v)}); }, decode(v: unknown) {
    const raw = w.record(ctx, v, ['place', 'evidence']), place = at.decode(raw.place); return Object.freeze({place, ...entry(place).decode(raw.evidence)});
  }};
  const common = w.structure(ctx, {input: native, differential: algebraicDifferentialCodec(s, curve), entries: w.list(ctx, residue), polynomials: w.list(ctx, p), lcm: denominatorCodec(s, ring), squareFree: w.bezout(ctx, p), totalResidue: constant});
  return s.memo('algebraic-differential-residues', curve, {encode: common.encode, decode(v) { const proof = common.decode(v); verifyAlgebraicDifferentialResiduesWithin(ctx, curve, proof.input, proof, bounds); return proof; }});
}
export function algebraicDifferentialReductionCodec<E>(s: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<AlgebraicDifferentialReduction<E>> {
  const {ctx, bounds} = s, native = algebraicCoefficientCodec(ctx, curve.owner, bounds), common = {input: native, hermite: algebraicHermiteCodec(s, curve), infinity: algebraicInfinityReductionCodec(s, curve), conditions: algebraicConditionsCodec(ctx, curve.owner, bounds)};
  const empty: w.EvidenceCodec<null> = {encode(v) { ctx.tick(); demand(v === null, 'invalid-input', 'unperformed residue stage'); return null; }, decode(v) { ctx.tick(); demand(v === null, 'invalid-input', 'unperformed residue stage'); return null; }};
  const no = w.structure(ctx, {...common, kind: w.literal(ctx, 'infinity-unsolved'), residues: empty}), yes = w.structure(ctx, {...common, kind: w.literal(ctx, 'simple-poles'), fieldPart: native,
    derivative: algebraicDerivativeCodec(ctx, curve.owner, bounds), remainder: native, residues: algebraicDifferentialResiduesCodec(s, curve)});
  return s.memo('algebraic-differential-reduction', curve, {encode(v) { return v.kind === 'simple-poles' ? yes.encode(v) : no.encode(v); }, decode(v) {
    demand(v !== null && typeof v === 'object', 'invalid-input', 'differential reduction discriminator'); const kind = Object.getOwnPropertyDescriptor(v, 'kind');
    demand(kind !== undefined && 'value' in kind && (kind.value === 'simple-poles' || kind.value === 'infinity-unsolved'), 'invalid-input', 'differential reduction outcome');
    const p = kind.value === 'simple-poles' ? yes.decode(v) : no.decode(v); verifyAlgebraicDifferentialReductionWithin(ctx, curve, p.input, p, bounds); return p;
  }});
}
export function encodeAlgebraicDifferentialReduction<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicDifferentialReduction<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => { demand(proof.arithmetic !== undefined, 'verification-failed', 'differential reduction arithmetic coverage');
    return encodeAlgebraicArithmeticArtifact(ctx, curve, proof, 'algebraic-differential-reduction', bounds, proof.arithmetic,
      () => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicDifferentialReductionWithin(ctx, curve, input, proof, bounds); }, s => algebraicDifferentialReductionCodec(s, curve)); });
}
export function decodeAlgebraicDifferentialReduction<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, data: unknown, bounds: DifferentialBounds): AlgebraicDifferentialReduction<E> {
  return ctx.operation(() => { const d = decodeAlgebraicArithmeticArtifact(ctx, curve, data, 'algebraic-differential-reduction', bounds, s => algebraicDifferentialReductionCodec(s, curve));
    demand(curve.owner.equal(ctx, input, d.value.input), 'domain-mismatch', 'differential reduction artifact explicit input'); return Object.freeze({...d.value, arithmetic: d.arithmetic}); });
}
