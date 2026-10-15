import {it, expect, vi} from 'vitest';
import {base, fresh, bounds} from './__tests__/algebraic-support';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';
import {certifyAlgebraicPoleCoverageWithin, verifyAlgebraicPoleCoverageWithin} from './algebraic-pole-coverage';
import {constructAlgebraicCoveredResiduesWithin, verifyAlgebraicCoveredResiduesWithin} from './algebraic-covered-residues';
import {recordRationalGcdEvidence} from './rational-gcd-evidence';
import * as valuation from './algebraic-valuation';
import * as data from './algebraic-residue-data';

it('reuses only successful exact immutable producer obligations inside one operation', () => {
  const b = base(), f = b.field, curve = certifyAlgebraicCurve(b.ctx, f, certifyAlgebraicConstantField(b.ctx, f, bounds), bounds), input = f.inverse(b.ctx, b.x), ctx = fresh();
  const spy = vi.spyOn(valuation, 'verifyAlgebraicValuationWithin'), residues = vi.spyOn(data, 'verifyAlgebraicResidueDataWithin');
  try {
    const proof = ctx.operation(() => recordRationalGcdEvidence(ctx, () => {
      const p = certifyAlgebraicPoleCoverageWithin(ctx, curve, input, bounds), calls = spy.mock.calls.length, allocation = ctx.usage.allocation;
      verifyAlgebraicPoleCoverageWithin(ctx, curve, input, p, bounds); expect(spy.mock.calls.length).toBe(calls); expect(ctx.usage.allocation).toBeGreaterThan(allocation);
      expect(() => verifyAlgebraicPoleCoverageWithin(ctx, curve, b.x, p, bounds)).toThrow('verification-failed');
      verifyAlgebraicPoleCoverageWithin(ctx, curve, input, {...p}, bounds); expect(spy.mock.calls.length).toBeGreaterThan(calls);
      const q = constructAlgebraicCoveredResiduesWithin(ctx, curve, input, bounds, p), checked = residues.mock.calls.length;
      verifyAlgebraicCoveredResiduesWithin(ctx, curve, input, q, bounds); expect(residues.mock.calls.length).toBe(checked);
      verifyAlgebraicCoveredResiduesWithin(ctx, curve, input, {...q}, bounds); expect(residues.mock.calls.length).toBeGreaterThan(checked); return p;
    }).value);
    const calls = spy.mock.calls.length;
    ctx.operation(() => verifyAlgebraicPoleCoverageWithin(ctx, curve, input, proof, bounds)); expect(spy.mock.calls.length).toBeGreaterThan(calls);
    const first = fresh(); first.operation(() => verifyAlgebraicPoleCoverageWithin(first, curve, input, proof, bounds)); const cold = first.usage.work;
    first.operation(() => verifyAlgebraicPoleCoverageWithin(first, curve, input, proof, bounds)); expect(first.usage.work).toBe(2 * cold);
  } finally {spy.mockRestore(); residues.mockRestore();}
});
it('does not cache mutable bounds, failed data, or authority across a stricter budget', () => {
  const b = base(), f = b.field, curve = certifyAlgebraicCurve(b.ctx, f, certifyAlgebraicConstantField(b.ctx, f, bounds), bounds), input = f.inverse(b.ctx, b.x), ctx = fresh();
  ctx.operation(() => recordRationalGcdEvidence(ctx, () => {
    const p = certifyAlgebraicPoleCoverageWithin(ctx, curve, input, bounds), mutable = {...bounds}, spy = vi.spyOn(valuation, 'verifyAlgebraicValuationWithin');
    try {
      verifyAlgebraicPoleCoverageWithin(ctx, curve, input, p, mutable); const calls = spy.mock.calls.length;
      verifyAlgebraicPoleCoverageWithin(ctx, curve, input, p, mutable); expect(spy.mock.calls.length).toBeGreaterThan(calls);
      const bad = Object.freeze({...p, entries: Object.freeze([])}); for (let i = 0; i < 2; i++) expect(() => verifyAlgebraicPoleCoverageWithin(ctx, curve, input, bad, bounds)).toThrow('verification-failed');
      return p;
    } finally {spy.mockRestore();}
  }));
  const limited = fresh(); expect(() => limited.operation(() => {
    const p = certifyAlgebraicPoleCoverageWithin(limited, curve, input, bounds);
    verifyAlgebraicPoleCoverageWithin(limited, curve, input, p, Object.freeze({...bounds, towerHeight: 0}));
  })).toThrow('resource-limit'); expect(() => limited.tick()).toThrow('resource-limit');
});
