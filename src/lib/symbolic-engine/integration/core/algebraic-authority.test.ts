import { describe, expect, it, vi } from 'vitest';
import { base, bounds, fresh, quadratic } from './__tests__/algebraic-support';
import { PolynomialRing } from './polynomial';
import { constructAlgebraicExtension, type AlgebraicField } from './algebraic-field';
import { AlgebraicEmbedding } from './algebraic-embedding';
import { algebraicInvariants, verifyAlgebraicInvariants } from './algebraic-invariants';
import { differentiateAlgebraic, verifyAlgebraicDerivative } from './algebraic-derivative';
import { factorAlgebraicPolynomial, verifyAlgebraicPolynomialFactorization } from './algebraic-factorization';
import { encodeAlgebraicPolynomialFactorization, decodeAlgebraicPolynomialFactorization, encodeAlgebraicExtension, decodeAlgebraicExtension } from './algebraic-wire';
import { encodeAlgebraicDerivative, decodeAlgebraicDerivative, encodeAlgebraicValue, decodeAlgebraicValue } from './algebraic-wire';
import { ExecutionContext } from './execution';
import { DifferentialField } from './differential-field';
import * as subresultant from './subresultant';
import * as division from './polynomial-division';

describe('algebraic authority and complete evidence', () => {
  it('checks trace by Newton sums and norm independently by determinant elimination', () => {
    const s = quadratic(), c = s.ctx, proof = algebraicInvariants(c, s.owner, s.a, bounds);
    verifyAlgebraicInvariants(fresh(), s.owner, s.a, proof, bounds);
    expect(s.field.isZero(c, proof.trace)).toBe(true);
    expect(s.field.equal(c, proof.norm.proof.resultant.coefficients[0], s.field.negate(c, s.x))).toBe(true);
    expect(() => verifyAlgebraicInvariants(fresh(), s.owner, s.a, {...proof, trace: s.x}, bounds)).toThrow('verification-failed');
    const spies = [vi.spyOn(subresultant, 'subresultants'), vi.spyOn(division, 'extendedGcd')];
    for (const spy of spies) spy.mockImplementation(() => { throw Error('producer disabled'); });
    try { verifyAlgebraicInvariants(fresh(), s.owner, s.a, proof, bounds); } finally { vi.restoreAllMocks(); }
  });
  it('checks explicit nonancestor images and rejects a wrong root', () => {
    const s = quadratic(), c = s.ctx, f = s.owner, other = constructAlgebraicExtension(c, f.ring, s.relation, bounds);
    const parent = AlgebraicEmbedding.ancestor(c, s.field, other, bounds), b = other.generator(c);
    const e = AlgebraicEmbedding.extension(c, f, other, parent, other.negate(c, b), bounds);
    expect(other.equal(c, e.map(c, s.a), other.negate(c, b))).toBe(true);
    expect(other.equal(c, e.map(c, f.multiply(c, s.a, s.a)), other.embed(c, s.x))).toBe(true);
    expect(() => AlgebraicEmbedding.extension(c, f, other, parent, other.fromInteger(c, 1n), bounds)).toThrow('verification-failed');
  });
  it.each([1n, 2n, 3n, 4n, 5n])('seeded arithmetic and dual derivatives %s', seed => {
    const s = quadratic(), c = s.ctx, f = s.owner;
    const a = f.add(c, f.multiply(c, f.fromInteger(c, seed), s.a), f.embed(c, s.x));
    const b = f.add(c, s.a, f.fromInteger(c, seed + 1n));
    const v = f.exactDivide(c, f.multiply(c, a, b), a); expect(f.equal(c, v, b)).toBe(true);
    const proof = differentiateAlgebraic(c, f, v, bounds);
    verifyAlgebraicDerivative(fresh(), f, v, f.inverse(c, f.multiply(c, f.fromInteger(c, 2n), s.a)), proof, bounds);
  });
  it('retains scalar units, repetitions and irreducible factors', () => {
    const s = quadratic(), c = s.ctx, f = s.owner, r = new PolynomialRing(f, 'z');
    const linear = r.make(c, [f.negate(c, s.a), f.fromInteger(c, 1n)]);
    const irreducible = r.make(c, [f.negate(c, f.add(c, s.a, f.fromInteger(c, 1n))), f.fromInteger(c, 0n), f.fromInteger(c, 1n)]);
    const p = r.scale(c, r.multiply(c, r.power(c, linear, 3), r.power(c, irreducible, 2)), f.fromInteger(c, 7n));
    const proof = factorAlgebraicPolynomial(c, r, p, bounds); verifyAlgebraicPolynomialFactorization(fresh(), r, p, proof, bounds);
    expect(proof.kind === 'factorization' && proof.factors.map(a => a.multiplicity)).toEqual([2n, 3n]);
  });
  it('preserves native differential variable owners', () => {
    const c = fresh(), q = DifferentialField.rationals(c, bounds), x = DifferentialField.rationalFunctions(c, q, 'u', bounds), r = new PolynomialRing(x, 'a');
    const p = r.make(c, [x.negate(c, x.generator(c)), x.fromInteger(c, 0n), x.fromInteger(c, 1n)]), f = constructAlgebraicExtension(c, r, p, bounds);
    const d = differentiateAlgebraic(c, f, f.generator(c), bounds); verifyAlgebraicDerivative(fresh(), f, f.generator(c), d.derivative, d, bounds);
    const formal = DifferentialField.formal(c, x, 't', [x.fromInteger(c, 0n), x.fromInteger(c, 1n)], bounds);
    expect(() => constructAlgebraicExtension(c, new PolynomialRing(formal, 'b'), new PolynomialRing(formal, 'b').one(c), bounds)).toThrow('domain-mismatch');
  });
  it.each(['shift', 'gcds', 'squareFreeNorm', 'norm'])('rejects mutated factor %s', mutation => {
    const s = quadratic(), c = s.ctx, r = new PolynomialRing(s.owner, 'z'), p = r.make(c, [s.owner.negate(c, s.owner.embed(c, s.x)), s.owner.fromInteger(c, 0n), s.owner.fromInteger(c, 1n)]);
    const proof = factorAlgebraicPolynomial(c, r, p, bounds); if (proof.kind !== 'factorization' || proof.route !== 'algebraic') throw Error('fixture');
    const data = JSON.parse(JSON.stringify(encodeAlgebraicPolynomialFactorization(c, r, p, proof, bounds)));
    const component = data.evidence.components[0];
    if (mutation === 'shift') component.shift = '99';
    if (mutation === 'gcds') component.gcds = [];
    if (mutation === 'squareFreeNorm') component.squareFreeNorm.gcd.coefficients = [];
    if (mutation === 'norm') component.norm.resultant.coefficients = [];
    expect(() => decodeAlgebraicPolynomialFactorization(fresh(), r, p, data, bounds)).toThrow();
  });
  it('rejects changed relation and noncanonical integer values', () => {
    const s = quadratic(), data = JSON.parse(JSON.stringify(encodeAlgebraicExtension(s.ctx, s.owner.ring, s.relation, s.owner, bounds)));
    data.evidence.relation.coefficients[0].numerator.coefficients[1].value.numerator = '-2';
    expect(() => decodeAlgebraicExtension(fresh(), s.owner.ring, s.relation, data, bounds)).toThrow();
  });
  it.each(['work', 'allocation', 'integerBits', 'degree'] as const)('exhausts %s without a fallback', category => {
    const s = base(), limits = {...s.ctx.limits, [category]: category === 'integerBits' ? 1 : 0}, c = new ExecutionContext(limits), r = new PolynomialRing(s.field, 'a');
    const p = r.make(s.ctx, [s.field.negate(s.ctx, s.x), s.field.fromInteger(s.ctx, 0n), s.field.fromInteger(s.ctx, 1n)]);
    expect(() => constructAlgebraicExtension(c, r, p, bounds)).toThrow('resource-limit');
    expect(() => c.tick()).toThrow('resource-limit');
  });
  it('preserves canceled input and construction denominator provenance', () => {
    const s = quadratic([0n, 0n, 2n]), c = s.ctx, f = s.owner, v = f.exactDivide(c, s.a, f.embed(c, s.x));
    const proof = differentiateAlgebraic(c, f, v, bounds); expect(f.isZero(c, proof.derivative)).toBe(true);
    const data = JSON.parse(JSON.stringify(encodeAlgebraicDerivative(c, f, v, proof.derivative, proof, bounds)));
    expect(data.conditions.some((p: {path: string}) => p.path.startsWith('input.'))).toBe(true);
    data.conditions = data.conditions.slice(1);
    expect(() => decodeAlgebraicDerivative(fresh(), f, v, proof.derivative, data, bounds)).toThrow('verification-failed');
  });
  it('replays height-eight construction with modest total degree', () => {
    const s = quadratic(), c = s.ctx; let f = s.owner as unknown as AlgebraicField<unknown>;
    for (let i = f.height + 1; i <= 8; i++) {
      const r = new PolynomialRing(f, `a${i}`), p = r.make(c, [f.negate(c, f.generator(c)), f.fromInteger(c, 1n)]);
      f = constructAlgebraicExtension(c, r, p, bounds) as unknown as AlgebraicField<unknown>;
    }
    const v = f.generator(c), data = JSON.parse(JSON.stringify(encodeAlgebraicValue(c, f, v, bounds)));
    expect(f.equal(c, decodeAlgebraicValue(fresh(), f, data, bounds), v)).toBe(true);
    const r = new PolynomialRing(f, 'extra');
    expect(() => constructAlgebraicExtension(c, r, r.make(c, [v, f.fromInteger(c, 1n)]), bounds)).toThrow('resource-limit');
  });
});
