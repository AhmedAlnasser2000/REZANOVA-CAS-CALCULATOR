import {describe, it, expect, vi} from 'vitest';
import {base, fresh, bounds} from './__tests__/algebraic-support';
import {PolynomialRing} from './polynomial';
import {constructAlgebraicExtension} from './algebraic-field';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';
import * as param from './rational-curve-parametrization';
import * as hermite from './constant-rational-hermite';
import * as derivative from './algebraic-derivative';
import {trySolveRationalCurveExactDifferential as solve, verifyRationalCurveExactDifferential as verify} from './rational-curve-exact-differential';
function fixture() {
  const b = base(), r = new PolynomialRing(b.field, 'y'), owner = constructAlgebraicExtension(b.ctx, r,
    r.make(b.ctx, [b.field.negate(b.ctx, b.x), b.field.fromInteger(b.ctx, -1n), b.field.fromInteger(b.ctx, 0n), b.field.fromInteger(b.ctx, 1n)]), bounds);
  const curve = certifyAlgebraicCurve(b.ctx, owner, certifyAlgebraicConstantField(b.ctx, owner, bounds), bounds), y = owner.generator(b.ctx);
  const input = owner.inverse(b.ctx, owner.subtract(b.ctx, owner.multiply(b.ctx, owner.fromInteger(b.ctx, 3n), owner.multiply(b.ctx, y, y)), owner.fromInteger(b.ctx, 1n)));
  return {...b, owner, curve, y, input};
}
describe('complete rational-parametrized field exactness', () => {
  it('solves the nonradical cubic with an actual independently verified primitive', () => {
    const b = fixture(), proof = solve(fresh(), b.curve, b.input, bounds);
    if (!proof || proof.kind !== 'primitive') throw Error('exact fixture');
    expect(b.owner.equal(b.ctx, proof.primitive, b.y)).toBe(true);
    expect(proof.hermite.residual.numerator.coefficients).toHaveLength(0);
    const a = vi.spyOn(param, 'tryRationalCurveParametrizationWithin').mockImplementation(() => {throw Error('producer disabled');});
    const h = vi.spyOn(hermite, 'reduceConstantRationalHermite').mockImplementation(() => {throw Error('producer disabled');});
    const d = vi.spyOn(derivative, 'differentiateAlgebraicWithin').mockImplementation(() => {throw Error('producer disabled');});
    try {verify(fresh(), b.curve, b.input, proof, bounds);} finally {a.mockRestore(); h.mockRestore(); d.mockRestore();}
  });
  it('retains a complete within-field obstruction for a differential requiring a logarithm', () => {
    const b = fixture(), input = b.owner.exactDivide(b.ctx, b.input, b.y), proof = solve(fresh(), b.curve, input, bounds);
    expect(proof?.kind).toBe('no-field-primitive'); if (!proof) throw Error('fixture');
    verify(fresh(), b.curve, input, proof, bounds);
    expect(proof.rule).toBe('rational-curve-exact-differential-v1');
  });
  it('rejects target, mapping, primitive, Hermite and condition mutations', () => {
    const b = fixture(), proof = solve(fresh(), b.curve, b.input, bounds);
    if (!proof || proof.kind !== 'primitive') throw Error('exact fixture');
    const mutations = [{...proof, primitive: b.owner.fromInteger(b.ctx, 0n)}, {...proof, transformed: proof.parametrization.field.fromInteger(b.ctx, 0n)},
      {...proof, conditions: []}, {...proof, hermite: {...proof.hermite, rationalPart: proof.parametrization.field.fromInteger(b.ctx, 0n)}}];
    for (const p of mutations) expect(() => verify(fresh(), b.curve, b.input, p, bounds)).toThrow('verification-failed');
    expect(() => verify(fresh(), b.curve, b.owner.negate(b.ctx, b.input), proof, bounds)).toThrow('verification-failed');
  });
});
