import type {
  AngleUnit,
  TrigIdentityState,
  TrigScreen,
} from '../../types/calculator';
import { buildOoeInputRevisionId } from '../ooe/job-launch/job-contract';

export const TRIGONOMETRY_EVALUATE_CAPABILITY_ID = 'trigonometry.evaluate' as const;

export type RunTrigonometryRuntimeRequest = {
  inputLatex: string;
  screenHint: TrigScreen;
  angleUnit: AngleUnit;
  identityTargetForm?: TrigIdentityState['targetForm'];
};

export function buildTrigonometryOoeSnapshot(request: RunTrigonometryRuntimeRequest) {
  return {
    capabilityId: TRIGONOMETRY_EVALUATE_CAPABILITY_ID,
    request,
  };
}

export function buildTrigonometryOoeInputRevisionId(
  request: RunTrigonometryRuntimeRequest,
) {
  return buildOoeInputRevisionId(
    TRIGONOMETRY_EVALUATE_CAPABILITY_ID,
    buildTrigonometryOoeSnapshot(request),
  );
}
