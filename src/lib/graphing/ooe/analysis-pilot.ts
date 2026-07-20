import type { OoeTraceEvent } from '../../ooe/bridge-schema/ooe-bridge';
import type { OoeJobContextOptions } from '../../ooe/job-launch/job-contract';
import { buildOoeInputRevisionId, buildOoeJobCommitContext } from '../../ooe/job-launch/job-contract';
import { runOoeRuntimeJob } from '../../ooe/runtime-control/runtime-coordinator';
import {
  buildCoarseLifecycleOoeTraceEvents,
  prepareOoePlanPreflight,
  type OoePilotStatus,
  type OoeRuntimeEnvelope,
  type OoeRuntimeMetadata,
} from '../../ooe/runtime-control/runtime-envelope';
import { buildOoeTraceEvent } from '../../ooe/runtime-control/trace';
import { buildOoeRuntimeShellEvidence, type OoeRuntimeShellEvidence } from '../../ooe/runtime-control/runtime-shell-contract';
import type { WorkspaceInstanceRuntimeContext } from '../../../types/calculator/workspace-instance-types';
import type { GraphAnalysisRequestV1, GraphAnalysisResultV1 } from '../contracts';
import {
  GRAPH_ANALYSIS_FALLBACK_HOST_ID,
  GRAPH_ANALYSIS_WORKER_HOST_ID,
  graphAnalysisApplicationHost,
  type GraphAnalysisApplicationHost,
  type GraphAnalysisHostExecution,
} from './analysis-application-host';

export const OOE_GRAPH_ANALYZE_PLAN_ID = 'plan.graph.analyze' as const;
export const OOE_GRAPH_ANALYZE_CAPABILITY_ID = 'graph.analyze' as const;
export const OOE_GRAPH_ANALYZE_NODE_ID = 'node.graph.analyze' as const;
export const OOE_GRAPH_ANALYZE_PHASE_ID = 'graph.analyze' as const;
export const OOE_GRAPH_ANALYZE_SHELL_ID = 'graph-analysis-worker-shell' as const;
type Definition = { planId: typeof OOE_GRAPH_ANALYZE_PLAN_ID; capabilityId: typeof OOE_GRAPH_ANALYZE_CAPABILITY_ID; hostId: typeof GRAPH_ANALYSIS_WORKER_HOST_ID; nodeId: typeof OOE_GRAPH_ANALYZE_NODE_ID; phaseId: typeof OOE_GRAPH_ANALYZE_PHASE_ID };
export type GraphAnalyzeOoePilotStatus = OoePilotStatus<typeof OOE_GRAPH_ANALYZE_PLAN_ID>;
export type GraphAnalyzeOoeOptions = Omit<OoeJobContextOptions, 'launchTicket'> & { host?: GraphAnalysisApplicationHost };
export type GraphAnalyzeOoeMetadata = OoeRuntimeMetadata<Definition, GraphAnalyzeOoePilotStatus> & { graphHostExecution: GraphAnalysisHostExecution; runtimeShell: OoeRuntimeShellEvidence };
export type GraphAnalyzeOoeRunResult = OoeRuntimeEnvelope<GraphAnalysisResultV1, GraphAnalyzeOoeMetadata>;

export function graphAnalyzePilotDefinition(): Definition {
  return { planId: OOE_GRAPH_ANALYZE_PLAN_ID, capabilityId: OOE_GRAPH_ANALYZE_CAPABILITY_ID, hostId: GRAPH_ANALYSIS_WORKER_HOST_ID, nodeId: OOE_GRAPH_ANALYZE_NODE_ID, phaseId: OOE_GRAPH_ANALYZE_PHASE_ID };
}
export function buildGraphAnalyzeOoeSnapshot(request: GraphAnalysisRequestV1) {
  return { workspaceInstanceId: request.workspaceInstanceId, documentId: request.documentId, revisions: { ...request.revisions }, itemIds: request.items.map((item) => item.itemId), features: [...request.features], numericWindow: request.numericWindow };
}
export function buildGraphAnalyzeInputRevisionId(request: GraphAnalysisRequestV1) {
  return buildOoeInputRevisionId(OOE_GRAPH_ANALYZE_CAPABILITY_ID, buildGraphAnalyzeOoeSnapshot(request));
}
export function prepareGraphAnalyzeOoePilot() { return prepareOoePlanPreflight(graphAnalyzePilotDefinition()); }
function workspace(request: GraphAnalysisRequestV1): WorkspaceInstanceRuntimeContext {
  return { workspaceInstanceId: request.workspaceInstanceId, workspaceInstanceLabel: 'Graph', workspaceInstanceRevision: request.revisions.mathematics, workspaceKind: 'graphing', compartmentId: 'graphing', compartmentLabel: 'Graphing' };
}
function statusMessage(status: GraphAnalyzeOoePilotStatus) {
  return status.kind === 'ready' ? 'OOE Graph analysis plan is available and valid.'
    : status.kind === 'unavailable' ? `OOE bridge unavailable: ${status.reason}.`
      : status.kind === 'missing-plan' ? 'OOE Graph analysis plan was not found.'
        : status.kind === 'invalid-plan' ? `OOE Graph analysis plan failed validation with ${status.errors.length} error(s).`
          : `OOE bridge error: ${status.message}`;
}
function traceEvents(input: { status: GraphAnalyzeOoePilotStatus; jobContext: ReturnType<typeof buildOoeJobCommitContext>; controlTraceEvents: readonly OoeTraceEvent[]; execution: GraphAnalysisHostExecution }) {
  const definition = graphAnalyzePilotDefinition();
  const cancelled = input.execution.terminalStatus === 'cancelled';
  const base = buildCoarseLifecycleOoeTraceEvents({ definition, status: input.status, job: input.jobContext.job, commitAssessment: input.jobContext.commitAssessment, preflightMessage: statusMessage(input.status), startedMessage: 'Graph analysis started through its application-level runtime shell.', finalMessage: 'Graph analysis produced typed feature evidence.' });
  const host = buildOoeTraceEvent({ ...definition, hostId: input.execution.hostId, jobId: input.jobContext.job.jobId, inputRevisionId: input.jobContext.job.inputRevisionId, status: cancelled ? 'cancelled' : 'provisionalReady', resultStability: cancelled ? 'stale' : 'provisional', commitDecision: 'notApplicable', message: input.execution.kind === 'worker' ? 'Graph analysis ran in its isolated worker.' : `Graph analysis used ${input.execution.hostId}.` });
  return cancelled ? [base[0], base[1], ...input.controlTraceEvents, host] : [base[0], base[1], ...input.controlTraceEvents, host, base[2]];
}

export async function runGraphAnalyzeWithOoe(request: GraphAnalysisRequestV1, options: GraphAnalyzeOoeOptions = {}): Promise<GraphAnalyzeOoeRunResult> {
  const definition = graphAnalyzePilotDefinition();
  const selectedWorkspace = options.workspaceInstance ?? workspace(request);
  if (selectedWorkspace.workspaceInstanceId !== request.workspaceInstanceId) throw new Error('Graph analysis workspace context must match the request workspace instance.');
  let execution: GraphAnalysisHostExecution | undefined;
  return runOoeRuntimeJob({
    definition,
    routeLabel: OOE_GRAPH_ANALYZE_CAPABILITY_ID,
    routeSnapshot: buildGraphAnalyzeOoeSnapshot(request),
    options: { activeInputRevisionId: options.activeInputRevisionId, commitPolicy: options.commitPolicy ?? 'commitLatestOnly', workspaceInstance: selectedWorkspace, isWorkspaceInstanceOpen: options.isWorkspaceInstanceOpen },
    cooperativeBudget: { sliceMs: 8 }, prepareStatus: prepareGraphAnalyzeOoePilot,
    run: async (context) => { const result = await (options.host ?? graphAnalysisApplicationHost).run(request, context); execution = result.hostExecution; return result.result; },
    buildMetadata: ({ status, jobContext, controlTraceEvents }) => {
      if (!execution) throw new Error('Graph analysis host completed without execution evidence.');
      const cancelled = execution.terminalStatus === 'cancelled';
      const commitAssessment = cancelled ? { ...jobContext.commitAssessment, legality: 'notApplicable' as const, commitDecision: 'notApplicable' as const, resultStability: 'stale' as const } : jobContext.commitAssessment;
      const runtimeShell = buildOoeRuntimeShellEvidence({ shellId: OOE_GRAPH_ANALYZE_SHELL_ID, capabilityId: OOE_GRAPH_ANALYZE_CAPABILITY_ID, primaryHostId: GRAPH_ANALYSIS_WORKER_HOST_ID, fallbackHostId: GRAPH_ANALYSIS_FALLBACK_HOST_ID, lifecycle: cancelled ? 'cancelled' : 'completed', hostExecution: execution });
      return { ...definition, status, job: jobContext.job, commitAssessment, ...(cancelled ? { completion: { kind: 'cancelled' as const, reason: execution.reason ?? 'Graph analysis cancelled.' } } : {}), graphHostExecution: execution, runtimeShell, traceEvents: traceEvents({ status, jobContext: { ...jobContext, commitAssessment }, controlTraceEvents, execution }) };
    },
    buildProvenance: ({ payload, metadata }) => ({ depth: 'coarse', mode: 'graphing', route: OOE_GRAPH_ANALYZE_CAPABILITY_ID, action: 'analyze', inputSummary: buildGraphAnalyzeOoeSnapshot(request), runtimeHost: metadata.graphHostExecution.hostId, runtimeShell: metadata.runtimeShell, commitDecision: metadata.commitAssessment.commitDecision, notes: [`Graph analysis ${payload.status}: ${payload.evidence.length} typed finding(s).`] }),
    buildFailureProvenance: ({ error }) => ({ depth: 'coarse', mode: 'graphing', route: OOE_GRAPH_ANALYZE_CAPABILITY_ID, action: 'analyze', inputSummary: buildGraphAnalyzeOoeSnapshot(request), runtimeHost: GRAPH_ANALYSIS_WORKER_HOST_ID, commitDecision: 'notApplicable', notes: [`Graph analysis failed: ${error instanceof Error ? error.message : String(error)}`] }),
  });
}
