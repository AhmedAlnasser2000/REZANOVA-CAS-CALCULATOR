import { invoke } from '@tauri-apps/api/core';
import { z } from 'zod';

export const OOE_DESKTOP_UNAVAILABLE_REASON = 'desktop-runtime-unavailable' as const;

export type OoeBridgeResult<T> =
  | { kind: 'ready'; data: T }
  | { kind: 'unavailable'; reason: typeof OOE_DESKTOP_UNAVAILABLE_REASON; data: T };

export const ooeIdSchema = z.string();

export const ooeTaskClassSchema = z.enum([
  'immediate',
  'deferred',
  'explicit',
  'heavy',
  'renderLimited',
  'background',
]);

export const ooePriorityClassSchema = z.enum([
  'userBlocking',
  'userVisible',
  'normal',
  'low',
  'idle',
]);

export const ooeCancellationPolicySchema = z.enum([
  'notCancellable',
  'staleDrop',
  'cooperative',
  'hardStop',
]);

export const ooeCommitPolicySchema = z.enum([
  'commitLatestOnly',
  'commitIfCurrent',
  'alwaysCommit',
]);

export const ooeThreadSafetySchema = z.enum([
  'mainThreadOnly',
  'workerSafe',
  'rustThreadSafe',
]);

export const ooeResultStabilitySchema = z.enum([
  'draft',
  'provisional',
  'stable',
  'stale',
  'failed',
]);

export const ooeTraceStatusSchema = z.enum([
  'planned',
  'started',
  'completed',
  'staleDropped',
  'cancelled',
  'failed',
  'slowPhase',
  'provisionalReady',
]);

export const ooeCommitDecisionSchema = z.enum([
  'committed',
  'skipped',
  'staleDropped',
  'notApplicable',
]);

export const ooeCommitLegalitySchema = z.enum([
  'commitAllowed',
  'staleDrop',
  'skipped',
  'notApplicable',
]);

export const ooeBuiltinPlanCategorySchema = z.enum([
  'expression',
  'equation',
  'table',
]);

export const ooeSolverModeSchema = z.enum([
  'classic',
  'progressive',
]);

export const ooeChunkingPolicySchema = z.enum([
  'none',
  'chunked',
]);

export const ooeCheckpointPolicySchema = z.enum([
  'none',
  'idempotentLedger',
]);

export const ooeStreamingPolicySchema = z.enum([
  'finalOnly',
  'committedArtifacts',
]);

export const ooeMaterializationPolicySchema = z.enum([
  'full',
  'searchFirst',
]);

export const ooeComputeTopologySchema = z.enum([
  'local',
  'singleExternal',
]);

export const ooeResourcePolicySchema = z.enum([
  'normal',
]);

export const ooeNodeSchema = z.object({
  id: ooeIdSchema,
  capabilityId: ooeIdSchema,
  hostId: ooeIdSchema,
  phaseId: ooeIdSchema,
  taskClass: ooeTaskClassSchema,
  priorityClass: ooePriorityClassSchema,
  cancellationPolicy: ooeCancellationPolicySchema,
  commitPolicy: ooeCommitPolicySchema,
  threadSafety: ooeThreadSafetySchema,
  resultStability: ooeResultStabilitySchema,
  solverMode: ooeSolverModeSchema,
  chunkingPolicy: ooeChunkingPolicySchema,
  checkpointPolicy: ooeCheckpointPolicySchema,
  streamingPolicy: ooeStreamingPolicySchema,
  materializationPolicy: ooeMaterializationPolicySchema,
  computeTopology: ooeComputeTopologySchema,
  resourcePolicy: ooeResourcePolicySchema,
  dependsOn: z.array(ooeIdSchema),
  isTerminalResult: z.boolean(),
});

export const ooePlanSchema = z.object({
  id: ooeIdSchema,
  schemaVersion: z.number().int(),
  nodes: z.array(ooeNodeSchema),
});

export const ooeJobIdentitySchema = z.object({
  jobId: ooeIdSchema,
  planId: ooeIdSchema,
  capabilityId: ooeIdSchema,
  hostId: ooeIdSchema,
  nodeId: ooeIdSchema.nullish(),
  phaseId: ooeIdSchema.nullish(),
  inputRevisionId: ooeIdSchema,
});

export const ooeCommitAssessmentSchema = z.object({
  job: ooeJobIdentitySchema.nullish(),
  activeInputRevisionId: ooeIdSchema.nullish(),
  commitPolicy: ooeCommitPolicySchema,
  legality: ooeCommitLegalitySchema,
  commitDecision: ooeCommitDecisionSchema,
  resultStability: ooeResultStabilitySchema,
});

export const ooeTraceEventSchema = z.object({
  traceId: ooeIdSchema.nullish(),
  jobId: ooeIdSchema.nullish(),
  planId: ooeIdSchema,
  nodeId: ooeIdSchema.nullable(),
  capabilityId: ooeIdSchema.nullish(),
  hostId: ooeIdSchema.nullish(),
  phaseId: ooeIdSchema.nullable(),
  stageId: ooeIdSchema.nullish(),
  inputRevisionId: ooeIdSchema.nullish(),
  status: ooeTraceStatusSchema,
  resultStability: ooeResultStabilitySchema,
  durationMs: z.number().int().nonnegative().nullable(),
  commitDecision: ooeCommitDecisionSchema.nullish(),
  message: z.string().nullable(),
});

export const ooeBuiltinPlanDescriptorSchema = z.object({
  category: ooeBuiltinPlanCategorySchema,
  planId: ooeIdSchema,
  capabilityId: ooeIdSchema,
  hostId: ooeIdSchema,
  entrypoint: z.string(),
  description: z.string(),
});

export const ooeValidationErrorSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('emptyPlanId') }),
  z.object({ kind: z.literal('emptyNodeId'), index: z.number().int().nonnegative() }),
  z.object({ kind: z.literal('emptyCapabilityId'), nodeId: z.string() }),
  z.object({ kind: z.literal('emptyHostId'), nodeId: z.string() }),
  z.object({ kind: z.literal('emptyPhaseId'), nodeId: z.string() }),
  z.object({ kind: z.literal('duplicateNodeId'), nodeId: z.string() }),
  z.object({
    kind: z.literal('missingDependency'),
    nodeId: z.string(),
    dependencyId: z.string(),
  }),
  z.object({ kind: z.literal('cycleDetected'), nodeId: z.string() }),
  z.object({ kind: z.literal('missingTerminalResult') }),
  z.object({
    kind: z.literal('classicExecutionPolicyMismatch'),
    nodeId: z.string(),
    policy: z.string(),
  }),
  z.object({
    kind: z.literal('progressiveRequiresChunking'),
    nodeId: z.string(),
  }),
]);

export const ooeValidationReportSchema = z.object({
  ok: z.boolean(),
  errors: z.array(ooeValidationErrorSchema),
});

export type OoeTaskClass = z.infer<typeof ooeTaskClassSchema>;
export type OoePriorityClass = z.infer<typeof ooePriorityClassSchema>;
export type OoeCancellationPolicy = z.infer<typeof ooeCancellationPolicySchema>;
export type OoeCommitPolicy = z.infer<typeof ooeCommitPolicySchema>;
export type OoeThreadSafety = z.infer<typeof ooeThreadSafetySchema>;
export type OoeResultStability = z.infer<typeof ooeResultStabilitySchema>;
export type OoeTraceStatus = z.infer<typeof ooeTraceStatusSchema>;
export type OoeCommitDecision = z.infer<typeof ooeCommitDecisionSchema>;
export type OoeCommitLegality = z.infer<typeof ooeCommitLegalitySchema>;
export type OoeBuiltinPlanCategory = z.infer<typeof ooeBuiltinPlanCategorySchema>;
export type OoeSolverMode = z.infer<typeof ooeSolverModeSchema>;
export type OoeChunkingPolicy = z.infer<typeof ooeChunkingPolicySchema>;
export type OoeCheckpointPolicy = z.infer<typeof ooeCheckpointPolicySchema>;
export type OoeStreamingPolicy = z.infer<typeof ooeStreamingPolicySchema>;
export type OoeMaterializationPolicy = z.infer<typeof ooeMaterializationPolicySchema>;
export type OoeComputeTopology = z.infer<typeof ooeComputeTopologySchema>;
export type OoeResourcePolicy = z.infer<typeof ooeResourcePolicySchema>;
export type OoeNode = z.infer<typeof ooeNodeSchema>;
export type OoePlan = z.infer<typeof ooePlanSchema>;
export type OoeJobIdentity = z.infer<typeof ooeJobIdentitySchema>;
export type OoeCommitAssessment = z.infer<typeof ooeCommitAssessmentSchema>;
export type OoeTraceEvent = z.infer<typeof ooeTraceEventSchema>;
export type OoeBuiltinPlanDescriptor = z.infer<typeof ooeBuiltinPlanDescriptorSchema>;
export type OoeValidationError = z.infer<typeof ooeValidationErrorSchema>;
export type OoeValidationReport = z.infer<typeof ooeValidationReportSchema>;

export function isOoeBridgeAvailable() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function unavailable<T>(data: T): OoeBridgeResult<T> {
  return {
    kind: 'unavailable',
    reason: OOE_DESKTOP_UNAVAILABLE_REASON,
    data,
  };
}

function ready<T>(data: T): OoeBridgeResult<T> {
  return { kind: 'ready', data };
}

async function invokeOoeCommand<T>(
  command: string,
  args: Record<string, unknown> | undefined,
  schema: z.ZodType<T>,
  fallbackData: T,
): Promise<OoeBridgeResult<T>> {
  if (!isOoeBridgeAvailable()) {
    return unavailable(fallbackData);
  }

  const payload = await invoke<unknown>(command, args);
  return ready(schema.parse(payload));
}

export async function listBuiltinOoePlanDescriptors(): Promise<
  OoeBridgeResult<OoeBuiltinPlanDescriptor[]>
> {
  return invokeOoeCommand(
    'ooe_list_builtin_plans',
    undefined,
    z.array(ooeBuiltinPlanDescriptorSchema),
    [],
  );
}

export async function getBuiltinOoePlan(
  planId: string,
): Promise<OoeBridgeResult<OoePlan | null>> {
  return invokeOoeCommand(
    'ooe_get_builtin_plan',
    { planId },
    ooePlanSchema.nullable(),
    null,
  );
}

export async function validateOoePlan(
  plan: OoePlan,
): Promise<OoeBridgeResult<OoeValidationReport>> {
  return invokeOoeCommand(
    'ooe_validate_plan',
    { plan },
    ooeValidationReportSchema,
    { ok: false, errors: [] },
  );
}
