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
  'stable',
  'stale',
  'failed',
]);

export const ooeTraceStatusSchema = z.enum([
  'planned',
  'started',
  'completed',
  'staleDropped',
  'failed',
]);

export const ooeBuiltinPlanCategorySchema = z.enum([
  'expression',
  'equation',
  'table',
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
  dependsOn: z.array(ooeIdSchema),
  isTerminalResult: z.boolean(),
});

export const ooePlanSchema = z.object({
  id: ooeIdSchema,
  schemaVersion: z.number().int(),
  nodes: z.array(ooeNodeSchema),
});

export const ooeTraceEventSchema = z.object({
  planId: ooeIdSchema,
  nodeId: ooeIdSchema.nullable(),
  phaseId: ooeIdSchema.nullable(),
  status: ooeTraceStatusSchema,
  resultStability: ooeResultStabilitySchema,
  durationMs: z.number().int().nonnegative().nullable(),
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
export type OoeBuiltinPlanCategory = z.infer<typeof ooeBuiltinPlanCategorySchema>;
export type OoeNode = z.infer<typeof ooeNodeSchema>;
export type OoePlan = z.infer<typeof ooePlanSchema>;
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
