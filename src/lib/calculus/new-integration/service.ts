import { ExecutionContext, AlgebraError, demand } from '../../symbolic-engine/integration/core/execution';
import { produceCompactRationalCandidateWithin, checkCompactRationalCandidateWithin } from '../../symbolic-engine/integration/core/rational-elementary-evidence';
import { produceCompactExponentialCandidateWithin, checkCompactExponentialCandidateWithin } from '../../symbolic-engine/integration/core/first-level-elementary-evidence';
import { normalizeExponentialExpression } from '../../symbolic-engine/integration/core/exponential-normalization';
import { inspectExactArtifact } from '../../symbolic-engine/integration/core/artifact-bounds';
import { presentIntegrationCandidate } from '../../result-contract/integration-presentation';
import { integrationError } from './error';
import { UnsupportedIntegral } from './lowering';
import { lowerExponentialIntegral, INTEGRATION_BOUNDS } from './exponential-lowering';
import { constructExecutionInput } from './execution-input';
import { produceCorrespondence } from './correspondence';
import { readEnvelope, replaySaved, exportSaved, type ExecutionDecision } from './artifact';
import { rationalDecisionResultWithin, projectRationalCandidateWithin } from './result';
import { exponentialDecisionResultWithin, projectExponentialCandidateWithin } from './exponential-result';
import { validIntegrationLimits, type IntegrationJob, type IntegrationResponse, type IntegrationPreview } from './types';

export interface PendingIntegration {
  response: IntegrationResponse;
  /** The native computation/context never crosses the worker boundary. */
  exportArtifact?: () => Pick<IntegrationResponse, 'artifact' | 'exportUnavailable' | 'usage' | 'timings'>;
}
function failure(job: IntegrationJob, error: unknown, started: number, ctx: ExecutionContext | undefined, stage: 'solve' | 'verify'): IntegrationResponse {
  const message = error instanceof Error ? error.message : String(error);
  const title = error instanceof UnsupportedIntegral ? 'Unsupported structure' : error instanceof AlgebraError
    ? error.code === 'resource-limit' ? 'Execution limit reached' : error.code === 'verification-failed' ? 'Verification failed' : 'Invalid input' : undefined;
  return {document: integrationError(message, title), request: job.request, elapsedMs: performance.now() - started,
    usage: ctx?.usage ?? {work: 0, allocation: 0}, checks: [], failedStage: stage,
    ...(error instanceof AlgebraError && error.code === 'resource-limit' ? {stop: error.reason} : {})};
}
/** Solve -> publish -> independently check -> project. Export is a later operation
 * on the SAME cumulative context. Each public mathematical operation starts cold. */
export function startIntegration(job: IntegrationJob, onCandidate?: (preview: IntegrationPreview) => void): PendingIntegration {
  const started = performance.now(); let ctx: ExecutionContext | undefined, stage: 'solve' | 'verify' = 'solve';
  try {
    demand(validIntegrationLimits(job.request.limits), 'invalid-input', 'invalid execution limits');
    ctx = new ExecutionContext(job.request.limits); const context = ctx;
    return context.operation(() => {
      const constructionStarted = performance.now(), saved = job.artifact === undefined ? undefined : readEnvelope(context, job.artifact);
      const sourceText = job.action === 'open' && saved ? saved.request.source : job.request.source;
      const lowered = lowerExponentialIntegral(context, sourceText), request = Object.freeze({source: sourceText, limits: Object.freeze({...job.request.limits})});
      let result: ExecutionDecision, normalization;
      let retained: {decision: unknown; correspondence: unknown} | undefined;
      const timings: NonNullable<IntegrationResponse['timings']> = {};
      if (saved) {
        stage = 'verify'; const replay = replaySaved(context, saved, lowered.base);
        if (job.action === 'open') {
          normalization = replay.normalization; retained = {decision: saved.raw.decision, correspondence: saved.raw.correspondence};
        } else {
          normalization = normalizeExponentialExpression(context, lowered.base, lowered.input, INTEGRATION_BOUNDS);
          retained = {decision: saved.raw.decision, correspondence: produceCorrespondence(context, lowered.base, normalization.classification, replay.target)};
        }
        result = replay.result; timings.verification = performance.now() - constructionStarted;
      } else {
        normalization = normalizeExponentialExpression(context, lowered.base, lowered.input, INTEGRATION_BOUNDS);
        const execution = constructExecutionInput(context, lowered.base, lowered.native, normalization.classification);
        timings.construction = performance.now() - constructionStarted;
        const source = {owner: lowered.base, input: lowered.input, normalization, bounds: INTEGRATION_BOUNDS};
        const candidate = execution.kind === 'rational'
          ? {kind: 'rational' as const, execution, value: produceCompactRationalCandidateWithin(context, execution.owner, execution.input)}
          : {kind: 'exponential' as const, execution, value: produceCompactExponentialCandidateWithin(context, execution.owner, execution.input, INTEGRATION_BOUNDS)};
        if (onCandidate) {
          const primary = candidate.kind === 'rational'
            ? projectRationalCandidateWithin(context, candidate.execution.owner, candidate.execution.input, candidate.value, [], source)
            : projectExponentialCandidateWithin(context, candidate.execution.owner, candidate.execution.input, candidate.value, source);
          const shown = presentIntegrationCandidate(primary);
          demand(shown !== undefined, 'verification-failed', 'candidate representation unavailable');
          const full = shown.expanded(), preview: IntegrationPreview = {request, elapsedMs: performance.now() - started, usage: context.usage,
            presentation: {compact: shown.compact, full, copy: shown.copy(), negative: !!shown.negative, terms: shown.terms,
              conditions: shown.conditions, originals: shown.originals,
              ...(shown.generatorDefinition ? {generatorDefinition: shown.generatorDefinition} : {}),
              ...(shown.fallbackDefinition ? {fallbackDefinition: shown.fallbackDefinition} : {}),
              ...(shown.expansionUnavailable() ? {expansionUnavailable: shown.expansionUnavailable()} : {})}};
          // Exact-artifact traversal bounds the mathematical presentation. Timing
          // observations are finite floating-point values, not exact coefficients.
          inspectExactArtifact(context, INTEGRATION_BOUNDS, {request, presentation:preview.presentation, usage:preview.usage});
          context.allocate(4); preview.usage = Object.freeze(context.usage);
          for (const term of preview.presentation.terms) Object.freeze(term);
          for (const condition of [...preview.presentation.conditions, ...preview.presentation.originals]) {Object.freeze(condition.origins);Object.freeze(condition);}
          Object.freeze(preview.presentation.terms);Object.freeze(preview.presentation.conditions);Object.freeze(preview.presentation.originals);
          Object.freeze(preview.presentation);Object.freeze(preview);
          onCandidate(preview);
        }
        timings.candidate = performance.now() - started; stage = 'verify'; const checkStarted = performance.now();
        result = candidate.kind === 'rational'
          ? {kind: 'rational', execution: candidate.execution, decision: checkCompactRationalCandidateWithin(context, candidate.execution.owner, candidate.execution.input, candidate.value)}
          : {kind: 'exponential', execution: candidate.execution, decision: checkCompactExponentialCandidateWithin(context, candidate.execution.owner, candidate.execution.input, candidate.value, INTEGRATION_BOUNDS)};
        timings.verification = performance.now() - checkStarted;
      }
      stage = 'verify'; const projectionStarted = performance.now();
      const source = {owner: lowered.base, input: lowered.input, normalization, bounds: INTEGRATION_BOUNDS, correspondence: retained?.correspondence};
      const document = result.kind === 'rational'
        ? rationalDecisionResultWithin(context, result.execution.owner, result.execution.input, result.decision, [], source)
        : exponentialDecisionResultWithin(context, result.execution.owner, result.execution.input, result.decision, INTEGRATION_BOUNDS, source);
      timings.projection = performance.now() - projectionStarted; context.allocate(8);
      const response: IntegrationResponse = {document, request, elapsedMs: performance.now() - started, usage: context.usage, timings,
        checks: ['Exact source lowering and exclusions', 'Checked exponential normalization and complete coverage',
          result.kind === 'rational' ? 'Checked formal rational primitive' : result.decision.kind === 'elementary' ? 'Certified exponential construction and primitive' : 'Certified exponential construction and complete reduction decision',
          result.kind === 'exponential' && result.decision.kind === 'non-elementary' ? result.decision.obstruction === 'nonconstant-residue' ? 'Checked nonconstant normal residue obstruction' : 'Complete negative Laurent-component rational RDE certificate' : 'Complete derivative identity',
          'Retained conditions', 'Exact result conversion and authority']};
      return {response, exportArtifact: () => {
        const exportStarted = performance.now();
        try {
          const exported = context.operation(() => exportSaved(context, request, source, result, retained));
          return {...exported, usage: context.usage, timings: {...timings, export: performance.now() - exportStarted}};
        } catch (error) {
          return {exportUnavailable: error instanceof Error ? error.message : String(error), usage: context.usage,
            timings: {...timings, export: performance.now() - exportStarted}};
        }
      }};
    });
  } catch (error) {return {response: failure(job, error, started, ctx, stage)};}
}
/** Strict synchronous compatibility, including saved-problem replay. */
export function executeIntegration(job: IntegrationJob): IntegrationResponse {
  const pending = startIntegration(job);
  return pending.exportArtifact ? {...pending.response, ...pending.exportArtifact()} : pending.response;
}
