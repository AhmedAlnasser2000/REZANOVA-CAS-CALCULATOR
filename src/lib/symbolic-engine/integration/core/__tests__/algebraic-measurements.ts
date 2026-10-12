import { performance } from 'node:perf_hooks';
import { base, bounds, fresh, quadratic } from './algebraic-support';
import type { ExecutionContext } from '../execution';
import { constructAlgebraicExtension, type AlgebraicField } from '../algebraic-field';
import type { ExactField } from '../field';
import { certifyAlgebraicConstantField, verifyAlgebraicConstantField } from '../algebraic-constant-field';
import { encodeAlgebraicConstantField, decodeAlgebraicConstantField } from '../algebraic-constant-wire';
import { PolynomialRing } from '../polynomial';
import { factorAlgebraicPolynomial, verifyAlgebraicPolynomialFactorization } from '../algebraic-factorization';
import { differentiateAlgebraic, verifyAlgebraicDerivative } from '../algebraic-derivative';
import { encodeAlgebraicPolynomialFactorization, decodeAlgebraicPolynomialFactorization } from '../algebraic-wire';

export function measureOperation(run: (ctx: ExecutionContext) => unknown) {
  const samples: {milliseconds: number; work: number; allocation: number; heap: number}[] = [];
  for (let i = 0; i < 7; i++) {
    const c = fresh(), before = process.memoryUsage().heapUsed, start = performance.now(); run(c);
    const sample = {milliseconds: performance.now() - start, ...c.usage, heap: process.memoryUsage().heapUsed - before};
    if (i >= 2) samples.push(sample);
  }
  const values = samples.map(s => s.milliseconds).sort((a, b) => a - b);
  return {samples, median: values[2], minimum: values[0], maximum: values[4]};
}
/** Fixture construction and file I/O are outside every measured operation. */
export function algebraicGateAMeasurements() {
  const s = quadratic(), c = s.ctx, f = s.owner, ring = new PolynomialRing(f, 'z');
  const input = ring.make(c, [f.negate(c, f.embed(c, s.x)), f.fromInteger(c, 0n), f.fromInteger(c, 1n)]);
  const proof = factorAlgebraicPolynomial(c, ring, input, bounds), wire = JSON.parse(JSON.stringify(encodeAlgebraicPolynomialFactorization(c, ring, input, proof, bounds)));
  const derivative = differentiateAlgebraic(c, f, s.a, bounds);
  return {warmups: 2, samples: 5, bytes: Buffer.byteLength(JSON.stringify(wire)), observations: {
    construction: measureOperation(ctx => constructAlgebraicExtension(ctx, f.ring, s.relation, bounds)),
    factorization: measureOperation(ctx => factorAlgebraicPolynomial(ctx, ring, input, bounds)),
    differentiation: measureOperation(ctx => differentiateAlgebraic(ctx, f, s.a, bounds)),
    derivativeVerification: measureOperation(ctx => verifyAlgebraicDerivative(ctx, f, s.a, derivative.derivative, derivative, bounds)),
    verification: measureOperation(ctx => verifyAlgebraicPolynomialFactorization(ctx, ring, input, proof, bounds)),
    encoding: measureOperation(ctx => encodeAlgebraicPolynomialFactorization(ctx, ring, input, proof, bounds)),
    decoding: measureOperation(ctx => decodeAlgebraicPolynomialFactorization(ctx, ring, input, wire, bounds)),
  }};
}
export function algebraicGateBMeasurements() {
  const q = base(), a = quadratic(), hidden = quadratic([0n, 0n, 2n]), c = a.ctx, r = new PolynomialRing(a.owner, 'b');
  const nested = constructAlgebraicExtension(c, r, r.make(c, [a.owner.negate(c, a.owner.multiply(c, a.owner.fromInteger(c, 2n), a.owner.embed(c, a.x))),
    a.owner.fromInteger(c, 0n), a.owner.fromInteger(c, 1n)]), bounds);
  const cb = base(), cr = new PolynomialRing(cb.field, 'a'), cubic = constructAlgebraicExtension(cb.ctx, cr, cr.make(cb.ctx, [cb.field.negate(cb.ctx, cb.x), cb.field.fromInteger(cb.ctx, -1n),
    cb.field.fromInteger(cb.ctx, 0n), cb.field.fromInteger(cb.ctx, 1n)]), bounds);
  let deep = hidden.owner as unknown as AlgebraicField<unknown>;
  for (let i = deep.height + 1; i <= 8; i++) {
    const rr = new PolynomialRing(deep, `a${i}`); deep = constructAlgebraicExtension(hidden.ctx, rr, rr.make(hidden.ctx,
      [deep.negate(hidden.ctx, deep.generator(hidden.ctx)), deep.fromInteger(hidden.ctx, 1n)]), bounds) as unknown as AlgebraicField<unknown>;
  }
  const cases = {rational: q.field, quadratic: a.owner, hiddenConstant: hidden.owner, nestedConstant: nested, cubic, heightEight: deep};
  const observations: Record<string, unknown> = {};
  for (const [name, domain] of Object.entries(cases)) {
    const owner = domain as ExactField<unknown>, proof = certifyAlgebraicConstantField(fresh(), owner, bounds), wire = JSON.parse(JSON.stringify(encodeAlgebraicConstantField(fresh(), owner, proof, bounds)));
    observations[name] = {bytes: Buffer.byteLength(JSON.stringify(wire)), constants: proof.basis.length,
      certification: measureOperation(ctx => certifyAlgebraicConstantField(ctx, owner, bounds)),
      verification: measureOperation(ctx => verifyAlgebraicConstantField(ctx, owner, proof, bounds)),
      encoding: measureOperation(ctx => encodeAlgebraicConstantField(ctx, owner, proof, bounds)),
      decoding: measureOperation(ctx => decodeAlgebraicConstantField(ctx, owner, wire, bounds))};
  }
  return {warmups: 2, samples: 5, observations};
}
