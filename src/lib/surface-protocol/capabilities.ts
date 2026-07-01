import {
  SURFACE_PROTOCOL_VERSION,
  type SurfaceProtocolVersion,
  type SurfaceWorkspaceKind,
} from './dto';

export type SurfaceCapabilityFlags = {
  resultSummary: true;
  lifecycleEvents: true;
  currentResultQuery: true;
  commands: false;
  mount: false;
  history: false;
  variables: false;
  graphing: false;
  tabs: false;
};

export type SurfaceWorkspaceCapabilityDto = {
  protocolVersion: SurfaceProtocolVersion;
  workspaceKind: SurfaceWorkspaceKind;
  label: string;
  summary: string;
  capabilities: SurfaceCapabilityFlags;
};

export type SurfaceCapabilityManifestDto = {
  protocolVersion: SurfaceProtocolVersion;
  workspaces: SurfaceWorkspaceCapabilityDto[];
};

export const SURFACE_SUPPORTED_WORKSPACE_KINDS = [
  'calculate',
  'equation',
] as const satisfies readonly SurfaceWorkspaceKind[];

const DISABLED_SURFACE_FEATURES = {
  commands: false,
  mount: false,
  history: false,
  variables: false,
  graphing: false,
  tabs: false,
} as const;

const SURFACE_WORKSPACE_CAPABILITIES: Record<SurfaceWorkspaceKind, SurfaceWorkspaceCapabilityDto> = {
  calculate: {
    protocolVersion: SURFACE_PROTOCOL_VERSION,
    workspaceKind: 'calculate',
    label: 'Calculate',
    summary: 'Compact committed-result summaries and lifecycle/query infrastructure for Calculate.',
    capabilities: {
      resultSummary: true,
      lifecycleEvents: true,
      currentResultQuery: true,
      ...DISABLED_SURFACE_FEATURES,
    },
  },
  equation: {
    protocolVersion: SURFACE_PROTOCOL_VERSION,
    workspaceKind: 'equation',
    label: 'Equation',
    summary: 'Compact committed-result summaries and lifecycle/query infrastructure for Equation.',
    capabilities: {
      resultSummary: true,
      lifecycleEvents: true,
      currentResultQuery: true,
      ...DISABLED_SURFACE_FEATURES,
    },
  },
};

export function isSurfaceWorkspaceKind(value: unknown): value is SurfaceWorkspaceKind {
  return SURFACE_SUPPORTED_WORKSPACE_KINDS.includes(value as SurfaceWorkspaceKind);
}

export function listSurfaceWorkspaceCapabilities(): SurfaceWorkspaceCapabilityDto[] {
  return SURFACE_SUPPORTED_WORKSPACE_KINDS.map((workspaceKind) => ({
    ...SURFACE_WORKSPACE_CAPABILITIES[workspaceKind],
    capabilities: { ...SURFACE_WORKSPACE_CAPABILITIES[workspaceKind].capabilities },
  }));
}

export function getSurfaceWorkspaceCapability(
  workspaceKind: SurfaceWorkspaceKind,
): SurfaceWorkspaceCapabilityDto {
  const capability = SURFACE_WORKSPACE_CAPABILITIES[workspaceKind];
  return {
    ...capability,
    capabilities: { ...capability.capabilities },
  };
}

export function buildSurfaceCapabilityManifest(): SurfaceCapabilityManifestDto {
  return {
    protocolVersion: SURFACE_PROTOCOL_VERSION,
    workspaces: listSurfaceWorkspaceCapabilities(),
  };
}
