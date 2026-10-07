import {describe, it, expect} from 'vitest';
import {executeIntegration} from './service';
import {DEFAULT_INTEGRATION_LIMITS as limits} from './types';
const run = (body: string, variable = 'x') => executeIntegration({request: {source: `\\int ${body}\\,d${variable}`, limits}});
describe('exponential integration worker pipeline', () => {
  it.each(['e^x', 'e^{-x}', '\\exp(x)', '\\frac{1}{1+e^x}', '\\frac{1}{(1+e^x)^2}', '\\frac{e^x}{1+e^{2x}}', '2xe^{x^2}', '\\frac{-e^{1/x}}{x^2}', 'e^{x+1}', '(e^{x/2})^2'])('decides and replays %s', body => {
    const r = run(body); expect(r.document.outcomeKind, JSON.stringify(r.document)).toBe('success'); expect(r.artifact).toBeDefined();
    const replay = executeIntegration({request: r.request, artifact: r.artifact, action: 'verify'});
    expect(replay.document, JSON.stringify(replay.document)).toEqual(r.document);
  }, 60_000);
  it.each(['e^{x^2}', '\\frac{e^x}{x}', '\\frac{1}{e^x+x}'])('proves non-elementarity of %s', body => {
    const r = run(body); expect(r.document.primary?.kind, JSON.stringify(r.document)).toBe('non-elementary');
    expect(executeIntegration({request: r.request, artifact: r.artifact, action: 'open'}).document).toEqual(r.document);
  }, 60_000);
  it('compares complete arguments through a common exponential family', () => {
    const r = run('e^x');
    const replay = executeIntegration({request: run('(e^{x/2})^2').request, artifact: r.artifact, action: 'verify'});
    expect(replay.document.outcomeKind, JSON.stringify(replay.document)).toBe('success');
    const exported = executeIntegration({request: replay.request, artifact: replay.artifact, action: 'open'});
    expect(exported.document).toEqual(replay.document);
    expect(executeIntegration({request: run('e^{x+1}').request, artifact: r.artifact, action: 'verify'}).document.outcomeKind).toBe('error');
  }, 60_000);
  it('cancels hidden independent-family factors, preserving their restrictions', () => {
    const r = run('\\frac{e^{2x}+e^x+e^xe^{x^2}+e^{x^2}}{e^x+e^{x^2}}');
    expect(r.document.outcomeKind, JSON.stringify(r.document)).toBe('success');
    expect(r.document.primary?.kind).toBe('exponential-antiderivative');
  }, 60_000);
  it('treats differential e as a variable', () => {
    expect(run('\\exp(e)', 'e').document.outcomeKind).toBe('success');
    expect(run('e^e', 'e').document.title).toBe('Unsupported structure');
  });
  it.each(['e^x+e^{x^2}', 'e^{e^x}', '2^x', '\\log(x)', 'e^1', '\\frac{1}{e^x-e^x}', '0^0'])('rejects unsupported or invalid %s', body => expect(run(body).document.outcomeKind).toBe('error'));
});
it.each(['\\frac{1}{x^2+1}+e^x', 'e^{x+1}+e^{2x+2}', '900719925474099312345e^x', 'e^{0.100000000000000005x}', 'e^1-e^1', '0e^{1/x}', '\\frac{e^x+e^{2x}+e^{x^2}+e^{x+x^2}+e^{x^3}+e^{x+x^3}}{e^x+e^{x^2}+e^{x^3}}'])('preserves exact mixed/canceled source %s', body => {
  const result = run(body); expect(result.document.outcomeKind, JSON.stringify(result.document)).toBe('success');
  expect(executeIntegration({request: result.request, artifact: result.artifact, action: 'open'}).document).toEqual(result.document);
}, 60_000);
