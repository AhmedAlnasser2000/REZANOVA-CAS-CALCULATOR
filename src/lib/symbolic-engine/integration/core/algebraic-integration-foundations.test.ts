import { it, expect } from 'vitest';
import { base, quadratic, fresh, bounds } from './__tests__/algebraic-support';
import { PolynomialRing } from './polynomial';
import { constructAlgebraicExtension, type AlgebraicField } from './algebraic-field';
import { certifyAlgebraicConstantField } from './algebraic-constant-field';
import { certifyAlgebraicCurve } from './algebraic-curve';
import { differentiateAlgebraic } from './algebraic-derivative';
import { reduceAlgebraicDifferential, verifyAlgebraicDifferentialReduction } from './algebraic-differential-reduction';
import { encodeAlgebraicDifferentialReduction, decodeAlgebraicDifferentialReduction } from './algebraic-reduction-wire';
import { solveAlgebraicExactDifferential, verifyAlgebraicExactDifferential } from './algebraic-exact-differential';
import { encodeAlgebraicExactDifferential, decodeAlgebraicExactDifferential } from './algebraic-differential-wire';
import { ExecutionContext } from './execution';

it('reduces a nonradical cubic exact differential through the full integral connection', () => {
  const b = base(), r = new PolynomialRing(b.field, 'y'), owner = constructAlgebraicExtension(b.ctx, r, r.make(b.ctx, [b.field.negate(b.ctx, b.x), b.field.fromInteger(b.ctx, -1n), b.field.fromInteger(b.ctx, 0n), b.field.fromInteger(b.ctx, 1n)]), bounds), y = owner.generator(b.ctx);
  const input = owner.inverse(b.ctx, owner.subtract(b.ctx, owner.multiply(b.ctx, owner.fromInteger(b.ctx, 3n), owner.multiply(b.ctx, y, y)), owner.fromInteger(b.ctx, 1n))), curve = certifyAlgebraicCurve(b.ctx, owner, certifyAlgebraicConstantField(b.ctx, owner, bounds), bounds), p = reduceAlgebraicDifferential(fresh(), curve, input, bounds);
  expect(p.kind).toBe('simple-poles'); if (p.kind === 'simple-poles') { expect(owner.isZero(b.ctx, p.remainder)).toBe(true); expect(owner.equal(b.ctx, p.fieldPart, y)).toBe(true); }
  const data = encodeAlgebraicDifferentialReduction(fresh(), curve, input, p, bounds); verifyAlgebraicDifferentialReduction(fresh(), curve, input, decodeAlgebraicDifferentialReduction(fresh(), curve, input, data, bounds), bounds);
});
it('uses complete infinity spaces on a genus-three curve without a genus template', () => {
  const b = quadratic([-1n, 0n, 0n, 0n, 0n, 0n, 0n, 1n]), curve = certifyAlgebraicCurve(b.ctx, b.owner, certifyAlgebraicConstantField(b.ctx, b.owner, bounds), bounds), x = b.owner.embed(b.ctx, b.x);
  let power = b.owner.fromInteger(b.ctx, 1n); for (let i = 0; i < 6; i++) power = b.owner.multiply(b.ctx, power, x);
  const input = b.owner.exactDivide(b.ctx, b.owner.multiply(b.ctx, b.owner.fromInteger(b.ctx, 7n), power), b.owner.multiply(b.ctx, b.owner.fromInteger(b.ctx, 2n), b.a)), p = reduceAlgebraicDifferential(fresh(), curve, input, bounds);
  expect(p.kind).toBe('simple-poles'); if (p.kind === 'simple-poles') { expect(p.infinity.differential.geometry.genus).toBe(3n); expect(b.owner.isZero(b.ctx, p.remainder)).toBe(true); }
  verifyAlgebraicDifferentialReduction(fresh(), curve, input, p, bounds);
});
it('retains height-eight native owners and hidden constants during exactness and replay', () => {
  const b = quadratic([0n, 0n, 2n]); let owner = b.owner as unknown as AlgebraicField<unknown>;
  for (let i = owner.height + 1; i <= 8; i++) { const r = new PolynomialRing(owner, `level${i}`); owner = constructAlgebraicExtension(b.ctx, r, r.make(b.ctx, [owner.negate(b.ctx, owner.generator(b.ctx)), owner.fromInteger(b.ctx, 1n)]), bounds) as unknown as AlgebraicField<unknown>; }
  const c = certifyAlgebraicConstantField(fresh(), owner, bounds), curve = certifyAlgebraicCurve(fresh(), owner, c, bounds), input = owner.fromInteger(b.ctx, (1n << 110n) + 1n), p = solveAlgebraicExactDifferential(fresh(), curve, input, bounds);
  expect(p.kind).toBe('primitive'); expect(curve.owner).toBe(owner); expect(c.basis.length).toBe(2);
  const data = encodeAlgebraicExactDifferential(fresh(), curve, input, p, bounds), decoded = decodeAlgebraicExactDifferential(fresh(), curve, input, data, bounds); verifyAlgebraicExactDifferential(fresh(), curve, input, decoded, bounds);
}, 120000);
it('checks seeded native rational identities and immutable operands', () => {
  const b = quadratic(), curve = certifyAlgebraicCurve(b.ctx, b.owner, certifyAlgebraicConstantField(b.ctx, b.owner, bounds), bounds), x = b.owner.embed(b.ctx, b.x), shifted = b.owner.add(b.ctx, x, b.owner.fromInteger(b.ctx, 1n)); let seed = 743n;
  for (let i = 0; i < 4; i++) {
    seed = (seed * 48271n) % 2147483647n; const v = b.owner.add(b.ctx, b.owner.multiply(b.ctx, b.owner.fromInteger(b.ctx, seed), b.a), b.owner.exactDivide(b.ctx, b.owner.add(b.ctx, b.a, x), shifted)), before = v.representative.coefficients.slice(), input = differentiateAlgebraic(fresh(), b.owner, v, bounds).derivative;
    const p = solveAlgebraicExactDifferential(fresh(), curve, input, bounds); expect(p.kind).toBe('primitive'); expect(v.representative.coefficients).toEqual(before); expect(Object.isFrozen(p)).toBe(true);
    verifyAlgebraicExactDifferential(fresh(), curve, input, p, bounds);
  }
});
it('starts new proof scopes and preserves sticky limits during construction, verification and decoding', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), input = b.x, proof = reduceAlgebraicDifferential(fresh(), curve, input, bounds), data = encodeAlgebraicDifferentialReduction(fresh(), curve, input, proof, bounds), reused = fresh();
  verifyAlgebraicDifferentialReduction(reused, curve, input, proof, bounds); const work = reused.usage.work; verifyAlgebraicDifferentialReduction(reused, curve, input, proof, bounds); expect(reused.usage.work).toBe(work * 2);
  for (const patch of [{work: 1}, {allocation: 1}]) {
    for (const operation of [c => reduceAlgebraicDifferential(c, curve, input, bounds), c => verifyAlgebraicDifferentialReduction(c, curve, input, proof, bounds), c => decodeAlgebraicDifferentialReduction(c, curve, input, data, bounds)] as ((c: ExecutionContext) => unknown)[]) {
      const ctx = new ExecutionContext({...fresh().limits, ...patch}); expect(() => operation(ctx)).toThrow('resource-limit'); expect(() => ctx.tick()).toThrow('resource-limit');
    }
  }
  for (const patch of [{artifactDepth: 1}, {artifactBytes: 1}, {artifactNodes: 1}]) expect(() => decodeAlgebraicDifferentialReduction(fresh(), curve, input, data, {...bounds, ...patch})).toThrow('resource-limit');
});
