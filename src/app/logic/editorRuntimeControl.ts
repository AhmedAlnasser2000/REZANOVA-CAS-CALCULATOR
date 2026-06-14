import {
  listActiveOoeJobs,
  requestOoeJobCancellation,
  type OoeActiveJobRecord,
  type OoeCancellationRequester,
} from '../../lib/ooe/job-launch/active-job-registry';
import type { CalculateScreen, EquationScreen, ModeId } from '../../types/calculator';

export type EditorRuntimeControlSurface = {
  currentMode: ModeId;
  calculateScreen: CalculateScreen;
  equationScreen: EquationScreen;
};

export type EditorRuntimeCancellationOptions = {
  requestedBy?: OoeCancellationRequester;
  reason?: string;
};

const CALCULATE_OOE_CAPABILITIES = [
  'expression.evaluate',
  'expression.simplify',
  'expression.factor',
  'expression.expand',
  'calculate.algebraTransform',
  'calculate.workbench',
] as const;

export function getCurrentEditorOoeCapabilityIds(
  surface: EditorRuntimeControlSurface,
): string[] {
  if (surface.currentMode === 'calculate') {
    return [...CALCULATE_OOE_CAPABILITIES];
  }

  if (surface.currentMode === 'equation' && surface.equationScreen === 'symbolic') {
    return ['equation.solve'];
  }

  if (surface.currentMode === 'table') {
    return ['table.build'];
  }

  return [];
}

export function findCurrentEditorOoeJob(
  surface: EditorRuntimeControlSurface,
): OoeActiveJobRecord | null {
  const capabilityIds = new Set(getCurrentEditorOoeCapabilityIds(surface));
  if (capabilityIds.size === 0) {
    return null;
  }

  return listActiveOoeJobs()
    .filter((record) => capabilityIds.has(record.capabilityId))
    .sort((left, right) => right.sequence - left.sequence)[0] ?? null;
}

export function requestCurrentEditorOoeCancellation(
  surface: EditorRuntimeControlSurface,
  options?: EditorRuntimeCancellationOptions,
): OoeActiveJobRecord | null {
  const activeJob = findCurrentEditorOoeJob(surface);
  return activeJob
    ? requestOoeJobCancellation(activeJob.registryId, options)
    : null;
}
