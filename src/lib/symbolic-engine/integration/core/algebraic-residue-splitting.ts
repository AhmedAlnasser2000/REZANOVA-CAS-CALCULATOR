import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { verifyAlgebraicCurveWithin, reconstructConstantBaseChangedCurveWithin, type AlgebraicCurveView } from './algebraic-curve';
import { algebraicDifferentialResiduesWithin, verifyAlgebraicDifferentialResiduesWithin, type AlgebraicDifferentialResidues } from './algebraic-differential-residues';
import { splitNumberFieldPolynomialWithin, verifyNumberFieldSplittingWithin, type NumberFieldSplitting } from './number-field-splitting';
import { constructRelativeNumberFieldWithin, type NumberValue } from './relative-number-field';
import { baseChangeAlgebraicCurveWithin } from './algebraic-curve-base-change';
import { reconstructAlgebraicConstantQuotientWithin, verifyAlgebraicConstantQuotientWithin, mapAlgebraicConstantBaseChangeValue, type AlgebraicConstantQuotient } from './algebraic-constant-quotient';
import { AlgebraicEmbedding } from './algebraic-embedding';

/** The active view is either the original owner or an explicitly proved finite
 * constant base change. Type erasure does not add arithmetic capabilities. */
export interface AlgebraicResidueSplitting<E> {
  readonly source: AlgebraicCurveView<E>;
  readonly input: E;
  readonly original: AlgebraicDifferentialResidues<E>;
  readonly splitting: NumberFieldSplitting;
  readonly quotient: AlgebraicConstantQuotient<E> | null;
  readonly curve: AlgebraicCurveView<unknown>;
  readonly residues: AlgebraicDifferentialResidues<unknown>;
  readonly indices: readonly number[];
  readonly values: readonly NumberValue[];
}
export function verifyAlgebraicResidueSplittingWithin<E>(ctx: ExecutionContext, source: AlgebraicCurveView<E>, input: E, original: AlgebraicDifferentialResidues<E>, proof: AlgebraicResidueSplitting<E>, bounds: DifferentialBounds): void {
  demand(proof.source === source && proof.original === original && source.owner.equal(ctx, proof.input, input), 'domain-mismatch', 'residue splitting complete original request');
  verifyAlgebraicDifferentialResiduesWithin(ctx, source, input, original, bounds);
  verifyNumberFieldSplittingWithin(ctx, original.lcm.common.ring, original.lcm.common, proof.splitting, bounds);
  const constants = proof.splitting.target; let expected: unknown;
  if (proof.quotient === null) {
    demand(constants === source.coordinates.constantOwner && proof.curve === source as unknown as AlgebraicCurveView<unknown> && proof.residues === original as unknown as AlgebraicDifferentialResidues<unknown>, 'verification-failed', 'identity residue splitting preserves original owner and coverage'); expected = input;
  } else {
    const q = proof.quotient; demand(constants !== source.coordinates.constantOwner && q.curve === source && q.relative.target === constants
      && constants.equal(ctx, q.relative.embedding.map(ctx, source.coordinates.constantOwner.generator(ctx)), proof.splitting.embedding.map(ctx, source.coordinates.constantOwner.generator(ctx))), 'domain-mismatch', 'residue splitting exact constant embedding');
    verifyAlgebraicConstantQuotientWithin(ctx, q, bounds);
    demand(proof.curve.authority.kind === 'constant-base-change' && proof.curve.authority.evidence === q.change && proof.curve.owner === q.change.field, 'domain-mismatch', 'residue splitting base-changed curve authority');
    expected = mapAlgebraicConstantBaseChangeValue(ctx, q, input);
  }
  verifyAlgebraicCurveWithin(ctx, proof.curve.owner, proof.curve, bounds); verifyAlgebraicDifferentialResiduesWithin(ctx, proof.curve, expected, proof.residues, bounds);
  demand(proof.curve.coordinates.constantOwner === constants && proof.indices.length === proof.residues.entries.length && proof.values.length === proof.indices.length, 'verification-failed', 'split residues complete actual-constant coordinate coverage');
  for (let i = 0; i < proof.indices.length; i++) {
    const entry = proof.residues.entries[i], index = proof.indices[i], value = proof.values[i]; constants.assert(ctx, value);
    if (entry.place.residue.isZero(ctx, entry.value)) demand(index === -1 && constants.isZero(ctx, value), 'verification-failed', 'split residue explicit zero');
    else {
      demand(Number.isSafeInteger(index) && index >= 0 && index < proof.splitting.roots.length && constants.equal(ctx, value, proof.splitting.roots[index]), 'verification-failed', 'split residue exact root selection');
      const embedding = AlgebraicEmbedding.ancestor(ctx, constants, entry.place.residue, bounds);
      demand(entry.place.residue.equal(ctx, entry.value, embedding.map(ctx, value)), 'verification-failed', 'split residue exact descent rather than a horizontal lift');
    }
  }
}
export function splitAlgebraicResiduesWithin<E>(ctx: ExecutionContext, source: AlgebraicCurveView<E>, input: E, original: AlgebraicDifferentialResidues<E>, bounds: DifferentialBounds): AlgebraicResidueSplitting<E> {
  verifyAlgebraicDifferentialResiduesWithin(ctx, source, input, original, bounds); const ring = original.lcm.common.ring, splitting = splitNumberFieldPolynomialWithin(ctx, ring, original.lcm.common, bounds);
  let quotient: AlgebraicConstantQuotient<E> | null = null, curve = source as unknown as AlgebraicCurveView<unknown>, residues = original as unknown as AlgebraicDifferentialResidues<unknown>;
  if (splitting.target !== source.coordinates.constantOwner) {
    const relative = constructRelativeNumberFieldWithin(ctx, source.coordinates.constantOwner, splitting.target, splitting.embedding, bounds), change = baseChangeAlgebraicCurveWithin(ctx, source, splitting.target, splitting.embedding, bounds);
    quotient = reconstructAlgebraicConstantQuotientWithin(ctx, source, change, relative, bounds); curve = reconstructConstantBaseChangedCurveWithin(ctx, change, bounds) as unknown as AlgebraicCurveView<unknown>;
    residues = algebraicDifferentialResiduesWithin(ctx, curve, mapAlgebraicConstantBaseChangeValue(ctx, quotient, input), bounds);
  }
  const constants = splitting.target; ctx.allocate(residues.entries.length * 2);
  const indices = Object.freeze(residues.entries.map(entry => {
    if (entry.place.residue.isZero(ctx, entry.value)) return -1; const embedding = AlgebraicEmbedding.ancestor(ctx, constants, entry.place.residue, bounds), index = splitting.roots.findIndex(root => entry.place.residue.equal(ctx, entry.value, embedding.map(ctx, root)));
    demand(index >= 0, 'verification-failed', 'complete split residue does not descend to its splitting constants'); return index;
  })), values = Object.freeze(indices.map(i => i < 0 ? constants.fromInteger(ctx, 0n) : splitting.roots[i]));
  const proof = Object.freeze({source, input, original, splitting, quotient, curve, residues, indices, values}); verifyAlgebraicResidueSplittingWithin(ctx, source, input, original, proof, bounds); return proof;
}
