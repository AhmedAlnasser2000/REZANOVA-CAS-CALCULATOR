import {afterEach, expect, it, vi} from 'vitest';
import {executeIntegration} from './service';
import {DEFAULT_INTEGRATION_LIMITS as limits} from './types';
import * as normalization from '../../symbolic-engine/integration/core/exponential-normalization';
import * as rational from '../../symbolic-engine/integration/core/rational-decision';
import * as exponential from '../../symbolic-engine/integration/core/exponential-rational-decision';
import * as admission from '../../symbolic-engine/integration/core/differential-admission';
import * as derivative from '../../symbolic-engine/integration/core/differential-derivative';
import * as wire from '../../symbolic-engine/integration/core/rational-decision-wire';
import {ArtifactExportTooLarge} from '../../symbolic-engine/integration/core/artifact-bounds';
afterEach(() => vi.restoreAllMocks());
const request = (body: string) => ({source: `\\int ${body}\\,dx`, limits});
it.each(['e^x', 'e^{x^2}', '\\frac{1}{e^x+x}', '\\frac{1}{x^2+1}'])('opens current artifact for %s with producers disabled', body => {
  const saved = executeIntegration({request: request(body)}); expect(saved.artifact).toBeDefined();
  const forbidden = () => {throw new Error('producer invoked during replay');};
  vi.spyOn(normalization, 'normalizeExponentialExpression').mockImplementation(forbidden);
  vi.spyOn(rational, 'integrateRational').mockImplementation(forbidden);
  vi.spyOn(exponential, 'integrateExponentialRational').mockImplementation(forbidden);
  vi.spyOn(admission, 'buildExponential').mockImplementation(forbidden);
  vi.spyOn(derivative, 'differentiate').mockImplementation(forbidden);
  const replay = executeIntegration({request: request(''), artifact: saved.artifact, action: 'open'});
  expect(replay.document, JSON.stringify(replay.document)).toEqual(saved.document);
});
it('only export bytes preserve a verified answer', () => {
  vi.spyOn(wire, 'encodeRationalDecision').mockImplementation(() => {throw new ArtifactExportTooLarge('Derivation export exceeds 16 MiB.');});
  const result = executeIntegration({request: request('1')});
  expect(result.document.primary?.kind).toBe('rational-antiderivative'); expect(result.exportUnavailable).toContain('16 MiB'); expect(result.artifact).toBeUndefined();
  vi.mocked(wire.encodeRationalDecision).mockImplementation(ctx => ctx.exhaust('work'));
  expect(executeIntegration({request: request('1')}).document.title).toBe('Execution limit reached');
});
it('rejects changed source, normalization evidence, correspondence and decision conditions', () => {
  const saved = executeIntegration({request: request('e^{x+1}')});
  type Envelope = {request: {source: string}; normalization: {evidence: {basis: {coordinates: unknown[]}}};
    correspondence: {evidence: {classification: {value: unknown}}}; decision: {evidence: {conditions: unknown[]}}};
  for (const mutate of [
    (v: Envelope) => {v.request.source = '\\int e^x\\,dx';},
    (v: Envelope) => {v.normalization.evidence.basis.coordinates = [];},
    (v: Envelope) => {v.correspondence.evidence.classification.value = null;},
    (v: Envelope) => {v.decision.evidence.conditions = [];},
  ]) {
    const data = JSON.parse(saved.artifact!); mutate(data);
    expect(executeIntegration({request: saved.request, artifact: JSON.stringify(data), action: 'open'}).document.outcomeKind).toBe('error');
  }
});
