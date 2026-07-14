import type { AngleUnit, CanonicalRuntimeOutcome } from '../../types/calculator';
import {
  getSurfaceWorkspaceCapability,
  type SurfaceCapabilityFlags,
} from './capabilities';
import {
  SURFACE_PROTOCOL_VERSION,
  canonicalOutcomeToSurfaceResultSummary,
  emptySurfaceResultSummary,
  surfaceOk,
  type SurfaceProtocolVersion,
  type SurfaceResultDto,
  type SurfaceResultSummaryDto,
  type SurfaceWorkspaceKind,
} from './dto';
import {
  surfaceError,
  validateSurfaceRequest,
  type SurfaceQueryKind,
} from './errors';

export type SurfaceSettingsSnapshotInput = {
  angleUnit?: unknown;
  [key: string]: unknown;
};

export type SurfaceWorkspaceSnapshotInput = {
  protocolVersion: SurfaceProtocolVersion;
  workspaceKind: SurfaceWorkspaceKind;
  displayOutcome?: CanonicalRuntimeOutcome | null;
  settings?: SurfaceSettingsSnapshotInput | null;
};

export type SurfaceCurrentResultDto = {
  protocolVersion: SurfaceProtocolVersion;
  workspaceKind: SurfaceWorkspaceKind;
  queryKind: 'currentResult';
  summary: SurfaceResultSummaryDto;
};

export type SurfaceWorkspaceInfoDto = {
  protocolVersion: SurfaceProtocolVersion;
  workspaceKind: SurfaceWorkspaceKind;
  queryKind: 'workspaceInfo';
  label: string;
  summary: string;
  capabilities: SurfaceCapabilityFlags;
};

export type SurfaceSafeSettingsSummaryDto = {
  protocolVersion: SurfaceProtocolVersion;
  workspaceKind: SurfaceWorkspaceKind;
  queryKind: 'safeSettings';
  angleUnit?: AngleUnit;
};

export type SurfaceQueryResponseDto =
  | SurfaceCurrentResultDto
  | SurfaceWorkspaceInfoDto
  | SurfaceSafeSettingsSummaryDto;

export type SurfaceSnapshotQueryInput = {
  protocolVersion: unknown;
  workspaceKind: unknown;
  queryKind?: unknown;
  displayOutcome?: CanonicalRuntimeOutcome | null;
  settings?: SurfaceSettingsSnapshotInput | null;
};

const SURFACE_ANGLE_UNITS = ['deg', 'rad', 'grad'] as const satisfies readonly AngleUnit[];

function isSurfaceAngleUnit(value: unknown): value is AngleUnit {
  return SURFACE_ANGLE_UNITS.includes(value as AngleUnit);
}

export function querySurfaceCurrentResult(
  snapshot: SurfaceWorkspaceSnapshotInput,
): SurfaceResultDto<SurfaceCurrentResultDto> {
  return surfaceOk({
    protocolVersion: SURFACE_PROTOCOL_VERSION,
    workspaceKind: snapshot.workspaceKind,
    queryKind: 'currentResult',
    summary: snapshot.displayOutcome
      ? canonicalOutcomeToSurfaceResultSummary(snapshot.workspaceKind, snapshot.displayOutcome)
      : emptySurfaceResultSummary(snapshot.workspaceKind),
  });
}

export function querySurfaceWorkspaceInfo(
  snapshot: Pick<SurfaceWorkspaceSnapshotInput, 'workspaceKind'>,
): SurfaceResultDto<SurfaceWorkspaceInfoDto> {
  const capability = getSurfaceWorkspaceCapability(snapshot.workspaceKind);
  return surfaceOk({
    protocolVersion: SURFACE_PROTOCOL_VERSION,
    workspaceKind: snapshot.workspaceKind,
    queryKind: 'workspaceInfo',
    label: capability.label,
    summary: capability.summary,
    capabilities: capability.capabilities,
  });
}

export function querySurfaceSafeSettings(
  snapshot: Pick<SurfaceWorkspaceSnapshotInput, 'workspaceKind' | 'settings'>,
): SurfaceResultDto<SurfaceSafeSettingsSummaryDto> {
  const angleUnit = snapshot.settings?.angleUnit;
  if (angleUnit !== undefined && !isSurfaceAngleUnit(angleUnit)) {
    return surfaceError(
      'unsupported-field',
      'Surface safe settings support only deg, rad, and grad angle units.',
      'settings.angleUnit',
    );
  }

  return surfaceOk({
    protocolVersion: SURFACE_PROTOCOL_VERSION,
    workspaceKind: snapshot.workspaceKind,
    queryKind: 'safeSettings',
    ...(angleUnit ? { angleUnit } : {}),
  });
}

export function querySurfaceSnapshot(
  input: SurfaceSnapshotQueryInput,
): SurfaceResultDto<SurfaceQueryResponseDto> {
  const request = validateSurfaceRequest({
    protocolVersion: input.protocolVersion,
    workspaceKind: input.workspaceKind,
    queryKind: input.queryKind,
  });
  if (!request.ok) {
    return request;
  }
  if (!request.value.queryKind) {
    return surfaceError(
      'unsupported-query',
      'Surface query kind is required.',
      'queryKind',
    );
  }

  const snapshot: SurfaceWorkspaceSnapshotInput = {
    protocolVersion: request.value.protocolVersion,
    workspaceKind: request.value.workspaceKind,
    displayOutcome: input.displayOutcome,
    settings: input.settings,
  };

  const queryKind: SurfaceQueryKind = request.value.queryKind;
  switch (queryKind) {
    case 'currentResult':
      return querySurfaceCurrentResult(snapshot);
    case 'workspaceInfo':
      return querySurfaceWorkspaceInfo(snapshot);
    case 'safeSettings':
      return querySurfaceSafeSettings(snapshot);
  }

  return surfaceError(
    'unsupported-query',
    `Surface query ${String(queryKind)} is not supported.`,
    'queryKind',
  );
}
