import {describe, expect, it, vi} from 'vitest';
import {base, quadratic, fresh, bounds} from './__tests__/algebraic-support';
import {PolynomialRing} from './polynomial';
import {constructAlgebraicExtension} from './algebraic-field';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';
import * as derivative from './algebraic-derivative';
import * as param from './rational-curve-parametrization';
function cubic() {
  const b = base(), r = new PolynomialRing(b.field, 'y'), owner = constructAlgebraicExtension(b.ctx, r,
    r.make(b.ctx, [b.field.negate(b.ctx, b.x), b.field.fromInteger(b.ctx, -1n), b.field.fromInteger(b.ctx, 0n), b.field.fromInteger(b.ctx, 1n)]), bounds);
  const constants = certifyAlgebraicConstantField(b.ctx, owner, bounds), curve = certifyAlgebraicCurve(b.ctx, owner, constants, bounds);
  return {...b, owner, curve, y: owner.generator(b.ctx)};
}
describe('checked rational curve presentations over full constants', () => {
  it('checks the nonradical cubic isomorphism and an arbitrary rational function in its native owner', () => {
    const b = cubic(), p = param.tryRationalCurveParametrization(b.ctx, b.curve, bounds); if (!p) throw Error('param fixture');
    expect(p.kind).toBe('linear-x'); const f = p.field, c = f.ring.domain;
    const expected = f.make(b.ctx, f.ring.make(b.ctx, [c.fromInteger(b.ctx, 0n), c.fromInteger(b.ctx, -1n), c.fromInteger(b.ctx, 0n), c.fromInteger(b.ctx, 1n)]), f.ring.one(b.ctx));
    expect(f.equal(b.ctx, p.xImage, expected)).toBe(true);
    const value = b.owner.exactDivide(b.ctx, b.owner.add(b.ctx, b.y, b.owner.embed(b.ctx, b.x)),
      b.owner.add(b.ctx, b.owner.multiply(b.ctx, b.y, b.y), b.owner.fromInteger(b.ctx, 1n)));
    b.ctx.operation(() => {
      const image = param.rationalCurveForwardWithin(b.ctx, b.curve, p, value);
      expect(b.owner.equal(b.ctx, param.rationalCurveBackwardWithin(b.ctx, b.curve, p, image), value)).toBe(true);
    });
    const off = vi.spyOn(derivative, 'differentiateAlgebraicWithin').mockImplementation(() => {throw Error('producer disabled');});
    try {param.verifyRationalCurveParametrization(fresh(), b.curve, p, bounds);} finally {off.mockRestore();}
  });
  it('keeps actual hidden constants when the relative function degree is one', () => {
    const b = quadratic([0n, 0n, 2n]), constants = certifyAlgebraicConstantField(b.ctx, b.owner, bounds);
    const curve = certifyAlgebraicCurve(b.ctx, b.owner, constants, bounds), p = param.tryRationalCurveParametrization(b.ctx, curve, bounds);
    if (!p) throw Error('param fixture'); expect(p.kind).toBe('degree-one'); expect(p.field.ring.domain).toBe(constants.numberField);
    b.ctx.operation(() => {
      const image = param.rationalCurveForwardWithin(b.ctx, curve, p, b.a);
      expect(b.owner.equal(b.ctx, param.rationalCurveBackwardWithin(b.ctx, curve, p, image), b.a)).toBe(true);
    });
  });
  it('does not authorize a parametrization for an elliptic presentation', () => {
    const b = quadratic([1n, -1n, 0n, 1n]), constants = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), curve = certifyAlgebraicCurve(b.ctx, b.owner, constants, bounds);
    expect(param.tryRationalCurveParametrization(b.ctx, curve, bounds)).toBeNull();
  });
  it('rejects conversion, coverage, derivative and owner mutations', () => {
    const b = cubic(), p = param.tryRationalCurveParametrization(b.ctx, b.curve, bounds); if (!p) throw Error('param fixture');
    const mutations = [{...p, quotients: []}, {...p, cleared: []}, {...p, basisImages: p.basisImages.slice(1)},
      {...p, xImage: p.field.fromInteger(b.ctx, 0n)}, {...p, parameter: b.owner.fromInteger(b.ctx, 0n)},
      {...p, A: p.field.ring.zero(b.ctx)}, {...p, parameterDerivative: {...p.parameterDerivative, derivative: b.owner.fromInteger(b.ctx, 0n)}}];
    for (const m of mutations) expect(() => param.verifyRationalCurveParametrization(fresh(), b.curve, m, bounds)).toThrow('verification-failed');
    const other = cubic(); expect(() => param.verifyRationalCurveParametrization(fresh(), other.curve, p, bounds)).toThrow('domain-mismatch');
  });
});
