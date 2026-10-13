import { it, expect, vi } from 'vitest';
import { base, fresh, bounds } from './__tests__/algebraic-support';
import { certifyAlgebraicConstantField } from './algebraic-constant-field';
import { certifyAlgebraicCurve } from './algebraic-curve';
import { algebraicDifferentialResidues } from './algebraic-differential-residues';
import { splitAlgebraicResiduesWithin, verifyAlgebraicResidueSplittingWithin } from './algebraic-residue-splitting';
import { combineAlgebraicResiduesWithin, verifyAlgebraicResidueRelationsWithin } from './algebraic-residue-relations';
import { recordRationalGcdEvidence, replayRationalGcdEvidence } from './rational-gcd-evidence';
import * as linear from './linear-system';
import * as splitProducer from './number-field-splitting';
import * as residuesProducer from './algebraic-differential-residues';
import * as baseChange from './algebraic-curve-base-change';
import { rationalField as Q } from './field';

function fixture(complex = false) {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), input = complex ? b.field.inverse(b.ctx, b.field.add(b.ctx, b.field.multiply(b.ctx, b.x, b.x), b.field.fromInteger(b.ctx, 1n))) : b.field.inverse(b.ctx, b.x), original = algebraicDifferentialResidues(fresh(), curve, input, bounds), c = fresh();
  const p = c.operation(() => recordRationalGcdEvidence(c, () => { const split = splitAlgebraicResiduesWithin(c, curve, input, original, bounds), relations = combineAlgebraicResiduesWithin(c, split, bounds); return {split, relations}; }, original.arithmetic));
  return {...b, curve, input, original, ...p.value, arithmetic: p.evidence};
}
it('keeps the original curve for residues already in its actual constants', () => {
  const b = fixture(); expect(b.split.quotient).toBeNull(); expect(b.split.curve).toBe(b.curve); expect(b.relations.basis.length).toBe(1); expect(b.relations.denominator).toBe(1n);
  expect(b.relations.divisors[0].degree).toBe(0n); expect(b.relations.divisors[0].entries.length).toBe(2);
});
it('constructs only the required splitting constants and descends every nonrational residue', () => {
  const b = fixture(true); expect(b.split.quotient).not.toBeNull(); expect(b.split.splitting.target.ring.degree(b.ctx, b.split.splitting.target.modulus)).toBe(2); expect(b.relations.basis.length).toBe(1);
  const poles = b.split.residues.entries.filter(e => e.order === -1n); expect(poles.length).toBe(2); expect(poles.every(e => e.place.degree === 1n)).toBe(true);
  expect(b.relations.divisors[0].degree).toBe(0n);
});
it('replays full splitting, descent and rational-span evidence with producers disabled', () => {
  const b = fixture(true), spies = [vi.spyOn(linear, 'solveLinearSystem'), vi.spyOn(splitProducer, 'splitNumberFieldPolynomialWithin'), vi.spyOn(residuesProducer, 'algebraicDifferentialResiduesWithin'), vi.spyOn(baseChange, 'baseChangeAlgebraicCurveWithin')];
  for (const s of spies) s.mockImplementation(() => { throw Error('producer disabled'); });
  try { const c = fresh(); c.operation(() => replayRationalGcdEvidence(c, b.arithmetic, () => { verifyAlgebraicResidueSplittingWithin(c, b.curve, b.input, b.original, b.split, bounds); verifyAlgebraicResidueRelationsWithin(c, b.split, b.relations, bounds); })); }
  finally { for (const s of spies) s.mockRestore(); }
});
it('rejects changed roots, omitted residue coordinates, rank and denominator mutations', () => {
  const b = fixture(), verify = (proof: typeof b.relations) => { const c = fresh(); c.operation(() => replayRationalGcdEvidence(c, b.arithmetic, () => verifyAlgebraicResidueRelationsWithin(c, b.split, proof, bounds))); };
  expect(() => verify({...b.relations, coordinates: []})).toThrow('verification-failed'); expect(() => verify({...b.relations, denominator: 2n})).toThrow('verification-failed');
  expect(() => verify({...b.relations, basisIndices: []})).toThrow('verification-failed'); expect(() => verify({...b.relations, coordinates: b.relations.coordinates.map(row => row.map(() => Q.fromInteger(b.ctx, 0n)))})).toThrow('verification-failed');
  const c = fresh(); expect(() => c.operation(() => replayRationalGcdEvidence(c, b.arithmetic, () => verifyAlgebraicResidueSplittingWithin(c, b.curve, b.input, b.original, {...b.split, indices: b.split.indices.map(() => -1)}, bounds)))).toThrow('verification-failed');
});
