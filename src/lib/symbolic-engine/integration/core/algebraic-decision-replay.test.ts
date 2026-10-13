import { it, expect } from 'vitest';
import { base, quadratic, fresh, bounds } from './__tests__/algebraic-support';
import { disableAlgebraicIntegrationProducers } from './__tests__/algebraic-integration-producers';
import { certifyAlgebraicConstantField } from './algebraic-constant-field';
import { certifyAlgebraicCurve } from './algebraic-curve';
import { integrateAlgebraic, verifyAlgebraicDecision } from './algebraic-decision';
import { encodeAlgebraicDecision, decodeAlgebraicDecision } from './algebraic-decision-wire';

it('replays the complete rational logarithmic decision without producers', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), input = b.field.inverse(b.ctx, b.x);
  const proof = integrateAlgebraic(fresh(), curve, input, bounds), data = encodeAlgebraicDecision(fresh(), curve, input, proof, bounds), restore = disableAlgebraicIntegrationProducers();
  try { const decoded = decodeAlgebraicDecision(fresh(), curve, input, data, bounds); expect(decoded.kind).toBe('elementary'); verifyAlgebraicDecision(fresh(), curve, input, decoded, bounds); }
  finally { restore(); }
}, 250000);
it('reconstructs a fresh auxiliary complex constant field and its complete trace mappings', () => {
  const b = base(), curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds), input = b.field.inverse(b.ctx, b.field.add(b.ctx, b.field.multiply(b.ctx, b.x, b.x), b.field.fromInteger(b.ctx, 1n)));
  const proof = integrateAlgebraic(fresh(), curve, input, bounds), data = encodeAlgebraicDecision(fresh(), curve, input, proof, bounds), restore = disableAlgebraicIntegrationProducers();
  try { const decoded = decodeAlgebraicDecision(fresh(), curve, input, data, bounds); expect(decoded.kind).toBe('elementary'); verifyAlgebraicDecision(fresh(), curve, input, decoded, bounds);
    if (decoded.kind === 'elementary' && proof.kind === 'elementary') { expect(decoded.relations.splitting.splitting.target).not.toBe(proof.relations.splitting.splitting.target); expect(decoded.primitive.terms[0].quotient.relative.target).toBe(decoded.relations.splitting.splitting.target); }
  } finally { restore(); }
}, 250000);
it('replays holomorphic and infinity negatives with searches and derivatives disabled', () => {
  const b = quadratic([1n, -1n, 0n, 1n]), curve = certifyAlgebraicCurve(b.ctx, b.owner, certifyAlgebraicConstantField(b.ctx, b.owner, bounds), bounds);
  for (const input of [b.owner.inverse(b.ctx, b.a), b.owner.exactDivide(b.ctx, b.owner.embed(b.ctx, b.x), b.a)]) {
    const proof = integrateAlgebraic(fresh(), curve, input, bounds), data = encodeAlgebraicDecision(fresh(), curve, input, proof, bounds), restore = disableAlgebraicIntegrationProducers();
    try { const decoded = decodeAlgebraicDecision(fresh(), curve, input, data, bounds); expect(decoded.kind).toBe('non-elementary'); verifyAlgebraicDecision(fresh(), curve, input, decoded, bounds); }
    finally { restore(); }
  }
}, 250000);
