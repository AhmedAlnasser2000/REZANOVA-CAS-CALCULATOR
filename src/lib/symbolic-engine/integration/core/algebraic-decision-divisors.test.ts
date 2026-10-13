import { it, expect } from 'vitest';
import { quadratic, fresh, bounds } from './__tests__/algebraic-support';
import { certifyAlgebraicConstantField } from './algebraic-constant-field';
import { certifyAlgebraicCurve } from './algebraic-curve';
import { integrateAlgebraic, verifyAlgebraicDecision } from './algebraic-decision';
import { encodeAlgebraicDecision, decodeAlgebraicDecision } from './algebraic-decision-wire';
import { disableAlgebraicIntegrationProducers } from './__tests__/algebraic-integration-producers';
import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';

it.each([2n, 3n])('constructs logarithms using the least principal multiple of order %s', order => {
  const b = quadratic(order === 2n ? [0n, -1n, 0n, 1n] : [1n, 0n, 0n, 1n]), f = b.owner, x = f.embed(b.ctx, b.x), curve = certifyAlgebraicCurve(b.ctx, f, certifyAlgebraicConstantField(b.ctx, f, bounds), bounds);
  const input = order === 2n ? f.inverse(b.ctx, f.multiply(b.ctx, f.fromInteger(b.ctx, 2n), x)) : f.exactDivide(b.ctx, f.add(b.ctx, b.a, f.fromInteger(b.ctx, 1n)), f.multiply(b.ctx, f.fromInteger(b.ctx, 2n), f.multiply(b.ctx, x, b.a)));
  const proof = integrateAlgebraic(fresh(), curve, input, bounds); expect(proof.kind).toBe('elementary');
  if (proof.kind === 'elementary') { const p = proof.logarithms.components[0].torsion; expect('order' in p && p.order).toBe(order); }
  verifyAlgebraicDecision(fresh(), curve, input, proof, bounds);
}, 500000);
it('certifies a non-torsion third-kind differential and replays its obstruction', () => {
  const b = quadratic([-2n, 0n, 0n, 1n]), f = b.owner, x = f.embed(b.ctx, b.x), curve = certifyAlgebraicCurve(b.ctx, f, certifyAlgebraicConstantField(b.ctx, f, bounds), bounds), input = f.inverse(b.ctx, f.multiply(b.ctx, f.subtract(b.ctx, x, f.fromInteger(b.ctx, 3n)), b.a));
  const proof = integrateAlgebraic(fresh(), curve, input, bounds); expect(proof).toMatchObject({kind: 'non-elementary', reason: 'non-torsion-residue-divisor', later: 'unperformed'});
  const data = encodeAlgebraicDecision(fresh(), curve, input, proof, bounds), restore = disableAlgebraicIntegrationProducers();
  try { const decoded = decodeAlgebraicDecision(fresh(), curve, input, data, bounds); verifyAlgebraicDecision(fresh(), curve, input, decoded, bounds); expect(decoded.kind).toBe('non-elementary'); }
  finally { restore(); }
}, 500000);
it('combines Schultz’s rationally dependent residues before testing divisors', () => {
  const observations: Record<string, unknown> = {};
  function observed<T>(stage: string, run: (ctx: ReturnType<typeof fresh>) => T): T {
    const ctx = fresh(), before = process.memoryUsage(), start = performance.now(), value = run(ctx), after = process.memoryUsage();
    observations[stage] = {milliseconds: performance.now() - start, ...ctx.usage, heap: after.heapUsed, rss: after.rss, heapDelta: after.heapUsed - before.heapUsed, rssDelta: after.rss - before.rss};
    process.stdout.write(JSON.stringify({fixture: 'Schultz dependent residues', stage, observation: observations[stage]}) + '\n'); return value;
  }
  const b = quadratic([1n, 0n, 0n, 1n]), f = b.owner, curve = certifyAlgebraicCurve(b.ctx, f, certifyAlgebraicConstantField(b.ctx, f, bounds), bounds);
  const polynomial = (cs: readonly bigint[]) => f.embed(b.ctx, b.field.make(b.ctx, b.ring.make(b.ctx, cs.map(n => b.q(n))), b.ring.one(b.ctx)));
  const input = f.exactDivide(b.ctx, polynomial([4n, 8n, -20n, 6n]), f.multiply(b.ctx, f.multiply(b.ctx, polynomial([-1n, 2n]), polynomial([1n, 0n, -2n, 1n])), b.a));
  const proof = observed('integration', ctx => integrateAlgebraic(ctx, curve, input, bounds)); expect(proof.kind).toBe('elementary');
  if (proof.kind === 'elementary') {
    expect(proof.relations.basis.length).toBe(1); expect(proof.relations.splitting.splitting.target.ring.degree(b.ctx, proof.relations.splitting.splitting.target.modulus)).toBe(2);
    expect(proof.relations.splitting.residues.entries.some(p => p.place.degree === 2n)).toBe(true);
    expect(proof.logarithms.components[0].torsion.kind).toBe('torsion');
  }
  observed('verification', ctx => verifyAlgebraicDecision(ctx, curve, input, proof, bounds));
  const data = observed('encoding', ctx => encodeAlgebraicDecision(ctx, curve, input, proof, bounds)), bytes = Buffer.byteLength(JSON.stringify(data)); expect(bytes).toBeLessThanOrEqual(bounds.artifactBytes);
  const restore = disableAlgebraicIntegrationProducers();
  try { const decoded = observed('decoding', ctx => decodeAlgebraicDecision(ctx, curve, input, structuredClone(data), bounds)); expect(decoded.kind).toBe('elementary'); observed('replayVerification', ctx => verifyAlgebraicDecision(ctx, curve, input, decoded, bounds)); }
  finally { restore(); }
  writeFileSync('.task_tmp/2026-10-13__integration-algebraic-decision1/gate-b-dependent-residue-observation.json', JSON.stringify({fixture: 'Schultz dependent residue integral', bytes, observations}, null, 2));
}, 1800000);
