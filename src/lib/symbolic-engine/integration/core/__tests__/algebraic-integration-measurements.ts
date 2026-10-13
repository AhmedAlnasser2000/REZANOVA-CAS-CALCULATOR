import { performance } from 'node:perf_hooks';
import { base, quadratic, fresh, bounds } from './algebraic-support';
import type { ExecutionContext } from '../execution';
import type { ExactField } from '../field';
import { PolynomialRing } from '../polynomial';
import { constructAlgebraicExtension, type AlgebraicField } from '../algebraic-field';
import { certifyAlgebraicConstantField } from '../algebraic-constant-field';
import { certifyAlgebraicCurve } from '../algebraic-curve';
import { reduceAlgebraicDifferential, verifyAlgebraicDifferentialReduction } from '../algebraic-differential-reduction';
import { solveAlgebraicExactDifferential, verifyAlgebraicExactDifferential } from '../algebraic-exact-differential';
import { encodeAlgebraicDifferentialReduction, decodeAlgebraicDifferentialReduction } from '../algebraic-reduction-wire';
import { encodeAlgebraicExactDifferential, decodeAlgebraicExactDifferential } from '../algebraic-differential-wire';
import { rationalField as Q } from '../field';
import { AlgebraicEmbedding } from '../algebraic-embedding';
import { constructRelativeNumberFieldWithin } from '../relative-number-field';
import { baseChangeAlgebraicCurveWithin } from '../algebraic-curve-base-change';
import { reconstructAlgebraicConstantQuotientWithin, mapAlgebraicConstantBaseChangeValue } from '../algebraic-constant-quotient';
import { constructAlgebraicPrimitive, differentiateAlgebraicPrimitive, verifyAlgebraicPrimitive } from '../algebraic-primitive';
import { encodeAlgebraicPrimitive, decodeAlgebraicPrimitive } from '../algebraic-primitive-wire';

export function measureAlgebraicIntegrationOperation(run: (ctx: ExecutionContext) => unknown) {
  const samples: {milliseconds: number; work: number; allocation: number; heap: number; rss: number; heapDelta: number; rssDelta: number}[] = [];
  for (let i = 0; i < 7; i++) {
    const ctx = fresh(), before = process.memoryUsage(), start = performance.now(); run(ctx);
    const milliseconds = performance.now() - start, after = process.memoryUsage();
    if (i >= 2) samples.push({milliseconds, ...ctx.usage, heap: after.heapUsed, rss: after.rss, heapDelta: after.heapUsed - before.heapUsed, rssDelta: after.rss - before.rss});
  }
  const times = samples.map(s => s.milliseconds).sort((a, b) => a - b); return {samples, median: times[2], minimum: times[0], maximum: times[4]};
}
/** All fixtures and file I/O are outside the timed operations. Every sample is
 * serial with a new context and operation scope. No speed threshold applies. */
export function algebraicIntegrationGateAMeasurements(progress?: (name: string, result: unknown) => void) {
  const q = base(), a = quadratic(), h = quadratic([0n, 0n, 2n]), c = base(), ring = new PolynomialRing(c.field, 'y'), cubic = constructAlgebraicExtension(c.ctx, ring,
    ring.make(c.ctx, [c.field.negate(c.ctx, c.x), c.field.fromInteger(c.ctx, -1n), c.field.fromInteger(c.ctx, 0n), c.field.fromInteger(c.ctx, 1n)]), bounds), y = cubic.generator(c.ctx);
  let deep = h.owner as unknown as AlgebraicField<unknown>;
  for (let i = deep.height + 1; i <= 8; i++) { const r = new PolynomialRing(deep, `level${i}`); deep = constructAlgebraicExtension(h.ctx, r, r.make(h.ctx, [deep.negate(h.ctx, deep.generator(h.ctx)), deep.fromInteger(h.ctx, 1n)]), bounds) as unknown as AlgebraicField<unknown>; }
  const qInv = q.field.inverse(q.ctx, q.x), aInv = a.owner.inverse(a.ctx, a.a);
  const fixtures: Record<string, {owner: ExactField<unknown>; input: unknown}> = {
    rationalRepeatedPole: {owner: q.field, input: q.field.add(q.ctx, qInv, q.field.multiply(q.ctx, qInv, qInv))},
    ramifiedRepeatedPole: {owner: a.owner, input: a.owner.multiply(a.ctx, aInv, a.owner.multiply(a.ctx, aInv, aInv))},
    cubic: {owner: cubic, input: cubic.inverse(c.ctx, cubic.subtract(c.ctx, cubic.multiply(c.ctx, cubic.fromInteger(c.ctx, 3n), cubic.multiply(c.ctx, y, y)), cubic.fromInteger(c.ctx, 1n)))},
    hiddenConstants: {owner: h.owner, input: h.owner.exactDivide(h.ctx, h.a, h.owner.embed(h.ctx, h.x))},
    heightEight: {owner: deep, input: deep.fromInteger(h.ctx, 1n)},
  };
  const observations: Record<string, unknown> = {};
  for (const [name, {owner, input}] of Object.entries(fixtures)) {
    const constants = certifyAlgebraicConstantField(fresh(), owner, bounds), curve = certifyAlgebraicCurve(fresh(), owner, constants, bounds), reduction = reduceAlgebraicDifferential(fresh(), curve, input, bounds), exact = solveAlgebraicExactDifferential(fresh(), curve, input, bounds);
    const reductionWire = JSON.parse(JSON.stringify(encodeAlgebraicDifferentialReduction(fresh(), curve, input, reduction, bounds))), exactWire = JSON.parse(JSON.stringify(encodeAlgebraicExactDifferential(fresh(), curve, input, exact, bounds)));
    const result = {reductionKind: reduction.kind, exactKind: exact.kind, reductionBytes: Buffer.byteLength(JSON.stringify(reductionWire)), exactBytes: Buffer.byteLength(JSON.stringify(exactWire)),
      construction: measureAlgebraicIntegrationOperation(ctx => certifyAlgebraicCurve(ctx, owner, constants, bounds)),
      reduction: measureAlgebraicIntegrationOperation(ctx => reduceAlgebraicDifferential(ctx, curve, input, bounds)),
      reductionVerification: measureAlgebraicIntegrationOperation(ctx => verifyAlgebraicDifferentialReduction(ctx, curve, input, reduction, bounds)),
      reductionEncoding: measureAlgebraicIntegrationOperation(ctx => encodeAlgebraicDifferentialReduction(ctx, curve, input, reduction, bounds)),
      reductionDecoding: measureAlgebraicIntegrationOperation(ctx => decodeAlgebraicDifferentialReduction(ctx, curve, input, reductionWire, bounds)),
      exactSolving: measureAlgebraicIntegrationOperation(ctx => solveAlgebraicExactDifferential(ctx, curve, input, bounds)),
      exactVerification: measureAlgebraicIntegrationOperation(ctx => verifyAlgebraicExactDifferential(ctx, curve, input, exact, bounds)),
      exactEncoding: measureAlgebraicIntegrationOperation(ctx => encodeAlgebraicExactDifferential(ctx, curve, input, exact, bounds)),
      exactDecoding: measureAlgebraicIntegrationOperation(ctx => decodeAlgebraicExactDifferential(ctx, curve, input, exactWire, bounds))};
    observations[name] = result; progress?.(name, result);
  }
  return {warmups: 2, samples: 5, observations};
}
export function algebraicPrimitiveGateAMeasurements() {
  const b = quadratic([1n, 0n, -1n]), curve = certifyAlgebraicCurve(fresh(), b.owner, certifyAlgebraicConstantField(fresh(), b.owner, bounds), bounds), ctx = fresh(), r = new PolynomialRing(Q, 'i'), L = constructAlgebraicExtension(ctx, r, r.make(ctx, [1n, 0n, 1n].map(n => Q.fromInteger(ctx, n))), bounds), C = curve.coordinates.constantOwner;
  const image = L.embed(ctx, Q.negate(ctx, Q.exactDivide(ctx, C.modulus.coefficients[0], C.modulus.coefficients[1]))), embedding = AlgebraicEmbedding.extension(ctx, C, L, AlgebraicEmbedding.rationals(ctx, L, bounds), image, bounds);
  const relative = constructRelativeNumberFieldWithin(ctx, C, L, embedding, bounds), change = baseChangeAlgebraicCurveWithin(ctx, curve, L, embedding, bounds), quotient = reconstructAlgebraicConstantQuotientWithin(ctx, curve, change, relative, bounds);
  const f = change.field, x = mapAlgebraicConstantBaseChangeValue(ctx, quotient, b.owner.embed(b.ctx, b.x)), y = mapAlgebraicConstantBaseChangeValue(ctx, quotient, b.a), i = change.coordinates.scalarNative(ctx, change.coordinates.scalar.fromCoefficient(ctx, L.generator(ctx))), argument = f.add(ctx, y, f.multiply(ctx, i, x));
  const terms = [{quotient, weight: L.negate(ctx, L.generator(ctx)), unit: L.fromInteger(ctx, 1n), factors: [{value: argument, exponent: 1n}]}], zero = b.owner.fromInteger(b.ctx, 0n), primitive = constructAlgebraicPrimitive(fresh(), curve, zero, terms, bounds), derivative = differentiateAlgebraicPrimitive(fresh(), curve, primitive, bounds), wire = JSON.parse(JSON.stringify(encodeAlgebraicPrimitive(fresh(), curve, primitive, derivative.derivative, derivative, bounds)));
  return {warmups: 2, samples: 5, bytes: Buffer.byteLength(JSON.stringify(wire)), observations: {
    relativeConstruction: measureAlgebraicIntegrationOperation(c => c.operation(() => constructRelativeNumberFieldWithin(c, C, L, embedding, bounds))),
    constantBaseChange: measureAlgebraicIntegrationOperation(c => c.operation(() => baseChangeAlgebraicCurveWithin(c, curve, L, embedding, bounds))),
    primitiveConstruction: measureAlgebraicIntegrationOperation(c => constructAlgebraicPrimitive(c, curve, zero, terms, bounds)),
    differentiation: measureAlgebraicIntegrationOperation(c => differentiateAlgebraicPrimitive(c, curve, primitive, bounds)),
    verification: measureAlgebraicIntegrationOperation(c => verifyAlgebraicPrimitive(c, curve, primitive, derivative.derivative, derivative, bounds)),
    encoding: measureAlgebraicIntegrationOperation(c => encodeAlgebraicPrimitive(c, curve, primitive, derivative.derivative, derivative, bounds)),
    decoding: measureAlgebraicIntegrationOperation(c => decodeAlgebraicPrimitive(c, curve, derivative.derivative, wire, bounds)),
  }};
}
