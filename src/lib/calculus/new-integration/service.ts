import { ExecutionContext, AlgebraError, demand } from '../../symbolic-engine/integration/core/execution';
import { integrateRational } from '../../symbolic-engine/integration/core/rational-decision';
import { encodeRationalDecision, decodeRationalDecision } from '../../symbolic-engine/integration/core/rational-decision-wire';
import { integrationError } from './error';
import { lowerIntegral, UnsupportedIntegral } from './lowering';
import { rationalDecisionResult } from './result';
import { MAX_INTEGRATION_ARTIFACT_BYTES, boundedSource, validIntegrationLimits, type IntegrationJob, type IntegrationResponse } from './types';

/** Worker-owned entry. One cumulative context includes exact lowering, proof and projection. */
export function executeIntegration(job: IntegrationJob): IntegrationResponse {
  const started = performance.now();
  let ctx: ExecutionContext | undefined;
  try {
    demand(validIntegrationLimits(job.request.limits), 'invalid-input', 'invalid execution limits');
    ctx = new ExecutionContext(job.request.limits);
    const context = ctx;
    return context.operation(() => {
      let saved: {source: string; decision: unknown} | undefined;
      if (job.artifact !== undefined) {
        demand(job.artifact.length <= MAX_INTEGRATION_ARTIFACT_BYTES && new TextEncoder().encode(job.artifact).length <= MAX_INTEGRATION_ARTIFACT_BYTES, 'resource-limit', 'artifact exceeds 16 MiB');
        context.allocate(job.artifact.length * 3); context.tick(job.artifact.length);
        const raw: unknown = JSON.parse(job.artifact);
        demand(raw !== null && typeof raw === 'object' && !Array.isArray(raw), 'invalid-input', 'invalid artifact');
        const a = raw as Record<string, unknown>;
        demand(Object.keys(a).sort().join(',') === 'decision,kind,request,version' && a.kind === 'new-integration' && a.version === 1, 'invalid-input', 'invalid artifact envelope');
        const req = a.request as Record<string, unknown>;
        demand(req !== null && typeof req === 'object' && Object.keys(req).sort().join(',') === 'limits,source' && boundedSource(req.source) && validIntegrationLimits(req.limits), 'invalid-input', 'invalid saved request');
        saved = {source: req.source, decision: a.decision};
      }
      const source = job.action === 'open' && saved ? saved.source : job.request.source;
      const lowered = lowerIntegral(context, source);
      let decision;
      if (saved) {
        const original = lowerIntegral(context, saved.source, lowered.owner);
        demand(lowered.owner.fractions.equal(context, original.input, lowered.input), 'verification-failed', 'saved integrand differs from current problem');
        decision = decodeRationalDecision(context, lowered.owner, original.input, saved.decision);
      } else decision = integrateRational(context, lowered.owner, lowered.input);
      const document = rationalDecisionResult(context, lowered.owner, lowered.input, decision, lowered.exclusions);
      const request = {source, limits: {...job.request.limits}};
      const wire = saved?.decision ?? encodeRationalDecision(context, lowered.owner, decision);
      const artifact = JSON.stringify({kind: 'new-integration', version: 1, request, decision: wire});
      context.allocate(artifact.length); demand(new TextEncoder().encode(artifact).length <= MAX_INTEGRATION_ARTIFACT_BYTES, 'resource-limit', 'derivation exceeds artifact size limit');
      return {document, request, artifact, elapsedMs: performance.now() - started, usage: context.usage,
        checks: ['Exact source lowering and exclusions', 'Hermite and LRT certificates', 'Complete derivative identity', 'Retained conditions', 'Exact result conversion and authority']};
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {document: integrationError(message, e instanceof UnsupportedIntegral ? 'Unsupported structure' : e instanceof AlgebraError && e.code === 'resource-limit' ? 'Execution limit reached' : undefined),
      request: job.request, elapsedMs: performance.now() - started, usage: ctx?.usage ?? {work: 0, allocation: 0}, checks: []};
  }
}
