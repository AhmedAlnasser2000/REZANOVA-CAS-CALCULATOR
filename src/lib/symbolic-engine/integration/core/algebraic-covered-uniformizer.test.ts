import {it, expect} from 'vitest';
import {base, quadratic, fresh, bounds} from './__tests__/algebraic-support';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';
import {constructAlgebraicCoveredResidues, verifyAlgebraicCoveredResiduesWithin} from './algebraic-covered-residues';
import {verifyAlgebraicCoveredUniformizerWithin} from './algebraic-covered-uniformizer';
import {algebraicLocalParameterWithin, expandAlgebraicPlaceWithin} from './algebraic-local';
import {differentiateAlgebraicWithin} from './algebraic-derivative';
import {recordRationalGcdEvidence} from './rational-gcd-evidence';
import {encodeAlgebraicCoveredResidues, decodeAlgebraicCoveredResidues} from './algebraic-covered-wire';
import {disableAlgebraicIntegrationProducers} from './__tests__/algebraic-integration-producers';

it('uses the complete unramified base-prime identity at both split places', () => {
  const b = quadratic([1n, 0n, 0n, 1n]), f = b.owner, curve = certifyAlgebraicCurve(b.ctx, f, certifyAlgebraicConstantField(b.ctx, f, bounds), bounds);
  const input = f.inverse(b.ctx, f.multiply(b.ctx, f.embed(b.ctx, b.x), b.a)), proof = constructAlgebraicCoveredResidues(fresh(), curve, input, bounds), rows = proof.entries.filter(p => p.order === -1n);
  expect(rows).toHaveLength(2);
  for (const row of rows) {
    if (row.method !== 'quotient-map') throw Error('known direct unramified residue');
    expect(row.parameter.method).toBe('base-prime'); expect(row.place.ramification).toBe(1n);
    const ctx = fresh(); ctx.operation(() => recordRationalGcdEvidence(ctx, () => {
      const parameter = algebraicLocalParameterWithin(ctx, curve, row.place), derivative = differentiateAlgebraicWithin(ctx, f, parameter.value, bounds);
      const regular = f.exactDivide(ctx, f.multiply(ctx, parameter.value, input), derivative.derivative), expansion = expandAlgebraicPlaceWithin(ctx, curve, row.place, regular, 1n);
      expect(row.place.residue.equal(ctx, row.value, expansion.digits[0])).toBe(true);
      expect(() => verifyAlgebraicCoveredUniformizerWithin(ctx, curve, row.place, {...row.parameter, value: f.fromInteger(ctx, 1n)})).toThrow('verification-failed');
    }));
  }
  const check = fresh(); check.operation(() => verifyAlgebraicCoveredResiduesWithin(check, curve, input, proof, bounds));
  const data = encodeAlgebraicCoveredResidues(fresh(), curve, input, proof, bounds), restore = disableAlgebraicIntegrationProducers();
  try {decodeAlgebraicCoveredResidues(fresh(), curve, input, data, bounds);} finally {restore();}
});
it('uses u at unramified infinity and retains the ideal uniformizer at ramification', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), input = b.field.inverse(b.ctx, b.x);
  const rational = constructAlgebraicCoveredResidues(fresh(), curve, input, bounds), infinity = rational.entries.find(p => p.place.order.infinity);
  if (infinity?.method !== 'quotient-map') throw Error('known rational infinity residue');
  expect(infinity.parameter.method).toBe('base-prime'); expect(infinity.place.residue.equal(b.ctx, infinity.value, infinity.place.residue.fromInteger(b.ctx, -1n))).toBe(true);
  const q = quadratic([0n, 1n]), f = q.owner, ramifiedCurve = certifyAlgebraicCurve(q.ctx, f, certifyAlgebraicConstantField(q.ctx, f, bounds), bounds), ramifiedInput = f.inverse(q.ctx, f.embed(q.ctx, q.x));
  const proof = constructAlgebraicCoveredResidues(fresh(), ramifiedCurve, ramifiedInput, bounds), ramified = proof.entries.find(p => !p.place.order.infinity && p.order === -1n);
  if (ramified?.method !== 'quotient-map') throw Error('known direct ramified residue');
  expect(ramified.parameter.method).toBe('ideal-basis'); expect(ramified.place.ramification).toBe(2n);
  expect(() => verifyAlgebraicCoveredUniformizerWithin(fresh(), ramifiedCurve, ramified.place, {method: 'base-prime', value: f.embed(q.ctx, q.x)})).toThrow('verification-failed');
  expect(() => verifyAlgebraicCoveredUniformizerWithin(fresh(), ramifiedCurve, {...ramified.place}, ramified.parameter)).toThrow('domain-mismatch');
});
