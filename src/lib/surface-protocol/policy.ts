export type SurfaceExposureClass =
  | 'public-metadata'
  | 'user-visible-result'
  | 'safe-setting'
  | 'sensitive-gated'
  | 'internal-forbidden';

export type SurfacePolicyDisposition = 'allowed' | 'blocked';

export type SurfaceFieldPolicyEntry = {
  id: string;
  dtoPath: string;
  exposure: SurfaceExposureClass;
  disposition: SurfacePolicyDisposition;
  description: string;
};

export type SurfaceResultSummaryVocabularyKind =
  | 'fact'
  | 'count'
  | 'warning';

export type SurfaceResultSummaryVocabularyEntry = {
  id: string;
  kind: SurfaceResultSummaryVocabularyKind;
  exposure: SurfaceExposureClass;
  description: string;
};

export const SURFACE_EXPOSURE_CLASSES = [
  'public-metadata',
  'user-visible-result',
  'safe-setting',
  'sensitive-gated',
  'internal-forbidden',
] as const satisfies readonly SurfaceExposureClass[];

export const SURFACE_CURRENT_DTO_FIELD_IDS = [
  'result-wrapper.ok',
  'result-wrapper.protocolVersion',
  'result-wrapper.value',
  'result-wrapper.error',
  'failure.protocolVersion',
  'failure.code',
  'failure.message',
  'failure.field',
  'result-summary.protocolVersion',
  'result-summary.workspaceKind',
  'result-summary.status',
  'result-summary.title',
  'result-summary.resultKind',
  'result-summary.primaryLatex',
  'result-summary.approximateText',
  'result-summary.answerDomain',
  'result-summary.solutionKind',
  'result-summary.facts',
  'result-summary.warnings',
  'result-summary.counts',
  'fact.kind',
  'fact.label',
  'fact.text',
  'fact.latex',
  'warning.text',
  'count.kind',
  'count.count',
  'count.label',
  'capability-manifest.protocolVersion',
  'capability-manifest.workspaces',
  'workspace-capability.protocolVersion',
  'workspace-capability.workspaceKind',
  'workspace-capability.label',
  'workspace-capability.summary',
  'workspace-capability.capabilities',
  'capabilities.resultSummary',
  'capabilities.lifecycleEvents',
  'capabilities.currentResultQuery',
  'capabilities.commands',
  'capabilities.mount',
  'capabilities.history',
  'capabilities.variables',
  'capabilities.graphing',
  'capabilities.tabs',
  'lifecycle-event.protocolVersion',
  'lifecycle-event.eventId',
  'lifecycle-event.sequence',
  'lifecycle-event.timestamp',
  'lifecycle-event.type',
  'lifecycle-event.status',
  'lifecycle-event.severity',
  'lifecycle-event.workspaceKind',
  'lifecycle-event.surfaceJobId',
  'lifecycle-event.summary',
  'current-result.protocolVersion',
  'current-result.workspaceKind',
  'current-result.queryKind',
  'current-result.summary',
  'workspace-info.protocolVersion',
  'workspace-info.workspaceKind',
  'workspace-info.queryKind',
  'workspace-info.label',
  'workspace-info.summary',
  'workspace-info.capabilities',
  'safe-settings.protocolVersion',
  'safe-settings.workspaceKind',
  'safe-settings.queryKind',
  'safe-settings.angleUnit',
] as const;

export const SURFACE_BLOCKED_FIELD_IDS = [
  'blocked.history',
  'blocked.variables',
  'blocked.diagnostics',
  'blocked.rawOrderOfExecutionPayload',
  'blocked.displayBlockTrees',
  'blocked.solverObjects',
  'blocked.mathJsonTrees',
  'blocked.reactProps',
  'blocked.domNodes',
  'blocked.localPaths',
  'blocked.hostCommands',
  'blocked.graphing',
  'blocked.mounting',
  'blocked.tabs',
  'blocked.plugins',
  'blocked.remoteCompute',
  'blocked.externalSoftwareDevelopmentKit',
] as const;

const allowed = (
  id: string,
  dtoPath: string,
  exposure: SurfaceExposureClass,
  description: string,
): SurfaceFieldPolicyEntry => ({
  id,
  dtoPath,
  exposure,
  disposition: 'allowed',
  description,
});

const blocked = (
  id: string,
  dtoPath: string,
  exposure: 'sensitive-gated' | 'internal-forbidden',
  description: string,
): SurfaceFieldPolicyEntry => ({
  id,
  dtoPath,
  exposure,
  disposition: 'blocked',
  description,
});

export const SURFACE_FIELD_POLICIES = [
  allowed('result-wrapper.ok', 'SurfaceResultDto.ok', 'public-metadata', 'Structured success or failure flag.'),
  allowed('result-wrapper.protocolVersion', 'SurfaceResultDto.protocolVersion', 'public-metadata', 'Surface Protocol version marker.'),
  allowed('result-wrapper.value', 'SurfaceResultDto.value', 'public-metadata', 'Container for an allowed Surface DTO value.'),
  allowed('result-wrapper.error', 'SurfaceResultDto.error', 'public-metadata', 'Container for an allowed structured Surface failure.'),
  allowed('failure.protocolVersion', 'SurfaceFailureDto.protocolVersion', 'public-metadata', 'Surface Protocol version marker.'),
  allowed('failure.code', 'SurfaceFailureDto.code', 'public-metadata', 'Stable structured failure code.'),
  allowed('failure.message', 'SurfaceFailureDto.message', 'public-metadata', 'Short failure message for unsupported Surface requests.'),
  allowed('failure.field', 'SurfaceFailureDto.field', 'public-metadata', 'Optional request field associated with the failure.'),
  allowed('result-summary.protocolVersion', 'SurfaceResultSummaryDto.protocolVersion', 'public-metadata', 'Surface Protocol version marker.'),
  allowed('result-summary.workspaceKind', 'SurfaceResultSummaryDto.workspaceKind', 'public-metadata', 'Supported workspace identifier.'),
  allowed('result-summary.status', 'SurfaceResultSummaryDto.status', 'public-metadata', 'Committed result status.'),
  allowed('result-summary.title', 'SurfaceResultSummaryDto.title', 'user-visible-result', 'User-visible result title.'),
  allowed('result-summary.resultKind', 'SurfaceResultSummaryDto.resultKind', 'user-visible-result', 'Compact result-kind classification.'),
  allowed('result-summary.primaryLatex', 'SurfaceResultSummaryDto.primaryLatex', 'user-visible-result', 'Primary user-visible math readback.'),
  allowed('result-summary.approximateText', 'SurfaceResultSummaryDto.approximateText', 'user-visible-result', 'User-visible approximate text.'),
  allowed('result-summary.answerDomain', 'SurfaceResultSummaryDto.answerDomain', 'user-visible-result', 'User-visible answer-domain summary.'),
  allowed('result-summary.solutionKind', 'SurfaceResultSummaryDto.solutionKind', 'user-visible-result', 'User-visible solution-kind summary.'),
  allowed('result-summary.facts', 'SurfaceResultSummaryDto.facts', 'user-visible-result', 'Compact user-visible fact list.'),
  allowed('result-summary.warnings', 'SurfaceResultSummaryDto.warnings', 'user-visible-result', 'Compact user-visible warning list.'),
  allowed('result-summary.counts', 'SurfaceResultSummaryDto.counts', 'user-visible-result', 'Compact count metadata for visible result shape.'),
  allowed('fact.kind', 'SurfaceFactDto.kind', 'user-visible-result', 'Compact fact category.'),
  allowed('fact.label', 'SurfaceFactDto.label', 'user-visible-result', 'User-visible fact label.'),
  allowed('fact.text', 'SurfaceFactDto.text', 'user-visible-result', 'User-visible fact text.'),
  allowed('fact.latex', 'SurfaceFactDto.latex', 'user-visible-result', 'User-visible fact math readback.'),
  allowed('warning.text', 'SurfaceWarningDto.text', 'user-visible-result', 'User-visible warning text.'),
  allowed('count.kind', 'SurfaceCountDto.kind', 'user-visible-result', 'Compact count category.'),
  allowed('count.count', 'SurfaceCountDto.count', 'user-visible-result', 'Numeric count for a visible summary concept.'),
  allowed('count.label', 'SurfaceCountDto.label', 'user-visible-result', 'User-visible count label.'),
  allowed('capability-manifest.protocolVersion', 'SurfaceCapabilityManifestDto.protocolVersion', 'public-metadata', 'Surface Protocol version marker.'),
  allowed('capability-manifest.workspaces', 'SurfaceCapabilityManifestDto.workspaces', 'public-metadata', 'Supported workspace capability list.'),
  allowed('workspace-capability.protocolVersion', 'SurfaceWorkspaceCapabilityDto.protocolVersion', 'public-metadata', 'Surface Protocol version marker.'),
  allowed('workspace-capability.workspaceKind', 'SurfaceWorkspaceCapabilityDto.workspaceKind', 'public-metadata', 'Supported workspace identifier.'),
  allowed('workspace-capability.label', 'SurfaceWorkspaceCapabilityDto.label', 'public-metadata', 'Workspace label.'),
  allowed('workspace-capability.summary', 'SurfaceWorkspaceCapabilityDto.summary', 'public-metadata', 'Workspace capability summary.'),
  allowed('workspace-capability.capabilities', 'SurfaceWorkspaceCapabilityDto.capabilities', 'public-metadata', 'Workspace capability flags.'),
  allowed('capabilities.resultSummary', 'SurfaceCapabilityFlags.resultSummary', 'public-metadata', 'Result-summary capability flag.'),
  allowed('capabilities.lifecycleEvents', 'SurfaceCapabilityFlags.lifecycleEvents', 'public-metadata', 'Lifecycle-event capability flag.'),
  allowed('capabilities.currentResultQuery', 'SurfaceCapabilityFlags.currentResultQuery', 'public-metadata', 'Current-result query capability flag.'),
  allowed('capabilities.commands', 'SurfaceCapabilityFlags.commands', 'public-metadata', 'Disabled host-command capability flag.'),
  allowed('capabilities.mount', 'SurfaceCapabilityFlags.mount', 'public-metadata', 'Disabled mount capability flag.'),
  allowed('capabilities.history', 'SurfaceCapabilityFlags.history', 'public-metadata', 'Disabled History capability flag.'),
  allowed('capabilities.variables', 'SurfaceCapabilityFlags.variables', 'public-metadata', 'Disabled Variables capability flag.'),
  allowed('capabilities.graphing', 'SurfaceCapabilityFlags.graphing', 'public-metadata', 'Disabled Graphing capability flag.'),
  allowed('capabilities.tabs', 'SurfaceCapabilityFlags.tabs', 'public-metadata', 'Disabled Workspace Tabs capability flag.'),
  allowed('lifecycle-event.protocolVersion', 'SurfaceLifecycleEventDto.protocolVersion', 'public-metadata', 'Surface Protocol version marker.'),
  allowed('lifecycle-event.eventId', 'SurfaceLifecycleEventDto.eventId', 'public-metadata', 'Surface-scoped event identifier.'),
  allowed('lifecycle-event.sequence', 'SurfaceLifecycleEventDto.sequence', 'public-metadata', 'Monotonic lifecycle sequence number.'),
  allowed('lifecycle-event.timestamp', 'SurfaceLifecycleEventDto.timestamp', 'public-metadata', 'Lifecycle event timestamp from the observed fact.'),
  allowed('lifecycle-event.type', 'SurfaceLifecycleEventDto.type', 'public-metadata', 'Curated lifecycle event type.'),
  allowed('lifecycle-event.status', 'SurfaceLifecycleEventDto.status', 'public-metadata', 'Curated lifecycle status.'),
  allowed('lifecycle-event.severity', 'SurfaceLifecycleEventDto.severity', 'public-metadata', 'Curated lifecycle severity.'),
  allowed('lifecycle-event.workspaceKind', 'SurfaceLifecycleEventDto.workspaceKind', 'public-metadata', 'Supported workspace identifier.'),
  allowed('lifecycle-event.surfaceJobId', 'SurfaceLifecycleEventDto.surfaceJobId', 'public-metadata', 'Surface-scoped job identifier.'),
  allowed('lifecycle-event.summary', 'SurfaceLifecycleEventDto.summary', 'public-metadata', 'Generic lifecycle summary.'),
  allowed('current-result.protocolVersion', 'SurfaceCurrentResultDto.protocolVersion', 'public-metadata', 'Surface Protocol version marker.'),
  allowed('current-result.workspaceKind', 'SurfaceCurrentResultDto.workspaceKind', 'public-metadata', 'Supported workspace identifier.'),
  allowed('current-result.queryKind', 'SurfaceCurrentResultDto.queryKind', 'public-metadata', 'Current-result query marker.'),
  allowed('current-result.summary', 'SurfaceCurrentResultDto.summary', 'user-visible-result', 'Compact committed result summary.'),
  allowed('workspace-info.protocolVersion', 'SurfaceWorkspaceInfoDto.protocolVersion', 'public-metadata', 'Surface Protocol version marker.'),
  allowed('workspace-info.workspaceKind', 'SurfaceWorkspaceInfoDto.workspaceKind', 'public-metadata', 'Supported workspace identifier.'),
  allowed('workspace-info.queryKind', 'SurfaceWorkspaceInfoDto.queryKind', 'public-metadata', 'Workspace-info query marker.'),
  allowed('workspace-info.label', 'SurfaceWorkspaceInfoDto.label', 'public-metadata', 'Workspace label.'),
  allowed('workspace-info.summary', 'SurfaceWorkspaceInfoDto.summary', 'public-metadata', 'Workspace capability summary.'),
  allowed('workspace-info.capabilities', 'SurfaceWorkspaceInfoDto.capabilities', 'public-metadata', 'Workspace capability flags.'),
  allowed('safe-settings.protocolVersion', 'SurfaceSafeSettingsSummaryDto.protocolVersion', 'public-metadata', 'Surface Protocol version marker.'),
  allowed('safe-settings.workspaceKind', 'SurfaceSafeSettingsSummaryDto.workspaceKind', 'public-metadata', 'Supported workspace identifier.'),
  allowed('safe-settings.queryKind', 'SurfaceSafeSettingsSummaryDto.queryKind', 'public-metadata', 'Safe-settings query marker.'),
  allowed('safe-settings.angleUnit', 'SurfaceSafeSettingsSummaryDto.angleUnit', 'safe-setting', 'Selected angle unit when supplied.'),
  blocked('blocked.history', 'future.history', 'sensitive-gated', 'History payloads require a later privacy/storage milestone.'),
  blocked('blocked.variables', 'future.variables', 'sensitive-gated', 'Variables payloads require a later privacy/storage milestone.'),
  blocked('blocked.diagnostics', 'internal.diagnostics', 'internal-forbidden', 'Raw diagnostics remain internal.'),
  blocked('blocked.rawOrderOfExecutionPayload', 'internal.orderOfExecution.payload', 'internal-forbidden', 'Raw Order of Execution event payloads remain internal.'),
  blocked('blocked.displayBlockTrees', 'internal.display.DisplayBlock', 'internal-forbidden', 'Display block trees remain internal.'),
  blocked('blocked.solverObjects', 'internal.solver.objects', 'internal-forbidden', 'Solver/runtime objects remain internal.'),
  blocked('blocked.mathJsonTrees', 'internal.math.MathJSON', 'internal-forbidden', 'MathJSON trees remain internal.'),
  blocked('blocked.reactProps', 'internal.react.props', 'internal-forbidden', 'React props remain internal.'),
  blocked('blocked.domNodes', 'internal.dom.nodes', 'internal-forbidden', 'DOM nodes remain internal.'),
  blocked('blocked.localPaths', 'internal.local.paths', 'internal-forbidden', 'Local filesystem paths remain internal.'),
  blocked('blocked.hostCommands', 'future.host.commands', 'internal-forbidden', 'Host commands remain unavailable.'),
  blocked('blocked.graphing', 'future.graphing', 'internal-forbidden', 'Graphing remains unavailable.'),
  blocked('blocked.mounting', 'future.mount', 'internal-forbidden', 'Mounting remains unavailable.'),
  blocked('blocked.tabs', 'future.tabs', 'internal-forbidden', 'Workspace Tabs remain unavailable to Surface hosts.'),
  blocked('blocked.plugins', 'future.plugins', 'internal-forbidden', 'Plugins remain unavailable.'),
  blocked('blocked.remoteCompute', 'future.remoteCompute', 'internal-forbidden', 'Remote compute remains unavailable.'),
  blocked('blocked.externalSoftwareDevelopmentKit', 'future.externalSoftwareDevelopmentKit', 'internal-forbidden', 'External software development kit surfaces remain unavailable.'),
] as const satisfies readonly SurfaceFieldPolicyEntry[];

export const SURFACE_RESULT_SUMMARY_FACT_VOCABULARY_IDS = [
  'fact.validWhen',
  'fact.solveSummary',
  'fact.transformSummary',
  'fact.numericMethod',
  'fact.answerDomain',
] as const;

export const SURFACE_RESULT_SUMMARY_COUNT_VOCABULARY_IDS = [
  'count.roots',
  'count.candidateRoots',
  'count.branches',
  'count.warnings',
  'count.facts',
  'count.rejectedCandidates',
] as const;

export const SURFACE_RESULT_SUMMARY_VOCABULARY = [
  {
    id: 'fact.validWhen',
    kind: 'fact',
    exposure: 'user-visible-result',
    description: 'Valid-when and condition facts already visible in result surfaces.',
  },
  {
    id: 'fact.solveSummary',
    kind: 'fact',
    exposure: 'user-visible-result',
    description: 'User-visible solve summary text.',
  },
  {
    id: 'fact.transformSummary',
    kind: 'fact',
    exposure: 'user-visible-result',
    description: 'User-visible transform summary text.',
  },
  {
    id: 'fact.numericMethod',
    kind: 'fact',
    exposure: 'user-visible-result',
    description: 'User-visible numeric method text.',
  },
  {
    id: 'fact.answerDomain',
    kind: 'fact',
    exposure: 'user-visible-result',
    description: 'User-visible answer-domain text.',
  },
  {
    id: 'warning.text',
    kind: 'warning',
    exposure: 'user-visible-result',
    description: 'User-visible warning text.',
  },
  {
    id: 'count.roots',
    kind: 'count',
    exposure: 'user-visible-result',
    description: 'Root count metadata.',
  },
  {
    id: 'count.candidateRoots',
    kind: 'count',
    exposure: 'user-visible-result',
    description: 'Candidate-root count metadata.',
  },
  {
    id: 'count.branches',
    kind: 'count',
    exposure: 'user-visible-result',
    description: 'Branch count metadata.',
  },
  {
    id: 'count.warnings',
    kind: 'count',
    exposure: 'user-visible-result',
    description: 'Warning count metadata.',
  },
  {
    id: 'count.facts',
    kind: 'count',
    exposure: 'user-visible-result',
    description: 'Fact count metadata.',
  },
  {
    id: 'count.rejectedCandidates',
    kind: 'count',
    exposure: 'user-visible-result',
    description: 'Rejected-candidate count metadata.',
  },
] as const satisfies readonly SurfaceResultSummaryVocabularyEntry[];

export function listSurfaceFieldPolicies(): SurfaceFieldPolicyEntry[] {
  return SURFACE_FIELD_POLICIES.map((entry) => ({ ...entry }));
}

export function getSurfaceFieldPolicy(id: string): SurfaceFieldPolicyEntry | undefined {
  const entry = SURFACE_FIELD_POLICIES.find((policy) => policy.id === id);
  return entry ? { ...entry } : undefined;
}

export function listSurfaceResultSummaryVocabulary(): SurfaceResultSummaryVocabularyEntry[] {
  return SURFACE_RESULT_SUMMARY_VOCABULARY.map((entry) => ({ ...entry }));
}

export function getSurfaceResultSummaryVocabularyEntry(
  id: string,
): SurfaceResultSummaryVocabularyEntry | undefined {
  const entry = SURFACE_RESULT_SUMMARY_VOCABULARY.find((policy) => policy.id === id);
  return entry ? { ...entry } : undefined;
}
