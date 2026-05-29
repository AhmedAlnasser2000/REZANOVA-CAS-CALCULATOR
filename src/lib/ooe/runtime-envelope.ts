import {
  getBuiltinOoePlan,
  OOE_DESKTOP_UNAVAILABLE_REASON,
  validateOoePlan,
  type OoeCommitAssessment,
  type OoeJobIdentity,
  type OoeTraceEvent,
  type OoeValidationError,
} from './ooe-bridge';
import {
  buildOoeFinalOutcomeTraceEvent,
  buildOoeTraceEvent,
} from './trace';
import type { OoeHostAdapterStatus } from './host-adapter';

export type OoePilotDefinition = {
  planId: string;
  capabilityId: string;
  hostId: string;
  nodeId: string;
  phaseId: string;
};

export type OoePilotStatus<TPlanId extends string = string> =
  | {
      kind: 'ready';
      planId: TPlanId;
    }
  | {
      kind: 'unavailable';
      planId: TPlanId;
      reason: typeof OOE_DESKTOP_UNAVAILABLE_REASON;
    }
  | {
      kind: 'missing-plan';
      planId: TPlanId;
    }
  | {
      kind: 'invalid-plan';
      planId: TPlanId;
      errors: OoeValidationError[];
    }
  | {
      kind: 'bridge-error';
      planId: TPlanId;
      message: string;
    };

export type OoeRuntimeMetadata<
  TDefinition extends OoePilotDefinition = OoePilotDefinition,
  TStatus extends OoePilotStatus<TDefinition['planId']> = OoePilotStatus<TDefinition['planId']>,
> = TDefinition & {
  status: TStatus;
  hostAdapter?: OoeHostAdapterStatus;
  job: OoeJobIdentity;
  commitAssessment: OoeCommitAssessment;
  traceEvents: OoeTraceEvent[];
};

export type OoeRuntimeEnvelope<TPayload, TMetadata extends OoeRuntimeMetadata> = {
  payload: TPayload;
  ooe: TMetadata;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function prepareOoePlanPreflight<TDefinition extends OoePilotDefinition>(
  definition: TDefinition,
): Promise<OoePilotStatus<TDefinition['planId']>> {
  try {
    const planResult = await getBuiltinOoePlan(definition.planId);

    if (planResult.kind === 'unavailable') {
      return {
        kind: 'unavailable',
        planId: definition.planId,
        reason: planResult.reason,
      };
    }

    if (!planResult.data) {
      return {
        kind: 'missing-plan',
        planId: definition.planId,
      };
    }

    const validationResult = await validateOoePlan(planResult.data);
    if (validationResult.kind === 'unavailable') {
      return {
        kind: 'unavailable',
        planId: definition.planId,
        reason: validationResult.reason,
      };
    }

    if (!validationResult.data.ok) {
      return {
        kind: 'invalid-plan',
        planId: definition.planId,
        errors: validationResult.data.errors,
      };
    }

    return {
      kind: 'ready',
      planId: definition.planId,
    };
  } catch (error) {
    return {
      kind: 'bridge-error',
      planId: definition.planId,
      message: errorMessage(error),
    };
  }
}

export function buildOoePreflightTraceEvent(
  definition: OoePilotDefinition,
  status: OoePilotStatus,
  message: string,
  job: OoeJobIdentity,
): OoeTraceEvent {
  const failed = status.kind !== 'ready';
  return buildOoeTraceEvent({
    ...definition,
    jobId: job.jobId,
    inputRevisionId: job.inputRevisionId,
    status: failed ? 'failed' : 'completed',
    resultStability: failed ? 'failed' : 'stable',
    commitDecision: 'notApplicable',
    message,
  });
}

export function buildCoarseLifecycleOoeTraceEvents(input: {
  definition: OoePilotDefinition;
  status: OoePilotStatus;
  job: OoeJobIdentity;
  commitAssessment: OoeCommitAssessment;
  preflightMessage: string;
  startedMessage: string;
  finalMessage: string;
}): OoeTraceEvent[] {
  return [
    buildOoePreflightTraceEvent(
      input.definition,
      input.status,
      input.preflightMessage,
      input.job,
    ),
    buildOoeTraceEvent({
      ...input.definition,
      jobId: input.job.jobId,
      inputRevisionId: input.job.inputRevisionId,
      status: 'started',
      resultStability: 'draft',
      commitDecision: 'notApplicable',
      message: input.startedMessage,
    }),
    buildOoeFinalOutcomeTraceEvent({
      ...input.definition,
      job: input.job,
      commitDecision: input.commitAssessment.commitDecision,
      message: input.finalMessage,
    }),
  ];
}

export function buildOoeRuntimeEnvelope<
  TPayload,
  TMetadata extends OoeRuntimeMetadata,
>(
  payload: TPayload,
  ooe: TMetadata,
): OoeRuntimeEnvelope<TPayload, TMetadata> {
  return { payload, ooe };
}
