import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {verifyAlgebraicCurveWithin, type AlgebraicCurveView} from './algebraic-curve';
import {certifyAlgebraicDifferentialWithin, verifyAlgebraicDifferentialWithin, type AlgebraicDifferential} from './algebraic-differential';
import {equalAlgebraicPlaces, type AlgebraicPlace} from './algebraic-place';
import {constructAlgebraicResidueDataWithin, verifyAlgebraicResidueDataWithin, verifyAlgebraicLocalResidueWithin, type AlgebraicResidueData, type AlgebraicDifferentialResidue} from './algebraic-residue-data';
import {recordRationalGcdEvidence, replayRationalGcdEvidence, type RationalGcdEvidence} from './rational-gcd-evidence';
export type {AlgebraicDifferentialResidue} from './algebraic-residue-data';
export interface AlgebraicDifferentialResidues<E> extends AlgebraicResidueData<E, AlgebraicDifferentialResidue<E>> {
  readonly arithmetic?: RationalGcdEvidence;
  readonly differential: AlgebraicDifferential<E>;
}
function candidates<E>(ctx: ExecutionContext, proof: AlgebraicDifferential<E>) {
  const curve = proof.geometry.infinity.curve, all = [...(proof.principal?.finite.flatMap(p => p.places) ?? []), ...proof.geometry.finite.flatMap(p => p.places), ...proof.geometry.infinity.places], out: AlgebraicPlace<E>[] = [];
  ctx.allocate(all.length); for (const p of all) if (!out.some(q => equalAlgebraicPlaces(ctx, curve, p, q))) out.push(p); return out;
}
function order<E>(ctx: ExecutionContext, proof: AlgebraicDifferential<E>, place: AlgebraicPlace<E>) {
  if (proof.divisor === null) return null; return proof.divisor.entries.find(e => equalAlgebraicPlaces(ctx, place.curve, e.place, place))?.coefficient ?? 0n;
}
function sites<E>(ctx: ExecutionContext, differential: AlgebraicDifferential<E>) {
  const all = candidates(ctx, differential); ctx.allocate(all.length); return all.map(place => ({place, order: order(ctx, differential, place)}));
}
export function verifyAlgebraicDifferentialResiduesWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicDifferentialResidues<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicDifferentialWithin(ctx, curve, input, proof.differential, bounds);
  demand((proof.differential.divisor?.entries ?? []).every(e => e.coefficient >= -1n), 'invalid-input', 'residue extraction requires complete simple-pole reduction');
  verifyAlgebraicResidueDataWithin(ctx, curve, input, sites(ctx, proof.differential), proof, bounds, entry => verifyAlgebraicLocalResidueWithin(ctx, curve, input, entry, bounds));
}
export function algebraicDifferentialResiduesWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds): AlgebraicDifferentialResidues<E> {
  const differential = certifyAlgebraicDifferentialWithin(ctx, curve, input, bounds);
  demand((differential.divisor?.entries ?? []).every(e => e.coefficient >= -1n), 'invalid-input', 'residue extraction requires simple poles');
  const data = constructAlgebraicResidueDataWithin(ctx, curve, input, sites(ctx, differential), bounds), proof = Object.freeze({...data, differential});
  verifyAlgebraicDifferentialResiduesWithin(ctx, curve, input, proof, bounds); return proof;
}
export function algebraicDifferentialResidues<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds) {
  return ctx.operation(() => { const recorded = recordRationalGcdEvidence(ctx, () => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); return algebraicDifferentialResiduesWithin(ctx, curve, input, bounds); }); return Object.freeze({...recorded.value, arithmetic: recorded.evidence}); });
}
export function verifyAlgebraicDifferentialResidues<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: E, proof: AlgebraicDifferentialResidues<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => { demand(proof.arithmetic !== undefined, 'verification-failed', 'residue arithmetic coverage'); replayRationalGcdEvidence(ctx, proof.arithmetic, () => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicDifferentialResiduesWithin(ctx, curve, input, proof, bounds); }); });
}
