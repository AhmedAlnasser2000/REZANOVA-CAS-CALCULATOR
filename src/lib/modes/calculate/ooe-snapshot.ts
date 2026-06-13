import { buildOoeInputRevisionId } from '../../ooe/job-contract';
import type { CalculateOoeCapabilityId } from '../../ooe/calculate-pilot';
import type {
  RunCalculateModeRequest,
  RunCalculateRuntimeRequest,
} from './types';

export function buildStandardCalculateOoeSnapshot(request: RunCalculateModeRequest) {
  return {
    action: request.action,
    request,
  };
}

export function buildStandardCalculateOoeInputRevisionId(
  request: RunCalculateModeRequest,
): string {
  return buildOoeInputRevisionId(
    `expression.${request.action}`,
    buildStandardCalculateOoeSnapshot(request),
  );
}

export function calculateCapabilityIdForRuntimeRequest(
  request: RunCalculateRuntimeRequest,
): CalculateOoeCapabilityId {
  switch (request.kind) {
    case 'standard':
      return `expression.${request.request.action}` as CalculateOoeCapabilityId;
    case 'algebraTransform':
      return 'calculate.algebraTransform';
    case 'legacyWorkbench':
      return 'calculate.workbench';
  }
}

export function calculateInputLatexForRuntimeRequest(
  request: RunCalculateRuntimeRequest,
): string {
  return request.request.latex;
}

export function buildCalculateRuntimeOoeSnapshot(request: RunCalculateRuntimeRequest) {
  return {
    kind: request.kind,
    capabilityId: calculateCapabilityIdForRuntimeRequest(request),
    request,
  };
}

export function buildCalculateRuntimeOoeInputRevisionId(
  request: RunCalculateRuntimeRequest,
): string {
  return buildOoeInputRevisionId(
    calculateCapabilityIdForRuntimeRequest(request),
    buildCalculateRuntimeOoeSnapshot(request),
  );
}
