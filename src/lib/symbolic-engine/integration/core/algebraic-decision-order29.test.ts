import { it, expect } from 'vitest';
import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { fresh, bounds } from './__tests__/algebraic-support';
import { orderTwentyNineDivisor } from './__tests__/algebraic-divisor-support';
import { disableAlgebraicIntegrationProducers } from './__tests__/algebraic-integration-producers';
import { integrateAlgebraic, verifyAlgebraicDecision } from './algebraic-decision';
import { encodeAlgebraicDecision, decodeAlgebraicDecision } from './algebraic-decision-wire';

it('constructs and independently replays the sourced order-29 logarithmic integral', () => {
  const observations: Record<string, unknown> = {};
  function observed<T>(stage: string, run: (ctx: ReturnType<typeof fresh>) => T): T {
    const ctx = fresh(), before = process.memoryUsage(), start = performance.now(), value = run(ctx), after = process.memoryUsage();
    observations[stage] = {milliseconds: performance.now() - start, ...ctx.usage, heap: after.heapUsed, rss: after.rss, heapDelta: after.heapUsed - before.heapUsed, rssDelta: after.rss - before.rss};
    process.stdout.write(JSON.stringify({fixture: 'algebraicIntegrationOrder29', stage, observation: observations[stage]}) + '\n'); return value;
  }
  const b = orderTwentyNineDivisor(), f = b.owner, p = b.field.make(b.ctx, b.ring.make(b.ctx, [-3n, 18n, 29n].map(n => b.q(n))), b.ring.one(b.ctx)), input = f.exactDivide(b.ctx, f.embed(b.ctx, p), b.a);
  const proof = observed('integration', ctx => integrateAlgebraic(ctx, b.curve, input, bounds)); expect(proof.kind).toBe('elementary');
  if (proof.kind === 'elementary') {
    expect(proof.relations.basis.length).toBe(1); const component = proof.logarithms.components[0]; expect('order' in component.torsion && component.torsion.order).toBe(29n);
    if ('principal' in component.torsion && component.torsion.principal.kind === 'principal') {
      // Independent polynomial Pell norm identity; no published/OCR formula is trusted.
      const g = component.torsion.principal.witness as typeof b.a, r = f.ring, a = g.representative.coefficients;
      const conjugate = f.make(b.ctx, r.make(b.ctx, [a[0], b.field.negate(b.ctx, a[1] ?? b.field.fromInteger(b.ctx, 0n))])), norm = f.multiply(b.ctx, g, conjugate).representative;
      expect(r.degree(b.ctx, norm)).toBe(0); const scalar = norm.coefficients[0]; expect(b.field.ring.degree(b.ctx, scalar.numerator)).toBe(0); expect(b.field.isZero(b.ctx, scalar)).toBe(false);
    }
  }
  observed('verification', ctx => verifyAlgebraicDecision(ctx, b.curve, input, proof, bounds));
  const data = observed('encoding', ctx => encodeAlgebraicDecision(ctx, b.curve, input, proof, bounds)), bytes = Buffer.byteLength(JSON.stringify(data)); expect(bytes).toBeLessThanOrEqual(bounds.artifactBytes);
  const restore = disableAlgebraicIntegrationProducers();
  try { const decoded = observed('decoding', ctx => decodeAlgebraicDecision(ctx, b.curve, input, structuredClone(data), bounds)); expect(decoded.kind).toBe('elementary'); observed('replayVerification', ctx => verifyAlgebraicDecision(ctx, b.curve, input, decoded, bounds)); }
  finally { restore(); }
  writeFileSync('.task_tmp/2026-10-13__integration-algebraic-decision1/gate-b-order29-observation.json', JSON.stringify({fixture: 'Schultz order-29 integral', bytes, observations}, null, 2));
}, 1800000);
