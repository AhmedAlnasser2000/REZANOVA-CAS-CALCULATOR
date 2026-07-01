import type { SurfaceCapabilityManifestDto } from './capabilities';
import type {
  SurfaceFailureDto,
  SurfaceProtocolVersion,
  SurfaceResultDto,
} from './dto';
import type { SurfaceLifecycleEventDto } from './events';
import type {
  SurfaceCurrentResultDto,
  SurfaceSafeSettingsSummaryDto,
} from './queries';

const PROTOCOL_VERSION = 1 as const satisfies SurfaceProtocolVersion;

export const SURFACE_CONTRACT_MANIFEST_FIXTURE: SurfaceCapabilityManifestDto = {
  protocolVersion: PROTOCOL_VERSION,
  workspaces: [
    {
      protocolVersion: PROTOCOL_VERSION,
      workspaceKind: 'calculate',
      label: 'Calculate',
      summary: 'Compact committed-result summaries and lifecycle/query infrastructure for Calculate.',
      capabilities: {
        resultSummary: true,
        lifecycleEvents: true,
        currentResultQuery: true,
        commands: false,
        mount: false,
        history: false,
        variables: false,
        graphing: false,
        tabs: false,
      },
    },
    {
      protocolVersion: PROTOCOL_VERSION,
      workspaceKind: 'equation',
      label: 'Equation',
      summary: 'Compact committed-result summaries and lifecycle/query infrastructure for Equation.',
      capabilities: {
        resultSummary: true,
        lifecycleEvents: true,
        currentResultQuery: true,
        commands: false,
        mount: false,
        history: false,
        variables: false,
        graphing: false,
        tabs: false,
      },
    },
  ],
};

export const SURFACE_CONTRACT_CURRENT_RESULT_FIXTURE: SurfaceResultDto<SurfaceCurrentResultDto> = {
  ok: true,
  protocolVersion: PROTOCOL_VERSION,
  value: {
    protocolVersion: PROTOCOL_VERSION,
    workspaceKind: 'equation',
    queryKind: 'currentResult',
    summary: {
      protocolVersion: PROTOCOL_VERSION,
      workspaceKind: 'equation',
      status: 'success',
      title: 'Equation Result',
      resultKind: 'exact',
      primaryLatex: 'x=2',
      approximateText: 'x ≈ 2',
      answerDomain: 'real',
      solutionKind: 'exact-symbolic',
      facts: [
        { kind: 'condition', label: 'Valid when', latex: 'x\\ne0' },
        { kind: 'summary', label: 'Solve summary', text: 'Solved exactly.' },
        { kind: 'domain', label: 'Answer domain', text: 'real' },
      ],
      warnings: [{ text: 'Check denominator exclusions.' }],
      counts: [
        { kind: 'roots', count: 1, label: 'Roots' },
        { kind: 'rejectedCandidates', count: 1, label: 'Rejected candidates' },
        { kind: 'warnings', count: 1, label: 'Warnings' },
        { kind: 'facts', count: 3, label: 'Facts' },
      ],
    },
  },
};

export const SURFACE_CONTRACT_SAFE_SETTINGS_FIXTURE: SurfaceResultDto<SurfaceSafeSettingsSummaryDto> = {
  ok: true,
  protocolVersion: PROTOCOL_VERSION,
  value: {
    protocolVersion: PROTOCOL_VERSION,
    workspaceKind: 'calculate',
    queryKind: 'safeSettings',
    angleUnit: 'rad',
  },
};

export const SURFACE_CONTRACT_LIFECYCLE_EVENT_FIXTURE: SurfaceLifecycleEventDto = {
  protocolVersion: PROTOCOL_VERSION,
  eventId: 'surface.event.7',
  sequence: 7,
  timestamp: 1234567890,
  type: 'surface.result.committed',
  status: 'committed',
  severity: 'info',
  workspaceKind: 'equation',
  surfaceJobId: 'job.equation.1',
  summary: 'Result committed.',
};

export const SURFACE_CONTRACT_FAILURE_FIXTURE: SurfaceResultDto<never> = {
  ok: false,
  protocolVersion: PROTOCOL_VERSION,
  error: {
    protocolVersion: PROTOCOL_VERSION,
    code: 'unsupported-query',
    message: 'Unsupported query.',
    field: 'queryKind',
  } satisfies SurfaceFailureDto,
};

export const SURFACE_CONTRACT_FIXTURES = [
  SURFACE_CONTRACT_MANIFEST_FIXTURE,
  SURFACE_CONTRACT_CURRENT_RESULT_FIXTURE,
  SURFACE_CONTRACT_SAFE_SETTINGS_FIXTURE,
  SURFACE_CONTRACT_LIFECYCLE_EVENT_FIXTURE,
  SURFACE_CONTRACT_FAILURE_FIXTURE,
] as const;
