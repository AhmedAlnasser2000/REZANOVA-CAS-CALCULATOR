import { describe, expect, it, vi } from 'vitest';
import { bounds, fresh, quadratic } from './__tests__/algebraic-support';
import * as constants from './algebraic-constant-field';
import * as normal from './algebraic-integral-basis';
import * as modules from './polynomial-module';
import * as linear from './linear-system';
import * as derivative from './algebraic-derivative';
import * as factor from './algebraic-factorization';
import * as presentation from './algebraic-presentation';
import * as construction from './algebraic-field';
import * as recursiveFactor from './recursive-polynomial-factorization';
import * as finiteFactor from './factorization-finite';
import * as integerFactor from './factorization-integer';
import * as squareFree from './factorization-square-free';
import { encodeAlgebraicConstantField, decodeAlgebraicConstantField } from './algebraic-constant-wire';
import { packRecursiveArtifactGraph, unpackRecursiveArtifactGraph } from './recursive-artifact-graph';
import { ExecutionContext } from './execution';

describe('bounded full-constant replay', () => {
  it.each([[0n, 1n], [0n, 0n, 2n]])('replays with all producers disabled %s', (...polynomial) => {
    const s = quadratic(polynomial), p = constants.certifyAlgebraicConstantField(s.ctx, s.owner, bounds), data = JSON.parse(JSON.stringify(encodeAlgebraicConstantField(fresh(), s.owner, p, bounds)));
    const spies = [vi.spyOn(constants, 'certifyAlgebraicConstantFieldWithin'), vi.spyOn(normal, 'algebraicIntegralBasisWithin'),
      vi.spyOn(normal, 'algebraicIdealizerWithin'), vi.spyOn(modules, 'polynomialModuleHermite'), vi.spyOn(linear, 'solveLinearSystem'),
      vi.spyOn(derivative, 'differentiateAlgebraicWithin'), vi.spyOn(factor, 'factorAlgebraicPolynomialWithin'),
      vi.spyOn(presentation, 'algebraicPrimitivePresentationWithin'), vi.spyOn(construction, 'constructAlgebraicExtension'),
      vi.spyOn(recursiveFactor, 'factorRecursivePolynomial'), vi.spyOn(finiteFactor, 'factorFinitePolynomial'),
      vi.spyOn(integerFactor, 'factorIntegerPolynomial'), vi.spyOn(integerFactor, 'liftIntegerModularFactors'), vi.spyOn(squareFree, 'checkedFactorSquareFree')];
    for (const spy of spies) spy.mockImplementation(() => { throw Error('producer disabled'); });
    try { const replay = decodeAlgebraicConstantField(fresh(), s.owner, data, bounds); expect(replay.basis.length).toBe(p.basis.length); expect(Object.isFrozen(replay.space.basis)).toBe(true); }
    finally { for (const spy of spies) spy.mockRestore(); }
  });
  it.each(['bounds', 'conditions', 'kernel', 'coverage', 'trace', 'relation', 'conversion', 'integer', 'flag'])('rejects incomplete or altered %s', mutation => {
    const s = quadratic([0n, 0n, 2n]), p = constants.certifyAlgebraicConstantField(s.ctx, s.owner, bounds), data = encodeAlgebraicConstantField(fresh(), s.owner, p, bounds) as {tag: string; version: number; payload: unknown};
    const body = JSON.parse(JSON.stringify(unpackRecursiveArtifactGraph(fresh(), data.payload, bounds))), e = body.evidence.evidence;
    if (mutation === 'bounds') e.space.degrees[0]++;
    if (mutation === 'conditions') e.conditions = [];
    if (mutation === 'kernel') e.space.elimination.nullspace = [];
    if (mutation === 'coverage') e.finiteClosure.rounds.pop();
    if (mutation === 'trace') e.finiteClosure.initial.traceMatrix[0][0].coefficients = [];
    if (mutation === 'relation') body.evidence.numberField.construction.monic.coefficients = [];
    if (mutation === 'conversion') e.space.transition.inverse = [];
    if (mutation === 'integer') body.evidence.numberField.construction.monic.coefficients[0].value.numerator = '01';
    if (mutation === 'flag') e.verified = true;
    const malformed = {...data, payload: packRecursiveArtifactGraph(fresh(), body, bounds)};
    expect(() => decodeAlgebraicConstantField(fresh(), s.owner, malformed, bounds)).toThrow();
  });
  it('rejects mismatched source owners, tags and resource bounds', () => {
    const s = quadratic(), p = constants.certifyAlgebraicConstantField(s.ctx, s.owner, bounds), data = encodeAlgebraicConstantField(fresh(), s.owner, p, bounds), other = quadratic([0n, 2n]);
    expect(() => decodeAlgebraicConstantField(fresh(), other.owner, data, bounds)).toThrow();
    expect(() => decodeAlgebraicConstantField(fresh(), s.owner, {...data as object, version: 2}, bounds)).toThrow('invalid-input');
    expect(() => decodeAlgebraicConstantField(fresh(), s.owner, data, {...bounds, artifactNodes: 1})).toThrow('resource-limit');
    expect(() => decodeAlgebraicConstantField(fresh(), s.owner, data, {...bounds, artifactBytes: 1})).toThrow('resource-limit');
    const c = new ExecutionContext({...fresh().limits, work: 1});
    expect(() => decodeAlgebraicConstantField(c, s.owner, data, bounds)).toThrow('resource-limit'); expect(() => c.tick()).toThrow('resource-limit');
  });
});
