import oldDecision from '../../symbolic-engine/integration/core/__tests__/fixtures/rational-decision-v1-3a96622c.json';
import { describe, it, expect } from 'vitest';
import { executeIntegration } from './service';
import { DEFAULT_INTEGRATION_LIMITS as limits } from './types';
import { ExecutionContext } from '../../symbolic-engine/integration/core/execution';
import { lowerIntegral } from './lowering';
const run = (body: string) => executeIntegration({request: {source: `\\int ${body}\\,dx`, limits}});
describe('New Integration exact requests', () => {
  it.each(['x/x', '\\frac{0}{x-1}', '\\frac{1}{x/x}', '(x-1)^{-2}'])('retains source exclusions for %s', body => {
    const ctx = new ExecutionContext(limits);
    const r = lowerIntegral(ctx, `\\int ${body}\\,dx`); expect(r.exclusions.length).toBeGreaterThan(0);
    expect(run(body).document.outcomeKind).toBe('success');
  });
  it.each(['\\int \\theta\\,d\\theta', '\\int x_1\\,dx_1', '\\int C\\,dC'])('binds the explicit differential in %s', source => {
    expect(executeIntegration({request: {source, limits}}).document.outcomeKind).toBe('success');
  });
  it('parses exact decimals and huge integers without machine rounding', () => {
    const r = lowerIntegral(new ExecutionContext(limits), '\\int 0.100000000000000005\\,dx');
    expect(r.input.numerator.coefficients[0]).toMatchObject({numerator: 20000000000000001n, denominator: 200000000000000000n});
    expect(run('900719925474099312345').document.outcomeKind).toBe('success');
  });
  it.each(['x', '\\int x', '\\int_0^1 x\\,dx', '\\int x\\,dx+\\int x\\,dx', '\\int \\sin x\\,dx', '\\int ax\\,dx', '\\int \\int x\\,dx\\,dx'])('rejects unsupported source %s', source => {
    expect(executeIntegration({request: {source, limits}}).document.outcomeKind).toBe('error');
  });
  it.each(['\\frac{1}{x-x}', '0^0', '\\frac{0}{0}'])('rejects undefined source %s', body => expect(run(body).document.outcomeKind).toBe('error'));
  it.each(['0', '3', 'x^3', '\\frac{1}{x^2+1}', '\\frac{x}{x^2-1}', '\\frac{1}{(x^2+1)^2}', '\\frac{1}{x^4+1}', '\\frac{5x^4-1}{x^5-x-1}', '\\frac{1}{x}+\\frac{3}{x-1}-\\frac{1}{x-2}', '\\frac{1}{x^5-x-1}'])('integrates and replays %s', body => {
    const result = run(body); expect(result.document.outcomeKind, JSON.stringify(result.document)).toBe('success');
    const replay = executeIntegration({request: result.request, artifact: result.artifact, action: 'verify'});
    expect(replay.document).toEqual(result.document);
  }, 30_000);
  it('uses current source exclusions when verifying equivalent normalized inputs', () => {
    const saved = run('1');
    const current = executeIntegration({request: {source: '\\int x/x\\,dx', limits}, artifact: saved.artifact, action: 'verify'});
    expect(current.document.outcomeKind).toBe('success'); expect(current.document.supplements?.length).toBe(3);
    const bad = executeIntegration({request: {source: '\\int x\\,dx', limits}, artifact: saved.artifact, action: 'verify'});
    expect(bad.document.outcomeKind).toBe('error');
    const open = executeIntegration({request: {source: '', limits}, artifact: saved.artifact, action: 'open'});
    expect(open.request.source).toBe(saved.request.source);
  });
  it('replays the unchanged baseline decision in a request envelope with fresh limits', () => {
    const request = {source: '\\int \\frac{1}{x^5-x-1}\\,dx', limits};
    const artifact = JSON.stringify({kind: 'new-integration', version: 1, request: {...request, limits: {...limits, work: 0}}, decision: oldDecision});
    const replay = executeIntegration({request, artifact, action: 'verify'});
    expect(replay.document.outcomeKind, JSON.stringify(replay.document)).toBe('success');
    expect(executeIntegration({request: {...request, limits: {...limits, work: 100}}, artifact, action: 'verify'}).document.title).toBe('Execution limit reached');
  });
  it('rejects oversized and malformed nested artifacts before returning success', () => {
    const request = {source: '\\int x\\,dx', limits};
    for (const artifact of ['x'.repeat(16 * 1024 * 1024 + 1), '{', JSON.stringify({kind: 'new-integration', version: 1, request, decision: {primitive: {terms: [null]}}})]) {
      expect(executeIntegration({request, artifact, action: 'verify'}).document.outcomeKind).toBe('error');
    }
  });
  it('rejects tampered artifacts, limits and oversized requests', () => {
    const saved = run('1'), raw = JSON.parse(saved.artifact!); raw.decision.conditions = {};
    expect(executeIntegration({request: saved.request, artifact: JSON.stringify(raw), action: 'verify'}).document.outcomeKind).toBe('error');
    expect(executeIntegration({request: {...saved.request, limits: {...limits, work: 5}}}).document.title).toBe('Execution limit reached');
    expect(executeIntegration({request: {source: 'x'.repeat(65537), limits}}).document.outcomeKind).toBe('error');
  });
});
