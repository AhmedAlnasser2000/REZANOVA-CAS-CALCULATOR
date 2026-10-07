import { ExecutionContext, AlgebraError, demand } from '../../symbolic-engine/integration/core/execution';
import { integrateRational } from '../../symbolic-engine/integration/core/rational-decision';
import { integrateExponentialRational } from '../../symbolic-engine/integration/core/exponential-rational-decision';
import { normalizeExponentialExpression } from '../../symbolic-engine/integration/core/exponential-normalization';
import { integrationError } from './error';
import { UnsupportedIntegral } from './lowering';
import { lowerExponentialIntegral, INTEGRATION_BOUNDS } from './exponential-lowering';
import { constructExecutionInput } from './execution-input';
import { produceCorrespondence } from './correspondence';
import { readEnvelope, replaySaved, exportSaved, type ExecutionDecision } from './artifact';
import { rationalDecisionResult } from './result';
import { exponentialDecisionResult } from './exponential-result';
import { validIntegrationLimits, type IntegrationJob, type IntegrationResponse } from './types';

/** Worker-owned entry. One cumulative context includes lowering, normalization, proof and projection. */
export function executeIntegration(job: IntegrationJob): IntegrationResponse {
  const started = performance.now(); let ctx: ExecutionContext | undefined;
  try {
    demand(validIntegrationLimits(job.request.limits), 'invalid-input', 'invalid execution limits');
    ctx = new ExecutionContext(job.request.limits); const context = ctx;
    return context.operation(() => {
      const saved = job.artifact === undefined ? undefined : readEnvelope(context, job.artifact);
      const sourceText = job.action === 'open' && saved ? saved.request.source : job.request.source;
      const lowered = lowerExponentialIntegral(context, sourceText);
      let result: ExecutionDecision, normalization, retained;
      if (saved) {
        const replay = replaySaved(context, saved, lowered.base);
        if (job.action === 'open') {
          normalization = replay.normalization;
          retained = {decision: saved.raw.decision, correspondence: saved.raw.correspondence};
        } else {
          normalization = normalizeExponentialExpression(context, lowered.base, lowered.input, INTEGRATION_BOUNDS);
          retained = {decision: saved.raw.decision, correspondence: produceCorrespondence(context, lowered.base, normalization.classification, replay.target)};
        }
        result = replay.result;
      } else {
        normalization = normalizeExponentialExpression(context, lowered.base, lowered.input, INTEGRATION_BOUNDS);
        const execution = constructExecutionInput(context, lowered.base, lowered.native, normalization.classification);
        result = execution.kind === 'rational'
          ? {kind: 'rational', execution, decision: integrateRational(context, execution.owner, execution.input)}
          : {kind: 'exponential', execution, decision: integrateExponentialRational(context, execution.owner, execution.input, INTEGRATION_BOUNDS)};
      }
      const source = {owner: lowered.base, input: lowered.input, normalization, bounds: INTEGRATION_BOUNDS, correspondence: retained?.correspondence};
      const document = result.kind === 'rational'
        ? rationalDecisionResult(context, result.execution.owner, result.execution.input, result.decision, [], source)
        : exponentialDecisionResult(context, result.execution.owner, result.execution.input, result.decision, INTEGRATION_BOUNDS, source);
      const request = {source: sourceText, limits: {...job.request.limits}};
      const exported = exportSaved(context, request, source, result, retained);
      return {document, request, ...exported, elapsedMs: performance.now() - started, usage: context.usage,
        checks: ['Exact source lowering and exclusions', 'Checked exponential normalization and complete coverage',
          result.kind === 'rational' ? 'Hermite and LRT certificates' : 'Certified exponential construction and complete reduction decision',
          result.kind === 'exponential' && result.decision.kind === 'non-elementary' ? result.decision.obstruction === 'nonconstant-residue' ? 'Checked nonconstant normal residue obstruction' : 'Complete negative Laurent-component rational RDE certificate' : 'Complete derivative identity',
          'Retained conditions', 'Exact result conversion and authority']};
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const title = e instanceof UnsupportedIntegral ? 'Unsupported structure' : e instanceof AlgebraError
      ? e.code === 'resource-limit' ? 'Execution limit reached' : e.code === 'verification-failed' ? 'Verification failed' : 'Invalid input' : undefined;
    return {document: integrationError(message, title), request: job.request, elapsedMs: performance.now() - started,
      usage: ctx?.usage ?? {work: 0, allocation: 0}, checks: []};
  }
}
