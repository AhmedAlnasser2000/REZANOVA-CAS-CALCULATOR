import { base, quadratic, fresh, bounds } from './algebraic-support';
import { heightEightHiddenConstantCurve } from './algebraic-divisor-support';
import { certifyAlgebraicConstantField } from '../algebraic-constant-field';
import { certifyAlgebraicCurve, type AlgebraicCurveView } from '../algebraic-curve';
import { integrateAlgebraic, verifyAlgebraicDecision } from '../algebraic-decision';
import { encodeAlgebraicDecision, decodeAlgebraicDecision } from '../algebraic-decision-wire';
import { measureAlgebraicIntegrationOperation } from './algebraic-integration-measurements';

/** Serial samples; fixture creation and file I/O are outside timed operations.
 * Gate A separately records complete reduction and exactness observations. */
export function algebraicDecisionMeasurements(progress?: (name: string, result: unknown) => void) {
  const q = base(), a = quadratic(), h = quadratic([0n, 0n, 2n]), i = quadratic([1n, 0n, -1n]), e = quadratic([1n, -1n, 0n, 1n]), deep = heightEightHiddenConstantCurve();
  const curve = <E>(b: {ctx: ReturnType<typeof fresh>}, owner: AlgebraicCurveView<E>['owner']) => certifyAlgebraicCurve(b.ctx, owner, certifyAlgebraicConstantField(b.ctx, owner, bounds), bounds);
  const fixtures: Record<string, {curve: AlgebraicCurveView<unknown>; input: unknown}> = {
    rationalLogarithm: {curve: curve(q, q.field), input: q.field.inverse(q.ctx, q.x)},
    ramifiedExact: {curve: curve(a, a.owner), input: a.owner.inverse(a.ctx, a.a)},
    hiddenConstant: {curve: curve(h, h.owner), input: h.owner.exactDivide(h.ctx, h.a, h.owner.embed(h.ctx, h.x))},
    auxiliaryComplexLogarithm: {curve: curve(i, i.owner), input: i.owner.inverse(i.ctx, i.a)},
    holomorphicNegative: {curve: curve(e, e.owner), input: e.owner.inverse(e.ctx, e.a)},
    heightEight: {curve: deep.curve, input: deep.owner.fromInteger(deep.ctx, 1n)},
  };
  const observations: Record<string, unknown> = {};
  for (const [name, {curve: c, input}] of Object.entries(fixtures)) {
    const proof = integrateAlgebraic(fresh(), c, input, bounds), wire = JSON.parse(JSON.stringify(encodeAlgebraicDecision(fresh(), c, input, proof, bounds)));
    const result = {kind: proof.kind, reason: proof.kind === 'non-elementary' ? proof.reason : null, bytes: Buffer.byteLength(JSON.stringify(wire)),
      construction: measureAlgebraicIntegrationOperation(ctx => certifyAlgebraicCurve(ctx, c.owner, certifyAlgebraicConstantField(ctx, c.owner, bounds), bounds)),
      integration: measureAlgebraicIntegrationOperation(ctx => integrateAlgebraic(ctx, c, input, bounds)),
      verification: measureAlgebraicIntegrationOperation(ctx => verifyAlgebraicDecision(ctx, c, input, proof, bounds)),
      encoding: measureAlgebraicIntegrationOperation(ctx => encodeAlgebraicDecision(ctx, c, input, proof, bounds)),
      decoding: measureAlgebraicIntegrationOperation(ctx => decodeAlgebraicDecision(ctx, c, input, wire, bounds))};
    observations[name] = result; progress?.(name, result);
  }
  return {warmups: 2, samples: 5, observations};
}
