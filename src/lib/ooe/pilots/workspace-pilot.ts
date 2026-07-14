import {
  buildCoarseLifecycleOoeTraceEvents,
  type OoePilotDefinition,
  type OoePilotStatus,
  type OoeRuntimeEnvelope,
  type OoeRuntimeMetadata,
} from '../runtime-control/runtime-envelope';
import { runOoeRuntimeJob } from '../runtime-control/runtime-coordinator';
import type { OoeJobCommitContext } from '../job-launch/job-contract';
import type { OoeDiagnosticsProvenance } from '../diagnostics/diagnostics-buffer';
import { summarizeOoeProvenanceCanonicalOutcome } from './provenance-summary';

export type WorkspaceOoeCapabilityId =
  | 'calculate.workbench'
  | 'calculate.algebraTransform'
  | 'calculus.evaluate'
  | 'trigonometry.evaluate'
  | 'statistics.evaluate'
  | 'geometry.evaluate'
  | 'linearAlgebra.matrix'
  | 'linearAlgebra.vector';

export type WorkspaceOoeMode =
  | 'calculate'
  | 'calculus'
  | 'trigonometry'
  | 'statistics'
  | 'geometry'
  | 'matrix'
  | 'vector';

type WorkspaceDefinition = OoePilotDefinition & {
  capabilityId: WorkspaceOoeCapabilityId;
};

export type WorkspaceOoeMetadata = OoeRuntimeMetadata<
  WorkspaceDefinition,
  OoePilotStatus
> & {
  mode: WorkspaceOoeMode;
  routeLabel: string;
};

type RunWorkspaceWithOoeProvenanceInput<TPayload> = {
  capabilityId: WorkspaceOoeCapabilityId;
  mode: WorkspaceOoeMode;
  routeLabel?: string;
  routeSnapshot: unknown;
  action?: string;
  screen?: string;
  inputSummary?: Record<string, unknown>;
  run: () => TPayload | Promise<TPayload>;
  buildProvenance?: (input: {
    payload: TPayload;
    metadata: WorkspaceOoeMetadata;
    routeSnapshot: unknown;
  }) => OoeDiagnosticsProvenance | undefined;
};

type WorkspaceOoeDefinitionConfig = {
  hostId: string;
};

// Coarse provenance only. Active workspace shells should still
// mirror their worker-primary OOE hosts here so diagnostics do not drift.
const WORKSPACE_DEFINITIONS: Record<WorkspaceOoeCapabilityId, WorkspaceOoeDefinitionConfig> = {
  'calculate.workbench': {
    hostId: 'calculate-worker-runtime',
  },
  'calculate.algebraTransform': {
    hostId: 'calculate-worker-runtime',
  },
  'calculus.evaluate': {
    hostId: 'calculus-worker-runtime',
  },
  'trigonometry.evaluate': {
    hostId: 'trigonometry-worker-runtime',
  },
  'statistics.evaluate': {
    hostId: 'statistics-worker-runtime',
  },
  'geometry.evaluate': {
    hostId: 'geometry-worker-runtime',
  },
  'linearAlgebra.matrix': {
    hostId: 'matrix-worker-runtime',
  },
  'linearAlgebra.vector': {
    hostId: 'vector-worker-runtime',
  },
};

function workspaceOoeDefinition(capabilityId: WorkspaceOoeCapabilityId): WorkspaceDefinition {
  const config = WORKSPACE_DEFINITIONS[capabilityId];
  return {
    planId: `plan.${capabilityId}`,
    capabilityId,
    hostId: config.hostId,
    nodeId: `node.${capabilityId}`,
    phaseId: capabilityId,
  };
}

function buildWorkspaceMetadata(input: {
  definition: WorkspaceDefinition;
  mode: WorkspaceOoeMode;
  routeLabel: string;
  status: OoePilotStatus;
  jobContext: OoeJobCommitContext;
}): WorkspaceOoeMetadata {
  return {
    ...input.definition,
    mode: input.mode,
    routeLabel: input.routeLabel,
    status: input.status,
    job: input.jobContext.job,
    commitAssessment: input.jobContext.commitAssessment,
    traceEvents: buildCoarseLifecycleOoeTraceEvents({
      definition: input.definition,
      status: input.status,
      job: input.jobContext.job,
      commitAssessment: input.jobContext.commitAssessment,
      preflightMessage: `OOE ${input.routeLabel} preflight completed.`,
      startedMessage: `${input.routeLabel} started through the current TypeScript runtime.`,
      finalMessage: `${input.routeLabel} produced a canonical runtime payload.`,
    }),
  };
}

function defaultWorkspaceProvenance<TPayload>(input: {
  payload: TPayload;
  metadata: WorkspaceOoeMetadata;
  mode: WorkspaceOoeMode;
  route: string;
  action?: string;
  screen?: string;
  inputSummary?: Record<string, unknown>;
}): OoeDiagnosticsProvenance {
  return {
    depth: 'coarse',
    mode: input.mode,
    route: input.route,
    screen: input.screen,
    action: input.action,
    inputSummary: input.inputSummary,
    outputSummary: summarizeOoeProvenanceCanonicalOutcome(input.payload),
    runtimeHost: input.metadata.hostId,
    commitDecision: input.metadata.commitAssessment.commitDecision,
  };
}

export async function runWorkspaceWithOoeProvenance<TPayload>(
  input: RunWorkspaceWithOoeProvenanceInput<TPayload>,
): Promise<OoeRuntimeEnvelope<TPayload, WorkspaceOoeMetadata>> {
  const definition = workspaceOoeDefinition(input.capabilityId);
  const routeLabel = input.routeLabel ?? input.capabilityId;

  return runOoeRuntimeJob({
    definition,
    routeLabel,
    routeSnapshot: input.routeSnapshot,
    run: input.run,
    buildMetadata: ({ status, jobContext }) => buildWorkspaceMetadata({
      definition,
      mode: input.mode,
      routeLabel,
      status,
      jobContext,
    }),
    buildProvenance: ({ payload, metadata, routeSnapshot }) =>
      input.buildProvenance?.({ payload, metadata, routeSnapshot })
      ?? defaultWorkspaceProvenance({
        payload,
        metadata,
        mode: input.mode,
        route: routeLabel,
        action: input.action,
        screen: input.screen,
        inputSummary: input.inputSummary,
      }),
    buildFailureProvenance: () => ({
      depth: 'coarse',
      mode: input.mode,
      route: routeLabel,
      screen: input.screen,
      action: input.action,
      inputSummary: input.inputSummary,
      runtimeHost: definition.hostId,
      notes: ['Runtime threw before producing a canonical runtime payload.'],
    }),
  });
}
