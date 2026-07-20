import type { OoeTraceEvent } from '../../ooe/bridge-schema/ooe-bridge';
import type { OoeJobContextOptions } from '../../ooe/job-launch/job-contract';
import {
  buildOoeInputRevisionId,
  buildOoeJobCommitContext,
} from '../../ooe/job-launch/job-contract';
import {
  runOoeRuntimeJob,
} from '../../ooe/runtime-control/runtime-coordinator';
import {
  buildCoarseLifecycleOoeTraceEvents,
  prepareOoePlanPreflight,
  type OoePilotStatus,
  type OoeRuntimeEnvelope,
  type OoeRuntimeMetadata,
} from '../../ooe/runtime-control/runtime-envelope';
import { buildOoeTraceEvent } from '../../ooe/runtime-control/trace';
import {
  buildOoeRuntimeShellEvidence,
  type OoeRuntimeShellEvidence,
} from '../../ooe/runtime-control/runtime-shell-contract';
import type { WorkspaceInstanceRuntimeContext } from '../../../types/calculator/workspace-instance-types';
import type { GraphSampleRequestV6, GraphSampleResultV6 } from '../contracts';
import { releaseGraphSampleResultBuffers } from '../sampling/request';
import {
  GRAPH_SAMPLE_FALLBACK_HOST_ID,
  GRAPH_SAMPLE_WORKER_HOST_ID,
  graphSamplingApplicationHost,
  type GraphSamplingApplicationHost,
  type GraphSamplingHostExecution,
} from './application-host';

export const OOE_GRAPH_SAMPLE_PLAN_ID = 'plan.graph.sample' as const;
export const OOE_GRAPH_SAMPLE_CAPABILITY_ID = 'graph.sample' as const;
export const OOE_GRAPH_SAMPLE_NODE_ID = 'node.graph.sample' as const;
export const OOE_GRAPH_SAMPLE_PHASE_ID = 'graph.sample' as const;
export const OOE_GRAPH_SAMPLE_SHELL_ID = 'graph-sampling-worker-shell' as const;

type GraphSamplePilotDefinition = {
  planId: typeof OOE_GRAPH_SAMPLE_PLAN_ID;
  capabilityId: typeof OOE_GRAPH_SAMPLE_CAPABILITY_ID;
  hostId: typeof GRAPH_SAMPLE_WORKER_HOST_ID;
  nodeId: typeof OOE_GRAPH_SAMPLE_NODE_ID;
  phaseId: typeof OOE_GRAPH_SAMPLE_PHASE_ID;
};

export type GraphSampleOoePilotStatus = OoePilotStatus<typeof OOE_GRAPH_SAMPLE_PLAN_ID>;
export type GraphSampleOoeOptions = Omit<OoeJobContextOptions, 'launchTicket'> & {
  host?: GraphSamplingApplicationHost;
};

export type GraphSampleOoePilotMetadata = OoeRuntimeMetadata<
  GraphSamplePilotDefinition,
  GraphSampleOoePilotStatus
> & {
  graphHostExecution: GraphSamplingHostExecution;
  runtimeShell: OoeRuntimeShellEvidence;
  releasedBufferBytes: number;
};

export type GraphSampleOoePilotRunResult = OoeRuntimeEnvelope<
  GraphSampleResultV6,
  GraphSampleOoePilotMetadata
>;

export type GraphSampleOoeSnapshot = {
  workspaceInstanceId: string;
  documentId: string;
  revisions: GraphSampleRequestV6['revisions'];
  quality: GraphSampleRequestV6['quality'];
};

export function graphSamplePilotDefinition(): GraphSamplePilotDefinition {
  return {
    planId: OOE_GRAPH_SAMPLE_PLAN_ID,
    capabilityId: OOE_GRAPH_SAMPLE_CAPABILITY_ID,
    hostId: GRAPH_SAMPLE_WORKER_HOST_ID,
    nodeId: OOE_GRAPH_SAMPLE_NODE_ID,
    phaseId: OOE_GRAPH_SAMPLE_PHASE_ID,
  };
}

export function buildGraphSampleOoeSnapshot(
  request: GraphSampleRequestV6,
): GraphSampleOoeSnapshot {
  return {
    workspaceInstanceId: request.workspaceInstanceId,
    documentId: request.documentId,
    revisions: { ...request.revisions },
    quality: request.quality,
  };
}

export function buildGraphSampleInputRevisionId(
  request: GraphSampleRequestV6,
) {
  return buildOoeInputRevisionId(
    OOE_GRAPH_SAMPLE_CAPABILITY_ID,
    buildGraphSampleOoeSnapshot(request),
  );
}

export function prepareGraphSampleOoePilot(): Promise<GraphSampleOoePilotStatus> {
  return prepareOoePlanPreflight(graphSamplePilotDefinition());
}

function defaultWorkspaceContext(
  request: GraphSampleRequestV6,
): WorkspaceInstanceRuntimeContext {
  return {
    workspaceInstanceId: request.workspaceInstanceId,
    workspaceInstanceLabel: 'Graph',
    workspaceInstanceRevision: request.revisions.mathematics,
    workspaceKind: 'graphing',
    compartmentId: 'graphing',
    compartmentLabel: 'Graphing',
  };
}

function traceMessageForStatus(status: GraphSampleOoePilotStatus) {
  switch (status.kind) {
    case 'ready':
      return 'OOE Graph sampling plan is available and valid.';
    case 'unavailable':
      return `OOE bridge unavailable: ${status.reason}.`;
    case 'missing-plan':
      return 'OOE Graph sampling plan was not found.';
    case 'invalid-plan':
      return `OOE Graph sampling plan failed validation with ${status.errors.length} error(s).`;
    case 'bridge-error':
      return `OOE bridge error: ${status.message}`;
  }
}

function hostReason(execution: GraphSamplingHostExecution) {
  return 'reason' in execution
    ? execution.reason
    : 'Graph sampling host completed.';
}

function buildTraceEvents(input: {
  status: GraphSampleOoePilotStatus;
  jobContext: ReturnType<typeof buildOoeJobCommitContext>;
  controlTraceEvents: readonly OoeTraceEvent[];
  hostExecution: GraphSamplingHostExecution;
}) {
  const definition = graphSamplePilotDefinition();
  const cancelled = input.hostExecution.terminalStatus === 'cancelled';
  const base = buildCoarseLifecycleOoeTraceEvents({
    definition,
    status: input.status,
    job: input.jobContext.job,
    commitAssessment: input.jobContext.commitAssessment,
    preflightMessage: traceMessageForStatus(input.status),
    startedMessage: 'Graph sampling started through the application-level runtime shell.',
    finalMessage: 'Graph sampling produced the latest bounded transferable scene.',
  });
  const hostEvent = buildOoeTraceEvent({
    ...definition,
    hostId: input.hostExecution.hostId,
    jobId: input.jobContext.job.jobId,
    inputRevisionId: input.jobContext.job.inputRevisionId,
    status: cancelled ? 'cancelled' : 'provisionalReady',
    resultStability: cancelled ? 'stale' : 'provisional',
    commitDecision: 'notApplicable',
    message: input.hostExecution.kind === 'fallback'
      ? `Graph sampling fell back to ${input.hostExecution.hostId}: ${input.hostExecution.reason}.`
      : input.hostExecution.kind === 'fallback-cancelled'
        ? 'Graph sampling fallback stopped cooperatively.'
        : input.hostExecution.kind === 'worker-cancelled'
          ? 'Graph sampling worker was hard-stopped.'
          : `Graph sampling ran on ${input.hostExecution.hostId}.`,
  });

  if (!cancelled) {
    return [base[0], base[1], ...input.controlTraceEvents, hostEvent, base[2]];
  }
  return [
    base[0],
    base[1],
    ...input.controlTraceEvents,
    hostEvent,
    buildOoeTraceEvent({
      ...definition,
      jobId: input.jobContext.job.jobId,
      inputRevisionId: input.jobContext.job.inputRevisionId,
      status: 'cancelled',
      resultStability: 'stale',
      commitDecision: 'notApplicable',
      message: hostReason(input.hostExecution),
    }),
  ];
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function runGraphSampleWithOoe(
  request: GraphSampleRequestV6,
  options: GraphSampleOoeOptions = {},
): Promise<GraphSampleOoePilotRunResult> {
  const routeSnapshot = buildGraphSampleOoeSnapshot(request);
  const definition = graphSamplePilotDefinition();
  const host = options.host ?? graphSamplingApplicationHost;
  const workspaceInstance = options.workspaceInstance ?? defaultWorkspaceContext(request);
  if (workspaceInstance.workspaceInstanceId !== request.workspaceInstanceId) {
    throw new Error('Graph sampling workspace context must match the request workspace instance.');
  }
  const runtimeOptions: OoeJobContextOptions = {
    activeInputRevisionId: options.activeInputRevisionId,
    commitPolicy: options.commitPolicy ?? 'commitLatestOnly',
    workspaceInstance,
    isWorkspaceInstanceOpen: options.isWorkspaceInstanceOpen,
  };
  let hostExecution: GraphSamplingHostExecution | undefined;

  const envelope = await runOoeRuntimeJob({
    definition,
    routeLabel: OOE_GRAPH_SAMPLE_CAPABILITY_ID,
    routeSnapshot,
    options: runtimeOptions,
    cooperativeBudget: { sliceMs: 8 },
    prepareStatus: prepareGraphSampleOoePilot,
    run: async (context) => {
      const execution = await host.run(request, context);
      hostExecution = execution.hostExecution;
      return execution.result;
    },
    buildMetadata: ({ status, jobContext, controlTraceEvents }) => {
      if (!hostExecution) {
        throw new Error('Graph sampling host completed without execution evidence.');
      }
      const cancelled = hostExecution.terminalStatus === 'cancelled';
      const commitAssessment = cancelled
        ? {
            ...jobContext.commitAssessment,
            legality: 'notApplicable' as const,
            commitDecision: 'notApplicable' as const,
            resultStability: 'stale' as const,
          }
        : jobContext.commitAssessment;
      const runtimeShell = buildOoeRuntimeShellEvidence({
        shellId: OOE_GRAPH_SAMPLE_SHELL_ID,
        capabilityId: OOE_GRAPH_SAMPLE_CAPABILITY_ID,
        primaryHostId: GRAPH_SAMPLE_WORKER_HOST_ID,
        fallbackHostId: GRAPH_SAMPLE_FALLBACK_HOST_ID,
        lifecycle: cancelled ? 'cancelled' : 'completed',
        hostExecution,
      });
      return {
        ...definition,
        status,
        job: jobContext.job,
        commitAssessment,
        completion: cancelled
          ? { kind: 'cancelled' as const, reason: hostReason(hostExecution) }
          : undefined,
        graphHostExecution: hostExecution,
        runtimeShell,
        releasedBufferBytes: 0,
        traceEvents: buildTraceEvents({
          status,
          jobContext: { ...jobContext, commitAssessment },
          controlTraceEvents,
          hostExecution,
        }),
      };
    },
    buildProvenance: ({ payload, metadata }) => ({
      depth: 'coarse',
      mode: 'graphing',
      route: OOE_GRAPH_SAMPLE_CAPABILITY_ID,
      action: 'sample',
      inputSummary: {
        workspaceInstanceId: request.workspaceInstanceId,
        documentId: request.documentId,
        revisions: { ...request.revisions },
        quality: request.quality,
        itemCount: request.items.length,
      },
      runtimeHost: metadata.graphHostExecution.hostId,
      runtimeShell: metadata.runtimeShell,
      commitDecision: metadata.commitAssessment.commitDecision,
      notes: [
        `Graph scene ${payload.status}: ${payload.evidence.sampleCount} samples, ${payload.evidence.vertexCount} vertices.`,
      ],
    }),
    buildFailureProvenance: ({ error }) => ({
      depth: 'coarse',
      mode: 'graphing',
      route: OOE_GRAPH_SAMPLE_CAPABILITY_ID,
      action: 'sample',
      inputSummary: {
        workspaceInstanceId: request.workspaceInstanceId,
        documentId: request.documentId,
        revisions: { ...request.revisions },
        quality: request.quality,
        itemCount: request.items.length,
      },
      runtimeHost: GRAPH_SAMPLE_WORKER_HOST_ID,
      commitDecision: 'notApplicable',
      notes: [`Graph sampling runtime failed: ${errorMessage(error)}`],
    }),
  });

  if (
    envelope.payload.status === 'cancelled'
    || envelope.ooe.commitAssessment.legality !== 'commitAllowed'
  ) {
    envelope.ooe.releasedBufferBytes = releaseGraphSampleResultBuffers(envelope.payload);
  }
  return envelope;
}
