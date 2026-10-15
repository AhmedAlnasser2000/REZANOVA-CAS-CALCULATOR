import {afterEach, expect, it, vi} from 'vitest';
import {executeIntegration} from './service';
import {DEFAULT_INTEGRATION_LIMITS as limits} from './types';
import * as normalization from '../../symbolic-engine/integration/core/exponential-normalization';
import * as rational from '../../symbolic-engine/integration/core/rational-decision';
import * as exponential from '../../symbolic-engine/integration/core/exponential-rational-decision';
import * as admission from '../../symbolic-engine/integration/core/differential-admission';
import * as derivative from '../../symbolic-engine/integration/core/differential-derivative';
import * as wire from '../../symbolic-engine/integration/core/rational-elementary-wire';
import * as compact from '../../symbolic-engine/integration/core/rational-elementary-evidence';
import {encodeRationalDecision} from '../../symbolic-engine/integration/core/rational-decision-wire';
import {ExecutionContext} from '../../symbolic-engine/integration/core/execution';
import {lowerIntegral} from './lowering';
import {encodeExponentialRationalDecision} from '../../symbolic-engine/integration/core/exponential-rational-wire';
import * as firstLevel from '../../symbolic-engine/integration/core/first-level-elementary-evidence';
import {lowerExponentialIntegral, INTEGRATION_BOUNDS} from './exponential-lowering';
import {constructExecutionInput} from './execution-input';
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
  vi.spyOn(wire, 'encodeCompactRationalElementaryWithin').mockImplementation(() => {throw new ArtifactExportTooLarge('Derivation export exceeds 16 MiB.');});
  const result = executeIntegration({request: request('1')});
  expect(result.document.primary?.kind).toBe('rational-antiderivative'); expect(result.exportUnavailable).toContain('16 MiB'); expect(result.artifact).toBeUndefined();
  vi.mocked(wire.encodeCompactRationalElementaryWithin).mockImplementation(ctx => ctx.exhaust('work'));
  const stopped = executeIntegration({request: request('1')});
  expect(stopped.document.primary?.kind).toBe('rational-antiderivative');
  expect(stopped.exportUnavailable).toContain('work');
});
it('writes compact rational positives and opens retained version-one evidence without solving', () => {
  const saved = executeIntegration({request: request('\\frac{1}{x^2+1}')});
  const raw = JSON.parse(saved.artifact!);
  expect(raw.version).toBe(2); expect(raw.decision.evidence.version).toBe(2);
  expect(raw.decision.evidence).not.toHaveProperty('hermite');
  const ctx = new ExecutionContext(limits), input = lowerIntegral(ctx, saved.request.source);
  const legacy = encodeRationalDecision(ctx, input.owner, rational.integrateRational(ctx, input.owner, input.input));
  const old = JSON.stringify({...raw, decision: {kind: 'rational', evidence: legacy}});
  const forbidden = () => {throw Error('producer invoked during saved rational replay');};
  vi.spyOn(normalization, 'normalizeExponentialExpression').mockImplementation(forbidden);
  vi.spyOn(rational, 'integrateRational').mockImplementation(forbidden);
  vi.spyOn(compact, 'produceCompactRationalCandidateWithin').mockImplementation(forbidden);
  vi.spyOn(compact, 'checkCompactRationalCandidateWithin').mockImplementation(forbidden);
  for (const artifact of [saved.artifact, old]) {
    const replay = executeIntegration({request: request(''), artifact, action: 'open'});
    expect(replay.document).toEqual(saved.document);
  }
});
it('writes compact exponential positives and retains original version-one replay', () => {
  const saved = executeIntegration({request: request('e^x')}), raw = JSON.parse(saved.artifact!);
  expect(raw.decision.evidence.version).toBe(2); expect(raw.decision.evidence).not.toHaveProperty('hermite');
  const ctx = new ExecutionContext(limits), original = lowerExponentialIntegral(ctx, saved.request.source), normalized = normalization.normalizeExponentialExpression(ctx, original.base, original.input, INTEGRATION_BOUNDS), native = constructExecutionInput(ctx, original.base, original.native, normalized.classification);
  if (native.kind !== 'exponential') throw Error('known exponential classification');
  const legacy = encodeExponentialRationalDecision(ctx, native.owner, native.input, exponential.integrateExponentialRational(ctx, native.owner, native.input, INTEGRATION_BOUNDS), INTEGRATION_BOUNDS), old = JSON.stringify({...raw, decision: {kind: 'exponential', evidence: legacy}});
  const forbidden = () => {throw Error('producer invoked during saved exponential replay');};
  vi.spyOn(normalization, 'normalizeExponentialExpression').mockImplementation(forbidden);
  vi.spyOn(exponential, 'integrateExponentialRational').mockImplementation(forbidden);
  vi.spyOn(firstLevel, 'produceCompactExponentialCandidateWithin').mockImplementation(forbidden);
  vi.spyOn(firstLevel, 'checkCompactExponentialCandidateWithin').mockImplementation(forbidden);
  vi.spyOn(admission, 'buildExponential').mockImplementation(forbidden);
  for (const artifact of [saved.artifact, old]) expect(executeIntegration({request: request(''), artifact, action: 'open'}).document).toEqual(saved.document);
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
