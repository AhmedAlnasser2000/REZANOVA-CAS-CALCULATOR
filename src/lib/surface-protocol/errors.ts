import { isSurfaceWorkspaceKind } from './capabilities';
import {
  SURFACE_PROTOCOL_VERSION,
  surfaceFailure,
  surfaceOk,
  type SurfaceProtocolVersion,
  type SurfaceResultDto,
  type SurfaceWorkspaceKind,
} from './dto';

export type SurfaceErrorCode =
  | 'unsupported-version'
  | 'unsupported-workspace'
  | 'unsupported-query'
  | 'unsupported-field'
  | 'invalid-request';

export type SurfaceQueryKind =
  | 'currentResult'
  | 'workspaceInfo'
  | 'safeSettings';

export type SurfaceValidatedRequest = {
  protocolVersion: SurfaceProtocolVersion;
  workspaceKind: SurfaceWorkspaceKind;
  queryKind?: SurfaceQueryKind;
};

export const SURFACE_SUPPORTED_PROTOCOL_VERSIONS = [
  SURFACE_PROTOCOL_VERSION,
] as const;

export const SURFACE_SUPPORTED_QUERY_KINDS = [
  'currentResult',
  'workspaceInfo',
  'safeSettings',
] as const satisfies readonly SurfaceQueryKind[];

export function isSurfaceProtocolVersion(value: unknown): value is SurfaceProtocolVersion {
  return value === SURFACE_PROTOCOL_VERSION;
}

export function isSurfaceQueryKind(value: unknown): value is SurfaceQueryKind {
  return SURFACE_SUPPORTED_QUERY_KINDS.includes(value as SurfaceQueryKind);
}

export function surfaceError(
  code: SurfaceErrorCode,
  message: string,
  field?: string,
): SurfaceResultDto<never> {
  return surfaceFailure(code, message, field);
}

export function validateSurfaceProtocolVersion(
  value: unknown,
): SurfaceResultDto<SurfaceProtocolVersion> {
  return isSurfaceProtocolVersion(value)
    ? surfaceOk(value)
    : surfaceError(
      'unsupported-version',
      `Surface Protocol version ${String(value)} is not supported.`,
      'protocolVersion',
    );
}

export function validateSurfaceWorkspaceKind(
  value: unknown,
): SurfaceResultDto<SurfaceWorkspaceKind> {
  return isSurfaceWorkspaceKind(value)
    ? surfaceOk(value)
    : surfaceError(
      'unsupported-workspace',
      `Surface workspace ${String(value)} is not supported.`,
      'workspaceKind',
    );
}

export function validateSurfaceQueryKind(
  value: unknown,
): SurfaceResultDto<SurfaceQueryKind> {
  return isSurfaceQueryKind(value)
    ? surfaceOk(value)
    : surfaceError(
      'unsupported-query',
      `Surface query ${String(value)} is not supported.`,
      'queryKind',
    );
}

export function validateSurfaceRequest(input: {
  protocolVersion: unknown;
  workspaceKind: unknown;
  queryKind?: unknown;
}): SurfaceResultDto<SurfaceValidatedRequest> {
  const protocolVersion = validateSurfaceProtocolVersion(input.protocolVersion);
  if (!protocolVersion.ok) {
    return protocolVersion;
  }

  const workspaceKind = validateSurfaceWorkspaceKind(input.workspaceKind);
  if (!workspaceKind.ok) {
    return workspaceKind;
  }

  if (!Object.prototype.hasOwnProperty.call(input, 'queryKind')) {
    return surfaceOk({
      protocolVersion: protocolVersion.value,
      workspaceKind: workspaceKind.value,
    });
  }

  const queryKind = validateSurfaceQueryKind(input.queryKind);
  if (!queryKind.ok) {
    return queryKind;
  }

  return surfaceOk({
    protocolVersion: protocolVersion.value,
    workspaceKind: workspaceKind.value,
    queryKind: queryKind.value,
  });
}
