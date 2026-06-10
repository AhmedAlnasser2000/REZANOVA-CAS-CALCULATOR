import type { GeometryScreen } from '../../types/calculator';
import { buildOoeInputRevisionId } from '../ooe/job-contract';

export const GEOMETRY_EVALUATE_CAPABILITY_ID = 'geometry.evaluate' as const;

export type RunGeometryRuntimeRequest = {
  inputLatex: string;
  screenHint: GeometryScreen;
};

export function buildGeometryOoeSnapshot(request: RunGeometryRuntimeRequest) {
  return {
    capabilityId: GEOMETRY_EVALUATE_CAPABILITY_ID,
    request,
  };
}

export function buildGeometryOoeInputRevisionId(
  request: RunGeometryRuntimeRequest,
) {
  return buildOoeInputRevisionId(
    GEOMETRY_EVALUATE_CAPABILITY_ID,
    buildGeometryOoeSnapshot(request),
  );
}
